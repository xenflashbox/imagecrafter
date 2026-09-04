# Phase 1 Report — Wire ImageCrafter to live image-gen service (2026-07-11)

Verdict: **DONE — proven with live output, not claims.**

## 1. P-0 incident: image-gen Higgsfield provider returned a canned thumbnail as every "generated" image

- Symptom: 3 distinct prompts → 3 byte-identical images, md5 `f784c4e678219a74ed19ec4a96d540a7`
  (62,058-byte 16:9 golf-scene webp = Higgsfield "Location" style preset thumbnail at
  `https://cdn.higgsfield.ai/soul-cinematic-style/8ea830be-845d-48f2-b487-401c8bbb5ef1.webp`),
  while the service reported success and healthy. Real Higgsfield generations DID occur and
  were paid for — their outputs were discarded by the bug.
- Root cause: Higgsfield's normalized job envelope began embedding the style preset object in
  `params` (schema drift after 2026-07-08). The node-order DFS in
  `higgsfield_provider._extract_first` hit `params.style.url` (preset thumbnail) before
  `results.rawUrl` (the real image). Confirmed by live MCP envelope replay (job
  `bd7f6be1-3a0e-4e54-a203-e9cecd7aa351`).
- Fix (`gemini-image-gen` commit `baca851`): key-priority search (exhaust the payload for
  `rawUrl` before weaker keys) + `_URL_EXCLUDE_SUBTREES` (params/style/meta/debug/input never
  mined for asset URLs) + `result_url`/`min_result_url`/`minUrl` added to `_URL_KEYS`.
- Tests: 3 regression tests using verbatim 2026-07-11 live envelope captures, incl. a poll test
  whose transport hard-fails on any request to cdn.higgsfield.ai. Suite: **22/22 wave2 provider
  tests pass**. (Pre-existing, unrelated: 1 fail + 6 errors in test_api/test_providers from
  `/srv/image-gen` host permission — identical before the change, verified via stash.)
- Deploy: swarm runbook is STALE — the service actually runs as three plain docker containers
  on host `xenco` (100.112.50.136): `image-gen-api` (:8095→8000), `image-gen-worker`,
  `image-gen-mcp` (:8100). Deployed `registry.xencolabs.com/gemini-image-gen:fix-baca851`
  (digest sha256:10dc67a6…), recreated all three with identical flags/env (env copied
  container→container on the host, never printed). Rollback = recreate from `fix-1bdb596`
  (still on host). Health: public `/health` 200 healthy, all providers healthy.
- CORRECTION to earlier claims: the 2026-07-11 single/dual smoke "GREEN" stands for flow/DB
  wiring, but the higgsfield images in those runs were the canned thumbnail. The OpenAI leg was
  verified REAL (distinct lighthouse image). Post-fix, the two-step smoke captured two REAL
  higgsfield generations through the same `/api/v1/generate` path (hashes `1dc2c7c2…`,
  `d9412dbe…` — distinct, prompt-matching renaissance portraits).

## 2. Two-step face-into-scene: REAL end-to-end pass (production functions, no reimplementation)

`scripts/smoke/service-two-step.ts` exercises `buildStandInDescriptor` →
`buildStandInScenePrompt` → `generateStandInScene` (live service) → `swapFaceIntoScene`
(Replicate multi-image-kontext-pro) → `checkStylePresence`.

Final passing run (renaissance, adult-face):
- Stand-in scene: `https://image-storage.xencolabs.com/higgsfield/2026/07/11/higgsfield-8f047687b27.png`
  (35.4s) — REAL renaissance noblewoman, gender-matched, NOT the customer.
- Swap: 13.1s → `scripts/smoke/output/two-step-adult-face-renaissance.png` (1,289,082 bytes).
- Manual quality gate (checkStylePresence dead-keyed, see §4): style PRESENT (renaissance
  costume/palette/painterly backdrop), identity RECOGNIZABLE (oval face, high cheekbones,
  narrow straight nose, lip shape, dark brown hair all match the input photo). Lead-verified
  visually at face-crop zoom.
- Scene prompt: all `{{…}}` placeholders replaced (smoke hard-fails on any remaining).
- Real spend, no mocks; outputs land in gitignored `scripts/smoke/output/`.

Descriptor finding: an earlier run produced a MALE stand-in for the female subject → weak
identity swap. Cause: the cached timebox analysis JSON predates the production vision schema
and lacked `genderPresentation`/`ageBracket` (production `portrait-analysis.ts` schema requests
both). Cache completed from its own real content (description says "A woman…") — production
code path unchanged and correct once the live key works.

## 3. Privacy fixes landed (production code)

- `portrait-analysis.ts`: no longer logs full data URIs (was dumping the customer's photo
  base64 into logs).
- `replicate-portrait.ts`: Replicate's fetcher is 403'd by Cloudflare bot protection on
  image-storage.xencolabs.com → images now fetched server-side and uploaded via Replicate
  Files; temporary uploads (incl. the real photo) ALWAYS deleted in `finally` with loud error
  log on failure. One leaked smoke upload from an early run was manually deleted (HTTP 204,
  ledger empty).

## 4. Residual risks / founder items (unchanged ownership)

1. **ANTHROPIC_API_KEY dead (verified 401)** → live vision analysis AND the automated
   style-presence retry gate are non-functional. Until rotation, the ~1-in-N "swap discards
   style" failure mode passes unchecked in production. Rotation = founder/vault item.
2. `ENABLE_FACE_PRESERVATION` + `REPLICATE_API_TOKEN` must be present in Vercel prod env for
   the production flow (verified locally only).
3. Migration `20260705_generation_request_dual_engine_tier_collapse` not applied to prod main
   (applied on Neon smoke branch only).
4. Dedicated image-gen API key for imagecrafter `source_app` attribution not issued.
5. Comic-hero corner-stamp prompt hygiene (DB templates) outstanding.
6. `/tmp/ic_smoke_db` retained for Phase 2; delete at Phase 2 close. `/tmp/ig_key` deleted.
