/**
 * Single-pass vs two-step A/B bench.
 *
 * WHY THIS EXISTS. The production flow is two-step: the photo is turned into an
 * English description, a generic stand-in is generated FROM THAT TEXT, and the
 * face is then swapped onto it. Identity therefore travels
 * photo -> text -> image -> swap, and everything the swap cannot redraw (skin
 * tone, hair, head geometry, build) is inherited from an image that was built
 * out of words. Every defect found on 2026-08-18 lived in that round trip.
 *
 * The architecture it replaced fed the REAL PHOTO straight to Kontext with the
 * style template and the neutral subject phrase "this person" — no description,
 * no stand-in. Its archived scores (PLAN/results/faceswap-timebox.md) were
 * renaissance 8/8, starry-night 4/4, comic-hero 4/4, and deterministic
 * (within-pair agreement 12/12); it was retired only because egyptian (0/4) and
 * elven (0/4) failed on TEMPLATE defects. Egyptian has since been cut for good
 * (task #54), which removes half the reason the swap was made.
 *
 * This bench re-measures single-pass on today's failing subjects, through the
 * SAME acceptance gates the two-step flow uses, so the two architectures are
 * compared on equal terms rather than against a remembered number.
 *
 * Every output is written to disk — passes AND failures — because the gate is a
 * cost filter, not the acceptance authority, and the lead adjudicates by eye.
 * The temporary Replicate upload of the real photo is ALWAYS deleted.
 *
 * Usage:
 *   npx tsx scripts/smoke/single-pass-ab.ts <style-slug> <subject> [runs]
 */

import fs from "node:fs";
import path from "node:path";
import Replicate from "replicate";
import { fail, loadEnv } from "./_shared";

loadEnv();

const ROOT = path.resolve(__dirname, "../..");
const INPUT_DIR = path.join(ROOT, "scripts/faceswap-timebox/input");
const OUT_DIR = path.join(ROOT, "scripts/smoke/output/single-pass");

const KONTEXT_MODEL = "black-forest-labs/flux-kontext-pro";

async function main(): Promise<void> {
  const styleSlug = process.argv[2];
  const subject = process.argv[3];
  const runs = Number(process.argv[4] || 3);
  if (!styleSlug || !subject) {
    fail("Usage: single-pass-ab.ts <style-slug> <subject> [runs]");
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) fail("REPLICATE_API_TOKEN missing — cannot run (no fallback)");
  const replicate = new Replicate({ auth: token });

  const { analyzePortraitPhoto, checkIdentityPresence, checkStylePresence } =
    await import("../../lib/services/portrait-analysis");

  const photoPath = path.join(INPUT_DIR, `${subject}.png`);
  if (!fs.existsSync(photoPath)) fail(`Test photo not found: ${photoPath}`);
  const photoBytes = fs.readFileSync(photoPath);
  const photoDataUri = `data:image/png;base64,${photoBytes.toString("base64")}`;

  const { prisma } = await import("../../lib/prisma");
  const variant = await prisma.styleVariant.findFirst({
    where: { slug: styleSlug },
    include: { stylePack: { select: { slug: true, name: true } } },
  });
  if (!variant) fail(`StyleVariant "${styleSlug}" not found in DB`);

  // Live vision only, fail-CLOSED — same rule as the production path. It is used
  // ONLY to decide person vs pet wording; the photo itself carries identity.
  const live = await analyzePortraitPhoto(photoDataUri);
  if (!live.success || !live.analysis) {
    fail(`Live vision analysis failed — run aborts (no fallback): ${live.error}`);
    return;
  }
  const isPet = live.analysis.subjectType === "pet";

  const modifierText = Object.entries(
    (variant.styleModifiers as Record<string, string>) || {}
  )
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const base = variant.promptTemplate
    .replace(/\{\{subject\}\}/g, isPet ? "this animal" : "this person")
    .replace(/\{\{style_modifiers\}\}/g, modifierText);
  if (base.includes("{{")) {
    fail(`Unreplaced placeholder in prompt: ${base.slice(0, 200)}`);
  }
  const prompt = base + ageConstraint(isPet, live.analysis.primarySubject.ageBracket);

  const styleDescription = `${variant.stylePack.name} — ${variant.name}`;
  console.log(`=== SINGLE-PASS A/B: ${subject} × ${styleSlug} × ${runs} runs ===`);
  console.log(`→ Subject kind: ${isPet ? "pet" : "person"}`);
  console.log(`→ Prompt (${prompt.length} chars): ${prompt.slice(0, 140)}…\n`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let passes = 0;

  for (let run = 1; run <= runs; run++) {
    const started = Date.now();
    let uploadId: string | null = null;
    try {
      type ReplicateFile = { id: string; urls: { get: string } };
      const file = (await replicate.files.create(
        new Blob([new Uint8Array(photoBytes)], { type: "image/png" })
      )) as ReplicateFile;
      uploadId = file.id;

      const output = await replicate.run(KONTEXT_MODEL, {
        input: {
          input_image: file.urls.get,
          prompt,
          aspect_ratio: "3:4",
          safety_tolerance: 2,
          output_format: "png",
        },
      });

      const imageUrl = extractUrl(output);
      if (!imageUrl) fail(`Run ${run}: no image URL returned from ${KONTEXT_MODEL}`);

      const [identity, style] = await Promise.all([
        checkIdentityPresence(photoDataUri, imageUrl!),
        checkStylePresence(imageUrl!, styleDescription),
      ]);
      const pass = identity === "same" && style === "styled";
      if (pass) passes++;

      const res = await fetch(imageUrl!);
      if (!res.ok) fail(`Run ${run}: failed to download output: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const tag = pass ? "PASS" : `FAIL-${identity}-${style}`;
      const outPath = path.join(OUT_DIR, `${subject}-${styleSlug}-run${run}-${tag}.png`);
      fs.writeFileSync(outPath, buf);

      console.log(
        `run ${run}/${runs}: identity=${identity} style=${style} → ${tag} ` +
          `(${((Date.now() - started) / 1000).toFixed(1)}s) ${path.relative(ROOT, outPath)}`
      );
    } finally {
      if (uploadId) {
        try {
          await replicate.files.delete(uploadId);
        } catch (err) {
          console.error(
            `[SinglePassAB] PRIVACY: failed to delete temporary Replicate file ${uploadId}:`,
            err
          );
        }
      }
    }
  }

  console.log(`\n${passes}/${runs} passed the acceptance gate (single-pass)`);
  console.log("  NOTE: gate approval is NOT acceptance — every output above needs lead review.");
  await prisma.$disconnect();
}

// The renaissance template asks for "period-accurate noble attire" and the model
// resolves that convention toward an adult sitter: a 3-year-old came back as a
// teenager in 3/3 runs (lead-verified 2026-08-18). The same literal age
// restatement that fixed this at the two-step swap leg is applied here, so the
// two architectures differ ONLY in whether identity travels through text.
function ageConstraint(isPet: boolean, ageBracket?: string): string {
  if (isPet || !ageBracket) return "";
  const isChild = /^(infant|toddler|young child|child)\b/.test(ageBracket.toLowerCase());
  return (
    ` CRITICAL AGE CONSTRAINT: the subject is ${ageBracket} and MUST be rendered at exactly that age. Do NOT age them up.` +
    (isChild
      ? " Keep their childlike proportions: a head large relative to the body, full rounded cheeks, a soft undefined jawline, small facial features set low on the face, and smooth unlined skin. Do not mature the face, lengthen or define the jaw, or slim the cheeks. Dress them in a child's version of the attire."
      : "")
  );
}

// DO NOT add a gender restatement here. Tried 2026-08-18 to fix a heavyset woman
// who rendered masculine in 1 of 3 runs; "MUST be rendered unmistakably as
// <gender>" pulled the model toward a generic slender feminine ideal and erased
// her build, taking her from 3/3 to 0/3 (lead-verified — the rejects really are
// strangers). Age is the only descriptive constraint that helps: the photo
// already carries gender, and restating it invites idealisation.

function extractUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (output instanceof URL) return output.href;
  if (Array.isArray(output) && output.length > 0) return extractUrl(output[0]);
  if (output && typeof output === "object") {
    if ("href" in output && typeof (output as { href: unknown }).href === "string") {
      return (output as { href: string }).href;
    }
    if ("url" in output && typeof (output as { url: unknown }).url === "function") {
      const u = (output as { url: () => string | URL }).url();
      return typeof u === "string" ? u : u?.href;
    }
    const s = String(output);
    if (s.startsWith("http")) return s;
  }
  return undefined;
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
