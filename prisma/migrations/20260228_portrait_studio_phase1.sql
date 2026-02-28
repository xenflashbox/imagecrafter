-- =============================================================================
-- ImageCrafter Phase 1 Migration: Portrait Studio + Blog Models
-- Date: 2026-02-28
-- Safe to apply on shared Neon DB — only creates new ic_ prefixed tables
-- =============================================================================

-- Portrait table
CREATE TABLE IF NOT EXISTS "ic_Portrait" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT,
  "sessionId"        TEXT NOT NULL,
  "sourceImageUrl"   TEXT NOT NULL,
  "sourceImageKey"   TEXT NOT NULL,
  "previewImageUrl"  TEXT,
  "hiResImageUrl"    TEXT,
  "stylePackSlug"    TEXT NOT NULL,
  "styleVariantSlug" TEXT NOT NULL,
  "subjectType"      TEXT NOT NULL,
  "subjectAnalysis"  JSONB NOT NULL,
  "enhancedPrompt"   TEXT NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "errorMessage"     TEXT,
  "generationTimeMs" INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_Portrait_pkey" PRIMARY KEY ("id")
);

-- Order table
CREATE TABLE IF NOT EXISTS "ic_Order" (
  "id"                      TEXT NOT NULL,
  "portraitId"              TEXT NOT NULL,
  "userId"                  TEXT,
  "email"                   TEXT NOT NULL,
  "name"                    TEXT,
  "type"                    TEXT NOT NULL,
  "downloadUrl"             TEXT,
  "downloadCount"           INTEGER NOT NULL DEFAULT 0,
  "maxDownloads"            INTEGER NOT NULL DEFAULT 5,
  "downloadExpiresAt"       TIMESTAMP(3),
  "printProductSku"         TEXT,
  "printSize"               TEXT,
  "printFrame"              TEXT,
  "printFormat"             TEXT,
  "prodigiOrderId"          TEXT,
  "prodigiStatus"           TEXT,
  "trackingNumber"          TEXT,
  "trackingUrl"             TEXT,
  "shippingName"            TEXT,
  "shippingLine1"           TEXT,
  "shippingLine2"           TEXT,
  "shippingCity"            TEXT,
  "shippingState"           TEXT,
  "shippingZip"             TEXT,
  "shippingCountry"         TEXT,
  "stripePaymentIntentId"   TEXT,
  "stripeSessionId"         TEXT,
  "amount"                  INTEGER NOT NULL,
  "currency"                TEXT NOT NULL DEFAULT 'usd',
  "status"                  TEXT NOT NULL DEFAULT 'pending',
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_Order_pkey" PRIMARY KEY ("id")
);

-- StylePack table
CREATE TABLE IF NOT EXISTS "ic_StylePack" (
  "id"           TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "tagline"      TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "category"     TEXT NOT NULL,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "thumbnailUrl" TEXT NOT NULL,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "isPremium"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_StylePack_pkey" PRIMARY KEY ("id")
);

-- StyleVariant table
CREATE TABLE IF NOT EXISTS "ic_StyleVariant" (
  "id"             TEXT NOT NULL,
  "stylePackId"    TEXT NOT NULL,
  "slug"           TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "promptTemplate" TEXT NOT NULL,
  "styleModifiers" JSONB NOT NULL,
  "sampleImageUrl" TEXT NOT NULL,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_StyleVariant_pkey" PRIMARY KEY ("id")
);

-- BlogCategory table
CREATE TABLE IF NOT EXISTS "ic_BlogCategory" (
  "id"          TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_BlogCategory_pkey" PRIMARY KEY ("id")
);

-- BlogPost table
CREATE TABLE IF NOT EXISTS "ic_BlogPost" (
  "id"              TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "excerpt"         TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "coverImageUrl"   TEXT,
  "categoryId"      TEXT,
  "tags"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "publishedAt"     TIMESTAMP(3),
  "metaTitle"       TEXT,
  "metaDescription" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ic_BlogPost_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- Unique constraints
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "ic_Order_portraitId_key"
  ON "ic_Order"("portraitId");

CREATE UNIQUE INDEX IF NOT EXISTS "ic_StylePack_slug_key"
  ON "ic_StylePack"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "ic_StyleVariant_stylePackId_slug_key"
  ON "ic_StyleVariant"("stylePackId", "slug");

CREATE UNIQUE INDEX IF NOT EXISTS "ic_BlogCategory_slug_key"
  ON "ic_BlogCategory"("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "ic_BlogPost_slug_key"
  ON "ic_BlogPost"("slug");

-- =============================================================================
-- Performance indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS "ic_Portrait_userId_idx"   ON "ic_Portrait"("userId");
CREATE INDEX IF NOT EXISTS "ic_Portrait_sessionId_idx" ON "ic_Portrait"("sessionId");
CREATE INDEX IF NOT EXISTS "ic_Portrait_status_idx"   ON "ic_Portrait"("status");
CREATE INDEX IF NOT EXISTS "ic_Portrait_createdAt_idx" ON "ic_Portrait"("createdAt");

CREATE INDEX IF NOT EXISTS "ic_Order_userId_idx"        ON "ic_Order"("userId");
CREATE INDEX IF NOT EXISTS "ic_Order_email_idx"         ON "ic_Order"("email");
CREATE INDEX IF NOT EXISTS "ic_Order_status_idx"        ON "ic_Order"("status");
CREATE INDEX IF NOT EXISTS "ic_Order_prodigiOrderId_idx" ON "ic_Order"("prodigiOrderId");

CREATE INDEX IF NOT EXISTS "ic_StylePack_category_idx" ON "ic_StylePack"("category");
CREATE INDEX IF NOT EXISTS "ic_StylePack_isActive_idx" ON "ic_StylePack"("isActive");

CREATE INDEX IF NOT EXISTS "ic_StyleVariant_stylePackId_idx" ON "ic_StyleVariant"("stylePackId");

CREATE INDEX IF NOT EXISTS "ic_BlogPost_slug_idx"       ON "ic_BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "ic_BlogPost_status_idx"     ON "ic_BlogPost"("status");
CREATE INDEX IF NOT EXISTS "ic_BlogPost_publishedAt_idx" ON "ic_BlogPost"("publishedAt");
CREATE INDEX IF NOT EXISTS "ic_BlogPost_categoryId_idx" ON "ic_BlogPost"("categoryId");

-- =============================================================================
-- Foreign key constraints
-- =============================================================================

ALTER TABLE "ic_Portrait"
  ADD CONSTRAINT "ic_Portrait_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "ic_User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ic_Order"
  ADD CONSTRAINT "ic_Order_portraitId_fkey"
  FOREIGN KEY ("portraitId") REFERENCES "ic_Portrait"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ic_Order"
  ADD CONSTRAINT "ic_Order_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "ic_User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ic_StyleVariant"
  ADD CONSTRAINT "ic_StyleVariant_stylePackId_fkey"
  FOREIGN KEY ("stylePackId") REFERENCES "ic_StylePack"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ic_BlogPost"
  ADD CONSTRAINT "ic_BlogPost_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ic_BlogCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
