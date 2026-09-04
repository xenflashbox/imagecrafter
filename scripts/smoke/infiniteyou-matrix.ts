/**
 * InfiniteYou parameter matrix.
 *
 * The bake-off ran InfiniteYou with three settings that handicapped it, and it
 * still won three of four styles by eye:
 *   - control_image was set to the stand-in, which pins the face to a
 *     stranger's pose. That is the "face in the hole" artifact.
 *   - model_version was aes_stage2 (tuned for aesthetics) rather than
 *     sim_stage1 (tuned for identity similarity).
 *   - the prompt was a terse stub, not the real catalog style template.
 *
 * One style (baroque), one subject, one seed across every cell, so a difference
 * between two images is attributable to the parameter and not to sampling.
 * Rule #49 still applies: pick a winner here, then re-run it across seeds
 * before believing it.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) \
 *   IMAGECRAFTER_ANTHROPIC_API_KEY=$(cat /tmp/ic_anthropic_key) \
 *   npx tsx scripts/smoke/infiniteyou-matrix.ts [--style=baroque] [--seed=N]
 */

import fs from "node:fs";
import path from "node:path";
import Replicate from "replicate";
import { loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const PHOTO = path.join(ROOT, "scripts/faceswap-timebox/input/adult-face.png");
const STANDIN_DIR = path.join(ROOT, "scripts/smoke/output/catalog/standin");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/infiniteyou");

const MODEL = "zsxkib/infinite-you";
const VERSION = "b1370c5f5b1bb078eaa87332641c9cc6b89fff1bbd5c61f9e0e81370541b24f0";

// The stub used in the bake-off, kept verbatim so the baseline cell reproduces
// exactly what the founder judged.
const STUB_PROMPT: Record<string, string> = {
  baroque: "a Baroque oil painting portrait of a woman, dramatic chiaroscuro lighting, rich dark background",
  "ink-wash": "a traditional East Asian ink wash painting portrait of a woman, sumi-e brushwork, muted greys",
  "1950s": "a 1950s Saturday Evening Post style illustrated portrait of a woman, warm mid-century palette",
  anime: "an anime illustration portrait of a woman, clean cel shading, expressive eyes",
};

type Cell = {
  key: string;
  note: string;
  control: boolean;
  modelVersion: "sim_stage1" | "aes_stage2";
  realPrompt: boolean;
  extra?: Record<string, unknown>;
};

const CELLS: Cell[] = [
  { key: "01-baseline", note: "BASELINE — exactly what shipped in the bake-off", control: true, modelVersion: "aes_stage2", realPrompt: false },
  { key: "02-nocontrol", note: "control_image OFF — isolates the face-in-the-hole artifact", control: false, modelVersion: "aes_stage2", realPrompt: false },
  { key: "03-sim-control", note: "sim_stage1, control ON — identity weights, pose still pinned", control: true, modelVersion: "sim_stage1", realPrompt: false },
  { key: "04-sim-nocontrol", note: "sim_stage1, control OFF — both handicaps removed", control: false, modelVersion: "sim_stage1", realPrompt: false },
  { key: "05-sim-real", note: "sim_stage1, control OFF, REAL catalog template", control: false, modelVersion: "sim_stage1", realPrompt: true },
  { key: "06-aes-real", note: "aes_stage2, control OFF, REAL catalog template", control: false, modelVersion: "aes_stage2", realPrompt: true },
  // No "identity up" cell exists: infusenet_conditioning_scale is capped at 1 by
  // the model (422 on 1.25), and its default IS 1. Cell 05 is already the
  // maximum-identity setting; the dial only ever trades identity away.
  { key: "08-sim-real-id075", note: "as 05, identity dial down (0.75) — more style freedom", control: false, modelVersion: "sim_stage1", realPrompt: true, extra: { infusenet_conditioning_scale: 0.75 } },
  { key: "09-sim-real-g5", note: "as 05, guidance 5.0 — harder prompt adherence", control: false, modelVersion: "sim_stage1", realPrompt: true, extra: { guidance_scale: 5.0 } },
  { key: "10-sim-real-antiblur", note: "as 05, anti-blur LoRA on", control: false, modelVersion: "sim_stage1", realPrompt: true, extra: { enable_anti_blur: true } },
  { key: "11-sim-real-realism", note: "as 05, realism LoRA on — may fight a painted style", control: false, modelVersion: "sim_stage1", realPrompt: true, extra: { enable_realism: true } },
  { key: "12-sim-real-g3", note: "as 05, guidance 3.0 — looser prompt, more room for the face", control: false, modelVersion: "sim_stage1", realPrompt: true, extra: { guidance_scale: 3.0 } },
];

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return extractUrl(output[0]);
  if (output && typeof output === "object") {
    const o = output as { url?: unknown; output?: unknown };
    if (typeof o.url === "function") return String((o.url as () => URL)());
    if (typeof o.url === "string") return o.url;
    if (o.output) return extractUrl(o.output);
  }
  return null;
}

async function main(): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN missing");
  const replicate = new Replicate({ auth: token });

  const style = arg("style") || "baroque";
  const seed = Number(arg("seed") || 20260824);
  const stub = STUB_PROMPT[style];
  if (!stub) throw new Error(`No stub prompt for style "${style}"`);

  // The real production prompt, built the same way generate-catalog.ts builds it.
  const { buildStandInDescriptor, buildStandInScenePrompt } = await import(
    "../../lib/services/portrait-generation"
  );
  const { analyzePortraitPhoto } = await import("../../lib/services/portrait-analysis");
  const { prisma } = await import("../../lib/prisma");

  const photoDataUri = `data:image/png;base64,${fs.readFileSync(PHOTO).toString("base64")}`;
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) throw new Error(`Vision analysis failed: ${live.error}`);
  const descriptor = buildStandInDescriptor(live.analysis);

  const variant = await prisma.styleVariant.findFirst({
    where: { slug: style },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  if (!variant) throw new Error(`No style variant "${style}"`);

  const realPrompt = buildStandInScenePrompt(
    variant.promptTemplate,
    descriptor,
    (variant.styleModifiers as Record<string, string>) || {},
    live.analysis
  );
  if (realPrompt.includes("{{")) throw new Error(`Unreplaced placeholder: ${realPrompt.slice(0, 160)}`);
  await prisma.$disconnect();

  console.log(`→ style=${style} seed=${seed}`);
  console.log(`→ descriptor: "${descriptor}"`);
  console.log(`→ real prompt (${realPrompt.length} chars): ${realPrompt.slice(0, 180)}…\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const uploadedIds: string[] = [];
  type ReplicateFile = { id: string; urls: { get: string } };
  const upload = async (file: string): Promise<string> => {
    const blob = new Blob([new Uint8Array(fs.readFileSync(file))], { type: "image/png" });
    const f = (await replicate.files.create(blob)) as ReplicateFile;
    uploadedIds.push(f.id);
    return f.urls.get;
  };

  try {
    const photoUrl = await upload(PHOTO);
    const standinPath = path.join(STANDIN_DIR, `${style}.png`);
    if (!fs.existsSync(standinPath)) throw new Error(`Stand-in missing: ${standinPath}`);
    const standinUrl = await upload(standinPath);

    console.log(`→ ${CELLS.length} cells\n`);

    for (const cell of CELLS) {
      const outPath = path.join(OUT_DIR, `${style}--${cell.key}.png`);
      if (fs.existsSync(outPath)) {
        console.log(`  ${cell.key} — exists, skipping`);
        continue;
      }
      const input: Record<string, unknown> = {
        id_image: photoUrl,
        prompt: cell.realPrompt ? realPrompt : stub,
        model_version: cell.modelVersion,
        width: 960,
        height: 1280,
        num_steps: 40,
        seed,
        output_format: "png",
        ...(cell.control ? { control_image: standinUrl } : {}),
        ...(cell.extra || {}),
      };

      const t0 = Date.now();
      try {
        const output = await replicate.run(`${MODEL}:${VERSION}`, { input });
        const url = extractUrl(output);
        if (!url) throw new Error(`no output url: ${JSON.stringify(output).slice(0, 200)}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`download HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(outPath, buf);
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`  ✓ ${cell.key} — ${buf.length} bytes in ${secs}s — ${cell.note}`);
        fs.appendFileSync(
          path.join(OUT_DIR, "manifest.jsonl"),
          JSON.stringify({ ts: new Date().toISOString(), style, seed, cell: cell.key, note: cell.note, input: { ...input, id_image: "<redacted>", control_image: cell.control ? "<standin>" : undefined }, url, bytes: buf.length, seconds: Number(secs) }) + "\n"
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${cell.key} — ${msg}`);
        fs.appendFileSync(
          path.join(OUT_DIR, "manifest.jsonl"),
          JSON.stringify({ ts: new Date().toISOString(), style, seed, cell: cell.key, error: msg }) + "\n"
        );
      }
    }
  } finally {
    // The subject photo is a real person's face. It never stays on Replicate.
    for (const id of uploadedIds) {
      try {
        await replicate.files.delete(id);
      } catch (err) {
        console.error(`  ! failed to delete upload ${id}:`, err);
      }
    }
    console.log(`\n→ deleted ${uploadedIds.length} Replicate uploads`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
