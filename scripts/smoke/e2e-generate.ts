/**
 * End-to-end verification of the PRODUCTION generation path.
 *
 * This calls `generatePortrait()` itself — the same function the
 * /api/portraits/generate route calls — so the architecture routing, both
 * generation legs, the acceptance gate, the watermark, the ×4 upscale and both
 * R2 uploads are all exercised exactly as a paying customer would exercise
 * them. Nothing here re-implements pipeline logic.
 *
 * The source photo is uploaded to R2 the same way the upload route uploads it,
 * because `generatePortrait` reads identity from `portrait.sourceImageUrl`.
 *
 * Usage:
 *   npx tsx scripts/smoke/e2e-generate.ts <subject> <style-pack> <style-variant> [runs]
 */

import fs from "node:fs";
import path from "node:path";
import { fail, loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");

async function main(): Promise<void> {
  const subject = process.argv[2];
  const packSlug = process.argv[3];
  const variantSlug = process.argv[4];
  const runs = Number(process.argv[5] || 1);
  if (!subject || !packSlug || !variantSlug) {
    fail("Usage: e2e-generate.ts <subject> <style-pack> <style-variant> [runs]");
  }

  const photoPath = path.join(INPUT_DIR, `${subject}.png`);
  if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
  const photoBytes = fs.readFileSync(photoPath);

  const { prisma } = await import("../../lib/prisma");
  const { uploadPortraitSource } = await import("../../lib/services/file-storage");
  const { generatePortrait } = await import("../../lib/services/portrait-generation");

  console.log(`=== E2E PRODUCTION PATH: ${subject} × ${packSlug}/${variantSlug} × ${runs} ===`);

  let passes = 0;
  for (let run = 1; run <= runs; run++) {
    const sessionId = `e2e-${Date.now()}-${run}`;
    const portraitId = sessionId.replace(/[^a-z0-9]/g, "");

    const upload = await uploadPortraitSource(photoBytes, "image/png", sessionId, portraitId);
    if (!upload.success || !upload.url || !upload.key) {
      fail(`Run ${run}: source upload to R2 failed: ${upload.error}`);
      return;
    }

    await prisma.portrait.create({
      data: {
        id: portraitId,
        userId: null,
        sessionId,
        sourceImageUrl: upload.url,
        sourceImageKey: upload.key,
        stylePackSlug: "",
        styleVariantSlug: "",
        subjectType: "person",
        subjectAnalysis: {},
        enhancedPrompt: "",
        status: "pending",
        updatedAt: new Date(),
      },
    });

    const started = Date.now();
    const result = await generatePortrait({
      portraitId,
      stylePackSlug: packSlug,
      styleVariantSlug: variantSlug,
      userId: null,
    });
    const secs = ((Date.now() - started) / 1000).toFixed(1);

    const row = await prisma.portrait.findUnique({
      where: { id: portraitId },
      select: { status: true, errorMessage: true, hiResImageUrl: true, enhancedPrompt: true },
    });

    if (result.success) {
      passes++;
      console.log(`run ${run}/${runs}: PASS (${secs}s) status=${row?.status}`);
      console.log(`  preview: ${result.previewImageUrl}`);
      console.log(`  hi-res:  ${row?.hiResImageUrl}`);
    } else {
      console.log(`run ${run}/${runs}: FAIL (${secs}s) status=${row?.status}`);
      console.log(`  error:   ${result.error} [${result.errorType}]`);
      console.log(`  db says: ${row?.errorMessage}`);
    }
    console.log(`  prompt:  ${(row?.enhancedPrompt || "").slice(0, 160)}…`);
  }

  console.log(`\n${passes}/${runs} passed the full production path`);
  console.log("  NOTE: gate approval is NOT acceptance — every output above needs lead review.");
  await prisma.$disconnect();
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
