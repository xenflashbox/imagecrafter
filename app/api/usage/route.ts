import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

/**
 * Usage API
 * 
 * GET /api/usage - Get current user's credit status
 */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create subscription with defaults
    let subscription = user.subscription;
    
    if (!subscription) {
      // Create default free subscription
      subscription = await prisma.subscription.create({
        data: {
          userId: user.id,
          plan: "FREE",
          creditsLimit: PLANS.FREE.creditsPerMonth,
          creditsUsed: 0,
          creditsResetAt: getNextResetDate(),
          maxResolution: PLANS.FREE.maxResolution,
          hasWatermark: true,
          hasProjects: false,
          hasBatchMode: false,
          hasApiAccess: false,
          hasPriorityQueue: false,
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

    // Calculate days until reset
    const now = new Date();
    const resetDate = new Date(subscription.creditsResetAt);
    const daysUntilReset = Math.ceil(
      (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return NextResponse.json({
      used: subscription.creditsUsed,
      limit: subscription.creditsLimit,
      remaining: subscription.creditsLimit - subscription.creditsUsed,
      resetsAt: subscription.creditsResetAt.toISOString(),
      daysUntilReset,
      plan: subscription.plan,
      maxResolution: subscription.maxResolution,
      features: {
        hasWatermark: subscription.hasWatermark,
        hasProjects: subscription.hasProjects,
        hasBatchMode: subscription.hasBatchMode,
        hasApiAccess: subscription.hasApiAccess,
        hasPriorityQueue: subscription.hasPriorityQueue,
      },
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage" },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getNextResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
