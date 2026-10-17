CREATE TABLE IF NOT EXISTS imagecrafter."ic_AnalyticsEvent" (
  "id" TEXT PRIMARY KEY,
  "eventName" TEXT NOT NULL,
  "sessionId" TEXT,
  "userId" TEXT,
  "portraitId" TEXT,
  "orderId" TEXT,
  "stripeSessionId" TEXT,
  "path" TEXT,
  "referrer" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmTerm" TEXT,
  "utmContent" TEXT,
  "gclid" TEXT,
  "fbclid" TEXT,
  "ttclid" TEXT,
  "fbc" TEXT,
  "fbp" TEXT,
  "ttp" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ic_AnalyticsEvent_eventName_createdAt_idx"
  ON imagecrafter."ic_AnalyticsEvent" ("eventName", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_AnalyticsEvent_sessionId_createdAt_idx"
  ON imagecrafter."ic_AnalyticsEvent" ("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_AnalyticsEvent_portraitId_createdAt_idx"
  ON imagecrafter."ic_AnalyticsEvent" ("portraitId", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_AnalyticsEvent_orderId_createdAt_idx"
  ON imagecrafter."ic_AnalyticsEvent" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_AnalyticsEvent_utmSource_utmCampaign_createdAt_idx"
  ON imagecrafter."ic_AnalyticsEvent" ("utmSource", "utmCampaign", "createdAt");

CREATE TABLE IF NOT EXISTS imagecrafter."ic_StripeEvent" (
  "id" TEXT PRIMARY KEY,
  "stripeEventId" TEXT NOT NULL UNIQUE,
  "eventType" TEXT NOT NULL,
  "orderId" TEXT,
  "portraitId" TEXT,
  "stripeSessionId" TEXT,
  "paymentIntentId" TEXT,
  "status" TEXT,
  "amount" INTEGER,
  "currency" TEXT,
  "summary" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ic_StripeEvent_eventType_createdAt_idx"
  ON imagecrafter."ic_StripeEvent" ("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_StripeEvent_orderId_createdAt_idx"
  ON imagecrafter."ic_StripeEvent" ("orderId", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_StripeEvent_stripeSessionId_idx"
  ON imagecrafter."ic_StripeEvent" ("stripeSessionId");
CREATE INDEX IF NOT EXISTS "ic_StripeEvent_paymentIntentId_idx"
  ON imagecrafter."ic_StripeEvent" ("paymentIntentId");
