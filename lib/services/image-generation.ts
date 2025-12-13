/**
 * ImageCraft Image Generation Service
 * 
 * Wraps the existing Gemini Image Gen API at image-gen.xencolabs.com
 * Handles:
 * - Single and batch image generation
 * - Usage tracking and plan limits
 * - Watermarking for free tier
 * - Character profile injection
 * - Project association
 */

import { prisma } from "@/lib/prisma";
import { PromptEnhancementService } from "./prompt-enhancement";
import type {
  Image,
  Project,
  User,
  Subscription,
  PlanTier,
  Resolution,
  UsageAction,
} from "@prisma/client";

// ============================================================================
// CONFIGURATION
// ============================================================================

const IMAGE_GEN_API_BASE = process.env.IMAGE_GEN_API_URL || "https://image-gen.xencolabs.com";
const IMAGE_GEN_API_KEY = process.env.IMAGE_GEN_API_KEY!;

// Plan limits
const PLAN_LIMITS: Record<
  PlanTier,
  {
    monthlyImages: number;
    canUsePro: boolean;
    canUseBatch: boolean;
    canUse4K: boolean;
    canUseProjects: boolean;
    maxProjects: number;
    watermarked: boolean;
  }
> = {
  FREE: {
    monthlyImages: 5,
    canUsePro: false,
    canUseBatch: false,
    canUse4K: false,
    canUseProjects: false,
    maxProjects: 0,
    watermarked: true,
  },
  STARTER: {
    monthlyImages: 100,
    canUsePro: false,
    canUseBatch: true,
    canUse4K: false,
    canUseProjects: false,
    maxProjects: 0,
    watermarked: false,
  },
  PRO: {
    monthlyImages: 500,
    canUsePro: true,
    canUseBatch: true,
    canUse4K: true,
    canUseProjects: true,
    maxProjects: 10,
    watermarked: false,
  },
  TEAM: {
    monthlyImages: 2000,
    canUsePro: true,
    canUseBatch: true,
    canUse4K: true,
    canUseProjects: true,
    maxProjects: 50,
    watermarked: false,
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateImageRequest {
  userId: string;
  prompt: string;
  projectId?: string;
  templateSlug?: string;
  presetSlug?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  resolution?: "1K" | "2K" | "4K";
  usePro?: boolean;
  styleHints?: string;
  skipEnhancement?: boolean; // For power users who want raw prompts
}

export interface GenerateImageResult {
  success: boolean;
  image?: Image;
  error?: string;
  usageRemaining?: number;
  enhancedPrompt?: string;
  recommendations?: Record<string, unknown>;
}

export interface BatchGenerateRequest {
  userId: string;
  prompts: string[];
  projectId?: string;
  templateSlug?: string;
  presetSlug?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  resolution?: "1K" | "2K" | "4K";
  usePro?: boolean;
  styleHints?: string;
}

export interface BatchGenerateResult {
  success: boolean;
  batchId: string;
  totalRequested: number;
  completed: number;
  failed: number;
  images: Image[];
  errors: Array<{ index: number; error: string }>;
}

interface ApiGenerateResponse {
  success: boolean;
  image?: {
    external_id: string;
    image_url: string;
    prompt: string;
    aspect_ratio: string;
  };
  error?: string;
}

interface ApiBatchResponse {
  success: boolean;
  images?: Array<{
    external_id: string;
    image_url: string;
    prompt: string;
    aspect_ratio: string;
  }>;
  errors?: Array<{ index: number; error: string }>;
}

// ============================================================================
// IMAGE GENERATION SERVICE
// ============================================================================

export class ImageGenerationService {
  private promptService: PromptEnhancementService;

  constructor() {
    this.promptService = new PromptEnhancementService();
  }

  /**
   * Generate a single image
   */
  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResult> {
    const {
      userId,
      prompt,
      projectId,
      templateSlug,
      presetSlug,
      aspectRatio = "16:9",
      resolution = "1K",
      usePro = false,
      styleHints,
      skipEnhancement = false,
    } = request;

    // 1. Check user subscription and limits
    const { user, subscription } = await this.getUserWithSubscription(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const limits = this.getPlanLimits(subscription);

    // Check usage limits
    const usageCheck = await this.checkUsageLimits(userId, subscription, limits);
    if (!usageCheck.allowed) {
      return { success: false, error: usageCheck.reason };
    }

    // Check feature access
    if (usePro && !limits.canUsePro) {
      return {
        success: false,
        error: "Pro model requires Pro or Team plan. Upgrade to access higher quality images.",
      };
    }

    if (resolution === "4K" && !limits.canUse4K) {
      return {
        success: false,
        error: "4K resolution requires Pro or Team plan.",
      };
    }

    // 2. Enhance the prompt (unless skipped)
    let finalPrompt = prompt;
    let enhancementResult = null;

    if (!skipEnhancement) {
      enhancementResult = await this.promptService.enhancePrompt({
        userPrompt: prompt,
        templateSlug,
        presetSlug,
        projectId,
        aspectRatio,
        styleHints,
      });
      finalPrompt = enhancementResult.enhancedPrompt;
    }

    // 3. Call the image generation API
    const apiResponse = await this.callGenerateApi({
      prompt: finalPrompt,
      aspectRatio,
      resolution,
      usePro,
      styleHints: enhancementResult?.styleHints || styleHints,
    });

    if (!apiResponse.success || !apiResponse.image) {
      return { success: false, error: apiResponse.error || "Image generation failed" };
    }

    // 4. Store the image record
    const image = await prisma.image.create({
      data: {
        externalId: apiResponse.image.external_id,
        userId,
        projectId,
        imageUrl: apiResponse.image.image_url,
        originalPrompt: prompt,
        enhancedPrompt: finalPrompt,
        aspectRatio,
        resolution: this.mapResolution(resolution),
        model: usePro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image",
        usedPro: usePro,
        styleHints: enhancementResult?.styleHints || styleHints,
        templateId: templateSlug
          ? (await prisma.template.findUnique({ where: { slug: templateSlug } }))?.id
          : undefined,
        characterInjected: enhancementResult?.characterInjected || false,
        isWatermarked: limits.watermarked,
        status: "COMPLETED",
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    // 5. Record usage
    await this.recordUsage(userId, subscription, {
      action: usePro ? "IMAGE_GENERATED_PRO" : "IMAGE_GENERATED",
      imageId: image.id,
      resolution: this.mapResolution(resolution),
    });

    // 6. Store prompt history
    await prisma.promptHistory.create({
      data: {
        userId,
        originalPrompt: prompt,
        enhancedPrompt: finalPrompt,
        templateSlug,
        projectId,
        aspectRatio,
        resolution: this.mapResolution(resolution),
        model: usePro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image",
        styleHints: enhancementResult?.styleHints || styleHints,
        imageId: image.id,
        wasSuccessful: true,
      },
    });

    // 7. Return result
    const usageRemaining = limits.monthlyImages - (subscription?.imagesUsedThisPeriod || 0) - 1;

    return {
      success: true,
      image,
      usageRemaining,
      enhancedPrompt: finalPrompt,
      recommendations: enhancementResult?.recommendations,
    };
  }

  /**
   * Generate multiple images in a batch
   */
  async generateBatch(request: BatchGenerateRequest): Promise<BatchGenerateResult> {
    const {
      userId,
      prompts,
      projectId,
      templateSlug,
      presetSlug,
      aspectRatio = "16:9",
      resolution = "1K",
      usePro = false,
      styleHints,
    } = request;

    // Validate batch size
    if (prompts.length > 10) {
      return {
        success: false,
        batchId: "",
        totalRequested: prompts.length,
        completed: 0,
        failed: prompts.length,
        images: [],
        errors: [{ index: -1, error: "Maximum batch size is 10 images" }],
      };
    }

    // Check subscription
    const { subscription } = await this.getUserWithSubscription(userId);
    const limits = this.getPlanLimits(subscription);

    if (!limits.canUseBatch) {
      return {
        success: false,
        batchId: "",
        totalRequested: prompts.length,
        completed: 0,
        failed: prompts.length,
        images: [],
        errors: [{ index: -1, error: "Batch generation requires Starter plan or higher" }],
      };
    }

    // Check if user has enough credits
    const remaining =
      (subscription?.monthlyImageLimit || 5) - (subscription?.imagesUsedThisPeriod || 0);
    if (remaining < prompts.length) {
      return {
        success: false,
        batchId: "",
        totalRequested: prompts.length,
        completed: 0,
        failed: prompts.length,
        images: [],
        errors: [
          {
            index: -1,
            error: `Insufficient credits. You have ${remaining} images remaining this period.`,
          },
        ],
      };
    }

    // Create batch job record
    const batchJob = await prisma.batchJob.create({
      data: {
        userId,
        totalImages: prompts.length,
        status: "PROCESSING",
        prompts: prompts,
        sharedSettings: { aspectRatio, resolution, usePro, styleHints },
        startedAt: new Date(),
      },
    });

    // Enhance all prompts
    const enhancedPrompts = await Promise.all(
      prompts.map((prompt) =>
        this.promptService.enhancePrompt({
          userPrompt: prompt,
          templateSlug,
          presetSlug,
          projectId,
          aspectRatio,
          styleHints,
        })
      )
    );

    // Call batch API
    const apiResponse = await this.callBatchApi({
      prompts: enhancedPrompts.map((e) => e.enhancedPrompt),
      aspectRatio,
      resolution,
      usePro,
    });

    const images: Image[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Process results
    if (apiResponse.images) {
      for (let i = 0; i < apiResponse.images.length; i++) {
        const apiImage = apiResponse.images[i];

        const image = await prisma.image.create({
          data: {
            externalId: apiImage.external_id,
            userId,
            projectId,
            imageUrl: apiImage.image_url,
            originalPrompt: prompts[i],
            enhancedPrompt: enhancedPrompts[i].enhancedPrompt,
            aspectRatio,
            resolution: this.mapResolution(resolution),
            model: usePro ? "gemini-3-pro-image-preview" : "gemini-2.5-flash-image",
            usedPro: usePro,
            styleHints: enhancedPrompts[i].styleHints,
            characterInjected: enhancedPrompts[i].characterInjected,
            isWatermarked: limits.watermarked,
            status: "COMPLETED",
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });

        images.push(image);

        // Record usage for each image
        await this.recordUsage(userId, subscription, {
          action: usePro ? "IMAGE_GENERATED_PRO" : "IMAGE_GENERATED",
          imageId: image.id,
          resolution: this.mapResolution(resolution),
        });
      }
    }

    if (apiResponse.errors) {
      errors.push(...apiResponse.errors);
    }

    // Update batch job
    await prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: errors.length === 0 ? "COMPLETED" : errors.length < prompts.length ? "PARTIAL_FAILURE" : "FAILED",
        completedImages: images.length,
        failedImages: errors.length,
        imageIds: images.map((i) => i.id),
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    return {
      success: images.length > 0,
      batchId: batchJob.id,
      totalRequested: prompts.length,
      completed: images.length,
      failed: errors.length,
      images,
      errors,
    };
  }

  /**
   * Create a character profile from an anchor image
   */
  async createCharacterProfile(
    projectId: string,
    imageId: string,
    characterName: string
  ): Promise<{ success: boolean; profile?: unknown; error?: string }> {
    // Get the image
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { project: true },
    });

    if (!image) {
      return { success: false, error: "Image not found" };
    }

    if (image.projectId !== projectId) {
      return { success: false, error: "Image does not belong to this project" };
    }

    // Analyze the image
    const analysis = await this.promptService.analyzeCharacterImage({
      imageUrl: image.imageUrl,
      characterName,
      projectType: image.project?.projectType || "GENERAL",
      styleNotes: image.styleHints || undefined,
    });

    // Create or update character profile
    const profile = await prisma.characterProfile.upsert({
      where: { projectId },
      update: {
        name: characterName,
        description: analysis.description,
        anchorImageId: imageId,
        physicalTraits: analysis.physicalTraits,
        clothing: analysis.clothing,
        styleNotes: analysis.styleNotes,
        analysisModel: "claude-sonnet-4-20250514",
        analysisVersion: "1.0",
      },
      create: {
        projectId,
        name: characterName,
        description: analysis.description,
        anchorImageId: imageId,
        physicalTraits: analysis.physicalTraits,
        clothing: analysis.clothing,
        styleNotes: analysis.styleNotes,
        analysisModel: "claude-sonnet-4-20250514",
        analysisVersion: "1.0",
      },
    });

    // Record usage
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (project) {
      const { subscription } = await this.getUserWithSubscription(project.userId);
      await this.recordUsage(project.userId, subscription, {
        action: "CHARACTER_ANALYZED",
        imageId,
        resolution: "RES_1K",
      });
    }

    return { success: true, profile };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async getUserWithSubscription(
    userId: string
  ): Promise<{ user: User | null; subscription: Subscription | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    return {
      user,
      subscription: user?.subscription || null,
    };
  }

  private getPlanLimits(subscription: Subscription | null) {
    const plan = subscription?.plan || "FREE";
    return PLAN_LIMITS[plan];
  }

  private async checkUsageLimits(
    userId: string,
    subscription: Subscription | null,
    limits: (typeof PLAN_LIMITS)[PlanTier]
  ): Promise<{ allowed: boolean; reason?: string }> {
    const used = subscription?.imagesUsedThisPeriod || 0;
    const limit = limits.monthlyImages;

    if (used >= limit) {
      return {
        allowed: false,
        reason: `You've reached your monthly limit of ${limit} images. Upgrade your plan for more.`,
      };
    }

    return { allowed: true };
  }

  private async recordUsage(
    userId: string,
    subscription: Subscription | null,
    data: {
      action: UsageAction;
      imageId?: string;
      resolution: Resolution;
    }
  ) {
    // Get billing period
    const periodStart = subscription?.stripeCurrentPeriodEnd
      ? new Date(
          new Date(subscription.stripeCurrentPeriodEnd).getTime() - 30 * 24 * 60 * 60 * 1000
        )
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const periodEnd =
      subscription?.stripeCurrentPeriodEnd ||
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Create usage record
    await prisma.usageRecord.create({
      data: {
        userId,
        action: data.action,
        imageId: data.imageId,
        creditsUsed: 1,
        wasProModel: data.action === "IMAGE_GENERATED_PRO",
        resolution: data.resolution,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
      },
    });

    // Update subscription usage counter
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          imagesUsedThisPeriod: { increment: 1 },
        },
      });
    }
  }

  private async callGenerateApi(params: {
    prompt: string;
    aspectRatio: string;
    resolution: string;
    usePro: boolean;
    styleHints?: string | null;
  }): Promise<ApiGenerateResponse> {
    try {
      const response = await fetch(`${IMAGE_GEN_API_BASE}/api/v1/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": IMAGE_GEN_API_KEY,
        },
        body: JSON.stringify({
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio,
          resolution: params.resolution,
          use_pro: params.usePro,
          style_hints: params.styleHints,
        }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "API call failed",
      };
    }
  }

  private async callBatchApi(params: {
    prompts: string[];
    aspectRatio: string;
    resolution: string;
    usePro: boolean;
  }): Promise<ApiBatchResponse> {
    try {
      const response = await fetch(`${IMAGE_GEN_API_BASE}/api/v1/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": IMAGE_GEN_API_KEY,
        },
        body: JSON.stringify({
          prompts: params.prompts,
          aspect_ratio: params.aspectRatio,
          resolution: params.resolution,
          use_pro: params.usePro,
        }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        errors: [{ index: -1, error: error instanceof Error ? error.message : "API call failed" }],
      };
    }
  }

  private mapResolution(res: string): Resolution {
    switch (res) {
      case "2K":
        return "RES_2K";
      case "4K":
        return "RES_4K";
      default:
        return "RES_1K";
    }
  }
}

// Export singleton instance
export const imageGenerationService = new ImageGenerationService();
