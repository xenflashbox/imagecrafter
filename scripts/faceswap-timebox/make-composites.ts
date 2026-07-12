/**
 * Face-swap timebox — build scoring composites.
 *
 * Usage: npx tsx scripts/faceswap-timebox/make-composites.ts
 *
 * For every subject×style pair in results.json, writes
 * output/compare/<subject>__<style>.jpg — [ source | run1 | run2 ] side by
 * side at 512px tiles — so likeness can be judged against the source in a
 * single view. Local + gitignored only, like all other outputs.
 */

import fs from "node:fs";
import path from "node:path";
import { INPUT_DIR, OUTPUT_DIR, SUBJECTS, loadResults } from "./lib";

const TILE = 512;
const COMPARE_DIR = path.join(OUTPUT_DIR, "compare");

async function main() {
  const sharp = (await import("sharp")).default;
  fs.mkdirSync(COMPARE_DIR, { recursive: true });

  const results = loadResults().filter((r) => r.success && r.localPath);
  const pairs = new Map<string, typeof results>();
  for (const r of results) {
    const key = `${r.subject}__${r.style}`;
    pairs.set(key, [...(pairs.get(key) ?? []), r]);
  }

  for (const [key, runs] of pairs) {
    const subject = runs[0].subject;
    const src = path.join(INPUT_DIR, SUBJECTS[subject].file);
    const files = [src, ...runs
      .sort((a, b) => a.repeat - b.repeat)
      .map((r) => path.join(OUTPUT_DIR, path.basename(r.localPath!)))];

    const tiles = await Promise.all(
      files.map((f) =>
        sharp(f)
          .resize(TILE, TILE, { fit: "contain", background: "#222" })
          .jpeg({ quality: 82 })
          .toBuffer()
      )
    );

    const out = path.join(COMPARE_DIR, `${key}.jpg`);
    await sharp({
      create: {
        width: TILE * tiles.length,
        height: TILE,
        channels: 3,
        background: "#222",
      },
    })
      .composite(tiles.map((t, i) => ({ input: t, left: i * TILE, top: 0 })))
      .jpeg({ quality: 82 })
      .toFile(out);
    console.log(`composite: ${path.relative(process.cwd(), out)} (${tiles.length - 1} runs)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
