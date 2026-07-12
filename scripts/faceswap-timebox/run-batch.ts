/**
 * Face-swap timebox — batch runner (founder-specified run mapping).
 *
 * Usage: npx tsx scripts/faceswap-timebox/run-batch.ts
 *
 * Sequential, idempotent (skips runIds already in output/results.json),
 * hard budget guard at MAX_RUNS (40). Baselines score PASS/FAIL; boundary
 * cases inform UI guidance only.
 */

import { loadEnv, runOne, loadResults, MAX_RUNS } from "./lib";

// subject, style, repeat
const PLAN: Array<[string, string, number]> = [
  // ---- BASELINES (24 runs incl. validation run 1) — decide PASS/FAIL ----
  ["adult-face", "renaissance", 1], // run 1 (validation) — already done
  ["adult-face", "renaissance", 2],
  ["adult-face", "starry-night", 1],
  ["adult-face", "starry-night", 2],
  ["adult-face", "egyptian", 1],
  ["adult-face", "egyptian", 2],
  ["child-face", "renaissance", 1],
  ["child-face", "renaissance", 2],
  ["child-face", "elven", 1],
  ["child-face", "elven", 2],
  ["child-face", "comic-hero", 1],
  ["child-face", "comic-hero", 2],
  ["pet-frontface-lab", "renaissance", 1],
  ["pet-frontface-lab", "renaissance", 2],
  ["pet-frontface-lab", "starry-night", 1],
  ["pet-frontface-lab", "starry-night", 2],
  ["pet-frontface-lab", "elven", 1],
  ["pet-frontface-lab", "elven", 2],
  ["pet-small-dog", "egyptian", 1],
  ["pet-small-dog", "egyptian", 2],
  ["pet-small-dog", "comic-hero", 1],
  ["pet-small-dog", "comic-hero", 2],
  ["pet-small-dog", "renaissance", 1],
  ["pet-small-dog", "renaissance", 2],
  // ---- BOUNDARY (10 runs) — UI-guidance findings, not pass/fail ----
  ["pet-full-body-lab", "renaissance", 1],
  ["pet-full-body-lab", "renaissance", 2],
  ["pet-full-body-lab2", "elven", 1],
  ["pet-full-body-lab2", "elven", 2],
  ["group-four-childrens", "renaissance", 1],
  ["group-four-childrens", "renaissance", 2],
  ["group-family-two-childrens-2-adults", "starry-night", 1],
  ["group-family-two-childrens-2-adults", "starry-night", 2],
  ["group-two-adults-julian-lilly", "renaissance", 1],
  ["group-two-adults-julian-lilly", "renaissance", 2],
];

async function main() {
  await loadEnv();

  for (const [subject, style, repeat] of PLAN) {
    const runId = `${subject}__${style}__r${repeat}`;
    const done = loadResults();
    if (done.some((r) => r.runId === runId && r.success)) {
      console.log(`[batch] skip (done): ${runId}`);
      continue;
    }
    if (done.length >= MAX_RUNS) {
      console.log(`[batch] BUDGET HIT (${done.length}/${MAX_RUNS}) — stopping.`);
      break;
    }
    console.log(`[batch] run ${done.length + 1}/${MAX_RUNS}: ${runId}`);
    try {
      const rec = await runOne(subject, style, repeat);
      console.log(
        rec.success
          ? `[batch]   OK ${(rec.latencyMs / 1000).toFixed(1)}s → ${rec.localPath}`
          : `[batch]   FAILED: ${rec.error}`
      );
    } catch (err) {
      console.error(`[batch]   ERROR ${runId}:`, err instanceof Error ? err.message : err);
    }
  }

  const all = loadResults();
  const ok = all.filter((r) => r.success).length;
  console.log(`[batch] complete: ${all.length} runs total (${ok} succeeded), spend ~$${(all.length * 0.04).toFixed(2)}`);
}

main().catch((err) => {
  console.error("[batch] fatal:", err);
  process.exit(1);
});
