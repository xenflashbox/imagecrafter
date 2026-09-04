# Phase 2 Report — Real Before/After Gallery + Placeholder Elimination

Date: 2026-07-11 · Branch: vercel-prep · Executor: /pm session

Verdict: **DONE** (pending live-URL spot check recorded at bottom).
Every gallery/hero image is a real production-pipeline output in a shipping
style; comic-hero IP-verified; groups absent; images CDN-served; zero
`picsum.photos` in DB, seeds, config, and app code.

---

## 1. Real gallery generation (production two-step pipeline)

Runner: `scripts/gallery/generate-pair.ts` — uses the exact production
functions (`analyzePortraitPhoto` → `buildStandInDescriptor` +
`buildStandInScenePrompt` → `generateStandInScene` on live
image-gen.xencolabs.com → `swapFaceIntoScene` Replicate Kontext). Refuses
non-shipping slugs. Source photo: founder test set `adult-face.png`
(rights-cleared, gitignored — never committed).

Accepted outputs (all lead-verified visually: style present + identity
recognizable via face-crop comparison against the input photo):

| Style | Attempts | Output (gitignored local) | Bytes | Notes |
|---|---|---|---|---|
| renaissance | 1 (Phase 1 verified run) | adult-face-renaissance.png | 1,289,082 | carried from Phase 1 wire test |
| starry-night | 2 | adult-face-starry-night.png | 1,724,353 | attempt 1: floating-head stand-in + hallucinated costume → rejected |
| egyptian | 4 | adult-face-egyptian.png | 1,582,140 | attempts 1/3 flat-profile (template defect), 2 identity-below-bar; eye tint green-hazel vs brown, within descriptor "dark brown to hazel" — noted |
| elven | 2 | adult-face-elven.png | 1,635,831 | attempt 1 blonde archetype pull → rejected; dark hair carried on retry |
| comic-hero | 2 + swap-retry | adult-face-comic-hero.png | 2,151,562 | attempt 1 IP FAIL (WW/Superman trade dress from old template); attempt 2 scene clean, first swap photoreal → production retry rule applied (same scene, swap only) → accepted |

Full audit trail incl. every rejected attempt:
`scripts/smoke/output/gallery/manifest.jsonl` (10 generation records).

**Comic-hero IP re-verification (DoD item):** accepted image inspected —
teal/copper suit, geometric origami-falcon emblem, invented gibberish
cover-title/corner-stamp text, no Marvel/DC marks, no S-shield/bat/spider
emblem. CLEAN.

**Groups:** absent. Single subject (adult) only, per v1 deferral.

**Style gate caveat:** `checkStylePresence` is dead (ANTHROPIC_API_KEY 401,
founder rotation pending) — every output was manually lead-verified instead.

## 2. Root-cause template fixes (production data hygiene)

Both defects match the session-4 finding "failures 100% template-driven".
Fixed in `prisma/seed-style-packs.ts`, smoke DB, AND prod main DB:

- **egyptian**: removed "Egyptian profile style with frontal torso" and
  "ancient tomb paintings" clauses → three-quarter pose, lifelike face,
  painterly New Kingdom language. (Old clauses produced flat profile
  stand-ins that Kontext could not anchor a face onto.)
- **comic-hero**: replaced generic costume + "primary red, blue, yellow"
  palette (which pulled Superman/Wonder Woman trade dress) with the
  session-5 IP-safe archetype: teal/copper suit, origami-falcon emblem,
  explicit "no existing superhero IP" negative clauses; modifiers palette
  → "teal, copper, silver, bold black ink, white highlights".

## 3. R2/CDN hosting (not hotlinked, not committed)

Uploader: `scripts/gallery/upload-to-r2.ts` via production `lib/r2.ts`
(bucket imagecrafter-prod, 1yr immutable cache). 13 objects under
`gallery/v1/`: before photo + thumb, 5 full PNGs, 5 800px JPEG thumbs.
Manifest: `scripts/gallery/r2-manifest.json`.

Live verification (script output, HEAD requests):

```
before: full HTTP 200, thumb HTTP 200
renaissance / starry-night / egyptian / elven / comic-hero:
  full HTTP 200, thumb HTTP 200
✓ All gallery assets CDN-served   (https://images.imagecrafter.app/gallery/v1/…)
```

No binaries committed; originals remain gitignored.

## 4. Prod DB update (zero picsum)

Script: `scripts/gallery/update-prod-db.ts` (run against prod main DB):
- egyptian + comic-hero template/modifier fixes applied (1 row each).
- 5 shipping packs active, thumbnailUrl → real R2 thumb of their verified
  style; 5 shipping variants active, sampleImageUrl → real R2 thumb.
- 42 non-shipping variants + fine-art/custom-scene packs deactivated,
  picsum URLs cleared to "" (required String; no fake replacements).

Proof (count queries against prod):

```
picsum remaining: variants=0 packs=0 templates=0
active: packs=5 (expect 5), variants=5 (expect 5)
```

All app query sites confirmed to filter `isActive: true` at pack AND
variant level (marketing page, /portraits page, /api/portraits/style-packs)
— deactivated rows can never render.

## 5. Seeds + config + code (zero picsum)

- `prisma/seed-style-packs.ts`: picsum `placeholder()` helper deleted;
  new `galleryAsset()` returns real R2 thumb for shipping styles, "" for
  everything else; variant `isActive` derived from shipping map; fine-art
  + custom-scene packs seeded inactive. **Verified truthful**: re-ran seed
  against smoke DB → identical end-state to prod (zero picsum, correct
  templates, 5/5 active).
- `next.config.ts`: picsum remotePatterns removed (remaining:
  image-gen.xencolabs.com, images.imagecrafter.app, *.r2.dev).
- `app/api/images/download/route.ts`: picsum removed from allowedDomains.
- `app/(dashboard)/projects/page.tsx`: mockProjects array (3 fake picsum
  projects) deleted → real empty state.
- `app/(marketing)/landing-a`, `landing-b`: **deleted** (git rm). Orphaned
  legacy A/B pages for a different product concept, zero inbound
  references, built entirely on fabricated picsum "comparisons" — cannot
  be made real, so they do not ship.
- `README.md`: picsum banner → real starry-night R2 asset.

Final grep (code, excluding the checker scripts + planning docs):
`grep -rn picsum app/ lib/ components/ prisma/ public/` → **0 hits**.

## 6. Site rebuilt around real output

- `app/(marketing)/page.tsx`: hero pack grid + style-pack cards already
  DB-driven → now render real R2 assets. NEW before/after section
  ("From One Photo to Any Style"): rights-cleared before photo + all 5
  real outputs, hardcoded to the immutable gallery/v1 CDN URLs.
- `app/portraits/page.tsx`: false copy fixed — "50+ styles across 7
  packs" → "5 signature styles"; "pet, person, family" → "one clear
  subject — person or pet" (groups are v1-deferred).

## 7. Build + deploy + LIVE verification (evidence)

- `npx tsc --noEmit`: clean. `npx next build`: clean; landing-a/b gone
  from route table.
- Vercel prod deploy `dpl_BJMUjPBqnBtJdiTyfdEtTYr3MMhS` READY
  2026-07-11 17:38 UTC, aliased to imagecrafter.app.
- Live https://imagecrafter.app/ → HTTP 200, **0 picsum occurrences**,
  before/after section rendered, all 6 gallery CDN assets present in HTML
  (before ×3, each style thumb ×5–7 across hero grid / before-after /
  style cards).
- Live /portraits → HTTP 200, 0 picsum, "5 signature styles" copy live,
  no "50+" remnants.
- Live /landing-a and /landing-b → HTTP 404 (removed).
- Live /api/portraits/style-packs → exactly 5 packs, 1 active variant
  each, every sampleImageUrl = images.imagecrafter.app/gallery/v1/thumbs/…,
  `picsum in payload: False`.
- Smoke-branch credential `/tmp/ic_smoke_db` deleted at close.

## Residual (founder tracks)

ANTHROPIC key rotation (style gate dead); dual-engine migration not on prod
main; dedicated image-gen API key; whsec live-event confirm; Stripe
one-time products (founder #12); Vercel token P-1.

### CLOSED 2026-07-11 (verified same day)

- **Prodigi P-0 key rotation — CLOSED.** Founder rotated the key; verified
  on all three surfaces (evidence, not assertion):
  1. Live Prodigi prod API: `GET /v4.0/orders?top=1` with new key →
     HTTP 200 `outcome: Ok` (key …ab2d, len 36).
  2. Infisical vault `imagecrafter-production` (workspace
     0f4ebd03-8bd6-4b26-b87c-5bd822b4ad98, env prod): PRODIGI_API_KEY
     …ab2d len 36 — matches.
  3. Vercel prod env: PRODIGI_API_KEY updatedAt 2026-07-11 16:26 UTC
     (via REST API; CLI `env ls` column is creation time and misleading).
- **REPLICATE_API_TOKEN + ENABLE_FACE_PRESERVATION Vercel gap — CLOSED.**
  REPLICATE_API_TOKEN present, updatedAt 2026-07-11 16:27 UTC;
  ENABLE_FACE_PRESERVATION="true" targets production. Current prod
  deployment (17:38 UTC) postdates both env updates, so the running app
  has the new values.
