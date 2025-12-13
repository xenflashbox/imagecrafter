/**
 * POST /api/images/batch
 * 
 * Batch image generation endpoint - generate up to 10 images at once
 * Requires Starter plan or higher
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imageGenerationService, type BatchGenerateRequest } from "@/lib/services/image-generation";
import { z } from "zod";

// Request validation schema
const batchRequestSchema = z.object({
  prompts: z.array(z.string().min(1).max(2000)).min(1).max(10),
  projectId: z.string().optional(),
  templateSlug: z.string().optional(),
  presetSlug: z.string().optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("16:9"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  usePro: z.boolean().default(false),
  styleHints: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = batchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const requestData: BatchGenerateRequest = {
      userId,
      ...validationResult.data,
    };

    // Generate the batch
    const result = await imageGenerationService.generateBatch(requestData);

    if (!result.success && result.completed === 0) {
      const statusCode = result.errors[0]?.error?.includes("Insufficient") ? 429 :
                         result.errors[0]?.error?.includes("requires") ? 403 :
                         500;

      return NextResponse.json(
        {
          success: false,
          error: result.errors[0]?.error || "Batch generation failed",
        },
        { status: statusCode }
      );
    }

    // Success response (may include partial failures)
    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      summary: {
        totalRequested: result.totalRequested,
        completed: result.completed,
        failed: result.failed,
      },
      images: result.images.map((img) => ({
        id: img.id,
        externalId: img.externalId,
        imageUrl: img.imageUrl,
        originalPrompt: img.originalPrompt,
        enhancedPrompt: img.enhancedPrompt,
        aspectRatio: img.aspectRatio,
        isWatermarked: img.isWatermarked,
      })),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Batch generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
