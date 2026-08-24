/**
 * PET CATALOG — the GTM build, not a lab test.
 *
 * Runs the real production pet path (the same functions generatePortrait calls)
 * across the launch catalog: every subject x every style, one cell each.
 * Output is the shippable gallery asset AND the sheet the founder judges.
 *
 * Usage:
 *   DATABASE_URL=$(cat /tmp/ic_smoke_db) npx tsx scripts/smoke/pet-catalog.ts \
 *     [subject,subject,...] [style,style,...]
 *
 * Real spend per cell: N stand-in generations + 1 swap + 3 vision calls.
 */

import fs from "node:fs";
import path from "node:path";
import { fail, healthPreflight, loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/pet-catalog");

const SUBJECTS = (process.argv[2] || "s-cat-tabby,s-cat-white,s-cat-grey").split(",");
const STYLES = (process.argv[3] || "baroque,oil-painting,disco").split(",");
const N = Number(process.env.STANDIN_CANDIDATES) || 3;

type Cell = {
  subject: string;
  style: string;
  status: "ok" | "failed";
  note: string;
  identity?: string;
  styleVerdict?: string;
  seconds: number;
};

async function main(): Promise<void> {
  console.log(
    `=== PET CATALOG — ${SUBJECTS.length} subjects x ${STYLES.length} styles = ${
      SUBJECTS.length * STYLES.length
    } cells (N=${N}) ===\n`
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
  const { prisma } = await import("../../lib/prisma");

  if (!isFacePreservationAvailable()) {
    fail("Face preservation unavailable (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)");
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const save = async (url: string, name: string): Promise<void> => {
    const res = await fetch(url);
    if (!res.ok) return console.warn(`  ⚠ could not save ${name}: HTTP ${res.status}`);
    fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(await res.arrayBuffer()));
  };

  // Analysis once per subject — it is the same photo for every style, and the
  // pet branch of buildStandInDescriptor reads only the analysis.
  const subjects = new Map<string, { dataUri: string; analysis: any }>();
  for (const subject of SUBJECTS) {
    const photoPath = path.join(INPUT_DIR, `${subject}.png`);
    if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
    const dataUri = `data:image/png;base64,${fs.readFileSync(photoPath).toString("base64")}`;
    const live = await analyzePortraitPhoto(dataUri);
    if (!live.success || !live.analysis) fail(`Analysis failed for ${subject}: ${live.error}`);
    const analysis = live.analysis!;
    const p = analysis.primarySubject;
    console.log(
      `→ ${subject}: subjectType=${analysis.subjectType} species=${p.species || "-"} breed=${
        p.breed || "-"
      }`
    );
    console.log(`  descriptor: "${buildStandInDescriptor(analysis)}"`);
    if (analysis.subjectType !== "pet") {
      console.warn(`  ⚠ ${subject} was NOT classified as a pet — the human path will run`);
    }
    subjects.set(subject, { dataUri, analysis });
  }

  const variants = new Map<string, any>();
  for (const style of STYLES) {
    const v = await prisma.styleVariant.findFirst({
      where: { slug: style },
      include: { stylePack: { select: { slug: true, name: true } } },
    });
    if (!v) fail(`StyleVariant "${style}" not found`);
    variants.set(style, v);
  }

  console.log("");
  const cells: Cell[] = [];

  for (const style of STYLES) {
    const variant = variants.get(style);
    const styleLabel = `${variant.stylePack.name} — ${variant.name}`;

    for (const subject of SUBJECTS) {
      const { dataUri, analysis } = subjects.get(subject)!;
      const tag = `${style}--${subject}`;
      const t0 = Date.now();
      const secs = () => (Date.now() - t0) / 1000;
      const record = (status: Cell["status"], note: string, extra: Partial<Cell> = {}) => {
        cells.push({ subject, style, status, note, seconds: secs(), ...extra });
        console.log(`  ${status === "ok" ? "✓" : "✗"} ${tag} — ${note} (${secs().toFixed(1)}s)`);
      };

      const scenePrompt = buildStandInScenePrompt(
        variant.promptTemplate,
        buildStandInDescriptor(analysis),
        (variant.styleModifiers as Record<string, string>) || {},
        analysis
      );
      if (scenePrompt.includes("{{")) fail(`Unreplaced placeholder in ${tag}`);

      const results = await Promise.all(
        Array.from({ length: N }, () => generateStandInScene(scenePrompt, style))
      );
      const sceneUrls = results.flatMap((r) => ("error" in r ? [] : [r.sceneUrl]));
      if (sceneUrls.length === 0) {
        record("failed", "no stand-in candidates rendered");
        continue;
      }

      // The fidelity gate and the ranker were both written against human
      // subjects. If they come back blind on animals, say so — production
      // fails closed here, so a silent pass would misreport what ships.
      const fidelities = await Promise.all(
        sceneUrls.map((u) =>
          checkStandInFidelity(dataUri, u, analysis.subjectType === "pet" ? "pet" : "person")
        )
      );
      const eligible = sceneUrls.filter((_, i) => fidelities[i] === "match");
      if (eligible.length === 0) {
        await save(sceneUrls[0], `${tag}--VETOED-standin.png`);
        record("failed", `all ${sceneUrls.length} stand-ins vetoed (${fidelities.join(",")})`);
        continue;
      }

      const best = await rankStandInCandidates(dataUri, eligible);
      const sceneUrl = eligible[best === null ? 0 : best];
      await save(sceneUrl, `${tag}--standin.png`);

      const swap = await swapFaceIntoScene({
        photoUrl: dataUri,
        sceneUrl,
        subjectKind: analysis.subjectType === "pet" ? "pet" : "person",
        subjectAge: analysis.primarySubject.ageBracket,
      });
      if (!swap.success || !swap.imageUrl) {
        record("failed", `swap failed: ${swap.error}`);
        continue;
      }
      await save(swap.imageUrl, `${tag}--final.png`);

      const [identity, styleVerdict] = await Promise.all([
        checkIdentityPresence(dataUri, swap.imageUrl),
        checkStylePresence(swap.imageUrl, styleLabel),
      ]);
      record("ok", `identity=${identity} style=${styleVerdict}`, {
        identity,
        styleVerdict,
      });
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "cells.json"),
    JSON.stringify({ subjects: SUBJECTS, styles: STYLES, cells }, null, 2)
  );

  const ok = cells.filter((c) => c.status === "ok").length;
  console.log(`\n=== ${ok}/${cells.length} cells produced an image ===`);
  console.log("Gate verdicts are instrumentation. The founder judges by eye.");
  console.log(`  images: ${OUT_DIR}`);

  await prisma.$disconnect();
}

main().catch((err) => fail(err instanceof Error ? err.stack || err.message : String(err)));
