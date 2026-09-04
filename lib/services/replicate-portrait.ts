/**
 * Replicate Identity-Swap Service (step 2 of the two-step face-into-scene
 * production flow — PLAN/results/faceswap-two-step.md, 15/15 single-subject).
 *
 * Model: openai/gpt-image-2, ~90-110s/run. Chosen over
 * flux-kontext-apps/multi-image-kontext-pro after the 7-candidate bake-off:
 * Kontext (and every landmark swapper tested) returns an idealised stranger,
 * while gpt-image-2 held the real subject's age, smile and bone structure
 * across all four bake-off styles.
 *
 * The REAL photo is always the first reference and the generic stand-in scene
 * the second — the reverse order leaves the stand-in's face nearly untouched
 * (measured in testing, not assumed).
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
  /**
   * Anchored age band from the analysis. The swap regularises very young
   * subjects toward an older child — a 3-year-old came back looking 6-7 even
   * from a correctly-aged stand-in (lead-verified 2026-08-18, renaissance) —
   * and a generic "keep their age" instruction does not hold. Restating the
   * literal band does, the same way it does in the stand-in prompt.
   */
  subjectAge?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Support both old and new env var names during migration
const ENABLE_FACE_PRESERVATION =
  process.env.ENABLE_FACE_PRESERVATION === "true" ||
  process.env.ENABLE_INSTANTID === "true";

const SWAP_MODEL = "openai/gpt-image-2";

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

// Validated construction (two-step test, 15/15): the clothing-ignore wording is
// REQUIRED (clothing from the real photo leaked into the scene without it).
// The headwear clause is conditional because the original unconditional "wear
// the costume and headwear from image 2" became unsatisfiable once stand-ins
// stopped generating headwear — the model invented a scarf or cap over the
// hairline in 4/4 renaissance swaps, deleting a top identity cue.
function faceIntoScenePrompt(
  kind: FaceIntoSceneParams["subjectKind"],
  subjectAge?: string
): string {
  if (kind === "pet") {
    return "Place the animal from image 1 into the scene shown in image 2. Completely ignore the background from image 1. It wears the collar and attire from image 2, takes the pose from image 2, and is rendered fully in the artistic style of image 2, with image 2's complete background and lighting. The animal's face and identity remain exactly as in image 1 — identical facial structure, fur color and markings, eyes, and natural ear shape.";
  }
  const base =
    "Place the person from image 1 into the scene shown in image 2. Completely ignore the clothing and background from image 1. They wear ONLY the costume from image 2, plus any head covering that is actually visible in image 2 — if the head in image 2 is bare, add no hat, cap, headscarf, veil, turban or crown, and leave the hairline and hair fully visible. They take the pose from image 2, and are rendered fully in the artistic style of image 2, with image 2's complete background and lighting. Their face and identity remain exactly as in image 1 — identical facial structure, eyes, nose, mouth, skin tone, and age.";
  if (!subjectAge) return base;
  const isChild = /^(infant|toddler|young child|child)\b/.test(
    subjectAge.toLowerCase()
  );
  return (
    base +
    ` CRITICAL AGE CONSTRAINT: the person is ${subjectAge} and MUST be rendered at exactly that age. Do NOT age them up.` +
    (isChild
      ? " Keep the childlike proportions of image 1: a head large relative to the body, full rounded cheeks, a soft undefined jawline, small facial features set low on the face, and smooth unlined skin. Do not mature the face, lengthen or define the jaw, or slim the cheeks."
      : "")
  );
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

    const output = await replicate.run(SWAP_MODEL, {
      input: {
        input_images: [photoFile.urls.get, sceneFile.urls.get],
        prompt: faceIntoScenePrompt(params.subjectKind, params.subjectAge),
        // NEVER "match_input_image" — returns the model's internal
        // side-by-side canvas (20/20 reproductions in attempt 1).
        aspect_ratio: "3:4",
        quality: "high",
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

const REAL_ESRGAN_MODEL = "nightmareai/real-esrgan";

export interface UpscaleResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
  processingTimeMs?: number;
}

/**
 * Upscale an accepted portrait ×4 with Real-ESRGAN so the delivered hi-res
 * is genuinely 4K-class (engines output ~1MP). Runs AFTER the acceptance
 * gate, so face_enhance stays OFF — GFPGAN would alter the face the
 * identity gate just approved.
 *
 * The temporary Replicate upload is always deleted before returning.
 */
export async function upscalePortraitBuffer(
  imageBuffer: Buffer
): Promise<UpscaleResult> {
  if (!replicate) {
    return {
      success: false,
      error: "Replicate API not configured (missing REPLICATE_API_TOKEN)",
    };
  }

  const startTime = Date.now();
  let uploadedId: string | null = null;
  try {
    type ReplicateFile = { id: string; urls: { get: string } };
    const file = (await replicate.files.create(
      new Blob([new Uint8Array(imageBuffer)], { type: "image/png" })
    )) as ReplicateFile;
    uploadedId = file.id;

    const output = await replicate.run(REAL_ESRGAN_MODEL, {
      input: {
        image: file.urls.get,
        scale: 4,
        face_enhance: false,
      },
    });

    const imageUrl = extractUrlFromOutput(output);
    if (!imageUrl) {
      console.error("[Upscale] No output URL received:", output);
      return {
        success: false,
        error: "No image URL returned from upscaler",
        processingTimeMs: Date.now() - startTime,
      };
    }

    const res = await fetch(imageUrl, {
      headers: { "user-agent": "ImageCrafter/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch upscaled image (HTTP ${res.status})`);
    }
    const upscaled = Buffer.from(await res.arrayBuffer());
    return {
      success: true,
      buffer: upscaled,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Upscale] Upscale failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown upscale error",
      processingTimeMs: Date.now() - startTime,
    };
  } finally {
    if (uploadedId) {
      try {
        await replicate.files.delete(uploadedId);
      } catch (err) {
        console.error(
          `[Upscale] PRIVACY: failed to delete temporary Replicate file ${uploadedId}:`,
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
