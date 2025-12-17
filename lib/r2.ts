/**
 * Cloudflare R2 Storage Client
 *
 * Provides S3-compatible storage for user-generated images with:
 * - Automatic CDN caching via Cloudflare
 * - Zero egress costs
 * - Thumbnail generation with Sharp
 * - Async upload support for non-blocking generation
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

const isR2Enabled = !!(
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_ENDPOINT
);

export const r2Client = isR2Enabled
  ? new S3Client({
      region: "auto", // R2 uses "auto" region
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const BUCKET_NAME = process.env.R2_BUCKET || "imagecrafter-prod";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

// =============================================================================
// TYPES
// =============================================================================

export interface UploadImageParams {
  buffer: Buffer;
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadImageResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * Upload an image to R2 storage
 */
export async function uploadToR2(
  params: UploadImageParams
): Promise<UploadImageResult> {
  if (!r2Client) {
    return {
      success: false,
      error: "R2 storage is not configured",
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType || "image/png",
      Metadata: params.metadata,
      // Make publicly accessible via CDN with 1 year cache
      CacheControl: "public, max-age=31536000, immutable",
    });

    await r2Client.send(command);

    // Construct public URL
    const publicUrl = `${PUBLIC_URL}/${params.key}`;

    return {
      success: true,
      url: publicUrl,
      key: params.key,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload a large image using multipart upload (for images > 5MB)
 */
export async function uploadLargeImageToR2(
  params: UploadImageParams
): Promise<UploadImageResult> {
  if (!r2Client) {
    return {
      success: false,
      error: "R2 storage is not configured",
    };
  }

  try {
    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: params.key,
        Body: params.buffer,
        ContentType: params.contentType || "image/png",
        Metadata: params.metadata,
        CacheControl: "public, max-age=31536000, immutable",
      },
    });

    await upload.done();

    const publicUrl = `${PUBLIC_URL}/${params.key}`;

    return {
      success: true,
      url: publicUrl,
      key: params.key,
    };
  } catch (error) {
    console.error("R2 multipart upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// =============================================================================
// THUMBNAIL GENERATION
// =============================================================================

/**
 * Generate a thumbnail from an image buffer using Sharp
 */
export async function generateThumbnail(
  buffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = parseInt(process.env.R2_THUMBNAIL_MAX_WIDTH || "512"),
    maxHeight = parseInt(process.env.R2_THUMBNAIL_MAX_WIDTH || "512"),
    quality = 80,
  } = options;

  try {
    // Dynamic import for sharp to avoid build issues
    const sharp = (await import("sharp")).default;

    return await sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    // Return original buffer if thumbnail fails
    return buffer;
  }
}

// =============================================================================
// IMAGE DELETION
// =============================================================================

/**
 * Delete an image from R2 storage
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  if (!r2Client) {
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("R2 deletion error:", error);
    return false;
  }
}

/**
 * Check if an object exists in R2
 */
export async function existsInR2(key: string): Promise<boolean> {
  if (!r2Client) {
    return false;
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique R2 key for an image
 * Structure: users/{userId}/{year}/{month}/{imageId}.{ext}
 */
export function generateImageKey(
  userId: string,
  imageId: string,
  extension: string = "png"
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `users/${userId}/${year}/${month}/${imageId}.${extension}`;
}

/**
 * Extract R2 key from a public URL
 */
export function extractR2Key(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.slice(1); // Remove leading /
  } catch {
    // If URL parsing fails, return the url as-is (might be a key already)
    return url;
  }
}

/**
 * Check if R2 is enabled and configured
 */
export function isR2Available(): boolean {
  return isR2Enabled;
}

/**
 * Check if a URL is an R2 URL
 */
export function isR2Url(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("r2.cloudflarestorage.com") ||
    url.includes("r2.dev") ||
    url.includes(PUBLIC_URL)
  );
}

/**
 * Fetch image from external URL and return as buffer
 */
export async function fetchImageBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("Content-Type") || "image/png";

    return { buffer, contentType };
  } catch (error) {
    console.error("Image fetch error:", error);
    return null;
  }
}

// =============================================================================
// ASYNC R2 UPLOAD (Non-blocking)
// =============================================================================

/**
 * Upload image to R2 asynchronously (fire-and-forget)
 * Updates database record after upload completes
 */
export async function uploadToR2Async(
  imageId: string,
  geminiImageUrl: string,
  geminiThumbnailUrl: string | null,
  userId: string
): Promise<void> {
  // Import prisma dynamically to avoid circular dependencies
  const { prisma } = await import("@/lib/prisma");

  try {
    // Fetch the generated image from Gemini service
    const imageData = await fetchImageBuffer(geminiImageUrl);
    if (!imageData) {
      console.error(`[R2 Async] Failed to fetch image ${imageId} from Gemini`);
      return;
    }

    // Generate R2 key
    const imageKey = generateImageKey(userId, imageId, "png");

    // Upload main image to R2
    const uploadResult = await uploadToR2({
      buffer: imageData.buffer,
      key: imageKey,
      contentType: imageData.contentType,
      metadata: {
        userId,
        originalUrl: geminiImageUrl.slice(0, 200), // Truncate for metadata limits
      },
    });

    if (!uploadResult.success) {
      console.error(
        `[R2 Async] Failed to upload image ${imageId}:`,
        uploadResult.error
      );
      return;
    }

    // Generate and upload thumbnail
    let thumbnailUrl: string | null = null;
    const shouldGenerateThumbnail =
      process.env.R2_GENERATE_THUMBNAILS !== "false";

    if (shouldGenerateThumbnail) {
      try {
        const thumbnailBuffer = await generateThumbnail(imageData.buffer);
        const thumbnailKey = generateImageKey(userId, `${imageId}-thumb`, "jpg");

        const thumbUploadResult = await uploadToR2({
          buffer: thumbnailBuffer,
          key: thumbnailKey,
          contentType: "image/jpeg",
          metadata: {
            userId,
            type: "thumbnail",
          },
        });

        if (thumbUploadResult.success) {
          thumbnailUrl = thumbUploadResult.url!;
        }
      } catch (thumbError) {
        console.error(
          `[R2 Async] Failed to generate thumbnail for ${imageId}:`,
          thumbError
        );
      }
    }

    // Update database with R2 URLs
    await prisma.image.update({
      where: { id: imageId },
      data: {
        imageUrl: uploadResult.url!,
        thumbnailUrl: thumbnailUrl || geminiThumbnailUrl,
        // Optionally track storage provider
        // storageProvider: "r2",
      },
    });

    console.log(`[R2 Async] Successfully migrated image ${imageId} to R2`);
  } catch (error) {
    console.error(`[R2 Async] Error processing image ${imageId}:`, error);
  }
}

// =============================================================================
// EXPIRATION HELPERS
// =============================================================================

/**
 * Calculate expiration date based on subscription plan
 */
export function calculateExpiration(plan: string): Date | null {
  const expirationDays: Record<string, number> = {
    FREE: parseInt(process.env.R2_EXPIRATION_FREE_TIER || "30"),
    STARTER: parseInt(process.env.R2_EXPIRATION_STARTER || "90"),
    PRO: parseInt(process.env.R2_EXPIRATION_PRO || "365"),
    TEAM: parseInt(process.env.R2_EXPIRATION_TEAM || "0"),
  };

  const days = expirationDays[plan] || 30;

  // 0 means never expire (Team plan)
  if (days === 0) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  isEnabled: boolean;
  bucketName: string;
  publicUrl: string;
}> {
  return {
    isEnabled: isR2Enabled,
    bucketName: BUCKET_NAME,
    publicUrl: PUBLIC_URL,
  };
}
