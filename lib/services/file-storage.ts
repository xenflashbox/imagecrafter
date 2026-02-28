/**
 * Portrait File Storage Service
 *
 * Handles photo uploads for Portrait Studio using R2.
 * Separate from the existing image-generation R2 logic —
 * portraits use the path portraits/ within the same bucket.
 */

import { r2Client, isR2Available } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const BUCKET_NAME = process.env.R2_BUCKET || "imagecrafter-prod";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_MB = parseInt(process.env.PORTRAIT_MAX_UPLOAD_SIZE_MB || "10");
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

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
 * Validate an uploaded file before storing it.
 * Checks type and size; does NOT check content (Claude does that).
 */
export function validatePhotoFile(
  buffer: Buffer,
  contentType: string,
  fileSizeBytes: number
): ValidatePhotoResult {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported file type. Please upload a JPEG, PNG, or WebP image.`,
    };
  }

  if (fileSizeBytes > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.`,
    };
  }

  if (buffer.length === 0) {
    return { valid: false, error: "Empty file received." };
  }

  return { valid: true, contentType };
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
 * Path: portraits/previews/{portraitId}-preview.png
 */
export async function uploadPortraitPreview(
  buffer: Buffer,
  portraitId: string
): Promise<UploadPortraitResult> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  const key = `portraits/previews/${portraitId}-preview.png`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=3600",
      Metadata: { portraitId, type: "preview" },
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
 * Path: portraits/hires/{portraitId}-hires.png (private — not publicly linked until purchased)
 */
export async function uploadPortraitHiRes(
  buffer: Buffer,
  portraitId: string
): Promise<UploadPortraitResult> {
  if (!isR2Available() || !r2Client) {
    return { success: false, error: "Storage is not configured" };
  }

  const key = `portraits/hires/${portraitId}-hires.png`;

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
