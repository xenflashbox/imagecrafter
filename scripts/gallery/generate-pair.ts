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
  const {
    analyzePortraitPhoto,
    checkStandInFidelity,
    checkIdentityPresence,
    checkStylePresence,
  } = await import("../../lib/services/portrait-analysis");

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

  // Step 1 + FIDELITY GATE — same loop as generatePortrait (P2.2, P3 pins):
  // mismatch → regenerate (max 3), unknown → abort fail-closed.
  const MAX_STANDIN_ATTEMPTS = 3;
  let sceneUrl: string | null = null;
  for (let attempt = 1; attempt <= MAX_STANDIN_ATTEMPTS; attempt++) {
    console.log(`\n→ Step 1: stand-in scene attempt ${attempt}/${MAX_STANDIN_ATTEMPTS} (pinned engine)…`);
    const t1 = Date.now();
    const scene = await generateStandInScene(scenePrompt, styleSlug);
    if ("error" in scene) fail(`Stand-in scene generation failed: ${scene.error}`);
    console.log(`  scene in ${((Date.now() - t1) / 1000).toFixed(1)}s: ${scene.sceneUrl}`);
    const fidelity = await checkStandInFidelity(photoDataUri, scene.sceneUrl);
    console.log(`  fidelity gate: ${fidelity}`);
    if (fidelity === "match") {
      sceneUrl = scene.sceneUrl;
      break;
    }
    if (fidelity === "unknown") fail("Stand-in fidelity verification unavailable — abort (fail-closed)");
  }
  if (!sceneUrl) {
    fail(`Stand-in did not match subject coloring after ${MAX_STANDIN_ATTEMPTS} attempts`);
    return;
  }

  // Step 2 + COMBINED ACCEPTANCE GATE — same as generatePortrait (P2.1 + P1):
  // identity=same AND style=styled, both fail-closed, one swap retry.
  const subjectKind = analysis.subjectType === "pet" ? ("pet" as const) : ("person" as const);
  const styleDescription = `${variant.stylePack.name} — ${variant.name}`;
  const assessSwap = async (imageUrl: string) => {
    const [identity, style] = await Promise.all([
      checkIdentityPresence(photoDataUri, imageUrl),
      checkStylePresence(imageUrl, styleDescription),
    ]);
    return { identity, style, pass: identity === "same" && style === "styled" };
  };

  // The gate is a COST FILTER, not the acceptance authority — it has produced
  // both false rejects and a confirmed false pass. Keep every rejected image so
  // a human can adjudicate; without this a failing run leaves no evidence and
  // tuning proceeds blind against an unreliable oracle.
  const keepRejected = async (url: string, tag: string) => {
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const dir = path.join(OUT_DIR, "rejected");
      fs.mkdirSync(dir, { recursive: true });
      const p = path.join(dir, `${subject}-${styleSlug}-${tag}.png`);
      fs.writeFileSync(p, Buffer.from(await r.arrayBuffer()));
      console.log(`  kept rejected output for review: ${path.relative(ROOT, p)}`);
    } catch (e) {
      console.log(`  WARNING: could not keep rejected output (${tag}): ${String(e)}`);
    }
  };

  console.log("→ Step 2: swapFaceIntoScene…");
  const subjectAge = analysis.primarySubject.ageBracket;
  let swap = await swapFaceIntoScene({ photoUrl: photoDataUri, sceneUrl, subjectKind, subjectAge });
  if (!swap.success || !swap.imageUrl) fail(`Identity swap failed: ${swap.error}`);
  console.log(`  swap in ${swap.processingTimeMs}ms: ${swap.imageUrl}`);
  let verdict = await assessSwap(swap.imageUrl!);
  console.log(`  acceptance gate: identity=${verdict.identity} style=${verdict.style}`);
  if (!verdict.pass) {
    await keepRejected(swap.imageUrl!, "attempt1");
    console.log("  → gate failed — retrying swap once (same scene)…");
    const retry = await swapFaceIntoScene({ photoUrl: photoDataUri, sceneUrl, subjectKind, subjectAge });
    if (retry.success && retry.imageUrl) {
      const retryVerdict = await assessSwap(retry.imageUrl);
      console.log(`  retry acceptance gate: identity=${retryVerdict.identity} style=${retryVerdict.style}`);
      if (retryVerdict.pass) {
        swap = retry;
        verdict = retryVerdict;
      } else {
        await keepRejected(retry.imageUrl, "attempt2");
      }
    }
  }
  if (!verdict.pass) {
    fail(`Output failed acceptance gate (identity=${verdict.identity}, style=${verdict.style}) — style HELD BACK, not gallery-eligible this run`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const res = await fetch(swap.imageUrl!);
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
      sceneUrl,
      swapUrl: swap.imageUrl,
      outPath: path.relative(ROOT, outPath),
      bytes: buf.length,
      gates: { identity: verdict.identity, style: verdict.style },
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
