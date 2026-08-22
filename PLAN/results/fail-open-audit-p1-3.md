# P1#3 Fail-Open Audit — every `catch` + hollow-return in ImageCrafter, classified

**Date:** 2026-07-13 · **Directive:** `docs/imagecrafter-fix-analysis-and-identity-gates (2).md`, P1 item 3
**Rule applied:** *a caught error either surfaces or fails closed — it never returns a hollow success.*
**Scope:** `app/`, `lib/`, `components/` (113 `catch` sites across 43 files, plus the
`if (!x) return <empty/default>` sweep). `scripts/` excluded from production classification —
the one production-facing script fail-open (gallery runner cached-analysis fallback) was
already removed under P1#2; the vault-borrowing in `scripts/faceswap-timebox/lib.ts` was
removed under P0.

**Verdict summary: 13 hollow-success BUG instances found. All 13 FIXED this session.
Everything else classified CORRECT or DELIBERATE-SIGNALED (listed below with reasons).**

---

## 1. BUG — hollow success (all fixed 2026-07-13)

The named instance and its whole blast radius — the CMS/blog family:

| # | Location | What it did | Fix |
|---|---|---|---|
| 1 | `lib/payload.ts` `getBlogPost` (was :448) | `catch { return null }` — a CMS outage rendered as a **404** for a post that exists | catch removed; error propagates |
| 2 | `lib/payload.ts` `getRelatedPosts` (was :483) | `catch { return [] }` — related posts silently vanish | catch removed |
| 3 | `lib/payload.ts` `getAllPostSlugs` (was :505) | `catch { return [] }` — dead CMS = "blog with no posts" at build time | catch removed |
| 4 | `lib/payload.ts` `getCategories` (was :524) | `catch { return [] }` — categories silently vanish | catch removed |
| 5 | `app/blog/page.tsx` (was :77–84) | `.catch(→ empty docs/[])` — blog index renders "no posts" as a healthy page | wrappers removed; error page surfaces |
| 6 | `app/blog/rss.xml/route.ts` :38 | catch → proceed with `posts=[]` → **valid empty RSS with HTTP 200** that feed readers cache | now returns **503 + Retry-After** on CMS failure |
| 7 | `app/admin/blog/page.tsx` (was :27) | `.catch(→ empty)` — the admin sees "0 posts" instead of the failure | wrapper removed |
| 8 | `app/(marketing)/page.tsx` (was :151) | `getStylePacks().catch(→ [])` — **the gallery IS the homepage**; a dead DB rendered as a homepage with a silently missing gallery. Same class that shipped strangers. | wrapper removed; error surfaces |

Money path:

| # | Location | What it did | Fix |
|---|---|---|---|
| 9 | `app/api/webhooks/stripe/route.ts` Prodigi catch (was :411) | Comment claimed "can be retried" but the failure was **only a log line** — a paid print order that never reached Prodigi was invisible in the DB | webhook still returns 200 (payment settled) but order now persists `prodigiStatus: "submission_failed"`; the skip branch (missing hi-res/address) persists `"submission_blocked_missing_data"` |

Client-side silent catches (user saw nothing while the feature was dead):

| # | Location | What it did | Fix |
|---|---|---|---|
| 10 | `app/(dashboard)/gallery/page.tsx` :140, :158 | image/portrait load failure → console only → "No images yet" empty state shown as healthy | `loadError` state + visible banner |
| 11 | `app/(dashboard)/generate/page.tsx` :204, :223 | template/credit load failure → console only; existing `error` banner only rendered on step 4 | failures now set `error`; banner rendered on all steps |
| 12 | `app/(dashboard)/dashboard/page.tsx` :100, :130 (+ usage-error branch) | fetch failure → console only, `loading=false`, zeroed stats look healthy | `loadError` state + visible banner |
| 13 | `app/portraits/create/page.tsx` :640 | "Save to Account" failure → console only; user believes it saved | `saveError` state + visible message under the button |

Plus one loud-logging hardening (signaled failure, but the failure paths were silent):
- `lib/services/portrait-generation.ts` `enhanceCustomScenePrompt` — `if (!AI_GATEWAY_KEY) return null`, `if (!response.ok) return null`, bare `catch { return null }` all now `console.error` before returning. The `null` itself is NOT hollow success: the caller explicitly handles it with a documented deterministic fallback prompt.

---

## 2. CORRECT — surfaces the error / fails closed (no change)

**API routes returning 4xx/5xx on error:**
`portraits/style-packs`:44 · `prompts/history`:85 · `portraits/upload`:63,155 ·
`images/download`:95 · `images/requests/[id]/select`:67 · `usage`:86 · `newsletter`:71,105 ·
`webhooks/clerk`:51 (invalid signature → 400), :75 (handler error → 500) ·
`portraits/generate`:50,152 · `webhooks/stripe`:106 (bad signature → 400), :151 (→ 500 so Stripe retries) ·
`webhooks/prodigi`:44 · `images`:109 · `print/order`:32 · `portraits/[id]`:96,209 ·
`images/generate`:193 · `cron/cleanup-expired`:83,103,167 (errors collected and reported in the response body)

**Services that fail closed:**
- `lib/services/image-generation.ts`:444, :672 (`failRequest` + credit refund), :1036 (`{success:false}`); :163, :186 (json=null but rawText+HTTP status preserved and surfaced)
- `lib/services/portrait-generation.ts`:235, :256, :310 (return `{error}` — analysis leg is fail-closed per P1#1), :653 (marks portrait `failed`)
- `lib/services/portrait-analysis.ts`:298 (`{success:false}`); :334/:366 (style), :390/:427 (identity), :453/:462/:494 (fidelity) — all return `"unknown"`, and **"unknown" BLOCKS at every caller** (fail-closed, verified `portrait-generation.ts`:526 and :587 — the P1#1/P2 fix)
- `lib/services/file-storage.ts`:97, :142, :184 (`{success:false}`)
- `lib/services/download-token.ts`:31 (`false`), :73 (`{valid:false}`)
- `lib/services/replicate-portrait.ts`:152 (propagates), :182 (privacy cleanup failure logged loudly by design)
- `lib/services/watermark.ts`:99, :130 (`{success:false, error}`)
- `lib/r2.ts`:105, :149 (`{success:false}`), :213, :235 (return `false` — callers check)
- `lib/services/print-fulfillment.ts`:360 (`if (!requestSecret) return false` — webhook auth **fails closed** when secret unset)

**Deliberate guest-flow catches (`auth()` throws when no Clerk session — dual-flow semantics, not fail-open):**
`orders/create`:87 · `orders/[id]`:31 · `portraits/upload`:52 · `portraits/generate`:35 ·
`portraits/[id]`:133,149 · `portraits/[id]/preview` page:38 · `portraits/[id]/success` page:45

**Client catches that already surfaced errors to the user:**
`history/page.tsx`:81 (`setError`), :125/:144 (action failures — item state visibly unchanged) ·
`NewsletterSignup`:33 · `portraits/create`:558, :599 (`setUploadError`/`setGenerationError`) ·
`DualPickPanel`:70 · `generate/page`:361 (`setError`) · `gallery/page`:198 (optimistic-update revert)

**Analytics helpers — compliant by design (documented):**
`lib/services/tiktok-events.ts`:116 and `lib/services/meta-events.ts`:123 never throw
(analytics must not break registration/checkout) but return `{success:false, error}` and
`console.error` loudly — a signaled failure, not a hollow success.

---

## 3. BORDERLINE — signaled/explicit degradation, kept (with reasons)

| Location | Behavior | Why kept |
|---|---|---|
| `lib/r2.ts`:186 | thumbnail generation fails → logs, returns **original buffer** as thumbnail | explicit, logged, no data loss — degraded quality, not hidden failure |
| `lib/r2.ts`:267 | URL parse fails → returns input unchanged | benign normalizer |
| `lib/r2.ts`:309 (`fetchImageBuffer`) | fetch fails → logs, returns `null` | caller (async R2 mirror, :336) checks null, logs, aborts the mirror; image keeps serving from source URL — signaled |
| `lib/r2.ts`:385, :405 | async post-upload mirroring fails → logs, continues | background optimization; primary artifact already persisted |
| `webhooks/prodigi`:128 | shipping-notification email fails → logged, webhook continues | order/fulfillment state already persisted; email is a notification. Comment documents it |
| `lib/services/prompt-enhancement.ts`:165 | AI gateway fails → **re-throws if `AI_ENHANCEMENT_REQUIRED`**, else `null` → template fallback | env-controlled, documented contract; failure logged |
| `lib/services/prompt-enhancement.ts`:438 | JSON parse fails → structured-from-text fallback | retains the actual model content; nothing fabricated |
| `generate/page`:400 | download-as-file fails → opens image in new tab | user-visible alternative, not a silent failure |

**`if (!x) return <empty/default>` sweep** — remaining hits are guards, not fail-opens:
formatters returning `""` for absent optional fields (`payload.ts`:157,188,196,219,236,336,349,352 ·
`blog/page`:57), ownership scoping (`orders/download`:58 → 404), feature flags
(`replicate-portrait`:48 `ENABLE_FACE_PRESERVATION`), model lookup (`image-generation`:205 —
caller errors on null), React render guards (`reviews`:303), auth fail-closed
(`print-fulfillment`:360), and the portrait-analysis `"unknown"` returns which block (above).

---

## Standing rule (now enforced in code)

Every `catch` in ImageCrafter now does one of: **(a)** propagate/return an error the caller
must handle, **(b)** persist a failure state (orders), **(c)** show the user an error, or
**(d)** log loudly while taking an explicit, documented degradation path. Zero sites remain
that swallow an error and return empty/default/stale data as if healthy.
