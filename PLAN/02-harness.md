# ImageCrafter — Sub-Agent Execution Harness

Five work-streams execute `PLAN/01-plan.md`. Each has a self-contained brief in `PLAN/agents/` carrying the Hard Rules verbatim, exact file ownership (no two streams write the same file), inputs, definition-of-done, and a smoke test. The lead (orchestrating session) dispatches briefs, runs the smoke tests itself (trust but verify), and holds phase gates.

## Streams at a glance

| # | Stream | Brief | Plan items | Writes files |
|---|--------|-------|-----------|--------------|
| 1 | `face-swap-test` | agents/face-swap-test.md | Phase 1 | `scripts/faceswap-timebox/*`, `PLAN/results/faceswap-timebox.md` |
| 2 | `backend-provider` | agents/backend-provider.md | Phase 2 (amended A1–A3) | `prisma/schema.prisma`, `lib/services/image-generation.ts`, `lib/plans.ts`, `app/api/images/generate/route.ts`, `app/api/images/batch/route.ts` (wire-or-delete per founder #1), pick UI + select route, `scripts/smoke/service-single.ts`, `scripts/smoke/service-dual.ts` |
| 3 | `product-merge` | agents/product-merge.md | Phase 3 | `lib/services/portrait-generation.ts`, `lib/services/replicate-portrait.ts`, `app/api/gallery/route.ts`, `app/(dashboard)/gallery/page.tsx`, portrait copy strings |
| 4 | `stripe-payments` | agents/stripe-payments.md | Phase 0.4 + Phase 4 | `lib/services/pricing.ts`, `app/api/pricing/route.ts`, `app/api/orders/create/route.ts`, `lib/services/print-fulfillment.ts`, `app/portraits/[id]/preview/page.tsx`, `app/portraits/[id]/print-options/page.tsx`, `PLAN/results/payments-e2e.md` |
| 5 | `site-redesign-and-gallery` | agents/site-redesign.md | Phase 5 | `app/(marketing)/*`, `app/portraits/page.tsx`, `components/*`, `public/*`, `prisma/seed-style-packs.ts`, `next.config.ts` (remotePatterns only) |

> **AMENDMENT 2026-07-05 (A1):** `lib/services/providers/*` is NOT built — dual-engine lives in the image-gen service. backend-provider is service-integration scope; no provider SDKs, no Kling client, no engine keys in this repo. Row 2/3 above already reflect this.

**Ownership conflicts resolved by fiat:**
- `lib/services/image-generation.ts` → backend-provider ONLY. product-merge consumes the published `GenerationRequest` data shape, never edits it.
- `app/(dashboard)/generate/*` pick UI → backend-provider (amended — pick UI ships with the dual integration); unified-gallery nav + gallery pages → product-merge.
- `prisma/schema.prisma` → backend-provider ONLY (single migration author). product-merge requests schema needs through the lead before backend-provider finalizes its migration.
- `lib/plans.ts` → backend-provider (tier collapse Free/Pro + batch copy per founder #1). pricing display → stripe-payments (via new pricing API, doesn't edit plans.ts structure).
- `next.config.ts` → site-redesign, single line (remove picsum), last deploy.
- `app/portraits/page.tsx` → site-redesign owns layout; product-merge may ONLY change verdict copy strings — coordinate via lead if simultaneous.

## Dependency / concurrency graph

```
P0.1 keys (founder)──────────────┐
P0.2 answers (founder)───────────┤
                                 ▼
[1 face-swap-test] ──verdict──► [3 product-merge (3.3 copy)]
   (runs FIRST, fully parallel)         ▲
                                        │ provider interface (2.1)
[2 backend-provider] ───────────────────┘
   (parallel with 1 and 4)
[4 stripe-payments] (parallel with 1 and 2; P0.4 first, then 4.1–4.3)
[5 site-redesign] scaffold parallel; FINAL assets gated on 1's verdict + 2/3 core
```

- **Wave A (immediately, concurrent):** face-swap-test, backend-provider (2.1–2.3 service integration + tier collapse), stripe-payments (P0.4 + 4.1 prep).
- **Wave B:** product-merge (after 2.1 data shape frozen + Phase 1 verdict), backend-provider 2.4 (batch, on founder #1), stripe-payments 4.2/4.3.
- **Wave C:** site-redesign final assets + deploy (after verdict, unified core, pricing API).
- Max 3 streams active at once (PM parallel limit).

## Phase gates (lead-enforced, binary)

| Gate | Passes when |
|------|-------------|
| G1 (after Wave A) | faceswap results doc has PASS/FAIL on all 4 criteria; service-integration smoke green (Pro: 2 real service images under 1 GenerationRequest, pick works, gallery shows pick; Free: 1 image, identical gallery behavior); webhook test events 200 in prod logs |
| G2 (after Wave B) | unified gallery smoke green; payments E2E doc all-green; batch stub gone (grep) — wired to service batch or fully removed per founder #1 |
| G3 (launch) | `PLAN/01-plan.md` launch checklist all checked; zero `picsum.photos` in DB/seeds/config; print UI state matches Prodigi live status |

Smoke tests are defined inside each brief; the lead re-runs them independently — an agent's own report is never sufficient evidence.

## Escalation

Any stream that hits a founder-confirmation blocker (§10 of 00-ground-truth.md) stops that item, reports the exact question, and continues on unblocked items. No guessing. No mock stand-ins to "keep moving."
