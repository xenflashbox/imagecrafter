-- 2026-09-05 — record every buyer push to Mautic, including the failures.
--
-- The Stripe webhook must never fail a paid checkout because a marketing
-- system is down, but a swallowed push is a lost customer. Each completed
-- checkout writes a row here: "captured" with the Mautic contact id, or
-- "failed" with the error, which /api/cron/mautic-retry drains.
--
-- Its own table rather than a flag on ic_Order because pack purchases never
-- create an Order row — an Order flag would silently drop pack captures.
--
-- Strictly additive: new table only.
--
-- Every object is schema-qualified: this role's search_path is
-- "launchcraft, public", so an unqualified CREATE lands in launchcraft while
-- Prisma reads from public.

BEGIN;

CREATE TABLE IF NOT EXISTS public."ic_MauticCapture" (
  "id"              TEXT PRIMARY KEY,
  "stripeSessionId" TEXT NOT NULL UNIQUE,
  "email"           TEXT NOT NULL,
  "name"            TEXT,
  "status"          TEXT NOT NULL,
  "contactId"       INTEGER,
  "attempts"        INTEGER NOT NULL DEFAULT 0,
  "lastError"       TEXT,
  "purchaseType"    TEXT NOT NULL,
  "subjectType"     TEXT,
  "style"           TEXT,
  "orderId"         TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "ic_MauticCapture_status_idx"
  ON public."ic_MauticCapture" ("status");

COMMIT;
