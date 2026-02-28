/**
 * POST /api/images/batch
 *
 * Batch image generation endpoint - generate up to 10 images at once
 * Requires Starter plan or higher
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { batchGenerate, type BatchGenerateParams } from "@/lib/services/image-generation";
import type { Resolution } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
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

    // Auto-provision user if they don't exist in database
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

      await prisma.user.create({
        data: {
          id: userId,
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });

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

    const requestData: BatchGenerateParams = {
      userId,
      prompt: validationResult.data.prompts[0], // Use first prompt as base
      resolution: validationResult.data.resolution as Resolution,
      aspectRatio: validationResult.data.aspectRatio,
      count: validationResult.data.prompts.length,
      templateId: validationResult.data.templateSlug,
      presetId: validationResult.data.presetSlug,
    };

    // Generate the batch
    const result = await batchGenerate(requestData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Batch generation failed",
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
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
