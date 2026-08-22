# Two-step retry defect: the retry re-used the failing stand-in

Date: 2026-08-19 · Commit: 96f91ef · Branch: vercel-prep
All numbers below come from the REAL production path (`generatePortrait()`
via `scripts/smoke/e2e-generate.ts`), not a bench re-implementation.

## The defect

Every two-step acceptance-gate failure recorded the same verdict:

```
identity=different, style=styled
```

The style lands; the likeness does not. That splits the blame cleanly —
the stand-in scene carries the style correctly, and identity is lost.

The swap (`flux-kontext-apps/multi-image-kontext-pro`) can only redraw the
face. Build, skin tone, head geometry and hair volume are inherited from
the stand-in scene. So when the gate rejected an output, the retry —
which re-ran `swapFaceIntoScene` against the **same `sceneUrl`** — kept
the exact input that had lost the identity. It re-rolled the swap dice
while holding the poisoned card.

This is why the post-retry pass rates barely beat single-attempt rates.

## The fix

`acquireStandIn()` (stand-in generation + fidelity gate, up to
`MAX_STANDIN_ATTEMPTS = 3`) is now a callable unit. On gate failure the
retry regenerates the stand-in through that gate and swaps onto the fresh
scene. Failure remains fail-closed: if the retry cannot obtain a stand-in,
the portrait fails honestly with the original gate verdict.

## Measured result — control adult, 5 runs per cell

| style | before | after | retry fired | retry rescued |
|---|---|---|---|---|
| elven | 2/5 | **5/5** | 2 | 2 of 2 |
| comic-hero | 3/5 | 2/5 | 4 | 1 of 4 |

Elven: both runs that hit the retry were rescued by it, and all five
outputs were **accepted by eye** — same long oval face, dark hair, fair
skin, nose and brow as the source. The mechanism and the outcome agree.

Comic-hero: the retry fired on 4 of 5 runs and rescued 1. The fix does not
help here, so comic-hero's identity loss is **not stand-in-borne**.

## Comic-hero: the two gate passes do not survive lead review

Both comic-hero outputs that the gate approved were adjudicated by eye and
**rejected**. They are IP-clean (original chevron emblem, original
"FALCON STRIKE" masthead — no Superman shield), but the comic house style
redraws the face into a generic heroine: fuller lips, rounder face,
different bone structure. The subject is not recognisable.

Standing rule applies: *no image is gallery-eligible on gate approval
alone.* Comic-hero's effective rate is therefore closer to 0-1/5 than 2/5.

This is the same failure class as egyptian (task #54): the style's own
rendering conventions overwrite facial structure. It is structural, not a
tuning problem.

## Cross-subject validation — the fix does not generalise

Gate result, then lead adjudication of every image the gate approved:

| style | subject | gate | by eye |
|---|---|---|---|
| elven | control adult | 5/5 | 5/5 accept |
| elven | dog | 3/3 | 3/3 accept |
| elven | child (~3y) | 3/3 | **1/3** — one aged up to ~7y, one borderline |
| elven | heavyset adult | **0/3** | — (nothing passed) |
| comic-hero | control adult | 2/5 | **0/2** |
| comic-hero | heavyset adult | 2/3 | 2/3 borderline — carried by glasses, build slimmed |
| comic-hero | child | 1 run only (cell aborted) | no verdict |

Two findings the gate numbers alone would have hidden:

1. **Elven × heavyset adult is 0/3** — every run failed `identity=different`
   even with a fresh stand-in. The stand-in generator will not render a
   heavyset body; it idealises. Single-pass elven also failed this subject
   0/3, so this is a **style-level** limit, not an architecture one. Known
   class, task #57.
2. **Elven × child passes the gate 3/3 but only ~1/3 by eye.** One output
   aged a ~3-year-old up to roughly 7. The gate is coarser than the lead's
   eye — consistent with the calibration bench sitting at 2/4.

The child × comic-hero cell aborted after run 1 and gets **no verdict**
under the variance rule (task #49): nothing is called on fewer than 3 runs.

## Verdicts

- **renaissance** (single-pass) — ships. 12/12 gate, 12/12 by eye, all four
  subject classes.
- **starry-night** (single-pass) — ships with a caveat. Identity holds
  12/12, but the subject renders photoreal against a painted backdrop
  rather than as a painting; 3 runs were correctly rejected `style=photoreal`.
- **elven** (two-step + fresh stand-in) — ships for adults and pets.
  **Fails heavyset adults 0/3** and is unreliable on toddlers.
- **comic-hero** — recommend hold. Same class as egyptian (#54): the comic
  house style redraws facial structure. Its few passes lean on accessories
  (glasses), not likeness.

Every failure above reached the customer as an honest failure, not a bad
portrait — the fail-closed gate behaved correctly throughout.

## Cost

The retry now costs one extra stand-in generation on the failure path only
(~35-70s). Observed run times rose from ~110s to ~180s on runs where the
retry fired; runs that pass first time are unchanged.
