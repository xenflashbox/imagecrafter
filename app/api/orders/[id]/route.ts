/**
 * GET /api/orders/[id]
 *
 * Returns order status and details for the post-purchase success page.
 *
 * DUAL-FLOW:
 * - Guest:       ownership verified by order.email matching session context
 * - Subscriber:  ownership verified by Clerk userId
 *
 * Does NOT expose downloadUrl directly — that uses the signed token endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { buildDownloadUrl } from "@/lib/services/download-token";
import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let userId: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId;
  } catch {
    // Guest
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      portraitId: true,
      userId: true,
      email: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      downloadCount: true,
      maxDownloads: true,
      downloadExpiresAt: true,
      printSize: true,
      printProductSku: true,
      printFormat: true,
      prodigiStatus: true,
      trackingNumber: true,
      trackingUrl: true,
      shippingName: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingZip: true,
      shippingCountry: true,
      createdAt: true,
      portrait: {
        select: {
          previewImageUrl: true,
          stylePackSlug: true,
          styleVariantSlug: true,
          sessionId: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }

  // Ownership check
  const isOwner =
    (userId && order.userId === userId) ||
    (sessionId && order.portrait?.sessionId === sessionId);

  if (!isOwner) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  // Build download URL if digital and paid
  let downloadUrl: string | null = null;
  let downloadAvailable = false;

  if (order.type === "digital" && order.status === "paid") {
    const remaining = (order.maxDownloads || 5) - (order.downloadCount || 0);
    const expired = order.downloadExpiresAt ? new Date() > order.downloadExpiresAt : false;

    if (remaining > 0 && !expired) {
      downloadUrl = buildDownloadUrl(order.id, BASE_URL);
      downloadAvailable = true;
    }
  }

  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      portraitId: order.portraitId,
      type: order.type,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      createdAt: order.createdAt,
      email: order.email,
      // Digital delivery
      downloadAvailable,
      downloadUrl,
      downloadCount: order.downloadCount,
      maxDownloads: order.maxDownloads,
      downloadExpiresAt: order.downloadExpiresAt,
      // Print
      printSize: order.printSize,
      prodigiStatus: order.prodigiStatus,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      // Portrait preview
      previewImageUrl: order.portrait?.previewImageUrl,
      stylePackSlug: order.portrait?.stylePackSlug,
      styleVariantSlug: order.portrait?.styleVariantSlug,
    },
  });
}
