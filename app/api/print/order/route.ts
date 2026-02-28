/**
 * POST /api/print/order
 *
 * Internal route: manually triggers Prodigi order creation for an existing
 * paid print Order. Used for:
 *  - Admin re-submission after a failed Prodigi call
 *  - Manual retry from the dashboard
 *
 * Normally Prodigi is called automatically from the Stripe webhook.
 * This endpoint exists for operational resilience.
 *
 * Auth: requires Clerk session (subscribers/admins only).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  createProdigiOrder,
} from "@/lib/services/print-fulfillment";

export async function POST(request: NextRequest) {
  // Auth required — only authenticated users can manually trigger
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ success: false, error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      type: true,
      status: true,
      userId: true,
      printProductSku: true,
      printFrame: true,
      printFormat: true,
      prodigiOrderId: true,
      shippingName: true,
      shippingLine1: true,
      shippingLine2: true,
      shippingCity: true,
      shippingState: true,
      shippingZip: true,
      shippingCountry: true,
      portrait: {
        select: { hiResImageUrl: true, id: true },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  }

  // Users can only retry their own orders
  if (order.userId && order.userId !== userId) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  if (order.type !== "print") {
    return NextResponse.json({ success: false, error: "Not a print order" }, { status: 422 });
  }

  if (order.status !== "paid" && order.status !== "fulfilled") {
    return NextResponse.json(
      { success: false, error: "Order must be paid before Prodigi submission" },
      { status: 422 }
    );
  }

  if (order.prodigiOrderId) {
    return NextResponse.json(
      { success: false, error: `Prodigi order already exists: ${order.prodigiOrderId}` },
      { status: 409 }
    );
  }

  if (!order.portrait?.hiResImageUrl) {
    return NextResponse.json({ success: false, error: "Portrait hi-res image not found" }, { status: 422 });
  }

  if (!order.shippingLine1 || !order.shippingCity || !order.shippingZip || !order.shippingCountry) {
    return NextResponse.json({ success: false, error: "Shipping address incomplete" }, { status: 422 });
  }

  const { prodigiOrderId, stage } = await createProdigiOrder({
    orderId: order.id,
    portraitId: order.portrait.id,
    hiResImageUrl: order.portrait.hiResImageUrl,
    sku: order.printProductSku || "ART-8x10",
    frame: order.printFrame || undefined,
    wrap: undefined,
    recipient: {
      name: order.shippingName || "Customer",
      line1: order.shippingLine1,
      line2: order.shippingLine2 || undefined,
      city: order.shippingCity,
      state: order.shippingState || undefined,
      zip: order.shippingZip,
      country: order.shippingCountry,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      prodigiOrderId,
      prodigiStatus: stage,
      status: "fulfilled",
    },
  });

  return NextResponse.json({ success: true, prodigiOrderId, stage });
}
