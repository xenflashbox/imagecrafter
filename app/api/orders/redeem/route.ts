/**
 * POST /api/orders/redeem
 *
 * Redeems 1 pack credit for a portrait's digital download.
 * Body: { portraitId: string }
 *
 * Credits redeem DIGITAL downloads only — prints are always cash
 * (founder decision 2026-08-14). Requires a signed-in Clerk account.
 *
 * The atomic balance-check/debit/order/portrait flip lives in
 * redeemCreditForPortrait() (lib/services/credits.ts). Fulfillment after
 * the transaction is identical to the cash digital flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { buildDownloadUrl } from "@/lib/services/download-token";
import { sendDigitalPurchaseEmail } from "@/lib/services/email-notification";
import {
  redeemCreditForPortrait,
  InsufficientCreditsError,
  AlreadyPurchasedError,
} from "@/lib/services/credits";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Sign in to redeem credits" },
      { status: 401 }
    );
  }

  let portraitId: string | undefined;
  try {
    ({ portraitId } = await request.json());
  } catch {
    // fall through to the check below
  }
  if (!portraitId || typeof portraitId !== "string") {
    return NextResponse.json(
      { success: false, error: "portraitId is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Account not found. Please sign in again." },
      { status: 403 }
    );
  }

  const portrait = await prisma.portrait.findUnique({
    where: { id: portraitId },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      status: true,
      previewImageUrl: true,
      stylePackSlug: true,
      styleVariantSlug: true,
      order: { select: { id: true, status: true } },
    },
  });
  if (!portrait) {
    return NextResponse.json(
      { success: false, error: "Portrait not found" },
      { status: 404 }
    );
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;
  const isOwner =
    portrait.userId === userId ||
    (sessionId != null && portrait.sessionId === sessionId);
  if (!isOwner) {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 }
    );
  }

  if (portrait.status === "purchased") {
    return NextResponse.json(
      {
        success: false,
        error: "Portrait already purchased",
        orderId: portrait.order?.id || null,
      },
      { status: 409 }
    );
  }

  if (!portrait.previewImageUrl) {
    return NextResponse.json(
      { success: false, error: "Portrait has no preview. Please generate it first." },
      { status: 422 }
    );
  }

  const customerName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  const MAX_DOWNLOADS = parseInt(process.env.PORTRAIT_MAX_DOWNLOADS || "5");
  const EXPIRY_HOURS = parseInt(process.env.PORTRAIT_DOWNLOAD_EXPIRY_HOURS || "72");

  let orderId: string;
  let balanceAfter: number;
  try {
    ({ orderId, balanceAfter } = await redeemCreditForPortrait({
      userId,
      portraitId,
      existingOrderId: portrait.order?.id || null,
      paidOrderData: {
        email: user.email,
        name: customerName,
        maxDownloads: MAX_DOWNLOADS,
        downloadExpiresAt: new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000),
      },
    }));
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { success: false, error: "No credits remaining", balance: err.balance },
        { status: 402 }
      );
    }
    if (err instanceof AlreadyPurchasedError) {
      return NextResponse.json(
        { success: false, error: "Portrait already purchased", orderId: err.orderId },
        { status: 409 }
      );
    }
    throw err;
  }

  console.log(
    `[redeem] User ${userId} redeemed 1 credit for portrait ${portraitId} (order ${orderId}, balance now ${balanceAfter})`
  );

  // Fulfillment — same as the cash digital flow. Email failure must not
  // hollow-succeed: surfaced in the response (the download also works from
  // the success page, so the redemption itself stands).
  const downloadUrl = buildDownloadUrl(orderId, BASE_URL);
  let emailSent = true;
  try {
    await sendDigitalPurchaseEmail({
      to: user.email,
      name: customerName || undefined,
      orderRef: orderId.slice(0, 8).toUpperCase(),
      downloadUrl,
      downloadExpiresHours: EXPIRY_HOURS,
      maxDownloads: MAX_DOWNLOADS,
      stylePackName: (portrait.stylePackSlug || "Portrait").replace(/-/g, " "),
      styleVariantName: (portrait.styleVariantSlug || "").replace(/-/g, " "),
      previewImageUrl: portrait.previewImageUrl || undefined,
      amount: 0,
      currency: "usd",
    });
  } catch (err) {
    emailSent = false;
    console.error(
      `[redeem] Redemption succeeded (order ${orderId}) but download email failed:`,
      err
    );
  }

  return NextResponse.json({
    success: true,
    orderId,
    balance: balanceAfter,
    emailSent,
    successUrl: `${BASE_URL}/portraits/${portraitId}/success?orderId=${orderId}`,
  });
}
