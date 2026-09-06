-- 2026-09-06 — preview funnel instrumentation.
--
-- ic_PreviewUsage already records every attempt, so nothing new needs logging.
-- What was missing is the join: the preview-to-sale relationship spans three
-- tables, so nobody would ever actually run it. These two views make the ratio
-- a SELECT, which is the point — the plan is to read it at ~100 users and let
-- the data set the thresholds, and that only happens if it is one query away.
--
-- Views only. Additive, no data touched, safe to re-run.

CREATE OR REPLACE VIEW public."ic_PreviewsPerVisitor" AS
SELECT
  u."sessionId",
  min(u."email")                                 AS "email",
  count(*) FILTER (WHERE u."status" = 'allowed') AS "previewsAllowed",
  count(*) FILTER (WHERE u."status" = 'blocked') AS "previewsBlocked",
  min(u."createdAt")                             AS "firstPreviewAt",
  max(u."createdAt")                             AS "lastPreviewAt",
  EXISTS (
    SELECT 1
      FROM public."ic_Order" o
      JOIN public."ic_Portrait" p ON p."id" = o."portraitId"
     WHERE p."sessionId" = u."sessionId"
       AND o."status" IN ('paid', 'fulfilled', 'shipped', 'delivered')
  )                                              AS "converted"
FROM public."ic_PreviewUsage" u
GROUP BY u."sessionId";

-- One row per paid order: how many previews that buyer burned before paying.
-- Matched on session OR email because the address only appears from preview #2,
-- so a buyer's free first preview is anonymous and would otherwise be lost.
CREATE OR REPLACE VIEW public."ic_PreviewsPerSale" AS
SELECT
  o."id"        AS "orderId",
  o."email",
  o."type",
  o."amount",
  o."createdAt" AS "purchasedAt",
  p."sessionId",
  (
    SELECT count(*)
      FROM public."ic_PreviewUsage" u
     WHERE u."status" = 'allowed'
       AND u."createdAt" <= o."createdAt"
       AND (u."sessionId" = p."sessionId" OR lower(u."email") = lower(o."email"))
  )             AS "previewsBeforePurchase"
FROM public."ic_Order" o
JOIN public."ic_Portrait" p ON p."id" = o."portraitId"
WHERE o."status" IN ('paid', 'fulfilled', 'shipped', 'delivered');
