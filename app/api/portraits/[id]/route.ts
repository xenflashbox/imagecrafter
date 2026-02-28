/**
 * GET /api/portraits/[id]
 *
 * Fetch a portrait's status and data.
 * DUAL-FLOW: Guest (sessionId cookie) or authenticated subscriber (Clerk).
 *
 * Returns:
 * - status, previewImageUrl (watermarked), subjectType
 * - Does NOT return hiResImageUrl (only unlocked after purchase)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: portraitId } = await params;

    if (!portraitId) {
      return NextResponse.json(
        { success: false, error: "Portrait ID required" },
        { status: 400 }
      );
    }

    // --- Auth: optional ---
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // Guest flow
    }

    // --- Get sessionId from cookie ---
    const sessionId = request.cookies.get("portrait_session_id")?.value;

    // --- Load portrait ---
    const portrait = await prisma.portrait.findUnique({
      where: { id: portraitId },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        sourceImageUrl: true,
        previewImageUrl: true,
        stylePackSlug: true,
        styleVariantSlug: true,
        subjectType: true,
        status: true,
        errorMessage: true,
        generationTimeMs: true,
        createdAt: true,
        // Never expose hiResImageUrl — only returned after purchase
      },
    });

    if (!portrait) {
      return NextResponse.json(
        { success: false, error: "Portrait not found" },
        { status: 404 }
      );
    }

    // --- Authorization: must be owner ---
    const isOwner =
      (userId && portrait.userId === userId) ||
      (sessionId && portrait.sessionId === sessionId);

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: "Not authorized to view this portrait" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      portrait: {
        id: portrait.id,
        status: portrait.status,
        previewImageUrl: portrait.previewImageUrl,
        sourceImageUrl: portrait.sourceImageUrl,
        stylePackSlug: portrait.stylePackSlug,
        styleVariantSlug: portrait.styleVariantSlug,
        subjectType: portrait.subjectType,
        errorMessage: portrait.errorMessage,
        generationTimeMs: portrait.generationTimeMs,
        createdAt: portrait.createdAt,
        isOwner: true,
      },
    });
  } catch (error) {
    console.error("[Portraits/id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load portrait" },
      { status: 500 }
    );
  }
}
