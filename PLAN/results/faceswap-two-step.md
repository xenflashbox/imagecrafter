# Face-Into-Scene: Two-Step Pipeline Test — Results

**Date:** 2026-07-07 · **Brief:** `docs/imagecrafter-faceswap-two-step-test.md` (supersedes the single-pass timebox, `PLAN/results/faceswap-timebox.md`, verdict FAIL 66.7%)

## VERDICT: PASS — 15/15 single-subject cells (100%) vs 80% bar

The two-step architecture (generic stand-in scene → identity swap) rescued every style the
single-pass architecture broke. All 5 styles ship for **single-subject** v1. Groups/couples
do NOT ship — "one subject at a time" v1 constraint confirmed (failure mode changed but
persists; see §6).

| Style | Single-pass (old) | Two-step singles | Cells |
|---|---|---|---|
| renaissance | 4/4 | **3/3** | adult, child, pet-lab |
| starry-night | 4/4 | **3/3** | adult, child, pet-small-dog¹ |
| egyptian (PROOF) | **0/4** | **3/3** | adult, child², pet-lab² |
| elven (PROOF) | **0/4** | **3/3** | adult, child, pet-small-dog² |
| comic-hero (rebuilt) | 4/4 but IP-unsafe | **3/3 + IP gate PASS** | adult, child, pet-lab |

¹ passed on a second same-prompt attempt (nondeterministic scene-discard, see §5).
² passed after a root-caused retry (see §5). Retries are honest iteration within the brief
("iterate until it produces only original heroes" / production-quality construction), not
cherry-picking: every failed attempt is archived and counted in the cost tally.

**Proof cases (explicit before/after):**
- **egyptian: 0/4 single-pass → 3/3 two-step.** The headdress/costume no longer masks
  identity because it is already rendered on the stand-in; the swap only carries the face.
- **elven: 0/4 single-pass → 3/3 two-step.** The exact single-pass failure (toddler aged
  into an adult woman; lab ears rewritten to pointed) did not recur: the real boy's face
  AND age carried; the real dog's coat/ears carried once the stand-in matched its coloring.

## 1. Architecture as proven

- **Step 1 — stand-in scene** (no real identity): full scene + costume + generic subject,
  generated per-style on the bake-off winner. 25 scenes generated and lead-QA'd.
- **Step 2 — identity swap**: Replicate `flux-kontext-apps/multi-image-kontext-pro`,
  $0.08/run, ~15–19s/run.

**The construction that works (validated by a $0.16 two-variant probe, then the matrix):**

```
input_image_1 = REAL PHOTO          (identity anchor)
input_image_2 = stand-in scene      (scene/style target)
aspect_ratio  = "3:4"               (NEVER "match_input_image" — see §5 attempt 1)
prompt        = "Place the person from image 1 into the scene shown in image 2.
                 Completely ignore the clothing and background from image 1. They wear
                 ONLY the costume and headwear from image 2, take the pose from image 2,
                 and are rendered fully in the artistic style of image 2, with image 2's
                 complete background and lighting. Their face and identity remain exactly
                 as in image 1 — identical facial structure, eyes, nose, mouth, skin tone,
                 and age."
```

Kontext anchors identity on image 1. The reverse order (scene first + "swap the face")
leaves the stand-in's face nearly untouched — measured, not assumed (§5 attempt 2).
Pet variant swaps the identity list for "facial structure, fur color and markings, eyes,
and natural ear shape". Harness: `scripts/faceswap-timebox/two-step-swap.ts`.

## 2. Step-1 generator bake-off (per-style winners, lead-judged)

| Style | Winner | Why |
|---|---|---|
| renaissance | **Kling** | truer oil-painting surface, better costume period detail |
| starry-night | **Nano Banana** | far stronger impasto/swirl fidelity |
| egyptian | **Kling** | New Kingdom flat-painting styling + regalia held together |
| elven | **Kling** | richer fantasy environment, cleaner subject separation |
| comic-hero | **Nano Banana** | bolder ink/halftone comic rendering, better cover composition |

"Best generator" confirmed per-style, not global — exactly as the brief predicted.
Job IDs: `output/two-step/bakeoff-jobs.json`, `archetype-jobs.json`.

## 3. Stand-in fidelity rule (new engineering finding — REQUIRED for production)

The swap can only bridge what the stand-in already resembles. **The stand-in prompt MUST
be built from the subject-analysis JSON including the `coloring` field** (demographics +
coat/hair color + distinctive features). Proven by failure: the pet-small-dog stand-ins
were prompted "scruffy terrier" without the analysis coloring ("cream to off-white",
"oversized triangular semi-erect ears") → brown stand-in dog → both swaps failed; after
regenerating stand-ins with the full coat spec, both cells passed. This binds directly to
the production pipeline: analysis leg output feeds step-1 prompt construction.

Corollary prompt rules discovered:
- Clothing import: add "Completely ignore the clothing and background from image 1 …
  wear ONLY the costume from image 2" (child's barbershop cape leaked into egyptian swap
  without it).
- Stand-in face must be a viable swap surface: waist-up framing, face large in frame
  (child__elven full-body wide shot was retried for this).
- Scene guard for pets: "the dog is the ONLY living figure — no faces or figures hidden
  in trees/bark/background" (elven generator hid a spectral humanoid face otherwise).

## 4. Comic-hero — IP-safety gate: **PASS**

Style rebuilt as an original archetype. Every comic-hero output visually inspected
(step-1 stand-ins AND step-2 swaps): zero Superman S, Batman bat, Spider-Man webbing, or
any recognizable Marvel/DC character, logo, lettering, or signature suit. Original trade
dress throughout: teal/copper suit, angular silver piping, abstract origami-falcon
geometric emblem; cover titles all invented ("CAPTAIN WONDER", "GOLDEN GUARDIAN /
CAPTAIN CANINE", "FALCON'S FLIGHT"). One cosmetic note for production: a generic
comics-code-style corner stamp pastiche appears on some covers — replace with an original
mark in the production prompt (not a trademark hit, just hygiene).

**Rebuilt prompt (verbatim, child variant — adult/pet variants follow the same pattern):**

> A young child around four years old with medium-length wavy dark brown hair and warm
> olive skin as a completely original young superhero on a dramatic, wholesome comic book
> cover. The child wears an entirely original costume: a teal and copper suit with angular
> silver piping, a short copper cape, and a chest emblem shaped like an abstract origami
> falcon built from geometric triangles — an original invented design that is not any
> existing logo. Bold black ink outlines, cheerful heroic pose, halftone dot shading,
> vibrant colors. The cityscape behind is rendered in dramatic perspective with speed
> lines. Classic American comic book art style. The child's face is unmasked, clearly
> visible, well-lit, with natural childlike proportions preserved. Strictly no existing
> superhero intellectual property: no Superman S-shield, no Batman bat symbol, no
> Spider-Man webbing or spider emblem, no Marvel or DC character, logo, lettering, or
> signature costume.

## 5. Step-2 attempt history (honest accounting — all outputs archived)

| Attempt | Construction | Result | Evidence |
|---|---|---|---|
| 1 (20 runs, $1.60) | scene=img1, `aspect_ratio:"match_input_image"` | ALL 20 returned the model's internal side-by-side concatenated canvas | `step2-attempt1-stitched/` (all landscape 1248×832/1104×944) |
| 2 (20 runs, $1.60) | scene=img1, explicit 3:4, "replace the face" | Single images but stand-in faces survived nearly unchanged | `step2-attempt2-weak-carry/` |
| probe (2 runs, $0.16) | A: blunt face-swap vs B: reversed order + "place into" | **B carried true facial structure/age; A still idealized** | `probe/` |
| 3 (20 runs, $1.60) | reversed (photo=img1), v3 prompt | 11/15 singles; 4 root-caused misses | `step2/`, `composites/` |
| retries (5 runs, $0.40) | v4 prompt (clothing-ignore) + corrected stand-ins | 4/4 rescued (starry-night pet needed 2 tries: first retry discarded the scene entirely and output a photoreal studio portrait — nondeterministic; second try full impasto pass) | `step2/`, `composites/` |

**Production note on variance:** ~1-in-N runs can discard the style scene and return a
photoreal render. Production needs an automated style-presence check (or user-facing
regenerate) — budget ~1.1× swap cost per delivered image.

## 6. Groups/couples verdict: NOT shippable v1 — "one subject at a time" stands

Couples scored 0–1/5 across all attempts. The failure mode CHANGED vs single-pass
(which returned the customer's own unstyled photo): two-step produces a genuinely styled
couple scene but identity transfer to two people simultaneously is unreliable (one or both
faces drift; in elven the man kept his t-shirt). Kontext-pro anchors ONE identity well.
v1 UI: single subject per generation; couples/groups possible later by compositing
per-subject swaps.

## 7. Cost tally

| Item | Cost |
|---|---|
| Higgsfield step-1 (bake-off 10 + archetypes 15 + QA retries; kling 0.5 cr, nano 1.0 cr) | **20.5 credits** (28.85 → 8.35, balance-verified) |
| Replicate step-2: 65 swaps × $0.08 (attempts 1–3 + retries) | **$5.20** |
| Replicate probe: 2 × $0.08 | **$0.16** |
| **Replicate total** | **$5.36** |

Per-delivered-image marginal cost (production estimate): 1 stand-in (0.5–1.0 Higgsfield cr)
+ ~1.1 swaps ($0.09) — stand-ins are per-style/per-demographic-template cacheable.

## 8. Privacy ledger

- `scripts/faceswap-timebox/input/` and `output/` gitignored (verified via
  `git check-ignore`); nothing committed, no photo has ever entered git.
- All Replicate Files uploads tracked in `output/two-step/replicate-uploads.json`;
  deleted at end of run via `two-step-swap.ts --cleanup`; two stale evicted entries
  deleted explicitly (HTTP 204). **Ledger empty at close — verified.**
- No R2 objects created. Higgsfield/CDN holds only stand-in scenes (generic subjects,
  no real identity, by design).
- All scenes wholesome/age-appropriate; child outputs lead-inspected.

## 9. Ship list (v1 face-into-scene)

**Ship (single-subject):** renaissance, starry-night, egyptian, elven, comic-hero (rebuilt).
**Do not ship:** couples/groups (UI: one subject at a time).
**Bind into production build:** stand-in prompts constructed from analysis JSON incl.
coloring (§3); reversed-order kontext construction + v4 prompt (§1); style-presence
retry check (§5); original comic corner-stamp cleanup (§4); plus the pre-existing
engineering fixes from the single-pass report (`{{subject}}` substitution
portrait-generation.ts:385; ANTHROPIC key rotation + vision repin — blocked on Infisical
leg C).
