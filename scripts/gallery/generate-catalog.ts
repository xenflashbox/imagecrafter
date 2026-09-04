/**
 * Catalog-wide gallery generator — PRODUCTION-PATH, one output per active style.
 *
 * Runs the same two-step flow as generate-pair.ts across every active
 * StyleVariant, and KEEPS EVERY OUTPUT regardless of the acceptance gate.
 * The gate's identity/style verdict is recorded in the manifest, not used to
 * discard work: it has erred in both directions, and the founder judges the
 * image. IP safety is the one axis that still blocks — an infringing frame is
 * legal exposure, not taste, so it is quarantined instead of shipped.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/gallery/generate-catalog.ts [--subject=adult-face] [--only=a,b]
 *
 * Resumable: a style whose output file already exists is skipped, so an
 * interrupted run resumes without re-spending.
 *
 * Real spend: ~$0.10-0.16 per style, plus image-gen service credits.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, healthPreflight, loadEnv } from "../smoke/_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/catalog");

// Scene comes from the customer, so there is no canonical example to generate.
const SKIP_PACKS = new Set(["custom-scene"]);
const IP_SENSITIVE = new Set(["comic-hero"]);
const MAX_STANDIN_ATTEMPTS = 3;
const MAX_SWAP_ATTEMPTS = 2;

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const subject = arg("subject") || "adult-face";
  const only = arg("only")?.split(",").map((s) => s.trim()).filter(Boolean);

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
    checkIpSafety,
  } = await import("../../lib/services/portrait-analysis");

  if (!isFacePreservationAvailable()) {
    fail("Face preservation unavailable (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)");
  }

  const photoPath = path.join(INPUT_DIR, `${subject}.png`);
  if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
  const photoDataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;

  // One live analysis for the whole catalog — same photo, same subject.
  // Fail-CLOSED: no cached fallback (P1.2).
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) {
    fail(`Live vision analysis failed — run aborts (no fallback): ${live.error}`);
    return;
  }
  const analysis = live.analysis;
  const descriptor = buildStandInDescriptor(analysis);
  console.log(`→ Subject: ${subject}\n→ Descriptor: "${descriptor}"\n`);

  const { prisma } = await import("../../lib/prisma");
  const variants = await prisma.styleVariant.findMany({
    where: { isActive: true, stylePack: { isActive: true } },
    include: { stylePack: { select: { slug: true, name: true } } },
    orderBy: [{ stylePack: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  const queue = variants.filter(
    (v) => !SKIP_PACKS.has(v.stylePack.slug) && (!only || only.includes(v.slug))
  );
  console.log(`→ ${queue.length} styles queued (of ${variants.length} active)\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const subjectKind = analysis.subjectType === "pet" ? ("pet" as const) : ("person" as const);
  const subjectAge = analysis.primarySubject.ageBracket;
  const summary: string[] = [];

  for (const [i, variant] of queue.entries()) {
    const slug = variant.slug;
    const label = `[${i + 1}/${queue.length}] ${variant.stylePack.slug}/${slug}`;
    const outPath = path.join(OUT_DIR, `${subject}-${slug}.png`);
    if (fs.existsSync(outPath)) {
      console.log(`${label} — already generated, skipping`);
      summary.push(`${slug}: skipped (exists)`);
      continue;
    }

    console.log(`\n${label} "${variant.name}"`);
    try {
      const scenePrompt = buildStandInScenePrompt(
        variant.promptTemplate,
        descriptor,
        (variant.styleModifiers as Record<string, string>) || {},
        analysis
      );
      if (scenePrompt.includes("{{")) {
        throw new Error(`Unreplaced placeholder in scene prompt: ${scenePrompt.slice(0, 160)}`);
      }

      let sceneUrl: string | null = null;
      for (let attempt = 1; attempt <= MAX_STANDIN_ATTEMPTS && !sceneUrl; attempt++) {
        const scene = await generateStandInScene(scenePrompt, slug);
        if ("error" in scene) throw new Error(`Stand-in generation failed: ${scene.error}`);
        const fidelity = await checkStandInFidelity(photoDataUri, scene.sceneUrl, subjectKind);
        console.log(`  stand-in ${attempt}/${MAX_STANDIN_ATTEMPTS}: fidelity=${fidelity}`);
        if (fidelity === "match") sceneUrl = scene.sceneUrl;
        else if (fidelity === "unknown") {
          throw new Error("Stand-in fidelity verification unavailable — abort (fail-closed)");
        }
      }
      if (!sceneUrl) throw new Error(`Stand-in never matched subject after ${MAX_STANDIN_ATTEMPTS} attempts`);

      const styleDescription = `${variant.stylePack.name} — ${variant.name}`;
      const assess = async (imageUrl: string) => {
        const [identity, style, ip] = await Promise.all([
          checkIdentityPresence(photoDataUri, imageUrl),
          checkStylePresence(imageUrl, styleDescription),
          IP_SENSITIVE.has(slug) ? checkIpSafety(imageUrl) : Promise.resolve("clean" as const),
        ]);
        return { identity, style, ip, pass: identity === "same" && style === "styled" && ip === "clean" };
      };

      let swap = await swapFaceIntoScene({ photoUrl: photoDataUri, sceneUrl, subjectKind, subjectAge });
      if (!swap.success || !swap.imageUrl) throw new Error(`Identity swap failed: ${swap.error}`);
      let verdict = await assess(swap.imageUrl);
      let swapAttempts = 1;
      console.log(`  swap 1: identity=${verdict.identity} style=${verdict.style} ip=${verdict.ip}`);

      // Rank so a retry can only ever replace a weaker attempt. Keeping the LAST
      // attempt instead of the BEST silently threw away good swaps.
      const rank = (v: typeof verdict) =>
        v.ip !== "clean" ? -1 : v.pass ? 3 : v.identity === "same" ? 2 : 1;

      for (let attempt = 2; attempt <= MAX_SWAP_ATTEMPTS && !verdict.pass; attempt++) {
        const retry = await swapFaceIntoScene({ photoUrl: photoDataUri, sceneUrl, subjectKind, subjectAge });
        if (!retry.success || !retry.imageUrl) continue;
        swapAttempts = attempt;
        const retryVerdict = await assess(retry.imageUrl);
        console.log(
          `  swap ${attempt}: identity=${retryVerdict.identity} style=${retryVerdict.style} ip=${retryVerdict.ip}`
        );
        if (rank(retryVerdict) > rank(verdict)) {
          swap = retry;
          verdict = retryVerdict;
        } else {
          console.log(`  swap ${attempt} not better than swap 1 — keeping the earlier one`);
        }
      }

      const res = await fetch(swap.imageUrl!);
      if (!res.ok) throw new Error(`Failed to download output: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      // Only IP quarantines. Identity/style verdicts are recorded, not enforced.
      const blocked = verdict.ip !== "clean";
      const dest = blocked ? path.join(OUT_DIR, "ip-blocked", `${subject}-${slug}.png`) : outPath;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);

      fs.appendFileSync(
        path.join(OUT_DIR, "manifest.jsonl"),
        JSON.stringify({
          ts: new Date().toISOString(),
          subject,
          styleSlug: slug,
          pack: variant.stylePack.slug,
          sceneUrl,
          swapUrl: swap.imageUrl,
          outPath: path.relative(ROOT, dest),
          bytes: buf.length,
          verdict: { ...verdict, swapAttempts },
          ipBlocked: blocked,
          verified: false,
        }) + "\n"
      );

      const state = blocked ? "IP-BLOCKED" : verdict.pass ? "gate-pass" : "gate-fail (kept)";
      console.log(`  ✓ ${state} — ${path.relative(ROOT, dest)} (${buf.length} bytes)`);
      summary.push(`${slug}: ${state} identity=${verdict.identity} style=${verdict.style}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${slug} errored: ${msg}`);
      summary.push(`${slug}: ERROR ${msg}`);
    }
  }

  console.log(`\n=== CATALOG RUN COMPLETE (${queue.length} styles) ===`);
  for (const line of summary) console.log(`  ${line}`);
  console.log("\nEvery kept output needs founder visual review before it becomes a gallery asset.");
  await prisma.$disconnect();
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
