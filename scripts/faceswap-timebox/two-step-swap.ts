/**
 * Two-step face-into-scene — STEP 2 (identity swap) harness.
 *
 * Directive: docs/imagecrafter-faceswap-two-step-test.md
 *
 * Step 1 produced generic stand-in scenes (Higgsfield: Nano Banana / Kling,
 * per-style bake-off winners) in output/two-step/step1/. This harness swaps
 * the REAL subject's identity onto the stand-in using Replicate
 * flux-kontext-apps/multi-image-kontext-pro (the official two-image Kontext
 * Pro app): input_image_1 = stand-in scene, input_image_2 = real photo.
 *
 * PRIVACY: real photos (incl. children) AND stand-in scenes are uploaded to
 * Replicate Files API solely for the model to fetch. Every upload is tracked
 * in output/two-step/replicate-uploads.json and deleted by `--cleanup`.
 * input/ and output/ are gitignored; nothing is committed.
 *
 * Usage:
 *   npx tsx scripts/faceswap-timebox/two-step-swap.ts all
 *   npx tsx scripts/faceswap-timebox/two-step-swap.ts <cell> <style>
 *   npx tsx scripts/faceswap-timebox/two-step-swap.ts --cleanup
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnv, SUBJECTS, INPUT_DIR, OUTPUT_DIR, ROOT, writeJson } from "./lib";

const TWO_STEP_DIR = path.join(OUTPUT_DIR, "two-step");
const STEP1_DIR = path.join(TWO_STEP_DIR, "step1");
const STEP2_DIR = path.join(TWO_STEP_DIR, "step2");
const LEDGER_JSON = path.join(TWO_STEP_DIR, "replicate-uploads.json");
const SWAP_RESULTS_JSON = path.join(TWO_STEP_DIR, "swap-results.json");

const MODEL = "flux-kontext-apps/multi-image-kontext-pro";

// Per-style bake-off winners (lead-judged; recorded in results doc).
const ADULT_WINNER: Record<string, "kling" | "nano"> = {
  renaissance: "kling",
  "starry-night": "nano",
  egyptian: "kling",
  elven: "kling",
  "comic-hero": "nano",
};

const STYLES = ["renaissance", "starry-night", "egyptian", "elven", "comic-hero"] as const;

// Matrix cells: which real subject drives each archetype scene.
// Pet archetype scenes were generated per-style for the pet subject actually
// tested in the single-pass matrix (lab for renaissance/egyptian/comic-hero,
// small terrier for starry-night/elven).
interface Cell {
  cell: string; // scene archetype key used in step1 filenames
  subject: keyof typeof SUBJECTS & string;
  kind: "person" | "pet" | "couple";
}

function cellsForStyle(style: string): Cell[] {
  const petSubject =
    style === "starry-night" || style === "elven" ? "pet-small-dog" : "pet-frontface-lab";
  const petCell = petSubject === "pet-small-dog" ? "pet-small-dog" : "pet-lab";
  return [
    { cell: "adult", subject: "adult-face", kind: "person" },
    { cell: "child", subject: "child-face", kind: "person" },
    { cell: petCell, subject: petSubject, kind: "pet" },
    { cell: "couple", subject: "group-two-adults-julian-lilly", kind: "couple" },
  ];
}

function sceneFile(style: string, cell: string): string {
  const name =
    cell === "adult"
      ? `adult__${style}__${ADULT_WINNER[style]}.png`
      : `${cell}__${style}.png`;
  return path.join(STEP1_DIR, name);
}

// ATTEMPT HISTORY (recorded in results):
//   1: aspect_ratio "match_input_image" → model returned its internal
//      side-by-side concatenated canvas for all 20 runs.
//   2: explicit 3:4 + "replace the face in image 1" → single image, but the
//      stand-in's face survived nearly unchanged (identity not carried).
//   3 (current): probe-validated REVERSED construction — the REAL photo is
//      image 1 (identity anchor), the stand-in scene is image 2 (scene/style
//      target). Probe B carried true facial structure/age; probe A (blunt
//      face-swap wording, original order) still idealized the face.
function swapPrompt(kind: Cell["kind"]): string {
  switch (kind) {
    case "person":
      return "Place the person from image 1 into the scene shown in image 2. Completely ignore the clothing and background from image 1. They wear ONLY the costume and headwear from image 2, take the pose from image 2, and are rendered fully in the artistic style of image 2, with image 2's complete background and lighting. Their face and identity remain exactly as in image 1 — identical facial structure, eyes, nose, mouth, skin tone, and age.";
    case "pet":
      return "Place the dog from image 1 into the scene shown in image 2. Completely ignore the background from image 1. It wears the collar and attire from image 2, takes the pose from image 2, and is rendered fully in the artistic style of image 2, with image 2's complete background and lighting. The dog's face and identity remain exactly as in image 1 — identical facial structure, fur color and markings, eyes, and natural ear shape.";
    case "couple":
      return "Place the two people from image 1 into the scene shown in image 2 — the man takes the man's place and the woman takes the woman's place. Completely ignore the clothing and background from image 1. They wear ONLY the costumes from image 2, take the poses from image 2, and are rendered fully in the artistic style of image 2, with image 2's complete background and lighting. Each person's face and identity remain exactly as in image 1 — identical facial structure, hair color, eyes, nose, mouth, skin tone, and age.";
  }
}

// ---------------------------------------------------------------------------
// Replicate Files API upload with deletion ledger (label-keyed, cached)
// ---------------------------------------------------------------------------
interface LedgerRecord {
  label: string;
  fileId: string;
  url: string;
  uploadedAt: string;
}

function readLedger(): LedgerRecord[] {
  try {
    return JSON.parse(fs.readFileSync(LEDGER_JSON, "utf8")) as LedgerRecord[];
  } catch {
    return [];
  }
}

async function uploadFile(label: string, absPath: string): Promise<string> {
  const ledger = readLedger();
  const existing = ledger.find((u) => u.label === label);
  if (existing) {
    const ageMs = Date.now() - new Date(existing.uploadedAt).getTime();
    if (ageMs < 20 * 60 * 60 * 1000) return existing.url; // signed URLs last 24h
  }
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const buf = fs.readFileSync(absPath);
  const file = (await replicate.files.create(buf)) as {
    id: string;
    urls: { get: string };
  };
  const rec: LedgerRecord = {
    label,
    fileId: file.id,
    url: file.urls.get,
    uploadedAt: new Date().toISOString(),
  };
  writeJson(LEDGER_JSON, ledger.filter((u) => u.label !== label).concat(rec));
  return rec.url;
}

// ---------------------------------------------------------------------------
// One swap run
// ---------------------------------------------------------------------------
interface SwapRecord {
  runId: string;
  style: string;
  cell: string;
  subject: string;
  startedAt: string;
  latencyMs: number;
  costUsd: number;
  success: boolean;
  error?: string;
  replicateUrl?: string;
  localPath?: string;
}

function appendSwapResult(record: SwapRecord): void {
  let all: SwapRecord[] = [];
  try {
    all = JSON.parse(fs.readFileSync(SWAP_RESULTS_JSON, "utf8"));
  } catch {
    /* first run */
  }
  all.push(record);
  writeJson(SWAP_RESULTS_JSON, all);
}

async function runSwap(style: string, c: Cell): Promise<SwapRecord> {
  const runId = `${c.cell}__${style}`;
  const startedAt = new Date().toISOString();

  const scenePath = sceneFile(style, c.cell);
  if (!fs.existsSync(scenePath)) {
    throw new Error(`Stand-in scene missing: ${scenePath}`);
  }
  const photoPath = path.join(INPUT_DIR, SUBJECTS[c.subject].file);

  const sceneUrl = await uploadFile(`scene:${runId}`, scenePath);
  const photoUrl = await uploadFile(`photo:${c.subject}`, photoPath);

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

  const t0 = Date.now();
  const record: SwapRecord = {
    runId,
    style,
    cell: c.cell,
    subject: c.subject,
    startedAt,
    latencyMs: 0,
    costUsd: 0.08, // multi-image-kontext-pro list price per output image
    success: false,
  };
  try {
    const output = (await replicate.run(MODEL, {
      input: {
        // Reversed construction (attempt 3): photo = identity anchor.
        input_image_1: photoUrl,
        input_image_2: sceneUrl,
        prompt: swapPrompt(c.kind),
        aspect_ratio: "3:4",
        safety_tolerance: 2,
        output_format: "png",
      },
    })) as unknown;
    record.latencyMs = Date.now() - t0;

    const url =
      typeof output === "string"
        ? output
        : output && typeof (output as { url?: () => URL }).url === "function"
          ? (output as { url: () => URL }).url().toString()
          : Array.isArray(output)
            ? String(output[0])
            : undefined;
    if (!url) throw new Error(`Unexpected output shape: ${JSON.stringify(output).slice(0, 200)}`);
    record.replicateUrl = url;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Output download failed: HTTP ${resp.status}`);
    fs.mkdirSync(STEP2_DIR, { recursive: true });
    const outPath = path.join(STEP2_DIR, `${runId}.png`);
    fs.writeFileSync(outPath, Buffer.from(await resp.arrayBuffer()));
    record.localPath = path.relative(ROOT, outPath);
    record.success = true;
  } catch (err) {
    record.latencyMs = Date.now() - t0;
    record.error = err instanceof Error ? err.message : String(err);
  }
  appendSwapResult(record);
  return record;
}

// ---------------------------------------------------------------------------
// Cleanup: delete every ledgered upload from Replicate
// ---------------------------------------------------------------------------
async function cleanup(): Promise<void> {
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const ledger = readLedger();
  if (ledger.length === 0) {
    console.log("Ledger empty — nothing to clean.");
    return;
  }
  const remaining: LedgerRecord[] = [];
  for (const u of ledger) {
    try {
      await replicate.files.delete(u.fileId);
      console.log(`deleted: ${u.label} (${u.fileId})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) {
        console.log(`already gone: ${u.label} (${u.fileId})`);
      } else {
        console.error(`FAILED to delete ${u.label} (${u.fileId}): ${msg}`);
        remaining.push(u);
      }
    }
  }
  writeJson(LEDGER_JSON, remaining);
  console.log(
    remaining.length === 0
      ? "All two-step uploads deleted from Replicate."
      : `WARNING: ${remaining.length} uploads still present — re-run.`
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
async function main() {
  await loadEnv();
  const [arg1, arg2] = process.argv.slice(2);

  if (arg1 === "--cleanup") {
    await cleanup();
    return;
  }

  const jobs: Array<{ style: string; c: Cell }> = [];
  if (arg1 === "all") {
    for (const style of STYLES) {
      for (const c of cellsForStyle(style)) jobs.push({ style, c });
    }
  } else if (arg1 && arg2) {
    const style = arg2;
    const c = cellsForStyle(style).find((x) => x.cell === arg1);
    if (!c) throw new Error(`Unknown cell '${arg1}' for style '${style}'`);
    jobs.push({ style, c });
  } else {
    throw new Error("Usage: two-step-swap.ts all | <cell> <style> | --cleanup");
  }

  for (const { style, c } of jobs) {
    const runId = `${c.cell}__${style}`;
    const outPath = path.join(STEP2_DIR, `${runId}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`skip (exists): ${runId}`);
      continue;
    }
    process.stdout.write(`swap ${runId} ... `);
    const rec = await runSwap(style, c);
    console.log(
      rec.success ? `OK ${(rec.latencyMs / 1000).toFixed(1)}s` : `FAIL: ${rec.error}`
    );
  }

  const all: SwapRecord[] = JSON.parse(fs.readFileSync(SWAP_RESULTS_JSON, "utf8"));
  const ok = all.filter((r) => r.success).length;
  console.log(`\n${ok}/${all.length} swaps succeeded. Cost ~$${(all.length * 0.08).toFixed(2)}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
