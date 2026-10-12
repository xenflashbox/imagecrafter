# ImageCrafter — Buildy Advertising Brief

**Property:** imagecrafter.app
**Owner:** Xenophon Giannis, Xenco Labs Inc.
**Primary support:** support@imagecrafter.app · https://imagecrafter.app/contact
**Brief date:** 2026-10-12
**All pricing in this brief is read live from Stripe account `acct_1SpFrc6ONaKoegg0`** — do not hardcode in creative; if a figure disagrees with the live `/#pricing` section of the site, the site is authoritative.

---

## 1. The product in one paragraph

ImageCrafter turns a single uploaded photo into a painted portrait — a pet, a person, or a family — in one of eight art-historical styles (Baroque, Renaissance, Victorian, Regal, Fine Art, Pop Art, 70s Disco, Memorial). The customer sees a free watermarked preview, pays only if they love it, and receives a 4K digital download, a shippable print, or both. **The sell is not "AI art." The sell is "a keepsake of your pet or family that actually looks like them."** This matters especially for the memorial variant, which is a significant share of orders — the copy never gets cute about it.

---

## 2. Positioning & audience

### 2.1 Who the customer is

- **Primary (60%+):** Pet owner, dog or cat, often memorial. Age 35–65. Already follows pet accounts on social. Has photographed their pet thousands of times and wants one piece that *means* something.
- **Secondary:** Gift buyer purchasing for a parent/partner who owns a pet. Peaks around holidays and anniversaries.
- **Tertiary:** Person wanting a portrait of themselves, their partner, or their family as fine art.

### 2.2 The emotional job

For a living pet: "I love this little creature; I want it on my wall the way my grandparents had oil paintings."
For a memorial: "I don't want them forgotten, and a photo on the fridge isn't enough."
For a family: "I want the kind of portrait my great-grandparents paid a painter three months of wages for, without the three months and the wages."

### 2.3 What the customer is *not*

Not someone browsing for "AI art." Not shopping on price. Not interested in novelty filters. If the ad reads like a Shutterstock app, the wrong customer clicks and the right one doesn't.

### 2.4 Three honest angles for creative

1. **"Painted from a single photograph."** The product's core differentiation — one photo in, a painting out. Lead with before/after proof.
2. **"Your pet, painted like royalty."** Humor-adjacent, keeps dignity. Works for pet owners who find the idea of their dog as a Victorian aristocrat charming without being camp. Already live as the home-page meta description.
3. **"Remembered in the style of a master."** For the memorial lane. Reserved. No cute copy. "Make sure they are not forgotten" works; "Pet Memorial Portrait" without exclamation marks works. **Never pair a memorial creative with a lifestyle/puppy visual** — mismatch destroys trust.

---

## 3. Pricing matrix

**Read live from Stripe 2026-10-12.** Every amount is USD. Charged in Stripe account `acct_1SpFrc6ONaKoegg0`. **Do not re-use these numbers in creative without re-reading at ship time** — Stripe is the authoritative source.

### 3.1 Digital

| Offer | Price | What it is |
|---|---|---|
| **Single Portrait** (SKU `DIGITAL`) | **$19.99** | One full-resolution 4K portrait, no watermark. Delivered to email. Download up to 5 times within 72 hours. No account needed. |

### 3.2 Credit packs — digital-only, never expire, requires a free account

| Offer | Price | Per-portrait | What it is |
|---|---|---|---|
| **Digital Pack** (`PACK-5`) | **$39.95** | $7.99 | 5 portrait credits — 60% off single-portrait price. |
| **Starter Pack** (`PACK-10`) | **$74.95** | $7.49 | 10 portrait credits — 62% off. Best seller. |
| **Studio Pack** (`PACK-60`) | **$149.95** | $2.50 | 60 portrait credits — 87% off. For gift-givers and heavy users. |

Credits can be redeemed on any portrait as a full-resolution digital download. Print orders are purchased separately. **Credits never expire** — this is a locked promise.

### 3.3 Prints — fulfilled by Gelato (primary) with Prodigi as fallback

**Shipped worldwide.** Fulfilment is Gelato as of 2026-10-12 (store `ImageCrafter`, master Xenco account, USD); Prodigi remains a hot fallback. Lead time 3–7 business days depending on destination.

#### Art Prints (fine-art paper, 200gsm)

| SKU | Size | Price |
|---|---|---|
| `ART-8x10` | 8×10″ | **$49.95** |
| `ART-12x16` | 12×16″ | **$69.95** |
| `ART-16x20` | 16×20″ | **$89.95** |
| `ART-24x36` | 24×36″ | **$149.95** |

#### Framed Prints (fine-art paper + wood frame, glass front)

Frame colour option in-app: **black**. (The previous Prodigi catalog advertised five colours including gold and silver; the Gelato primary catalog currently exposes ImageCrafter's framed fine-art sizes as black aluminum only.)

| SKU | Size | Price |
|---|---|---|
| `FRAME-8x10` | 8×10″ framed | **$89.95** |
| `FRAME-12x16` | 12×16″ framed | **$109.95** |
| `FRAME-16x20` | 16×20″ framed | **$119.95** |

#### Stretched Canvas (12mm slim profile, FSC wood)

| SKU | Size | Price |
|---|---|---|
| `CANVAS-12x12` | 12×12″ canvas | **$99.95** |
| `CANVAS-16x20` | 16×20″ canvas | **$149.95** |
| `CANVAS-24x36` | 24×36″ canvas | **$199.95** |

#### Framed Canvas

| SKU | Size | Price |
|---|---|---|
| `FCANVAS-16x20` | 16×20″ framed canvas | **$199.95** |
| `FCANVAS-24x36` | 24×36″ framed canvas | **$299.95** |

### 3.4 Pricing rules for creative

- **Never quote a decimal in headline copy.** "$49" is fine. "$49.95" is for the pricing table.
- "**From $19.99**" is the correct way to lead with the digital.
- "**From $49.99**" is the correct way to lead with prints.
- Do not use "$9.99" or "$19.99" as the lead unless the actual product is the digital — no inflating the perceived discount with crossed-out numbers that were never real.
- Do not run a sale, countdown, or scarcity line without explicit sign-off from Xen. "**No fake urgency**" is a brand-level rule.

---

## 4. Brand system — colour, type, logo

Everything below is already locked in `docs/brand-system-v1.md`. If a creative needs to deviate, it stops first and asks.

### 4.1 Colours — Gallery Daylight

The storefront is a gallery you walk into in daylight. **The portrait is the only saturated thing on screen.** Everything else recedes so the artwork carries the colour.

| Role | Hex | Where it's used |
|---|---|---|
| **Canvas** (background) | `#FAF7F2` | Page ground. Warm off-white — plaster, not paper. **Never pure white.** |
| **Surface** | `#F2ECE2` | Secondary panels, cards. |
| **Surface raised** | `#FFFFFF` | Only permitted pure white — cards that need to lift. |
| **Ink** (primary text) | `#1C1714` | Warm near-black. **Never pure `#000`.** |
| **Ink muted** | `rgba(28,23,20,.68)` | Body copy. |
| **Rim** (borders) | `rgba(28,23,20,.12)` | Dividers, borders. |
| **Accent — brand** | **`#A4442A`** | **Burnt sienna.** CTAs, hover-active, logo brushstrokes, italicised accent words. This is the brand colour. |
| **Accent 2 — gilt** | **`#C1873F`** | **Picture-frame gold.** The right half of the logomark, the second stop of the wordmark gradient. Rare, used as a frame material. |
| **Accent soft** | `rgba(164,68,42,.10)` | Pill and badge backgrounds. |
| Positive | `#3F7D58` | Success states. Desaturated green. |
| Warning | `#B57614` | In-progress. Not for errors. |
| Danger | `#B3402F` | Error. Deliberately close to `#A4442A` — never place both on screen; use a dialog instead. |

**Accent discipline:** one sienna thing per viewport-height. If two things on screen are sienna, one of them is wrong. Gold is rarer — it's a frame material, not a UI colour.

### 4.2 Dark mode — Noir

Signed-in dashboard and admin surfaces use a scoped `.noir` theme (canvas `#06060A`, accent `#8B5CF6` violet). **Do not use the violet in ads** — that's the darkroom, not the brand. Marketing creative uses the Gallery Daylight palette above.

### 4.3 Typography

| Role | Family | Rules |
|---|---|---|
| **Display** | **Fraunces** (Google Fonts; variable; axes SOFT, WONK, opsz) | Set **light** (300 weight) at hero scale. Weight comes from size, not from ink. Optical sizing on. One italic word in `#A4442A` per page as a signature move. |
| **Body** | **Manrope** (Google Fonts) | Quiet geometric sans. Default. |

**Rules in ad creative:**
- Hero line: Fraunces Light, large (equivalent to `text-5xl md:text-7xl`), `leading-[1.08]`, `tracking-tight`.
- Body: Manrope regular/medium at body-size, colour `rgba(28,23,20,.68)` (ink muted).
- **Never introduce a third family.** If a mono string is needed (confirmation code, order ID), use a mono fallback.
- Italic Fraunces in `#A4442A` is the signature move. Do it at most **once per creative**.

### 4.4 Logomark & wordmark

**Logomark** at `public/icon.svg` (and `public/android-chrome-512x512.png` for raster) — an arch, read as *gallery doorway + portrait frame*. Left half bone (`#FAF7F2`), right half gilt (`#C1873F`), two sienna brushstrokes across the gold, 7px gradient stroke `#D9A45C → #A4442A`, ground `#1C1714`.

**Wordmark** "ImageCrafter" — one word, capital I, capital C, no space, no hyphen. Manrope `font-semibold tracking-tight` beside the mark.

**Hard rules:**
- Never recolour the mark.
- Never place on a busy background.
- Never separate the arch from its black ground.
- Never write "Image Crafter", "Imagecrafter", or "IC" in customer-facing copy.
- Minimum size 24px.

---

## 5. Voice & copy

### 5.1 The register

**A gallerist, not a SaaS.** Warm, plain, confident, unhurried. Short declaratives. We are selling a keepsake — often of a pet that has died — so the copy never gets cute about it.

### 5.2 Lines that already work (take, don't rewrite)

- *"Your Pet, Painted Like a Masterpiece."*
- *"Painted from a single photograph."*
- *"Your dog, painted like royalty."*
- *"Upload one photo of your dog, cat — or anyone you love."*
- *"Free preview, no account needed. Pay only if you love it."*
- *"Your photo is yours."* (used on legal + trust surfaces)

### 5.3 What we never say

- No "AI-powered", "leverage", "unlock", "revolutionary", "seamless", "game-changing".
- **No exclamation marks in product copy.**
- No fake urgency, no countdowns, no invented scarcity.
- No em-dash-heavy hype stacking. One idea per sentence.
- Never "users" or "customers" in customer-facing copy — always "you".

### 5.4 Promises that bound the copy

These are commitments the legal pages make. Marketing must not contradict them.

- **No account needed for a guest portrait.** (One per visitor per day, by email, free preview — the ad can lead with this.)
- **No AI model is trained on your photo.** Providers are contractually barred.
- **We never publish your original photograph, name, or email.**
- **Buying a portrait removes it from the public gallery.**
- **Deleting is not reversible** — save purchased downloads first.
- **Credits never expire.**

---

## 6. Assets

### 6.1 Logos & icons

| File | Where | Use |
|---|---|---|
| `https://imagecrafter.app/icon.svg` | public | Canonical vector mark. |
| `https://imagecrafter.app/android-chrome-512x512.png` | public | Raster, social, icon slots. |
| `https://imagecrafter.app/android-chrome-192x192.png` | public | PWA, small raster. |
| `https://imagecrafter.app/apple-touch-icon.png` | public | iOS home-screen. |
| `https://imagecrafter.app/favicon.svg` | public | Browser chrome. |

### 6.2 Before/afters already approved

Live on the home page gallery and OK to use in ad creative. R2 CDN URLs, high-resolution originals available on request:

- https://imagecrafter.app/#styles — four live before/after pairs across Renaissance, Starry Night, Elven, Comic-Hero
- https://imagecrafter.app/#results — reviewers / testimonials section with embedded art

**For the pets-first launch** (currently in-progress — see Open Brain `imagecrafter-gtm-pets-first.md`): the three approved pet styles are **Baroque**, **Fine Art**, and **70s Disco**. Elven and Egyptian are **not** approved for pets-first creative.

### 6.3 Social share cards

OG card per portrait is auto-generated at `https://imagecrafter.app/p/<portrait-id>/opengraph-image` — this is what social platforms scrape when a customer shares. Branded 1200×630, right-anchored portrait, top-anchored face so the crop survives.

Main share card: `https://imagecrafter.app/opengraph-image`.

### 6.4 Request additional assets

Email `support@imagecrafter.app` with "Buildy asset request" in the subject. 24-hour turnaround on single assets, 72 hours on a batch.

---

## 7. The funnel — where the ad clicks land

### 7.1 Landing-page options

| Destination | When to use |
|---|---|
| `https://imagecrafter.app/` | Default. Carries the pets-first hero, four-style gallery, pricing, trust strip, FAQ. |
| `https://imagecrafter.app/portraits/create` | Direct-to-wizard. Use when the ad already converted interest and the clicker is ready to upload. |
| `https://imagecrafter.app/memorial` | **Memorial lane only.** Different hero, reserved tone, pet-memorial-specific trust copy. Never direct a generic-pet click here; never direct a memorial click to the generic home. |
| `https://imagecrafter.app/portraits/create?pack=baroque` | Pre-select the Baroque style pack at upload time. Equivalent for `?pack=fine-art`, `?pack=disco`. Use when the creative shows one style and the destination should match. |

### 7.2 UTM convention

Standard Buildy UTM — Buildy supplies. The site reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` and persists them against the previewer and buyer records via Mautic.

### 7.3 Attribution

TikTok and Meta pixels + server-side CAPI events are live on the site (`PageView`, `InitiateCheckout`, `Purchase`). Buildy does not need to add client-side pixels — ask instead for the server-side event stream.

---

## 8. Legal boundary — things Buildy must not do

- **No claim that the portrait "looks like" a specific famous painter in a way that implies endorsement.** "In the style of" is fine. "A Van Dyck of your dog" is not — that is a false provenance claim. The brand voice allows "royal", "Baroque", "fine art" — those are periods and techniques, not people.
- **No comparison to specific competitor services by name.** "Not another AI filter" is fine as a tone; "Better than X" is not.
- **No implied celebrity/influencer endorsement** without a signed release on file at support@imagecrafter.app.
- **Prints are shipped from Gelato/Prodigi facilities globally.** Do not promise "handmade in [country]" — the product is manufactured on-demand.
- **Images used in ad creative must be from the IC gallery, the IC OG cards, or founder-supplied material.** Do not use customer portraits without the customer's written consent on file.

---

## 9. Reference index

| What | Where |
|---|---|
| Full brand system | `docs/brand-system-v1.md` (in this repo, 330 lines) |
| Live Stripe products | `acct_1SpFrc6ONaKoegg0`, read with the IC `STRIPE_SECRET_KEY` |
| Live Prodigi SKUs (fallback fulfilment) | `lib/services/print-fulfillment.ts` → `PRINT_CATALOG` |
| Gelato store | ID `f36dfb88-5f51-4856-bd8e-a2ec58a0f762` — ImageCrafter, USD |
| Logo + icon set | `public/` folder, served from `https://imagecrafter.app/` |
| Legal pages | `/terms`, `/privacy`, `/refunds`, `/contact`, `/support` |
| Legal copy source | `lib/legal.ts` |

---

## 10. Change log

| Date | Change |
|---|---|
| 2026-10-12 | Brief created. Prices read live from Stripe. Gelato store `f36dfb88…` created, replaces Prodigi as primary; Prodigi stays as fallback. Frame colours drop silver/gold with the Gelato cutover — now black/white/natural only. |
