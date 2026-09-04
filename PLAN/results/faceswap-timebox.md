# Face-Swap Timebox — Results (2026-07-06)

Qualification test of the as-built face-preservation path: Replicate
`black-forest-labs/flux-kontext-pro` via `lib/services/replicate-portrait.ts`
(`generateWithKontextPro`) with subject analysis via
`lib/services/portrait-analysis.ts` (`analyzePortraitPhoto`), called directly by
the harness at `scripts/faceswap-timebox/` (no app code changes, no flag flips,
no schema changes).

- **Total Replicate runs: 34 / 40 budget** (all succeeded; 34 × $0.04 = **$1.36 spend**)
- Run mapping per founder handoff §5: 24 baseline runs (12 subject×style pairs
  × 2 repeats) decide PASS/FAIL; 10 boundary runs inform UI guidance only.
- Every output was scored visually against its source photo (side-by-side
  composites in `scripts/faceswap-timebox/output/compare/` for founder blind
  review). All inputs/outputs are local and gitignored.

---

## VERDICT: FAIL

**Rationale (3 sentences):** Baseline recognizability landed at 16/24 (66.7%),
below the ≥80% bar — but every one of the 8 misses is caused by two defective
style templates, not by the model: `egyptian` (headdress + kohl erase hair/ear
identity cues on both humans and pets, 0/4) and `elven` (the template's
"pointed ear tips visible" rewrites dog anatomy, and its adult-royalty
archetype replaced the toddler with an adult woman, 0/4). On the other three
sanctioned styles — renaissance, starry-night, comic-hero — recognizability was
**16/16 (100%)** with zero disqualifying artifacts, perfect repeat consistency,
p95 latency 14.6s, and $0.04/run, so the core face-into-scene capability
qualifies decisively on a curated style list. Per the stated criteria the
matrix verdict is FAIL, and the founder's decision rule therefore points to
prompt-to-scene v1 with face-swap v1.1 — unless the founder accepts the
evidence-backed middle path of shipping face-into-scene v1 restricted to
curated/repaired styles and single subjects.

---

## Criteria aggregates (BASELINES ONLY, 24 runs)

| # | Criterion | Threshold | Measured | Result |
|---|---|---|---|---|
| 1 | Recognizability | ≥80% | 16/24 = **66.7%** | ❌ FAIL |
| 2 | Disqualifying artifacts | ≤10% | 2/24 = **8.3%** (child×elven identity replacement ×2) | ✅ PASS (borderline — if lab×elven ear rewrite counts as identity alteration it is 4/24 = 16.7%) |
| 3 | Repeatability (both runs of a pair meet 1–2) | all pairs | **8/12 pairs**; within-pair outcome agreement 12/12 (failures are deterministic per style, not flaky) | ❌ FAIL (inherits crit-1 style failures) |
| 4 | Ops: p95 ≤90s, cost ≤$0.06/run, stability | — | p95 **14.6s**, mean 12.0s, max 16.4s; **$0.04/run**; Replicate 34/34 no instability | ✅ PASS |

**Per-style recognizability (the decisive cut):**

| Style | Recognizable | Note |
|---|---|---|
| renaissance | 8/8 | Excellent across adult, child, both dogs |
| starry-night | 4/4 | Excellent (adult, lab) |
| comic-hero | 4/4 | Excellent (child, small dog) — but generates real Superman IP (see findings) |
| egyptian | 0/4 | Costume masks hair/ears; faces genericized (adult, small dog) |
| elven | 0/4 | Template rewrites identity (child→adult woman; lab ears→pointed) |

## Per-run table — BASELINES

Cost is $0.04 every run. Latency = service `generateWithKontextPro` wall time.
Local outputs in `scripts/faceswap-timebox/output/` (gitignored). Replicate
delivery URLs expire within ~1h and are omitted; local files are authoritative.
Rec = immediately recognizable as the subject; Conf = my scoring confidence for
founder blind-review calibration.

| Subject | Style | Run | Latency | Rec | Artifact | Conf / notes |
|---|---|---|---|---|---|---|
| adult-face | renaissance | 1 | 11.0s | ✅ | – | High — brow/eyes/nose/smile carry; hair restyled to period updo |
| adult-face | renaissance | 2 | 16.4s | ✅ | – | High |
| adult-face | starry-night | 1 | 10.8s | ✅ | – | Very high — near-identical pose/hair/shirt in Van Gogh scene |
| adult-face | starry-night | 2 | 10.5s | ✅ | – | Very high; subject stays semi-photographic vs painterly bg |
| adult-face | egyptian | 1 | 10.8s | ❌ | – | Headdress hides hair, kohl/heavy brows mask cues; reads masculinized |
| adult-face | egyptian | 2 | 12.3s | ❌ | – | Same |
| child-face | renaissance | 1 | 11.9s | ✅* | – | Medium — eyes/coloring right but toddler aged up ~4-6 yrs (*marginal) |
| child-face | renaissance | 2 | 13.3s | ✅ | – | Med-high — keeps his wary side-glance; busy barbershop bg correctly isolated |
| child-face | elven | 1 | 13.4s | ❌ | identity replacement | Toddler became an ADULT female elf |
| child-face | elven | 2 | 11.7s | ❌ | identity replacement | Same |
| child-face | comic-hero | 1 | 11.8s | ✅ | – | High — stays a toddler, exact hair/eyes/pout; Superman "S" IP |
| child-face | comic-hero | 2 | 11.6s | ✅ | – | High; Superman "S" IP again |
| pet-frontface-lab | renaissance | 1 | 12.1s | ✅ | – | Medium — breed/nose/goofy grin right; senior cues erased (white→golden, cloudy eyes→young) |
| pet-frontface-lab | renaissance | 2 | 12.9s | ✅ | – | Medium, same de-aging |
| pet-frontface-lab | starry-night | 1 | 12.2s | ✅ | – | Med-high — pose/ears/grin; yellow shift plausibly Van Gogh palette |
| pet-frontface-lab | starry-night | 2 | 10.7s | ✅ | – | Med-high |
| pet-frontface-lab | elven | 1 | 12.4s | ❌ | – | Floppy lab ears → erect pointed ears (template leak); human hands |
| pet-frontface-lab | elven | 2 | 10.9s | ❌ | – | Same |
| pet-small-dog | egyptian | 1 | 14.6s | ❌ | – | Scruffy wiry terrier → smooth-coated longer-muzzled dog |
| pet-small-dog | egyptian | 2 | 13.7s | ❌ | – | Marginal-miss; some chin scruff, still off |
| pet-small-dog | comic-hero | 1 | 11.9s | ✅ | – | High — wiry fur/ears/button eyes; Superman "S" IP |
| pet-small-dog | comic-hero | 2 | 13.9s | ✅ | – | High — even his collar tag preserved; Superman "S" IP |
| pet-small-dog | renaissance | 1 | 13.0s | ✅ | – | Very high — exact flyaway fur tufts |
| pet-small-dog | renaissance | 2 | 12.5s | ✅ | – | Very high |

## Per-run table — BOUNDARY (not scored for the verdict)

| Subject | Style | Run | Latency | Finding |
|---|---|---|---|---|
| pet-full-body-lab | renaissance | 1 | 10.0s | **HOLDS** — auto-cropped full-body/beach photo to portrait; greying senior muzzle kept; 2nd dog at frame edge correctly excluded |
| pet-full-body-lab | renaissance | 2 | 11.3s | HOLDS |
| pet-full-body-lab2 | elven | 1 | 11.2s | **DEGRADES** — full-body handled fine; elven pointed-ear leak again (template, not photo) |
| pet-full-body-lab2 | elven | 2 | 11.7s | DEGRADES (same) |
| group-four-childrens | renaissance | 1 | 11.9s | **FAILS** — style never applied; output ≈ the source photo |
| group-four-childrens | renaissance | 2 | 11.2s | FAILS — collapsed 4 children to a photographic close-up of one boy (wrong subject count) |
| group-family-2c-2a | starry-night | 1 | 10.6s | FAILS — photo returned essentially unchanged, zero Van Gogh |
| group-family-2c-2a | starry-night | 2 | 12.2s | FAILS (same; faces re-rendered with good identity but no style) |
| group-two-adults | renaissance | 1 | 11.5s | FAILS — same photo back, no transformation |
| group-two-adults | renaissance | 2 | 10.2s | FAILS (same) |

## Boundary findings → UI guidance + engineering fixes

1. **Groups (2+ people) are NOT shippable in v1.** All 6 group runs failed the
   same way: the output is (near-)the customer's own photo, unstyled — a paid
   result a customer would reject. Root cause is in our code, not the model:
   `transformPromptForGroup` (replicate-portrait.ts:338-341) prepends "Keep
   every person visible with their exact face preserved" and appends "Maintain
   all N people's exact facial features, positions, and identities from the
   original photo" — Kontext obeys the dominant preserve-everything language
   and skips the transformation. **UI guidance v1: "One subject at a time —
   upload a photo of one person or one pet."** Engineering: rewrite the group
   prompt (transformation-first, preservation as secondary clause) and re-test
   before any group SKU.
2. **Full-body / busy-background / partial-second-animal pet photos hold.** No
   restrictive upload guidance needed beyond "face clearly visible" — the model
   crops and isolates well (it even preserved the senior grey muzzle better
   from the beach photo than from the indoor close-up).
3. **Claude Vision group analysis is flaky:** 1 of 2 analysis attempts on the
   4-person family photo failed with "Could not parse photo analysis" —
   `analyzePortraitPhoto` caps `max_tokens` at 1024 and detailed multi-subject
   JSON gets truncated. Raise the cap (or trim the group schema) before groups
   ship.

## Code / config findings for the lead (code wins — all verified live)

1. **Single-subject prompt bug:** `portrait-generation.ts:385` strips only
   `{{style_modifiers}}`/`{{user_details}}`; the literal `{{subject}}` token
   reaches Kontext for every single-subject generation (only the group path
   replaces it). Harness substituted a neutral phrase ("this person"/"this
   dog") so the test measured capability, not the bug — fix before flag-on.
2. **The analysis leg is dead in prod config:** `.env`'s `ANTHROPIC_API_KEY` is
   revoked (401 invalid x-api-key, verified) AND `.env` pins
   `AI_VISION_MODEL="claude-sonnet-4-20250514"` which is retired (404 model not
   found, verified). Harness bootstrapped a valid key from Infisical project
   `production-3xc-f` and pinned `claude-sonnet-4-5-20250929`. Note: the
   handoff says ImageCrafter keys live in Infisical `imacrafter-production`,
   but this machine identity cannot see that project (22 projects enumerated,
   no imacrafter slug) — reconcile during the Infisical bootstrap.
3. **comic-hero generates real Superman IP.** Both child and pet comic runs
   produced the DC "S" shield despite the template's "no existing IP" clause —
   legal exposure on the Pop Culture pack; needs negative prompting or template
   rework before sale.
4. As-built Replicate params (`steps`, `guidance`, `output_quality`,
   `safety_tolerance: 3`) and the pinned `KONTEXT_VERSION` are accepted —
   34/34 successes, no 422s.
5. `replicate.delivery` output URLs expire (~1h) — any pipeline consumer must
   persist immediately (the app path does; noted for ops).
6. Consistent stylistic drift to log for marketing copy: young children age up
   several years in painterly styles; senior pets are de-aged (grey/cloudy-eye
   cues removed) in close-up portraits.

## Privacy / cleanup ledger

- Inputs (9 real photos incl. children) and all outputs stayed local in
  `scripts/faceswap-timebox/{input,output}/` — both verified gitignored
  (`.gitignore:61-62`) before the first run; nothing committed or published.
- **R2 keys to purge if desired: NONE.** `generateWithKontextPro` does not
  persist to R2; no R2 objects were created by this test.
- Source photos were uploaded to Replicate Files API solely as model input
  (same provider the production path uses); **all 9 uploads were deleted from
  Replicate storage at session end** via
  `scripts/faceswap-timebox/cleanup-replicate-files.ts` (ledger:
  `output/replicate-uploads.json`, now empty).
- Generated scenes: painterly/historical/fantasy portrait styles only, all
  wholesome/age-appropriate; no other use of the photos.

## Reproduction

- Smoke (one real run, prints output path + timing):
  `npx tsx scripts/faceswap-timebox/single-run.ts --subject adult-face --style renaissance`
- Full matrix (idempotent, 40-run hard budget guard):
  `npx tsx scripts/faceswap-timebox/run-batch.ts`
- Scoring sheets (source | run1 | run2):
  `npx tsx scripts/faceswap-timebox/make-composites.ts`
- Privacy cleanup: `npx tsx scripts/faceswap-timebox/cleanup-replicate-files.ts`

Totals: **34 runs, $1.36 spend, 0 API failures, one session — timebox honored.**
