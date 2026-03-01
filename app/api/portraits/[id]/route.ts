/**
 * GET /api/portraits/[id]
 * Fetch a portrait's status and data.
 *
 * PATCH /api/portraits/[id]
 * Claim a guest portrait to the authenticated user's account.
 *
 * DUAL-FLOW: Guest (sessionId cookie) or authenticated subscriber (Clerk).
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

/**
 * PATCH /api/portraits/[id]
 *
 * Claim a guest portrait to the authenticated user's account.
 * Only works if:
 * - User is authenticated
 * - Portrait's sessionId matches the request sessionId (proves ownership)
 * - Portrait is not already claimed (userId is null)
 */
export async function PATCH(
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

    // --- Auth: REQUIRED for claiming ---
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // No auth
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "You must be signed in to save portraits to your account" },
        { status: 401 }
      );
    }

    // --- Get sessionId from request body or cookie ---
    let sessionId: string | undefined;
    try {
      const body = await request.json();
      sessionId = body.sessionId;
    } catch {
      // No body, try cookie
    }
    if (!sessionId) {
      sessionId = request.cookies.get("portrait_session_id")?.value;
    }

    // --- Load portrait ---
    const portrait = await prisma.portrait.findUnique({
      where: { id: portraitId },
      select: {
        id: true,
        userId: true,
        sessionId: true,
        status: true,
      },
    });

    if (!portrait) {
      return NextResponse.json(
        { success: false, error: "Portrait not found" },
        { status: 404 }
      );
    }

    // --- Check ownership via sessionId ---
    if (portrait.sessionId !== sessionId) {
      return NextResponse.json(
        { success: false, error: "Not authorized to claim this portrait" },
        { status: 403 }
      );
    }

    // --- Check if already claimed ---
    if (portrait.userId) {
      if (portrait.userId === userId) {
        // Already belongs to this user
        return NextResponse.json({
          success: true,
          message: "Portrait is already saved to your account",
          alreadySaved: true,
        });
      }
      return NextResponse.json(
        { success: false, error: "This portrait belongs to another account" },
        { status: 403 }
      );
    }

    // --- Claim the portrait ---
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Portrait saved to your account!",
      alreadySaved: false,
    });
  } catch (error) {
    console.error("[Portraits/id PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save portrait" },
      { status: 500 }
    );
  }
}
