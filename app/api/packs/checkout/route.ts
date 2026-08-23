/**
 * GET /api/packs/checkout?sku=PACK_10
 *
 * Creates a Stripe Checkout Session for a portrait credit pack and
 * redirects the browser to Stripe's hosted checkout.
 *
 * Packs require a signed-in Clerk account (founder decision 2026-08-14):
 * credits attach to a userId, so guests are redirected to sign-in first.
 * Credits are granted by the Stripe webhook on checkout.session.completed
 * (metadata.packSku branch), idempotent on the session id.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/ensure-user";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { resolvePack, PACK_CATALOG } from "@/lib/services/credits";
import { trackTikTokEvent } from "@/lib/services/tiktok-events";
import { trackMetaEvent, fbcFromFbclid } from "@/lib/services/meta-events";
import { requireEnv } from "@/lib/env";

// Built per request, not at module scope: Next.js collects page data during the
// build, so a module-scope client makes every build require a live payment key.
const getStripe = () => new Stripe(requireEnv("STRIPE_SECRET_KEY"));
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");

  const pack = sku ? resolvePack(sku) : null;
  if (!pack) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid pack SKU. Valid: ${PACK_CATALOG.map((p) => p.sku).join(", ")}`,
      },
      { status: 400 }
    );
  }

  // --- Auth: required for packs (credits attach to an account) ---
  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", BASE_URL);
    signInUrl.searchParams.set(
      "redirect_url",
      `${BASE_URL}/api/packs/checkout?sku=${pack.sku}`
    );
    return NextResponse.redirect(signInUrl);
  }

  await ensureUser(userId);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true },
  });

  // --- Ad attribution context ---
  const cookieStore = await cookies();
  const ttclid =
    searchParams.get("ttclid") || cookieStore.get("ttclid")?.value || null;
  const ttp = cookieStore.get("_ttp")?.value || null;
  const fbclid = searchParams.get("fbclid");
  const fbc =
    cookieStore.get("_fbc")?.value || (fbclid ? fbcFromFbclid(fbclid) : null);
  const fbp = cookieStore.get("_fbp")?.value || null;
  const visitorIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const visitorUa = request.headers.get("user-agent");

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: pack.name,
            description: `${pack.credits} portrait credits — redeem any portrait as a full-resolution digital download. Never expire.`,
          },
          unit_amount: pack.priceUsd,
        },
        quantity: 1,
      },
    ],
    metadata: {
      packSku: pack.sku,
      packUserId: userId,
      credits: String(pack.credits),
      ...(ttclid ? { ttclid } : {}),
      ...(ttp ? { ttp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(fbp ? { fbp } : {}),
    },
    success_url: `${BASE_URL}/portraits?pack_purchased=${pack.sku}`,
    cancel_url: `${BASE_URL}/portraits?pack_cancelled=true`,
  };

  if (user.stripeCustomerId) {
    sessionConfig.customer = user.stripeCustomerId;
  } else if (user.email) {
    sessionConfig.customer_email = user.email;
  }

  const checkoutSession = await getStripe().checkout.sessions.create(sessionConfig);

  await trackTikTokEvent({
    event: "InitiateCheckout",
    eventId: `pack_checkout_${checkoutSession.id}`,
    url: request.url,
    email: user.email,
    externalId: userId,
    ip: visitorIp,
    userAgent: visitorUa,
    ttclid,
    ttp,
    value: pack.priceUsd / 100,
    currency: "USD",
    contentId: pack.sku,
    contentName: pack.name,
  });
  await trackMetaEvent({
    event: "InitiateCheckout",
    eventId: `pack_checkout_${checkoutSession.id}`,
    url: request.url,
    email: user.email,
    externalId: userId,
    ip: visitorIp,
    userAgent: visitorUa,
    fbc,
    fbp,
    value: pack.priceUsd / 100,
    currency: "USD",
    contentId: pack.sku,
    contentName: pack.name,
  });

  return NextResponse.redirect(checkoutSession.url!);
}
