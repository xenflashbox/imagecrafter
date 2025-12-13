/**
 * POST /api/images/generate
 * 
 * Main image generation endpoint for ImageCraft
 * Handles both single image generation and provides enhanced prompts
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { imageGenerationService, type GenerateImageRequest } from "@/lib/services/image-generation";
import { z } from "zod";

// Request validation schema
const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  projectId: z.string().optional(),
  templateSlug: z.string().optional(),
  presetSlug: z.string().optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("16:9"),
  resolution: z.enum(["1K", "2K", "4K"]).default("1K"),
  usePro: z.boolean().default(false),
  styleHints: z.string().optional(),
  skipEnhancement: z.boolean().default(false),
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
    const validationResult = generateRequestSchema.safeParse(body);

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

    const requestData: GenerateImageRequest = {
      userId,
      ...validationResult.data,
    };

    // Generate the image
    const result = await imageGenerationService.generateImage(requestData);

    if (!result.success) {
      // Determine appropriate status code
      const statusCode = result.error?.includes("limit") ? 429 : 
                         result.error?.includes("requires") ? 403 : 
                         500;

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      image: {
        id: result.image!.id,
        externalId: result.image!.externalId,
        imageUrl: result.image!.imageUrl,
        originalPrompt: result.image!.originalPrompt,
        enhancedPrompt: result.image!.enhancedPrompt,
        aspectRatio: result.image!.aspectRatio,
        resolution: result.image!.resolution,
        isWatermarked: result.image!.isWatermarked,
        createdAt: result.image!.generatedAt,
      },
      usageRemaining: result.usageRemaining,
      recommendations: result.recommendations,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
