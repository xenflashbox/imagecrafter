# Best-of-N stand-in selection — VERDICT

Task #73 ("rebuild stand-in on best-of-N selection; remove single-pass") asked for proof
via `scripts/smoke/best-of-n.ts`, 3 runs per style, A/B picked-vs-first, on renaissance and
starry-night, images inspected by eye.

**Verdict: best-of-N does not visibly beat first-acceptable. Do not ship the ranker as a
quality mechanism.** The one number that did move came from a different fix (#78a).

Standing rule invoked: *"If best-of-N does not visibly beat first-acceptable, say so rather
than shipping it."* This document says so.

---

## Harness

`scripts/smoke/best-of-n.ts` calls the production functions directly — no reimplementation
of the logic under test. Per run: N=3 `generateStandInScene` in parallel →
`checkStandInFidelity` veto on every candidate → `rankStandInCandidates` on survivors →
`swapFaceIntoScene` onto the winner → `checkIdentityPresence` + `checkStylePresence`.
When the ranker picks something other than `eligible[0]` it *also* swaps onto `eligible[0]`
— the candidate the old first-acceptable loop would have shipped — so the A/B leg is a real
head-to-head, not a restatement of the ranker's own output.

Subject `adult-face` throughout. Neon smoke branch `imagecrafter-smoke-2026-08-22`
(host `ep-empty-wave-adgqw5h9…`, preflight confirmed "is not production").

One harness defect was found and fixed before the measured runs: production passes
`subjectAge` to the swap and the harness did not, so earlier results were not
production-equivalent.

---

## Results

Rule #49 control bar is **2/3 runs**, not per-swap.

### renaissance / adult-face (engine pinned kling/kling-v3)

| metric | baseline (headwear bug) | after #78a fix |
|---|---|---|
| runs ranked | 3/3 | 3/3 |
| ranker disagreed with first | 1/3 | 1/3 |
| **gate PASS (picked)** | **1/3** | **2/3** |
| **gate PASS (first)** | **1/3** | **1/3** |

### starry-night / adult-face (engine pinned higgsfield/nano_banana_pro)

| metric | value |
|---|---|
| runs ranked | 3/3 |
| ranker disagreed with first | 3/3 |
| **gate PASS (picked)** | **2/3** |
| **gate PASS (first)** | **2/3** |

Dead tie. Run 1 both PASS; run 2 PICKED PASS / FIRST FAIL; run 3 PICKED FAIL / FIRST PASS.

### Head-to-head, both styles, divergent runs only (n=4)

By gate verdict: 2 picked-wins, 1 first-win, 1 tie.
By eye (see below): 1 picked-win, 2 first-wins, 1 tie.

Four samples. This is noise, not a benefit.

---

## By-eye inspection (gate PASS is necessary, not sufficient)

- **starry run 3 — gate right, best-of-N lost.** FIRST is a clear likeness of the reference:
  narrow face, same nose bridge, same mouth and smile lines, correct age. PICKED is a harder,
  heavier-browed different woman, and its Van Gogh handling is flatter. The ranker had
  vetoed `eligible[0]` for "resembling a poster composition" — and that poster-ish candidate
  produced the better identity. The ranker's composition criterion actively cost identity here.
- **starry run 2 — gate disagrees with my eye.** The gate scored PICKED `same` and FIRST
  `different`. To my eye the reverse is true: FIRST has the reference's narrow face, brow and
  age lines; PICKED is a younger, smoother, rounder, prettier different woman. This is the
  one "picked-win" in the gate tally that I do not believe.
- **starry run 1 — tie.** Both are good likenesses; FIRST is marginally tighter.
- **renaissance run 3 — gate right.** PICKED is a rounder face with a heavier jaw and a
  different nose and mouth. Correctly failed; not a false reject.
- **renaissance run 2 — genuine picked-win**, and the only one I endorse.

---

## Why it does not pay: the variance is in the swap, not in selection

The `checkStandInFidelity` veto **never fired** — 18/18 candidates across both styles
returned `match`. The ranker returned "No defect" for 8 of 9 starry candidates and 9 of 9
renaissance candidates. The selection machinery had essentially nothing to discriminate on:
three candidates from a pinned engine come back near-indistinguishable.

Then the swap re-rolls the dice anyway. See #78b: the swap redraws the whole scene rather
than repainting the face. In renaissance run 3 the chosen stand-in was a tight
head-and-shoulders and the swap zoomed *out* to a half-body with a much smaller face
(identity failed). In renaissance run 2 the swap cropped *in* and removed a gilt picture
frame the stand-in had (identity passed). Framing moves in both directions, so whatever
framing advantage the ranker buys is not guaranteed to survive to the output.

So best-of-N spends 3× the stand-in cost — the slowest and most expensive leg — choosing
between candidates the ranker itself calls defect-free, to feed a step that then recomposes
the result.

---

## What actually moved the number

The renaissance improvement (1/3 → 2/3) is attributable to the **#78a headwear fix**, not to
selection: it lifted *both* legs' inputs and it is the only variable that changed between the
baseline and the re-run on an otherwise identical harness. `faceIntoScenePrompt` demanded
"the costume and headwear from image 2", written when stand-ins still generated headwear;
task #60 later removed headwear from stand-ins, leaving an unsatisfiable instruction, so the
model hallucinated a scarf or cap over the hairline in 4/4 renaissance swaps — deleting a top
identity cue. The clause is now conditional on head covering actually being visible in image 2
(elven's circlet is still honoured). No invented head covering appeared in any post-fix swap.

---

## Recommendation

1. **Keep** the `checkStandInFidelity` veto. It is a safety net that has fired in earlier
   sessions, and it fails closed. It is not what is on trial here.
2. **Do not ship `rankStandInCandidates` as the quality mechanism.** It is unproven at n=4
   head-to-heads and in one measured case it actively selected against identity.
3. **Attack the swap leg instead — that is where the variance lives.** Gate PASS runs at
   roughly 2/3 *per swap*. Swaps cost $0.08 and 15-19s; stand-ins cost far more and dominate
   latency (114-262s for three in parallel). Re-swapping onto the *same* stand-in and keeping
   the first that clears the gate would take the effective pass rate to ~89% at 2 attempts and
   ~96% at 3, for a fraction of the cost of the current gate-failure retry — which today
   regenerates the whole stand-in (`portrait-generation.ts:942`).
4. **Fix #78b** (uncontrolled recomposition) before spending anything further on selection.
   Also note `rankStandInCandidates`' prompt still asserts the chosen scene "is final and
   cannot be changed", which is false, and that it returned "No defect" for a
   candidate that was a framed painting — criterion 1 (PORTRAIT NOT A PAGE) should
   arguably have caught that.

## Honest caveats

- n=3 runs per style, n=4 divergent head-to-heads. Small.
- The renaissance post-fix result (2/3) *meets* the rule-#49 bar; it does not exceed it.
- The identity gate has both false rejects and, on starry run 2, an apparent false accept.
  Gate verdicts alone should not decide this; that is why every image was viewed.
