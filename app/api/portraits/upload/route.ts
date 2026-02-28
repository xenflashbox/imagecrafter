/**
 * POST /api/portraits/upload
 *
 * DUAL-FLOW: Works for both guests (no auth) and authenticated subscribers.
 *
 * Guest:      sessionId from cookie, userId = null
 * Subscriber: userId from Clerk + sessionId preserved for continuity
 *
 * 1. Parse multipart form data
 * 2. Validate file type and size
 * 3. Upload source photo to R2
 * 4. Create Portrait record in DB
 * 5. Return portraitId for polling/next steps
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  validatePhotoFile,
  uploadPortraitSource,
  generatePortraitId,
} from "@/lib/services/file-storage";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const SESSION_COOKIE = "portrait_session_id";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Get or create the guest session ID from cookies */
async function getOrCreateSessionId(): Promise<{
  sessionId: string;
  isNew: boolean;
}> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return { sessionId: existing, isNew: false };
  return { sessionId: randomUUID(), isNew: true };
}

export async function POST(request: NextRequest) {
  try {
    // --- Auth: optional (guests don't have Clerk session) ---
    let userId: string | null = null;
    try {
      const { userId: clerkUserId } = await auth();
      userId = clerkUserId;
    } catch {
      // No Clerk session — guest flow
    }

    // --- Session ID (tracks guest portraits) ---
    const { sessionId, isNew } = await getOrCreateSessionId();

    // --- Parse multipart form data ---
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request. Expected multipart form data." },
        { status: 400 }
      );
    }

    const file = formData.get("photo") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No photo provided. Include a 'photo' field." },
        { status: 400 }
      );
    }

    // --- Read file ---
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = file.type || "image/jpeg";
    const fileSizeBytes = buffer.length;

    // --- Validate file ---
    const validation = validatePhotoFile(buffer, contentType, fileSizeBytes);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 422 }
      );
    }

    // --- Generate portrait ID ---
    const portraitId = generatePortraitId();
    const storageId = userId || sessionId;

    // --- Upload source photo to R2 ---
    const uploadResult = await uploadPortraitSource(
      buffer,
      contentType,
      storageId,
      portraitId
    );

    if (!uploadResult.success || !uploadResult.url || !uploadResult.key) {
      console.error("[Upload] R2 upload failed:", uploadResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to store your photo. Please try again.",
        },
        { status: 500 }
      );
    }

    // --- Create Portrait record ---
    // userId is nullable (guest portraits have no userId)
    const portrait = await prisma.portrait.create({
      data: {
        id: portraitId,
        userId: userId || null,
        sessionId,
        sourceImageUrl: uploadResult.url,
        sourceImageKey: uploadResult.key,
        stylePackSlug: "",       // Set during generate step
        styleVariantSlug: "",    // Set during generate step
        subjectType: "person",   // Default; overwritten by analysis
        subjectAnalysis: {},     // Populated by analysis step
        enhancedPrompt: "",      // Populated by generation step
        status: "pending",
        updatedAt: new Date(),
      },
    });

    // --- Build response ---
    const response = NextResponse.json({
      success: true,
      portraitId: portrait.id,
      sourceImageUrl: portrait.sourceImageUrl,
      sessionId,
    });

    // --- Set session cookie if new guest ---
    if (isNew && !userId) {
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
    console.error("[Upload] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
