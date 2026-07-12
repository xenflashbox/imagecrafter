/**
 * Two-step face-into-scene PRODUCTION-PATH smoke.
 *
 * Exercises the exact production functions (no reimplementation):
 *   1. buildStandInDescriptor + buildStandInScenePrompt  (portrait-generation)
 *   2. generateStandInScene → live image-gen service      (portrait-generation)
 *   3. swapFaceIntoScene → Replicate multi-image Kontext  (replicate-portrait)
 *   4. checkIdentityPresence + checkStylePresence gates   (portrait-analysis)
 *
 * The subject analysis is LIVE vision only — fail-CLOSED. If the vision leg
 * is down the smoke aborts; there is NO cached fallback (fix directive P1.2).
 *
 * The style template is a REAL StyleVariant row from the database (no mock
 * template). Run against the Neon smoke branch:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/smoke/service-two-step.ts
 *
 * PRIVACY: the real photo enters as a data URI; swapFaceIntoScene uploads it
 * to Replicate Files internally and deletes it before returning. Photos are
 * never committed.
 *
 * Real spend: 1 service generation + 1-2 Replicate runs (~$0.08 each).
 */

import fs from "node:fs";
import path from "node:path";
import { fail, healthPreflight, loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output");

const SUBJECT = "adult-face"; // single adult — the shipping v1 case
const STYLE_VARIANT_SLUG = "renaissance"; // shipping style (ship list §9)

async function main(): Promise<void> {
  console.log("=== TWO-STEP FACE-INTO-SCENE SMOKE (production path) ===\n");

  await healthPreflight();

  const {
    buildStandInDescriptor,
    buildStandInScenePrompt,
    generateStandInScene,
  } = await import("../../lib/services/portrait-generation");
  const { isFacePreservationAvailable, swapFaceIntoScene } = await import(
    "../../lib/services/replicate-portrait"
  );
  const { analyzePortraitPhoto, checkStylePresence, checkIdentityPresence } =
    await import("../../lib/services/portrait-analysis");

  if (!isFacePreservationAvailable()) {
    fail(
      "Face preservation is not available (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)"
    );
  }

  const photoPath = path.join(INPUT_DIR, `${SUBJECT}.png`);
  if (!fs.existsSync(photoPath)) {
    fail(`Test photo not found: ${photoPath} (gitignored founder test set)`);
  }

  // --- Subject analysis: LIVE vision only — fail-CLOSED (fix directive P1.2:
  // the cached-analysis fallback is prohibited; if vision fails, abort) ------
  const photoDataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) {
    fail(`Live vision analysis failed — run aborts (no fallback): ${live.error}`);
    return;
  }
  const analysis = live.analysis;
  const analysisSource = "LIVE vision analysis";
  console.log(`\n→ Analysis source: ${analysisSource}`);
  console.log(
    `  subjectType=${analysis.subjectType} count=${analysis.subjectCount} coloring="${analysis.primarySubject.coloring?.slice(0, 80)}"`
  );

  // --- Real style template from the database --------------------------------
  const { prisma } = await import("../../lib/prisma");
  const variant = await prisma.styleVariant.findFirst({
    where: { slug: STYLE_VARIANT_SLUG },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  if (!variant) fail(`StyleVariant "${STYLE_VARIANT_SLUG}" not found in DB`);
  console.log(
    `→ Style template: ${variant.stylePack.slug}/${variant.slug} ("${variant.name}") from DB`
  );

  // --- Step 1: stand-in scene via live service ------------------------------
  const descriptor = buildStandInDescriptor(analysis);
  console.log(`→ Stand-in descriptor: "${descriptor}"`);

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

  console.log("\n→ Step 1: generating stand-in scene via image-gen service…");
  const t1 = Date.now();
  const scene = await generateStandInScene(scenePrompt, STYLE_VARIANT_SLUG);
  if ("error" in scene) fail(`Stand-in scene generation failed: ${scene.error}`);
  console.log(`  ✓ Scene in ${((Date.now() - t1) / 1000).toFixed(1)}s: ${scene.sceneUrl}`);

  // --- Step 2: identity swap (production function) ---------------------------
  // The photo goes in as a data URI; swapFaceIntoScene uploads both images to
  // Replicate Files internally and deletes them before returning (privacy).
  console.log("\n→ Step 2: swapFaceIntoScene (multi-image-kontext-pro)…");
  let swap = await swapFaceIntoScene({
    photoUrl: photoDataUri,
    sceneUrl: scene.sceneUrl,
    subjectKind: "person",
  });
  if (!swap.success || !swap.imageUrl) {
    fail(`Identity swap failed: ${swap.error}`);
  }
  console.log(`  ✓ Swap in ${swap.processingTimeMs}ms: ${swap.imageUrl}`);

  // --- Combined acceptance gate (production rule: identity + style, both
  // fail-CLOSED, one retry) ---------------------------------------------------
  const assess = async (imageUrl: string) => {
    const [identity, style] = await Promise.all([
      checkIdentityPresence(photoDataUri, imageUrl),
      checkStylePresence(imageUrl, `${variant.stylePack.name} — ${variant.name}`),
    ]);
    return { identity, style, pass: identity === "same" && style === "styled" };
  };
  let verdict = await assess(swap.imageUrl!);
  console.log(`→ Acceptance gate: identity=${verdict.identity} style=${verdict.style}`);
  if (!verdict.pass) {
    console.log("  Retrying swap once (production retry rule)…");
    const retry = await swapFaceIntoScene({
      photoUrl: photoDataUri,
      sceneUrl: scene.sceneUrl,
      subjectKind: "person",
    });
    if (retry.success && retry.imageUrl) {
      const retryVerdict = await assess(retry.imageUrl);
      console.log(
        `  Retry gate: identity=${retryVerdict.identity} style=${retryVerdict.style}`
      );
      if (retryVerdict.pass) {
        swap = retry;
        verdict = retryVerdict;
      }
    }
  }
  if (!verdict.pass) {
    fail(
      `Acceptance gate FAILED after retry (identity=${verdict.identity}, style=${verdict.style}) — output blocked`
    );
  }

  // --- Download the real output (gitignored dir) ------------------------------
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const res = await fetch(swap.imageUrl!);
  if (!res.ok) fail(`Failed to download final output: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `two-step-${SUBJECT}-${STYLE_VARIANT_SLUG}.png`);
  fs.writeFileSync(outPath, buf);

  console.log("\n✓ TWO-STEP SMOKE PASSED");
  console.log(`  Analysis: ${analysisSource.split(" — ")[0]}`);
  console.log(`  Stand-in scene: ${scene.sceneUrl}`);
  console.log(`  Final output URL: ${swap.imageUrl}`);
  console.log(`  Saved locally (${buf.length} bytes): ${outPath}`);
  console.log(`  Acceptance gate: identity=${verdict.identity} style=${verdict.style}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
