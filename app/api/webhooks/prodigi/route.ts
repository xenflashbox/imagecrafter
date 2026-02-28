/**
 * POST /api/webhooks/prodigi
 *
 * Handles Prodigi CloudEvents webhooks for print order status updates.
 *
 * Verification: PRODIGI_WEBHOOK_SECRET must match the `secret` query param.
 * The secret is embedded in the callbackUrl when creating Prodigi orders.
 *
 * Events handled:
 *   com.prodigi.order.status.stage.changed#InProgress   → update prodigiStatus
 *   com.prodigi.order.status.stage.changed#Complete     → update status + tracking, send shipping email
 *   com.prodigi.order.status.stage.changed#Cancelled    → update prodigiStatus
 *   com.prodigi.order.status.stage.changed#Error        → update prodigiStatus, log issues
 *
 * Idempotent: repeated delivery of the same event is safe (upsert-style update).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyProdigiWebhook,
  extractTracking,
  type ProdigiWebhookPayload,
} from "@/lib/services/print-fulfillment";
import { sendShippingUpdateEmail } from "@/lib/services/email-notification";

// Prodigi sends POST to this endpoint — must be in publicRoutes (middleware)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // --- Verify webhook secret ---
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!verifyProdigiWebhook(secret)) {
    console.error("[prodigi-webhook] Invalid secret — rejecting request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse payload ---
  let payload: ProdigiWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;
  const prodigiOrder = data?.order;

  if (!prodigiOrder?.id || !prodigiOrder?.merchantReference) {
    console.warn("[prodigi-webhook] Missing order data in payload:", type);
    return NextResponse.json({ received: true }); // Ack to prevent retries
  }

  const prodigiOrderId = prodigiOrder.id;
  const ourOrderId = prodigiOrder.merchantReference;
  const stage = prodigiOrder.status?.stage;

  console.log(`[prodigi-webhook] Event: ${type} | Prodigi: ${prodigiOrderId} | Our: ${ourOrderId} | Stage: ${stage}`);

  // --- Load our Order ---
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: ourOrderId },
        { prodigiOrderId },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      prodigiOrderId: true,
      prodigiStatus: true,
    },
  });

  if (!order) {
    // May be a sandbox test order or already deleted — ack and move on
    console.warn(`[prodigi-webhook] Order not found for prodigiOrderId: ${prodigiOrderId}, merchantRef: ${ourOrderId}`);
    return NextResponse.json({ received: true });
  }

  // --- Handle by stage ---
  switch (stage) {
    case "InProgress": {
      // Production is underway — update status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          prodigiOrderId,
          prodigiStatus: "InProgress",
        },
      });
      break;
    }

    case "Complete": {
      // Order shipped — extract tracking and send email
      const { trackingNumber, trackingUrl, carrier } = extractTracking(
        prodigiOrder.shipments || []
      );

      await prisma.order.update({
        where: { id: order.id },
        data: {
          prodigiOrderId,
          prodigiStatus: "Complete",
          status: "shipped",
          trackingNumber: trackingNumber || null,
          trackingUrl: trackingUrl || null,
        },
      });

      // Send shipping notification if we have tracking
      if (trackingNumber && order.email) {
        try {
          await sendShippingUpdateEmail({
            to: order.email,
            name: order.name || undefined,
            orderRef: order.id.slice(0, 8).toUpperCase(),
            trackingNumber,
            trackingUrl: trackingUrl || `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}`,
            carrier: carrier || "Carrier",
          });
          console.log(`[prodigi-webhook] Shipping email sent to ${order.email} for order ${order.id}`);
        } catch (emailError) {
          console.error(`[prodigi-webhook] Failed to send shipping email for order ${order.id}:`, emailError);
        }
      } else {
        console.log(`[prodigi-webhook] Order ${order.id} shipped — no tracking info available`);
      }
      break;
    }

    case "Cancelled": {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          prodigiOrderId,
          prodigiStatus: "Cancelled",
        },
      });
      console.warn(`[prodigi-webhook] Prodigi order ${prodigiOrderId} cancelled for our order ${order.id}`);
      break;
    }

    case "Error": {
      const issues = prodigiOrder.status?.issues || [];
      await prisma.order.update({
        where: { id: order.id },
        data: {
          prodigiOrderId,
          prodigiStatus: "Error",
        },
      });
      console.error(
        `[prodigi-webhook] Prodigi order ${prodigiOrderId} ERROR for our order ${order.id}:`,
        JSON.stringify(issues)
      );
      break;
    }

    default:
      console.log(`[prodigi-webhook] Unhandled stage: ${stage} for order ${order.id}`);
  }

  return NextResponse.json({ received: true });
}
