/**
 * POST /api/images/generate
 *
 * Main image generation endpoint for ImageCraft.
 *
 * mode: "single" (default) — one image via the service's single endpoint.
 * mode: "dual" (Pro only)  — one request, two provider results persisted under
 *                            one GenerationRequest; the client then POSTs the
 *                            winner to /api/images/requests/[id]/select.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  generateImage,
  generateDual,
  type GenerateImageParams,
  type GenerationResult,
} from "@/lib/services/image-generation";
import type { Resolution } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Request validation schema
const generateRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  mode: z.enum(["single", "dual"]).default("single"),
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

    // Auto-provision user if they don't exist in database
    // This handles cases where the Clerk webhook hasn't fired yet
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json(
          { success: false, error: "Could not fetch user data" },
          { status: 500 }
        );
      }

      const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (!primaryEmail) {
        return NextResponse.json(
          { success: false, error: "User has no email address" },
          { status: 400 }
        );
      }

      // Create user in database
      await prisma.user.create({
        data: {
          id: userId,
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });

      // Create default free subscription
      await prisma.subscription.create({
        data: {
          userId,
          stripeSubscriptionId: `free_${userId}`,
          stripePriceId: "free",
          stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          stripeStatus: "ACTIVE",
          plan: "FREE",
          monthlyImageLimit: 5,
          canUsePro: false,
          canUseBatch: false,
          canUse4K: false,
          canUseProjects: false,
          maxProjectCount: 0,
          imagesUsedThisPeriod: 0,
        },
      });

      console.log(`Auto-provisioned user: ${userId}`);
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

    const data = validationResult.data;

    let result: GenerationResult;
    if (data.mode === "dual") {
      // Pro-only dual compare. The dual endpoint takes no resolution param —
      // the service layer runs it at 1K and gates on the PRO plan itself.
      result = await generateDual({
        userId,
        prompt: data.prompt,
        aspectRatio: data.aspectRatio,
        templateId: data.templateSlug,
        presetId: data.presetSlug,
        projectId: data.projectId,
      });
    } else {
      const requestData: GenerateImageParams = {
        userId,
        prompt: data.prompt,
        resolution: data.resolution as Resolution,
        aspectRatio: data.aspectRatio,
        templateId: data.templateSlug,
        presetId: data.presetSlug,
        projectId: data.projectId,
      };
      result = await generateImage(requestData);
    }

    if (!result.success) {
      // Determine appropriate status code
      const statusCode = result.error?.includes("credits") ? 429 :
                         result.error?.includes("requires") ? 403 :
                         502; // service failure — honest upstream error

      return NextResponse.json(
        {
          success: false,
          requestId: result.requestId,
          mode: result.mode,
          status: result.status,
          failedProviders: result.failedProviders,
          error: result.error,
        },
        { status: statusCode }
      );
    }

    const primary = result.images[0];

    // Success response. `image` preserves the legacy single-image shape;
    // `images`/`requestId`/`status` are the request-level shape (dual pick,
    // partial results) consumed by the new UI.
    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      mode: result.mode,
      status: result.status,
      images: result.images,
      failedProviders: result.failedProviders,
      creditsCharged: result.creditsCharged,
      creditsRemaining: result.creditsRemaining,
      image: primary
        ? {
            id: primary.id,
            imageUrl: primary.imageUrl,
            thumbnailUrl: primary.thumbnailUrl,
            width: primary.width,
            height: primary.height,
            resolution: primary.resolution,
            creditsCost: primary.creditsCost,
            hasWatermark: primary.hasWatermark,
          }
        : undefined,
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
