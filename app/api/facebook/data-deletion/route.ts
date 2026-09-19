import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

interface SignedRequestPayload {
  algorithm?: string;
  user_id?: string;
  issued_at?: number;
}

function base64UrlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function parseSignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const [encodedSig, payload] = signedRequest.split(".", 2);
  if (!encodedSig || !payload) return null;

  const data = JSON.parse(base64UrlDecode(payload).toString("utf-8")) as SignedRequestPayload;
  if (data.algorithm?.toUpperCase() !== "HMAC-SHA256") return null;

  const sig = base64UrlDecode(encodedSig);
  const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(sig, expectedSig)) return null;

  return data;
}

function generateConfirmationCode(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString("hex");
  return `IC-DEL-${timestamp}-${random}`.toUpperCase();
}

// Meta GETs the callback URL before it will accept it, so it has to answer.
export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "ImageCrafter data deletion callback",
    description: "Receives Facebook data deletion requests via signed_request POST.",
    documentation: `${BASE_URL}/data-deletion`,
  });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.error("[fb-deletion] FACEBOOK_APP_SECRET is not configured");
    return NextResponse.json({ error: "Deletion callback is not configured" }, { status: 500 });
  }

  let signedRequest: string | null = null;
  try {
    const form = await req.formData();
    const value = form.get("signed_request");
    signedRequest = typeof value === "string" ? value : null;
  } catch {
    signedRequest = null;
  }

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  let payload: SignedRequestPayload | null = null;
  try {
    payload = parseSignedRequest(signedRequest, appSecret);
  } catch (error) {
    console.error("[fb-deletion] signed_request parse failed", error);
    payload = null;
  }

  const facebookUserId = payload?.user_id;
  if (!facebookUserId) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
  }

  const confirmationCode = generateConfirmationCode();

  const user = await prisma.user.findUnique({
    where: { facebookUserId },
    select: { id: true },
  });

  const request = await prisma.dataDeletionRequest.create({
    data: {
      userId: user?.id ?? null,
      facebookUserId,
      confirmationCode,
      status: "pending",
      platform: "facebook",
    },
  });

  await processDataDeletion(request.id, facebookUserId, user?.id ?? null);

  return NextResponse.json({
    url: `${BASE_URL}/data-deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}

/**
 * Unlinks the Facebook identity. The account and the customer's portraits are
 * deliberately left intact — they may have paid for them and can still sign in
 * with Google or email. A full account wipe is the separate /data-deletion request.
 */
async function processDataDeletion(requestId: string, facebookUserId: string, userId: string | null) {
  try {
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: "processing", processedAt: new Date() },
    });

    let unlinked = false;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { facebookUserId: null },
      });
      unlinked = true;
    }

    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "completed",
        completedAt: new Date(),
        deletionDetails: {
          facebookUserId,
          facebookLinkRemoved: unlinked,
          accountRetained: Boolean(userId),
          note: unlinked
            ? "Facebook sign-in link removed. Account and portraits retained; the customer can still sign in with Google or email."
            : "No ImageCrafter account was linked to this Facebook user.",
        },
      },
    });
  } catch (error) {
    console.error("[fb-deletion] processing failed", error);
    await prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
