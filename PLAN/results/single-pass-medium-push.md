# Single-pass medium push + two engine-scoping defects

Date: 2026-08-20 · Branch: vercel-prep
All numbers below come from the REAL production path (`generatePortrait()`
via `scripts/smoke/e2e-generate.ts`), not a bench re-implementation.
Every image was adjudicated by eye against its source photo: **no image is
gallery-eligible on gate approval alone.**

## Why this work happened

Founder decision, 2026-08-19: starry-night's style push must be **fixed before
launch**, not shipped with a follow-up. The defect: identity held 12/12 but the
subject rendered photoreal against a painted backdrop — a photo composited into
a painting rather than a painting.

## The defect and the fix

Renaissance's template opens `"A magnificent Italian Renaissance oil portrait
painting of {{subject}}"` — the subject is the grammatical object of "painting",
so the whole frame gets painted. Starry-night's opens `"{{subject}} standing in
the undulating landscape of ..."`, which Kontext reads as *keep this photo,
paint the scene behind it*.

Per task #59 the style templates are **not** edited. The fix lives in
`buildSinglePassPrompt`, and it took two passes:

1. **Trailing medium constraint** — fixed 3 of 4 subject classes.
2. **Leading medium declaration** — required for the 4th. With the trailing
   constraint alone a tight selfie stayed photographic 0/3: the model reads the
   scene clause first, commits to preserving the photo, and treats everything
   after it as background work. Declaring the medium *before* the scene makes
   the task a repaint rather than a composite.

## Measured result — 3 runs per cell, lead-adjudicated

| style | subject | trailing only | + leading (ships) |
|---|---|---|---|
| starry-night | control adult | 3/3 | **3/3** |
| starry-night | child ~3y | 3/3 | **3/3** |
| starry-night | dog | 3/3 | **3/3** |
| starry-night | heavyset adult | **0/3** | **2/3** |
| renaissance | control adult | 3/3 | **3/3** |
| renaissance | heavyset adult | 3/3 | not re-run |

Starry-night ships at **11/12 by eye**. Renaissance shows **no regression** —
it is the only style at 12/12 across all four subject classes and both styles
share `buildSinglePassPrompt`, so it was the regression gate that mattered.

Two findings the gate numbers alone would have hidden:

1. **All 30 runs in this cycle passed the acceptance gate**, including the
   heavyset run the lead rejected. That run slimmed the build and stayed
   semi-photographic. The gate remains a cost filter, not the acceptance
   authority.
2. **Single-pass does not age up toddlers.** The ~3-year-old renders at ~3 in
   6/6 starry-night runs; two-step elven aged the same child to ~7.

## Two defects where an engine-specific limit was applied engine-blind

Both were found only because the harness now survives a throwing run
(`scripts/smoke/e2e-generate.ts` per-run try/catch). Before that, a throw called
`fail()` → `console.error` + `process.exit(1)`, and because the batch drivers
grep **stdout**, a crashed cell looked like a short cell. Verdicts were resting
on incomplete cells.

### 1. The Kling character ceiling killed a Higgsfield style

`STANDIN_PROMPT_CHAR_LIMIT = 2400` exists because **Kling** rejects prompts over
2500 (error 1201). It was enforced for every style. Comic-hero × child assembled
at 2403-2411 characters and threw on **3/3 runs** — and comic-hero is pinned to
`higgsfield/nano_banana_pro`, which has no such limit. The guard was rejecting
generations the actual engine would have accepted.

This is why that cell had "aborted" twice before and still had no verdict.

Now scoped: enforced when the style is pinned to Kling, or has **no** pin at all
(unpinned styles auto-route and can land on Kling). Fail-closed behaviour for
Kling-routed styles is unchanged.

### 2. Comic-hero still has no verdict — now for an infrastructure reason

With the ceiling scoped correctly the cell finally reached generation:

| run | outcome |
|---|---|
| 1 | stand-in job timed out after 300s (`ASYNC_POLL_TIMEOUT_MS`) |
| 2 | stand-in job timed out after 300s |
| 3 | PASS in 269.4s |

Run 3 is **the first comic-hero output on a human subject that holds the
likeness** — correct bob, hair bow, round toddler face, age still ~3 — and it is
IP-clean: original bird emblem, "FALCON SQUAD #1" masthead, no shield
silhouette. Prior comic-hero human results were 0/4 by eye.

Under the variance rule (task #49) **one completed run is not a verdict.** The
open question is `ASYNC_POLL_TIMEOUT_MS = 300_000`: the two-step comic-hero path
runs 269-320s end to end, so it sits on the ceiling. Raising it trades customer
wait time against a failure that costs a full regeneration to retry — a product
call, not a test-harness one.

## Standing caveats

- **starry-night × heavyset adult is 2/3, not 3/3.** One run in three slims the
  build and stays semi-photographic, and the gate approves it. That is the
  honest number to carry into launch.
- **comic-hero remains unverdicted.** It has one good human result and a
  reliability problem, not a pass.
