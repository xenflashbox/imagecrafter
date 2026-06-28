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
  /** Number of subjects detected by Claude Vision (for group handling) */
  subjectCount?: number;
  /** Subject description from Claude Vision (e.g., "a family of four") */
  subjectDescription?: string;
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

// Support both old and new env var names during migration
const ENABLE_FACE_PRESERVATION =
  process.env.ENABLE_FACE_PRESERVATION === "true" ||
  process.env.ENABLE_INSTANTID === "true";

// Kontext Pro model identifier on Replicate
// Full image transformation that preserves ALL faces
const KONTEXT_MODEL = "black-forest-labs/flux-kontext-pro";
const KONTEXT_VERSION = "897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462";

// Initialize Replicate client — fail loud when face preservation is enabled
// but the token is missing, so prod misconfiguration is obvious instead of
// silently returning "not configured" errors deep in the request flow.
const replicate = (() => {
  if (!ENABLE_FACE_PRESERVATION) return null;
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN env var is required when ENABLE_FACE_PRESERVATION=true. " +
        "Set it in Vercel project env (or .env for local) and redeploy."
    );
  }
  return new Replicate({ auth: token });
})();

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
    console.log("[KontextPro] Subject count:", params.subjectCount ?? 1);
    console.log("[KontextPro] Subject description:", params.subjectDescription ?? "single subject");

    // Build the transformation prompt - handles both single and group photos
    const transformPrompt = buildKontextPrompt(
      params.stylePrompt,
      params.subjectCount ?? 1,
      params.subjectDescription
    );

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
 * Transform a style prompt for group/multi-person photos.
 *
 * This function adapts single-person style templates to work correctly
 * with group photos by:
 * 1. Replacing {{subject}} with group-aware language
 * 2. Stripping singular framing language
 * 3. Adding group preservation instructions
 *
 * @param stylePrompt - The original style template prompt
 * @param subjectCount - Number of people detected by Claude Vision
 * @param subjectDescription - Description from Claude Vision (e.g., "a family of four: two adults and two children")
 */
function transformPromptForGroup(
  stylePrompt: string,
  subjectCount: number,
  subjectDescription: string
): string {
  // Replace {{subject}} placeholder with group-aware language
  // Key shift: "a person IS something" → "all people ARE something"
  let prompt = stylePrompt
    // Replace the {{subject}} placeholder with group language
    .replace(/\{\{subject\}\}/g, `all ${subjectCount} people in this group portrait`)
    // Replace singular "portrait" with group variants
    .replace(/\ba portrait of\b/gi, `a group portrait of`)
    .replace(/\bportrait of\b/gi, `group portrait of`)
    // Replace singular positioning language with group alternatives
    .replace(/\bposed in a three-quarter view\b/gi, "in a natural group arrangement")
    .replace(/\bposed in three-quarter view\b/gi, "in a natural group arrangement")
    .replace(/\bin a three-quarter view\b/gi, "in a natural group arrangement")
    // Replace singular references
    .replace(/\ba single\b/gi, "each")
    .replace(/\bthe subject\b/gi, `all ${subjectCount} people`)
    .replace(/\bthe person\b/gi, `all ${subjectCount} people`)
    .replace(/\ba figure\b/gi, `the group`)
    .replace(/\bsingle figure\b/gi, `group of ${subjectCount}`)
    // Handle "as a/an" patterns that imply singular subject
    // e.g., "{{subject}} as a steampunk inventor" → "all people are steampunk inventors"
    .replace(/as a ([a-zA-Z]+)\b/gi, (match, noun) => {
      // Attempt simple pluralization (works for most cases)
      const plural = noun.endsWith("s") ? noun : noun + "s";
      return `are ${plural}`;
    })
    .replace(/as an ([a-zA-Z]+)\b/gi, (match, noun) => {
      const plural = noun.endsWith("s") ? noun : noun + "s";
      return `are ${plural}`;
    });

  // Prepend group preservation instruction (highest priority for Kontext Pro)
  prompt = `IMPORTANT: This is a group photo of ${subjectDescription}. Transform ALL ${subjectCount} people together. Keep every person visible with their exact face preserved. ` + prompt;

  // Append reinforcement
  prompt += ` Maintain all ${subjectCount} people's exact facial features, positions, and identities from the original photo.`;

  // Add quality boosters for group shots
  prompt += " High quality, detailed, professional group portrait, sharp focus on all faces.";

  return prompt;
}

/**
 * Build a Kontext Pro prompt optimized for face preservation.
 *
 * This function handles BOTH single-person and group photos:
 * - Single person (subjectCount <= 1): Uses style template as-is with minimal framing
 * - Group/family (subjectCount > 1): Transforms prompt with group-aware language
 *
 * CRITICAL: Kontext Pro prompts should:
 * 1. For groups: PREPEND multi-face preservation (highest priority)
 * 2. Describe the TRANSFORMATION to apply, not the people
 * 3. Focus on style, clothing, environment changes
 *
 * @param stylePrompt - The style template prompt
 * @param subjectCount - Number of people (default 1 for backwards compatibility)
 * @param subjectDescription - Description from Claude Vision (optional for single person)
 */
function buildKontextPrompt(
  stylePrompt: string,
  subjectCount: number = 1,
  subjectDescription?: string
): string {
  // For group photos (2+ people), use the group transformation
  if (subjectCount > 1 && subjectDescription) {
    return transformPromptForGroup(stylePrompt, subjectCount, subjectDescription);
  }

  // For single-person photos, use a simpler approach
  // No need for group preservation instructions - they can be confusing for single portraits
  let prompt = stylePrompt;

  // Add quality boosters appropriate for single subject
  prompt += " High quality, detailed, professional portrait, sharp focus on face.";

  // Add identity preservation for single person
  prompt += " Maintain the exact facial features and identity from the original photo.";

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
