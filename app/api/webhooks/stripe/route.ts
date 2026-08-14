/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for subscription management
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { buildDownloadUrl } from "@/lib/services/download-token";
import {
  sendDigitalPurchaseEmail,
  sendPrintPurchaseEmail,
} from "@/lib/services/email-notification";
import { createProdigiOrder } from "@/lib/services/print-fulfillment";
import { grantPackCredits, resolvePack } from "@/lib/services/credits";
import { trackTikTokEvent } from "@/lib/services/tiktok-events";
import { trackMetaEvent } from "@/lib/services/meta-events";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan tiers.
// 2026-07-05 tier collapse (Amendment A3): only FREE/PRO exist. Legacy
// STARTER/TEAM Stripe prices map to PRO so grandfathered subscribers renewing
// on old price IDs keep resolving to a real tier (DB rows were migrated by
// prisma/migrations/20260705_generation_request_dual_engine_tier_collapse.sql).
const PRICE_TO_PLAN: Record<string, PlanTier> = {
  [process.env.STRIPE_PRICE_PRO!]: "PRO",
  ...(process.env.STRIPE_PRICE_STARTER
    ? { [process.env.STRIPE_PRICE_STARTER]: "PRO" as PlanTier }
    : {}),
  ...(process.env.STRIPE_PRICE_TEAM
    ? { [process.env.STRIPE_PRICE_TEAM]: "PRO" as PlanTier }
    : {}),
};

// Plan configurations — sets both credit system and legacy fields
const PLAN_CONFIG: Record<
  PlanTier,
  {
    // Credit system (current)
    creditsLimit: number;
    maxResolution: string;
    hasProjects: boolean;
    hasBatchMode: boolean;
    hasApiAccess: boolean;
    hasWatermark: boolean;
    hasPriorityQueue: boolean;
    // Legacy fields (kept for backwards compat)
    monthlyImageLimit: number;
    canUsePro: boolean;
    canUseBatch: boolean;
    canUse4K: boolean;
    canUseProjects: boolean;
    maxProjectCount: number;
  }
> = {
  FREE: {
    creditsLimit: 10,
    maxResolution: "1K",
    hasProjects: false,
    hasBatchMode: false,
    hasApiAccess: false,
    hasWatermark: true,
    hasPriorityQueue: false,
    monthlyImageLimit: 10,
    canUsePro: false,
    canUseBatch: false,
    canUse4K: false,
    canUseProjects: false,
    maxProjectCount: 0,
  },
  PRO: {
    creditsLimit: 400,
    maxResolution: "4K",
    hasProjects: true,
    // Batch is founder confirmation #1 — off until that decision lands.
    hasBatchMode: false,
    hasApiAccess: false,
    hasWatermark: false,
    hasPriorityQueue: true,
    monthlyImageLimit: 400,
    canUsePro: true,
    canUseBatch: false,
    canUse4K: true,
    canUseProjects: true,
    maxProjectCount: 10,
  },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      case "checkout.session.expired": {
        // Mark portrait order as failed if the session expires
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        const failedOrderId = expiredSession.metadata?.orderId;
        if (failedOrderId) {
          await prisma.order
            .update({ where: { id: failedOrderId }, data: { status: "failed" } })
            .catch((err) => console.error("Failed to mark order expired:", err));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;

  // -------------------------------------------------------------------------
  // PORTRAIT PURCHASE FLOW
  // Detected by presence of orderId in metadata (set by /api/orders/create)
  // -------------------------------------------------------------------------
  if (orderId) {
    await handlePortraitCheckoutCompleted(session, orderId);
    return;
  }

  // -------------------------------------------------------------------------
  // CREDIT PACK FLOW
  // Detected by packSku in metadata (set by /api/packs/checkout).
  // Must run before the subscription fallthrough, which errors on
  // missing metadata.userId.
  // -------------------------------------------------------------------------
  const packSku = session.metadata?.packSku;
  if (packSku) {
    await handlePackCheckoutCompleted(session, packSku);
    return;
  }

  // -------------------------------------------------------------------------
  // SUBSCRIPTION FLOW (existing behavior)
  // -------------------------------------------------------------------------
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No userId in checkout session metadata — not a portrait order or subscription");
    return;
  }

  // Update user with Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });

  // Fetch the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdated(subscription);
}

async function handlePackCheckoutCompleted(
  session: Stripe.Checkout.Session,
  packSku: string
) {
  const userId = session.metadata?.packUserId;
  if (!userId) {
    // Should be impossible — /api/packs/checkout requires Clerk auth.
    // Fail loud: without a userId there is no account to credit.
    throw new Error(
      `[stripe-webhook] Pack checkout ${session.id} (${packSku}) has no packUserId — cannot grant credits`
    );
  }

  const pack = resolvePack(packSku);
  const credits = pack?.credits ?? parseInt(session.metadata?.credits || "0");
  if (!credits || credits <= 0) {
    throw new Error(
      `[stripe-webhook] Pack checkout ${session.id}: unknown SKU ${packSku} and no credits in metadata — cannot grant`
    );
  }

  const result = await grantPackCredits({
    userId,
    packSku,
    credits,
    stripeSessionId: session.id,
  });

  if (result.alreadyGranted) {
    return; // webhook replay — already logged by grantPackCredits
  }

  console.log(
    `[stripe-webhook] Granted ${credits} credits (${packSku}) to user ${userId} for session ${session.id}`
  );

  const amountCents = session.amount_total ?? pack?.priceUsd ?? 0;
  const email = session.customer_details?.email || null;
  await trackTikTokEvent({
    event: "Purchase",
    eventId: `purchase_pack_${session.id}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app"}/api/packs/checkout`,
    email,
    externalId: userId,
    ttclid: session.metadata?.ttclid || null,
    ttp: session.metadata?.ttp || null,
    value: amountCents / 100,
    currency: "USD",
    contentId: packSku,
    contentName: pack?.name || packSku,
  });
  await trackMetaEvent({
    event: "Purchase",
    eventId: `purchase_pack_${session.id}`,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app"}/api/packs/checkout`,
    email,
    externalId: userId,
    fbc: session.metadata?.fbc || null,
    fbp: session.metadata?.fbp || null,
    value: amountCents / 100,
    currency: "USD",
    contentId: packSku,
    contentName: pack?.name || packSku,
  });
}

async function handlePortraitCheckoutCompleted(
  session: Stripe.Checkout.Session,
  orderId: string
) {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";
  const MAX_DOWNLOADS = parseInt(process.env.PORTRAIT_MAX_DOWNLOADS || "5");
  const EXPIRY_HOURS = parseInt(process.env.PORTRAIT_DOWNLOAD_EXPIRY_HOURS || "72");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      type: true,
      email: true,
      name: true,
      portraitId: true,
      shippingName: true,
      printSize: true,
      printProductSku: true,
      printFrame: true,
      amount: true,
      currency: true,
      portrait: {
        select: {
          previewImageUrl: true,
          hiResImageUrl: true,
          stylePackSlug: true,
          styleVariantSlug: true,
        },
      },
    },
  });

  if (!order) {
    console.error(`[stripe-webhook] Order not found: ${orderId}`);
    return;
  }

  // Resolve customer email — Stripe captures it at checkout even for guests
  const customerEmail =
    session.customer_details?.email || order.email;
  const customerName =
    session.customer_details?.name || order.name || undefined;

  const stylePackLabel = (order.portrait?.stylePackSlug || "Portrait").replace(/-/g, " ");
  const styleVariantLabel = (order.portrait?.styleVariantSlug || "").replace(/-/g, " ");

  // Ad-platform Purchase — attribution (ttclid/ttp/fbc/fbp) carried via
  // session metadata from /api/orders/create since the webhook has no
  // browser context.
  await trackTikTokEvent({
    event: "Purchase",
    eventId: `purchase_${order.id}`,
    email: customerEmail,
    ttclid: session.metadata?.ttclid || null,
    ttp: session.metadata?.ttp || null,
    value: order.amount / 100,
    currency: (order.currency || "usd").toUpperCase(),
    contentId: order.portraitId,
    contentName: `${stylePackLabel} ${styleVariantLabel}`.trim(),
    url: `${BASE_URL}/portraits/${order.portraitId}/success`,
  });
  await trackMetaEvent({
    event: "Purchase",
    eventId: `purchase_${order.id}`,
    email: customerEmail,
    fbc: session.metadata?.fbc || null,
    fbp: session.metadata?.fbp || null,
    value: order.amount / 100,
    currency: (order.currency || "usd").toUpperCase(),
    contentId: order.portraitId,
    contentName: `${stylePackLabel} ${styleVariantLabel}`.trim(),
    url: `${BASE_URL}/portraits/${order.portraitId}/success`,
  });

  if (order.type === "digital") {
    // --- DIGITAL ORDER ---
    const downloadExpiresAt = new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000);

    // Mark order as paid, set download expiry, update email
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        email: customerEmail,
        name: customerName || null,
        maxDownloads: MAX_DOWNLOADS,
        downloadExpiresAt,
        stripePaymentIntentId: session.payment_intent as string || null,
      },
    });

    // Mark portrait as purchased
    await prisma.portrait.update({
      where: { id: order.portraitId },
      data: { status: "purchased" },
    });

    // Generate download token and send email
    const downloadUrl = buildDownloadUrl(orderId, BASE_URL);
    await sendDigitalPurchaseEmail({
      to: customerEmail,
      name: customerName,
      orderRef: orderId.slice(0, 8).toUpperCase(),
      downloadUrl,
      downloadExpiresHours: EXPIRY_HOURS,
      maxDownloads: MAX_DOWNLOADS,
      stylePackName: stylePackLabel,
      styleVariantName: styleVariantLabel,
      previewImageUrl: order.portrait?.previewImageUrl || undefined,
      amount: order.amount,
      currency: order.currency,
    });

    console.log(`[stripe-webhook] Digital order ${orderId} paid — download email sent to ${customerEmail}`);
  } else {
    // --- PRINT ORDER ---
    const shippingAddress = session.shipping_details?.address;

    const updateData: Parameters<typeof prisma.order.update>[0]["data"] = {
      status: "paid",
      email: customerEmail,
      name: customerName || null,
      stripePaymentIntentId: session.payment_intent as string || null,
    };

    // Persist shipping address from Stripe
    if (shippingAddress) {
      Object.assign(updateData, {
        shippingName: session.shipping_details?.name || null,
        shippingLine1: shippingAddress.line1 || null,
        shippingLine2: shippingAddress.line2 || null,
        shippingCity: shippingAddress.city || null,
        shippingState: shippingAddress.state || null,
        shippingZip: shippingAddress.postal_code || null,
        shippingCountry: shippingAddress.country || null,
      });
    }

    await prisma.order.update({ where: { id: orderId }, data: updateData });

    // Mark portrait as purchased
    await prisma.portrait.update({
      where: { id: order.portraitId },
      data: { status: "purchased" },
    });

    // Send print confirmation email (Prodigi fulfillment happens in Phase 4)
    const shippingDisplayAddress = shippingAddress
      ? [
          shippingAddress.line1,
          shippingAddress.line2,
          `${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postal_code}`,
          shippingAddress.country,
        ]
          .filter(Boolean)
          .join("\n")
      : "Shipping address pending";

    await sendPrintPurchaseEmail({
      to: customerEmail,
      name: customerName,
      orderRef: orderId.slice(0, 8).toUpperCase(),
      stylePackName: stylePackLabel,
      styleVariantName: styleVariantLabel,
      printSize: order.printSize || "Custom",
      amount: order.amount,
      currency: order.currency,
      shippingName: session.shipping_details?.name || customerName || "",
      shippingAddress: shippingDisplayAddress,
      previewImageUrl: order.portrait?.previewImageUrl || undefined,
    });

    console.log(`[stripe-webhook] Print order ${orderId} paid — confirmation email sent to ${customerEmail}`);

    // --- PRODIGI FULFILLMENT (Phase 4) ---
    // Submit to Prodigi immediately after payment confirmed.
    // Failures are logged but do NOT block the webhook response —
    // the order can be re-submitted manually via /api/print/order.
    const hiResUrl = order.portrait?.hiResImageUrl;
    if (
      hiResUrl &&
      shippingAddress &&
      shippingAddress.line1 &&
      shippingAddress.city &&
      shippingAddress.postal_code &&
      shippingAddress.country
    ) {
      try {
        const { prodigiOrderId, stage } = await createProdigiOrder({
          orderId,
          portraitId: order.portraitId,
          hiResImageUrl: hiResUrl,
          sku: order.printProductSku || "ART-8x10",
          frame: order.printFrame || undefined,
          recipient: {
            name: session.shipping_details?.name || customerName || "Customer",
            email: customerEmail,
            line1: shippingAddress.line1,
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city,
            state: shippingAddress.state || undefined,
            zip: shippingAddress.postal_code,
            country: shippingAddress.country,
          },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: {
            prodigiOrderId,
            prodigiStatus: stage,
            status: "fulfilled",
          },
        });

        console.log(
          `[stripe-webhook] Prodigi order ${prodigiOrderId} created for print order ${orderId}`
        );
      } catch (prodigiError) {
        // Don't fail the webhook (payment already settled), but PERSIST the
        // failure — a log line alone left paid-but-unfulfilled orders
        // invisible (fail-open audit, fix directive P1#3). Re-submit
        // manually via /api/print/order.
        console.error(
          `[stripe-webhook] Prodigi submission failed for order ${orderId}:`,
          prodigiError
        );
        await prisma.order.update({
          where: { id: orderId },
          data: { prodigiStatus: "submission_failed" },
        });
      }
    } else {
      console.warn(
        `[stripe-webhook] Skipping Prodigi submission for order ${orderId}: missing hi-res URL or shipping address`
      );
      await prisma.order.update({
        where: { id: orderId },
        data: { prodigiStatus: "submission_blocked_missing_data" },
      });
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`No user found for customer: ${customerId}`);
    return;
  }

  // Determine plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const plan = PRICE_TO_PLAN[priceId] || "FREE";
  const config = PLAN_CONFIG[plan];

  // Map Stripe status to our enum
  const statusMap: Record<string, SubscriptionStatus> = {
    trialing: "TRIALING",
    active: "ACTIVE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    past_due: "PAST_DUE",
    unpaid: "UNPAID",
    paused: "PAUSED",
  };

  const stripeStatus = statusMap[subscription.status] || "INCOMPLETE";

  // Upsert subscription
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripeStatus,
      plan,
      ...config,
    },
    create: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      stripeStatus,
      plan,
      ...config,
      imagesUsedThisPeriod: 0,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // Downgrade to free plan
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      stripeStatus: "CANCELED",
      plan: "FREE",
      ...PLAN_CONFIG.FREE,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Reset usage for new billing period
  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsUsed: 0,
        imagesUsedThisPeriod: 0,
        creditsResetAt: new Date(),
      },
    });
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (!user) return;

  // Mark subscription as past due
  await prisma.subscription.update({
    where: { userId: user.id },
    data: {
      stripeStatus: "PAST_DUE",
    },
  });
}
