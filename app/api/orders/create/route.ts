/**
 * GET /api/orders/create
 *
 * Creates an Order record and a Stripe Checkout Session,
 * then redirects the browser to Stripe's hosted checkout.
 *
 * DUAL-FLOW:
 * - Guest:        email required in query params; no Stripe Customer created
 * - Signed-in:    email from Clerk; stripeCustomerId reused when present
 *
 * Query params:
 *   portraitId  — required
 *   type        — "digital" | "print"
 *   sku         — required when type=print (e.g. "GICLÉE_8x10")
 *   email       — required for guests (Stripe will also collect it)
 *
 * Ownership verified via sessionId cookie (guest) or Clerk userId (signed-in).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { PRINT_CATALOG, resolveSku } from "@/lib/services/print-fulfillment";
import { trackTikTokEvent } from "@/lib/services/tiktok-events";
import { trackMetaEvent, fbcFromFbclid } from "@/lib/services/meta-events";
import { requireEnv } from "@/lib/env";
import { getPrice, DIGITAL_SKU, PriceUnavailableError } from "@/lib/services/pricing";

// Built per request, not at module scope: Next.js collects page data during the
// build, so a module-scope client makes every build require a live payment key.
const getStripe = () => new Stripe(requireEnv("STRIPE_SECRET_KEY"));
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

// Must match the tax codes set on the Stripe catalog products.
const DIGITAL_TAX_CODE = "txcd_10505001"; // Digital finished artwork, permanent rights
const PRINT_TAX_CODE = "txcd_99999999"; // General tangible goods

// All valid print SKUs (Phase 3 legacy + Phase 4 expanded catalog)
const ALL_SKUS = new Set(PRINT_CATALOG.map((p) => p.sku).concat([
  "GICLÉE_8x10", "GICLÉE_12x16", "GICLÉE_16x20", "GICLÉE_24x36", // legacy
]));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const portraitId = searchParams.get("portraitId");
  const type = searchParams.get("type") as "digital" | "print" | null;
  const sku = searchParams.get("sku");

  if (!portraitId || !type) {
    return NextResponse.json(
      { success: false, error: "portraitId and type are required" },
      { status: 400 }
    );
  }

  if (type !== "digital" && type !== "print") {
    return NextResponse.json(
      { success: false, error: "type must be 'digital' or 'print'" },
      { status: 400 }
    );
  }

  if (type === "print" && (!sku || !ALL_SKUS.has(sku))) {
    return NextResponse.json(
      { success: false, error: `Invalid print SKU. See /api/print/products for valid SKUs.` },
      { status: 400 }
    );
  }

  // --- Auth: optional ---
  let userId: string | null = null;
  let userEmail: string | null = null;
  let stripeCustomerId: string | null = null;

  try {
    const { userId: clerkUserId } = await auth();
    if (clerkUserId) {
      userId = clerkUserId;
      const user = await prisma.user.findUnique({
        where: { id: clerkUserId },
        select: { email: true, stripeCustomerId: true },
      });
      if (user) {
        userEmail = user.email;
        stripeCustomerId = user.stripeCustomerId;
      }
    }
  } catch {
    // Guest
  }

  // --- Session ID (guest ownership) ---
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;

  // --- Load portrait and verify ownership ---
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
      order: { select: { id: true } },
    },
  });

  if (!portrait) {
    return NextResponse.json({ success: false, error: "Portrait not found" }, { status: 404 });
  }

  const isOwner =
    (userId && portrait.userId === userId) ||
    (sessionId && portrait.sessionId === sessionId);

  if (!isOwner) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  // Already purchased — redirect to success page
  if (portrait.status === "purchased" && portrait.order?.id) {
    return NextResponse.redirect(`${BASE_URL}/portraits/${portraitId}/success?orderId=${portrait.order.id}`);
  }

  // Portrait must have a preview
  if (!portrait.previewImageUrl) {
    return NextResponse.json(
      { success: false, error: "Portrait has no preview. Please generate it first." },
      { status: 422 }
    );
  }

  // --- Determine pricing ---
  // Resolve SKU from catalog (supports both Phase 3 legacy and Phase 4 expanded)
  const catalogProduct = type === "print" ? resolveSku(sku!) : null;
  if (type === "print" && !catalogProduct) {
    // ALL_SKUS validated above, so this only fires if the catalog and
    // validation set ever diverge — fail closed rather than mis-price.
    console.error(`[orders/create] SKU passed validation but failed catalog resolution: ${sku}`);
    return NextResponse.json(
      { success: false, error: "Product configuration error. Please try again later." },
      { status: 500 }
    );
  }
  const priceSku = type === "digital" ? DIGITAL_SKU : catalogProduct!.sku;
  let amountCents: number;
  try {
    amountCents = (await getPrice(priceSku)).unitAmount;
  } catch (err) {
    if (err instanceof PriceUnavailableError) {
      console.error(`[orders/create] ${err.message}`);
      return NextResponse.json(
        { success: false, error: "This product isn't available right now." },
        { status: 503 }
      );
    }
    throw err;
  }

  const packLabel = portrait.stylePackSlug?.replace(/-/g, " ") || "Portrait";
  const variantLabel = portrait.styleVariantSlug?.replace(/-/g, " ") || "";

  // Frame/wrap from print-options page
  const frameParam = searchParams.get("frame") || catalogProduct?.defaultFrame || null;
  const wrapParam = searchParams.get("wrap") || catalogProduct?.defaultWrap || null;

  const productName =
    type === "digital"
      ? `Single Portrait`
      : (catalogProduct?.name || "Fine Art Print");
  const productDescription =
    type === "digital"
      ? `${packLabel} / ${variantLabel} — Full 4K resolution, no watermark`
      : `${packLabel} / ${variantLabel} — ${catalogProduct?.size || ""} museum-quality print`;

  // Stripe Managed Payments rejects any line item whose product has no tax code.
  // The inline product below is built per order, so it carries its own.
  const taxCode = type === "digital" ? DIGITAL_TAX_CODE : PRINT_TAX_CODE;

  // --- Create Order record (pending) ---
  const order = await prisma.order.create({
    data: {
      portraitId: portrait.id,
      userId: userId || null,
      email: userEmail || "pending@checkout",  // updated by webhook from Stripe
      type,
      printProductSku: type === "print" ? (catalogProduct?.sku || sku) : null,
      printSize: catalogProduct?.size || null,
      printFrame: frameParam,
      printFormat: catalogProduct?.format || null,
      amount: amountCents,
      currency: "usd",
      status: "pending",
      maxDownloads: parseInt(process.env.PORTRAIT_MAX_DOWNLOADS || "5"),
      updatedAt: new Date(),
    },
  });

  // --- Ad attribution context (from the visitor's browser request) ---
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

  // --- Build Stripe Checkout Session ---
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    // price_data rather than the bare Stripe price id: only an inline product
    // can carry this customer's own portrait as the checkout image. The amount
    // is still Stripe's — read above, never a literal.
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: productName,
            description: productDescription,
            images: [portrait.previewImageUrl],
            tax_code: taxCode,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: order.id,
      portraitId: portrait.id,
      orderType: type,
      // Ad attribution — carried to the Purchase server events (webhook
      // has no browser context)
      ...(ttclid ? { ttclid } : {}),
      ...(ttp ? { ttp } : {}),
      ...(fbc ? { fbc } : {}),
      ...(fbp ? { fbp } : {}),
    },
    success_url: `${BASE_URL}/portraits/${portrait.id}/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order.id}`,
    cancel_url: `${BASE_URL}/portraits/${portrait.id}/preview?cancelled=true`,
  };

  // Signed-in with an existing Stripe customer: reuse it
  if (stripeCustomerId) {
    sessionConfig.customer = stripeCustomerId;
  } else if (userEmail) {
    sessionConfig.customer_email = userEmail;
  }
  // else: Stripe will prompt for email at checkout

  // Print orders: collect shipping address
  if (type === "print") {
    sessionConfig.shipping_address_collection = {
      allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL"],
    };
    sessionConfig.phone_number_collection = { enabled: false };
  }

  const checkoutSession = await getStripe().checkout.sessions.create(sessionConfig);

  // Save Stripe session ID to order
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  await trackTikTokEvent({
    event: "InitiateCheckout",
    eventId: `checkout_${order.id}`,
    url: request.url,
    email: userEmail,
    externalId: userId,
    ip: visitorIp,
    userAgent: visitorUa,
    ttclid,
    ttp,
    value: amountCents / 100,
    currency: "USD",
    contentId: portrait.id,
    contentName: productName,
  });
  await trackMetaEvent({
    event: "InitiateCheckout",
    eventId: `checkout_${order.id}`,
    url: request.url,
    email: userEmail,
    externalId: userId,
    ip: visitorIp,
    userAgent: visitorUa,
    fbc,
    fbp,
    value: amountCents / 100,
    currency: "USD",
    contentId: portrait.id,
    contentName: productName,
  });

  // Redirect to Stripe Checkout
  return NextResponse.redirect(checkoutSession.url!);
}
