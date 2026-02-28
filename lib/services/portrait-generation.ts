/**
 * Portrait Generation Pipeline
 *
 * Orchestrates the full portrait generation flow:
 * 1. Analyze photo with Claude Vision
 * 2. Build prompt from StyleVariant template + subject analysis
 * 3. Call image-gen.xencolabs.com
 * 4. Apply watermark to preview
 * 5. Store both versions to R2
 * 6. Update Portrait record in DB
 *
 * DUAL-FLOW ARCHITECTURE:
 * - Guest: portraitId tracked via session cookie; userId = null
 * - Subscriber: userId from Clerk; portrait saved to gallery; plan quota deducted
 * Both flows use this same service; auth differences are handled upstream.
 */

import { prisma } from "@/lib/prisma";
import { analyzePortraitPhoto, buildSubjectDescription } from "./portrait-analysis";
import { applyWatermark, prepareHiResImage } from "./watermark";
import { uploadPortraitPreview, uploadPortraitHiRes } from "./file-storage";

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratePortraitParams {
  portraitId: string;
  stylePackSlug: string;
  styleVariantSlug: string;
  /** Authenticated subscriber userId, or null for guests */
  userId: string | null;
  /** Optional user description for Custom Scene pack */
  userScene?: string;
}

export interface GeneratePortraitResult {
  success: boolean;
  previewImageUrl?: string;
  subjectType?: string;
  error?: string;
  errorType?: "quality" | "upload" | "generation" | "notfound" | "server";
  qualityIssues?: string[];
}

// =============================================================================
// AI GATEWAY (for prompt enhancement)
// =============================================================================

const AI_GATEWAY_URL =
  process.env.AI_GATEWAY_URL ||
  "https://research.xencolabs.com/api/ai/chat/completions";
const AI_GATEWAY_KEY =
  process.env.AI_GATEWAY_API_KEY || process.env.DEVMAESTRO_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "claude-3-5-sonnet";
const IMAGE_GEN_URL =
  process.env.IMAGE_GEN_API_URL || "https://image-gen.xencolabs.com";
const IMAGE_GEN_KEY = process.env.IMAGE_GEN_API_KEY || "";

// Custom scene enhancement system prompt (PRD section 4.5)
const CUSTOM_SCENE_SYSTEM_PROMPT = `You are a creative director for an AI portrait generation service. 
A user has uploaded a photo and described a custom scene they want 
their subject placed into.

Your job is to transform their description into a detailed, 
high-quality image generation prompt that:

1. Preserves the subject description exactly as provided (do not alter it)
2. Expands the user's scene description into vivid, specific visual detail
3. Adds appropriate artistic style, lighting, composition, and atmosphere
4. Ensures the subject is the clear focal point of the scene
5. Includes technical quality descriptors (resolution, detail level, etc.)

Return ONLY the enhanced prompt. No explanation, no preamble.`;

// =============================================================================
// HELPERS
// =============================================================================

function buildPromptFromTemplate(
  promptTemplate: string,
  subjectDescription: string,
  styleModifiers: Record<string, string>
): string {
  const modifierText = Object.entries(styleModifiers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return promptTemplate
    .replace(/\{\{subject\}\}/g, subjectDescription)
    .replace(/\{\{style_modifiers\}\}/g, modifierText)
    .replace(/\{\{user_details\}\}/g, "");
}

async function enhanceCustomScenePrompt(
  userScene: string,
  subjectDescription: string
): Promise<string | null> {
  if (!AI_GATEWAY_KEY) return null;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: CUSTOM_SCENE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `User's scene description: ${userScene}\nSubject description: ${subjectDescription}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function callImageGen(
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<{ imageUrl: string } | null> {
  const [w, h] = aspectRatio.split(":").map(Number);
  const baseSize = 1024; // Preview resolution
  const width = w >= h ? baseSize : Math.round(baseSize * (w / h));
  const height = h >= w ? baseSize : Math.round(baseSize * (h / w));

  try {
    const response = await fetch(`${IMAGE_GEN_URL}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(IMAGE_GEN_KEY && { Authorization: `Bearer ${IMAGE_GEN_KEY}` }),
      },
      body: JSON.stringify({ prompt, width, height }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[PortraitGen] Image gen error:", response.status, err);
      return null;
    }

    const data = await response.json();
    const imageData = data.image || data;
    const imageUrl = imageData.image_url || imageData.imageUrl;

    if (!imageUrl) return null;
    return { imageUrl };
  } catch (error) {
    console.error("[PortraitGen] Image gen call failed:", error);
    return null;
  }
}

// =============================================================================
// MAIN GENERATION PIPELINE
// =============================================================================

export async function generatePortrait(
  params: GeneratePortraitParams
): Promise<GeneratePortraitResult> {
  const { portraitId, stylePackSlug, styleVariantSlug, userId, userScene } = params;

  const startTime = Date.now();

  // --- Step 1: Load portrait record ---
  const portrait = await prisma.portrait.findUnique({
    where: { id: portraitId },
  });

  if (!portrait) {
    return { success: false, error: "Portrait not found", errorType: "notfound" };
  }

  // --- Step 2: Update status to analyzing ---
  await prisma.portrait.update({
    where: { id: portraitId },
    data: { status: "analyzing" },
  });

  // --- Step 3: Analyze photo with Claude Vision ---
  const analysisResult = await analyzePortraitPhoto(portrait.sourceImageUrl);

  if (!analysisResult.success || !analysisResult.analysis) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: analysisResult.error || "Photo analysis failed",
      },
    });
    return {
      success: false,
      error: analysisResult.error || "Could not analyze your photo. Please try a clearer image.",
      errorType: "quality",
    };
  }

  const analysis = analysisResult.analysis;

  // --- Step 4: Check photo quality ---
  if (!analysis.photoQuality.usable) {
    const issues = analysis.photoQuality.issues || ["Photo quality insufficient"];
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        subjectAnalysis: analysis as object,
        errorMessage: `Photo quality issues: ${issues.join(", ")}`,
      },
    });
    return {
      success: false,
      error: `Your photo has quality issues that may affect the portrait: ${issues.join(", ")}. Please try a clearer photo with good lighting.`,
      errorType: "quality",
      qualityIssues: issues,
    };
  }

  // --- Step 5: Load StyleVariant ---
  const stylePack = await prisma.stylePack.findUnique({
    where: { slug: stylePackSlug },
    include: {
      variants: {
        where: { slug: styleVariantSlug, isActive: true },
      },
    },
  });

  if (!stylePack || stylePack.variants.length === 0) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Style not found" },
    });
    return {
      success: false,
      error: "Selected style not found. Please choose a different style.",
      errorType: "notfound",
    };
  }

  const variant = stylePack.variants[0];

  // --- Step 6: Build the enhanced prompt ---
  const subjectDescription = buildSubjectDescription(analysis);
  let enhancedPrompt: string;

  if (stylePackSlug === "custom-scene" && userScene) {
    // Custom scene: enhance user description with Claude
    const customPrompt = await enhanceCustomScenePrompt(userScene, subjectDescription);
    enhancedPrompt =
      customPrompt ||
      `${subjectDescription} in a scene described as: ${userScene}. High quality digital art.`;
  } else {
    // Standard style: fill template placeholders
    enhancedPrompt = buildPromptFromTemplate(
      variant.promptTemplate,
      subjectDescription,
      variant.styleModifiers as Record<string, string>
    );
  }

  // --- Step 7: Update portrait record with analysis + style ---
  await prisma.portrait.update({
    where: { id: portraitId },
    data: {
      status: "generating",
      stylePackSlug,
      styleVariantSlug,
      subjectType: analysis.subjectType,
      subjectAnalysis: analysis as object,
      enhancedPrompt,
      userId: userId || portrait.userId,
    },
  });

  // --- Step 8: Generate image ---
  const genResult = await callImageGen(enhancedPrompt, "1:1");

  if (!genResult) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Image generation failed" },
    });
    return {
      success: false,
      error: "Portrait generation failed. Please try again.",
      errorType: "generation",
    };
  }

  // --- Step 9: Fetch generated image ---
  let imageBuffer: Buffer;
  try {
    const imgResponse = await fetch(genResult.imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch generated image: ${imgResponse.status}`);
    const arrayBuffer = await imgResponse.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[PortraitGen] Failed to fetch generated image:", error);
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Failed to retrieve generated image" },
    });
    return {
      success: false,
      error: "Failed to retrieve generated portrait. Please try again.",
      errorType: "generation",
    };
  }

  // --- Step 10: Apply watermark to preview ---
  const watermarkResult = await applyWatermark(imageBuffer);
  if (!watermarkResult.success || !watermarkResult.buffer) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Watermark processing failed" },
    });
    return {
      success: false,
      error: "Preview processing failed. Please try again.",
      errorType: "server",
    };
  }

  // --- Step 11: Store hi-res (unwatermarked) ---
  const hiResBuffer = await prepareHiResImage(imageBuffer);
  let hiResImageUrl: string | undefined;
  if (hiResBuffer.success && hiResBuffer.buffer) {
    const hiResUpload = await uploadPortraitHiRes(hiResBuffer.buffer, portraitId);
    if (hiResUpload.success) hiResImageUrl = hiResUpload.url;
  }

  // --- Step 12: Upload watermarked preview to R2 ---
  const previewUpload = await uploadPortraitPreview(watermarkResult.buffer, portraitId);
  if (!previewUpload.success || !previewUpload.url) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Failed to store preview" },
    });
    return {
      success: false,
      error: "Failed to store portrait preview. Please try again.",
      errorType: "upload",
    };
  }

  // --- Step 13: Update portrait record as complete ---
  const generationTimeMs = Date.now() - startTime;
  await prisma.portrait.update({
    where: { id: portraitId },
    data: {
      status: "preview",
      previewImageUrl: previewUpload.url,
      hiResImageUrl: hiResImageUrl || null,
      generationTimeMs,
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    previewImageUrl: previewUpload.url,
    subjectType: analysis.subjectType,
  };
}
