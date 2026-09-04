/**
 * Identity-model bake-off.
 *
 * The current swap leg (flux-kontext-apps/multi-image-kontext-pro) is a
 * general image EDITOR with no face-embedding conditioning, so it can only
 * ever produce someone who resembles the reference. This ranks real
 * identity-transfer models against it on scenes we have already paid for.
 *
 * Stand-in scenes are reused from the catalog run, so nothing is regenerated.
 *
 * Usage:
 *   npx tsx scripts/smoke/identity-bakeoff.ts [--styles=a,b] [--only=candidate]
 */

import fs from "node:fs";
import path from "node:path";
import Replicate from "replicate";
import { loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const PHOTO = path.join(ROOT, "scripts/faceswap-timebox/input/adult-face.png");
const STANDIN_DIR = path.join(ROOT, "scripts/smoke/output/catalog/standin");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/bakeoff");

const DEFAULT_STYLES = ["ink-wash", "baroque", "1950s", "anime"];

// Scene text for the candidates that regenerate rather than edit in place.
// Deliberately terse: this bake-off scores identity, not style fidelity.
const STYLE_PROMPT: Record<string, string> = {
  "ink-wash": "a traditional East Asian ink wash painting portrait of a woman, sumi-e brushwork, muted greys",
  baroque: "a Baroque oil painting portrait of a woman, dramatic chiaroscuro lighting, rich dark background",
  "1950s": "a 1950s Saturday Evening Post style illustrated portrait of a woman, warm mid-century palette",
  anime: "an anime illustration portrait of a woman, clean cel shading, expressive eyes",
};

type Candidate = {
  key: string;
  model: `${string}/${string}`;
  /** Pinned so a re-run compares the same weights, and so community models resolve. */
  version: string;
  note: string;
  /** photo + scene are Replicate file URLs. */
  input: (photo: string, scene: string, style: string) => Record<string, unknown>;
};

const CANDIDATES: Candidate[] = [
  {
    key: "control-kontext",
    model: "flux-kontext-apps/multi-image-kontext-pro",
    version: "93b90058443599a0623db1d176446e246194e68e1e3e0b8febef90543a992e06",
    note: "CONTROL — what ships today. Image editor, no identity conditioning.",
    input: (photo, scene) => ({
      input_image_1: photo,
      input_image_2: scene,
      prompt:
        "Replace the face of the person in the second image with the face of the person in the first image. Keep the second image's clothing, pose, lighting, background and artistic style exactly. Preserve the first person's exact facial structure, features and proportions.",
      aspect_ratio: "3:4",
      safety_tolerance: 2,
      output_format: "png",
    }),
  },
  {
    key: "swap-cdingram",
    model: "cdingram/face-swap",
    version: "d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111",
    note: "inswapper-class landmark swap onto the existing scene. Geometry preserved exactly.",
    input: (photo, scene) => ({ input_image: scene, swap_image: photo }),
  },
  {
    key: "swap-codeplugtech",
    model: "codeplugtech/face-swap",
    version: "278a81e7ebb22db98bcba54de985d22cc1abeead2754eb1f2af717247be69b34",
    note: "second landmark swapper, independent implementation.",
    input: (photo, scene) => ({ input_image: scene, swap_image: photo }),
  },
  {
    key: "infinite-you",
    model: "zsxkib/infinite-you",
    version: "b1370c5f5b1bb078eaa87332641c9cc6b89fff1bbd5c61f9e0e81370541b24f0",
    note: "ByteDance InfiniteYou — ArcFace identity + control_image holds the stand-in's pose.",
    input: (photo, scene, style) => ({
      id_image: photo,
      control_image: scene,
      prompt: STYLE_PROMPT[style] ?? style,
      width: 864,
      height: 1152,
      num_steps: 40,
      model_version: "aes_stage2",
      output_format: "png",
    }),
  },
  {
    key: "flux-pulid",
    model: "bytedance/flux-pulid",
    version: "8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b",
    note: "PuLID on FLUX — ArcFace conditioned, but regenerates the scene (no pose control).",
    input: (photo, _scene, style) => ({
      main_face_image: photo,
      prompt: STYLE_PROMPT[style] ?? style,
      width: 896,
      height: 1152,
      id_weight: 1.2,
      num_steps: 20,
      output_format: "png",
    }),
  },
  {
    key: "qwen-edit-plus",
    model: "qwen/qwen-image-edit-plus",
    version: "7677b9cc9967f7725fcf5e814a5a3446bf1d4b6ab0f9c15534dbbc54c7a088f2",
    note: "modern multi-image editor — direct like-for-like replacement for Kontext.",
    input: (photo, scene) => ({
      image: [photo, scene],
      prompt:
        "Take the exact face of the person in the first image and place it on the person in the second image. Keep the second image's clothing, pose, lighting, background and painting style unchanged. Do not idealise or alter the first person's facial proportions.",
      aspect_ratio: "3:4",
      output_format: "png",
    }),
  },
  {
    key: "gpt-image-2",
    model: "openai/gpt-image-2",
    version: "225c978a7f938acc350564c4548ddc2476bfb33364bec6b5422227f55ce56bd3",
    note: "OpenAI SOTA editor with reference images.",
    input: (photo, scene) => ({
      input_images: [photo, scene],
      prompt:
        "Recreate the second image exactly — same clothing, pose, lighting, background and artistic style — but with the face of the person from the first image. Preserve that person's exact facial structure and proportions; do not beautify or change them.",
      aspect_ratio: "3:4",
      quality: "high",
      output_format: "png",
    }),
  },
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

  const styles = (arg("styles") || DEFAULT_STYLES.join(",")).split(",").map((s) => s.trim());
  const onlyCandidate = arg("only");
  const queue = CANDIDATES.filter((c) => !onlyCandidate || c.key === onlyCandidate);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Every upload is registered here so the finally block can always clear it.
  const uploadedIds: string[] = [];
  type ReplicateFile = { id: string; urls: { get: string } };
  const upload = async (file: string): Promise<string> => {
    const blob = new Blob([new Uint8Array(fs.readFileSync(file))], { type: "image/png" });
    const f = (await replicate.files.create(blob)) as ReplicateFile;
    uploadedIds.push(f.id);
    return f.urls.get;
  };

  try {
    console.log(`→ Uploading subject photo`);
    const photoUrl = await upload(PHOTO);

    const sceneUrls: Record<string, string> = {};
    for (const style of styles) {
      const p = path.join(STANDIN_DIR, `${style}.png`);
      if (!fs.existsSync(p)) throw new Error(`Stand-in missing: ${p}`);
      console.log(`→ Uploading stand-in ${style}`);
      sceneUrls[style] = await upload(p);
    }

    console.log(`\n→ ${queue.length} candidates x ${styles.length} styles = ${queue.length * styles.length} runs\n`);

    for (const cand of queue) {
      for (const style of styles) {
        const outPath = path.join(OUT_DIR, `${style}--${cand.key}.png`);
        if (fs.existsSync(outPath)) {
          console.log(`  ${cand.key}/${style} — exists, skipping`);
          continue;
        }
        const t0 = Date.now();
        try {
          const output = await replicate.run(`${cand.model}:${cand.version}`, {
            input: cand.input(photoUrl, sceneUrls[style], style),
          });
          const url = extractUrl(output);
          if (!url) throw new Error(`no output url: ${JSON.stringify(output).slice(0, 200)}`);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`download HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(outPath, buf);
          const secs = ((Date.now() - t0) / 1000).toFixed(1);
          console.log(`  ✓ ${cand.key}/${style} — ${buf.length} bytes in ${secs}s`);
          fs.appendFileSync(
            path.join(OUT_DIR, "manifest.jsonl"),
            JSON.stringify({
              ts: new Date().toISOString(),
              candidate: cand.key,
              model: cand.model,
              style,
              url,
              bytes: buf.length,
              seconds: Number(secs),
            }) + "\n"
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  ✗ ${cand.key}/${style} — ${msg}`);
          fs.appendFileSync(
            path.join(OUT_DIR, "manifest.jsonl"),
            JSON.stringify({
              ts: new Date().toISOString(),
              candidate: cand.key,
              model: cand.model,
              style,
              error: msg,
            }) + "\n"
          );
        }
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
