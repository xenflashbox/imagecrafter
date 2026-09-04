# Agent Brief: product-merge (Wave B) — AMENDED 2026-07-06

> **Amendment (A1 + corrected critical path):** there is NO `lib/services/providers/`
> layer and NO `ImageProvider` interface — dual-engine lives in the image-gen service
> and backend-provider already built the service integration, the `GenerationRequest`
> model, and the pick UI (`app/(dashboard)/generate/*` now belongs to backend-provider;
> do NOT edit it). You consume the published `GenerationRequest` data shape.
> `lib/services/replicate-portrait.ts` stays where it is — Replicate flux-kontext-pro
> is the ONE sanctioned direct provider dependency (face preservation); do not create
> a providers/ folder for it. Portrait text-to-image (non-face) paths call the
> image-gen service through `lib/services/image-generation.ts` exports — never a
> direct provider fetch.
>
> **New work item 3.4 (reassigned from stripe-payments, founder critical-path doc §9):**
> NO subscription checkout flow exists — the settings "Upgrade" buttons have no
> handler. Build the real Pro purchase path: `checkout.sessions.create` with
> `mode: "subscription"` against the confirmed Pro price ID, success/cancel URLs,
> Clerk-user ↔ Stripe-customer linkage consistent with the existing webhook handler.
> BLOCKED on founder confirmation of the Pro price under the Free/Pro collapse —
> stop that item and escalate if unconfirmed; build 3.1/3.2 regardless.

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

Phase 3 of `PLAN/01-plan.md`: one generation core, two entry modes, one gallery.
As-built: products share User/auth/15%-discount only; outputs split across `Image`
vs `Portrait`+`Order`; gallery is two tabs on two APIs
(`app/(dashboard)/gallery/page.tsx`).

## Blockers you must respect

- backend-provider's `GenerationRequest` data shape is frozen (2.1 landed 2026-07-05).
  Consume it; NEVER edit `lib/services/image-generation.ts`, `app/(dashboard)/generate/*`,
  or `prisma/schema.prisma` (schema needs go to the lead → backend-provider).
- Item 3.4 (subscription checkout) blocked on founder Pro-price confirmation.
- face-swap-test verdict required for item 3.3 copy. Build 3.1/3.2 while waiting.

## Scope / files you own (write NOTHING else)

- `lib/services/portrait-generation.ts`, `lib/services/replicate-portrait.ts`
  (stays in place — do NOT create a providers/ folder).
- `app/api/gallery/route.ts` (new unified read API).
- `app/(dashboard)/gallery/page.tsx` (single feed + filter chips; renders the
  GenerationRequest pick per backend-provider's published shape).
- Subscription checkout (3.4): the settings upgrade component(s) +
  `app/api/checkout/subscription/route.ts` (or equivalent under app/api/checkout/).
- Verdict copy strings ONLY in `app/portraits/create/page.tsx` and
  `app/portraits/page.tsx` (site-redesign owns their layout — coordinate via lead).

## Work items

1. **3.1 One core.** Portrait generation dispatches through the services layer:
   `replicate-portrait.ts` for face preservation; text-to-image via
   `lib/services/image-generation.ts` exports. Zero direct provider fetches
   outside those two service modules.
2. **3.2 Explicit mapping — no silent conflation.** Keep `Image` and `Portrait`
   tables. Build `GET /api/gallery`: discriminated union `kind: "image"|"portrait"`
   with shared fields (url, thumb, createdAt, status, favorite) + kind payloads;
   date-interleaved pagination. Replace gallery tabs with one feed + filters.
   Document the field mapping in a comment block at the top of the route.
3. **3.3 Verdict wiring.** PASS → prod copy stays "your photo transformed" and lead
   flips `ENABLE_FACE_PRESERVATION=true`. FAIL → copy switches to honest
   "inspired-by portrait" language everywhere the swap was promised.
4. **3.4 Subscription checkout (see amendment header).** Real
   `checkout.sessions.create` `mode:"subscription"` against the confirmed Pro price;
   webhook handler already maps price→plan. Blocked on founder Pro-price
   confirmation — stop + escalate if unconfirmed.

## Definition of done

- Typecheck + build green.
- Portrait E2E (upload→analyze→generate→preview) passes in a preview deploy through
  the provider layer.
- `grep -rn "fetch(" lib/services/ | grep -v providers/` shows no provider calls
  outside the providers dir (email/stripe/prodigi/r2 calls exempt).
- Unified gallery shows both kinds interleaved, filters work, image favorite toggle
  works, portrait order status renders, pagination stable across mixed kinds.
- Production copy matches the recorded verdict; no UI path promises an unproven swap.

## Smoke test (lead re-runs)

In preview deploy: create a portrait as guest AND generate a prompt-image as a test
user; `GET /api/gallery` for that user returns both records correctly discriminated;
gallery page renders both in one feed.

## Sequencing

Starts Wave B (after 2.1 freeze). 3.3 lands only after the face-swap verdict exists.
