/**
 * Replicate Kontext Pro Portrait Service
 *
 * Uses flux-kontext-pro via Replicate API for face-preserving portrait generation.
 * This service transforms the ENTIRE source image while preserving ALL faces,
 * making it ideal for family portraits, couples, and group photos.
 *
 * Key difference from InstantID:
 * - InstantID: Extracts single face embedding, generates new image with that face
 * - Kontext Pro: Transforms the whole image holistically, preserving ALL people
 *
 * Model: black-forest-labs/flux-kontext-pro
 * Cost: ~$0.04 per run
 */

import Replicate from "replicate";

// =============================================================================
// TYPES
// =============================================================================

export interface PortraitGenerationParams {
  /** Public URL of the source photo (full image, not cropped) */
  sourceImageUrl: string;
  /** Style transformation prompt (describes the desired output style) */
  stylePrompt: string;
  /** Number of inference steps (higher = better quality, slower) */
  numSteps?: number;
  /** Guidance scale for prompt adherence */
  guidanceScale?: number;
}

export interface PortraitGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTimeMs?: number;
}

// Legacy type for backwards compatibility during migration
// faceImageUrl maps to sourceImageUrl internally
export interface InstantIDParams {
  /** Public URL of the face image (legacy - maps to sourceImageUrl) */
  faceImageUrl: string;
  /** Style/scene prompt (artistic direction) */
  stylePrompt: string;
  /** Negative prompt (no longer used with Kontext Pro) */
  negativePrompt?: string;
  /** Identity strength (no longer used - Kontext Pro handles this internally) */
  identityStrength?: number;
  /** Number of inference steps */
  numSteps?: number;
  /** Guidance scale for prompt adherence */
  guidanceScale?: number;
}
export type InstantIDResult = PortraitGenerationResult;

// =============================================================================
// CONFIGURATION
// =============================================================================

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
// Support both old and new env var names during migration
const ENABLE_FACE_PRESERVATION =
  process.env.ENABLE_FACE_PRESERVATION === "true" ||
  process.env.ENABLE_INSTANTID === "true";

// Kontext Pro model identifier on Replicate
// Full image transformation that preserves ALL faces
const KONTEXT_MODEL = "black-forest-labs/flux-kontext-pro";
const KONTEXT_VERSION = "897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462";

// Initialize Replicate client
const replicate = REPLICATE_API_TOKEN
  ? new Replicate({ auth: REPLICATE_API_TOKEN })
  : null;

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Check if face-preserving generation is available and enabled.
 */
export function isFacePreservationAvailable(): boolean {
  return ENABLE_FACE_PRESERVATION && !!replicate;
}

// Legacy alias for backwards compatibility
export const isInstantIDAvailable = isFacePreservationAvailable;

/**
 * Generate a portrait using Kontext Pro face preservation.
 *
 * This function transforms the ENTIRE source image, preserving:
 * - ALL faces in the photo (individuals, couples, families, groups)
 * - Relative positions and relationships between people
 * - Core facial features and identities
 *
 * @param params - Generation parameters including source image and style prompt
 * @returns Result with generated image URL or error
 */
export async function generateWithKontextPro(
  params: PortraitGenerationParams
): Promise<PortraitGenerationResult> {
  if (!replicate) {
    return {
      success: false,
      error: "Replicate API not configured (missing REPLICATE_API_TOKEN)",
    };
  }

  if (!ENABLE_FACE_PRESERVATION) {
    return {
      success: false,
      error: "Face preservation is not enabled (set ENABLE_FACE_PRESERVATION=true)",
    };
  }

  const startTime = Date.now();

  try {
    console.log("[KontextPro] Starting face-preserving generation");
    console.log("[KontextPro] Source image:", params.sourceImageUrl);
    console.log("[KontextPro] Style prompt:", params.stylePrompt.substring(0, 100) + "...");

    // Build the transformation prompt with explicit multi-face preservation
    const transformPrompt = buildKontextPrompt(params.stylePrompt);

    console.log("[KontextPro] Full prompt:", transformPrompt.substring(0, 200) + "...");

    // Kontext Pro parameters - note: no identityStrength, it handles preservation internally
    const guidanceScale = params.guidanceScale ?? 3.5;
    const numSteps = params.numSteps ?? 28;

    const output = await replicate.run(
      `${KONTEXT_MODEL}:${KONTEXT_VERSION}`,
      {
        input: {
          // Full source image - Kontext Pro transforms everything while preserving faces
          input_image: params.sourceImageUrl,

          // Transformation prompt with face preservation instructions
          prompt: transformPrompt,

          // Quality parameters
          steps: numSteps,
          guidance: guidanceScale,

          // Output settings
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 95,

          // Safety - allow artistic content
          safety_tolerance: 3,
        },
      }
    );

    const processingTimeMs = Date.now() - startTime;
    console.log(`[KontextPro] Generation completed in ${processingTimeMs}ms`);

    // Extract URL from various output formats
    const imageUrl = extractUrlFromOutput(output);

    if (!imageUrl) {
      console.error("[KontextPro] No output URL received:", output);
      return {
        success: false,
        error: "No image URL returned from Kontext Pro",
        processingTimeMs,
      };
    }

    console.log("[KontextPro] Generated image URL:", imageUrl);

    return {
      success: true,
      imageUrl,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error("[KontextPro] Generation failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          processingTimeMs,
        };
      }
      if (error.message.includes("invalid") || error.message.includes("image")) {
        return {
          success: false,
          error: "Invalid source image. Please use a clear photo.",
          processingTimeMs,
        };
      }
      if (error.message.includes("NSFW") || error.message.includes("safety")) {
        return {
          success: false,
          error: "Image flagged by safety filter. Please try a different photo.",
          processingTimeMs,
        };
      }
      return {
        success: false,
        error: error.message,
        processingTimeMs,
      };
    }

    return {
      success: false,
      error: "Unknown error during face-preserving generation",
      processingTimeMs,
    };
  }
}

// Legacy alias for backwards compatibility
export async function generateWithInstantID(
  params: InstantIDParams
): Promise<InstantIDResult> {
  return generateWithKontextPro({
    sourceImageUrl: params.faceImageUrl,
    stylePrompt: params.stylePrompt,
    numSteps: params.numSteps,
    guidanceScale: params.guidanceScale,
  });
}

/**
 * Extract URL string from various Replicate output formats.
 */
function extractUrlFromOutput(output: unknown): string | undefined {
  if (typeof output === "string") {
    return output;
  }
  if (output instanceof URL) {
    return output.href;
  }
  if (Array.isArray(output) && output.length > 0) {
    return extractUrlFromOutput(output[0]);
  }
  if (output && typeof output === "object") {
    // Check for href property (URL-like objects)
    if ("href" in output && typeof (output as { href: unknown }).href === "string") {
      return (output as { href: string }).href;
    }
    // Check for url() method (FileOutput objects)
    if ("url" in output && typeof (output as { url: unknown }).url === "function") {
      const urlResult = (output as { url: () => string | URL }).url();
      return typeof urlResult === "string" ? urlResult : urlResult?.href;
    }
    // Try toString as last resort
    if (typeof output.toString === "function") {
      const str = output.toString();
      if (str.startsWith("http")) {
        return str;
      }
    }
  }
  return undefined;
}

/**
 * Build a Kontext Pro prompt optimized for multi-face preservation.
 *
 * CRITICAL: Kontext Pro prompts should:
 * 1. PREPEND multi-face preservation (highest priority)
 * 2. Describe the TRANSFORMATION to apply, not the people
 * 3. Focus on style, clothing, environment changes
 */
function buildKontextPrompt(stylePrompt: string): string {
  // PREPEND multi-face preservation instruction - this MUST come first for highest priority
  // This is CRITICAL for family portraits, couples, and group photos
  let prompt = `IMPORTANT: Keep ALL people from the original photo. Preserve every person's face, identity, and position. This is a group/family portrait - do NOT remove anyone. `;

  // Add the style transformation
  prompt += stylePrompt;

  // Reinforce multi-face preservation at the end
  prompt += ` Maintain the exact same faces, facial features, and identities of ALL people in the original photo.`;

  // Add quality boosters
  prompt += " High quality, detailed, professional portrait, sharp focus on all faces.";

  return prompt;
}

/**
 * Build a Kontext Pro prompt from style template and modifiers.
 *
 * For Kontext Pro, prompts should focus on:
 * - TRANSFORMATION instructions (not subject description)
 * - Environment/scene changes
 * - Artistic style and lighting
 * - Clothing changes
 *
 * Face/subject description is NOT needed - Kontext Pro preserves the actual faces.
 */
export function buildKontextStylePrompt(
  sceneDescription: string,
  styleModifiers: Record<string, string>
): string {
  const modifierText = Object.entries(styleModifiers)
    .filter(([key]) => !key.toLowerCase().includes("face")) // Remove face-related modifiers
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  // Build prompt focused on scene/style transformation
  let prompt = `Transform this photo: ${sceneDescription}`;

  if (modifierText) {
    prompt += `. Apply style: ${modifierText}`;
  }

  return prompt;
}

// Legacy alias for backwards compatibility
export const buildInstantIDPrompt = buildKontextStylePrompt;
