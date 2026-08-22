/**
 * Face-swap timebox harness — shared library.
 *
 * Calls the AS-BUILT service functions directly:
 *   - lib/services/portrait-analysis.ts  → analyzePortraitPhoto (Claude Vision)
 *   - lib/services/replicate-portrait.ts → generateWithKontextPro (flux-kontext-pro)
 *
 * NO app code changes. ENABLE_FACE_PRESERVATION is set ONLY in this process's
 * env (never in app code or deployed env) so the service module initializes.
 *
 * PRIVACY: inputs are real faces (incl. children). input/ and output/ are
 * gitignored. Source photos are uploaded to Replicate's Files API solely so the
 * model + Claude Vision can fetch them (the production path sends the same
 * photos to the same providers). Uploaded file IDs are tracked in
 * output/replicate-uploads.json and deleted by cleanup-replicate-files.ts.
 *
 * KNOWN AS-BUILT DEVIATION (flagged in results): for single-subject photos the
 * production pipeline (portrait-generation.ts:385) leaves the literal
 * "{{subject}}" placeholder in the prompt (only the group path replaces it).
 * This harness substitutes a neutral subject phrase so the test measures the
 * model's capability rather than that prompt bug.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
export const ROOT = path.resolve(__dirname, "../..");
export const INPUT_DIR = path.join(__dirname, "input");
export const OUTPUT_DIR = path.join(__dirname, "output");
export const RESULTS_JSON = path.join(OUTPUT_DIR, "results.json");
export const UPLOADS_JSON = path.join(OUTPUT_DIR, "replicate-uploads.json");
export const ANALYSIS_DIR = path.join(OUTPUT_DIR, "analysis");

// ---------------------------------------------------------------------------
// Env loading (.env at repo root; no dotenv dep needed)
// ---------------------------------------------------------------------------
export async function loadEnv(): Promise<void> {
  const envPath = path.join(ROOT, ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  // Enable the face-preservation service for THIS PROCESS ONLY.
  process.env.ENABLE_FACE_PRESERVATION = "true";

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN missing from .env — blocker.");
  }
  // STANDING RULE (2026-07-12): a missing credential is a P0 to escalate,
  // never something to work around. No shared-vault borrowing, no fallback.
  // Inject ImageCrafter's own key at runtime; never write it to .env.
  if (!process.env.IMAGECRAFTER_ANTHROPIC_API_KEY) {
    throw new Error(
      "IMAGECRAFTER_ANTHROPIC_API_KEY missing — STOP and report. Inject it from the imagecrafter-production vault at runtime; do not borrow from any shared vault."
    );
  }
}

// ---------------------------------------------------------------------------
// Sanctioned styles — templates copied VERBATIM from
// prisma/seed-style-packs.ts (importing that file would execute the DB seed).
// Wholesome painterly/historical/fantasy portrait styles ONLY.
// ---------------------------------------------------------------------------
export const STYLES: Record<string, { pack: string; promptTemplate: string }> = {
  renaissance: {
    pack: "royal-gallery",
    promptTemplate: `A magnificent Italian Renaissance oil portrait painting of {{subject}}, posed in a three-quarter view wearing elaborate period-accurate noble attire with intricate gold thread embroidery, jeweled accessories, and a richly textured velvet cloak. {{style_modifiers}}. Set against a backdrop of a palatial interior with arched windows revealing a distant Tuscan landscape. Rich Venetian color palette dominated by deep crimsons, royal blues, and burnished gold. Dramatic yet flattering Rembrandt lighting with warm golden tones illuminating the face. Masterful brushwork reminiscent of Raphael and Titian, with visible oil paint texture. Museum-quality fine art painting, ultra detailed, 8K resolution.`,
  },
  "starry-night": {
    pack: "masterpiece",
    promptTemplate: `{{subject}} standing in the undulating landscape of Vincent van Gogh's The Starry Night. The iconic deep cobalt blue night sky swirls above with luminous spiraling stars rendered in thick impasto brushstrokes of cadmium yellow and white. A radiant crescent moon glows in the upper right. The rolling cypress-dotted hills and small village with its glowing windows extend behind the subject. {{style_modifiers}}. The subject is rendered in the same post-impressionist style — bold directional brushstrokes, vibrant complementary colors, visible paint texture. The entire scene pulses with Van Gogh's emotional energy. Oil on canvas, thick impasto, post-impressionist masterwork.`,
  },
  egyptian: {
    pack: "time-traveler",
    promptTemplate: `{{subject}} depicted as Egyptian royalty in the style of ancient tomb paintings and New Kingdom portraiture. The subject wears a magnificent nemes headdress (or vulture crown), broad gold and lapis lazuli collar necklace, kohl-lined eyes, and richly embroidered linen garments. {{style_modifiers}}. Hieroglyphic cartouches and sacred symbols frame the composition. Background of temple columns and the Nile at sunset. Rendered in the distinctive Egyptian profile style with frontal torso, using flat colors with precise gold leaf accents. Warm palette of gold, lapis lazuli blue, terracotta, and papyrus cream.`,
  },
  elven: {
    pack: "fantasy-realm",
    promptTemplate: `{{subject}} as noble elven royalty in a magnificent woodland palace. The subject wears flowing ethereal robes of silver and leaf-green with intricate vine and leaf motifs, an elegant circlet with a central gemstone, and pointed ear tips visible. The throne room is carved from a living ancient tree, with luminous crystal lanterns, hanging moss, and starlight filtering through a canopy of golden leaves. {{style_modifiers}}. Hyper-detailed digital fantasy painting in the tradition of Alan Lee and John Howe. Ethereal, otherworldly beauty with soft luminous lighting. Epic fantasy illustration, cinematic composition, ultra detailed.`,
  },
  "comic-hero": {
    pack: "pop-culture",
    promptTemplate: `{{subject}} as a powerful comic book superhero on a dramatic comic book cover. Bold black ink outlines, dynamic action pose, halftone dot shading, and vibrant primary colors. The subject wears a custom-designed hero costume (no existing IP) with a flowing cape and a unique emblem. The cityscape behind is rendered in dramatic perspective with speed lines and action effects. {{style_modifiers}}. Classic American comic book art style — Jack Kirby dynamism meets Jim Lee detail. Primary color palette of comic red, blue, yellow, with black ink and white highlights. Comic book cover quality, dynamic and powerful.`,
  },
};

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------
export type SubjectClass = "baseline" | "boundary";

export const SUBJECTS: Record<
  string,
  { file: string; class: SubjectClass; neutralPhrase: string }
> = {
  "adult-face": { file: "adult-face.png", class: "baseline", neutralPhrase: "this person" },
  "child-face": { file: "child-face.png", class: "baseline", neutralPhrase: "this child" },
  "pet-frontface-lab": { file: "pet-frontface-lab.png", class: "baseline", neutralPhrase: "this dog" },
  "pet-small-dog": { file: "pet-small-dog.png", class: "baseline", neutralPhrase: "this dog" },
  "pet-full-body-lab": { file: "pet-full-body-lab.png", class: "boundary", neutralPhrase: "this dog" },
  "pet-full-body-lab2": { file: "pet-full-body-lab2.png", class: "boundary", neutralPhrase: "this dog" },
  "group-four-childrens": { file: "group-four-childrens.png", class: "boundary", neutralPhrase: "this group" },
  "group-family-two-childrens-2-adults": { file: "group-family-two-childrens-2-adults.png", class: "boundary", neutralPhrase: "this family" },
  "group-two-adults-julian-lilly": { file: "group-two-adults-julian-lilly.png", class: "boundary", neutralPhrase: "this couple" },
};

// ---------------------------------------------------------------------------
// Replicate Files API upload (cached per subject; IDs tracked for deletion)
// ---------------------------------------------------------------------------
interface UploadRecord {
  subject: string;
  fileId: string;
  url: string;
  uploadedAt: string;
}

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

export async function uploadSourcePhoto(subject: string): Promise<string> {
  const uploads = readJson<UploadRecord[]>(UPLOADS_JSON, []);
  const existing = uploads.find((u) => u.subject === subject);
  if (existing) {
    // Signed URLs expire after 24h; records from a prior day should be re-uploaded.
    const ageMs = Date.now() - new Date(existing.uploadedAt).getTime();
    if (ageMs < 20 * 60 * 60 * 1000) return existing.url;
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const buf = fs.readFileSync(path.join(INPUT_DIR, SUBJECTS[subject].file));
  const file = (await replicate.files.create(buf)) as {
    id: string;
    urls: { get: string };
  };
  const rec: UploadRecord = {
    subject,
    fileId: file.id,
    url: file.urls.get,
    uploadedAt: new Date().toISOString(),
  };
  const next = uploads.filter((u) => u.subject !== subject).concat(rec);
  writeJson(UPLOADS_JSON, next);
  return rec.url;
}

// ---------------------------------------------------------------------------
// Claude Vision analysis (as-built service; cached per subject)
//
// Replicate Files API GET URLs require an Authorization header, so the
// service's plain fetch cannot use them. We hand analyzePortraitPhoto a
// data: URI instead (Node's undici fetch supports data URLs). The photo is
// downscaled to ≤1600px JPEG first — the service itself downscales to
// ≤2048px/3.5MB before sending to Claude, so this changes nothing material.
// ---------------------------------------------------------------------------
export async function getAnalysis(subject: string) {
  const cachePath = path.join(ANALYSIS_DIR, `${subject}.json`);
  const cached = readJson<Record<string, unknown> | null>(cachePath, null);
  if (cached) return cached as never;

  const sharp = (await import("sharp")).default;
  const buf = fs.readFileSync(path.join(INPUT_DIR, SUBJECTS[subject].file));
  const jpeg = await sharp(buf)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
  const dataUri = `data:image/jpeg;base64,${jpeg.toString("base64")}`;

  const { analyzePortraitPhoto } = await import(
    "../../lib/services/portrait-analysis"
  );
  const result = await analyzePortraitPhoto(dataUri);
  if (!result.success || !result.analysis) {
    throw new Error(`analyzePortraitPhoto failed for ${subject}: ${result.error}`);
  }
  writeJson(cachePath, result.analysis);
  return result.analysis;
}

// ---------------------------------------------------------------------------
// One generation run through the as-built service
// ---------------------------------------------------------------------------
export interface RunRecord {
  runId: string;
  subject: string;
  subjectClass: SubjectClass;
  style: string;
  repeat: number;
  startedAt: string;
  latencyMs: number;
  costUsd: number;
  success: boolean;
  error?: string;
  replicateUrl?: string;
  localPath?: string;
  subjectCount?: number;
  prompt?: string;
}

// RETIRED 2026-07-11: the single-pass architecture this exercised (verdict
// FAIL 66.7%, PLAN/results/faceswap-timebox.md) was removed from
// lib/services/replicate-portrait.ts when the two-step flow became the
// production pipeline. Results are archived in output/results.json; use
// two-step-swap.ts for any new runs.
export async function runOne(
  subject: string,
  style: string,
  repeat: number
): Promise<RunRecord> {
  void subject;
  void style;
  void repeat;
  throw new Error(
    "Single-pass timebox harness retired — the single-pass service path was " +
      "removed after the two-step flow (15/15) became production. See " +
      "PLAN/results/faceswap-two-step.md and two-step-swap.ts."
  );
}

export function appendResult(record: RunRecord): void {
  const all = readJson<RunRecord[]>(RESULTS_JSON, []);
  all.push(record);
  writeJson(RESULTS_JSON, all);
}

export function loadResults(): RunRecord[] {
  return readJson<RunRecord[]>(RESULTS_JSON, []);
}

export function totalRuns(): number {
  return loadResults().length;
}

export const MAX_RUNS = 40;
