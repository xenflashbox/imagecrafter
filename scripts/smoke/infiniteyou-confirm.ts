/**
 * InfiniteYou winner confirmation.
 *
 * The tuning matrix produced one configuration the founder judged shippable:
 *   model_version = aes_stage2, NO control_image, real catalog style template,
 *   every other parameter left at its default.
 *
 * Notably NOT sim_stage1, the variant the model card advertises as higher
 * identity similarity — every sim_stage1 cell was rejected by eye. Machine
 * face-similarity and human recognition disagree on this pipeline, so this
 * harness records images only and scores nothing.
 *
 * Three questions, in the order that can kill the result fastest:
 *   1. Is it the config or was it one lucky seed?  (rule #49 — 3 seeds, control cell)
 *   2. Does it survive subjects other than the one it was tuned on? (#55 was a
 *      launch blocker precisely because the last winner did not)
 *   3. Does it survive styles other than baroque?
 *
 * There is no stand-in leg here. InfiniteYou builds the scene itself from the
 * face embedding plus the style template, so the stand-in generation, the
 * fidelity gate, and the ethnicity drift that lives in that leg (#87) all
 * disappear along with it.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) \
 *   IMAGECRAFTER_ANTHROPIC_API_KEY=$(cat /tmp/ic_anthropic_key) \
 *   REPLICATE_API_TOKEN=$(cat /tmp/ic_repl_tok) \
 *   npx tsx scripts/smoke/infiniteyou-confirm.ts
 */

import fs from "node:fs";
import path from "node:path";
import Replicate from "replicate";
import { loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/infiniteyou-confirm");

const MODEL = "zsxkib/infinite-you";
const VERSION = "b1370c5f5b1bb078eaa87332641c9cc6b89fff1bbd5c61f9e0e81370541b24f0";

/** The judged winner. Changing any of these invalidates the confirmation. */
const WINNER = {
  model_version: "aes_stage2",
  width: 960,
  height: 1280,
  num_steps: 40,
  output_format: "png",
} as const;

const CONTROL_SUBJECT = "adult-face";
const CONTROL_STYLE = "baroque";
const SEEDS = [20260824, 771103, 4460219];

const OTHER_SUBJECTS = ["s-adult-female", "s-child-boy2", "s-adult-male", "s-young-man"];
const OTHER_STYLES = ["ink-wash", "1950s", "anime"];

type Cell = { subject: string; style: string; seed: number; question: string };

const CELLS: Cell[] = [
  ...SEEDS.map((seed) => ({ subject: CONTROL_SUBJECT, style: CONTROL_STYLE, seed, question: "seed" })),
  ...OTHER_SUBJECTS.flatMap((subject) =>
    SEEDS.slice(0, 2).map((seed) => ({ subject, style: CONTROL_STYLE, seed, question: "subject" }))
  ),
  ...OTHER_STYLES.flatMap((style) =>
    SEEDS.slice(0, 2).map((seed) => ({ subject: CONTROL_SUBJECT, style, seed, question: "style" }))
  ),
];

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

  const { buildStandInDescriptor, buildStandInScenePrompt } = await import(
    "../../lib/services/portrait-generation"
  );
  const { analyzePortraitPhoto } = await import("../../lib/services/portrait-analysis");
  const { prisma } = await import("../../lib/prisma");

  const subjects = [...new Set(CELLS.map((c) => c.subject))];
  const styles = [...new Set(CELLS.map((c) => c.style))];

  const variants = await prisma.styleVariant.findMany({
    where: { slug: { in: styles } },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  const bySlug = new Map(variants.map((v) => [v.slug, v]));
  for (const s of styles) if (!bySlug.has(s)) throw new Error(`No style variant "${s}"`);

  // One vision read per subject, reused across that subject's cells.
  const prompts = new Map<string, string>();
  for (const subject of subjects) {
    const photoPath = path.join(INPUT_DIR, `${subject}.png`);
    if (!fs.existsSync(photoPath)) throw new Error(`Missing subject photo: ${photoPath}`);
    const dataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;
    const live = await analyzePortraitPhoto(dataUri);
    if (!live.success || !live.analysis) throw new Error(`Vision failed for ${subject}: ${live.error}`);
    const descriptor = buildStandInDescriptor(live.analysis);
    console.log(`→ ${subject}: "${descriptor.slice(0, 110)}…"`);
    for (const style of styles) {
      const v = bySlug.get(style)!;
      const p = buildStandInScenePrompt(
        v.promptTemplate,
        descriptor,
        (v.styleModifiers as Record<string, string>) || {},
        live.analysis
      );
      if (p.includes("{{")) throw new Error(`Unreplaced placeholder for ${subject}/${style}`);
      prompts.set(`${subject}|${style}`, p);
    }
  }
  await prisma.$disconnect();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\n→ ${CELLS.length} cells\n`);

  const uploadedIds: string[] = [];
  type ReplicateFile = { id: string; urls: { get: string } };
  const photoUrls = new Map<string, string>();

  try {
    for (const subject of subjects) {
      const blob = new Blob([new Uint8Array(fs.readFileSync(path.join(INPUT_DIR, `${subject}.png`)))], {
        type: "image/png",
      });
      const f = (await replicate.files.create(blob)) as ReplicateFile;
      uploadedIds.push(f.id);
      photoUrls.set(subject, f.urls.get);
    }

    for (const cell of CELLS) {
      const name = `${cell.style}--${cell.subject}--s${cell.seed}`;
      const outPath = path.join(OUT_DIR, `${name}.png`);
      if (fs.existsSync(outPath)) {
        console.log(`  ${name} — exists, skipping`);
        continue;
      }
      const input = {
        ...WINNER,
        id_image: photoUrls.get(cell.subject)!,
        prompt: prompts.get(`${cell.subject}|${cell.style}`)!,
        seed: cell.seed,
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
        console.log(`  ✓ ${name} — ${buf.length} bytes in ${secs}s — asks: ${cell.question}`);
        fs.appendFileSync(
          path.join(OUT_DIR, "manifest.jsonl"),
          JSON.stringify({
            ts: new Date().toISOString(),
            ...cell,
            input: { ...input, id_image: "<redacted>", prompt: `<${input.prompt.length} chars>` },
            url,
            bytes: buf.length,
            seconds: Number(secs),
          }) + "\n"
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ✗ ${name} — ${msg}`);
        fs.appendFileSync(
          path.join(OUT_DIR, "manifest.jsonl"),
          JSON.stringify({ ts: new Date().toISOString(), ...cell, error: msg }) + "\n"
        );
      }
    }
  } finally {
    // Real people's faces, including a child. They never stay on Replicate.
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
