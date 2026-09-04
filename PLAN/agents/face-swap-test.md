# Agent Brief: face-swap-test (Wave A — run FIRST)

## Hard rules (Xenco Labs non-negotiables — obey without exception)

- Production-quality only. No workarounds. No quick fixes. No mock data. No mock
  fallbacks. If a path can't be made real, it does not ship — it waits.
- Nothing a customer can pay for may map to a delivery you can't actually fulfill.
- Prodigi must be verified in LIVE production mode before any print-to-ship charge is
  possible. Sandbox is not "done."
- Schema-first. Services-layer-always. Do not hardcode prices in the frontend — read
  from Stripe. Do not conflate the two products' data models silently — map them.
- Defer to the running system over any assumption, including the founder's account
  above and including your own training data. Where they conflict, the code wins and
  you flag the conflict.

## Mission

Run the HARD-TIMEBOXED face-swap qualification test (Phase 1 of `PLAN/01-plan.md`).
The as-built face-preservation path is Replicate `black-forest-labs/flux-kontext-pro`
(`lib/services/replicate-portrait.ts:73-81`), wired but flagged off via
`ENABLE_FACE_PRESERVATION`. "Render" does not exist in this repo — you test Replicate.

## Timebox — absolute

One working session. Max 40 Replicate runs (~$1.60 at ~$0.04/run). When either limit
hits, you score what you have and render the verdict. No extensions, no "one more run."

## Scope / files you own (write NOTHING else)

- `scripts/faceswap-timebox/` — test harness (tsx scripts invoking the existing
  service functions `generateWithFacePreservation` / `analyzePortraitPhoto` directly,
  against dev env). NO app code changes. NO schema changes. NO flag flips.
- `PLAN/results/faceswap-timebox.md` — scored matrix + verdict.

## Inputs

- Ground truth §3 (`PLAN/00-ground-truth.md`).
- Founder-supplied real source photos (≥3 known faces incl. 1 pet, 1 couple/group)
  with usage rights. BLOCKER if absent — escalate, do not use stock photos.
- Dev env: `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, R2 dev creds. BLOCKER if absent.

## Test matrix

4 subject types (person, pet, couple, group-3+) × 5 style variants (royal-gallery/
renaissance, masterpiece/starry-night, time-traveler/egyptian, fantasy-realm/elven,
pop-culture/comic-hero) × 2 repeats = 40 runs.

## Success criteria — ALL must hold for PASS

1. Recognizability ≥80% (single-subject outputs immediately recognizable by someone
   who knows the subject; founder judges blind against source).
2. Disqualifying artifacts ≤10% (warped faces, wrong subject count, identity bleed).
3. Repeatability: both runs of each repeated pair meet 1–2.
4. Ops: p95 latency ≤90s; cost ≤$0.06/run; no API instability during the session.

## Definition of done

`PLAN/results/faceswap-timebox.md` exists with: per-run row (subject, style, run#,
latency, cost, criteria scores, output URL), aggregate scores per criterion, and one
unambiguous line: `VERDICT: PASS` or `VERDICT: FAIL`, plus 3-sentence rationale.

## Smoke test (lead re-runs)

`npx tsx scripts/faceswap-timebox/single-run.ts --subject person --style renaissance`
completes one real run end-to-end and prints the output URL + timing.

## Sequencing

Fully parallel with all other streams. Your verdict gates product-merge item 3.3 and
site-redesign copy/assets. Report verdict to lead immediately on completion.
