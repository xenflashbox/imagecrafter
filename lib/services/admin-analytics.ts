import { prisma } from "@/lib/prisma";
import { galleryEligibility } from "@/lib/services/public-gallery";

export type AnalyticsRange = "24h" | "7d" | "30d";

const RANGE_HOURS: Record<AnalyticsRange, number> = {
  "24h": 24,
  "7d": 7 * 24,
  "30d": 30 * 24,
};

const PAID_ORDER_STATUSES = new Set(["paid", "fulfilled", "shipped", "delivered"]);
const PAID_STRIPE_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);
const FAILED_STRIPE_EVENTS = new Set([
  "checkout.session.async_payment_failed",
  "payment_intent.payment_failed",
]);

type EventRow = Awaited<ReturnType<typeof loadEvents>>[number];

function visitorKey(event: Pick<EventRow, "sessionId" | "ipHash">) {
  return event.sessionId || event.ipHash || null;
}

function classifySource(event: EventRow) {
  const source = (event.utmSource || "").toLowerCase();
  const referrer = (event.referrer || "").toLowerCase();
  if (["tiktok", "tik_tok"].includes(source) || event.ttclid) return "TikTok";
  if (["facebook", "fb", "instagram", "ig", "meta", "th"].includes(source)) return "Meta / Instagram";
  if (event.fbclid || event.fbc) return "Meta / Instagram";
  if (referrer.includes("tiktok.")) return "TikTok";
  if (referrer.includes("instagram.") || referrer.includes("facebook.")) return "Meta / Instagram";
  if (referrer.includes("google.")) return "Google";
  if (!referrer || referrer.includes("imagecrafter.app")) return "Direct / return";
  try {
    return new URL(event.referrer!).hostname.replace(/^www\./, "");
  } catch {
    return "Other referral";
  }
}

function classifyDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown";
  return /mobile|android|iphone|ipad/i.test(userAgent) ? "Mobile" : "Desktop";
}

function countBy<T>(values: T[], key: (value: T) => string) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function distinct(values: Array<string | null | undefined>) {
  return new Set(values.filter((value): value is string => Boolean(value))).size;
}

function loadEvents(start: Date) {
  return prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: start } },
    orderBy: { createdAt: "asc" },
    select: {
      eventName: true,
      sessionId: true,
      portraitId: true,
      orderId: true,
      stripeSessionId: true,
      path: true,
      referrer: true,
      utmSource: true,
      placement: true,
      fbclid: true,
      ttclid: true,
      fbc: true,
      ipHash: true,
      userAgent: true,
      metadata: true,
      createdAt: true,
    },
  });
}

export async function getAdminAnalytics(range: AnalyticsRange) {
  const generatedAt = new Date();
  const start = new Date(generatedAt.getTime() - RANGE_HOURS[range] * 60 * 60 * 1000);

  const [events, portraits, users, orders, stripeEvents, galleryTotal, galleryAdded, votes] =
    await Promise.all([
      loadEvents(start),
      prisma.portrait.findMany({
        where: { createdAt: { gte: start } },
        select: {
          id: true,
          status: true,
          userId: true,
          generationTimeMs: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where: { createdAt: { gte: start } } }),
      prisma.order.findMany({
        where: { createdAt: { gte: start } },
        select: { id: true, status: true, amount: true, currency: true, createdAt: true },
      }),
      prisma.stripeEvent.findMany({
        where: { createdAt: { gte: start } },
        select: {
          stripeEventId: true,
          stripeSessionId: true,
          eventType: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      }),
      prisma.portrait.count({ where: galleryEligibility }),
      prisma.portrait.count({ where: { ...galleryEligibility, createdAt: { gte: start } } }),
      prisma.galleryVote.count({ where: { createdAt: { gte: start } } }),
    ]);

  const firstTouch = new Map<string, EventRow>();
  for (const event of events) {
    const key = visitorKey(event);
    if (key && !firstTouch.has(key)) firstTouch.set(key, event);
  }
  const visitors = [...firstTouch.values()];
  const sourceRows = countBy(visitors, classifySource);
  const deviceRows = countBy(visitors, (event) => classifyDevice(event.userAgent));
  const eventCounts = new Map(countBy(events, (event) => event.eventName).map((row) => [row.name, row.count]));

  const completedUploads = distinct(
    events.filter((event) => event.eventName === "upload_completed").map((event) => event.portraitId),
  );
  const successfulPortraits = portraits.filter((portrait) =>
    ["preview", "purchased"].includes(portrait.status),
  );
  const failedPortraits = portraits.filter((portrait) => portrait.status === "failed");
  const processingPortraits = portraits.filter((portrait) =>
    ["queued", "analyzing", "generating"].includes(portrait.status),
  );
  const pendingPortraits = portraits.filter((portrait) => portrait.status === "pending");
  const staleProcessing = processingPortraits.filter(
    (portrait) => generatedAt.getTime() - portrait.updatedAt.getTime() > 15 * 60 * 1000,
  );
  const generationTimes = successfulPortraits
    .map((portrait) => portrait.generationTimeMs)
    .filter((value): value is number => value !== null);

  const checkoutStarts = distinct(
    events.filter((event) => event.eventName === "checkout_started").map((event) => event.orderId),
  );
  const checkoutSessions = distinct(
    events
      .filter((event) => event.eventName === "stripe_checkout_session_created")
      .map((event) => event.stripeSessionId),
  );
  const paidEvents = stripeEvents.filter((event) => PAID_STRIPE_EVENTS.has(event.eventType));
  const expiredEvents = stripeEvents.filter((event) => event.eventType === "checkout.session.expired");
  const failedPaymentEvents = stripeEvents.filter((event) => FAILED_STRIPE_EVENTS.has(event.eventType));
  const likelyAbandoned = orders.filter(
    (order) =>
      order.status === "pending" &&
      generatedAt.getTime() - order.createdAt.getTime() > 30 * 60 * 1000,
  );
  const payments = distinct(paidEvents.map((event) => event.stripeSessionId || event.stripeEventId));
  const revenueCents = paidEvents.reduce((sum, event) => sum + (event.amount || 0), 0);

  const funnel = [
    { label: "Visitors", value: visitors.length },
    {
      label: "Landing CTA",
      value: distinct(
        events.filter((event) => event.eventName === "landing_cta_clicked").map(visitorKey),
      ),
    },
    { label: "Uploads", value: completedUploads },
    { label: "Previews created", value: successfulPortraits.length },
    { label: "Checkout started", value: checkoutStarts },
    { label: "Payments", value: payments },
  ];

  const recentActivity = [
    ...events
      .filter((event) =>
        [
          "upload_completed",
          "preview_created",
          "checkout_started",
          "stripe_checkout_session_created",
          "checkout_expired",
          "payment_failed",
          "meta_capi_rejected",
          "meta_capi_failed",
        ].includes(event.eventName),
      )
      .map((event) => ({
        at: event.createdAt,
        kind: event.eventName,
        detail: event.portraitId ? `Portrait ${event.portraitId.slice(-8)}` : null,
      })),
    ...paidEvents.map((event) => ({
      at: event.createdAt,
      kind: "payment_completed",
      detail: event.amount ? `${(event.amount / 100).toFixed(2)} ${(event.currency || "usd").toUpperCase()}` : null,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    range,
    start,
    generatedAt,
    overview: {
      visitors: visitors.length,
      pageViews: eventCounts.get("page_view") || 0,
      signups: users,
      completedUploads,
      previewsCreated: successfulPortraits.length,
      previewsSeen: distinct(
        events
          .filter((event) => event.eventName === "generation_succeeded")
          .map((event) => event.portraitId),
      ),
      checkoutStarts,
      checkoutSessions,
      payments,
      revenueCents,
    },
    sources: sourceRows,
    devices: deviceRows,
    funnel,
    generations: {
      uploaded: portraits.length,
      pending: pendingPortraits.length,
      processing: processingPortraits.length,
      stale: staleProcessing.length,
      successful: successfulPortraits.length,
      failed: failedPortraits.length,
      signedIn: portraits.filter((portrait) => portrait.userId).length,
      averageSeconds: generationTimes.length
        ? Math.round(generationTimes.reduce((sum, value) => sum + value, 0) / generationTimes.length / 1000)
        : null,
    },
    commerce: {
      carts: checkoutStarts,
      stripeSessions: checkoutSessions,
      expired: distinct(expiredEvents.map((event) => event.stripeSessionId || event.stripeEventId)),
      likelyAbandoned: likelyAbandoned.length,
      paymentFailures: distinct(
        failedPaymentEvents.map((event) => event.stripeSessionId || event.stripeEventId),
      ),
      payments,
      paidOrders: orders.filter((order) => PAID_ORDER_STATUSES.has(order.status)).length,
      revenueCents,
    },
    engagement: {
      shareClicks: eventCounts.get("share_button_clicked") || 0,
      sharePageViews: eventCounts.get("share_page_viewed") || 0,
      downloads: eventCounts.get("share_image_downloaded") || 0,
      galleryViews: events.filter(
        (event) => event.eventName === "page_view" && event.path?.startsWith("/gallery"),
      ).length,
      galleryShares: eventCounts.get("gallery_shared") || 0,
      galleryVotes: votes,
      galleryTotal,
      galleryAdded,
    },
    tracking: {
      metaAccepted: eventCounts.get("meta_capi_accepted") || 0,
      metaRejected: eventCounts.get("meta_capi_rejected") || 0,
      metaFailed: eventCounts.get("meta_capi_failed") || 0,
      metaSkipped: eventCounts.get("meta_capi_skipped") || 0,
      metaAttributedVisitors: sourceRows.find((row) => row.name === "Meta / Instagram")?.count || 0,
      tiktokAttributedVisitors: sourceRows.find((row) => row.name === "TikTok")?.count || 0,
    },
    recentActivity,
  };
}
