# Comic-hero identity — VERDICT: FAIL (3/9 by eye, 3 subjects)

**Date:** 2026-08-20
**Reproduce:** `npx tsx scripts/smoke/e2e-generate.ts <subject> pop-culture comic-hero 3`
**Founder decision this run answers:** "Keep testing comic-hero" — a hold was
recommended earlier and NOT accepted, so the style was given three subjects
and nine runs rather than being called on four.

## Result

| subject | gate | by eye | notes |
|---|---|---|---|
| s-child-girl-tight | 3/3 | **2/3** | run 3 drifts to a generic cartoon toddler, hair longer than the source bob |
| s-adult-female-tight | 2/3 | **0/3** | run 1 blocked by the identity gate; runs 2-3 slim a heavyset subject into a standard heroine |
| s-child-boy2-tight | 3/3 | **1/3** | runs 2-3 replace a straight blunt fringe with curly hair |
| **total** | **8/9** | **3/9 (33%)** | bar is 80% |

Gate approval is not acceptance. Every output above was compared by eye against
the source photograph; the gate and the eye disagree on five of nine runs.

## Two failure modes, and they are not the same kind of problem

**1. Heavyset adults are slimmed — structural.** Both surviving runs for
`s-adult-female-tight` keep the glasses and the hair colour and length, then
render a narrow-faced, standard-build comic heroine. The subject's defining
features — full round face, heavyset build — are gone. This is the comic
superhero template asserting an idealised physique over the descriptor, the
same class of conflict that put egyptian on permanent hold (#54) and that #57
already recorded for heavyset adults. #56 restated build literally and it was
not enough here.

**2. Hair texture drifts, and the gate does not catch it.** The boy's source
hair is straight with a heavy blunt fringe; runs 2 and 3 come back curly. This
is a top identity cue, the same failure class as #60 (renaissance headwear
deleting the hairline).

The second one is the more interesting finding, because **the check for it
already exists and did not fire**:

- `portrait-analysis.ts:703` — stand-in fidelity: "MISMATCH if hair texture
  differs by two or more steps (straight vs curly, wavy vs coiled)."
- `portrait-analysis.ts:475` — identity gate: "a clearly different hair length
  or texture … mean DIFFERENT on their own."

Straight → curly is two steps on the stated scale. Both gates passed it anyway.
So this is not a missing rule and not a two-step architecture defect — it is
gate sensitivity, consistent with the known calibration gap where the gate
scored 2/4 against the lead's eye. Writing a *third* rule would not help; the
existing rules are correct and under-firing.

## Product-quality issue, separate from identity

Roughly half the outputs render comic-cover text across the image: "ORIGAMI
FALCON", "ACTION COMICS GROUP", "ISSUE 41", "ISSUE #1 — ORIGIN OF THE BOY
HERO!", "WING #1". The IP gate correctly cleared all of it — these are invented
properties, not Marvel or DC — so this is not a legal finding. But a portrait a
customer paid for should probably not have a randomly-generated magazine
headline over the subject's head. That is a founder call on the style, not a
defect.

## Latency note

The child-girl cell ran with `ASYNC_POLL_TIMEOUT_MS=600000`. Its runs took
165.2s / 140.6s / 120.5s — all under the shipped 300s default, so the raised
ceiling did not affect the result and it stands at the shipped setting. The
other two cells ran the same way; the slowest single run was 230.5s.

## What this does not say

It does not say the two-step pipeline is broken. Renaissance and starry-night
are on single-pass under the per-style routing decision, and elven passes with
the upload gate. This is a verdict on **comic-hero only**.

## Recommendation

Hold comic-hero, as egyptian is held. The adult failure is template-structural
and #54 is the precedent for what that costs to chase. The founder overrode a
hold once already on four runs; this is the same recommendation on nine runs
across three subjects, with the mechanism identified rather than guessed.

If the founder wants it pursued anyway, the one lead worth spending on is gate
sensitivity — not new rules, but why two correctly-written hair-texture rules
both passed a straight-to-curly change. That work would improve every style,
not just this one.
