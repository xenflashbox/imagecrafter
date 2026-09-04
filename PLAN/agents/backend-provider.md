# Agent Brief: backend-provider (Wave A → B) — REVISED 2026-07-05 Session 2

> **Scope change (Amendment A1 in `PLAN/01-plan.md`):** this stream is now
> SERVICE-INTEGRATION, not provider-build. The dual-engine capability already exists
> in the shared image-gen service (`image-gen.xencolabs.com`). Do NOT build
> `lib/services/providers/`, do NOT write a Kling client, do NOT add any provider SDK
> to this app. The prior version of this brief is superseded in full.

## Hard rules (Xenco Labs non-negotiables — obey without exception)

- Production-quality only. No workarounds. No quick fixes. No mock data. No mock
  fallbacks. If a path can't be made real, it does not ship — it waits.
- There is no option A/B. There is the correct construction. Detail the reasoning.
- Nothing a customer can pay for may map to a delivery you can't actually fulfill.
- Prodigi must be verified in LIVE production mode before any print-to-ship charge is
  possible. Sandbox is not "done."
- Schema-first. Services-layer-always. Do not hardcode prices in the frontend — read
  from Stripe. Do not conflate the two products' data models silently — map them.
- Defer to the running system over any assumption, including the founder's account
  and including your own training data. Where they conflict, the code wins and you
  flag the conflict.

## Mission

Phase 2 of `PLAN/01-plan.md` (as amended). Integrate ImageCrafter with the image-gen
service and own ONLY the app-layer concerns:

- **Pro flow:** call `POST /api/v1/dual/generate` — one call returns two provider
  results (`{gemini: {...}, openai: {...}}`-shaped envelope; the service routes to
  whichever providers are live, currently Higgsfield + Kling). Persist both under one
  `GenerationRequest`; user picks the winner side-by-side; gallery shows the pick.
- **Free flow:** call the single-generate endpoint (`POST /api/v1/generate`) — one
  image, same persistence path, `GenerationRequest` with one child.
- **Tiers:** collapse to **Free / Pro** everywhere (`lib/plans.ts`, pricing UI, copy).
  STARTER/TEAM subscriber rows get an explicit mapped migration — never silent.
- **Credit accounting:** debit on request creation; refund on total service failure.
  If the service errors, the request fails honestly and the UI says so — no mock, no
  silent fallback image.

API reference: `IMAGE-GEN-USER_GUIDE.md` (repo root). Auth: `X-API-Key` header;
key from env (`IMAGE_GEN_API_KEY`) — fail loud via `lib/env.ts` `requireEnv()` if
absent. `GET /health` is public — use it in smoke preflight.

As-built starting point: `lib/services/image-generation.ts:196-373` already calls
`${IMAGE_GEN_API_URL}/api/v1/generate` — extend this service layer, don't fork it.

## Blockers you must respect

- **Batch (founder confirmation #1, unresolved):** ImageCrafter's batch is a dead
  stub (`processBatchJob()` empty, credits stranded). The service HAS real batch
  (`POST /api/v1/generate/batch`, ≤10, per-item settings). Founder must decide:
  wire it for v1, or defer to v1.1 and remove the UI affordance. Either way the
  credit-reserving stub must NOT survive. Until the decision lands: STOP on the
  batch item, escalate to the lead, continue everything else. Do not guess.
- ImageCrafter has NO engine-key dependency (Amendment A3) — do not add one.

## Scope / files you own (write NOTHING else)

- `prisma/schema.prisma` + one migration (you are the ONLY schema author; collect
  product-merge's schema needs via the lead before finalizing).
- `lib/services/image-generation.ts` (extend: dual + single service calls,
  GenerationRequest persistence, credit accounting).
- `lib/plans.ts` (tier collapse Free/Pro; batch copy per founder decision).
- `app/api/images/generate/route.ts`.
- `app/api/images/batch/route.ts` (wire to service batch OR delete — founder
  decision #1; stub must not survive in either outcome).
- Side-by-side pick UI: `app/(dashboard)/generate/` pick components +
  `app/api/images/requests/[id]/select/route.ts` (or equivalent — keep it in your
  owned surface; coordinate any gallery-file need through the lead, gallery files
  belong to product-merge).
- `scripts/smoke/service-single.ts`, `scripts/smoke/service-dual.ts`.

## Work items (in order)

1. **2.1 Schema + service integration.** `GenerationRequest` model (1 request → N
   `Image` children → `selectedImageId`); `Image.provider` column populated from the
   service response (provider name, external_id, latency_ms, estimated_cost_usd
   worth persisting in metadata). Wire single-generate for Free through the new
   model — behavior-preserving for the existing UI, deployable alone.
2. **2.2 Dual + pick.** Pro requests hit `dual/generate`; both images persisted to
   R2 + DB under one GenerationRequest; side-by-side pick UI; `selectedImageId` set
   on pick; gallery shows the pick (gallery rendering itself is product-merge's —
   expose the data shape, agree via lead). Partial service result (one provider
   errored): surface exactly what the service returned, label it, charge accordingly
   — never fabricate the missing image.
3. **2.3 Tier collapse.** Free/Pro only in `lib/plans.ts`, `PRICE_TO_PLAN`, pricing
   UI/copy; explicit migration mapping existing STARTER/TEAM subscribers with the
   mapping documented in the migration.
4. **2.4 Batch resolution.** BLOCKED on founder confirmation #1 — stop + escalate.

## Definition of done

- Typecheck + `pnpm build` green; migration applies cleanly to a Neon branch.
- Free flow: one REAL service image persisted (R2 + Image + GenerationRequest rows).
- Pro flow: TWO real images from the service under ONE GenerationRequest; pick
  persists `selectedImageId`; gallery data shape shows the pick.
- Service failure path: request marked failed, credits refunded, UI shows an honest
  error — `grep` shows no mock/fallback/placeholder image path.
- No provider SDKs added to package.json; `lib/services/providers/` does not exist;
  no Kling/Gemini/OpenAI keys referenced anywhere in this repo.
- STARTER/TEAM absent from plans/UI/copy; migration maps existing rows explicitly.

## Smoke tests (lead re-runs)

- `npx tsx scripts/smoke/service-single.ts` → 1 real image URL + DB ids (Free path).
- `npx tsx scripts/smoke/service-dual.ts` → 2 real images, 2 named providers, 1
  GenerationRequest id; then a select call sets `selectedImageId`.
- Preflight in both scripts: `GET https://image-gen.xencolabs.com/health` must be OK.

## Sequencing

2.1 is Wave A (parallel with face-swap-test and stripe-payments). Publish the
`GenerationRequest` data shape to the lead the moment 2.1 lands — product-merge
consumes it and may not edit your files. 2.2/2.3 complete in Wave A; 2.4 whenever
founder confirmation #1 arrives.
