# Finalized face-swap two-step test — 2026-08-17

Founder ask: *"we need to make sure that the face swap works correctly. We never finalized
that. We were working on it with the two-step, but I don't think we actually ever ran a full,
finalized test."*

Test vehicle: `scripts/gallery/generate-pair.ts` — the production two-step path with every
gate live (live vision analysis → stand-in scene on the pinned engine → stand-in fidelity
gate → Replicate swap → combined identity+style acceptance gate). Subject:
`scripts/faceswap-timebox/input/adult-face.png`. Anthropic key fetched from Infisical at
runtime; never printed.

## Run 1 — baseline, before any fix

| Style | Engine | Gate verdict | Lead visual verdict |
|---|---|---|---|
| renaissance | kling/kling-v3 | **run aborted** | — |
| elven | kling/kling-v3 | not attempted (same engine) | — |
| starry-night | higgsfield/nano_banana_pro | `identity=same style=styled` → PASS | **FAIL — different woman** |
| comic-hero | higgsfield/nano_banana_pro | `identity=different` ×2 → held back | FAIL (gate agreed) |

Zero of four shipping styles produced a gallery-eligible, lead-verified image. This is
consistent with the founder's report that the live gallery images "were run off a failed
run" — every image in the current gallery manifest carries `"verified": false`.

### Blocker found: Kling account balance (P0, founder action)

```
Stand-in scene generation failed: Stand-in job failed:
Kling error 1102: Account balance not enough
(request_id=b180f28a-d3e1-4c65-a7c5-e0c029e38a12)
```

`STYLE_ENGINE` (lib/services/portrait-generation.ts) pins renaissance, elven and egyptian to
`kling/kling-v3`, so this is down for production customer generation too, not just tests.
Not worked around: re-pinning those styles to Higgsfield would silently discard the measured
bake-off winner and change output quality while appearing to fix the outage.

## Root cause of the identity failures

The stand-in descriptor was:

```
a woman, adult in their 30s to early 40s, with <coloring>
```

`coloring` is specified in the analysis prompt as colours only — hair colour, skin tone, eye
colour. **Hair length and texture were never carried into the stand-in prompt.** The face
swap replaces the face region only; hair, hairline and everything outside the face are
inherited from the stand-in. A subject with long straight brown hair was therefore rendered
as a stranger with short black curls, and no swap quality could correct it.

Diagnostic evidence (`/tmp/ic-diag-identity.ts`, run against the produced assets):

| Probe | Result |
|---|---|
| `checkStandInFidelity(scene, analysis)` | `match` — it only tested coloring/gender/age |
| `checkIdentityPresence(photo, scene)` pre-swap | **`different`** — the stand-in never looked like her |
| `checkIdentityPresence(photo, swap)` post-swap | `same` — the false pass that shipped |

The stand-in was never compared against the actual photo, only against a lossy text
description, so a stand-in that a vision model itself calls a different person passed
through to the swap. The swap nudged it from clearly-different to marginally-plausible and
the post-swap gate accepted it.

Contributing defect: `checkStandInFidelity` ran with `max_tokens: 16`, so it could not
inspect the image before answering — it rubber-stamped.

## Fix

1. `portrait-analysis.ts` — analysis returns a dedicated `hair` field (length relative to the
   shoulders, texture, how it is worn). Optional, so cached analyses still parse.
2. `portrait-generation.ts` — `buildStandInDescriptor` carries `hair` into the stand-in prompt.
3. Both vision gates now test hair length and texture. `checkStandInFidelity` describes what
   it observes before ruling (`max_tokens` 16 → 200) and the verdict is parsed from the last
   word, since the observation lines mention both MATCH and MISMATCH.

### Gate regression — 4/4

| Check | Before | After | Want |
|---|---|---|---|
| fidelity: starry-night stand-in (lead FAIL) | `match` | `mismatch` | mismatch |
| fidelity: comic-hero stand-in (lead FAIL) | `match` | `mismatch` | mismatch |
| identity: photo vs starry-night swap (lead FAIL) | `same` | `different` | different |
| identity: photo vs itself (positive control) | — | `same` | same |

Both bad stand-ins are now rejected *before* the swap, so failed attempts cost less.

## Standing rule reaffirmed

An image is gallery-eligible only when the gates pass **and** the lead has visually verified
it. The gates are a cost filter, not the acceptance authority — this test caught them
passing an image a human rejects.

---

# Continuation — runs 2-4, same day

Run 1's fix (carry `hair`, make the gates test hair) was necessary but not sufficient. Three
more defects surfaced, each found by **lead visual verification overruling a green gate**.

## Run 2 — hair fix + image-to-image fidelity gate

| Style | Gate verdict | Lead visual verdict |
|---|---|---|
| starry-night | `identity=same style=styled` → PASS | **FAIL — different woman, olive/tan skin** |
| comic-hero | `identity=same style=styled` → PASS | **FAIL — same** |

The fidelity gate was also rebuilt this run to compare the stand-in **image-to-image against
the subject's photo** instead of against the analysis text. Comparing against text is what
let run 1's stranger through: the analysis had drifted, the stand-in faithfully matched the
drifted text, and the swap inherited the wrong skin tone. The photo is the only ground truth.

### Root cause 2 — the analysis had no anchor for skin tone

`ANALYSIS_SYSTEM_PROMPT`'s `coloring` field rewarded evocative language (*"'warm chestnut
brown with subtle auburn highlights' not just 'brown'"*) but gave **no scale for skin tone**.
Across two independent runs it described this fair-skinned subject as:

```
warm olive skin tone with peachy undertones
warm olive-toned skin with subtle pink undertones
```

The stand-in then faithfully rendered an olive-skinned woman. The swap replaces the face
region only, so it could not correct it.

Probe evidence — the same production `VISION_MODEL`, same photo, asked to place her on a
named scale (fair / light / medium / tan / deep):

| Run | Anchored answer |
|---|---|
| 1 | light — slightly warm undertones |
| 2 | medium — olive undertones |
| 3 | Light — olive undertones present |

Never *tan*, never *deep*. "Olive" is genuinely perceived, but only as an **undertone**; the
free-text field let it become the headline.

**Fix:** `coloring` must now lead with exactly one scale word and may add undertone nuance
only after it. The prompt names the failure explicitly so it cannot regress quietly.

## Run 3 — with skin tone anchored

Descriptors immediately changed to `light skin with warm undertones…`. But:

| Style | Gate verdict | Lead visual verdict |
|---|---|---|
| starry-night | PASS (on swap retry) | **FAIL — skin corrected, structure still wrong** |
| comic-hero | `identity=different` ×2 → HELD BACK | FAIL (gate agreed) |

Skin tone was fixed. The face was still visibly broader, the jaw stronger, the brows heavier
and the lips fuller than the subject's narrow oval face and delicate pointed chin.

### Root cause 3 — `faceShape` was collected and then thrown away

`buildStandInDescriptor` carried gender, age, `coloring` and `hair` — but **not
`faceShape`**, even though the analysis prompt asks for it and the model returns it
("distinctly oval face … high cheekbones", "heart-shaped face … gently pointed chin"). It
was never declared on `PortraitSubjectAnalysis`, so nothing flagged the omission.

Same mechanism as the run-1 hair defect: the swap redraws the features *inside* the face
region, but **head width, jawline and chin are inherited from the stand-in**. A narrow-faced
subject built on a broad-jawed stand-in still reads as a different woman after a clean swap.

**Fix:** `faceShape` added to the type and carried into the stand-in descriptor.

Deliberately **not** added to `checkStandInFidelity`'s veto set: the swap does rebuild
features inside the face region, and grading a stylised painting's face shape flipped
run-to-run during gate tuning and failed a lead-verified control.

## Run 4 — with skin tone anchored and face shape carried

| Style | Gate verdict | Lead visual verdict |
|---|---|---|
| starry-night | PASS (on swap retry) | **PASS — first lead-verified pass of this test** |
| comic-hero | `identity=different` ×2 → HELD BACK | FAIL (gate agreed) |

starry-night now shows the subject's narrow oval face, tapering chin, thin arched brows,
light skin and off-centre-parted straight dark brown hair, in unmistakable Van Gogh
treatment, waist-up with proper headroom.

comic-hero remains **HELD BACK**. Its retry swap also came back `style=photoreal` — the
second swap pass overwrote the comic styling. Heavy cel-shaded stylisation appears to fight
identity transfer. It joins egyptian as a non-shipping style until it can pass on its own.

## Gate regression after all three fixes — 5/5

| Check | Result | Want |
|---|---|---|
| identity: old egyptian stranger | different | different |
| identity: shipped renaissance (control) | same | same |
| fidelity: v1 green-eyed egyptian | mismatch | mismatch |
| fidelity: v1 blue-eyed comic-hero | mismatch | mismatch |
| fidelity: shipped renaissance (control) | match | match |

## What this test actually establishes

The two-step face swap works **when the stand-in is built from the subject's real traits**.
Every failure in this test was a trait that the analysis either mis-described (skin tone) or
that the pipeline collected and discarded (hair in run 1, face shape in run 3) — never the
swap model itself. The rule that falls out:

> Any trait the swap does not redraw — skin tone, hair, head geometry — must reach the
> stand-in prompt. If it is in the analysis but not in the descriptor, it is a defect.

Still open: renaissance and elven could not be tested at all (Kling account balance
exhausted, P0, founder action). Child and pet subjects are untested.

## Standing rule, reaffirmed a second time

Three times in this test a gate returned green on an image a human rejected. The gates are a
cost filter, not the acceptance authority. **No image is gallery-eligible on gate approval
alone.**

---

## Run 5 — child subject, same day (2026-08-17)

First test of a non-adult subject on the fixed pipeline.

```
adult-face  x starry-night  → PASS (lead-verified, run 4)
child-face  x starry-night  → FAIL  fidelity=match,
                                    acceptance identity=different (x2, incl. retry)
```

The descriptor confirms all three fixes are working on this subject:

> "a child, young child around 3-5 years old, with Medium-dark brown wavy hair with warm
> undertones. **Medium skin** with warm olive undertones. Deep brown eyes with amber
> highlights., **wearing** Medium-length wavy hair falling just past ear level … ,
> **face shape:** Distinctly round face with very full cheeks, soft jawline, and rounded
> chin creating near-circular proportions typical of early childhood"

Skin tone leads with a scale word ("Medium skin", olive demoted to an undertone — exactly
the fix from run 3), and hair and face shape both reach the prompt. So this is **not** the
run-1/3 defect class recurring. The stand-in was built correctly and the fidelity gate
agreed; the failure is downstream, in the swap itself.

Working hypothesis (NOT yet proven): young children's faces carry far less distinguishing
structure than adults'. Adult identity rides on jaw, brow and cheekbone geometry, which the
descriptor now transfers; a 3-5 year old's face is dominated by the round-cheek/soft-jaw
proportions common to *every* child that age, so the swap has much less to key on and the
identity gate cannot separate this child from a generic one. Confirming or refuting this
needs more child subjects, which we do not have.

**Consequence for launch: children are unproven. Do not put a child portrait on the
homepage, and do not claim children as a supported subject, on the strength of one failed
run.** This is a single data point, not a verdict — but it is a data point in the wrong
direction, and the honest position is "untested/unproven", not "supported".

## Coverage as of end of test

| Subject x style | Verdict | Note |
|---|---|---|
| adult-face x starry-night | **PASS** (lead-verified) | the only gallery-eligible asset produced |
| adult-face x comic-hero | FAIL — held back | identity=different x2; retry also style=photoreal |
| adult-face x renaissance | UNTESTABLE | Kling 1102, P0 #47 |
| adult-face x elven | UNTESTABLE | Kling 1102, P0 #47 |
| child-face x starry-night | FAIL | see run 5 |
| pets | UNTESTED | |
| groups | documented no-go | |

One of six attempted subject x style combinations produced an image a human would accept.
That is the honest state of the face swap today, and it is the reason the homepage rebrand
(#44) cannot complete: three of the four styles the homepage advertises cannot currently
produce a correct image of the subject.
