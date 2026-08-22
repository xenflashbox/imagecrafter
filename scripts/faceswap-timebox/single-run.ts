/**
 * Face-swap timebox — single run smoke test.
 *
 * Usage:
 *   npx tsx scripts/faceswap-timebox/single-run.ts --subject adult-face --style renaissance
 *
 * Does ONE real Replicate run through the as-built service functions and
 * prints the local output path + timing. Counts against the 40-run budget
 * (tracked in scripts/faceswap-timebox/output/results.json).
 */

import { loadEnv, runOne, totalRuns, MAX_RUNS, SUBJECTS, STYLES } from "./lib";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  await loadEnv();

  const subject = getArg("subject") ?? "adult-face";
  const style = getArg("style") ?? "renaissance";
  const repeat = Number(getArg("repeat") ?? "1");

  if (!SUBJECTS[subject]) {
    console.error(`Unknown subject "${subject}". Valid: ${Object.keys(SUBJECTS).join(", ")}`);
    process.exit(1);
  }
  if (!STYLES[style]) {
    console.error(`Unknown style "${style}". Valid: ${Object.keys(STYLES).join(", ")}`);
    process.exit(1);
  }

  const used = totalRuns();
  if (used >= MAX_RUNS) {
    console.error(`Budget exhausted: ${used}/${MAX_RUNS} runs used. Refusing to run.`);
    process.exit(1);
  }

  console.log(`[single-run] ${subject} × ${style} (repeat ${repeat}) — run ${used + 1}/${MAX_RUNS}`);
  const rec = await runOne(subject, style, repeat);

  if (rec.success && rec.localPath) {
    console.log(`OK  output: ${rec.localPath}`);
    console.log(`    replicate url: ${rec.replicateUrl}`);
    console.log(`    latency: ${(rec.latencyMs / 1000).toFixed(1)}s  cost: $${rec.costUsd.toFixed(2)}`);
  } else {
    console.error(`FAILED: ${rec.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[single-run] fatal:", err);
  process.exit(1);
});
