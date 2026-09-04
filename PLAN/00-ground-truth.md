# ImageCrafter — As-Built Ground Truth

**Date:** 2026-07-05 · **Branch audited:** `vercel-prep` (merged to `main` via PR #3 on 2026-06-28; production tracks `main`)
**Method:** full repo audit (4 parallel deep-dives + lead-architect spot verification of every high-stakes claim).
**Labels:** `[verified-in-repo]` = confirmed by reading source with file:line evidence. `[founder-claim-unverified]` = stated in the founder's account but NOT confirmable from this repo. `[external-verified]` = confirmed from ops closeout records, not app source.

---

## 1. Repo / stack map

- **Framework:** Next.js 15.5.19, App Router, React 19, TypeScript, Tailwind, pnpm. Single application — there is no separate backend service in this repo. `[verified-in-repo]` (package.json)
- **Hosting:** **Vercel, live in production at `imagecrafter.app`** since 2026-06-28 (www → apex 308 redirect working; robots/sitemap/webmanifest 200). `[external-verified]` (FINAL-CLOSEOUT-OPTION-A-20260628.md). The Docker Swarm artifacts in-repo (`docker-compose.yml`, `Dockerfile`, `deploy-imagecrafter.sh`, Traefik labels, NFS volumes) are the **legacy** deployment; `next.config.ts:4-6` keeps conditional `standalone` output for Docker. `[verified-in-repo]`
- **Database:** PostgreSQL on **Neon** (shared instance with BlogCraft), Prisma 6, every table prefixed `ic_` (`@@map("ic_*")`). Env: `DATABASE_URL` (+ optional `DATABASE_URL_UNPOOLED`). `[verified-in-repo]` (prisma/schema.prisma:11, lib/prisma.ts)
- **Auth:** Clerk 6.39 via `clerkMiddleware` (middleware.ts:1-45). Public routes: `/`, sign-in/up, `/api/health`, `/api/webhooks/*`, **the entire Portrait Studio guest flow** (`/portraits*`, `/api/portraits/*`, `/api/orders/*`, `/api/print/*`), `/blog*`, `/api/newsletter*`. Everything else `auth.protect()`. Clerk webhook (svix-verified) syncs user create/update/delete → Prisma (app/api/webhooks/clerk/route.ts). `[verified-in-repo]`
- **Object storage:** Cloudflare R2 (S3 SDK), bucket default `imagecrafter-prod`, key scheme `users/{userId}/{yyyy}/{mm}/{imageId}.{ext}`, sharp-generated thumbnails, per-plan expiration + cleanup endpoint `app/api/cron/cleanup-expired` gated by `CRON_SECRET`. **No scheduler found in repo** — external trigger required. `[verified-in-repo]` (lib/r2.ts; cron scheduler existence: `[founder-claim-unverified]`)
- **Service boundaries (named):**
  - `image-gen.xencolabs.com` — external Xenco image-generation service wrapping **Gemini**; the ONLY image backend the app calls. `[verified-in-repo]` (lib/services/image-generation.ts:238-258)
  - `ai.xencolabs.com` (Xenco AI Gateway / LiteLLM) — prompt enhancement + character analysis, OpenAI-compatible chat completions, model `claude-sonnet-4-20250514` by default. `[verified-in-repo]` (lib/services/prompt-enhancement.ts:25-29,132; URL path fixed 2026-06-28 to `/v1/chat/completions`)
  - Anthropic direct API — Claude Vision for portrait photo analysis (`ANTHROPIC_API_KEY`, lib/services/portrait-analysis.ts:107-110). `[verified-in-repo]`
  - Replicate — `black-forest-labs/flux-kontext-pro` for face-preserving portrait generation (~$0.04/run). `[verified-in-repo]` (lib/services/replicate-portrait.ts:73-81)
  - Prodigi v4 print API — sandbox/live switched (see §6). `[verified-in-repo]`
  - Stripe — subscriptions + one-time checkout (see §5). `[verified-in-repo]`
  - Payload CMS `cms.xencolabs.com` (site ID 7) — blog. Brevo SMTP — transactional email. Mautic — newsletter. `[verified-in-repo]` (lib/payload.ts, lib/services/email-notification.ts, lib/env.ts)
- **Env hygiene:** `lib/env.ts` enforces fail-loud `requireEnv()` for `AI_GATEWAY_URL` and `MAUTIC_API_URL` (post-2026-06-25-outage hardening). Most other reads are still direct `process.env` with `||` defaults. `[verified-in-repo]`

## 2. Prompt rewrite & generation dispatch

- **Prompt rewrite lives in** `lib/services/prompt-enhancement.ts` (class `PromptEnhancementService`). Claude via AI Gateway; system prompt explicitly optimizes output **for Gemini** (lines 309-351). If `AI_GATEWAY_API_KEY`/`DEVMAESTRO_API_KEY` absent → **fallback mode: original prompt passes through un-enhanced** (warn-only) unless `AI_ENHANCEMENT_REQUIRED=true`. `[verified-in-repo]`
- **Dispatch is SINGLE-BACKEND.** `generateImage()` (lib/services/image-generation.ts:196-373) calls exactly one endpoint: `${IMAGE_GEN_API_URL}/api/v1/generate`. There is **no dual-engine dispatch, no provider abstraction, no "user picks the winner" flow anywhere in the repo.** `[verified-in-repo]`
- **Founder claim vs code — flagged conflicts:**
  - "Generates on TWO backends so the user picks the winner" — **not implemented**. `[founder-claim-unverified]` — no second backend exists in code.
  - "Original backends were GPT-image / DALL·E 3 and Nano Banana Pro" — **zero** OpenAI/DALL·E/GPT-image references in app code (grep: none). If a GPT-image path exists it is an MCP outside this repo. `[founder-claim-unverified]`
  - **Where Gemini/Nano Banana is invoked:** never directly. Only indirectly through `image-gen.xencolabs.com`; the response's model field defaults to `"gemini-2.0-flash"` (image-generation.ts:272). This matches the founder's account that the leaked Gemini key lives in the **upstream gateway**, not in this app. `[verified-in-repo]`
  - **Kling:** zero references in the codebase. Candidate only. `[founder-claim-unverified]`
- **Batch generation is a stub:** route exists, `BatchJob` row is created with credits reserved, then `// TODO: Queue the batch job for processing` (image-generation.ts:453) and `processBatchJob()` is an empty placeholder (463-467). Jobs stay `PENDING` forever. `[verified-in-repo]`

## 3. Portrait (face-into-scene) pipeline

- **Flow (lib/services/portrait-generation.ts:250-510):** upload → Claude Vision analysis (`analyzePortraitPhoto`, subject type person/pet/couple/family/group, quality gate) → StylePack/StyleVariant prompt template → **Replicate flux-kontext-pro if `ENABLE_FACE_PRESERVATION=true` AND `REPLICATE_API_TOKEN` set, else fallback to text-to-image via `image-gen.xencolabs.com`** (lines 379-410) → watermarked 1024px preview + clean 4096px hi-res both uploaded to R2 → status `preview`. `[verified-in-repo]`
- **`ENABLE_FACE_PRESERVATION` defaults to `false`** (docker-compose.yml:31) — the face-preserving path is wired but **feature-flagged off**; production value on Vercel unknown. `[verified-in-repo]` (flag); `[founder-claim-unverified]` (prod value)
- **"Render face-swap" — DOES NOT EXIST in this repo.** No render.com, no Render API, nothing. The actual face-preservation implementation is **Replicate Kontext Pro**. The founder's "Render account, testing barely started" either refers to an external account never integrated, or misremembers Replicate. **Code wins: Replicate is the as-built path.** `[verified-in-repo]` (absence); Render account existence `[founder-claim-unverified]`
- Group-photo prompt adaptation exists (`transformPromptForGroup`, replicate-portrait.ts:302-346). `[verified-in-repo]`

## 4. The two products' data models & how they connect

**Product 1 — prompt generation (subscription):** `Image`, `PromptHistory`, `Project`, `Template`, `TemplatePreset`, `CharacterProfile`, `BatchJob`, `UsageRecord`. `[verified-in-repo]` (schema.prisma:188-460)
**Product 2 — Portrait Studio (pay-as-you-go):** `Portrait` (nullable `userId` + guest `sessionId`), `Order` (1:1 with Portrait; digital + print fields, Prodigi fields, Stripe fields), `StylePack`, `StyleVariant`. `[verified-in-repo]` (schema.prisma:509-631; migration 20260228_portrait_studio_phase1.sql)
**Shared:** `User`, `Subscription` (FREE/STARTER/PRO/TEAM; credits, feature flags, maxResolution), `Review`, `WaitlistEntry`, blog models. `[verified-in-repo]`

**Connection today:** shared `User`/auth, a 15% subscriber discount applied to portrait orders (app/api/orders/create/route.ts:31,137-139), and a two-tab gallery (`AI Images` | `My Portraits`) hitting two separate APIs (app/(dashboard)/gallery/page.tsx). **Outputs, credits, and order flows are otherwise fully parallel — the products are NOT merged.** Portraits do not consume subscription credits. `[verified-in-repo]`

## 5. Stripe — what's wired today

- **Subscriptions:** price IDs from env (`STRIPE_PRICE_STARTER|PRO|TEAM`) mapped to plans in webhook `PRICE_TO_PLAN` (app/api/webhooks/stripe/route.ts:23-27). Events handled: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded` (monthly credit reset), `invoice.payment_failed` (PAST_DUE), `checkout.session.expired` (portrait order → failed). `[verified-in-repo]`
- **Pay-per-output (Portrait Studio):** `/api/orders/create` builds Stripe Checkout with **inline `price_data`** — digital download **$14.95 hardcoded at app/api/orders/create/route.ts:30**; print prices **hardcoded in `PRINT_CATALOG`** (lib/services/print-fulfillment.ts:58-78, $29.95–$129.95). Guest checkout supported (Stripe collects email); shipping address collection for prints (9 countries). `[verified-in-repo]`
- **⚠ Rule violation (as-built):** prices are hardcoded in code and frontend display (app/portraits/[id]/print-options/page.tsx:85-87), **not read from Stripe metadata**. Plan work item.
- **Both payment points EXIST and are substantially real** — recurring subscription AND generate-free→pay-to-download→pay-to-print. Download gated by HMAC-signed token (72h expiry, 5 downloads, atomic counter — lib/services/download-token.ts, app/api/orders/download/route.ts). `[verified-in-repo]`
- **⚠ P-1 open item:** post-Vercel-migration, Stripe + Clerk webhook endpoint URLs were never audited — they may still point at the dead swarm host and silently drop events. `[external-verified]` (FINAL-CLOSEOUT-OPTION-A-20260628.md:102) — **must be verified in dashboards before any launch work.**

## 6. Prodigi — what's wired

- Full real integration, **not stubbed**: paid print order → Stripe webhook immediately calls `createProdigiOrder()` (app/api/webhooks/stripe/route.ts:358-413); failures non-blocking with manual retry via `POST /api/print/order`; Prodigi CloudEvents webhook updates stage → `shipped` + tracking email (app/api/webhooks/prodigi/route.ts). `[verified-in-repo]`
- **Sandbox/live switch:** `USE_PRODIGI_SANDBOX === "true" || NODE_ENV !== "production"` (print-fulfillment.ts:21-23). Deploy script default was `USE_PRODIGI_SANDBOX=true`. **Live mode has never been verified.** `[verified-in-repo]` (switch); live verification `[founder-claim-unverified]` — founder confirms sandbox.
- 13 SKUs across art print / framed print / canvas / framed canvas, mapped to Prodigi `GLOBAL-*` SKUs; legacy GICLÉE aliases maintained. `[verified-in-repo]`

## 7. Frontend & the show-don't-tell gap

- **`public/` contains exactly ONE file: `site.webmanifest`. There is not a single product image, hero asset, or before/after pair in the repo.** `[verified-in-repo]`
- Style pack sample/thumbnail URLs are seeded from **`picsum.photos` placeholder URLs** (prisma/seed-style-packs.ts:20-21) — so the live marketing page's "style gallery" renders random stock placeholders, and `picsum.photos` is even whitelisted in `next.config.ts` image domains. **This confirms the founder's "zero transformations shown" and is an existing violation of the no-mock rule in production.** `[verified-in-repo]`
- Marketing page (app/(marketing)/page.tsx): portrait-first hero (text + CTA), style-pack grid from DB, pricing table, reviews, newsletter. `landing-a` / `landing-b` variants exist; canonical status unknown. `[verified-in-repo]` (structure); variants' purpose `[founder-claim-unverified]`
- Dashboard: 5-step generate wizard (category→template→preset→describe→generate), two-tab gallery, history, projects, settings. Portrait Studio: 3-step guest wizard (upload→style→generate) → preview → purchase ($14.95 digital / print options) → success. `[verified-in-repo]`
- Components dir is minimal (`pricing-section.tsx`, `reviews.tsx`); page logic is inline. `[verified-in-repo]`

## 8. Consumers of shared values

| Shared value | Consumers |
|---|---|
| `DATABASE_URL` (Neon, shared w/ BlogCraft) | Prisma → every route/service |
| `IMAGE_GEN_API_URL/KEY` | image-generation.ts (both products' text-to-image), portrait fallback path |
| `AI_GATEWAY_URL/API_KEY`, `AI_MODEL` | prompt-enhancement.ts (enhancement + character analysis) |
| `ANTHROPIC_API_KEY`, `AI_VISION_MODEL` | portrait-analysis.ts (Claude Vision) |
| `REPLICATE_API_TOKEN`, `ENABLE_FACE_PRESERVATION` | replicate-portrait.ts / portrait-generation.ts |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` | orders/create, webhooks/stripe, plans.ts |
| `PRODIGI_*`, `USE_PRODIGI_SANDBOX` | print-fulfillment.ts, webhooks/prodigi, webhooks/stripe |
| R2 vars (`R2_*`) | lib/r2.ts → image + portrait uploads, downloads, cron cleanup |
| `CLERK_*` | middleware, webhooks/clerk, all auth'd pages |
| `DOWNLOAD_TOKEN_SECRET` (⚠ falls back to `STRIPE_WEBHOOK_SECRET`, then a dev constant) | download-token.ts |
| Brevo SMTP vars, `MAUTIC_*` | email-notification.ts, newsletter route |
| `CRON_SECRET` | cron/cleanup-expired |

## 9. Security notes (found during audit)

1. Local closeout MDs at repo root contain a **plaintext Vercel token, project ID, and team ID** (DOMAINS-ATTACHED-FINISH-CLOSEOUT-20260628.md). Files are untracked/gitignored, but the token should be rotated and the files scrubbed. `[verified-in-repo]`
2. `download-token.ts` secret chain ends in a hardcoded dev fallback — fail-loud hardening candidate. `[verified-in-repo]`
3. Upstream LiteLLM gateway key leak (Gemini/OpenAI/Anthropic) per founder — **not an ImageCrafter code problem** (consistent with audit: no such keys in this app), fix is upstream rotation + lockdown. `[founder-claim-unverified]` (leak + rotation status)

---

## 10. UNVERIFIED / NEEDS FOUNDER CONFIRMATION

1. **Dual-engine history:** No GPT-image/DALL·E code exists here. Was dual-engine ever built (another repo/MCP?), or is it a to-build feature? Where does the "GPT-image MCP: working" live, and should the app call it server-side as a provider?
2. **Gemini key rotation status:** has the leaked upstream key been rotated, and is `image-gen.xencolabs.com` currently functional in production? (App health depends on it for BOTH products' fallback paths.)
3. **Kling:** which Kling API/account (official REST? your MCP?), credentials location, credit balance, and image model to use.
4. **"Render" face-swap:** does a Render account/integration actually exist anywhere, or shall we treat **Replicate flux-kontext-pro (already wired, flagged off)** as THE face-swap candidate for the timebox test?
5. **`ENABLE_FACE_PRESERVATION` and `ANTHROPIC_API_KEY`** current values in Vercel production env.
6. **Prodigi live account:** live API key exists? Billing/payment method attached? Ready for a live verification order?
7. **Stripe/Clerk/Prodigi webhook URLs** in the respective dashboards — still pointing at old swarm host? (P-1 from 2026-06-28 closeout.)
8. **Cron:** is anything scheduled to hit `/api/cron/cleanup-expired` (Vercel Cron?), and is `CRON_SECRET` set?
9. **Tier model:** founder account says "Free = low-res; Pro = dual-engine choice"; code has 4 tiers (FREE/STARTER/PRO/TEAM) with credits. Which is the intended launch model? Is TEAM real (its API access flag has no API)?
10. **Canonical landing:** `(marketing)/page.tsx` vs `landing-a`/`landing-b` — which ships?
11. **Real sample assets:** do any real generated style-pack samples exist (e.g., in R2) or must all be generated fresh in execution?
12. **Digital price $14.95 / print prices:** confirm intended launch prices before we create Stripe Products/Prices as source of truth.
