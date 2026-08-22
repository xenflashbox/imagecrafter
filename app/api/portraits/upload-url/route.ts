/**
 * POST /api/portraits/upload-url
 *
 * Issues a short-lived presigned PUT so the browser sends the photo straight to
 * R2. Only this tiny JSON request goes through Vercel, so the platform's ~4.5MB
 * function body cap never applies to a customer's photo.
 *
 * Body: { contentType, sizeBytes }
 * Returns: { portraitId, sessionId, key, uploadUrl }
 *
 * No Portrait row is created here — that happens in upload-complete, after the
 * stored object has been inspected.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  validatePhotoMeta,
  createPortraitUploadTicket,
  generatePortraitId,
} from "@/lib/services/file-storage";

const SESSION_COOKIE = "portrait_session_id";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // Guest flow
    }

    let body: { contentType?: string; sizeBytes?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request. Expected JSON." },
        { status: 400 }
      );
    }

    const contentType = body.contentType;
    const sizeBytes = body.sizeBytes;
    if (typeof contentType !== "string" || typeof sizeBytes !== "number") {
      return NextResponse.json(
        { success: false, error: "contentType and sizeBytes are required." },
        { status: 400 }
      );
    }

    const validation = validatePhotoMeta(contentType, sizeBytes);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 422 }
      );
    }

    const cookieStore = await cookies();
    const existingSession = cookieStore.get(SESSION_COOKIE)?.value;
    const sessionId = existingSession || randomUUID();

    const portraitId = generatePortraitId();
    const ticket = await createPortraitUploadTicket(
      contentType,
      userId || sessionId,
      portraitId
    );

    if (!ticket.success || !ticket.uploadUrl || !ticket.key) {
      console.error("[UploadUrl] Presign failed:", ticket.error);
      return NextResponse.json(
        { success: false, error: "Could not prepare the upload. Please try again." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      portraitId,
      sessionId,
      key: ticket.key,
      uploadUrl: ticket.uploadUrl,
    });

    if (!existingSession && !userId) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("[UploadUrl] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Could not prepare the upload. Please try again." },
      { status: 500 }
    );
  }
}
