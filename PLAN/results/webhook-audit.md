# P0.4 Webhook Audit — Results (2026-07-05)

Stream: stripe-payments · Wave A · Priority P-1
Method: repo read + read-only API calls (Stripe, Clerk, Prodigi, Vercel). No test events fired
(see "Test events" below for why). No code modified. No secrets printed (last-4 only).

---

## Headline findings (worse than the webhook question we were asked)

| # | Severity | Finding |
|---|----------|---------|
| 1 | **P-0** | **The live Stripe secret key is EXPIRED — in local `.env` AND in Vercel production (verified byte-identical, `sk_live_…Ksj4`, last updated 2026-03-18).** Every Stripe API call from prod fails: `orders/create` cannot create checkout sessions, the webhook handler cannot `subscriptions.retrieve`. **Stripe payments are fully down in production right now.** This also blocked parts of this audit (cannot list webhook endpoints/products/prices). |
| 2 | **P-0 (latent)** | **Prodigi sandbox credentials are broken:** `PRODIGI_SANDBOX_API_KEY` is a byte-identical copy of the live `PRODIGI_API_KEY` (last-4 `3363`). Verified: that key → sandbox API **401**, live API **200**. Prod has `USE_PRODIGI_SANDBOX=true`, so any paid print order today calls the sandbox URL with a live key → 401 → fulfillment throws → order sits "paid" and unfulfilled (webhook logs the error and moves on). |
| 3 | P-1 | **The exposed Vercel token (P0.3) is still valid** — this audit used it read-only. Rotation has not happened. |
| 4 | P-1 | Cannot confirm any Stripe webhook endpoint exists/points at imagecrafter.app until finding #1 is fixed (API listing requires a working key). |

## Per-provider status

### Stripe — ❌ BLOCKED / needs founder (dashboard + key)

- **Handler route:** `app/api/webhooks/stripe/route.ts` — verifies `stripe-signature` against
  `STRIPE_WEBHOOK_SECRET` (`whsec_qO…8Sit` locally; name present in Vercel prod). Handles
  `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
  `invoice.payment_succeeded/failed`, `checkout.session.expired`.
- **Key mode:** live-mode only (`sk_live_…Ksj4`, `pk_live_…hq1q`). **No test-mode key anywhere**,
  so only one mode to audit — and it's expired.
- **API audit:** `GET /v1/webhook_endpoints` → `Expired API Key provided: sk_live_…Ksj4`.
  Same result with the key decrypted from Vercel prod (identical value). **Endpoint list
  unverifiable until the key is replaced.**
- **Prod route liveness:** `POST https://imagecrafter.app/api/webhooks/stripe` (unsigned) → **400**
  (missing signature) — route deployed and rejecting correctly.
- **Env alignment:** `STRIPE_WEBHOOK_URL=https://imagecrafter.app/api/webhooks/stripe` in both
  local and Vercel prod (informational var; the authoritative URL lives in the Stripe dashboard).
- Verdict: **needs-dashboard + needs-new-key.** Because the key was rolled/expired, the webhook
  endpoint + signing secret must be re-checked in the dashboard at the same time — a rolled
  account often means other config churn.

### Clerk — ⚠️ PARTIALLY VERIFIED / needs dashboard

- **Handler route:** `app/api/webhooks/clerk/route.ts` — Svix verification against
  `CLERK_WEBHOOK_SECRET` (`whsec_wY…20PQ`; svix-format secret; name present in Vercel prod).
  Handles `user.created/updated/deleted`.
- **Key:** `CLERK_SECRET_KEY` is live-mode and **VALID** — `GET https://api.clerk.com/v1/instance`
  → 200, `environment_type: production` (instance `ins_36nejdXwRVIZDA4IXdaa2wWW9KH`).
- **Endpoint listing:** Clerk's backend API does **not** expose webhook-endpoint listing
  (`/v1/webhooks` → 404; Clerk webhooks are managed in the Svix app via the Clerk dashboard).
  **Dashboard verification required.**
- **Prod route liveness:** unsigned POST → **400** (missing svix headers) — deployed, rejecting correctly.
- Verdict: **needs-dashboard** (URL must be `https://imagecrafter.app/api/webhooks/clerk` and the
  endpoint's signing secret must equal the `CLERK_WEBHOOK_SECRET` in Vercel prod).
  Functional smoke: if new sign-ups since 2026-06-28 have User rows in Neon, the Clerk webhook is
  de-facto working (worth checking; not run here to avoid DB assumptions).

### Prodigi — ✅ CODE-VERIFIED CORRECT URL / ❌ key config broken

- **Handler route:** `app/api/webhooks/prodigi/route.ts` — verifies `?secret=` query param against
  `PRODIGI_WEBHOOK_SECRET` (64-char hex, `…f9c5`; name present in Vercel prod).
  ⚠️ Note (no fix this wave): `verifyProdigiWebhook()` returns **true when no secret is
  configured** — fail-open. Secret IS set in both envs, so not exploitable today, but worth
  hardening in 4.2.
- **Callback URL:** set per-order in the API payload — `lib/services/print-fulfillment.ts:262-264`
  builds `${NEXT_PUBLIC_APP_URL}/api/webhooks/prodigi?secret=…`. Verified
  `NEXT_PUBLIC_APP_URL=https://imagecrafter.app` in Vercel prod → **callbacks will point at the
  correct host.** No dead-swarm URL possible; no dashboard-level webhook to repoint.
- **BUT:** with `USE_PRODIGI_SANDBOX=true` in prod + sandbox key = live key (401 on sandbox),
  no order ever reaches Prodigi, so no callback ever fires. See headline finding #2.
- **Prod route liveness:** POST without secret → **401** — deployed, rejecting correctly.
- Verdict: **verified-correct URL (from code + prod env), fulfillment path broken by key config.**

## Signing-secret env names — presence matrix

| Var | Local `.env` | Vercel prod (name) |
|-----|--------------|--------------------|
| `STRIPE_WEBHOOK_SECRET` | ✅ | ✅ |
| `CLERK_WEBHOOK_SECRET` | ✅ | ✅ |
| `PRODIGI_WEBHOOK_SECRET` | ✅ | ✅ |
| `STRIPE_SECRET_KEY` | ✅ (EXPIRED) | ✅ (same EXPIRED value — decrypt-compared) |
| `CLERK_SECRET_KEY` | ✅ (valid) | ✅ (name) |
| `PRODIGI_API_KEY` | ✅ (valid, live) | ✅ (name) |
| `PRODIGI_SANDBOX_API_KEY` | ✅ (**= live key; 401 on sandbox**) | ✅ (name) |

Vercel prod also carries `CRON_SECRET`, `DOWNLOAD_TOKEN_SECRET`, R2/GA4/Mautic vars not in local
`.env` (drift is one-directional; local is the staler file except where noted).

## Test events (item 1f)

**Nothing was fired.** Justification per rule "accuracy over motion":
- Stripe: no test-mode key exists anywhere; the live key is expired; no test-mode endpoint exists
  (unverifiable anyway). There is nothing to safely fire.
- Clerk: "send example" is dashboard-only.
- Prodigi: a sandbox order can't be placed (sandbox key 401s).

**For the founder/lead after the Stripe key is fixed:**
```bash
# test-mode (requires creating a test-mode key + test endpoint in dashboard):
stripe listen --forward-to https://imagecrafter.app/api/webhooks/stripe   # or preview URL
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
# live-mode endpoint: Dashboard → Developers → Webhooks → <endpoint> → "Send test event"
```
Then confirm 200s in Vercel → Project → Logs (filter `/api/webhooks/stripe`).

## Exact founder action list (ordered)

1. **Stripe (P-0, prod payments down):** Dashboard → Developers → API keys — the deployed
   `sk_live_…Ksj4` is expired (was rolled ~?). Obtain the current live secret key (or roll fresh),
   set in **Vercel prod** `STRIPE_SECRET_KEY` and local `.env`, redeploy.
2. **Stripe webhooks:** Dashboard → Developers → Webhooks — ensure exactly one live endpoint:
   `https://imagecrafter.app/api/webhooks/stripe` with events
   `checkout.session.completed, checkout.session.expired, customer.subscription.created,
   customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded,
   invoice.payment_failed`; delete any endpoint pointing at the old swarm host; copy its
   `whsec_…` into Vercel `STRIPE_WEBHOOK_SECRET` (current local one ends `8Sit` — confirm match).
3. **Clerk:** Dashboard → Webhooks — endpoint must be
   `https://imagecrafter.app/api/webhooks/clerk`, events `user.created, user.updated,
   user.deleted`; signing secret must equal Vercel `CLERK_WEBHOOK_SECRET` (ends `20PQ`).
   Use "Send example" → verify 200 in Vercel logs.
4. **Prodigi:** get a real **sandbox** API key from the sandbox dashboard and set
   `PRODIGI_SANDBOX_API_KEY` (currently a copy of the live key — sandbox calls 401). Decision
   needed: keep `USE_PRODIGI_SANDBOX=true` until 4.2 live verification, knowing **any print sale
   today cannot fulfill** — or gate print UI now (4.2 plan already requires this).
5. **Rotate the Vercel token** (P0.3) — it is still valid; this audit proved it.
6. After #1: re-run the Stripe endpoint listing (command in `stripe-price-spec.md` appendix) to
   close the loop on what endpoints actually exist — this audit could not see them.
