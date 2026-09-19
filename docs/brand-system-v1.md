# ImageCrafter Brand System v1.0

**Owner:** Xenophon (Xenco Labs Inc.)
**Last updated:** 2026-09-19
**Repository location:** `docs/brand-system-v1.md`
**Status:** Foundation document. Every subsequent design and content sprint MUST cite this file.

---

## 0. The Answer You Came For — Stripe Branding Fields

Stripe's Dashboard (**Settings → Business → Branding**) asks for two colors. Paste these:

| Stripe field | Value | Token | What it is |
|---|---|---|---|
| **Brand color** | `#A4442A` | `--accent` | Burnt sienna. The color of every primary button on the site. Stripe uses it for the Checkout button and the accent bar on receipts. |
| **Accent color** | `#C1873F` | `--accent-2` | Gilt gold. The picture-frame gold in the logomark and the nav gradient. Stripe uses it for secondary highlights and icons. |

Supporting values Stripe may also ask for:

| Stripe field | Value | Notes |
|---|---|---|
| Icon (square) | `public/android-chrome-512x512.png` | 512×512, already the correct aspect. |
| Logo | `public/icon.svg` | Vector arch mark. |
| Business name on statements | `IMAGECRAFTER` | Must match what the card statement shows or chargebacks rise. |
| Support email | `support@imagecrafter.app` | Same address as `LEGAL.contactEmail`. |
| Support URL | `https://imagecrafter.app/contact` | |

**Why these two and not others.** `#A4442A` is the only saturated color in the storefront chrome — it is the CTA, the active state, and the italic word in the hero headline. `#C1873F` is its only companion: the gilt half of the logomark and the second stop of the wordmark gradient. Choosing anything else would make Stripe Checkout the one surface in the funnel that does not look like the site the customer just bought from.

> ⚠️ Do **not** use the violet `#8B5CF6` you will see in the signed-in dashboard. That is the `.noir` app theme (§1.2), not the brand. Stripe Checkout is a storefront surface.

---

## How To Use This Document

This is the **single source of truth** for every visual and verbal decision on ImageCrafter.

Three rules govern it:

1. **Sprints consume tokens. Sprints do not invent tokens.** If you need a color, you reference a token defined here. If the token you need does not exist, you stop and ask — you do not guess.
2. **This document is the spec, not the suggestion.** Implementation that contradicts this file is rejected at review regardless of how well executed it is.
3. **The code is the enforcement mechanism.** The tokens below are not aspirational — they are live CSS custom properties in `app/globals.css`, bridged into Tailwind class names in `tailwind.config.ts`. There is a standing rule in `globals.css`:

   > *"Never hardcode a hex or a `slate-*` class in a page: that is how the wizard drifted to light mode while the marketing page stayed dark."*

   That drift is the exact failure this document exists to prevent.

---

## Table of Contents

0. **Stripe Branding Fields** — the two hex values, above
1. **Design Tokens** — color, type, spacing, elevation
2. **The Two Themes** — Gallery Daylight (storefront) and Noir (app)
3. **Logomark & Wordmark**
4. **Component Conventions**
5. **Voice** — how ImageCrafter talks
6. **Known Inconsistencies** — open defects against this spec
7. **Decisions Log**

---

# 1. Design Tokens

## 1.1 The Idea

**"Gallery Daylight."** A warm plaster wall, ink-brown type, one sienna accent. The storefront is a gallery you walk into in daylight, not a dashboard. **The portraits are the only saturated things on the page** — everything else recedes so the artwork carries the color.

This is the whole design thesis. When a decision is ambiguous, ask which option lets the portrait be the brightest thing on screen.

## 1.2 Color Tokens — Gallery Daylight (`:root`)

Defined in `app/globals.css`. Consumed as Tailwind classes (`bg-canvas`, `text-ink-muted`, `border-rim`, `bg-accent`) — never as raw hex in a component.

### Ground

| Token | Tailwind | Value | Usage |
|---|---|---|---|
| `--canvas` | `bg-canvas` | `#FAF7F2` | Page background. Warm off-white — plaster, not paper. Never pure `#FFFFFF`. |
| `--surface` | `bg-surface` | `#F2ECE2` | Alternating sections, secondary buttons, inset panels. |
| `--surface-raised` | `bg-surface-raised` | `#FFFFFF` | Cards and inputs that need to lift off the canvas. The only permitted pure white. |

### Ink

Warm near-black. **Never pure `#000`.** The muted/subtle/faint steps are alpha over the same base, so they stay warm on any ground.

| Token | Tailwind | Value | Usage |
|---|---|---|---|
| `--ink` | `text-ink` | `#1C1714` | Headings, body copy. |
| `--ink-muted` | `text-ink-muted` | `rgba(28,23,20,.68)` | Sub-headings, lede paragraphs. |
| `--ink-subtle` | `text-ink-subtle` | `rgba(28,23,20,.50)` | Captions, metadata, inactive icons. |
| `--ink-faint` | `text-ink-faint` | `rgba(28,23,20,.36)` | Placeholders, disabled, legal effective-dates. |

### Frame

| Token | Tailwind | Value | Usage |
|---|---|---|---|
| `--rim` | `border-rim` | `rgba(28,23,20,.12)` | Default borders and dividers. |
| `--rim-strong` | `border-rim-strong` | `rgba(28,23,20,.22)` | Emphasised borders; also the CTA shadow color. |

### Accent

| Token | Tailwind | Value | Usage |
|---|---|---|---|
| `--accent` | `bg-accent` / `text-accent` | **`#A4442A`** | **The brand color.** Primary CTAs, active states, the italic word in the hero, links in prose. |
| `--accent-2` | `text-accent-2` | **`#C1873F`** | **The accent color.** Gilt gold. Wordmark gradient partner, logomark frame, rare secondary emphasis. |
| `--accent-soft` | `bg-accent-soft` | `rgba(164,68,42,.10)` | Badge and pill backgrounds. |
| `--accent-rim` | `border-accent-rim` | `rgba(164,68,42,.38)` | Borders on accent-tinted elements. |

**Accent discipline:** one accent per viewport-height of page. If two things on screen are sienna, one of them is wrong. Gold (`--accent-2`) is rarer still — it is a frame material, not a UI color.

### Signal

Signal colors are for state, never for decoration. They are desaturated to sit inside the gallery palette rather than shouting over it.

| Token | Tailwind | Value | Usage |
|---|---|---|---|
| `--positive` | `text-positive` | `#3F7D58` | Success, completed, in-stock. |
| `--warning` | `text-warning` | `#B57614` | In-progress, attention. **Not** for errors. |
| `--danger` | `text-danger` | `#B3402F` | Errors, failures, destructive confirmation. |

> `--danger` (`#B3402F`) and `--accent` (`#A4442A`) are deliberately close. Never put a danger state directly beside a primary CTA — use a dialog instead.

### Elevation

Themed, so `.noir` can override them wholesale.

| Token | Value | Usage |
|---|---|---|
| `--veil` | `rgba(250,247,242,.85)` | Sticky-header backdrop, behind `backdrop-blur`. |
| `--frame-shadow` | `0 2px 4px rgba(28,23,20,.08), 0 18px 44px -20px rgba(28,23,20,.45)` | **Artwork only.** The shadow a framed print throws on a wall. Do not use on cards. |
| `--frame-sheen` | `rgba(255,255,255,.28)` | Glass highlight on framed artwork. |

### Rhythm

| Token | Value | Usage |
|---|---|---|
| `--step` | `0.25rem` (4px) | The only spacing scale. All padding/margin/gap is a Tailwind multiple of 4px. Never `13px`. |

## 1.3 Typography

Two families, loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables.

| Role | Family | Variable | Tailwind | Why |
|---|---|---|---|---|
| **Display** | **Fraunces** (variable; axes `SOFT`, `WONK`, `opsz`) | `--font-fraunces` | `font-display` | An editorial serif with optical sizing. This product sells museum prints — headings must read *gallery*, not *dashboard*. |
| **Body** | **Manrope** | `--font-manrope` | `font-sans` (default) | A quiet geometric sans that stays out of the way of the artwork. |

**Rules:**

- Display type is set **light** (`font-light`, 300) at large sizes, never bold. Weight is achieved by size and space, not by ink.
- Hero scale: `text-5xl md:text-7xl`, `leading-[1.08]`, `tracking-tight`. Section headings: `text-3xl font-light`.
- Body copy is `text-ink-muted`, not `text-ink` — full-strength ink is reserved for headings so the page has a value hierarchy.
- **Italic Fraunces in `--accent` is the signature move** (the hero's *"Like a Masterpiece"*). Use it at most once per page.
- `font-display` also sets `font-optical-sizing: auto` — do not override it.
- Never introduce a third family. Monospace is permitted only for machine strings (confirmation codes, IDs) via `font-mono`.

---

# 2. The Two Themes

ImageCrafter runs two grounds from one token set. Every token above is redefined by the `.noir` class; nothing else changes.

| | **Gallery Daylight** (`:root`) | **Noir** (`.noir`) |
|---|---|---|
| Where | Marketing, portraits wizard, blog, legal, checkout | Signed-in dashboard, admin |
| Canvas | `#FAF7F2` | `#06060A` |
| Surface / raised | `#F2ECE2` / `#FFFFFF` | `#0C0C12` / `#12121A` |
| Ink | `#1C1714` | `#FFFFFF` |
| Accent | `#A4442A` | `#8B5CF6` |
| Accent 2 | `#C1873F` | `#D946EF` |
| Positive / warning / danger | `#3F7D58` / `#B57614` / `#B3402F` | `#34D399` / `#FBBF24` / `#F87171` |

**Why two.** The storefront is a gallery; the app is a darkroom. Scoping Noir to a class rather than converting those pages keeps ~300 literal `text-white` classes in the dashboard working.

**The rule this buys you:** because both themes are the *same tokens*, a component written against tokens works on both grounds with no `dark:` variants. A component written against hex works on neither.

> **Open defect.** Noir's accents (violet `#8B5CF6`, fuchsia `#D946EF`) are inherited from a pre-rebrand "Gallery Noir" palette and are **off-brand**. See §6.

---

# 3. Logomark & Wordmark

## 3.1 The Mark

`public/icon.svg` — 512×512, `rx=114`.

An **arch** — a gallery doorway and a portrait frame at once — clipped over two vertical halves: bone (`#FAF7F2`) on the left, gilt (`#C1873F`) on the right, with two sienna (`#A4442A` / `#7E3420`) brushstroke sweeps across the gold. The arch is outlined in a 7px gradient stroke running `#D9A45C → #A4442A` top to bottom. Ground is `#1C1714`.

Read: *a photograph on the left, a painting on the right, inside a frame.* That is the product.

**Rules:** never recolor the mark, never place it on a busy background, never separate the arch from its ground, minimum size 24px.

| File | Use |
|---|---|
| `public/icon.svg` | Canonical vector. Stripe logo field, anywhere scalable. |
| `public/android-chrome-512x512.png` | Stripe icon field, PWA, social. |
| `public/android-chrome-192x192.png` | PWA. |
| `public/apple-touch-icon.png` | iOS home screen. |
| `public/favicon.svg`, `favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico` | Browser chrome. |

## 3.2 The Wordmark

`components/site-chrome.tsx` → `<Wordmark />`. "ImageCrafter" — one word, capital I, capital C, no space, no hyphen — set in Manrope `font-semibold tracking-tight` beside the mark.

**Never** write "Image Crafter", "Imagecrafter", or "IC" in customer-facing copy.

> **Open defect.** `Wordmark()` currently renders a generic lucide `Sparkles` glyph in an `bg-accent` square instead of the arch mark. See §6.

---

# 4. Component Conventions

## 4.1 Buttons

| Variant | Recipe |
|---|---|
| **Primary** | `rounded-2xl bg-accent text-canvas px-8 py-4 font-semibold shadow-lg shadow-rim-strong hover:opacity-90 transition-all` |
| **Secondary** | `rounded-2xl bg-surface border border-rim px-8 py-4 hover:bg-surface transition-all` |
| **Compact** (forms) | `rounded-lg bg-accent text-canvas px-6 py-3 font-medium hover:opacity-90 disabled:opacity-50` |

Hover is **`opacity-90`, never a second hex.** That is how one accent token survives every state.

## 4.2 Inputs

`rounded-lg border border-rim bg-surface-raised px-4 py-3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none`

Focus is signalled by the border becoming accent — never by a browser outline, never by a ring color that is not a token.

## 4.3 Badges / Pills

`inline-flex items-center gap-2 rounded-full bg-accent-soft border border-accent-rim text-accent px-4 py-1.5 text-sm`

## 4.4 Cards

`rounded-2xl border border-rim bg-surface p-6`. Raised variant swaps to `bg-surface-raised`. **Cards do not get `--frame-shadow`** — that shadow belongs to artwork only.

## 4.5 Artwork

Portraits are 3:4. Never crop a portrait to 16:9 (a shipped-and-fixed defect). Framed presentation uses `--frame-shadow` and `--frame-sheen`.

## 4.6 Prose

`.legal-prose` for legal and policy pages; `.article-body` for blog, which bridges the `@xenco/editorial-blocks` package tokens onto ours so callouts and comparison tables inherit our palette instead of another property's navy.

## 4.7 Radii

`rounded-lg` (8px) for inputs and small controls, `rounded-2xl` (16px) for cards and primary CTAs, `rounded-full` for pills and avatars, `rounded-sm` for the logomark tile. Nothing else.

---

# 5. Voice

**Tone: a gallerist, not a SaaS.** Warm, plain, confident, unhurried. Short declaratives. We are selling a keepsake — often of a pet that has died — so the copy never gets cute about it.

## What we say

- *"Your Pet, Painted Like a Masterpiece."*
- *"Upload one photo of your dog, cat — or anyone you love."*
- *"Your photo is yours."*
- *"Write to support@imagecrafter.app and a person will answer."*
- *"It is written to be read, not to be survived."* (privacy policy, on itself)

## What we don't say

- No "AI-powered", "leverage", "unlock", "revolutionary", "seamless", "game-changing".
- No exclamation marks in product copy.
- No fake urgency, no countdowns, no invented scarcity.
- No em-dash-heavy hype stacking. One idea per sentence.
- Never "users" or "customers" in customer-facing copy — "you".

## Specific commitments in the copy

These are promises the legal pages make. Marketing must not contradict them:

- **No account needed for a guest portrait.**
- **We do not train AI models on your photo**, and providers are contractually barred from it.
- **We never publish your original photograph, name, or email.**
- **Buying a portrait removes it from the public gallery.**
- **Deleting is not reversible** — save purchased downloads first.

---

# 6. Known Inconsistencies

Open defects against this spec, recorded so they are fixed rather than copied.

| # | Defect | Location | Impact |
|---|---|---|---|
| 1 | Noir theme accents are violet `#8B5CF6` / fuchsia `#D946EF` — a pre-rebrand palette, off-brand | `app/globals.css` `.noir` | Signed-in app does not look like the storefront the customer bought from. Needs a dark-ground sienna/gold pair. |
| 2 | `Wordmark()` renders a lucide `Sparkles` glyph, not the arch logomark | `components/site-chrome.tsx:22` | The brand mark is absent from every page header. |
| 3 | Manifest `theme_color`/`background_color` is `#1C1714`; `viewport.themeColor` is `#FAF7F2` | `public/site.webmanifest` vs `app/layout.tsx:125` | Mobile browser chrome disagrees with the installed PWA. Pick `#FAF7F2` (storefront ground). |

---

# 7. Decisions Log

## Locked

| Decision | Rationale |
|---|---|
| Brand color `#A4442A`, accent `#C1873F` | Already the live CTA and frame colors; changing them would break every shipped surface. |
| Two themes, one token set, `.noir` scoped by class | Avoids rewriting ~300 dashboard classes; the storefront/darkroom contrast is deliberate. |
| Fraunces display + Manrope body | Sells prints, not software. |
| 4px spacing base, no other scale | |
| Tokens only — no hex, no `slate-*`, in any page | The wizard/marketing drift proved the alternative fails. |
| "ImageCrafter" — one word, capital I and C | |
| Portraits are 3:4 | |

## Pending founder confirmation

| Question |
|---|
| Replace Noir's violet/fuchsia with a dark-ground sienna/gold pair? (§6 #1) |
| Ship the arch mark into the header wordmark? (§6 #2) |
| Manifest `theme_color` → `#FAF7F2`? (§6 #3) |

---

# Appendix A — Where the tokens actually live

| Concern | File |
|---|---|
| Token definitions, both themes | `app/globals.css` |
| Tailwind class bridge | `tailwind.config.ts` |
| Font loading | `app/layout.tsx` |
| Header/footer/wordmark | `components/site-chrome.tsx` |
| Legal constants (operator, email, address, effective date) | `lib/legal.ts` |
| Logomark and icon set | `public/` |
