/**
 * Image Generation Service
 * 
 * Handles image generation with credit-based billing.
 * Wraps the Gemini API at image-gen.xencolabs.com
 */

import { prisma } from "@/lib/prisma";
import {
  CREDIT_COSTS,
  RESOLUTION_DIMENSIONS,
  PLANS,
  getCreditCost,
  isResolutionAvailable,
  type Resolution,
  type PlanTier,
} from "@/lib/plans";
import {
  isR2Available,
  uploadToR2Async,
  calculateExpiration,
} from "@/lib/r2";

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateImageParams {
  userId: string;
  prompt: string;
  enhancedPrompt?: string;
  resolution?: Resolution;
  aspectRatio?: string;
  templateId?: string;
  presetId?: string;
  projectId?: string;
  characterId?: string;
  seed?: number;
}

export interface GenerateImageResult {
  success: boolean;
  image?: {
    id: string;
    imageUrl: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    resolution: string;
    creditsCost: number;
    hasWatermark: boolean;
  };
  error?: string;
  creditsRemaining?: number;
}

export interface UserCredits {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  plan: PlanTier;
  maxResolution: Resolution;
}

// =============================================================================
// CREDIT MANAGEMENT
// =============================================================================

/**
 * Get user's current credit status
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get or create subscription
  let subscription = user.subscription;
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        creditsLimit: PLANS.FREE.creditsPerMonth,
        creditsUsed: 0,
        creditsResetAt: getNextResetDate(),
        maxResolution: PLANS.FREE.maxResolution,
        hasWatermark: true,
      },
    });
  }

  // Check if credits should reset
  if (new Date() >= subscription.creditsResetAt) {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsUsed: 0,
        creditsResetAt: getNextResetDate(),
      },
    });
  }

  return {
    used: subscription.creditsUsed,
    limit: subscription.creditsLimit,
    remaining: subscription.creditsLimit - subscription.creditsUsed,
    resetsAt: subscription.creditsResetAt,
    plan: subscription.plan as PlanTier,
    maxResolution: subscription.maxResolution as Resolution,
  };
}

/**
 * Check if user can generate at a specific resolution
 */
export async function canGenerate(
  userId: string,
  resolution: Resolution
): Promise<{ allowed: boolean; reason?: string; creditsNeeded?: number }> {
  const credits = await getUserCredits(userId);
  const cost = getCreditCost(resolution);

  // Check resolution access
  if (!isResolutionAvailable(credits.plan, resolution)) {
    return {
      allowed: false,
      reason: `${resolution} resolution requires ${getRequiredPlanForResolution(resolution)} plan or higher`,
    };
  }

  // Check credits
  if (credits.remaining < cost) {
    return {
      allowed: false,
      reason: `Not enough credits. Need ${cost}, have ${credits.remaining}`,
      creditsNeeded: cost,
    };
  }

  return { allowed: true, creditsNeeded: cost };
}

/**
 * Deduct credits after successful generation
 */
async function deductCredits(
  userId: string,
  credits: number,
  resolution: Resolution,
  imageId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user?.subscription) {
    throw new Error("No subscription found");
  }

  // Update subscription
  await prisma.subscription.update({
    where: { id: user.subscription.id },
    data: {
      creditsUsed: { increment: credits },
    },
  });

  // Record usage
  await prisma.usageRecord.create({
    data: {
      userId: user.id,
      action: "generate",
      creditsUsed: credits,
      resolution,
      imageId,
      estimatedCost: getEstimatedCost(resolution),
    },
  });
}

// =============================================================================
// IMAGE GENERATION
// =============================================================================

/**
 * Generate an image using the Gemini API
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const {
    userId,
    prompt,
    enhancedPrompt,
    resolution = "1K",
    aspectRatio = "1:1",
    templateId,
    presetId,
    projectId,
    characterId,
    seed,
  } = params;

  // Check if user can generate
  const canGen = await canGenerate(userId, resolution);
  if (!canGen.allowed) {
    return {
      success: false,
      error: canGen.reason,
    };
  }

  // Get user and subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const subscription = user.subscription;
  const hasWatermark = subscription?.hasWatermark ?? true;

  // Get dimensions based on aspect ratio and resolution
  const dimensions = calculateDimensions(resolution, aspectRatio);

  // Call Gemini API
  const apiUrl = process.env.IMAGE_GEN_API_URL || "https://image-gen.xencolabs.com";
  const apiKey = process.env.IMAGE_GEN_API_KEY;

  const startTime = Date.now();

  try {
    const response = await fetch(`${apiUrl}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        prompt: enhancedPrompt || prompt,
        width: dimensions.width,
        height: dimensions.height,
        seed,
        // Add watermark parameter if needed
        watermark: hasWatermark,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const responseData = await response.json();
    const generationTime = Date.now() - startTime;

    // Parse the API response (new structure uses data.image.*)
    const imageData = responseData.image || responseData;
    const imageUrl = imageData.image_url || imageData.imageUrl;
    const thumbnailUrl = imageData.download_url || imageData.thumbnailUrl || null;
    const modelVersion = imageData.model || "gemini-2.0-flash";
    const externalId = imageData.external_id || imageData.id || null;

    if (!imageUrl) {
      throw new Error("No image URL returned from API");
    }

    // Calculate credit cost
    const creditsCost = getCreditCost(resolution);

    // Calculate expiration for R2 storage based on plan
    const plan = subscription?.plan || "FREE";
    const expiresAt = isR2Available() ? calculateExpiration(plan) : null;

    // Save image to database (initially with Gemini URL)
    const image = await prisma.image.create({
      data: {
        userId: user.id,
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt || null,
        imageUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        width: dimensions.width,
        height: dimensions.height,
        resolution,
        creditsCost,
        templateId,
        presetId,
        projectId,
        characterId,
        aspectRatio,
        seed: seed,
        modelVersion: modelVersion,
        generationTime,
        hasWatermark,
        expiresAt,
        externalId: externalId,
      },
    });

    // Trigger async R2 upload (non-blocking)
    // Image is returned immediately with Gemini URL, then migrated to R2 in background
    if (isR2Available()) {
      uploadToR2Async(
        image.id,
        imageUrl,
        thumbnailUrl,
        user.id
      ).catch((err) => {
        console.error("[R2] Async upload failed for image:", image.id, err);
      });
    }

    // Deduct credits
    await deductCredits(userId, creditsCost, resolution, image.id);

    // Save to prompt history
    await prisma.promptHistory.upsert({
      where: {
        id: `${user.id}-${prompt.slice(0, 100)}`, // Simplified unique key
      },
      create: {
        id: `${user.id}-${prompt.slice(0, 100)}`,
        userId: user.id,
        prompt,
        enhancedPrompt,
        templateId,
        presetId,
      },
      update: {
        timesUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    }).catch(() => {
      // Silently fail on history - not critical
    });

    // Get updated credits
    const updatedCredits = await getUserCredits(userId);

    return {
      success: true,
      image: {
        id: image.id,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl || undefined,
        width: image.width,
        height: image.height,
        resolution: image.resolution,
        creditsCost,
        hasWatermark: image.hasWatermark,
      },
      creditsRemaining: updatedCredits.remaining,
    };
  } catch (error) {
    console.error("Image generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

export interface BatchGenerateParams {
  userId: string;
  prompt: string;
  enhancedPrompt?: string;
  resolution?: Resolution;
  aspectRatio?: string;
  count: number;
  templateId?: string;
  presetId?: string;
}

export async function batchGenerate(
  params: BatchGenerateParams
): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  const { userId, resolution = "1K", count } = params;

  // Get user's plan
  const credits = await getUserCredits(userId);
  const plan = PLANS[credits.plan];

  // Check batch access
  if (!plan.features.hasBatchMode) {
    return {
      success: false,
      error: "Batch mode requires Starter plan or higher",
    };
  }

  // Check batch size limit
  if (count > plan.features.maxBatchSize) {
    return {
      success: false,
      error: `Maximum batch size is ${plan.features.maxBatchSize} for your plan`,
    };
  }

  // Calculate total credits needed
  const creditPerImage = getCreditCost(resolution);
  const totalCredits = creditPerImage * count;

  if (credits.remaining < totalCredits) {
    return {
      success: false,
      error: `Not enough credits. Need ${totalCredits}, have ${credits.remaining}`,
    };
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  // Create batch job
  const job = await prisma.batchJob.create({
    data: {
      userId: user.id,
      prompt: params.prompt,
      templateId: params.templateId,
      presetId: params.presetId,
      resolution,
      count,
      creditsReserved: totalCredits,
      status: "PENDING",
    },
  });

  // TODO: Queue the batch job for processing
  // For now, process synchronously (not ideal for production)
  processBatchJob(job.id, params).catch(console.error);

  return {
    success: true,
    jobId: job.id,
  };
}

async function processBatchJob(jobId: string, params: BatchGenerateParams) {
  // Implementation would process images one by one
  // and update the batch job status
  // For production, use a job queue like Bull or similar
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

function getRequiredPlanForResolution(resolution: Resolution): string {
  switch (resolution) {
    case "4K":
      return "Pro";
    case "2K":
      return "Starter";
    default:
      return "Free";
  }
}

function getEstimatedCost(resolution: Resolution): number {
  switch (resolution) {
    case "4K":
      return 0.05;
    case "2K":
      return 0.025;
    default:
      return 0.01;
  }
}

function calculateDimensions(
  resolution: Resolution,
  aspectRatio: string
): { width: number; height: number } {
  const baseDimensions = RESOLUTION_DIMENSIONS[resolution];
  const baseSize = baseDimensions.width;

  // Parse aspect ratio
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) {
    return { width: baseSize, height: baseSize };
  }

  const ratio = w / h;

  if (ratio >= 1) {
    // Landscape or square
    return {
      width: baseSize,
      height: Math.round(baseSize / ratio),
    };
  } else {
    // Portrait
    return {
      width: Math.round(baseSize * ratio),
      height: baseSize,
    };
  }
}

// =============================================================================
// IMAGE DOWNLOAD
// =============================================================================

/**
 * Get a downloadable URL for an image
 * This fetches the image and returns it as a blob URL or base64
 */
export async function getDownloadableImage(
  imageUrl: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = blob.type || "image/png";

    return {
      success: true,
      data: `data:${mimeType};base64,${base64}`,
    };
  } catch (error) {
    console.error("Download failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}
