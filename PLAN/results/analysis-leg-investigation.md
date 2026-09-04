# Analysis-Leg Investigation — Report

Date: 2026-07-12 · Branch: vercel-prep · Read-only per founder directive
(`docs/imagecrafter-admin-analysis-leg-investigation.md`). No changes made.

## 1. The analysis call

- **File/line:** `lib/services/portrait-analysis.ts:241` (`anthropic.messages.create`
  inside `analyzePortraitPhoto`).
- **Client:** `@anthropic-ai/sdk` with **no baseURL override** — **DIRECT Anthropic
  API, not LiteLLM** (`portrait-analysis.ts:11,116`).
- **Key:** `process.env.ANTHROPIC_API_KEY` (`portrait-analysis.ts:112`).
  **That key exists NOWHERE:**
  - `.env` — absent. The key that used to be there was **revoked** ("invalid
    x-api-key" = the 401 recorded in prior sessions), documented at
    `scripts/faceswap-timebox/lib.ts:61`, and later removed entirely.
  - Vercel production env — **no ANTHROPIC_API_KEY variable at all** (REST API
    enumeration; only `AI_VISION_MODEL` exists, set 2026-03-18).
  - ImageCrafter Infisical vault (`imagecrafter-production`, 41 secrets) — none.
- **Model:** `AI_VISION_MODEL || "claude-sonnet-4-20250514"`
  (`portrait-analysis.ts:113`). **`claude-sonnet-4-20250514` is RETIRED on the
  org** (`lib.ts:63` finding, 2026-07-06). `.env:203`, `.env.example:57`, and the
  Vercel var (pre-retirement, March) all pin the retired model. The Jul 6–7 test
  harness worked only by pinning `claude-sonnet-4-5-20250929` **for its own
  process** (`lib.ts:87`) — never ported to any production config.
- **The capped shared key:** the test harness fetched `ANTHROPIC_API_KEY` ad hoc
  from the **shared `production-3xc-f` vault** (`lib.ts:73`) — i.e. the
  `litellm-gateway-2026-06-26` key that later hit its $120 cap. Confirms the
  founder's rule violation: a production-adjacent pipeline borrowed the shared
  exploratory credential.

## 2. Fail-closed or fail-open?

**The production path is fail-CLOSED.** `lib/services/portrait-generation.ts:251-264`:

```ts
const analysisResult = await analyzePortraitPhoto(portrait.sourceImageUrl);
if (!analysisResult.success || !analysisResult.analysis) {
  await prisma.portrait.update({ ...status: "failed", errorMessage... });
  return { success: false, error: analysisResult.error || "Could not analyze your photo...", errorType: "quality" };
}
```

**But two fail-OPENs exist:**

1. **`checkStylePresence` degrades silently** (`portrait-analysis.ts:324-364`):
   `if (!anthropic) return "unknown"` / catch → `"unknown"`. The retry loop
   (`portrait-generation.ts:415-429`) only acts on `"photoreal"` — so with a dead
   key the quality gate returns "unknown" for everything and generation
   **proceeds and ships unverified**. All 10 Jul-11 manifest records:
   `verified: false`. A gate that silently goes inert in a fail-closed system.
2. **The gallery runner is fail-open by design** (`scripts/gallery/generate-pair.ts:72-92`):
   live vision fails → falls back to the **cached** Jul-6 analysis and proceeds.
   This is the path that produced the shipped gallery.

## 3. Did analysis fail during the Jul 11 17:11–17:24 run?

**YES — all 10 of 10 manifest records** (`scripts/smoke/output/gallery/manifest.jsonl`)
carry `analysisSource: "CACHED analysis"`; zero `"LIVE vision analysis"`.

**Correction to the working hypothesis:** the failure was NOT a cap refusal. The
gallery runner has no Infisical bootstrap and `.env` has no key, so
`analyzePortraitPhoto` failed as *"AI analysis service is not configured (missing
ANTHROPIC_API_KEY)"* — no network call was ever made. The cap matters only in
that the borrowed-shared-key workaround used Jul 6–7 would also have been refused.
CSVs confirm the cap ($102.07 spike Jul 8 on `litellm-gateway-2026-06-26`, then
$0 Anthropic spend Jul 9–12).

## 4. Step-1 stand-ins vs source: matched or generic?

**The analysis DATA was matched** — the cached JSON is a real, detailed Jul-6
vision analysis of the actual subject (woman, adult, "dark brown to nearly black
straight hair, light-medium skin tone with warm peachy undertones, dark brown
eyes", oval face, high cheekbones).

**The RENDERED stand-ins drifted to generic archetypes anyway** (visually
verified from manifest sceneUrls):

- elven attempt 1 (17:14 UTC): **blonde, blue-eyed elf** — total archetype
  override of near-black hair / brown eyes.
- egyptian (17:19 UTC): dark-skinned generic "Egyptian queen" — subject is
  light-peachy.
- Shipped finals: egyptian has **green eyes**, comic-hero has **blue eyes**
  (source: dark brown).

So the smoking gun is **not** missing analysis data — it's that the style
templates' archetype/palette language and the stand-in generator **override the
descriptor coloring**, and nothing checks the result. Matches the session-4/5
finding "failures 100% template-driven" and the "stand-in fidelity rule" that was
proven in the test but never enforced in production.

## 5. Identity-presence check?

**Does not exist anywhere in the codebase.** The only automated gate is
style-presence, and it is inverted-risk: the retry fires only when the output is
*"photoreal"* — i.e. it pushes outputs AWAY from photoreal, which is away from
source likeness — and it silently accepts everything when the key is dead. A
gorgeous stranger passes "confidently."

## 6. The concrete diff: Jul 7 15/15 vs Jul 11 gallery

| Dimension | Jul 7 test (15/15) | Jul 11 gallery (~2/5 identity) |
|---|---|---|
| Step-1 engine | **Per-style bake-off winners**: Kling (renaissance, egyptian, elven), Nano Banana (starry-night, comic-hero) | Production `generateStandInScene` auto-route → **all 10 scenes from Higgsfield** |
| Stand-in QA | 25 stand-ins **individually lead-QA'd before any swap** (fidelity rule enforced by a human) | **None** — stand-ins went straight to swap; rejection only after the final |
| Vision leg | Live key (borrowed shared) + working model pinned → gates alive | Dead key → cached analysis, style gate inert (`verified:false` ×10) |
| Analysis JSON | Same Jul-6 cached analyses | Same Jul-6 cached analyses (**not the diff**) |
| Prompts | Hand-tuned per corollary rules (§3 of faceswap-two-step.md) | Production templates (egyptian/comic fixed same day; archetype pull remained in elven) |

**The per-style-winner routing and the human stand-in QA were implemented in the
test harness and never ported to the production path.** That is the diff.

**Honest re-verification of the shipped 5** (viewed against the source photo):
renaissance and starry-night carry her identity; **egyptian, elven, and
comic-hero are strangers** (~2/5). The Phase-2 report's "identity recognizable
via face-crop" lead-verification was too lenient on the three stylized styles —
I own that. The founder's ~1/5 observation is substantially correct.

## 7. Root cause, plainly

The gallery shows beautifully-styled strangers because **production step-1
stand-ins are rendered by a single auto-routed engine with templates whose
archetype language overrides the subject's coloring, and no identity check
exists anywhere in the loop.** The dead Anthropic key compounded it: live
analysis was impossible (masked by the gallery runner's fail-open cached
fallback) and the one automated gate (style-presence) silently went inert — but
even with perfect analysis data present, unmatched stand-ins were generated,
swapped, "passed," and shipped, because the only property ever asserted was
style, verified by a dead check and a human bar set too low on stylized styles.

## Side findings (P-0)

- **Customer generation is currently 100% dead in production.** Analysis is
  Step 3 of `generatePortrait`, unconditional and fail-closed; Vercel prod has
  no `ANTHROPIC_API_KEY`. Every user portrait request fails at "analyzing."
- **Adding the dedicated key alone won't fix it** — `AI_VISION_MODEL` pins the
  retired `claude-sonnet-4-20250514` in `.env`, `.env.example`, and Vercel.
  Both the key AND the model must be set.

## Recommended fixes (awaiting founder confirmation — nothing changed yet)

1. Dedicated ImageCrafter `ANTHROPIC_API_KEY` → ImageCrafter vault + Vercel prod;
   `AI_VISION_MODEL` → current available vision model everywhere.
2. Analysis stays fail-closed (it already is); **remove/never port the cached
   fallback** into anything production-facing.
3. Add an **identity-presence gate** symmetric to style-presence (assert same
   person vs source, fail-closed on "unknown"), plus stand-in fidelity check
   before the swap (coloring/demographics vs analysis).
4. Port the per-style engine winners (Kling/Nano Banana) into
   `generateStandInScene` routing; strip remaining archetype-palette clauses.
5. Regenerate the gallery. Acceptance: **same person, painted** — egyptian,
   elven, comic-hero do not ship as-is.
