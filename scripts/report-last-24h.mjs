import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const requiredColumns = {
  ic_AnalyticsEvent: ["eventName", "sessionId", "utmSource", "referrer", "ttclid", "fbclid", "createdAt"],
  ic_GalleryVote: ["portraitId", "value", "createdAt"],
  ic_Order: ["status", "amount", "stripeSessionId", "createdAt"],
  ic_Portrait: ["status", "previewImageUrl", "sessionId", "userId", "createdAt"],
  ic_StripeEvent: ["eventType", "stripeSessionId", "status", "amount", "createdAt"],
  ic_User: ["id", "createdAt"],
};

async function query(sql) {
  return prisma.$queryRawUnsafe(sql);
}

function jsonValue(_key, value) {
  return typeof value === "bigint" ? Number(value) : value;
}

async function main() {
  const schema = await query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'imagecrafter'
      AND table_name IN (${Object.keys(requiredColumns).map((name) => `'${name}'`).join(", ")})
  `);
  const live = new Map();
  for (const row of schema) {
    if (!live.has(row.table_name)) live.set(row.table_name, new Set());
    live.get(row.table_name).add(row.column_name);
  }
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      if (!live.get(table)?.has(column)) throw new Error(`Live schema missing ${table}.${column}`);
    }
  }

  const [
    window,
    traffic,
    trafficDetails,
    devices,
    events,
    portraits,
    portraitHealth,
    gallery,
    galleryEngagement,
    orders,
    stripe,
    abandonment,
    stripeOutcomes,
    signups,
  ] = await Promise.all([
    query(`SELECT now() AS "endUtc", now() - interval '24 hours' AS "startUtc"`),
    query(`
      WITH recent AS (
        SELECT *
        FROM imagecrafter."ic_AnalyticsEvent"
        WHERE "createdAt" >= now() - interval '24 hours'
      ), first_touch AS (
        SELECT DISTINCT ON (coalesce("sessionId", "ipHash"))
          coalesce("sessionId", "ipHash") AS visitor_key,
          "utmSource", "utmMedium", "referrer", "ttclid", "fbclid", "fbc", "ttp"
        FROM recent
        WHERE coalesce("sessionId", "ipHash") IS NOT NULL
        ORDER BY coalesce("sessionId", "ipHash"), "createdAt"
      ), classified AS (
        SELECT
          visitor_key,
          CASE
            WHEN lower(coalesce("utmSource", '')) IN ('tiktok', 'tik_tok') THEN 'TikTok UTM'
            WHEN lower(coalesce("utmSource", '')) IN ('facebook', 'fb', 'instagram', 'ig', 'meta') THEN 'Meta/Instagram UTM'
            WHEN "ttclid" IS NOT NULL THEN 'TikTok click ID'
            WHEN "fbclid" IS NOT NULL OR "fbc" IS NOT NULL THEN 'Meta click ID'
            WHEN lower(coalesce("referrer", '')) LIKE '%tiktok.%' THEN 'TikTok referral'
            WHEN lower(coalesce("referrer", '')) LIKE '%instagram.%' THEN 'Instagram referral'
            WHEN lower(coalesce("referrer", '')) LIKE '%facebook.%' THEN 'Facebook referral'
            WHEN lower(coalesce("referrer", '')) LIKE '%google.%' THEN 'Google'
            WHEN "referrer" IS NULL OR "referrer" = '' OR lower("referrer") LIKE '%imagecrafter.app%' THEN 'Direct / internal return'
            ELSE coalesce(substring("referrer" from 'https?://([^/]+)'), 'Other referral')
          END AS source
        FROM first_touch
      )
      SELECT source, count(*) AS visitors
      FROM classified
      GROUP BY source
      ORDER BY visitors DESC, source
    `),
    query(`
      SELECT
        coalesce(nullif("utmSource", ''), '(none)') AS source,
        coalesce(nullif("utmMedium", ''), '(none)') AS medium,
        coalesce(nullif("placement", ''), '(none)') AS placement,
        count(DISTINCT "sessionId") AS sessions,
        count(DISTINCT coalesce("sessionId", "ipHash")) AS visitors,
        count(*) FILTER (WHERE "eventName" = 'page_view') AS page_views
      FROM imagecrafter."ic_AnalyticsEvent"
      WHERE "createdAt" >= now() - interval '24 hours'
      GROUP BY source, medium, placement
      ORDER BY sessions DESC, page_views DESC
    `),
    query(`
      WITH visitors AS (
        SELECT DISTINCT ON (coalesce("sessionId", "ipHash"))
          coalesce("sessionId", "ipHash") AS visitor_key, "userAgent"
        FROM imagecrafter."ic_AnalyticsEvent"
        WHERE "createdAt" >= now() - interval '24 hours'
          AND coalesce("sessionId", "ipHash") IS NOT NULL
        ORDER BY coalesce("sessionId", "ipHash"), "createdAt"
      )
      SELECT CASE
        WHEN lower(coalesce("userAgent", '')) ~ 'mobile|android|iphone|ipad' THEN 'mobile'
        WHEN "userAgent" IS NULL OR "userAgent" = '' THEN 'unknown'
        ELSE 'desktop'
      END AS device, count(*) AS visitors
      FROM visitors
      GROUP BY device
      ORDER BY visitors DESC
    `),
    query(`
      SELECT "eventName", count(*) AS events, count(DISTINCT "sessionId") AS sessions
      FROM imagecrafter."ic_AnalyticsEvent"
      WHERE "createdAt" >= now() - interval '24 hours'
      GROUP BY "eventName"
      ORDER BY events DESC, "eventName"
    `),
    query(`
      SELECT
        count(*) AS created,
        count(*) FILTER (WHERE "previewImageUrl" IS NOT NULL OR status IN ('preview', 'purchased')) AS successful,
        count(*) FILTER (WHERE status = 'failed') AS failed,
        count(*) FILTER (WHERE status = 'pending') AS uploaded_not_started,
        count(*) FILTER (WHERE status IN ('queued', 'analyzing', 'generating')) AS processing,
        count(*) FILTER (WHERE "userId" IS NULL) AS guest,
        count(*) FILTER (WHERE "userId" IS NOT NULL) AS signed_in,
        count(DISTINCT "sessionId") AS sessions,
        round(avg("generationTimeMs") FILTER (WHERE "generationTimeMs" IS NOT NULL) / 1000.0, 1) AS avg_seconds
      FROM imagecrafter."ic_Portrait"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
    `),
    query(`
      SELECT
        count(*) FILTER (WHERE status = 'pending') AS uploaded_not_started,
        count(*) FILTER (WHERE status IN ('queued', 'analyzing', 'generating')) AS processing,
        count(*) FILTER (
          WHERE status IN ('queued', 'analyzing', 'generating')
            AND "updatedAt" < (now() AT TIME ZONE 'UTC') - interval '15 minutes'
        ) AS stale_processing_15m,
        count(*) FILTER (WHERE status = 'failed') AS failed,
        count(*) FILTER (WHERE status = 'preview') AS preview,
        count(*) FILTER (WHERE status = 'purchased') AS purchased
      FROM imagecrafter."ic_Portrait"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
    `),
    query(`
      SELECT
        count(*) AS total_eligible,
        count(*) FILTER (
          WHERE p."createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
        ) AS added_24h
      FROM imagecrafter."ic_Portrait" p
      WHERE p."subjectType" = 'pet'
        AND p.status = 'preview'
        AND p."sourceImageUrl" <> ''
        AND p."previewImageUrl" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM imagecrafter."ic_Order" o WHERE o."portraitId" = p.id
        )
    `),
    query(`
      SELECT "eventName", count(*) AS events,
             count(DISTINCT coalesce("sessionId", "ipHash")) AS visitors
      FROM imagecrafter."ic_AnalyticsEvent"
      WHERE "createdAt" >= now() - interval '24 hours'
        AND (
          "eventName" IN ('gallery_shared', 'gallery_load_more', 'gallery_vote_cast')
          OR ("eventName" = 'page_view' AND "path" LIKE '/gallery%')
        )
      GROUP BY "eventName"
      ORDER BY events DESC, "eventName"
    `),
    query(`
      SELECT status, count(*) AS orders, coalesce(sum(amount), 0) AS amount_cents
      FROM imagecrafter."ic_Order"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
      GROUP BY status
      ORDER BY orders DESC, status
    `),
    query(`
      SELECT "eventType", coalesce(status, '') AS status, count(*) AS events,
             coalesce(sum(amount), 0) AS amount_cents
      FROM imagecrafter."ic_StripeEvent"
      WHERE "createdAt" >= now() - interval '24 hours'
      GROUP BY "eventType", status
      ORDER BY events DESC, "eventType"
    `),
    query(`
      WITH checkouts AS (
        SELECT DISTINCT ON ("stripeSessionId")
          "stripeSessionId", "sessionId", "orderId", "createdAt"
        FROM imagecrafter."ic_AnalyticsEvent"
        WHERE "eventName" = 'stripe_checkout_session_created'
          AND "stripeSessionId" IS NOT NULL
          AND "createdAt" >= now() - interval '24 hours'
        ORDER BY "stripeSessionId", "createdAt" DESC
      ), resolved AS (
        SELECT c.*,
          o.status AS order_status,
          EXISTS (
            SELECT 1 FROM imagecrafter."ic_StripeEvent" se
            WHERE se."stripeSessionId" = c."stripeSessionId"
              AND se."eventType" IN ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
          ) AS stripe_paid,
          EXISTS (
            SELECT 1 FROM imagecrafter."ic_StripeEvent" se
            WHERE se."stripeSessionId" = c."stripeSessionId"
              AND se."eventType" = 'checkout.session.expired'
          ) AS stripe_expired
        FROM checkouts c
        LEFT JOIN imagecrafter."ic_Order" o ON o."stripeSessionId" = c."stripeSessionId"
      )
      SELECT
        count(*) AS checkout_sessions,
        count(*) FILTER (WHERE order_status IN ('paid', 'fulfilled', 'shipped', 'delivered') OR stripe_paid) AS paid,
        count(*) FILTER (WHERE stripe_expired) AS confirmed_expired,
        count(*) FILTER (
          WHERE "createdAt" < now() - interval '30 minutes'
            AND NOT stripe_paid
            AND coalesce(order_status, '') NOT IN ('paid', 'fulfilled', 'shipped', 'delivered')
        ) AS likely_abandoned_30m,
        count(*) FILTER (WHERE coalesce(order_status, '') IN ('failed', 'canceled')) AS failed_or_canceled
      FROM resolved
    `),
    query(`
      SELECT
        count(DISTINCT "stripeSessionId") FILTER (
          WHERE "eventType" = 'checkout.session.completed'
             OR "eventType" = 'checkout.session.async_payment_succeeded'
        ) AS paid_in_window,
        count(DISTINCT "stripeSessionId") FILTER (
          WHERE "eventType" = 'checkout.session.expired'
        ) AS expired_in_window,
        count(DISTINCT "stripeSessionId") FILTER (
          WHERE "eventType" IN ('checkout.session.async_payment_failed', 'payment_intent.payment_failed')
        ) AS payment_failed_in_window
      FROM imagecrafter."ic_StripeEvent"
      WHERE "createdAt" >= now() - interval '24 hours'
    `),
    query(`
      SELECT count(*) AS users
      FROM imagecrafter."ic_User"
      WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '24 hours'
    `),
  ]);

  console.log(JSON.stringify({
    window: window[0],
    traffic,
    trafficDetails,
    devices,
    events,
    portraits: portraits[0],
    portraitHealth: portraitHealth[0],
    gallery: gallery[0],
    galleryEngagement,
    orders,
    stripe,
    abandonment: abandonment[0],
    stripeOutcomes: stripeOutcomes[0],
    signups: signups[0],
  }, jsonValue, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
