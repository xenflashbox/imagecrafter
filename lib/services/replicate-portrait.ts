/**
 * Replicate Identity-Swap Service (step 2 of the two-step face-into-scene
 * production flow — PLAN/results/faceswap-two-step.md, 15/15 single-subject).
 *
 * Model: flux-kontext-apps/multi-image-kontext-pro (official two-image
 * Kontext Pro app), $0.08/run, ~15-19s/run. Kontext anchors identity on
 * image 1, so the REAL photo is always image 1 and the generic stand-in
 * scene is image 2 — the reverse order leaves the stand-in's face nearly
 * untouched (measured in testing, not assumed).
 */

import Replicate from "replicate";

// =============================================================================
// TYPES
// =============================================================================

export interface PortraitGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTimeMs?: number;
}

export interface FaceIntoSceneParams {
  /** Public URL of the REAL photo — the identity anchor (image 1). */
  photoUrl: string;
  /** Public URL of the generic stand-in scene (image 2). */
  sceneUrl: string;
  subjectKind: "person" | "pet";
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Support both old and new env var names during migration
const ENABLE_FACE_PRESERVATION =
  process.env.ENABLE_FACE_PRESERVATION === "true" ||
  process.env.ENABLE_INSTANTID === "true";

const MULTI_KONTEXT_MODEL = "flux-kontext-apps/multi-image-kontext-pro";

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
 * Check if identity-preserving generation is available and enabled.
 */
export function isFacePreservationAvailable(): boolean {
  return ENABLE_FACE_PRESERVATION && !!replicate;
}

// Validated construction (two-step test, 15/15). Prompts verbatim from the
// passing run: clothing-ignore wording is REQUIRED (clothing from the real
// photo leaked into the scene without it).
function faceIntoScenePrompt(kind: FaceIntoSceneParams["subjectKind"]): string {
  if (kind === "pet") {
    return "Place the animal from image 1 into the scene shown in image 2. Completely ignore the background from image 1. It wears the collar and attire from image 2, takes the pose from image 2, and is rendered fully in the artistic style of image 2, with image 2's complete background and lighting. The animal's face and identity remain exactly as in image 1 — identical facial structure, fur color and markings, eyes, and natural ear shape.";
  }
  return "Place the person from image 1 into the scene shown in image 2. Completely ignore the clothing and background from image 1. They wear ONLY the costume and headwear from image 2, take the pose from image 2, and are rendered fully in the artistic style of image 2, with image 2's complete background and lighting. Their face and identity remain exactly as in image 1 — identical facial structure, eyes, nose, mouth, skin tone, and age.";
}

/**
 * Fetch image bytes for re-upload to Replicate Files. Accepts https URLs and
 * data URIs (node fetch handles both).
 */
async function fetchImageBlob(url: string, label: string): Promise<Blob> {
  const res = await fetch(url, {
    headers: { "user-agent": "ImageCrafter/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${label} image (HTTP ${res.status})`);
  }
  return await res.blob();
}

/**
 * Step 2 of the two-step face-into-scene flow: swap the real subject's
 * identity onto a generic stand-in scene.
 *
 * Both images are fetched server-side and re-uploaded via Replicate Files —
 * Replicate's own fetcher is 403'd by the Cloudflare bot protection in front
 * of image-storage.xencolabs.com, so passing our URLs directly fails
 * (verified 2026-07-11). The temporary uploads (which include the customer's
 * real photo) are ALWAYS deleted before returning.
 */
export async function swapFaceIntoScene(
  params: FaceIntoSceneParams
): Promise<PortraitGenerationResult> {
  if (!replicate) {
    return {
      success: false,
      error: "Replicate API not configured (missing REPLICATE_API_TOKEN)",
    };
  }

  const startTime = Date.now();
  const uploadedIds: string[] = [];
  try {
    const [photoBlob, sceneBlob] = await Promise.all([
      fetchImageBlob(params.photoUrl, "subject photo"),
      fetchImageBlob(params.sceneUrl, "stand-in scene"),
    ]);

    type ReplicateFile = { id: string; urls: { get: string } };
    const photoFile = (await replicate.files.create(photoBlob)) as ReplicateFile;
    uploadedIds.push(photoFile.id);
    const sceneFile = (await replicate.files.create(sceneBlob)) as ReplicateFile;
    uploadedIds.push(sceneFile.id);

    const output = await replicate.run(MULTI_KONTEXT_MODEL, {
      input: {
        input_image_1: photoFile.urls.get,
        input_image_2: sceneFile.urls.get,
        prompt: faceIntoScenePrompt(params.subjectKind),
        // NEVER "match_input_image" — returns the model's internal
        // side-by-side canvas (20/20 reproductions in attempt 1).
        aspect_ratio: "3:4",
        safety_tolerance: 2,
        output_format: "png",
      },
    });

    const processingTimeMs = Date.now() - startTime;
    const imageUrl = extractUrlFromOutput(output);
    if (!imageUrl) {
      console.error("[FaceIntoScene] No output URL received:", output);
      return {
        success: false,
        error: "No image URL returned from identity swap",
        processingTimeMs,
      };
    }
    return { success: true, imageUrl, processingTimeMs };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error("[FaceIntoScene] Swap failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
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
      return { success: false, error: error.message, processingTimeMs };
    }
    return {
      success: false,
      error: "Unknown error during identity swap",
      processingTimeMs,
    };
  } finally {
    for (const id of uploadedIds) {
      try {
        await replicate.files.delete(id);
      } catch (err) {
        // Never fail the request over cleanup, but a real photo may remain
        // on Replicate — log loudly for follow-up.
        console.error(
          `[FaceIntoScene] PRIVACY: failed to delete temporary Replicate file ${id}:`,
          err
        );
      }
    }
  }
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
