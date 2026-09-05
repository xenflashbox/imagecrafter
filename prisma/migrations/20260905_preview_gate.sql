-- 2026-09-05 — preview gate: server-side usage ledger + previewer Mautic stage.
--
-- EXPAND step. Nothing is renamed and nothing is dropped, so the currently
-- deployed code — which reads and writes "stripeSessionId" — keeps working from
-- the moment this runs until the new code is live. The matching CONTRACT step
-- (20260905_preview_gate_contract.sql) drops the old column afterwards.
--
-- Three changes:
--
-- 1. ic_PreviewUsage — one row per preview generation attempt. The free-preview
--    count and the daily spend cap are both derived from here, so clearing
--    cookies does not reset the faucet (rows are keyed on IP as well as session).
--
-- 2. ic_MauticCapture generalised from buyers-only to any staged contact. A
--    previewer has no Stripe session and no purchase type, so the idempotency
--    key becomes a generic dedupeKey and purchaseType becomes nullable.
--
-- 3. stripeSessionId is kept, backfilled into dedupeKey, and made nullable so a
--    previewer row can insert while the old column still exists.
--
-- Every object is schema-qualified: this role's search_path is
-- "launchcraft, public", so an unqualified statement lands in launchcraft while
-- Prisma reads from public.

BEGIN;

CREATE TABLE IF NOT EXISTS public."ic_PreviewUsage" (
  "id"         TEXT PRIMARY KEY,
  "sessionId"  TEXT NOT NULL,
  "ip"         TEXT NOT NULL,
  "email"      TEXT,
  "portraitId" TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'allowed',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ic_PreviewUsage_sessionId_createdAt_idx"
  ON public."ic_PreviewUsage" ("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_PreviewUsage_ip_createdAt_idx"
  ON public."ic_PreviewUsage" ("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "ic_PreviewUsage_email_createdAt_idx"
  ON public."ic_PreviewUsage" ("email", "createdAt");

ALTER TABLE public."ic_MauticCapture"
  ADD COLUMN IF NOT EXISTS "dedupeKey"  TEXT,
  ADD COLUMN IF NOT EXISTS "stage"      TEXT NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS "previewUrl" TEXT;

-- Every existing row is a buyer, so its key is the Stripe session under the
-- same "stripe:<session>" shape captureBuyer now writes.
UPDATE public."ic_MauticCapture"
   SET "dedupeKey" = 'stripe:' || "stripeSessionId"
 WHERE "dedupeKey" IS NULL;

ALTER TABLE public."ic_MauticCapture"
  ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ic_MauticCapture_dedupeKey_key"
  ON public."ic_MauticCapture" ("dedupeKey");

-- A previewer has neither a Stripe session nor a purchase type. Both columns
-- have to accept NULL before the new code can insert one.
ALTER TABLE public."ic_MauticCapture"
  ALTER COLUMN "stripeSessionId" DROP NOT NULL,
  ALTER COLUMN "purchaseType"    DROP NOT NULL;

COMMIT;
