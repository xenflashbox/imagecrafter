/**
 * Diagnostic repro: run the production swap leg + identity gate against the
 * exact inputs from the failed prod E2E (2026-07-12) and SAVE the swap output
 * so a human can judge whether the gate verdict is right.
 *
 * Output goes to scripts/smoke/output/ (gitignored — contains a real face).
 */
import { writeFileSync, mkdirSync } from "fs";
import { swapFaceIntoScene } from "../../lib/services/replicate-portrait";
import { checkIdentityPresence } from "../../lib/services/portrait-analysis";

process.loadEnvFile(".env");

const SOURCE =
  "https://images.imagecrafter.app/portraits/uploads/e9aefb7c-8c48-425f-b040-3e45045868e7/054122216b6043abbf2693dbdb8f6b58.png";
const SCENE =
  "https://image-storage.xencolabs.com/kling/2026/07/12/kling-12b4ecd85c7.png";

async function main() {
  if (!process.env.IMAGECRAFTER_ANTHROPIC_API_KEY) {
    console.error("IMAGECRAFTER_ANTHROPIC_API_KEY not in env — pass from vault");
    process.exit(1);
  }
  mkdirSync("scripts/smoke/output", { recursive: true });

  for (let i = 1; i <= 2; i++) {
    console.log(`--- attempt ${i}: swap ---`);
    const swap = await swapFaceIntoScene({
      photoUrl: SOURCE,
      sceneUrl: SCENE,
      subjectKind: "person",
    });
    if (!swap.success || !swap.imageUrl) {
      console.error("swap failed:", swap.error);
      continue;
    }
    console.log(`swap ok (${swap.processingTimeMs}ms): ${swap.imageUrl}`);
    const buf = Buffer.from(await (await fetch(swap.imageUrl)).arrayBuffer());
    const out = `scripts/smoke/output/repro-swap-${i}.png`;
    writeFileSync(out, buf);
    console.log(`saved ${out} (${buf.length} bytes)`);

    const identity = await checkIdentityPresence(SOURCE, swap.imageUrl);
    console.log(`identity gate verdict: ${identity}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
