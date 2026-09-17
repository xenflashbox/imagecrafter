/**
 * Publish the task-#88 demo renders to R2 as gallery/v4 so the homepage can
 * lead with pets. Sources are the real two-step pipeline outputs on disk;
 * nothing here generates or re-touches an image.
 *
 * Run: npx tsx scripts/gallery/upload-pets.ts
 */

import fs from "node:fs";
import path from "node:path";

// Not loadEnv(): that asserts DATABASE_URL is a non-production branch because
// smoke tests write rows. This script only PUTs to R2. Dropping DATABASE_URL
// keeps that true — a future DB call here fails loud instead of hitting prod.
process.loadEnvFile(".env");
delete process.env.DATABASE_URL;

const ROOT = path.resolve(__dirname, "../..");
const BEFORE_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const AFTER_DIR = path.join(ROOT, "scripts/smoke/output/pet-catalog");
const MANIFEST = path.join(ROOT, "scripts/gallery/pets-manifest.json");
const PREFIX = "gallery/v4";

// Pets lead. Humans follow so the catalog still shows people portraits.
const SUBJECTS = [
  "d-dog-corgi",
  "d-cat-orange",
  "d-dog-terrier-scruffy",
  "d-man-50s-beard",
  "d-woman-20s-braids",
  "d-woman-60s-silver",
];
const STYLES = ["baroque", "oil-painting", "disco"];

async function jpeg(buf: Buffer, width: number, quality: number): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf)
    .resize(width, width, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

async function main(): Promise<void> {
  const { uploadToR2, isR2Available } = await import("../../lib/r2");
  if (!isR2Available()) throw new Error("R2 not configured (R2_* env vars)");

  const manifest: Record<string, { before: string; after: Record<string, string> }> = {};

  for (const subject of SUBJECTS) {
    const beforeSrc = path.join(BEFORE_DIR, `${subject}.png`);
    if (!fs.existsSync(beforeSrc)) throw new Error(`missing source photo: ${beforeSrc}`);

    const before = await uploadToR2({
      buffer: await jpeg(fs.readFileSync(beforeSrc), 1200, 86),
      key: `${PREFIX}/before/${subject}.jpg`,
      contentType: "image/jpeg",
    });
    if (!before.success || !before.url) {
      throw new Error(`${subject} before upload failed: ${before.error}`);
    }

    const after: Record<string, string> = {};
    for (const style of STYLES) {
      const src = path.join(AFTER_DIR, `${style}--${subject}--final.png`);
      if (!fs.existsSync(src)) throw new Error(`missing render: ${src}`);
      const up = await uploadToR2({
        buffer: await jpeg(fs.readFileSync(src), 1200, 86),
        key: `${PREFIX}/after/${subject}--${style}.jpg`,
        contentType: "image/jpeg",
      });
      if (!up.success || !up.url) {
        throw new Error(`${subject}/${style} upload failed: ${up.error}`);
      }
      after[style] = up.url;
    }

    manifest[subject] = { before: before.url, after };
    console.log(`✓ ${subject}`);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  const urls = Object.values(manifest).flatMap((m) => [m.before, ...Object.values(m.after)]);
  const codes = await Promise.all(
    urls.map(async (u) => ({ u, status: (await fetch(u, { method: "HEAD" })).status }))
  );
  const bad = codes.filter((c) => c.status !== 200);
  if (bad.length) throw new Error(`CDN check failed:\n${bad.map((b) => `  ${b.status} ${b.u}`).join("\n")}`);
  console.log(`\n✓ ${urls.length} assets CDN-served — manifest: ${MANIFEST}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
