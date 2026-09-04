/**
 * BEST-OF-N stand-in selection smoke — the proof for the pipeline rebuild.
 *
 * Mirrors the production acquireStandIn path exactly, using the production
 * functions (no reimplementation of the logic under test):
 *   1. generateStandInScene × N in parallel      (portrait-generation)
 *   2. checkStandInFidelity on every candidate   (portrait-analysis, the VETO)
 *   3. rankStandInCandidates on the survivors    (portrait-analysis, the RANKER)
 *   4. swapFaceIntoScene onto the chosen scene   (replicate-portrait)
 *   5. checkIdentityPresence + checkStylePresence (the acceptance gate)
 *
 * Then it does the thing the production path cannot: it ALSO swaps onto
 * eligible[0] — the candidate the old first-acceptable loop would have shipped
 * — whenever the ranker chose something else. Without that leg the run proves
 * the ranker returns an index, not that the index is worth the spend.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/smoke/best-of-n.ts \
 *     <style-variant-slug> <subject-basename> [runs]
 *
 * Real spend per run: N stand-in generations + 1-2 Replicate swaps.
 * PRIVACY: the photo enters as a data URI; the Replicate legs upload and delete
 * their own temporary files. Outputs land in the gitignored output dir.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, healthPreflight, loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/best-of-n");

const STYLE_VARIANT_SLUG = process.argv[2] || "renaissance";
const SUBJECT = process.argv[3] || "adult-face";
const RUNS = Number(process.argv[4]) || 3;
const N = Number(process.env.STANDIN_CANDIDATES) || 3;

type Verdict = { identity: string; style: string; pass: boolean };

async function main(): Promise<void> {
  console.log(
    `=== BEST-OF-N SMOKE — style=${STYLE_VARIANT_SLUG} subject=${SUBJECT} N=${N} runs=${RUNS} ===\n`
  );

  await healthPreflight();

  const { buildStandInDescriptor, buildStandInScenePrompt, generateStandInScene } =
    await import("../../lib/services/portrait-generation");
  const { isFacePreservationAvailable, swapFaceIntoScene } = await import(
    "../../lib/services/replicate-portrait"
  );
  const {
    analyzePortraitPhoto,
    checkStylePresence,
    checkIdentityPresence,
    checkStandInFidelity,
    rankStandInCandidates,
  } = await import("../../lib/services/portrait-analysis");

  if (!isFacePreservationAvailable()) {
    fail("Face preservation unavailable (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)");
  }

  const photoPath = path.join(INPUT_DIR, `${SUBJECT}.png`);
  if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
  const photoDataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;

  // Analysis is LIVE only — fail-CLOSED, no cached fallback (fix directive P1.2).
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) {
    fail(`Live vision analysis failed — run aborts: ${live.error}`);
    return;
  }
  const analysis = live.analysis;
  console.log(
    `→ Analysis: ${analysis.primarySubject.genderPresentation}, ${analysis.primarySubject.ageBracket}`
  );

  const { prisma } = await import("../../lib/prisma");
  const variant = await prisma.styleVariant.findFirst({
    where: { slug: STYLE_VARIANT_SLUG },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  if (!variant) fail(`StyleVariant "${STYLE_VARIANT_SLUG}" not found`);

  const scenePrompt = buildStandInScenePrompt(
    variant.promptTemplate,
    buildStandInDescriptor(analysis),
    (variant.styleModifiers as Record<string, string>) || {},
    analysis
  );
  if (scenePrompt.includes("{{")) fail(`Unreplaced placeholder: ${scenePrompt.slice(0, 200)}`);

  const styleLabel = `${variant.stylePack.name} — ${variant.name}`;
  const assess = async (imageUrl: string): Promise<Verdict> => {
    const [identity, style] = await Promise.all([
      checkIdentityPresence(photoDataUri, imageUrl),
      checkStylePresence(imageUrl, styleLabel),
    ]);
    return { identity, style, pass: identity === "same" && style === "styled" };
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const save = async (url: string, name: string): Promise<void> => {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠ could not save ${name}: HTTP ${res.status}`);
      return;
    }
    fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
  };

  const tally = { picked: 0, pickedPass: 0, firstPass: 0, diverged: 0 };

  for (let run = 1; run <= RUNS; run++) {
    const tag = `${STYLE_VARIANT_SLUG}-${SUBJECT}-run${run}`;
    console.log(`\n──────── RUN ${run}/${RUNS} ────────`);

    const t0 = Date.now();
    const results = await Promise.all(
      Array.from({ length: N }, () => generateStandInScene(scenePrompt, STYLE_VARIANT_SLUG))
    );
    const sceneUrls = results.flatMap((r) => ("error" in r ? [] : [r.sceneUrl]));
    console.log(
      `→ ${sceneUrls.length}/${N} candidates rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
    for (const r of results) if ("error" in r) console.warn(`  ⚠ candidate failed: ${r.error}`);
    if (sceneUrls.length === 0) {
      console.error("  ✗ RUN FAILED: no candidates rendered");
      continue;
    }
    await Promise.all(sceneUrls.map((u, i) => save(u, `${tag}-cand${i + 1}.png`)));

    const fidelities = await Promise.all(
      sceneUrls.map((u) => checkStandInFidelity(photoDataUri, u))
    );
    console.log(`→ Fidelity veto: ${fidelities.join(", ")}`);
    if (fidelities.includes("unknown")) {
      console.error("  ✗ RUN ABORTED: fidelity verifier blind (production fails closed here)");
      continue;
    }
    const eligible = sceneUrls.filter((_, i) => fidelities[i] === "match");
    if (eligible.length === 0) {
      console.error(`  ✗ RUN FAILED: all ${sceneUrls.length} candidates vetoed`);
      continue;
    }

    const best = await rankStandInCandidates(photoDataUri, eligible);
    if (best === null) {
      console.error("  ✗ Ranker UNAVAILABLE — production would degrade to eligible[0]");
      continue;
    }
    tally.picked++;
    console.log(`→ Ranker picked candidate ${best + 1} of ${eligible.length} eligible`);

    const swapAndGate = async (sceneUrl: string, label: string): Promise<Verdict | null> => {
      const swap = await swapFaceIntoScene({
        photoUrl: photoDataUri,
        sceneUrl,
        subjectKind: analysis.subjectType === "pet" ? "pet" : "person",
        subjectAge: analysis.primarySubject.ageBracket,
      });
      if (!swap.success || !swap.imageUrl) {
        console.error(`  ✗ ${label} swap failed: ${swap.error}`);
        return null;
      }
      await save(swap.imageUrl, `${tag}-${label}.png`);
      const v = await assess(swap.imageUrl);
      console.log(`  ${label}: identity=${v.identity} style=${v.style} → ${v.pass ? "PASS" : "FAIL"}`);
      return v;
    };

    const pickedVerdict = await swapAndGate(eligible[best], "PICKED");
    if (pickedVerdict?.pass) tally.pickedPass++;

    // The A/B leg: only meaningful when the ranker disagreed with the old
    // first-acceptable behaviour. When best === 0 the two are the same image,
    // so re-swapping would just buy a second sample of swap variance.
    if (best !== 0) {
      tally.diverged++;
      const firstVerdict = await swapAndGate(eligible[0], "FIRST");
      if (firstVerdict?.pass) tally.firstPass++;
    } else {
      if (pickedVerdict?.pass) tally.firstPass++;
      console.log("  (ranker agreed with first-acceptable — no separate A/B leg)");
    }
  }

  console.log(`\n=== SUMMARY: ${STYLE_VARIANT_SLUG} / ${SUBJECT} ===`);
  console.log(`  runs ranked:          ${tally.picked}/${RUNS}`);
  console.log(`  ranker disagreed:     ${tally.diverged}/${tally.picked}`);
  console.log(`  gate PASS (picked):   ${tally.pickedPass}/${tally.picked}`);
  console.log(`  gate PASS (first):    ${tally.firstPass}/${tally.picked}`);
  console.log(`  images: ${OUT_DIR}`);
  console.log("  Gate PASS is necessary, not sufficient — inspect the images by eye.");

  await prisma.$disconnect();
}

main().catch((err) => fail(err instanceof Error ? err.stack || err.message : String(err)));
