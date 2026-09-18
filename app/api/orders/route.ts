/**
 * GET /api/orders — every purchase belonging to the signed-in user.
 *
 * Matching is on userId OR any verified email on the Clerk account, because
 * the buying flow is guest-first: an order placed before the customer made an
 * account has userId = null and is only reachable by the address Stripe
 * collected. Unverified addresses are excluded — otherwise adding someone
 * else's email to your account would show you their purchases.
 *
 * Auth: required.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const user = await currentUser();
  const emails = (user?.emailAddresses ?? [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress);

  const where = {
    status: { in: ["paid", "fulfilled", "shipped", "delivered", "refunded"] },
    OR: [{ userId }, ...(emails.length ? [{ email: { in: emails } }] : [])],
  };

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
      downloadCount: true,
      maxDownloads: true,
      downloadExpiresAt: true,
      prodigiStatus: true,
      printSize: true,
      portrait: {
        select: {
          id: true,
          previewImageUrl: true,
          stylePackSlug: true,
          styleVariantSlug: true,
        },
      },
    },
  });

  // The download URL is deliberately not returned here. It is a signed token
  // that spends one of five downloads; the order detail route hands it out.
  return NextResponse.json({
    success: true,
    orders: orders.map((o) => ({
      ...o,
      downloadable:
        o.type === "digital" &&
        (o.status === "paid" || o.status === "fulfilled") &&
        o.downloadCount < o.maxDownloads &&
        (!o.downloadExpiresAt || o.downloadExpiresAt > new Date()),
    })),
  });
}
