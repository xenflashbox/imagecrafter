# P4 Gallery Regeneration Report — Fix Directive Close-Out

Date: 2026-07-12 · Branch: `vercel-prep` · Commit: `16f22e9` · Live: https://imagecrafter.app

Directive: `docs/imagecrafter-fix-analysis-and-identity-gates.md` — "a visitor must see the
SAME PERSON, painted… hold the style back rather than ship a stranger."

## Executive summary

**4 of 5 styles ship. Egyptian is held back.** Every shipped gallery image is a real output
of the production two-step pipeline that passed all three fail-closed gates (stand-in
fidelity, identity presence, style presence) AND lead visual verification. Egyptian failed
the identity gate on all 6 swaps across 3 full runs and does not ship — its pack
(time-traveler) is deactivated in prod. Zero picsum, zero pre-gate assets remain.

## P0–P3 status (prerequisites, all complete)

| Phase | Result | Evidence |
|---|---|---|
| P0 analysis leg | RESTORED + prod E2E proven | HTTP 200 in 75.7s, portrait `054122216b6043abbf2693dbdb8f6b58`, preview lead-verified SAME PERSON in renaissance. Key: `IMAGECRAFTER_ANTHROPIC_API_KEY` (vault + Vercel only, never on disk); lib.ts borrow removed. |
| P1 fail-opens | CLOSED | Style gate fail-closed; cached-analysis fallback removed (the Jul-11 stranger-gallery path is gone). |
| P2 identity gates | LIVE | checkIdentityPresence + checkStandInFidelity + fixed style gate, all "unknown"→abort. |
| P3 engine pins | LIVE-VERIFIED | renaissance/egyptian/elven → kling/kling-v3 (explicit model param required — discovery); starry-night/comic-hero → higgsfield/nano_banana_pro (scene 33.2s live). |

## P4 per-style verdicts (production pipeline, honest gates)

| Style | Runs | Gate outcome | Lead visual | Ships? |
|---|---|---|---|---|
| renaissance | 1 | PASS first try (identity=same, style=styled) | PASS | ✅ |
| starry-night | 2 | Run 1 passed gates but had flat-gray unrendered blocks → REJECTED at visual review (archived `REJECTED-starry-night-gray-blocks.png`). Run 2 PASS | PASS | ✅ |
| comic-hero | 1 | PASS first try | PASS + IP-clean (original origami-falcon emblem, no Marvel/DC marks) | ✅ |
| elven | 3 | Runs 1–2 failed; run 3 retry PASS (identity=same, style=styled) | PASS (same person, painterly elven, headroom) | ✅ |
| **egyptian** | **3** | **All 6 swaps identity=different. Never passed.** | n/a | **❌ HELD BACK** |

Gate verdicts are the production `checkIdentityPresence`/`checkStylePresence` calls — no
overrides, no fallbacks. Audit trail: `scripts/smoke/output/gallery/manifest.jsonl`
(gitignored, includes per-output gate verdicts).

## What shipped

1. **R2 `gallery/v2`** — new keys because v1 is CDN-cached immutable for 1yr. 4 after +
   before pair uploaded, all HEAD-verified HTTP 200 on `images.imagecrafter.app`.
2. **Prod DB** (Neon `ep-delicate-violet…`): 4 packs / 4 variants active with R2 URLs;
   time-traveler pack + all its variants deactivated; fine-art/custom-scene remain off;
   verified zero picsum in variants/packs/templates; active counts assert-checked (4=4).
3. **Marketing page**: `GALLERY_CDN` → v2; `AFTER_GALLERY` reduced to the 4 shipped styles.
4. **Mobile framing fixed at generation** (per directive, not CSS): stand-in prompts now
   require classical portrait composition with generous headroom. All shipped outputs are
   880×1184 (0.743) vs the page's 3:4 crop box (0.75) → <1% vertical trim; verified thumbs
   show full heads with clear space above.
5. **errorMessage cleared on successful regeneration** (stale-failure-text fix).

## Live verification (evidence, not assertions)

- Deployed `16f22e9` via worktree method → `imagecrafter-lwady11rb…` ● Ready (Production).
- Live HTML: gallery/v1 refs = 0; "egyptian"/"time-traveler" refs = 0; picsum refs = 0;
  exactly 4 pack names render (Royal Gallery, Masterpiece, Fantasy Realm, Pop Culture).
- Fetched CDN thumb (renaissance) and visually confirmed it is the lead-verified output.
- Branch pushed: `804296f..16f22e9 vercel-prep`.

## Flags for founder decision

1. **Egyptian needs template/engine work** before it can return — weakest style for
   identity transfer (0/6 swaps). Recommend a dedicated iteration, not more retries.
2. **Swap stochasticity ~50% per swap** (~75% per attempt with the one retry). Customer UX
   implication: honest failures will happen; consider messaging/auto-retry budget.
3. **Gates do not check render completeness** — starry-night run 1 passed identity+style
   with large unrendered gray regions. A render-integrity check may be worth adding;
   until then human review guards gallery assets only (customer outputs have no such net).
4. **Vault scope**: the imagecrafter identity could still see the `image-gen` workspace
   despite the stated grant withdrawal — flagging per the standing rule.
5. **kling-v3 requires the explicit model param** on pinned Kling engines (fixed in 9660626).
