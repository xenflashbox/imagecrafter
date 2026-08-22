-- 2026-08-14 — credits system + prod drift repair (strictly additive).
--
-- Discovery: prod DB (shared neondb) was missing ic_User, ic_Subscription,
-- ic_GenerationRequest entirely — every signed-in DB flow (Clerk webhook
-- user creation, signed-in checkout user lookup) failed at query time.
-- This migration creates all missing tables + the new ic_CreditLedger.
--
-- Deliberately EXCLUDED (would fail on existing orphan rows / are destructive):
--   * FKs to ic_User from populated tables (ic_Portrait, ic_Order, ic_Project,
--     ic_PromptHistory, ic_UsageRecord, ic_Review, ic_Image.userId)
--   * ic_PlanTier enum shrink, ic_BlogPost tags default drop

BEGIN;

-- neondb_owner's default search_path is "launchcraft, public" — pin it so
-- unqualified CREATEs land in public (first apply landed in launchcraft and
-- had to be moved with SET SCHEMA).
SET LOCAL search_path = public;

-- Enums needed by ic_GenerationRequest (verified absent via migrate diff)
CREATE TYPE "ic_GenerationMode" AS ENUM ('SINGLE', 'DUAL');
CREATE TYPE "ic_GenerationRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- ic_User -------------------------------------------------------------------
CREATE TABLE "ic_User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,

    CONSTRAINT "ic_User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ic_User_email_key" ON "ic_User"("email");
CREATE UNIQUE INDEX "ic_User_stripeCustomerId_key" ON "ic_User"("stripeCustomerId");
CREATE INDEX "ic_User_email_idx" ON "ic_User"("email");
CREATE INDEX "ic_User_stripeCustomerId_idx" ON "ic_User"("stripeCustomerId");

-- ic_Subscription ------------------------------------------------------------
CREATE TABLE "ic_Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "stripeStatus" "ic_SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "ic_PlanTier" NOT NULL DEFAULT 'FREE',
    "creditsLimit" INTEGER NOT NULL DEFAULT 10,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditsResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxResolution" TEXT NOT NULL DEFAULT '1K',
    "hasProjects" BOOLEAN NOT NULL DEFAULT false,
    "hasBatchMode" BOOLEAN NOT NULL DEFAULT false,
    "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasWatermark" BOOLEAN NOT NULL DEFAULT true,
    "hasPriorityQueue" BOOLEAN NOT NULL DEFAULT false,
    "monthlyImageLimit" INTEGER NOT NULL DEFAULT 5,
    "imagesUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
    "canUsePro" BOOLEAN NOT NULL DEFAULT false,
    "canUseBatch" BOOLEAN NOT NULL DEFAULT false,
    "canUse4K" BOOLEAN NOT NULL DEFAULT false,
    "canUseProjects" BOOLEAN NOT NULL DEFAULT false,
    "maxProjectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ic_Subscription_userId_key" ON "ic_Subscription"("userId");
CREATE UNIQUE INDEX "ic_Subscription_stripeSubscriptionId_key" ON "ic_Subscription"("stripeSubscriptionId");
CREATE INDEX "ic_Subscription_stripeStatus_idx" ON "ic_Subscription"("stripeStatus");

ALTER TABLE "ic_Subscription" ADD CONSTRAINT "ic_Subscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "ic_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ic_GenerationRequest -------------------------------------------------------
CREATE TABLE "ic_GenerationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "ic_GenerationMode" NOT NULL DEFAULT 'SINGLE',
    "status" "ic_GenerationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "prompt" TEXT NOT NULL,
    "enhancedPrompt" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '1:1',
    "resolution" TEXT NOT NULL DEFAULT '1K',
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "totalLatencyMs" INTEGER,
    "selectedImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ic_GenerationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ic_GenerationRequest_selectedImageId_key" ON "ic_GenerationRequest"("selectedImageId");
CREATE INDEX "ic_GenerationRequest_userId_idx" ON "ic_GenerationRequest"("userId");
CREATE INDEX "ic_GenerationRequest_status_idx" ON "ic_GenerationRequest"("status");
CREATE INDEX "ic_GenerationRequest_createdAt_idx" ON "ic_GenerationRequest"("createdAt");

ALTER TABLE "ic_GenerationRequest" ADD CONSTRAINT "ic_GenerationRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "ic_User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ic_GenerationRequest" ADD CONSTRAINT "ic_GenerationRequest_selectedImageId_fkey"
    FOREIGN KEY ("selectedImageId") REFERENCES "ic_Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ic_Image: additive columns for provider tracking ---------------------------
ALTER TABLE "ic_Image" ADD COLUMN "estimatedCostUsd" DOUBLE PRECISION,
    ADD COLUMN "generationRequestId" TEXT,
    ADD COLUMN "provider" TEXT,
    ADD COLUMN "providerLatencyMs" INTEGER;

CREATE INDEX "ic_Image_generationRequestId_idx" ON "ic_Image"("generationRequestId");

ALTER TABLE "ic_Image" ADD CONSTRAINT "ic_Image_generationRequestId_fkey"
    FOREIGN KEY ("generationRequestId") REFERENCES "ic_GenerationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ic_CreditLedger — purchased portrait credits (packs), append-only ----------
CREATE TABLE "ic_CreditLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "orderId" TEXT,
    "portraitId" TEXT,
    "packSku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ic_CreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ic_CreditLedger_stripeSessionId_key" ON "ic_CreditLedger"("stripeSessionId");
CREATE INDEX "ic_CreditLedger_userId_idx" ON "ic_CreditLedger"("userId");

ALTER TABLE "ic_CreditLedger" ADD CONSTRAINT "ic_CreditLedger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "ic_User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
