# Single-pass vs two-step A/B — 2026-08-18

Founder mandate: *"Analyze the results and see if we can adjust the two step process
to get different results. We need to have this pass all test so we can deploy."*

Both architectures were measured on the SAME subjects through the SAME acceptance
gates (`checkIdentityPresence` + `checkStylePresence`), N=3 per cell, and every
output was adjudicated by eye. Gate approval was never treated as acceptance.

## The two architectures

| | two-step (current production) | single-pass (retired, re-measured here) |
|---|---|---|
| identity path | photo → English description → stand-in image → face swap | photo → styled image |
| models | vision analysis + per-style engine + `multi-image-kontext-pro` | `black-forest-labs/flux-kontext-pro` |
| latency | ~60s | **~13s** |
| cost | $0.10–0.16 / pair | **$0.04 / run** |
| variance | high (control 2/3) | low (control 3/3, twice) |

The two-step launders identity through English text. Everything the swap cannot
redraw — skin tone, hair, head geometry, build — is inherited from an image built
out of *words*. Every identity defect found on 2026-08-18 lived in that round trip.

## Result: single-pass (with age restatement), N=3, lead-adjudicated

| style | adult (control) | child 3–5y | heavyset adult | dog |
|---|---|---|---|---|
| **renaissance** | **3/3** | **3/3** | **3/3** | **3/3** |
| **starry-night** | 2/3 | **3/3** | **3/3** | — |
| elven | 2/3 | 2/3 | **0/3** | — |
| comic-hero | 1/3 | — | — | — |

Two-step on the same hard subjects: child **0/4 swaps** (lead-adjudicated genuine
strangers), heavyset adult inconsistent, beach dog FAIL, control 2/3.

**Single-pass fixes every subject that was blocking launch on renaissance.**

## Two findings that decide the routing

1. **The age restatement is required, and is the only descriptive constraint that
   helps.** Without it single-pass rendered the 3-year-old as a teenager in 3/3
   runs. With the same literal restatement that fixed the two-step swap leg, the
   same subject went to 3/3 PASS.

2. **A gender restatement is actively harmful — do not add one.** The heavyset
   adult rendered masculine in 1 of 3 runs, so `"MUST be rendered unmistakably as
   <gender>"` was tried. It pulled the model toward a generic slender feminine
   ideal and erased her build: **3/3 → 0/3 → 3/3** on revert. Causally clean. The
   photo already carries gender; restating it invites idealisation.

3. **comic-hero cannot use single-pass — it is an IP risk, not a quality
   preference.** The template *explicitly* forbids the Superman S-shield. Kontext
   ignored the negation and produced a literal S-shield in 2 of 3 runs. The
   two-step stand-in leg respects the prohibition (comic IP gate PASS, 15/15 run).

4. **elven idealises the body.** Single-pass put the heavyset subject in a slim
   elf archetype 3/3 — consistent with the archived single-pass elven score of
   0/4. Two-step rescued elven 0/4 → 3/3.

## Recommendation: per-style architecture routing

The same pattern already used for per-style engine pinning, with measured winners:

| style | architecture | why |
|---|---|---|
| renaissance | **single-pass** | 12/12 across adult, child, heavyset, dog; 5× faster, 4× cheaper |
| starry-night | **single-pass** | 8/9 |
| elven | **two-step** | single-pass 4/9 and idealises body type |
| comic-hero | **two-step** | single-pass emits trademarked IP despite explicit prohibition |
| egyptian | cut (task #54) | permanent structural hold |

This keeps the two-step flow exactly where it earned its place — the two styles it
was adopted to rescue — and removes the lossy text round trip from the two styles
where it is the sole cause of the identity failures now blocking launch.

## Test hygiene

Real-face inputs and all outputs are gitignored (`.gitignore` 61/64/66); nothing
from the sample set is committed. Every temporary Replicate upload is deleted in a
`finally` block on every run, pass or fail.
