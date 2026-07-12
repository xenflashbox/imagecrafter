/**
 * Phase 2 gallery pair generator — PRODUCTION-PATH (no reimplementation).
 *
 * For one (subject, style-variant) pair, runs the exact two-step production
 * flow proven in Phase 1 (PLAN/results/phase1-wire-report.md):
 *   1. buildStandInDescriptor + buildStandInScenePrompt  (portrait-generation)
 *   2. generateStandInScene → live image-gen service      (portrait-generation)
 *   3. swapFaceIntoScene → Replicate multi-image Kontext  (replicate-portrait)
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/gallery/generate-pair.ts <style-slug> [subject]
 *   subject defaults to "adult-face" (the shipping v1 single-adult case).
 *
 * Vision leg is LIVE and fail-CLOSED (IMAGECRAFTER_ANTHROPIC_API_KEY): if
 * analysis fails, the run aborts — there is NO cached fallback. Each output
 * MUST still be visually verified by the lead before it becomes a gallery
 * asset. Outputs land in gitignored scripts/smoke/output/.
 *
 * Real spend: 1 service generation + 1 Replicate run (~$0.10-0.16/pair).
 */

import fs from "node:fs";
import path from "node:path";
import { fail, healthPreflight, loadEnv } from "../smoke/_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/gallery");

const SHIPPING_SLUGS = [
  "renaissance",
  "starry-night",
  "egyptian",
  "elven",
  "comic-hero",
];

async function main(): Promise<void> {
  const styleSlug = process.argv[2];
  const subject = process.argv[3] || "adult-face";
  if (!styleSlug) fail(`Usage: generate-pair.ts <style-slug> [subject]. Shipping: ${SHIPPING_SLUGS.join(", ")}`);
  if (!SHIPPING_SLUGS.includes(styleSlug)) {
    fail(`"${styleSlug}" is not a shipping style (${SHIPPING_SLUGS.join(", ")}) — cut/failed styles do not ship`);
  }

  console.log(`=== GALLERY PAIR: ${subject} × ${styleSlug} (production path) ===\n`);

  await healthPreflight();

  const {
    buildStandInDescriptor,
    buildStandInScenePrompt,
    generateStandInScene,
  } = await import("../../lib/services/portrait-generation");
  const { isFacePreservationAvailable, swapFaceIntoScene } = await import(
    "../../lib/services/replicate-portrait"
  );
  const { analyzePortraitPhoto } = await import(
    "../../lib/services/portrait-analysis"
  );

  if (!isFacePreservationAvailable()) {
    fail("Face preservation unavailable (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)");
  }

  const photoPath = path.join(INPUT_DIR, `${subject}.png`);
  if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
  const photoDataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;

  // LIVE vision only — fail-CLOSED. The cached-analysis fallback that used
  // to live here is the path that produced the Jul-11 stranger gallery and
  // is PROHIBITED (fix directive P1.2 + standing rule: if a dependency is
  // missing, fail loudly and stop — never proceed on stale data).
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) {
    fail(`Live vision analysis failed — run aborts (no fallback): ${live.error}`);
    return;
  }
  const analysis = live.analysis;
  const analysisSource = "LIVE vision analysis";
  console.log(`→ Analysis: ${analysisSource}`);

  const { prisma } = await import("../../lib/prisma");
  const variant = await prisma.styleVariant.findFirst({
    where: { slug: styleSlug },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  if (!variant) fail(`StyleVariant "${styleSlug}" not found in DB`);
  console.log(`→ Style: ${variant.stylePack.slug}/${variant.slug} ("${variant.name}") from DB`);

  const descriptor = buildStandInDescriptor(analysis);
  console.log(`→ Descriptor: "${descriptor}"`);
  const scenePrompt = buildStandInScenePrompt(
    variant.promptTemplate,
    descriptor,
    (variant.styleModifiers as Record<string, string>) || {},
    analysis
  );
  if (scenePrompt.includes("{{")) {
    fail(`Unreplaced placeholder in scene prompt: ${scenePrompt.slice(0, 200)}`);
  }
  console.log(`→ Scene prompt (${scenePrompt.length} chars): ${scenePrompt.slice(0, 160)}…`);

  console.log("\n→ Step 1: stand-in scene via image-gen service…");
  const t1 = Date.now();
  const scene = await generateStandInScene(scenePrompt, styleSlug);
  if ("error" in scene) fail(`Stand-in scene generation failed: ${scene.error}`);
  console.log(`  ✓ Scene in ${((Date.now() - t1) / 1000).toFixed(1)}s: ${scene.sceneUrl}`);

  console.log("→ Step 2: swapFaceIntoScene…");
  const swap = await swapFaceIntoScene({
    photoUrl: photoDataUri,
    sceneUrl: scene.sceneUrl,
    subjectKind: analysis.subjectType === "pet" ? "pet" : "person",
  });
  if (!swap.success || !swap.imageUrl) fail(`Identity swap failed: ${swap.error}`);
  console.log(`  ✓ Swap in ${swap.processingTimeMs}ms: ${swap.imageUrl}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const res = await fetch(swap.imageUrl);
  if (!res.ok) fail(`Failed to download output: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `${subject}-${styleSlug}.png`);
  fs.writeFileSync(outPath, buf);

  // Keep the stand-in scene URL for audit
  fs.appendFileSync(
    path.join(OUT_DIR, "manifest.jsonl"),
    JSON.stringify({
      ts: new Date().toISOString(),
      subject,
      styleSlug,
      pack: variant.stylePack.slug,
      analysisSource: analysisSource.split(" (")[0],
      sceneUrl: scene.sceneUrl,
      swapUrl: swap.imageUrl,
      outPath: path.relative(ROOT, outPath),
      bytes: buf.length,
      verified: false,
    }) + "\n"
  );

  console.log(`\n✓ PAIR GENERATED (${buf.length} bytes): ${outPath}`);
  console.log("  NEXT: lead visual verification required (style presence + identity" +
    (styleSlug === "comic-hero" ? " + IP-clean check" : "") + ") before gallery use.");

  await prisma.$disconnect();
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
