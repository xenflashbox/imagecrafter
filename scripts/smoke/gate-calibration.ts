/**
 * Stand-in fidelity gate calibration bench.
 *
 * Replays checkStandInFidelity over (real photo, stand-in) pairs the lead has
 * already adjudicated by eye, and reports the gate's verdict against the
 * expected one. Vision calls only — no generation spend — so the gate can be
 * re-tuned without paying for a full pair run each time.
 *
 * The gate has produced BOTH false passes (a stranger waved through) and false
 * rejects (a correct stand-in rejected 3/3, stalling the pipeline), so any edit
 * to its prompt must be checked against both directions before it is trusted.
 *
 * Usage:
 *   npx tsx scripts/smoke/gate-calibration.ts <photo> <standin> <expected> [...]
 *   where each triple is: path-to-real-photo path-to-standin match|mismatch
 */

import fs from "node:fs";
import { fail, loadEnv } from "./_shared";

loadEnv();

function dataUri(p: string): string {
  if (!fs.existsSync(p)) fail(`File not found: ${p}`);
  const ext = p.toLowerCase().endsWith(".jpg") || p.toLowerCase().endsWith(".jpeg") ? "jpeg" : "png";
  return `data:image/${ext};base64,${fs.readFileSync(p).toString("base64")}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 3 !== 0) {
    fail("Usage: gate-calibration.ts <photo> <standin> <match|mismatch> [...]");
  }

  const { checkStandInFidelity } = await import("../../lib/services/portrait-analysis");

  let wrong = 0;
  for (let i = 0; i < args.length; i += 3) {
    const [photo, standIn, expected] = [args[i], args[i + 1], args[i + 2]];
    if (expected !== "match" && expected !== "mismatch") {
      fail(`Expected verdict must be match|mismatch, got "${expected}"`);
    }
    const verdict = await checkStandInFidelity(dataUri(photo), dataUri(standIn));
    const ok = verdict === expected;
    if (!ok) wrong++;
    console.log(
      `${ok ? "✓" : "✗"} ${standIn.split("/").pop()}: gate=${verdict} expected=${expected}`
    );
  }

  const total = args.length / 3;
  console.log(`\n${total - wrong}/${total} agree with lead adjudication`);
  if (wrong > 0) fail(`${wrong} disagreement(s) — gate is miscalibrated`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
