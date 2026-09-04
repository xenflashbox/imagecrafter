# ImageCrafter — Merge-and-Finish Plan (v1 launch)

---

## ⚠ AMENDMENT — 2026-07-05 Session 2 (supersedes conflicting text below)

The session-1 audit reasoned from this repo alone and could not see two external truths. Three corrections, applied before any dispatch:

**A1 — Dual-engine is NOT built in-app; it lives in the image-gen service.**
`image-gen.xencolabs.com` already exposes `POST /api/v1/dual/generate` (Gemini + OpenAI in one response), single-provider endpoints (`/api/v1/generate`, `/api/v1/openai/generate`), and REAL batch (`/api/v1/generate/batch`, ≤10, per-item settings) — see `IMAGE-GEN-USER_GUIDE.md`. It is being upgraded separately to add Higgsfield + Kling behind the same contract, Infisical-secured.
→ **Phase 2 is REWRITTEN:** do NOT build `lib/services/providers/` with in-app provider classes; do NOT build an in-app Kling client (Kling is removed from ImageCrafter Phase 2 entirely). ImageCrafter calls the service — `dual/generate` for the Pro pick-the-winner flow, single endpoint for Free — and owns ONLY the app-layer concern: the `GenerationRequest` grouping model (one request → N returned images → `selectedImageId`), the side-by-side pick UI, credit accounting, gallery-shows-pick. No provider SDKs in the app. Consequence for Phase 3.1: portrait text-to-image continues to call the service directly; Replicate kontext-pro remains the one direct provider dependency (identity preservation is a separate capability the service does not offer).

**A2 — Batch: connect, don't delete.** The service has real batch. Item 2.3 is reframed: EITHER wire `app/api/images/batch/route.ts` to `/api/v1/generate/batch` (real feature restored) if batch is a Pro selling point, OR defer to v1.1 by removing the UI affordance. Either way the credit-reserving stub must not survive. **Founder decision required — stream stops on this item and escalates; all other items proceed.**

**A3 — Engine lineup + tiers.** The service serves Higgsfield + Kling live; Gemini + OpenAI present-but-flagged-off there until the founder sets keys. ImageCrafter asks for "one image" or "two to choose between"; the service routes. ImageCrafter therefore has NO engine-key dependency and NO Google-key exposure — Phase 0.1's key rotation remains an upstream launch gate but no longer blocks Wave A app work. **Tiers collapse to Free / Pro** (founder-resolved; mirror ResumeCoach tier discipline): collapse STARTER/TEAM in `lib/plans.ts`, pricing UI, and copy. Existing STARTER/TEAM subscribers' rows must be migrated explicitly (map STARTER→PRO grandfathered or per founder pricing call — flag in migration notes).

**Founder answers now resolved:** face-swap = Replicate (founder misspoke "Render"), timebox unchanged · 2nd-engine question moot · tiers = Free/Pro · Prodigi live account ready, needs the verification pass.
**Still open (escalate, don't guess):** (1) batch connect-vs-defer; (2) Prodigi live order this window vs digital-first launch; (3) launch prices before Stripe objects created; (4) ops gates (keys rotated + `/health` OK, Vercel token rotated + closeout MDs scrubbed, webhooks repointed) — block launch, not Wave A.

---

## ⚠ AMENDMENT — 2026-07-06 Session 3: corrected critical path (post-Wave-A)

Wave A (2026-07-05) proved the tracks are NOT independent — see `docs/imagecrafter-corrected-critical-path.md` (authoritative). Forced order:

- **[A]→[B]** image-gen Fable session must ship first (service currently `degraded`, `dual/generate` 500s). ImageCrafter's generation smokes (`scripts/smoke/service-{single,dual}.ts`) run only after `/health` is healthy and dual returns 2 real images. backend-provider CODE is complete + build-green; only LIVE smoke waits.
- **[C]→[D]** ImageCrafter → Infisical (P-0) before ANY Stripe work: the live Stripe key is EXPIRED (prod checkout/webhooks down); the valid replacement enters via the vault, retiring Vercel-env/.env plaintext copies AND the exposed Vercel token (P0.3 merges into this).
- **[E]** Founder photos into repo → face-swap-test dispatches. A, C, E are mutually independent.
- **Migration applied 2026-07-06** to Neon branch `imagecrafter-smoke-20260706` (project `winter-dust-08466865`, endpoint `ep-tiny-hill-adg4khve`), lead-verified: all objects present, PlanTier collapsed. Prod `main` untouched.
- **Reassigned:** missing subscription checkout flow → product-merge item 3.4 (was misfiled as stripe-payments scope; it's the Pro purchase path).
- **Founder decisions still open:** launch prices incl. the two display-vs-charge mismatches (16×20: UI $79.95 / charged $49.95; 24×36: UI $129.95 / charged $69.95) · Pro monthly price · 15% discount scope · batch connect-vs-defer · Prodigi live-order timing (print UI stays hidden — sandbox key is a broken live-key copy, 401s).

---

**Basis:** `PLAN/00-ground-truth.md` only. Every item cites as-built facts, names the owning work-stream (see `PLAN/02-harness.md`), exact files, and a testable definition-of-done (DoD).
**Repo reality check that reshapes the founder's plan:** the "two products" already live in one repo, one DB, one auth. The merge is NOT a codebase merge — it's (a) a provider-layer refactor to get real dual-engine, (b) an explicit data-model mapping + unified gallery, (c) making both payment points production-true, (d) a face-swap decision, (e) a site that shows real output. Also: the face-swap candidate is **already integrated** (Replicate flux-kontext-pro behind `ENABLE_FACE_PRESERVATION`), which makes the timebox test cheap and immediate.

---

## Phase 0 — Prerequisites (upstream/founder; NOT app work; blocks everything marked ⬅P0)

**P0.1 Key rotation + gateway lockdown** — owner: founder/infra (LiteLLM gateway host).
Rotate leaked Gemini/OpenAI/Anthropic keys at the providers; replace in the gateway's secret store only; lock down `.env` sharing. Confirm `image-gen.xencolabs.com` and `ai.xencolabs.com` healthy after rotation.
*DoD:* `POST image-gen.xencolabs.com/api/v1/generate` returns a real image with the NEW key; old keys revoked (provider dashboards show revocation); `ai.xencolabs.com/v1/chat/completions` 200.

**P0.2 Founder confirmations** — answer §10 of `00-ground-truth.md` (12 questions). Items below note which answers they block on.

**P0.3 Local secret scrub** — rotate the Vercel token exposed in `DOMAINS-ATTACHED-FINISH-CLOSEOUT-20260628.md`; scrub/delete the closeout MDs at repo root (they're untracked; keep copies outside the repo if wanted).
*DoD:* old token 401s against the Vercel API; no plaintext tokens in the working tree.

**P0.4 Webhook endpoint audit (P-1 severity)** — stream: stripe-payments (dashboard work, no code).
Verify Stripe, Clerk, and Prodigi dashboard webhook URLs point at `https://imagecrafter.app/api/webhooks/{stripe|clerk|prodigi}` and secrets match Vercel env.
*DoD:* one test event per provider (Stripe CLI `stripe trigger`, Clerk "send example", Prodigi sandbox order) received with 200 in production logs.

---

## Phase 1 — Face-swap timebox test (FIRST risky item; run EARLY) — stream: `face-swap-test`

As-built: the face-preserving path is Replicate `black-forest-labs/flux-kontext-pro`, fully wired in `lib/services/replicate-portrait.ts` but flagged off. "Render" does not exist in the repo. Test what's built.

**HARD TIMEBOX: 1 working session, max 40 Replicate runs (~$1.60).** No extensions. Runs happen via a test script hitting the existing service functions against a dev DB — not via production.

- Matrix: 4 subject types (person, pet, couple, group-3+) × 5 style variants (Renaissance, Starry Night, Egyptian, Elven, Comic Hero) × 2 repeats = 40 runs, using founder-supplied real photos (≥3 faces the evaluator knows).
- **Success criteria for "clean, repeatable swap" (ALL must hold):**
  1. **Recognizability:** ≥80% of single-subject outputs are immediately recognizable as the input person/pet by someone who knows them (founder judges; blind A/B against the source photo).
  2. **No disqualifying artifacts:** ≤10% of outputs show warped faces, wrong number of subjects, or identity bleed between subjects in group shots.
  3. **Repeatability:** for the 2× repeats, both runs meet criteria 1–2 (no coin-flip quality).
  4. **Ops:** p95 latency ≤ 90s end-to-end; cost ≤ $0.06/run; zero Replicate API instability across the session.
- Files owned: `scripts/faceswap-timebox/` (new, test harness only), `PLAN/results/faceswap-timebox.md` (scored matrix + verdict). **No app code changes.**
- *DoD:* results doc with every run scored against the 4 criteria and an unambiguous PASS/FAIL verdict.

**The honest fork (decided by the verdict, not by hope):**
- **PASS →** face-into-scene is the hero flow: set `ENABLE_FACE_PRESERVATION=true` in Vercel prod (env change, Phase 3 flips it), market it as photo transformation.
- **FAIL →** ship v1 as **prompt-to-scene**: the existing fallback (Claude Vision describes the subject → text-to-image places a *described* subject, no swap) becomes the flow, marketed honestly ("inspired-by portrait", not "your face in art"); face-swap ships v1.1 only when a provider passes this same timebox. **No unproven swap ever reaches a paying customer.**

---

## Phase 2 — Second backend: Kling as first-class provider + real dual-engine — stream: `backend-provider` ⬅P0.1, blocks on founder answer #3

As-built: single hardcoded backend (`image-generation.ts:238-258`), no provider abstraction, `Image.modelVersion` records the model string. Dual-engine ("two backends, user picks winner") was never built.

**2.1 Provider layer (schema-first).**
- Prisma: add `provider` (enum/string) to `Image`; add `GenerationRequest` grouping model (one request → N `Image` rows, one per engine) with `selectedImageId`. Migration + `prisma migrate`.
- New `lib/services/providers/` — `types.ts` (single `ImageProvider` interface: `generate(params) → {imageUrl, model, externalId, cost}`), `xenco-gemini.ts` (extract the existing `image-gen.xencolabs.com` call verbatim — behavior-preserving), `kling.ts` (new, real Kling image API with founder's credentials; real error surfaces, **no mock fallback** — if Kling errors, the request degrades to the single Gemini result and the UI says so).
- Refactor `lib/services/image-generation.ts` to dispatch through the registry; **no other file may call a provider directly** (portrait fallback path routes through the same layer).
- Files: `prisma/schema.prisma`, `lib/services/providers/*` (new), `lib/services/image-generation.ts`, `app/api/images/generate/route.ts`.
- *DoD:* `generate` route returns identical shape as today with `provider: "xenco-gemini"`; a Kling smoke script (`scripts/smoke/kling-generate.ts`) produces a real Kling image persisted to R2 with correct DB rows; typecheck + build green.

**2.2 Dual-engine dispatch (Pro feature).**
- Pro/Team requests fan out to both providers in parallel; both results stored under one `GenerationRequest`; user picks winner (`selectedImageId`); loser eligible for early R2 expiry. Free/Starter: single engine (Kling — cheap, founder-controlled; Google leaves the critical path), low-res cap per existing plan limits. Credits: charge one generation per dual request at launch (pricing knob, founder answer #9/#12).
- Files: `lib/services/image-generation.ts`, `app/api/images/generate/route.ts`, `app/(dashboard)/generate/page.tsx` (side-by-side pick UI), `app/api/images/route.ts` (gallery shows selected).
- *DoD:* a Pro test account generates once, receives two real images from two named providers, picks one, gallery shows the pick; a Free account receives exactly one Kling image. Both verified against production-equivalent env in preview deploy.

**2.3 Batch: fix or remove.** The stub (`processBatchJob()` empty, credits reserved and stranded) violates "no half-finished paths." Decision: **remove the batch route + UI affordances for v1** (it's a plan-tier feature bullet — pull it from `PRICING_TABLE` copy) OR implement real queueing. Default: remove; reinstate v1.1.
- Files: `app/api/images/batch/route.ts` (delete), `lib/services/image-generation.ts:440-467`, `lib/plans.ts` copy, pricing UI.
- *DoD:* no route, no dangling UI, no `BatchJob` writes; plans copy no longer promises batch. (Keep the Prisma model; drop in a later migration.)

## Phase 3 — Product merge: one core, two entry modes, one gallery — stream: `product-merge` (sequences after 2.1)

As-built: products share User/auth/discount only; outputs live in `Image` vs `Portrait`+`Order`; gallery is two tabs hitting two APIs.

**3.1 One generation core.** Portrait generation's fallback + text-to-image calls route through the Phase-2 provider layer (portraits may pin their provider: kontext-pro or the text-to-image engine). Replicate becomes a provider implementation (`providers/replicate-kontext.ts`) used by the portrait path.
- Files: `lib/services/portrait-generation.ts`, `lib/services/replicate-portrait.ts` (fold into provider), `lib/services/providers/*`.
- *DoD:* both entry modes produce outputs through the same dispatch layer; portrait E2E (upload→preview) passes in preview deploy; zero direct provider calls outside `lib/services/providers/`.

**3.2 Explicit data-model mapping — no silent conflation.** Keep `Image` and `Portrait` tables (their lifecycles genuinely differ: credits vs orders, guest vs auth). Add an explicit mapping: `Portrait.imageId → Image` nullable FK is **rejected** (forces fake credit semantics). Instead: a `GalleryItem` read-model — unified API `GET /api/gallery` returning a discriminated union (`kind: "image" | "portrait"`) with shared fields (url, thumb, createdAt, status, favorite) + kind-specific payloads. Document the mapping table in code comments and in this plan's execution notes.
- Files: `app/api/gallery/route.ts` (new), `app/(dashboard)/gallery/page.tsx` (single feed + filter chips replacing tabs), `app/api/images/route.ts` + `app/api/portraits/route.ts` (unchanged, still power detail views).
- *DoD:* one gallery feed shows both kinds interleaved by date with working filters, favorite toggle on images, order status on portraits; pagination stable across mixed kinds.

**3.3 Face-swap verdict wiring.** PASS: `ENABLE_FACE_PRESERVATION=true` in prod + portrait copy says photo transformation. FAIL: flag stays false, portrait create flow copy switched to "inspired-by" language (exact strings in `app/portraits/create/page.tsx`, `app/portraits/page.tsx`).
- *DoD:* production behavior and marketing copy match the Phase-1 verdict; no path promises a swap that doesn't run.

## Phase 4 — Stripe truth: prices from Stripe, both payment points verified — stream: `stripe-payments` (concurrent with 2/3; ⬅P0.4)

As-built: subscriptions real (env price IDs); pay-per-output real but **prices hardcoded** ($14.95 at `orders/create/route.ts:30`; PRINT_CATALOG cents; UI hardcodes display) — violates "read from Stripe."

**4.1 Stripe as price source of truth.**
- Create Stripe Products/Prices: `digital_download`, one per print SKU (metadata: `sku`, `format`, `prodigiSku`), subscription prices already exist. Founder confirms amounts (answer #12) before creation.
- New `lib/services/pricing.ts`: fetch + cache (revalidate ≤1h) prices by lookup key; `orders/create` builds line items from Stripe price IDs (not inline `price_data`); `PRINT_CATALOG` keeps SKU/Prodigi mapping + display names but **loses `priceUsd`**; UI reads prices via a `GET /api/pricing` route. 15% subscriber discount becomes a Stripe Coupon/Promotion applied at session creation.
- Files: `lib/services/pricing.ts` (new), `app/api/pricing/route.ts` (new), `app/api/orders/create/route.ts`, `lib/services/print-fulfillment.ts`, `app/portraits/[id]/print-options/page.tsx`, `app/portraits/page.tsx`, `components/pricing-section.tsx`.
- *DoD:* change a price in Stripe dashboard → UI + checkout reflect it within cache TTL with zero code deploy; grep proves no dollar amounts in TSX/service code (except Stripe fixtures in tests).

**4.2 Prodigi live-mode gate.**
- Verify live: real `PRODIGI_API_KEY`, place ONE live verification order (cheapest SKU, founder's address), confirm production/shipping/webhook stages fire on the prod endpoint, then flip `USE_PRODIGI_SANDBOX=false`. **Note:** as-built forces sandbox when `NODE_ENV!=="production"` — on Vercel prod `NODE_ENV==="production"`, so the env var alone controls it; keep that logic.
- **Launch gate:** print purchase UI is hidden behind a server-checked flag until live verification passes; digital download ships regardless. Print switches on the hour Prodigi verifies.
- Files: `lib/services/print-fulfillment.ts` (flag read), `app/portraits/[id]/preview/page.tsx`, `app/portraits/[id]/print-options/page.tsx` (gated entry).
- *DoD:* live order delivered (or at minimum accepted + `InProgress` webhook received on prod); flag flip exposes print UI; with flag off, no print CTA renders anywhere.

**4.3 Payment-point E2E proof.** Scripted checklist run in preview+prod: subscription purchase→plan upgrade→credit reset on invoice; digital order→webhook→email→token download×2→expiry honored; print order (sandbox until 4.2, then live). Every charge maps to a real fulfillment; `checkout.session.expired` cleans up.
- *DoD:* checklist executed with Stripe test clocks/CLI, all green, archived in `PLAN/results/payments-e2e.md`.

## Phase 5 — Site redesign: show-don't-tell — stream: `site-redesign-and-gallery` (final assets gated on Phases 1–3; scaffold can start early)

As-built: `public/` has zero imagery; style-pack samples are `picsum.photos` placeholders whitelisted in `next.config.ts` — mock imagery is live in production today.

**5.1 Real asset generation (execution session, uses MCP credits deliberately — the ONLY sanctioned credit spend).** Generate through the product's own pipeline: ≥1 real sample per style variant (49 variants) + 6–10 hero-grade before/after PAIRS (source photo → transformed output; founder supplies source photos with usage rights). Store in R2 under `marketing/`; update `prisma/seed-style-packs.ts` + DB rows to real URLs.
- *DoD:* zero `picsum.photos` URLs in DB or seeds; `picsum.photos` removed from `next.config.ts` remotePatterns; every variant card shows real engine output.

**5.2 Hero + gallery rebuild.** Hero rebuilt around a real transformation (before/after pair, static or simple crossfade). Add a before/after gallery section with subtle scroll-reveal on transformation pairs (framer-motion is already a dependency) — reveal-on-scroll ONLY where it demonstrates transformation; **NO video hero** (still-image product; video misrepresents what's sold). Pricing section reads Phase-4 pricing API. Copy matches the Phase-1 verdict (swap vs inspired-by).
- Files: `app/(marketing)/page.tsx`, `components/*` (new gallery/hero components), `app/portraits/page.tsx`, `public/og-image.jpg` (real output), decide+delete or keep `landing-a`/`landing-b` (founder answer #10).
- *DoD:* production homepage shows ≥6 real before/after pairs above the fold or one scroll below; Lighthouse perf ≥85 mobile; OG image is real product output; no stock/mock imagery anywhere on the site.

---

## Cross-service deploy sequencing

1. P0.1 rotation (upstream) → P0.4 webhook repoint → everything else.
2. Phase 1 timebox needs only dev env + Replicate token — run immediately, in parallel with P0.
3. Phase 2.1 provider refactor deploys behind unchanged behavior (Gemini default) — safe single deploy; 2.2 dual-engine ships with the generate-UI change in the same deploy.
4. Phase 3 gallery API deploys before the gallery UI consumes it (same deploy is fine; API is additive).
5. Phase 4.1 requires Stripe objects created BEFORE the code that reads them deploys (create prices → deploy code → verify → remove hardcoded remnants). 4.2 live flip is env-only, zero-deploy.
6. Phase 5 assets upload to R2 + DB update first; UI deploy last; `next.config.ts` picsum removal rides the UI deploy.

## Launch definition (v1 is launchable when)

- [ ] Keys rotated; webhooks verified live (P0)
- [ ] Face-swap verdict recorded; product behavior + copy match it (Ph1/3.3)
- [ ] Dual-engine real for Pro; Kling serving Free tier; no Google on critical path (Ph2)
- [ ] Unified gallery; one generation core; batch stub gone (Ph2.3/3)
- [ ] All prices from Stripe; both payment points E2E-proven; print gated on Prodigi live (Ph4)
- [ ] Homepage shows real transformations; zero mock imagery (Ph5)
