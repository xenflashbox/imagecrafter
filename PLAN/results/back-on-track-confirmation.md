# Back-on-track confirmation — P0 alive, gates demonstrated

**Date:** 2026-07-13 · **Directive:** `docs/imagecrafter-back-on-track-confirm-p0-then-gates.md`
**Deployed:** `e10f46e` on `vercel-prep` → `dpl_kM7Vpq1VwiH4qVFPwHpQv2kVzoeH` ● Ready, aliased `imagecrafter.app`

---

## 1. P0 — CUSTOMER GENERATION IS ALIVE (fresh evidence, today)

**Acceptance test: a real guest portrait completed start-to-finish on production, today.**

| Step | Evidence |
|---|---|
| Upload | `POST /api/portraits/upload` (guest, multipart) → `{"success":true,"portraitId":"248febbb9b1e473e850e0669e833a1f7"}` |
| Generate | `POST /api/portraits/generate` (royal-gallery/renaissance) → `{"success":true, "previewImageUrl":"https://images.imagecrafter.app/portraits/previews/248febbb9b1e473e850e0669e833a1f7-v1-preview.png"}` in **78.2s** — the full pipeline: analyze → stand-in (kling pin) → fidelity gate → swap → identity+style acceptance gate → watermark → store |
| Result | Preview HTTP 200, 391,680 bytes. **Visually verified: the SAME woman** (facial structure, dark hair, brown eyes, skin tone) as the source photo, rendered as a renaissance painting, full head in frame with generous headroom |

**Key wiring:** code reads the dedicated name — `lib/services/portrait-analysis.ts:116`
`process.env.IMAGECRAFTER_ANTHROPIC_API_KEY`; the old `ANTHROPIC_API_KEY` read is gone
(zero references in `app/`+`lib/`). Var present in Vercel prod (`vercel env ls`: Production,
Encrypted) and the vault. The E2E above IS the runtime resolution proof — analysis and all
three vision gates executed on production with this key.

**Model:** `AI_VISION_MODEL="claude-sonnet-4-5-20250929"` on all three surfaces — `.env:203`,
`.env.example:57`, and the **pulled Vercel production value** (not just the dashboard label).
Verified by real calls: the prod E2E plus every gate call below returned normally.

## 2. P1 items 1 & 2 — post-fix state confirmed in current code

1. **Style gate fail-closed:** the acceptance gate at `portrait-generation.ts:594-640` requires
   `identity === "same" && style === "styled"`; "unknown" on either axis blocks; the fidelity
   gate aborts on "unknown" (`:535-552`). No pass path for "unknown" exists.
2. **Cached-analysis fallback removed:** `scripts/gallery/generate-pair.ts:75-85` — LIVE vision
   only; on failure `fail("Live vision analysis failed — run aborts (no fallback)")`.

## 3. P2 — gates DEMONSTRATED rejecting (script: `scripts/smoke/gate-rejection-demo.ts`)

Production gate functions imported unmodified; inputs are the **actual Jul-11 strangers**.

| Demo | Input | Verdict | Result |
|---|---|---|---|
| Identity gate rejects a stranger | old-pipeline egyptian output vs source photo | `"different"` | ✅ REJECTED |
| Identity gate passes the real thing | shipped renaissance gallery output vs source | `"same"` | ✅ control |
| Fidelity gate rejects wrong coloring | **the v1 green-eyed egyptian that shipped** vs analysis (dark brown/hazel eyes) | `"mismatch"` | ✅ REJECTED pre-swap |
| Fidelity gate rejects wrong coloring | **the v1 blue-eyed comic-hero that shipped** vs analysis | `"mismatch"` | ✅ REJECTED pre-swap |
| Fidelity control | shipped renaissance vs analysis | `"match"` | ✅ control |

Both gates visibly reject the exact three-stranger class. (v1 R2 assets are immutable-cached,
so the shipped strangers themselves served as the rejection inputs.)

**Two honest findings from demo development:**
- **The gates are complementary, not redundant.** The old timebox egyptian r2 (dark-haired,
  brown-eyed, *wrong face*) correctly rates `match` on fidelity — its coloring does match —
  and is rejected by the **identity** gate. Coloring pre-filter + identity post-check together
  cover the failure space.
- **Identity-gate verdict noise:** on the genuine same-person renaissance image, 6 repeated
  calls → 5× `same`, 1× `different`. ~1-in-6 false-reject on a borderline true match. The
  noise **fails safe** (a flake burns the one swap retry or produces an honest failure — it
  never ships a stranger), but it inflates the honest-failure rate; part of the "~50% swap
  stochasticity" in the P4 report is likely gate noise, not swap variance.

## 4. P3 — per-style engine pins in production code

`portrait-generation.ts:219-224` `STYLE_ENGINE`: renaissance/egyptian/elven → `kling/kling-v3`;
starry-night/comic-hero → `higgsfield/nano_banana_pro`. Consumed by `generateStandInScene`
(`:300-304`) → the customer path (`:516`). Today's E2E ran the kling pin live on prod.

## 5. P4 — regenerated through gates, honest verdict (2026-07-12, unchanged)

4 of 5 ship (renaissance, starry-night run 2, elven run 3, comic-hero). **Egyptian HELD BACK**
— identity=different on all 6 swaps across 3 runs; pack deactivated in prod DB. Full per-style
table: `PLAN/results/p4-gallery-regeneration-report.md`.

## Still-open items from the directive

- **Deploy traces to a real commit:** Vercel API meta for the aliased deployment:
  `gitCommitSha: e10f46eccea157ea5033076d2623bf1f046d70e1`, message "fix(fail-opens): P1#3
  audit…". `git merge-base --is-ancestor` confirms both `a90341a` (identity gates) and
  `16f22e9` (P4) are ancestors — the live deploy contains all of this work. Not `eae40f2`.
- **Mobile framing:** fixed at generation — headroom clause in the stand-in prompt
  (`portrait-generation.ts:147-153`: "entire head… fully inside the frame with clear space
  above it"). Today's E2E preview visibly carries it.
