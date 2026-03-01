/**
 * Replicate InstantID Service
 *
 * Uses InstantID via Replicate API for face-preserving portrait generation.
 * This service provides TRUE face preservation by extracting face embeddings
 * from the source image and injecting them into the generation process.
 *
 * Unlike text-to-image generation which produces generic faces matching
 * a text description, InstantID preserves the actual facial identity.
 *
 * Model: grandlineai/instant-id-photorealistic
 * Cost: ~$0.011 per run (~12 seconds)
 */

import Replicate from "replicate";

// =============================================================================
// TYPES
// =============================================================================

export interface InstantIDParams {
  /** Public URL of the face image to preserve */
  faceImageUrl: string;
  /** Style/scene prompt (artistic direction) */
  stylePrompt: string;
  /** Negative prompt to avoid unwanted features */
  negativePrompt?: string;
  /**
   * How strongly to preserve facial identity (0.0-1.0)
   * Higher = more like source face, lower = more artistic freedom
   * Recommended: 0.8 for portraits, 0.6 for artistic styles
   */
  identityStrength?: number;
  /** Number of inference steps (higher = better quality, slower) */
  numSteps?: number;
  /** Guidance scale for prompt adherence */
  guidanceScale?: number;
}

export interface InstantIDResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTimeMs?: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const ENABLE_INSTANTID = process.env.ENABLE_INSTANTID === "true";

// InstantID model identifier on Replicate
// Using grandlineai/instant-id-photorealistic for high-quality photorealistic outputs
const INSTANTID_MODEL = "grandlineai/instant-id-photorealistic";

// Initialize Replicate client
const replicate = REPLICATE_API_TOKEN
  ? new Replicate({ auth: REPLICATE_API_TOKEN })
  : null;

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Check if InstantID service is available and enabled.
 */
export function isInstantIDAvailable(): boolean {
  return ENABLE_INSTANTID && !!replicate;
}

/**
 * Generate a portrait using InstantID face preservation.
 *
 * This function:
 * 1. Sends the source face image to Replicate
 * 2. InstantID extracts face embeddings + keypoints
 * 3. Generates new image with preserved facial identity
 * 4. Returns the generated image URL
 *
 * @param params - Generation parameters including face image and style prompt
 * @returns Result with generated image URL or error
 */
export async function generateWithInstantID(
  params: InstantIDParams
): Promise<InstantIDResult> {
  if (!replicate) {
    return {
      success: false,
      error: "Replicate API not configured (missing REPLICATE_API_TOKEN)",
    };
  }

  if (!ENABLE_INSTANTID) {
    return {
      success: false,
      error: "InstantID is not enabled (ENABLE_INSTANTID != true)",
    };
  }

  const startTime = Date.now();

  try {
    console.log("[InstantID] Starting face-preserving generation");
    console.log("[InstantID] Face image:", params.faceImageUrl);
    console.log("[InstantID] Style prompt:", params.stylePrompt.substring(0, 100) + "...");

    // Default parameters optimized for portrait generation
    const identityStrength = params.identityStrength ?? 0.8;
    const numSteps = params.numSteps ?? 30;
    const guidanceScale = params.guidanceScale ?? 5.0;

    const output = await replicate.run(INSTANTID_MODEL, {
      input: {
        // Face reference image
        face_image: params.faceImageUrl,

        // Style/scene prompt
        prompt: params.stylePrompt,

        // Negative prompt to avoid unwanted features
        negative_prompt:
          params.negativePrompt ||
          "blurry, low quality, distorted face, extra limbs, deformed, ugly, duplicate",

        // Identity preservation strength
        // ControlNet controls face keypoints (pose/structure)
        controlnet_conditioning_scale: identityStrength,
        // IP-Adapter controls face identity (features/likeness)
        ip_adapter_scale: identityStrength,

        // Quality parameters
        num_inference_steps: numSteps,
        guidance_scale: guidanceScale,

        // Output settings
        output_format: "png",
        output_quality: 95,
      },
    });

    const processingTimeMs = Date.now() - startTime;
    console.log(`[InstantID] Generation completed in ${processingTimeMs}ms`);

    // Output is typically an array of URLs or a single URL
    let imageUrl: string | undefined;

    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0];
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof output === "object" && "url" in output) {
      imageUrl = (output as { url: string }).url;
    }

    if (!imageUrl) {
      console.error("[InstantID] No output URL received:", output);
      return {
        success: false,
        error: "No image URL returned from InstantID",
        processingTimeMs,
      };
    }

    console.log("[InstantID] Generated image URL:", imageUrl);

    return {
      success: true,
      imageUrl,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error("[InstantID] Generation failed:", error);

    // Handle specific Replicate errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          processingTimeMs,
        };
      }
      if (error.message.includes("invalid image")) {
        return {
          success: false,
          error: "Invalid face image. Please use a clear photo with visible face.",
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
      error: "Unknown error during InstantID generation",
      processingTimeMs,
    };
  }
}

/**
 * Build an InstantID-optimized prompt from subject analysis and style.
 *
 * InstantID prompts should focus on:
 * - Environment/scene description
 * - Artistic style and lighting
 * - Clothing and pose
 *
 * Face description is NOT needed since InstantID preserves actual face.
 * In fact, including face description can confuse the model.
 */
export function buildInstantIDPrompt(
  sceneDescription: string,
  styleModifiers: Record<string, string>
): string {
  const modifierText = Object.entries(styleModifiers)
    .filter(([key]) => !key.toLowerCase().includes("face")) // Remove face-related modifiers
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  // Build prompt focused on scene/style, NOT face
  let prompt = sceneDescription;

  if (modifierText) {
    prompt += `. Style: ${modifierText}`;
  }

  // Add quality boosters
  prompt += ". High quality, detailed, professional photography, sharp focus";

  return prompt;
}
