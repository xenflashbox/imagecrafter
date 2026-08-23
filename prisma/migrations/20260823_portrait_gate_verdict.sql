-- 2026-08-23 — record the acceptance-gate verdict instead of blocking on it.
--
-- The gate (identity/style/ip) used to convert its own verdict into a
-- customer-facing failure. It has demonstrated errors in both directions, and a
-- verdict nobody sees cannot be corrected, so identity and style now deliver and
-- record. This column is the only trace of what the gate thought.
-- Null on portraits that never reached the gate, and on every pre-existing row.
--
-- Strictly additive: nullable column, no default, no backfill.

BEGIN;

SET LOCAL search_path = public;

ALTER TABLE "ic_Portrait" ADD COLUMN IF NOT EXISTS "gateVerdict" JSONB;

COMMIT;
