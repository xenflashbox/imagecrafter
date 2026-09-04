# Infisical enumeration evidence — response to "Query the vault. Never trust a slug string."

**Date:** 2026-07-07 · **Identity:** `cluster-admin-machine` (universal auth, `~/.infisical/auth`)
**Method compliance:** enumerated first, matched by real name, scanned before reporting — exactly per the correction.

## What was run (all live queries, not brief strings)

1. **Enumeration, stored bearer token** (`~/.infisical/token`): `GET /api/v1/workspace` on
   BOTH `https://secrets.xencolabs.com` and `http://10.8.8.18:8085` → 22 projects.
2. **Fresh universal-auth login** (`cluster-admin-machine` client id/secret →
   `POST /api/v1/auth/universal-auth/login` → new access token) → re-enumerated → same 22.
3. **Direct query of the CORRECTLY-SPELLED slug** (per rule 2, matching the real app name):
   `GET /api/v3/secrets/raw?workspaceSlug=imagecrafter-production&environment={prod,production}`
   on both endpoints → `404 "Project with slug 'imagecrafter-production' not found"`.
4. **Names-only secret scan across ALL 22 projects × ALL their environments** for
   STRIPE / KLING / BREVO / HIGGSFIELD / REPLICATE / IMAGECRAFTER / CLERK.
5. Host searched for any other Infisical identity: none (only `~/.infisical/auth` + `token`;
   repo's only INFISICAL reference is the faceswap harness bootstrap using this same identity).

## The enumerated list (both auth methods, both endpoints — identical)

```
affiliate-api-listmonk-mautic-rj-e3   blogcraft-api        content-network
dm-search                             documenso            document-service
image-gen                             legalcraft-api       mcp-services
n8n-platform                          notifications        open-notebook-suite
openbrain-mcp                         payload-cms          pg-restic-backup
production-3xc-f (name: "production") resumecoach-api      seo-scorer
traefik-prod                          verdaccio-npm        xenco-financial-stack
xencolabs-api
```

**`imagecrafter-production` is NOT in the list**, and the direct correctly-spelled-slug
query 404s. This is not the misspelling error — the "ge" spelling was queried explicitly.

## Key scan results (names only)

- **KLING / HIGGSFIELD / REPLICATE / IMAGECRAFTER-anything: ZERO matches in any readable
  project/env.**
- STRIPE keys exist only in `affiliate-api-listmonk-mautic-rj-e3/prod`,
  `xenco-financial-stack/prod` (`STRIPE_SECRET_KEY_LIVE`), `xencolabs-api/prod` — other
  products' accounts; wiring ImageCrafter to them on a guess is forbidden.
- BREVO keys exist only in `affiliate-api-listmonk-mautic-rj-e3/prod` (+ Mautic SMTP pair
  in `production-3xc-f/prod`).
- `production-3xc-f/prod` (the project ImageCrafter's harness already reads ANTHROPIC from)
  holds 13 secrets — AI-provider + Mautic + PG only; no Stripe/Kling/Brevo-for-ImageCrafter.

## Report (phrased per rule 3)

Here are the 22 projects this identity can read; the ImageCrafter Stripe/Kling/Brevo keys
are in none of them, and `imagecrafter-production` is readable under neither enumeration
nor direct query. In Infisical, a 404 on a direct slug query means the project either does
not exist on this instance **or** the identity holds no membership/grant on it — the API
does not distinguish.

**Action needed (one of):**
1. Grant `cluster-admin-machine` read access to `imagecrafter-production` (it will then
   appear in enumeration and wiring proceeds immediately), OR
2. Name the identity that CAN read it and where its credential lives, OR
3. If it was created in a different Infisical org: this machine identity is org-scoped and
   cannot see across orgs — add it to that org's project.

Everything else in the correction is accepted and applied: the query-first rule is now the
recorded method; no missing-secret report will ever again cite a brief slug without the
enumerated list attached (this document is that attachment).

---

## RESOLVED (same day) — root cause: wrong identity, plus slug suffix

Founder supplied the missing facts: use the **ImageCrafter machine identity** at `.env`
lines 219–220 (`INFRISCAL_CLIENT_ID` / `INFRISCAL_CLIENT_SECRET`, founder-authorized read),
NOT `cluster-admin-machine`. Fresh universal-auth login with that identity:

```
projects readable by imagecrafter identity: 4
  image-gen                       image-gen
  imagecrafter-production-67f-a   imagecrafter-production   ← THE project
  kling-ai-mcp-xmhp               kling-ai-mcp
  production-3xc-f                production
```

**Why every earlier query failed (two stacked causes):**
1. **Identity scoping** — `cluster-admin-machine` has no grant on these projects; Infisical
   enumeration only shows memberships, and direct queries 404 without a grant.
2. **Slug suffix** — the real slug is `imagecrafter-production-67f-a`; the bare name
   `imagecrafter-production` 404s even for the right identity when used as a slug.

**Verified reads (names + last-4 only):**
- `imagecrafter-production-67f-a/prod`: **37 secrets** — STRIPE_SECRET_KEY (****9q3B),
  STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_STARTER/PRO/TEAM, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY + publishable + webhook secret, BREVO_SMTP_API_KEY, full R2 set,
  REPLICATE_API_TOKEN, DATABASE_URL, IMAGE_GEN_API_URL/KEY, VERCEL_TOKEN/PROJECT_ID, GA4,
  SMTP, PAYLOAD. `staging`/`dev` envs empty.
- `kling-ai-mcp-xmhp/prod`: **KLING_API_KEY** (the key session 4 scanned for and could not
  see — it existed all along, invisible to the wrong identity).
- `image-gen/prod`: 32 secrets (provider flags, HIGGSFIELD_*, OPENAI_API_KEY_IMAGE_GEN,
  GEMINI, R2, Redis).

**Data-quality note for wiring:** several values appear stored with a trailing `"` character
(e.g. price IDs ending `…4U9"`, tokens ending `…y7T"`) — quote-wrapped values pasted into
the vault. Strip/normalize on read, and fix in the vault during Stripe wiring.

**[C] is UNBLOCKED. Stripe/secrets wiring proceeds with this identity.**
