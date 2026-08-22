/**
 * POST /api/portraits/upload-complete
 *
 * Confirms a photo that the browser PUT straight to R2, then creates the
 * Portrait row. The bucket is the source of truth: size and type come from a
 * HEAD of the stored object, never from the caller. Anything that fails the
 * check is deleted, so a reject leaves nothing behind.
 *
 * Body: { portraitId, key }
 * Returns: { portraitId, sourceImageUrl, sessionId }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  validatePhotoMeta,
  inspectStoredObject,
  discardStoredObject,
  portraitSourceKey,
} from "@/lib/services/file-storage";

const SESSION_COOKIE = "portrait_session_id";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // Guest flow
    }

    let body: { portraitId?: string; key?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request. Expected JSON." },
        { status: 400 }
      );
    }

    const { portraitId, key } = body;
    if (typeof portraitId !== "string" || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "portraitId and key are required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId && !userId) {
      return NextResponse.json(
        { success: false, error: "Upload session expired. Please try again." },
        { status: 400 }
      );
    }

    const owner = userId || sessionId!;

    const stored = await inspectStoredObject(key);
    if (!stored.exists) {
      return NextResponse.json(
        { success: false, error: "We couldn't find your uploaded photo. Please try again." },
        { status: 404 }
      );
    }

    // The key is derived, so recomputing it proves the caller is confirming the
    // object we signed for them and not pointing this portrait at someone else's.
    const contentType = stored.contentType || "";
    if (key !== portraitSourceKey(owner, portraitId, contentType)) {
      return NextResponse.json(
        { success: false, error: "That upload doesn't belong to this session." },
        { status: 403 }
      );
    }

    const validation = validatePhotoMeta(contentType, stored.sizeBytes ?? 0);
    if (!validation.valid) {
      await discardStoredObject(key);
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 422 }
      );
    }

    const portrait = await prisma.portrait.create({
      data: {
        id: portraitId,
        userId: userId || null,
        sessionId: sessionId || owner,
        sourceImageUrl: `${PUBLIC_URL}/${key}`,
        sourceImageKey: key,
        stylePackSlug: "",
        styleVariantSlug: "",
        subjectType: "person",
        subjectAnalysis: {},
        enhancedPrompt: "",
        status: "pending",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      portraitId: portrait.id,
      sourceImageUrl: portrait.sourceImageUrl,
      sessionId: portrait.sessionId,
    });
  } catch (error) {
    console.error("[UploadComplete] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
