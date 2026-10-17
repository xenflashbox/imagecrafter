-- 2026-10-13 — Rename fulfillment columns away from the legacy Prodigi naming.
-- Gelato is the primary fulfiller, with provider-neutral fields so another
-- fulfiller can remain available for product coverage or incident fallback.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'imagecrafter'
      AND table_name = 'ic_Order'
      AND column_name = 'prodigiOrderId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'imagecrafter'
      AND table_name = 'ic_Order'
      AND column_name = 'fulfillmentOrderId'
  ) THEN
    ALTER TABLE imagecrafter."ic_Order"
      RENAME COLUMN "prodigiOrderId" TO "fulfillmentOrderId";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'imagecrafter'
      AND table_name = 'ic_Order'
      AND column_name = 'prodigiStatus'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'imagecrafter'
      AND table_name = 'ic_Order'
      AND column_name = 'fulfillmentStatus'
  ) THEN
    ALTER TABLE imagecrafter."ic_Order"
      RENAME COLUMN "prodigiStatus" TO "fulfillmentStatus";
  END IF;
END $$;

ALTER TABLE imagecrafter."ic_Order"
  ADD COLUMN IF NOT EXISTS "fulfillmentProvider" TEXT;

UPDATE imagecrafter."ic_Order"
SET "fulfillmentProvider" = CASE
  WHEN "fulfillmentStatus" LIKE 'gelato:%' THEN 'gelato'
  WHEN "fulfillmentOrderId" IS NOT NULL THEN 'prodigi'
  ELSE "fulfillmentProvider"
END
WHERE "fulfillmentProvider" IS NULL;

ALTER INDEX IF EXISTS imagecrafter."ic_Order_prodigiOrderId_idx"
  RENAME TO "ic_Order_fulfillmentOrderId_idx";
