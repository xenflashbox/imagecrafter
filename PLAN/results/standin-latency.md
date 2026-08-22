# Stand-in latency against the 300s ceiling

**Date:** 2026-08-20
**Reproduce:** `npx tsx scripts/smoke/standin-latency.ts pop-culture comic-hero 12`

## What the ceiling actually is

`ASYNC_POLL_TIMEOUT_MS` (portrait-generation.ts) is spent **per single job**, not
across the request. `const deadline = Date.now() + ASYNC_POLL_TIMEOUT_MS` sits
inside `generatePinnedScene`, so on the two-step path the stand-in leg and the
swap leg each get their own budget. A 300s value is not a 300s product ceiling
on the whole portrait.

## Measurement

`pop-culture/comic-hero` on `higgsfield/nano_banana_pro`, 1847-character prompt.
The probe raises its own ceiling to 900s so the tail is observable; it renders a
stand-in and stops.

| probe | runs | completed | min | max | over 300s |
|---|---|---|---|---|---|
| 1 | 5 | 5/5 | 39.4s | 183.5s | **0/5** |
| 2 | 12 | 12/12 | 39.1s | 373.0s | **1/12** |

17 runs, **zero engine failures** — every job allowed to finish, finished. The
distribution is bimodal-ish: most runs land 39-55s, with occasional excursions
to 150-180s and one to 373s.

## Why the first probe was misleading

Probe 1 reported `0/5 over 300s` while the smoke DB independently held three
real `Stand-in job <uuid> timed out after 300s` rows. Both were true: five runs
is not enough to see a 1-in-12 tail. This is the variance rule (#49) applying to
latency, not just to identity — and the reason the number was re-measured at 12
runs instead of being reported from the 5.

## What this does not measure

Service latency only. It is not an identity result, not a quality result, and
must never be quoted as one.

## Standing decision

The shipped default stays **300s** pending the founder's call on #65. The
constant now reads `Number(process.env.ASYNC_POLL_TIMEOUT_MS) || 300_000` so the
test harness can raise it for a run without changing what customers get. Any run
made under a raised ceiling has to say so in its report.

Recommended number: **480s** — clears the observed max with ~29% headroom while
still failing a genuinely hung job well short of ten minutes.
