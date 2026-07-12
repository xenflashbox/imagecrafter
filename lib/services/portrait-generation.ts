/**
 * Portrait Generation Pipeline — TWO-STEP FACE-INTO-SCENE
 * (proven 15/15 single-subject; PLAN/results/faceswap-two-step.md)
 *
 * 1. Analyze photo with Claude Vision (identity + coloring + demographics)
 * 2. Step 1: generate a GENERIC stand-in scene (full costume/style, no real
 *    identity) via image-gen.xencolabs.com — pinned to the per-style bake-off
 *    winner engine (auto-route for unmapped styles), stand-in coloring built
 *    from the analysis JSON. A fidelity gate verifies the stand-in matches
 *    the subject's coloring BEFORE any swap (mismatch → regenerate).
 * 3. Step 2: swap the real subject's identity onto the stand-in via
 *    Replicate multi-image Kontext Pro (real photo = image 1 anchor)
 * 4. Combined acceptance gate: SAME PERSON (identity) + style present, both
 *    fail-CLOSED ("unknown" blocks) + one retry
 * 5. Apply watermark to preview; store both versions to R2; update DB
 *
 * v1 constraint: SINGLE SUBJECT ONLY. Groups/couples failed identity
 * transfer in testing and are rejected with an honest error.
 *
 * DUAL-FLOW ARCHITECTURE:
 * - Guest: portraitId tracked via session cookie; userId = null
 * - Subscriber: userId from Clerk; portrait saved to gallery; plan quota deducted
 * Both flows use this same service; auth differences are handled upstream.
 */

import { prisma } from "@/lib/prisma";
import {
  analyzePortraitPhoto,
  checkStylePresence,
  checkIdentityPresence,
  checkStandInFidelity,
  type PortraitSubjectAnalysis,
} from "./portrait-analysis";
import { applyWatermark, prepareHiResImage } from "./watermark";
import { uploadPortraitPreview, uploadPortraitHiRes } from "./file-storage";
import {
  isFacePreservationAvailable,
  swapFaceIntoScene,
} from "./replicate-portrait";
import { postToService, getFromService, serviceErrorMessage } from "./image-generation";

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

import { getAiGatewayUrl } from "@/lib/env";

const AI_GATEWAY_KEY =
  process.env.AI_GATEWAY_API_KEY || process.env.DEVMAESTRO_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";

// Custom scene enhancement system prompt (PRD section 4.5)
const CUSTOM_SCENE_SYSTEM_PROMPT = `You are a creative director for an AI portrait generation service.
A user has uploaded a photo and described a custom scene they want
their subject placed into.

Your job is to transform their description into a detailed,
high-quality image generation prompt that:

1. Preserves the subject description exactly as provided (do not alter it)
2. Expands the user's scene description into vivid, specific visual detail
3. Adds appropriate lighting, composition, and atmosphere
4. Ensures the subject is the clear focal point of the scene
5. CRITICAL: Emphasize that the subject's face must be PHOTOREALISTICALLY accurate
6. The portrait must be immediately recognizable as the specific individual

IMPORTANT: While the scene can be artistic or fantastical, the subject's face
and identifying features MUST remain photorealistic. Apply artistic style to
the environment, clothing, and lighting - NOT to facial features.

Return ONLY the enhanced prompt. No explanation, no preamble.`;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build the GENERIC stand-in descriptor for the step-1 scene prompt.
 *
 * Stand-in fidelity rule (proven by failure in the two-step test): the swap
 * can only bridge what the stand-in already resembles, so the stand-in MUST
 * carry the subject's demographics and coloring from the analysis JSON —
 * but never the real identity (the scene holds no real face by design).
 */
export function buildStandInDescriptor(
  analysis: PortraitSubjectAnalysis
): string {
  const p = analysis.primarySubject;
  if (analysis.subjectType === "pet") {
    const kind = [p.breed, p.species || "pet"].filter(Boolean).join(" ");
    const features =
      p.keyFeatures && p.keyFeatures.length > 0
        ? `, with ${p.keyFeatures.join(", ")}`
        : "";
    return `a ${kind} with ${p.coloring}${features}`;
  }
  const who = p.genderPresentation || "person";
  const age = p.ageBracket ? `, ${p.ageBracket},` : "";
  return `a ${who}${age} with ${p.coloring}`;
}

/**
 * Build the step-1 stand-in scene prompt from the style template.
 * No identity-preservation block — identity is carried by step 2, not here.
 */
export function buildStandInScenePrompt(
  promptTemplate: string,
  standInDescriptor: string,
  styleModifiers: Record<string, string>,
  analysis: PortraitSubjectAnalysis,
  userScene?: string
): string {
  const modifierText = Object.entries(styleModifiers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  let prompt = promptTemplate
    .replace(/\{\{subject\}\}/g, standInDescriptor)
    .replace(/\{\{style_modifiers\}\}/g, modifierText)
    .replace(/\{\{user_details\}\}/g, userScene || "");

  // Stand-in framing rules (test findings): the stand-in face must be a
  // viable swap surface, and pet scenes must not hide extra figures.
  prompt +=
    analysis.subjectType === "pet"
      ? ` The ${analysis.primarySubject.species || "animal"} is the ONLY living figure in the scene — no faces or figures hidden in trees, bark, or background. Its face is large in the frame, clearly visible, and well-lit.`
      : " Waist-up framing. The subject's face is large in the frame, clearly visible, unobstructed, and well-lit.";

  return prompt;
}

async function enhanceCustomScenePrompt(
  userScene: string,
  subjectDescription: string
): Promise<string | null> {
  if (!AI_GATEWAY_KEY) return null;

  try {
    const response = await fetch(getAiGatewayUrl(), {
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

// =============================================================================
// PER-STYLE ENGINE ROUTING (fix directive P3 — measured bake-off winners)
// =============================================================================
//
// Style→engine is a MEASURED assignment from the Jul-7 bake-off (15/15), not
// an auto-route. The bake-off ran via Higgsfield MCP generators; mapping to
// the image-gen service's REST providers:
//   "Kling" winner   → provider "kling", model omitted → the service's
//                      kling-v3 founder default (the omni models require
//                      reference images; the stand-in is pure text-to-image)
//   "Nano Banana"    → provider "higgsfield", model "nano_banana_pro"
// Pinning requires the ASYNC endpoint: the sync /api/v1/generate request
// enum is frozen by service design — new providers are reached by routing,
// never by widening request enums. Unmapped styles auto-route as before.
const STYLE_ENGINE: Record<string, { provider: string; model?: string }> = {
  renaissance: { provider: "kling" },
  egyptian: { provider: "kling" },
  elven: { provider: "kling" },
  "starry-night": { provider: "higgsfield", model: "nano_banana_pro" },
  "comic-hero": { provider: "higgsfield", model: "nano_banana_pro" },
};

const ASYNC_POLL_INTERVAL_MS = 3_000;
const ASYNC_POLL_TIMEOUT_MS = 300_000;

/** Generate a stand-in scene on a PINNED engine via the async endpoint. */
async function generatePinnedScene(
  prompt: string,
  engine: { provider: string; model?: string }
): Promise<{ sceneUrl: string } | { error: string }> {
  let res;
  try {
    res = await postToService("/api/v1/async/generate", {
      prompt,
      aspect_ratio: "3:4",
      source_app: "imagecrafter",
      provider: engine.provider,
      ...(engine.model ? { model: engine.model } : {}),
    });
  } catch (error) {
    return {
      error: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  const jobId = res.ok && res.json ? (res.json.job_id as string | undefined) : undefined;
  if (!res.ok || !jobId) {
    return {
      error: res.ok
        ? "Image service returned no job_id for pinned stand-in scene"
        : serviceErrorMessage(res, "pinned stand-in scene submission"),
    };
  }

  const deadline = Date.now() + ASYNC_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, ASYNC_POLL_INTERVAL_MS));
    let poll;
    try {
      poll = await getFromService(`/api/v1/async/jobs/${jobId}`);
    } catch (error) {
      return {
        error: `Image service unreachable while polling job ${jobId}: ${error instanceof Error ? error.message : "network error"}`,
      };
    }
    if (!poll.ok || !poll.json) {
      return { error: serviceErrorMessage(poll, "stand-in job status") };
    }
    const status = poll.json.status as string | undefined;
    if (status === "completed") {
      const result = poll.json.result as Record<string, unknown> | null | undefined;
      const sceneUrl = result?.image_url as string | undefined;
      if (!sceneUrl) {
        return { error: `Stand-in job ${jobId} completed without an image URL` };
      }
      console.log(
        `[PortraitGen] Pinned stand-in served by ${result?.provider}/${result?.model}`
      );
      return { sceneUrl };
    }
    if (status === "failed" || status === "cancelled") {
      return {
        error: `Stand-in job ${status}: ${(poll.json.error as string) || "no error detail"}`,
      };
    }
  }
  return { error: `Stand-in job ${jobId} timed out after ${ASYNC_POLL_TIMEOUT_MS / 1000}s` };
}

/**
 * Step 1: generate the generic stand-in scene via the image-gen service.
 * Styles with a measured bake-off winner are PINNED to that engine (P3);
 * unmapped styles auto-route (guide v3). Honest error on failure; there is
 * NO fallback path.
 */
export async function generateStandInScene(
  prompt: string,
  styleVariantSlug?: string
): Promise<{ sceneUrl: string } | { error: string }> {
  const engine = styleVariantSlug ? STYLE_ENGINE[styleVariantSlug] : undefined;
  if (engine) {
    console.log(
      `[PortraitGen] Style "${styleVariantSlug}" pinned to ${engine.provider}${engine.model ? `/${engine.model}` : ""} (bake-off winner)`
    );
    return generatePinnedScene(prompt, engine);
  }

  let res;
  try {
    res = await postToService("/api/v1/generate", {
      prompt,
      aspect_ratio: "3:4",
      source_app: "imagecrafter",
    });
  } catch (error) {
    return {
      error: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  const imageData =
    res.ok && res.json
      ? (res.json.image as Record<string, unknown> | undefined)
      : undefined;
  const sceneUrl = imageData?.image_url as string | undefined;
  if (!res.ok || !sceneUrl) {
    return {
      error: res.ok
        ? "Image service returned no image URL for stand-in scene"
        : serviceErrorMessage(res, "stand-in scene generation"),
    };
  }
  return { sceneUrl };
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

  // --- Step 4b: v1 constraint — single subject only ---
  // Two-step identity transfer to multiple people is unreliable (couples
  // scored 0-1/5 in testing). Honest rejection, not a degraded result.
  if ((analysis.subjectCount || 1) > 1) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        subjectAnalysis: analysis as object,
        errorMessage: `Multiple subjects detected (${analysis.subjectCount}) — single-subject only in v1`,
      },
    });
    return {
      success: false,
      error:
        "Portraits currently support one subject at a time. Please upload a photo with a single person or pet.",
      errorType: "quality",
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

  // --- Step 6: Build the step-1 stand-in scene prompt ---
  // The stand-in is GENERIC: coloring + demographics from the analysis JSON
  // (required for the swap to bridge), never the real identity.
  const standInDescriptor = buildStandInDescriptor(analysis);
  let enhancedPrompt: string;

  if (stylePackSlug === "custom-scene" && userScene) {
    // Custom scene: enhance user description with Claude
    const customPrompt = await enhanceCustomScenePrompt(userScene, standInDescriptor);
    enhancedPrompt =
      customPrompt ||
      `${standInDescriptor} in a scene described as: ${userScene}. High quality digital art. Waist-up framing, the subject's face large in the frame and clearly visible.`;
  } else {
    // Standard style: fill template placeholders
    enhancedPrompt = buildStandInScenePrompt(
      variant.promptTemplate,
      standInDescriptor,
      variant.styleModifiers as Record<string, string>,
      analysis,
      userScene
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

  // --- Step 8: Two-step generation (stand-in scene → identity swap) ---
  if (!isFacePreservationAvailable()) {
    // Step 2 requires Replicate. Fail loud — no text-to-image fallback:
    // a portrait that isn't the customer's subject is a mock result.
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage:
          "Face preservation not configured (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)",
      },
    });
    return {
      success: false,
      error: "Portrait generation is temporarily unavailable. Please try again later.",
      errorType: "server",
    };
  }

  // Step 8a: stand-in scene (per-style pinned engine, P3) + FIDELITY GATE
  // (P2.2). The swap can only bridge what the stand-in already resembles: a
  // mismatched stand-in (wrong hair/eye/skin coloring vs the analysis JSON)
  // is regenerated and NEVER reaches the swap. This automates the human QA
  // bar behind the Jul-7 15/15.
  const MAX_STANDIN_ATTEMPTS = 3;
  let sceneUrl: string | null = null;
  for (let attempt = 1; attempt <= MAX_STANDIN_ATTEMPTS; attempt++) {
    console.log(
      `[PortraitGen] Step 1: generating stand-in scene (attempt ${attempt}/${MAX_STANDIN_ATTEMPTS})`
    );
    const scene = await generateStandInScene(enhancedPrompt, styleVariantSlug);
    if ("error" in scene) {
      console.error("[PortraitGen] Stand-in scene failed:", scene.error);
      await prisma.portrait.update({
        where: { id: portraitId },
        data: { status: "failed", errorMessage: scene.error },
      });
      return {
        success: false,
        error: "Portrait generation failed. Please try again.",
        errorType: "generation",
      };
    }

    const fidelity = await checkStandInFidelity(scene.sceneUrl, analysis);
    if (fidelity === "match") {
      sceneUrl = scene.sceneUrl;
      break;
    }
    if (fidelity === "unknown") {
      // FAIL-CLOSED: the verifier is blind — abort rather than burn
      // regeneration spend on unverifiable stand-ins (standing rule: fail
      // loudly, never proceed on missing/degraded dependencies).
      console.error("[PortraitGen] Stand-in fidelity check UNAVAILABLE — aborting");
      await prisma.portrait.update({
        where: { id: portraitId },
        data: {
          status: "failed",
          errorMessage: "Stand-in fidelity verification unavailable (vision leg down)",
        },
      });
      return {
        success: false,
        error: "Portrait generation is temporarily unavailable. Please try again later.",
        errorType: "server",
      };
    }
    console.warn(
      `[PortraitGen] Stand-in fidelity MISMATCH on attempt ${attempt} — regenerating`
    );
  }
  if (!sceneUrl) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: `Stand-in did not match subject coloring after ${MAX_STANDIN_ATTEMPTS} attempts`,
      },
    });
    return {
      success: false,
      error: "We couldn't generate a portrait that matches your photo. Please try again.",
      errorType: "generation",
    };
  }

  // Step 8b: identity swap — the real photo is image 1 (identity anchor).
  const subjectKind =
    analysis.subjectType === "pet" ? ("pet" as const) : ("person" as const);
  console.log("[PortraitGen] Step 2: swapping identity onto stand-in scene");
  let swap = await swapFaceIntoScene({
    photoUrl: portrait.sourceImageUrl,
    sceneUrl,
    subjectKind,
  });

  if (!swap.success || !swap.imageUrl) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: swap.error || "Identity swap failed" },
    });
    return {
      success: false,
      error: "Portrait generation failed. Please try again.",
      errorType: "generation",
    };
  }

  // Step 8c: COMBINED ACCEPTANCE GATE (P1 + P2.1 + P2.3) — the output must
  // be BOTH the same person as the source (identity) AND carry the style.
  // FAIL-CLOSED: "unknown" on either axis blocks — the old gate silently
  // returned inert "unknown" and shipped strangers. The old retry fired only
  // on "photoreal" (inverted risk: it pushed outputs AWAY from likeness);
  // now a retry must win on BOTH axes or the portrait fails honestly.
  const assessSwap = async (imageUrl: string) => {
    const [identity, style] = await Promise.all([
      checkIdentityPresence(portrait.sourceImageUrl, imageUrl),
      checkStylePresence(imageUrl, `${stylePack.name} — ${variant.name}`),
    ]);
    return { identity, style, pass: identity === "same" && style === "styled" };
  };

  let verdict = await assessSwap(swap.imageUrl);
  if (!verdict.pass) {
    console.log(
      `[PortraitGen] Acceptance gate failed (identity=${verdict.identity}, style=${verdict.style}) — retrying swap once`
    );
    const retry = await swapFaceIntoScene({
      photoUrl: portrait.sourceImageUrl,
      sceneUrl,
      subjectKind,
    });
    if (retry.success && retry.imageUrl) {
      const retryVerdict = await assessSwap(retry.imageUrl);
      if (retryVerdict.pass) {
        swap = retry;
        verdict = retryVerdict;
      }
    }
  }

  if (!verdict.pass) {
    console.error(
      `[PortraitGen] Acceptance gate FAILED after retry (identity=${verdict.identity}, style=${verdict.style}) — portrait blocked`
    );
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: `Output failed acceptance gate (identity=${verdict.identity}, style=${verdict.style})`,
      },
    });
    return {
      success: false,
      error:
        "The generated portrait didn't match your photo closely enough. Please try again.",
      errorType: "generation",
    };
  }
  console.log(
    `[PortraitGen] Acceptance gate PASSED (identity=${verdict.identity}, style=${verdict.style})`
  );

  // swap.imageUrl is guaranteed here: the initial swap was checked above and
  // the retry is only adopted when retry.imageUrl is present.
  const genResult = { imageUrl: swap.imageUrl! };
  console.log("[PortraitGen] Two-step generation complete");


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

  // --- Step 11: Calculate version number for cache busting ---
  // Count how many times this portrait has been generated (for regeneration)
  const existingVersions = portrait.previewImageUrl
    ? (portrait.previewImageUrl.match(/-v(\d+)-preview/) || [null, "0"])[1]
    : "0";
  const newVersion = parseInt(existingVersions || "0", 10) + 1;
  console.log(`[PortraitGen] Generating version ${newVersion} for portrait ${portraitId}`);

  // --- Step 12: Store hi-res (unwatermarked) ---
  const hiResBuffer = await prepareHiResImage(imageBuffer);
  let hiResImageUrl: string | undefined;
  if (hiResBuffer.success && hiResBuffer.buffer) {
    const hiResUpload = await uploadPortraitHiRes(hiResBuffer.buffer, portraitId, newVersion);
    if (hiResUpload.success) hiResImageUrl = hiResUpload.url;
  }

  // --- Step 13: Upload watermarked preview to R2 ---
  const previewUpload = await uploadPortraitPreview(watermarkResult.buffer, portraitId, newVersion);
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

  // --- Step 14: Update portrait record as complete ---
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
