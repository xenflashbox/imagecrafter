# 4.1 Prep — Hardcoded Price Inventory + Proposed Stripe Object Spec (2026-07-05)

Stream: stripe-payments · Wave A. **No Stripe objects created; no code changed.** All amounts
below marked FOUNDER-TO-CONFIRM are prefilled from current hardcoded values (founder answer #12
pending). Stripe account listing (products/prices/webhooks) was **blocked — the live secret key
is expired** (see `webhook-audit.md` finding #1); re-run the appendix commands once replaced.

---

## A. Complete hardcoded-price inventory (40 literals, 10 files)

### Charge-affecting (what the customer actually pays)

| File:Line | Value | Represents |
|-----------|-------|------------|
| `app/api/orders/create/route.ts:30` | `1495` | Digital download — $14.95 (charged via inline `price_data`) |
| `app/api/orders/create/route.ts:31` | `0.15` | 15% subscriber discount (applied by mutating `unit_amount`, not a Stripe coupon) |
| `app/api/orders/create/route.ts:136` | `2995` | Fallback print price if SKU unresolved (should be impossible; must die in 4.1) |
| `lib/services/print-fulfillment.ts:60` | `2995` | ART-8x10 (GLOBAL-FAP-8X10) $29.95 |
| `lib/services/print-fulfillment.ts:61` | `4995` | ART-12x16 (GLOBAL-FAP-12X16) $49.95 |
| `lib/services/print-fulfillment.ts:62` | `4995` | ART-16x20 (GLOBAL-FAP-16X20) $49.95 |
| `lib/services/print-fulfillment.ts:63` | `6995` | ART-24x36 (GLOBAL-FAP-24X36) $69.95 |
| `lib/services/print-fulfillment.ts:66` | `4995` | FRAME-8x10 (GLOBAL-CFPM-8X10) $49.95 |
| `lib/services/print-fulfillment.ts:67` | `6995` | FRAME-12x16 (GLOBAL-CFPM-12X16) $69.95 |
| `lib/services/print-fulfillment.ts:68` | `8995` | FRAME-16x20 (GLOBAL-CFPM-16X20) $89.95 |
| `lib/services/print-fulfillment.ts:71` | `5995` | CANVAS-12x12 (GLOBAL-CAN-12X12) $59.95 |
| `lib/services/print-fulfillment.ts:72` | `6995` | CANVAS-16x20 (GLOBAL-CAN-16X20) $69.95 |
| `lib/services/print-fulfillment.ts:73` | `9995` | CANVAS-24x36 (GLOBAL-CAN-24X36) $99.95 |
| `lib/services/print-fulfillment.ts:76` | `9995` | FCANVAS-16x20 (GLOBAL-CFC-16X20) $99.95 |
| `lib/services/print-fulfillment.ts:77` | `12995` | FCANVAS-24x36 (GLOBAL-CFC-24X36) $129.95 |

### Display-only (UI literals; must be replaced by `GET /api/pricing` in 4.1)

| File:Line | Value | Represents |
|-----------|-------|------------|
| `app/portraits/[id]/preview/page.tsx:24` | `29.95` | 8×10 print display (legacy GICLÉE_8x10 → charges $29.95 ✓ matches) |
| `app/portraits/[id]/preview/page.tsx:25` | `49.95` | 12×16 print display (✓ matches charge) |
| `app/portraits/[id]/preview/page.tsx:26` | `79.95` | **16×20 display — MISMATCH: checkout charges $49.95 (ART-16x20)** |
| `app/portraits/[id]/preview/page.tsx:27` | `129.95` | **24×36 display — MISMATCH: checkout charges $69.95 (ART-24x36)** |
| `app/portraits/[id]/preview/page.tsx:193` | `$14.95` | Digital price display |
| `app/portraits/page.tsx:61` | `$14.95` | "From $14.95" hero copy |
| `app/portraits/page.tsx:171` | `$14.95` | Digital price card |
| `app/portraits/page.tsx:187` | `$29.95` | "from $29.95" print card |
| `app/portraits/create/page.tsx:388` | `$14.95` | "Purchase Digital — $14.95" CTA |
| `app/portraits/[id]/print-options/page.tsx:86,188` | `priceUsd/100` | Renders from PRINT_CATALOG (dynamic w.r.t. catalog, still hardcode-derived) |
| `lib/plans.ts:57,72,88,104` | `0/9/19/49` | Subscription plan prices (numeric) |
| `lib/plans.ts:191,212,234,254` | `$0/$9/$19/$49` | Subscription display strings |
| `components/pricing-section.tsx:21,43,66,88` | `$0/$9/$19/$49` | Marketing pricing cards |
| `app/(marketing)/landing-a/page.tsx:355` | `$9/mo` | "From $9/mo" badge |
| `app/(marketing)/landing-b/page.tsx:413,417` | `$0`,`$9` | Pricing blurbs |
| `app/(dashboard)/projects/page.tsx:202` | `$19/mo` | "Upgrade to Pro — $19/mo" CTA |

### 🚨 Display-vs-charge mismatches (live customer-facing bugs, fix rides 4.1)

- **16×20 print:** preview page shows **$79.95**; `GICLÉE_16x20 → ART-16x20` charges **$49.95**.
- **24×36 print:** preview page shows **$129.95**; `GICLÉE_24x36 → ART-24x36` charges **$69.95**.
- (Under-charging, not over-charging — customers pay less than shown. Still a pricing-truth bug.)

### Related structural findings (context for 4.1, not priced literals)

- Checkout uses inline `price_data` (`orders/create/route.ts:181-189`) — the exact anti-pattern
  4.1 removes.
- The 15% subscriber discount is arithmetic on `unit_amount`, invisible to Stripe reporting —
  becomes a Coupon/Promotion in 4.1.
- **No subscription checkout flow exists in the app at all.** No route calls
  `checkout.sessions.create` with `mode:"subscription"`; the settings-page "Upgrade" buttons
  (`app/(dashboard)/settings/page.tsx:243-254`) have **no onClick**. `STRIPE_PRICE_*` env IDs are
  consumed only by the webhook (`PRICE_TO_PLAN`) and `lib/plans.ts`. Subscriptions can only have
  originated from Stripe-hosted payment links or the dead swarm app. Out of my file scope — flag
  to lead/product-merge.
- `.env`/webhook/`plans.ts` still model 4 tiers (FREE/STARTER/PRO/TEAM); Amendment A3 collapses
  to Free/Pro. Price spec below reflects that.

## B. Existing Stripe objects — ❌ UNVERIFIABLE (expired key)

- `GET /v1/products`, `/v1/prices`, `/v1/webhook_endpoints` all return
  `Expired API Key provided: sk_live_…Ksj4` (local and Vercel prod keys are identical).
- Only live mode exists (no `sk_test` anywhere), so there is no second mode to audit.
- Referenced subscription price IDs that MUST be confirmed to exist post-key-fix
  (same-batch prefix `price_1SpSR96ONaKoegg0…`):
  - `STRIPE_PRICE_STARTER` = `price_1SpSR96ONaKoegg0N1DNHu61` (app assumes $9/mo)
  - `STRIPE_PRICE_PRO` = `price_1SpSR96ONaKoegg07sbXX4U9` (app assumes $19/mo)
  - `STRIPE_PRICE_TEAM` = `price_1SpSR96ONaKoegg0bBUrwdLY` (app assumes $49/mo)
- ⚠️ If "Expired API Key" reflects a account-level key roll, existing subscriptions/prices should
  still be intact — but verify amounts against `lib/plans.ts` before 4.1 code lands.

## C. Proposed Stripe object spec (create AFTER founder confirms amounts — answer #12)

Conventions: one Product per SKU; one live Price each (`currency: usd`); `lookup_key` is the
stable code reference; metadata carries the fulfillment mapping. All amounts
**FOUNDER-TO-CONFIRM** (prefilled from current code).

### One-time products

| Product name | lookup_key | unit_amount | metadata |
|---|---|---|---|
| Portrait Digital Download | `digital_download` | **1495** FTC | `sku=DIGITAL, format=digital` |
| 8×10" Art Print | `print_art_8x10` | **2995** FTC | `sku=ART-8x10, format=art_print, prodigiSku=GLOBAL-FAP-8X10` |
| 12×16" Art Print | `print_art_12x16` | **4995** FTC | `sku=ART-12x16, format=art_print, prodigiSku=GLOBAL-FAP-12X16` |
| 16×20" Art Print | `print_art_16x20` | **4995** FTC ⚠️ UI showed 7995 — founder must pick | `sku=ART-16x20, format=art_print, prodigiSku=GLOBAL-FAP-16X20` |
| 24×36" Art Print | `print_art_24x36` | **6995** FTC ⚠️ UI showed 12995 — founder must pick | `sku=ART-24x36, format=art_print, prodigiSku=GLOBAL-FAP-24X36` |
| 8×10" Framed Print | `print_frame_8x10` | **4995** FTC | `sku=FRAME-8x10, format=framed_print, prodigiSku=GLOBAL-CFPM-8X10` |
| 12×16" Framed Print | `print_frame_12x16` | **6995** FTC | `sku=FRAME-12x16, format=framed_print, prodigiSku=GLOBAL-CFPM-12X16` |
| 16×20" Framed Print | `print_frame_16x20` | **8995** FTC | `sku=FRAME-16x20, format=framed_print, prodigiSku=GLOBAL-CFPM-16X20` |
| 12×12" Canvas | `print_canvas_12x12` | **5995** FTC | `sku=CANVAS-12x12, format=canvas, prodigiSku=GLOBAL-CAN-12X12` |
| 16×20" Canvas | `print_canvas_16x20` | **6995** FTC | `sku=CANVAS-16x20, format=canvas, prodigiSku=GLOBAL-CAN-16X20` |
| 24×36" Canvas | `print_canvas_24x36` | **9995** FTC | `sku=CANVAS-24x36, format=canvas, prodigiSku=GLOBAL-CAN-24X36` |
| 16×20" Framed Canvas | `print_fcanvas_16x20` | **9995** FTC | `sku=FCANVAS-16x20, format=framed_canvas, prodigiSku=GLOBAL-CFC-16X20` |
| 24×36" Framed Canvas | `print_fcanvas_24x36` | **12995** FTC | `sku=FCANVAS-24x36, format=framed_canvas, prodigiSku=GLOBAL-CFC-24X36` |

Frame-color / canvas-wrap variants do NOT change price in the current catalog → keep them as
order metadata (as today), not separate Prices.

### Subscriber discount

- Coupon: id `SUBSCRIBER15`, `percent_off: 15` **FTC**, `duration: forever` (applies per one-time
  Checkout Session via `discounts:[{coupon}]` — server-applied only when `isSubscriber`, never a
  customer-entered promo code, preserving current behavior).

### Subscriptions (Amendment A3: Free/Pro only)

- Keep/confirm existing `STRIPE_PRICE_PRO` (`price_1SpSR96ONaKoegg07sbXX4U9`, assumed **$19/mo**
  FTC). STARTER/TEAM prices: **archive** (do not delete — existing subscribers billed on them
  until migrated per A3 grandfathering decision). No new subscription objects needed unless the
  founder changes the Pro amount.

### Founder decision points blocking creation

1. **All amounts above** (answer #12) — especially 16×20 / 24×36 art prints where display and
   charge disagree today ($79.95-shown vs $49.95-charged; $129.95 vs $69.95).
2. **Pro subscription price** under the Free/Pro collapse ($19 status quo?).
3. **15% subscriber discount** — confirm percent and that it applies to prints as well as digital
   (current code applies it to both).
4. Prerequisite: **replace the expired live Stripe key** (webhook-audit action #1) — nothing can
   be created or verified until then.

## Appendix — re-run once the key is fixed (read-only)

```bash
KEY=sk_live_<new>   # never commit
curl -s https://api.stripe.com/v1/webhook_endpoints -u "$KEY:"
curl -s "https://api.stripe.com/v1/products?limit=100" -u "$KEY:"
curl -s "https://api.stripe.com/v1/prices?limit=100&expand[]=data.product" -u "$KEY:"
for P in price_1SpSR96ONaKoegg0N1DNHu61 price_1SpSR96ONaKoegg07sbXX4U9 price_1SpSR96ONaKoegg0bBUrwdLY; do
  curl -s "https://api.stripe.com/v1/prices/$P" -u "$KEY:"; done
```
