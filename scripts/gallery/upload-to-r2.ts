/**
 * Phase 2: upload the verified gallery pairs to R2 (CDN-hosted, not committed).
 *
 * Uploads, per shipping style: the full production output PNG and an 800px
 * JPEG thumbnail (for pack cards). Plus the rights-cleared "before" photo
 * (founder test set — gitignored locally, hosted on R2 for the before/after
 * section).
 *
 * Prints the resulting public URLs as JSON (scripts/gallery/r2-manifest.json)
 * for the DB update step.
 *
 * Run: npx tsx scripts/gallery/upload-to-r2.ts
 */

import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../smoke/_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const GALLERY_DIR = path.join(ROOT, "scripts/smoke/output/gallery");
const BEFORE_PHOTO = path.join(ROOT, "scripts/faceswap-timebox/input/adult-face.png");

const STYLES = ["renaissance", "starry-night", "egyptian", "elven", "comic-hero"];

// v3: regenerated 2026-08-17 on the repaired pipeline (skin-tone scale
// calibration, faceShape in the descriptor, photo-anchored fidelity gate,
// style gate no longer false-rejecting). Assets are cached immutable for 1yr,
// so replaced content MUST get new keys.
const GALLERY_PREFIX = "gallery/v3";

async function main(): Promise<void> {
  const { uploadToR2, generateThumbnail, isR2Available } = await import("../../lib/r2");
  if (!isR2Available()) throw new Error("R2 not configured (R2_* env vars)");

  const manifest: Record<string, { full: string; thumb: string }> = {};

  const beforeBuf = fs.readFileSync(BEFORE_PHOTO);
  const beforeRes = await uploadToR2({
    buffer: beforeBuf,
    key: `${GALLERY_PREFIX}/before/adult-face.png`,
    contentType: "image/png",
  });
  if (!beforeRes.success || !beforeRes.url) throw new Error(`before upload failed: ${beforeRes.error}`);
  const beforeThumbRes = await uploadToR2({
    buffer: await generateThumbnail(beforeBuf, { maxWidth: 800, maxHeight: 800, quality: 82 }),
    key: `${GALLERY_PREFIX}/before/adult-face-thumb.jpg`,
    contentType: "image/jpeg",
  });
  if (!beforeThumbRes.success || !beforeThumbRes.url) throw new Error(`before thumb upload failed: ${beforeThumbRes.error}`);
  manifest["before"] = { full: beforeRes.url, thumb: beforeThumbRes.url };
  console.log(`✓ before: ${beforeRes.url}`);

  for (const style of STYLES) {
    const file = path.join(GALLERY_DIR, `adult-face-${style}.png`);
    if (!fs.existsSync(file)) {
      // Gate-failed styles never produce a file — they are HELD BACK, not
      // uploaded. The DB update step deactivates them.
      console.warn(`⚠ HELD BACK (no gate-passing output): ${style}`);
      continue;
    }
    const buf = fs.readFileSync(file);
    const fullRes = await uploadToR2({
      buffer: buf,
      key: `${GALLERY_PREFIX}/after/${style}.png`,
      contentType: "image/png",
    });
    if (!fullRes.success || !fullRes.url) throw new Error(`${style} upload failed: ${fullRes.error}`);
    const thumbRes = await uploadToR2({
      buffer: await generateThumbnail(buf, { maxWidth: 800, maxHeight: 800, quality: 82 }),
      key: `${GALLERY_PREFIX}/thumbs/${style}.jpg`,
      contentType: "image/jpeg",
    });
    if (!thumbRes.success || !thumbRes.url) throw new Error(`${style} thumb upload failed: ${thumbRes.error}`);
    manifest[style] = { full: fullRes.url, thumb: thumbRes.url };
    console.log(`✓ ${style}: ${fullRes.url}`);
  }

  const outPath = path.join(ROOT, "scripts/gallery/r2-manifest.json");
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nManifest written: ${outPath}`);

  // Verify CDN-served: fetch each public URL
  for (const [k, v] of Object.entries(manifest)) {
    const res = await fetch(v.full, { method: "HEAD" });
    const tres = await fetch(v.thumb, { method: "HEAD" });
    console.log(`  ${k}: full HTTP ${res.status}, thumb HTTP ${tres.status}`);
    if (!res.ok || !tres.ok) throw new Error(`CDN check failed for ${k}`);
  }
  console.log("✓ All gallery assets CDN-served");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
