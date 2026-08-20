# comic-hero IP gate — proof on both legs

**Date:** 2026-08-20
**Reproduce:** `npx tsx scripts/smoke/ip-gate-demo.ts`

## Why the gate exists

The comic-hero prompt template already bans the S-shield, the bat symbol, spider
webbing and named Marvel/DC marks in explicit prose. The engine drew a
Superman-shaped pentagonal shield anyway. Prompt-level bans are advisory — the
engine is sampling a corpus where those marks *are* what a superhero looks like.
Detection is the only defence left. An infringing image reaching a paying
customer, or a print run, is not a defect that can be settled after launch.

## The two fixture images

| leg | image | truth (verified by eye, chest region cropped and upscaled) |
|---|---|---|
| REJECT | `e2e17872557575952-v1-preview.png` (dog run) | orange **pentagonal shield** border with a bird inside — the Superman badge outline the template bans |
| ACCEPT | `e2e17872603977073-v1-preview.png` (child run 3) | bare origami falcon of geometric triangles, **no enclosing border at all** — the intended original design |

Both were inspected directly, not inferred from run notes.

## Result

**20/20 on both legs**, ten consecutive runs of the two-case demo.

## What did NOT work, and why it matters

Two earlier single-call designs each got one leg wrong, and the failure mode is
worth recording because it will recur in any vision gate written this way.

**1. One call, `max_tokens: 16`.** The model answers before it has looked.
Cleared the Superman shield outright.

**2. One call, `max_tokens: 300`, ban list stated up front.** Worse in a subtler
way: it rejected the *intended original design* 4 times in 5, reporting a
"five-sided shield shape that comes to a point at the bottom" around an emblem
that provably has no border. **Naming Superman's badge in the question primed
the answer** — the model found what it had been told to look for. Widening
`max_tokens` only changed which leg it got wrong.

A secondary defect in the same prompt: the clause "any Marvel or DC character,
logo, wordmark, or title lettering" was read as *any title lettering*, so an
invented "FALCON SQUAD #1" masthead — exactly what a comic cover is supposed to
carry — was scored as infringing.

## The design that works: look first, judge second

Two calls.

1. **Perception (unprimed).** Describes the emblem with no mention of
   infringement, trademarks, or any existing hero: is there a border, what shape,
   what does the artwork depict, what text is present. Measured **8/8 accurate**
   across both fixtures — perception was never the weak link.
2. **Policy (text only).** Applies the ban list to that description. It cannot
   see the image, so it cannot bend the observation to fit a criterion.

One further fix was needed at the policy step. Given "a shield-shaped border" it
still cleared the image 3 times in 19, reasoning that the shield was
*sufficiently different* from Superman's. The rule is bright-line, not a
similarity judgement, and the prompt now says so explicitly: the word is enough,
and original artwork inside a borrowed border is not a reason to clear it.

## Wiring

- Runs inside the **shared** `assessOutput`, so both the single-pass and
  two-step architectures are covered by one insertion.
- Gated by `IP_SENSITIVE_STYLES` — comic-hero only. The other styles draw on
  public-domain art movements; spending a vision call to ask whether a
  16th-century oil painting infringes Marvel would be waste.
- **Fail-closed**: only `clean` passes. `unknown` blocks.
- A rejection triggers the existing fresh-stand-in retry, which is a real
  remedy: run 3 of the child cell produced a clean emblem where runs 1-2 did not.
- The reasoning trail is logged on **pass as well as fail**. A cleared image is
  the one that reaches a customer and a print run, so its basis has to be
  auditable after the fact.

## Standing caveat

This gate proves the *emblem outline* and *named-property* axes on two fixtures.
It is a cost filter, not the acceptance authority — the standing rule holds: no
image is gallery-eligible on gate approval alone.
