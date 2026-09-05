-- 2026-09-05 — preview gate: CONTRACT step.
--
-- DO NOT RUN THIS WITH THE EXPAND STEP. It runs only once the code from the
-- expand deploy is live in production and verified, because dropping this
-- column while the previous deploy is still serving traffic is the exact
-- outage the expand/contract split exists to avoid.
--
-- Order: expand migration → deploy → verify a real buyer capture writes both
-- columns and reads dedupeKey → then this.

BEGIN;

-- Catch anything the expand deploy wrote through the old path while the two
-- code versions overlapped. Should affect zero rows; cheap insurance if not.
UPDATE public."ic_MauticCapture"
   SET "dedupeKey" = 'stripe:' || "stripeSessionId"
 WHERE "dedupeKey" IS NULL
   AND "stripeSessionId" IS NOT NULL;

-- Takes the unique constraint and its index with it.
ALTER TABLE public."ic_MauticCapture"
  DROP COLUMN IF EXISTS "stripeSessionId";

COMMIT;
