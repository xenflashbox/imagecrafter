import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFromR2, extractR2Key, isR2Url } from "@/lib/r2";

/**
 * Cron job to clean up expired images from R2 storage
 *
 * This endpoint should be called by a cron service (Vercel Cron, EasyCron, etc.)
 * to periodically clean up expired images and free storage space.
 *
 * GET /api/cron/cleanup-expired
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Example cron schedule: 0 2 * * * (daily at 2 AM)
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Skip auth check if no CRON_SECRET is configured (development mode)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find expired images
    const expiredImages = await prisma.image.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: "COMPLETED", // Only delete completed images
        deletedAt: null, // Not already deleted
      },
      select: {
        id: true,
        imageUrl: true,
        thumbnailUrl: true,
        userId: true,
      },
      take: 100, // Process in batches to avoid timeout
    });

    console.log(`[Cleanup] Found ${expiredImages.length} expired images`);

    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const image of expiredImages) {
      try {
        // Delete from R2 if it's an R2 URL
        if (image.imageUrl && isR2Url(image.imageUrl)) {
          const key = extractR2Key(image.imageUrl);
          const success = await deleteFromR2(key);
          if (!success) {
            console.warn(`[Cleanup] Failed to delete R2 object: ${key}`);
          }
        }

        // Delete thumbnail from R2 if it exists
        if (image.thumbnailUrl && isR2Url(image.thumbnailUrl)) {
          const thumbKey = extractR2Key(image.thumbnailUrl);
          await deleteFromR2(thumbKey);
        }

        // Mark as expired in database (soft delete)
        await prisma.image.update({
          where: { id: image.id },
          data: {
            status: "EXPIRED",
            deletedAt: now,
          },
        });

        deleted++;
      } catch (error) {
        console.error(`[Cleanup] Failed to delete image ${image.id}:`, error);
        errors.push(
          `${image.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        failed++;
      }
    }

    // Log summary
    console.log(`[Cleanup] Complete: ${deleted} deleted, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: expiredImages.length,
      deleted,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error details
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual trigger with options
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false, limit = 100 } = body;

    const now = new Date();

    // Find expired images
    const expiredImages = await prisma.image.findMany({
      where: {
        expiresAt: {
          lte: now,
        },
        status: "COMPLETED",
        deletedAt: null,
      },
      select: {
        id: true,
        imageUrl: true,
        thumbnailUrl: true,
        userId: true,
        expiresAt: true,
      },
      take: Math.min(limit, 500), // Cap at 500
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        wouldDelete: expiredImages.length,
        images: expiredImages.map((img) => ({
          id: img.id,
          expiresAt: img.expiresAt,
          isR2: isR2Url(img.imageUrl),
        })),
      });
    }

    // Delegate to GET handler for actual cleanup
    return GET(request);
  } catch (error) {
    console.error("[Cleanup POST] Error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
