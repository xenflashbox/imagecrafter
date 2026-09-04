# Agent Brief: stripe-payments (Wave A → B)

## Hard rules (Xenco Labs non-negotiables — obey without exception)

- Production-quality only. No workarounds. No quick fixes. No mock data. No mock
  fallbacks. If a path can't be made real, it does not ship — it waits.
- Nothing a customer can pay for may map to a delivery you can't actually fulfill.
- Prodigi must be verified in LIVE production mode before any print-to-ship charge is
  possible. Sandbox is not "done."
- Schema-first. Services-layer-always. Do not hardcode prices in the frontend — read
  from Stripe. Do not conflate the two products' data models silently — map them.
- Defer to the running system over any assumption, including the founder's account
  above and including your own training data. Where they conflict, the code wins and
  you flag the conflict.

## Mission

Phase 0.4 + Phase 4 of `PLAN/01-plan.md`. As-built: subscriptions real (env price
IDs → `PRICE_TO_PLAN`); pay-per-output real BUT prices hardcoded — digital $14.95 at
`app/api/orders/create/route.ts:30`, print cents in `PRINT_CATALOG`
(`lib/services/print-fulfillment.ts:58-78`), display hardcoded in portrait pages.
Prodigi integration is real but sandbox-only; live never verified. P-1 risk: webhook
URLs may still point at the dead swarm host after the 2026-06-28 Vercel migration.

## Blockers you must respect

- Founder answer #12 (confirm launch prices) before creating Stripe objects.
- Founder answer #6 (Prodigi live account readiness) before 4.2.
- Prodigi LIVE verification before any customer print charge is possible — hard rule.

## Scope / files you own (write NOTHING else)

- `lib/services/pricing.ts` (new), `app/api/pricing/route.ts` (new).
- `app/api/orders/create/route.ts` (line items from Stripe price IDs).
- `lib/services/print-fulfillment.ts` (drop `priceUsd`; keep SKU/Prodigi mapping;
  print-enabled flag read).
- `app/portraits/[id]/preview/page.tsx`, `app/portraits/[id]/print-options/page.tsx`
  (prices via pricing API; print UI gated on live-verification flag).
- `PLAN/results/payments-e2e.md`.
- Dashboard/config work (no code): Stripe, Clerk, Prodigi webhook endpoints; Stripe
  Products/Prices/Coupon creation; Vercel env.

## Work items (in order)

1. **P0.4 Webhook audit (FIRST — P-1).** Verify/repoint Stripe, Clerk, Prodigi
   webhooks to `https://imagecrafter.app/api/webhooks/{stripe|clerk|prodigi}`;
   confirm secrets match Vercel env; fire one test event per provider and confirm
   200 in prod logs.
2. **4.1 Stripe as price source of truth.** Create Products/Prices with lookup keys
   + metadata (`sku`, `format`, `prodigiSku`); 15% subscriber discount becomes a
   Stripe Coupon/Promotion. `pricing.ts` fetches/caches (≤1h TTL); orders use price
   IDs, not inline `price_data`; UI reads `GET /api/pricing`. Remove every hardcoded
   dollar amount.
3. **4.2 Prodigi live gate.** With founder: real live key, ONE live verification
   order (cheapest SKU → founder's address), confirm prod webhook stages. Until it
   passes, print purchase UI is hidden behind a server-checked flag; digital ships
   regardless. Flip `USE_PRODIGI_SANDBOX=false` only after verification.
4. **4.3 E2E proof.** Scripted checklist (Stripe CLI/test clocks): subscription
   lifecycle incl. credit reset; digital order → webhook → email → token download ×2
   → expiry; print order sandbox then live; `checkout.session.expired` cleanup.
   Archive results in `PLAN/results/payments-e2e.md`.

## Definition of done

- All three webhook providers verified live with test events (evidence in results doc).
- Price change in Stripe dashboard reflects in UI + checkout within cache TTL, no
  deploy. `grep -rn "1495\|2995\|4995\|6995\|8995\|9995\|12995\|\$14\.95\|\$29\.95"
  app lib components` returns nothing (test fixtures exempt).
- With print flag off: no print CTA renders anywhere. With flag on (post-live-verify):
  full print flow works.
- `PLAN/results/payments-e2e.md` all-green.

## Smoke test (lead re-runs)

`curl https://<preview>/api/pricing` returns digital + all print SKUs with amounts
matching the Stripe dashboard; a test-mode digital checkout completes and the
download token works twice then respects limits.

## Sequencing

P0.4 immediately (Wave A, parallel with face-swap-test and backend-provider 2.1).
4.1 after founder price confirmation. 4.2/4.3 Wave B. No dependency on other streams'
code — your only shared file risk is none (you own all your files exclusively).
