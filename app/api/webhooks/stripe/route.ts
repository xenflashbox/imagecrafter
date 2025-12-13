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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan tiers
const PRICE_TO_PLAN: Record<string, PlanTier> = {
  [process.env.STRIPE_PRICE_STARTER!]: "STARTER",
  [process.env.STRIPE_PRICE_PRO!]: "PRO",
  [process.env.STRIPE_PRICE_TEAM!]: "TEAM",
};

// Plan configurations
const PLAN_CONFIG: Record<
  PlanTier,
  {
    monthlyImageLimit: number;
    canUsePro: boolean;
    canUseBatch: boolean;
    canUse4K: boolean;
    canUseProjects: boolean;
    maxProjectCount: number;
  }
> = {
  FREE: {
    monthlyImageLimit: 5,
    canUsePro: false,
    canUseBatch: false,
    canUse4K: false,
    canUseProjects: false,
    maxProjectCount: 0,
  },
  STARTER: {
    monthlyImageLimit: 100,
    canUsePro: false,
    canUseBatch: true,
    canUse4K: false,
    canUseProjects: false,
    maxProjectCount: 0,
  },
  PRO: {
    monthlyImageLimit: 500,
    canUsePro: true,
    canUseBatch: true,
    canUse4K: true,
    canUseProjects: true,
    maxProjectCount: 10,
  },
  TEAM: {
    monthlyImageLimit: 2000,
    canUsePro: true,
    canUseBatch: true,
    canUse4K: true,
    canUseProjects: true,
    maxProjectCount: 50,
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
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("No userId in checkout session metadata");
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
        imagesUsedThisPeriod: 0, // Reset counter for new period
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
