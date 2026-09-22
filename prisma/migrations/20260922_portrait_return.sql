BEGIN;
ALTER TABLE imagecrafter."ic_MauticCapture" ADD COLUMN IF NOT EXISTS "returnUrl" TEXT;
CREATE TABLE IF NOT EXISTS imagecrafter."ic_PortraitReturn" (
  "id" TEXT PRIMARY KEY,
  "portraitId" TEXT NOT NULL REFERENCES imagecrafter."ic_Portrait"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "marketingRequested" BOOLEAN NOT NULL DEFAULT FALSE,
  "verifiedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  UNIQUE ("portraitId", "email")
);
CREATE TABLE IF NOT EXISTS imagecrafter."ic_MarketingConsent" (
  "email" TEXT PRIMARY KEY, "granted" BOOLEAN NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL, "source" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS imagecrafter."ic_RecoveryRateLimit" (
  "key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
COMMIT;
