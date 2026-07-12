-- ============================================================================
-- 20260705 backend-provider (Phase 2.1–2.3):
--   1. Drift repair: create ic_User / ic_Subscription (+ enums) if absent
--   2. GenerationRequest model (one request -> N Image children -> pick winner)
--   3. Image provider metadata columns (provider, latency, estimated cost)
--   4. Tier collapse FREE/STARTER/PRO/TEAM -> FREE/PRO with explicit mapping
--
-- Apply with:
--   npx prisma db execute \
--     --file prisma/migrations/20260705_generation_request_dual_engine_tier_collapse.sql \
--     --schema prisma/schema.prisma
--
-- Every statement is idempotent (IF NOT EXISTS / guarded DO blocks); the file
-- can be re-run safely. It was validated against a clean Postgres 16 instance
-- and against a simulated pre-collapse instance (4-value ic_PlanTier with
-- STARTER/TEAM subscriber rows).
--
-- ---------------------------------------------------------------------------
-- DRIFT FINDING (2026-07-05, verified empirically):
-- The database used by BOTH local .env and Vercel production
-- (neondb @ ep-delicate-violet-ad43jbhz, shared with other products) does NOT
-- contain ic_User or ic_Subscription, although prisma/schema.prisma declares
-- them and every authenticated request path queries them. Section 1 repairs
-- that drift. In a database that already has those tables, Section 1 is a
-- no-op.
--
-- ---------------------------------------------------------------------------
-- TIER MAPPING (Amendment A3 in PLAN/01-plan.md; founder resolved Free/Pro):
--
--   STARTER -> PRO   Grandfathered. The row keeps its Stripe subscription and
--                    price; only the plan tier label moves to PRO.
--                    FLAG FOR FOUNDER PRICING REVIEW: STARTER payers ($9)
--                    receive PRO entitlements on their next renewal webhook.
--
--   TEAM    -> PRO   Grandfathered. creditsLimit is intentionally NOT reduced
--                    by this migration (no silent downgrade of a paying
--                    subscriber); the next Stripe renewal webhook applies PRO
--                    limits (400 credits).
--                    FLAG FOR FOUNDER: decide whether existing TEAM
--                    subscribers keep their 1,200-credit limit.
--
-- In the drifted production database described above ic_Subscription does not
-- exist, so there are currently ZERO rows to map; the mapping is included for
-- any environment where rows do exist and for the historical record.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — Drift repair: core enums + ic_User + ic_Subscription
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ic_SubscriptionStatus') THEN
    CREATE TYPE "ic_SubscriptionStatus" AS ENUM
      ('TRIALING','ACTIVE','CANCELED','INCOMPLETE','INCOMPLETE_EXPIRED','PAST_DUE','UNPAID','PAUSED');
  END IF;
END $$;

-- If ic_PlanTier does not exist at all, create it directly in its final
-- two-value form. (If it exists with legacy values, Section 4 collapses it.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ic_PlanTier') THEN
    CREATE TYPE "ic_PlanTier" AS ENUM ('FREE','PRO');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ic_User" (
  "id"               TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "firstName"        TEXT,
  "lastName"         TEXT,
  "imageUrl"         TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "stripeCustomerId" TEXT,
  CONSTRAINT "ic_User_pkey" PRIMARY KEY ("id")
);

-- If ic_User pre-existed with a partial column set, repair the columns the
-- indexes below depend on (no-ops when the table was just created above).
ALTER TABLE "ic_User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "ic_User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ic_User_email_key" ON "ic_User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "ic_User_stripeCustomerId_key" ON "ic_User"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "ic_User_email_idx" ON "ic_User"("email");
CREATE INDEX IF NOT EXISTS "ic_User_stripeCustomerId_idx" ON "ic_User"("stripeCustomerId");

CREATE TABLE IF NOT EXISTS "ic_Subscription" (
  "id"                     TEXT NOT NULL,
  "userId"                 TEXT NOT NULL,
  "stripeSubscriptionId"   TEXT,
  "stripePriceId"          TEXT,
  "stripeCurrentPeriodEnd" TIMESTAMP(3),
  "stripeStatus"           "ic_SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "plan"                   "ic_PlanTier" NOT NULL DEFAULT 'FREE',
  "creditsLimit"           INTEGER NOT NULL DEFAULT 10,
  "creditsUsed"            INTEGER NOT NULL DEFAULT 0,
  "creditsResetAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "maxResolution"          TEXT NOT NULL DEFAULT '1K',
  "hasProjects"            BOOLEAN NOT NULL DEFAULT false,
  "hasBatchMode"           BOOLEAN NOT NULL DEFAULT false,
  "hasApiAccess"           BOOLEAN NOT NULL DEFAULT false,
  "hasWatermark"           BOOLEAN NOT NULL DEFAULT true,
  "hasPriorityQueue"       BOOLEAN NOT NULL DEFAULT false,
  "monthlyImageLimit"      INTEGER NOT NULL DEFAULT 5,
  "imagesUsedThisPeriod"   INTEGER NOT NULL DEFAULT 0,
  "canUsePro"              BOOLEAN NOT NULL DEFAULT false,
  "canUseBatch"            BOOLEAN NOT NULL DEFAULT false,
  "canUse4K"               BOOLEAN NOT NULL DEFAULT false,
  "canUseProjects"         BOOLEAN NOT NULL DEFAULT false,
  "maxProjectCount"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ic_Subscription_pkey" PRIMARY KEY ("id")
);

-- Same partial-shape repair for ic_Subscription (no-ops on fresh create).
ALTER TABLE "ic_Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "ic_Subscription" ADD COLUMN IF NOT EXISTS "stripeStatus" "ic_SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "ic_Subscription_userId_key" ON "ic_Subscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ic_Subscription_stripeSubscriptionId_key" ON "ic_Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "ic_Subscription_stripeStatus_idx" ON "ic_Subscription"("stripeStatus");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ic_Subscription_userId_fkey') THEN
    ALTER TABLE "ic_Subscription"
      ADD CONSTRAINT "ic_Subscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "ic_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- SECTION 2 — GenerationRequest enums + table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ic_GenerationMode') THEN
    CREATE TYPE "ic_GenerationMode" AS ENUM ('SINGLE','DUAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ic_GenerationRequestStatus') THEN
    CREATE TYPE "ic_GenerationRequestStatus" AS ENUM ('PENDING','COMPLETED','PARTIAL','FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ic_GenerationRequest" (
  "id"              TEXT NOT NULL,
  "userId"          TEXT NOT NULL,
  "mode"            "ic_GenerationMode" NOT NULL DEFAULT 'SINGLE',
  "status"          "ic_GenerationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "prompt"          TEXT NOT NULL,
  "enhancedPrompt"  TEXT,
  "aspectRatio"     TEXT NOT NULL DEFAULT '1:1',
  "resolution"      TEXT NOT NULL DEFAULT '1K',
  "creditsCharged"  INTEGER NOT NULL DEFAULT 0,
  "errorMessage"    TEXT,
  "totalLatencyMs"  INTEGER,
  "selectedImageId" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ic_GenerationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ic_GenerationRequest_selectedImageId_key" ON "ic_GenerationRequest"("selectedImageId");
CREATE INDEX IF NOT EXISTS "ic_GenerationRequest_userId_idx" ON "ic_GenerationRequest"("userId");
CREATE INDEX IF NOT EXISTS "ic_GenerationRequest_status_idx" ON "ic_GenerationRequest"("status");
CREATE INDEX IF NOT EXISTS "ic_GenerationRequest_createdAt_idx" ON "ic_GenerationRequest"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ic_GenerationRequest_userId_fkey') THEN
    ALTER TABLE "ic_GenerationRequest"
      ADD CONSTRAINT "ic_GenerationRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "ic_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ic_GenerationRequest_selectedImageId_fkey') THEN
    ALTER TABLE "ic_GenerationRequest"
      ADD CONSTRAINT "ic_GenerationRequest_selectedImageId_fkey"
      FOREIGN KEY ("selectedImageId") REFERENCES "ic_Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- SECTION 3 — Image provider metadata + request link
-- ============================================================================

ALTER TABLE "ic_Image" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "ic_Image" ADD COLUMN IF NOT EXISTS "providerLatencyMs" INTEGER;
ALTER TABLE "ic_Image" ADD COLUMN IF NOT EXISTS "estimatedCostUsd" DOUBLE PRECISION;
ALTER TABLE "ic_Image" ADD COLUMN IF NOT EXISTS "generationRequestId" TEXT;

CREATE INDEX IF NOT EXISTS "ic_Image_generationRequestId_idx" ON "ic_Image"("generationRequestId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ic_Image_generationRequestId_fkey') THEN
    ALTER TABLE "ic_Image"
      ADD CONSTRAINT "ic_Image_generationRequestId_fkey"
      FOREIGN KEY ("generationRequestId") REFERENCES "ic_GenerationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


-- ============================================================================
-- SECTION 4 — Tier collapse: FREE/STARTER/PRO/TEAM -> FREE/PRO
--
-- Explicit data migration (never silent). See the mapping notes in the file
-- header. Runs only if the legacy enum values exist.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ic_PlanTier' AND e.enumlabel IN ('STARTER','TEAM')
  ) THEN
    -- Map subscriber rows BEFORE narrowing the type:
    --   STARTER -> PRO (grandfathered; founder pricing review flagged)
    --   TEAM    -> PRO (grandfathered; creditsLimit deliberately untouched)
    UPDATE "ic_Subscription"
      SET "plan" = 'PRO'::"ic_PlanTier"
      WHERE "plan"::text IN ('STARTER','TEAM');

    ALTER TYPE "ic_PlanTier" RENAME TO "ic_PlanTier_old";
    CREATE TYPE "ic_PlanTier" AS ENUM ('FREE','PRO');

    ALTER TABLE "ic_Subscription" ALTER COLUMN "plan" DROP DEFAULT;
    ALTER TABLE "ic_Subscription"
      ALTER COLUMN "plan" TYPE "ic_PlanTier"
      USING ("plan"::text::"ic_PlanTier");
    ALTER TABLE "ic_Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';

    DROP TYPE "ic_PlanTier_old";
  END IF;
END $$;
