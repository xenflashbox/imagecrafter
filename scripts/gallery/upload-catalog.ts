/**
 * Upload the generated catalog examples to R2 so every advertised style has a
 * real tile. generate-catalog.ts writes PNGs to disk and stops; without this
 * step the DB keeps an empty sampleImageUrl and the styles grid renders
 * broken-image icons.
 *
 * Run: npx tsx scripts/gallery/upload-catalog.ts
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../smoke/_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const CATALOG_DIR = path.join(ROOT, "scripts/smoke/output/catalog");
const MANIFEST = path.join(ROOT, "scripts/gallery/catalog-manifest.json");
const PREFIX = "catalog/v1";

// Templates that name a living/estate-held artist or a trademarked publication
// and render it as legible signage (task #90). Third-party IP is the one axis
// that blocks publication outright, taste notwithstanding.
const IP_HELD = new Set(["1950s", "art-deco"]);

async function main(): Promise<void> {
  const { uploadToR2, generateThumbnail, isR2Available } = await import("../../lib/r2");
  if (!isR2Available()) throw new Error("R2 not configured (R2_* env vars)");

  const slugs = fs
    .readdirSync(CATALOG_DIR)
    .filter((f) => f.startsWith("adult-face-") && f.endsWith(".png"))
    .map((f) => f.slice("adult-face-".length, -".png".length))
    .sort();

  const manifest: Record<string, { full: string; thumb: string }> = {};

  for (const slug of slugs) {
    if (IP_HELD.has(slug)) {
      console.warn(`⚠ HELD BACK (third-party IP in template): ${slug}`);
      continue;
    }
    const buf = fs.readFileSync(path.join(CATALOG_DIR, `adult-face-${slug}.png`));
    const full = await uploadToR2({
      buffer: buf,
      key: `${PREFIX}/full/${slug}.png`,
      contentType: "image/png",
    });
    if (!full.success || !full.url) throw new Error(`${slug} full upload failed: ${full.error}`);
    const thumb = await uploadToR2({
      buffer: await generateThumbnail(buf, { maxWidth: 800, maxHeight: 800, quality: 82 }),
      key: `${PREFIX}/thumb/${slug}.jpg`,
      contentType: "image/jpeg",
    });
    if (!thumb.success || !thumb.url) throw new Error(`${slug} thumb upload failed: ${thumb.error}`);
    manifest[slug] = { full: full.url, thumb: thumb.url };
    console.log(`✓ ${slug}`);
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nManifest written: ${MANIFEST} (${Object.keys(manifest).length} styles)`);

  for (const [slug, urls] of Object.entries(manifest)) {
    const [f, t] = await Promise.all([
      fetch(urls.full, { method: "HEAD" }),
      fetch(urls.thumb, { method: "HEAD" }),
    ]);
    if (!f.ok || !t.ok) throw new Error(`CDN check failed for ${slug}: full=${f.status} thumb=${t.status}`);
  }
  console.log("✓ All catalog assets CDN-served");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
