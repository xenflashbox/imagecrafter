/**
 * P2 gate demonstrations (founder directive back-on-track §P2: "A gate you
 * can't watch reject something isn't proven").
 *
 * Runs the PRODUCTION gate functions — unmodified imports from
 * lib/services/portrait-analysis — against known inputs:
 *
 *  1. IDENTITY GATE vs the old pipeline's egyptian output (the literal
 *     stranger class that shipped on the Jul-11 gallery) → expect DIFFERENT.
 *  2. IDENTITY GATE vs the shipped, lead-verified renaissance gallery
 *     output (same person) → expect SAME (control).
 *  3. STAND-IN FIDELITY vs the ACTUAL Jul-11 v1 gallery strangers — the
 *     green-eyed egyptian queen and blue-eyed comic heroine (immutable R2
 *     v1 assets) — compared image-to-image against the real photo → expect
 *     MISMATCH — they would never reach the swap.
 *  4. STAND-IN FIDELITY vs the shipped renaissance output → expect MATCH
 *     (control).
 *
 * Control 4 is the flake canary. It is lead-verified as the same person, so
 * a "mismatch" here means the fidelity gate has been tightened past what a
 * human accepts and will burn all 3 stand-in attempts in production.
 *
 * Note (finding from demo development): the old timebox egyptian r2 rates
 * "match" on fidelity — correctly, because its coloring (dark hair, brown
 * eyes) does match the subject; its failure is facial structure, which is
 * the IDENTITY gate's job (and that gate rejects it, demo 1). The two gates
 * are complementary, not redundant.
 *
 * Local files are served over 127.0.0.1 (start `python3 -m http.server 8777`
 * from the repo root first) so the gates fetch real URLs, exactly as in prod.
 * Requires IMAGECRAFTER_ANTHROPIC_API_KEY in the environment (from the vault
 * — never on disk).
 */
import { readFileSync } from "fs";
import {
  checkIdentityPresence,
  checkStandInFidelity,
} from "../../lib/services/portrait-analysis";
import type { PortraitSubjectAnalysis } from "../../lib/services/portrait-analysis";

const BASE = "http://127.0.0.1:8777";
const SOURCE = `${BASE}/scripts/faceswap-timebox/input/adult-face.png`;
const STRANGER_EGYPTIAN = `${BASE}/scripts/faceswap-timebox/output/adult-face__egyptian__r1.png`;
const SHIPPED_RENAISSANCE = `${BASE}/scripts/smoke/output/gallery/adult-face-renaissance.png`;
// The literal strangers that shipped on the Jul-11 gallery (v1 keys are
// immutable-cached on R2 — they remain as evidence).
const V1_GREEN_EYED_EGYPTIAN =
  "https://images.imagecrafter.app/gallery/v1/thumbs/egyptian.jpg";
const V1_BLUE_EYED_COMIC_HERO =
  "https://images.imagecrafter.app/gallery/v1/thumbs/comic-hero.jpg";

async function main() {
  if (!process.env.IMAGECRAFTER_ANTHROPIC_API_KEY) {
    console.error("IMAGECRAFTER_ANTHROPIC_API_KEY not in env — pass from vault");
    process.exit(1);
  }

  const analysis = JSON.parse(
    readFileSync("scripts/faceswap-timebox/output/analysis/adult-face.json", "utf8")
  ) as PortraitSubjectAnalysis;
  console.log(
    `Subject traits (analysis JSON): ${analysis.primarySubject?.coloring} | ` +
      `${analysis.primarySubject?.genderPresentation} | ${analysis.primarySubject?.ageBracket}`
  );

  let failures = 0;
  const expect = (label: string, got: string, want: string) => {
    const ok = got === want;
    if (!ok) failures++;
    console.log(`${ok ? "✅" : "❌"} ${label}: got "${got}" (expected "${want}")`);
  };

  console.log("\n--- 1. IDENTITY GATE: old egyptian stranger vs source photo ---");
  expect(
    "identity(source, egyptian stranger r1)",
    await checkIdentityPresence(SOURCE, STRANGER_EGYPTIAN),
    "different"
  );

  console.log("\n--- 2. IDENTITY GATE control: shipped renaissance (same person) ---");
  expect(
    "identity(source, shipped renaissance)",
    await checkIdentityPresence(SOURCE, SHIPPED_RENAISSANCE),
    "same"
  );

  console.log(
    "\n--- 3. STAND-IN FIDELITY: the Jul-11 shipped strangers vs the real photo ---"
  );
  expect(
    "fidelity(source, v1 green-eyed egyptian)",
    await checkStandInFidelity(SOURCE, V1_GREEN_EYED_EGYPTIAN),
    "mismatch"
  );
  expect(
    "fidelity(source, v1 blue-eyed comic-hero)",
    await checkStandInFidelity(SOURCE, V1_BLUE_EYED_COMIC_HERO),
    "mismatch"
  );

  console.log("\n--- 4. STAND-IN FIDELITY control: shipped renaissance vs the real photo ---");
  expect(
    "fidelity(source, shipped renaissance)",
    await checkStandInFidelity(SOURCE, SHIPPED_RENAISSANCE),
    "match"
  );

  console.log(
    failures === 0
      ? "\nALL DEMONSTRATIONS PASSED — both gates visibly reject the stranger class."
      : `\n${failures} demonstration(s) did not behave as expected.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
