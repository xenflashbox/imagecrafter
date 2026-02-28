/**
 * GET /api/orders/download?token=<signed-token>
 *
 * Secure portrait download endpoint.
 *
 * Security enforcements:
 * 1. Token must be HMAC-signed with correct secret
 * 2. Token must not be expired (72 hours)
 * 3. Download count must be < maxDownloads (default 5)
 * 4. Order must be in "paid" or "fulfilled" status
 * 5. Increments downloadCount atomically (prevents race conditions via transaction)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateDownloadToken } from "@/lib/services/download-token";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing download token", { status: 400 });
  }

  const validation = validateDownloadToken(token);

  if (!validation.valid) {
    if (validation.error === "expired") {
      return new NextResponse(
        "This download link has expired. Links are valid for 72 hours after purchase.",
        { status: 410 }
      );
    }
    return new NextResponse("Invalid or tampered download token.", { status: 403 });
  }

  const { orderId } = validation;

  // Load and lock the order atomically to prevent race conditions
  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        downloadCount: true,
        maxDownloads: true,
        downloadExpiresAt: true,
        portrait: {
          select: {
            hiResImageUrl: true,
          },
        },
      },
    });

    if (!o) return null;

    // Validate status
    if (o.status !== "paid" && o.status !== "fulfilled") return { error: "not_paid" as const };

    // Validate expiry
    if (o.downloadExpiresAt && new Date() > o.downloadExpiresAt) {
      return { error: "expired" as const };
    }

    // Validate download count
    if (o.downloadCount >= o.maxDownloads) {
      return { error: "limit_reached" as const };
    }

    // Hi-res file must exist
    if (!o.portrait?.hiResImageUrl) {
      return { error: "no_file" as const };
    }

    // Increment download count
    await tx.order.update({
      where: { id: o.id },
      data: { downloadCount: { increment: 1 } },
    });

    return { hiResImageUrl: o.portrait.hiResImageUrl };
  });

  if (!order) {
    return new NextResponse("Order not found.", { status: 404 });
  }

  if ("error" in order) {
    switch (order.error) {
      case "not_paid":
        return new NextResponse("Order not yet paid.", { status: 402 });
      case "expired":
        return new NextResponse(
          "This download link has expired. Links are valid for 72 hours after purchase.",
          { status: 410 }
        );
      case "limit_reached":
        return new NextResponse(
          "Download limit reached. You have downloaded this portrait the maximum number of times.",
          { status: 429 }
        );
      case "no_file":
        return new NextResponse(
          "Portrait file not available. Please contact support.",
          { status: 500 }
        );
    }
  }

  // Redirect to R2 public URL for the hi-res file
  // R2 handles the actual file delivery — we just enforce access here
  const hiResUrl = (order as { hiResImageUrl: string }).hiResImageUrl;

  return NextResponse.redirect(hiResUrl, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
