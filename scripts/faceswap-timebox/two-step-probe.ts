/**
 * Two-step STEP 2 — single-cell prompt/ordering probe.
 *
 * Attempt 2 finding: multi-image-kontext-pro returned the stand-in scene with
 * the stand-in's face nearly unchanged (identity from image 2 not carried).
 * Probe two candidate fixes on ONE cell (adult/renaissance) before re-running
 * the matrix:
 *   A: same order (scene=1, photo=2), blunt face-swap prompt
 *   B: reversed order (photo=1, scene=2), "place this person into" prompt
 *
 * Reuses the ledgered Replicate uploads from two-step-swap.ts (no new uploads).
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnv, OUTPUT_DIR } from "./lib";

const TWO_STEP_DIR = path.join(OUTPUT_DIR, "two-step");
const LEDGER_JSON = path.join(TWO_STEP_DIR, "replicate-uploads.json");
const PROBE_DIR = path.join(TWO_STEP_DIR, "probe");
const MODEL = "flux-kontext-apps/multi-image-kontext-pro";

async function main() {
  await loadEnv();
  const ledger = JSON.parse(fs.readFileSync(LEDGER_JSON, "utf8")) as Array<{
    label: string;
    url: string;
    uploadedAt: string;
  }>;
  const get = (label: string) => {
    const rec = ledger.find((u) => u.label === label);
    if (!rec) throw new Error(`Ledger missing ${label}`);
    if (Date.now() - new Date(rec.uploadedAt).getTime() > 20 * 60 * 60 * 1000)
      throw new Error(`Ledger URL expired for ${label} — re-upload via two-step-swap`);
    return rec.url;
  };
  const sceneUrl = get("scene:adult__renaissance");
  const photoUrl = get("photo:adult-face");

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

  const variants: Array<{
    name: string;
    input: Record<string, unknown>;
  }> = [
    {
      name: "A-blunt-faceswap",
      input: {
        input_image_1: sceneUrl,
        input_image_2: photoUrl,
        prompt:
          "Face swap. Take the exact face of the woman in image 2 and put it onto the woman in image 1. The output shows image 1's scene, costume, hair, pose, and Renaissance painting style, but the face must be unmistakably the same person as the woman in image 2 — identical facial structure, eyes, nose, mouth, and age. Do NOT keep the original face from image 1.",
        aspect_ratio: "3:4",
        safety_tolerance: 2,
        output_format: "png",
      },
    },
    {
      name: "B-reversed-place-into",
      input: {
        input_image_1: photoUrl,
        input_image_2: sceneUrl,
        prompt:
          "Place the woman from image 1 into the scene shown in image 2. She wears the costume, takes the pose, and is rendered in the Renaissance oil painting style of image 2, with image 2's background and lighting. Her face and identity remain exactly as in image 1 — identical facial structure, eyes, nose, mouth, skin tone, and age.",
        aspect_ratio: "3:4",
        safety_tolerance: 2,
        output_format: "png",
      },
    },
  ];

  fs.mkdirSync(PROBE_DIR, { recursive: true });
  for (const v of variants) {
    process.stdout.write(`probe ${v.name} ... `);
    const t0 = Date.now();
    const output = (await replicate.run(MODEL, { input: v.input })) as unknown;
    const url =
      typeof output === "string"
        ? output
        : output && typeof (output as { url?: () => URL }).url === "function"
          ? (output as { url: () => URL }).url().toString()
          : Array.isArray(output)
            ? String(output[0])
            : undefined;
    if (!url) throw new Error(`Unexpected output shape for ${v.name}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
    fs.writeFileSync(
      path.join(PROBE_DIR, `${v.name}.png`),
      Buffer.from(await resp.arrayBuffer())
    );
    console.log(`OK ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log("Probe outputs in output/two-step/probe/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
