/**
 * Upscale smoke — runs the REAL production upscale path
 * (upscalePortraitBuffer from lib/services/replicate-portrait.ts +
 * prepareHiResImage from lib/services/watermark.ts) against a real image.
 *
 * Checks:
 *   1. Input measured (expect ~1MP engine output)
 *   2. Real-ESRGAN ×4 succeeds via Replicate
 *   3. Output long edge ≥ 3.9× input long edge
 *   4. prepareHiResImage caps at PORTRAIT_HIRES_RESOLUTION (4096)
 *   5. Final long edge ≥ 4000px (the "full 4K" promise)
 *
 * Run: SMOKE_IMAGE_URL=<real image url> npx tsx scripts/smoke/upscale-smoke.ts
 * Requires REPLICATE_API_TOKEN + ENABLE_FACE_PRESERVATION=true in env.
 */

import sharp from "sharp";
import { upscalePortraitBuffer } from "../../lib/services/replicate-portrait";
import { prepareHiResImage } from "../../lib/services/watermark";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const url = process.env.SMOKE_IMAGE_URL;
  if (!url) {
    console.error("SMOKE_IMAGE_URL is required (a real portrait-like image URL)");
    process.exit(1);
  }

  const res = await fetch(url, { headers: { "user-agent": "ImageCrafter/1.0" } });
  if (!res.ok) {
    console.error(`Failed to fetch smoke image: HTTP ${res.status}`);
    process.exit(1);
  }
  const input = Buffer.from(await res.arrayBuffer());
  const inMeta = await sharp(input).metadata();
  const inLong = Math.max(inMeta.width || 0, inMeta.height || 0);
  console.log(`Input: ${inMeta.width}x${inMeta.height} (${input.length} bytes)`);
  check("input measured", inLong > 0, `${inMeta.width}x${inMeta.height}`);

  const t0 = Date.now();
  const up = await upscalePortraitBuffer(input);
  check("upscale succeeded", up.success && !!up.buffer, up.error || `${Date.now() - t0}ms`);
  if (!up.success || !up.buffer) {
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    process.exit(1);
  }

  const upMeta = await sharp(up.buffer).metadata();
  const upLong = Math.max(upMeta.width || 0, upMeta.height || 0);
  console.log(`Upscaled: ${upMeta.width}x${upMeta.height} (${up.buffer.length} bytes, ${up.processingTimeMs}ms)`);
  check("output ≥ 3.9× input long edge", upLong >= inLong * 3.9, `${inLong} → ${upLong}`);

  const hiRes = await prepareHiResImage(up.buffer);
  check("prepareHiResImage succeeded", hiRes.success && !!hiRes.buffer, hiRes.error);
  if (hiRes.success && hiRes.buffer) {
    const cap = parseInt(process.env.PORTRAIT_HIRES_RESOLUTION || "4096");
    const hrMeta = await sharp(hiRes.buffer).metadata();
    const hrLong = Math.max(hrMeta.width || 0, hrMeta.height || 0);
    console.log(`Hi-res final: ${hrMeta.width}x${hrMeta.height} (${hiRes.buffer.length} bytes)`);
    check(`capped at ${cap}`, hrLong <= cap, `long edge ${hrLong}`);
    check("final long edge ≥ 4000 (4K promise)", hrLong >= 4000, `long edge ${hrLong}`);
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE CRASHED:", err);
  process.exit(1);
});
