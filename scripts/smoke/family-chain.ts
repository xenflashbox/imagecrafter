/**
 * Family chain — multi-person identity transfer, one face at a time.
 *
 * The swap models on Replicate expose no face index: given a group scene they
 * pick a face themselves. So a group portrait cannot be swapped in one call and
 * cannot be chained. Each face has to be cropped out, swapped alone, and
 * composited back.
 *
 * The composite is deterministic (sharp, feathered ellipse). It must never be a
 * generative "stitch" — a model asked to reassemble the frame redraws the faces
 * and destroys the identity the swap just bought.
 *
 * Slot mapping is READ, not assumed. Image models routinely ignore positional
 * instructions, so after the stand-in is generated we ask vision what it
 * actually produced and map to that.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/smoke/family-chain.ts [--style=ink-wash] [--photo=group-family-two-childrens-2-adults]
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import Anthropic from "@anthropic-ai/sdk";
import Replicate from "replicate";
import { loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/family");

const SWAP_MODEL = "cdingram/face-swap";
const SWAP_VERSION = "d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111";
const VISION_MODEL = process.env.AI_VISION_MODEL || "claude-sonnet-4-5-20250929";

// Crop margin around the detected head box. Generous on purpose: the swapper
// runs its own detector inside the crop, so the box only has to contain the
// face, not frame it precisely.
const CROP_PAD = 0.45;

const STYLE_SCENE: Record<string, string> = {
  "ink-wash":
    "a traditional East Asian ink wash painting, sumi-e brushwork, muted greys and soft washes",
  "1950s":
    "a 1950s Saturday Evening Post style illustration, warm mid-century palette, clean linework",
  baroque:
    "a Baroque oil painting, dramatic chiaroscuro lighting, rich dark background",
};

type Person = {
  index: number;
  age: number;
  ageBracket: string;
  gender: string;
  descriptor: string;
  box: { x: number; y: number; width: number; height: number };
};

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function toBase64(buf: Buffer): Promise<{ data: string; media_type: "image/jpeg" }> {
  const jpeg = await sharp(buf).resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return { data: jpeg.toString("base64"), media_type: "image/jpeg" };
}

const anthropic = new Anthropic({ apiKey: process.env.IMAGECRAFTER_ANTHROPIC_API_KEY });

/**
 * Ground truth for one image: who is in it, and where their heads are.
 * Ordered left-to-right so source and stand-in can be aligned by position.
 */
async function readPeople(buf: Buffer, label: string): Promise<Person[]> {
  const img = await toBase64(buf);
  const res = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", ...img } },
          {
            type: "text",
            text: `List every human face in this image, ordered strictly left to right by the horizontal centre of the head.

For each person return:
- index: 0-based, left to right
- age: integer estimate of apparent age in years
- ageBracket: one of "young-child", "child", "teen", "adult", "senior"
- gender: "male" or "female"
- descriptor: one sentence covering hair colour and length, eye colour, skin tone, face shape and build
- box: bounding box of the HEAD including all hair and the chin, normalised 0-1, as {x, y, width, height} where x,y is the top-left corner

Return ONLY a JSON array. No prose, no code fence.`,
          },
        ],
      },
    ],
  });
  const text = res.content.find((c) => c.type === "text");
  if (!text || text.type !== "text") throw new Error(`${label}: vision returned no text`);
  const json = text.text.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const people = JSON.parse(json) as Person[];
  if (!Array.isArray(people) || people.length === 0) throw new Error(`${label}: no faces found`);
  return people.sort((a, b) => a.box.x - b.box.x).map((p, i) => ({ ...p, index: i }));
}

/**
 * Match source people to stand-in slots on what the generator actually drew.
 * Greedy on gender match first, then closest apparent age.
 */
function mapSlots(source: Person[], standin: Person[]): Array<{ src: Person; slot: Person }> {
  const free = [...standin];
  return source.map((src) => {
    let best = 0;
    let bestCost = Infinity;
    free.forEach((slot, i) => {
      const cost = (slot.gender === src.gender ? 0 : 100) + Math.abs(slot.age - src.age);
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    });
    const [slot] = free.splice(best, 1);
    return { src, slot };
  });
}

function pixelBox(
  box: Person["box"],
  width: number,
  height: number
): { left: number; top: number; width: number; height: number } {
  const padX = box.width * CROP_PAD;
  const padY = box.height * CROP_PAD;
  const left = Math.max(0, Math.round((box.x - padX) * width));
  const top = Math.max(0, Math.round((box.y - padY) * height));
  const right = Math.min(width, Math.round((box.x + box.width + padX) * width));
  const bottom = Math.min(height, Math.round((box.y + box.height + padY) * height));
  return { left, top, width: right - left, height: bottom - top };
}

/** Feathered ellipse so the pasted crop has no rectangular seam. */
async function featherMask(w: number, h: number): Promise<Buffer> {
  const svg = `<svg width="${w}" height="${h}"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.40}" ry="${h * 0.44}" fill="#fff"/></svg>`;
  return sharp(Buffer.from(svg)).blur(Math.max(2, w * 0.05)).png().toBuffer();
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
  const style = arg("style") || "ink-wash";
  const photoName = arg("photo") || "group-family-two-childrens-2-adults";
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN missing");
  if (!process.env.IMAGECRAFTER_ANTHROPIC_API_KEY) throw new Error("IMAGECRAFTER_ANTHROPIC_API_KEY missing");
  const replicate = new Replicate({ auth: token });

  const runDir = path.join(OUT_DIR, `${photoName}--${style}`);
  fs.mkdirSync(runDir, { recursive: true });

  const photoPath = path.join(INPUT_DIR, `${photoName}.png`);
  if (!fs.existsSync(photoPath)) throw new Error(`Photo not found: ${photoPath}`);
  const photoBuf = fs.readFileSync(photoPath);

  // 1. Who is in the customer's photo, and where.
  console.log(`→ Reading the source photo`);
  const source = await readPeople(photoBuf, "source");
  console.log(`  ${source.length} people, left to right:`);
  for (const p of source) console.log(`    [${p.index}] ${p.gender} ~${p.age}y (${p.ageBracket}) — ${p.descriptor.slice(0, 80)}`);

  // 2. Build a stand-in scene that carries every trait the swap cannot redraw.
  const roster = source
    .map((p) => `${p.index + 1}) a ${p.age}-year-old ${p.gender === "male" ? (p.age < 18 ? "boy" : "man") : p.age < 18 ? "girl" : "woman"}, ${p.descriptor}`)
    .join("; ");
  const scenePrompt = `${STYLE_SCENE[style] ?? style} group portrait of a family of ${source.length}, standing together in a single row, waist-up. From left to right: ${roster}. Every face fully visible, front-facing, unobstructed, no hats or headwear covering the hair.`;
  console.log(`\n→ Stand-in prompt (${scenePrompt.length} chars)\n  ${scenePrompt.slice(0, 220)}…`);

  const standinPath = path.join(runDir, "standin.png");
  let standinBuf: Buffer;
  if (fs.existsSync(standinPath)) {
    console.log(`\n→ Stand-in exists, reusing`);
    standinBuf = fs.readFileSync(standinPath);
  } else {
    const { generateStandInScene } = await import("../../lib/services/portrait-generation");
    console.log(`\n→ Generating family stand-in`);
    const scene = await generateStandInScene(scenePrompt, style);
    if ("error" in scene) throw new Error(`Stand-in generation failed: ${scene.error}`);
    const res = await fetch(scene.sceneUrl);
    if (!res.ok) throw new Error(`Stand-in download HTTP ${res.status}`);
    standinBuf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(standinPath, standinBuf);
    console.log(`  saved ${standinBuf.length} bytes`);
  }

  // 3. Read back what the generator ACTUALLY drew — never trust the prompt order.
  console.log(`\n→ Reading the stand-in back`);
  const standin = await readPeople(standinBuf, "standin");
  console.log(`  ${standin.length} people, left to right:`);
  for (const p of standin) console.log(`    [${p.index}] ${p.gender} ~${p.age}y (${p.ageBracket})`);

  if (standin.length !== source.length) {
    console.error(
      `\n✗ Stand-in has ${standin.length} people but the photo has ${source.length}. ` +
        `Regenerate before swapping — a wrong count means someone would be dropped or doubled.`
    );
    process.exit(1);
  }

  const pairs = mapSlots(source, standin);
  console.log(`\n→ Slot mapping (source → stand-in position):`);
  for (const { src, slot } of pairs) {
    console.log(`    photo[${src.index}] ${src.gender} ~${src.age}y  →  standin[${slot.index}] ${slot.gender} ~${slot.age}y`);
  }

  // 4. One face at a time: crop, swap alone, composite back.
  const meta = await sharp(standinBuf).metadata();
  const W = meta.width!;
  const H = meta.height!;
  const srcMeta = await sharp(photoBuf).metadata();

  const uploadedIds: string[] = [];
  type ReplicateFile = { id: string; urls: { get: string } };
  const upload = async (buf: Buffer): Promise<string> => {
    const blob = new Blob([new Uint8Array(buf)], { type: "image/png" });
    const f = (await replicate.files.create(blob)) as ReplicateFile;
    uploadedIds.push(f.id);
    return f.urls.get;
  };

  let composite = standinBuf;
  const ledger: unknown[] = [];

  try {
    for (const { src, slot } of pairs) {
      const label = `${src.gender} ~${src.age}y`;
      const srcBox = pixelBox(src.box, srcMeta.width!, srcMeta.height!);
      const dstBox = pixelBox(slot.box, W, H);
      console.log(`\n  ${label}: crop ${dstBox.width}x${dstBox.height} at ${dstBox.left},${dstBox.top}`);

      const srcFace = await sharp(photoBuf).extract(srcBox).png().toBuffer();
      const dstFace = await sharp(composite).extract(dstBox).png().toBuffer();
      fs.writeFileSync(path.join(runDir, `src-${slot.index}.png`), srcFace);

      const t0 = Date.now();
      const output = await replicate.run(`${SWAP_MODEL}:${SWAP_VERSION}`, {
        input: { input_image: await upload(dstFace), swap_image: await upload(srcFace) },
      });
      const url = extractUrl(output);
      if (!url) throw new Error(`no output url for ${label}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`swap download HTTP ${res.status}`);
      const swapped = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(runDir, `swapped-${slot.index}.png`), swapped);
      console.log(`    swapped in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

      const fitted = await sharp(swapped)
        .resize(dstBox.width, dstBox.height, { fit: "fill" })
        .composite([{ input: await featherMask(dstBox.width, dstBox.height), blend: "dest-in" }])
        .png()
        .toBuffer();

      composite = await sharp(composite)
        .composite([{ input: fitted, left: dstBox.left, top: dstBox.top }])
        .png()
        .toBuffer();

      fs.writeFileSync(path.join(runDir, `after-${slot.index}.png`), composite);
      ledger.push({ source: src, slot, dstBox, seconds: (Date.now() - t0) / 1000 });
    }

    const finalPath = path.join(runDir, "final.png");
    fs.writeFileSync(finalPath, composite);
    fs.writeFileSync(
      path.join(runDir, "manifest.json"),
      JSON.stringify({ ts: new Date().toISOString(), style, photoName, scenePrompt, source, standin, ledger }, null, 2)
    );
    console.log(`\n✓ ${pairs.length} faces swapped individually → ${path.relative(ROOT, finalPath)}`);
  } finally {
    // These crops are a real family's faces, including children.
    for (const id of uploadedIds) {
      try {
        await replicate.files.delete(id);
      } catch (err) {
        console.error(`  ! failed to delete upload ${id}:`, err);
      }
    }
    console.log(`→ deleted ${uploadedIds.length} Replicate uploads`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
