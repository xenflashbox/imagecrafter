/**
 * Portrait File Storage Service
 *
 * Handles photo uploads for Portrait Studio using R2.
 * Separate from the existing image-generation R2 logic —
 * portraits use the path portraits/ within the same bucket.
 */

import { r2Client, isR2Available } from "@/lib/r2";
import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const BUCKET_NAME = process.env.R2_BUCKET || "imagecrafter-prod";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Photos reach R2 by a presigned PUT straight from the browser, so Vercel's
// ~4.5MB function payload cap never applies to them. This is the product cap.
const MAX_SIZE_MB = parseInt(process.env.PORTRAIT_MAX_UPLOAD_SIZE_MB || "25");
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// The legacy path POSTs the photo through a Vercel function, which rejects any
// body over ~4.5MB at the edge before our code runs. Promising more than the
// platform accepts would surface as an opaque 413, so this path caps lower.
const PROXY_MAX_SIZE_BYTES = 4 * 1024 * 1024;

const UPLOAD_URL_TTL_SECONDS = 300;

export interface UploadPortraitResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface ValidatePhotoResult {
  valid: boolean;
  error?: string;
  contentType?: string;
}

/**
 * Validate type and size without needing the bytes, so the same rules apply
 * before a presigned upload is issued and again after it lands.
 */
export function validatePhotoMeta(
  contentType: string,
  fileSizeBytes: number,
  maxBytes: number = MAX_SIZE_BYTES
): ValidatePhotoResult {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  if (fileSizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${Math.floor(maxBytes / 1024 / 1024)}MB.`,
    };
  }

  if (fileSizeBytes <= 0) {
    return { valid: false, error: "Empty file received." };
  }

  return { valid: true, contentType };
}

/**
 * Validate a file that was POSTed through a Vercel function.
 * Checks type and size; does NOT check content (Claude does that).
 */
export function validatePhotoFile(
  buffer: Buffer,
  contentType: string,
  fileSizeBytes: number
): ValidatePhotoResult {
  return validatePhotoMeta(contentType, fileSizeBytes, PROXY_MAX_SIZE_BYTES);
}

/** R2 key a portrait's source photo must live at. */
export function portraitSourceKey(
  sessionOrUserId: string,
  portraitId: string,
  contentType: string
): string {
  const ext =
    contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
  return `portraits/uploads/${sessionOrUserId}/${portraitId}.${ext}`;
}

export interface PortraitUploadTicket {
  success: boolean;
  uploadUrl?: string;
  key?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Issue a short-lived presigned PUT so the browser can send the photo straight
 * to R2. Nothing about the photo passes through a Vercel function, so the
 * platform's ~4.5MB request-body cap never applies.
 *
 * The signature is bound to one exact key and content type. Size cannot be
 * signed reliably across clients, so it is enforced on confirmation instead —
 * the Portrait row is only created after the stored object is inspected.
 */
export async function createPortraitUploadTicket(
  contentType: string,
  sessionOrUserId: string,
  portraitId: string
): Promise<PortraitUploadTicket> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  const key = portraitSourceKey(sessionOrUserId, portraitId, contentType);

  try {
    const uploadUrl = await getSignedUrl(
      r2Client,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: "private, max-age=0",
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS }
    );

    return { success: true, uploadUrl, key, publicUrl: `${PUBLIC_URL}/${key}` };
  } catch (error) {
    console.error("[PortraitStorage] Presign error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not prepare upload",
    };
  }
}

export interface StoredObjectInfo {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
}

/** Inspect what actually landed in R2, so confirmation trusts the bucket, not the client. */
export async function inspectStoredObject(key: string): Promise<StoredObjectInfo> {
  if (!isR2Available() || !r2Client) return { exists: false };

  try {
    const head = await r2Client.send(
      new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    return {
      exists: true,
      sizeBytes: head.ContentLength,
      contentType: head.ContentType,
    };
  } catch {
    return { exists: false };
  }
}

/** Remove an object that failed confirmation, so rejects leave nothing behind. */
export async function discardStoredObject(key: string): Promise<void> {
  if (!isR2Available() || !r2Client) return;
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
  } catch (error) {
    console.error("[PortraitStorage] Discard failed for", key, error);
  }
}

/**
 * Upload a portrait source photo to R2.
 * Path: portraits/uploads/{sessionOrUserId}/{portraitId}.{ext}
 */
export async function uploadPortraitSource(
  buffer: Buffer,
  contentType: string,
  sessionOrUserId: string,
  portraitId: string
): Promise<UploadPortraitResult> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  const ext = contentType === "image/webp" ? "webp" : contentType === "image/png" ? "png" : "jpg";
  const key = `portraits/uploads/${sessionOrUserId}/${portraitId}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "private, max-age=0",
      Metadata: { portraitId, type: "source" },
    });

    await r2Client.send(command);

    return {
      success: true,
      url: `${PUBLIC_URL}/${key}`,
      key,
    };
  } catch (error) {
    console.error("[PortraitStorage] Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Upload a generated portrait preview (watermarked) to R2.
 * Path: portraits/previews/{portraitId}-v{version}-preview.png
 *
 * Uses versioned filenames to bust browser cache on regeneration.
 */
export async function uploadPortraitPreview(
  buffer: Buffer,
  portraitId: string,
  version: number = 1
): Promise<UploadPortraitResult> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  // Include version in filename to bust cache on regeneration
  const key = `portraits/previews/${portraitId}-v${version}-preview.png`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      // Shorter cache since we use versioned URLs now
      CacheControl: "public, max-age=86400",
      Metadata: { portraitId, type: "preview", version: String(version) },
    });

    await r2Client.send(command);

    return {
      success: true,
      url: `${PUBLIC_URL}/${key}`,
      key,
    };
  } catch (error) {
    console.error("[PortraitStorage] Preview upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Preview upload failed",
    };
  }
}

/**
 * Upload the purchased hi-res portrait (no watermark) to R2.
 * Path: portraits/hires/{portraitId}-v{version}-hires.png (private — not publicly linked until purchased)
 */
export async function uploadPortraitHiRes(
  buffer: Buffer,
  portraitId: string,
  version: number = 1
): Promise<UploadPortraitResult> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  // Include version in filename for consistency with preview
  const key = `portraits/hires/${portraitId}-v${version}-hires.png`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "private, max-age=0",
      Metadata: { portraitId, type: "hires" },
    });

    await r2Client.send(command);

    return {
      success: true,
      url: `${PUBLIC_URL}/${key}`,
      key,
    };
  } catch (error) {
    console.error("[PortraitStorage] Hi-res upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hi-res upload failed",
    };
  }
}

/** Generate a new portrait ID */
export function generatePortraitId(): string {
  return randomUUID().replace(/-/g, "");
}
