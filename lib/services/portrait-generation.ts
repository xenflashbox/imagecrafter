/**
 * Portrait Generation Pipeline — PER-STYLE ARCHITECTURE ROUTING
 * (measured, PLAN/results/single-pass-ab.md 2026-08-18; see SINGLE_PASS_STYLES)
 *
 * Every portrait is analyzed with Claude Vision (identity + coloring +
 * demographics), then takes ONE of two generation legs depending on the style:
 *
 * SINGLE-PASS (renaissance, starry-night): the REAL photo goes straight to
 * Kontext with the style template and a neutral subject phrase. Identity never
 * leaves the image domain.
 *
 * TWO-STEP FACE-INTO-SCENE (elven, comic-hero): generate a GENERIC stand-in
 * scene (full costume/style, no real identity) via image-gen.xencolabs.com —
 * pinned to the per-style bake-off winner engine — with stand-in coloring built
 * from the analysis JSON; a fidelity gate verifies the stand-in matches the
 * subject BEFORE any swap (mismatch → regenerate); then swap the real subject's
 * identity onto it via Replicate multi-image Kontext Pro (real photo = anchor).
 *
 * Both legs then share:
 * - Combined acceptance gate: SAME PERSON (identity) + style present, both
 *   fail-CLOSED ("unknown" blocks) + one retry
 * - Watermarked preview + ×4 upscaled hi-res, both stored to R2; DB updated
 *
 * v1 constraint: SINGLE SUBJECT ONLY. Groups/couples failed identity
 * transfer in testing and are rejected with an honest error.
 *
 * DUAL-FLOW ARCHITECTURE:
 * - Guest: portraitId tracked via session cookie; userId = null
 * - Subscriber: userId from Clerk; portrait saved to gallery; plan quota deducted
 * Both flows use this same service; auth differences are handled upstream.
 */

import { prisma } from "@/lib/prisma";
import {
  analyzePortraitPhoto,
  checkStylePresence,
  checkIdentityPresence,
  checkStandInFidelity,
  checkIpSafety,
  type PortraitSubjectAnalysis,
} from "./portrait-analysis";
import { applyWatermark, prepareHiResImage } from "./watermark";
import { uploadPortraitPreview, uploadPortraitHiRes } from "./file-storage";
import {
  isFacePreservationAvailable,
  swapFaceIntoScene,
  generateSinglePassPortrait,
  upscalePortraitBuffer,
} from "./replicate-portrait";
import { postToService, getFromService, serviceErrorMessage } from "./image-generation";

// =============================================================================
// TYPES
// =============================================================================

export interface GeneratePortraitParams {
  portraitId: string;
  stylePackSlug: string;
  styleVariantSlug: string;
  /** Authenticated subscriber userId, or null for guests */
  userId: string | null;
  /** Optional user description for Custom Scene pack */
  userScene?: string;
}

export interface GeneratePortraitResult {
  success: boolean;
  previewImageUrl?: string;
  subjectType?: string;
  error?: string;
  errorType?: "quality" | "upload" | "generation" | "notfound" | "server";
  qualityIssues?: string[];
}

// =============================================================================
// AI GATEWAY (for prompt enhancement)
// =============================================================================

import { getAiGatewayUrl } from "@/lib/env";

const AI_GATEWAY_KEY =
  process.env.AI_GATEWAY_API_KEY || process.env.DEVMAESTRO_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";

// Custom scene enhancement system prompt (PRD section 4.5)
const CUSTOM_SCENE_SYSTEM_PROMPT = `You are a creative director for an AI portrait generation service.
A user has uploaded a photo and described a custom scene they want
their subject placed into.

Your job is to transform their description into a detailed,
high-quality image generation prompt that:

1. Preserves the subject description exactly as provided (do not alter it)
2. Expands the user's scene description into vivid, specific visual detail
3. Adds appropriate lighting, composition, and atmosphere
4. Ensures the subject is the clear focal point of the scene
5. CRITICAL: Emphasize that the subject's face must be PHOTOREALISTICALLY accurate
6. The portrait must be immediately recognizable as the specific individual

IMPORTANT: While the scene can be artistic or fantastical, the subject's face
and identifying features MUST remain photorealistic. Apply artistic style to
the environment, clothing, and lighting - NOT to facial features.

Return ONLY the enhanced prompt. No explanation, no preamble.`;

// =============================================================================
// HELPERS
// =============================================================================

/** Kling caps prompts at 2500 characters; stay under it with margin. */
const STANDIN_PROMPT_CHAR_LIMIT = 2400;

/**
 * Build the GENERIC stand-in descriptor for the step-1 scene prompt.
 *
 * Stand-in fidelity rule (proven by failure in the two-step test): the swap
 * can only bridge what the stand-in already resembles, so the stand-in MUST
 * carry the subject's demographics and coloring from the analysis JSON —
 * but never the real identity (the scene holds no real face by design).
 */
export function buildStandInDescriptor(
  analysis: PortraitSubjectAnalysis,
  level = 0
): string {
  const p = analysis.primarySubject;
  // Kling rejects prompts over 2500 characters (error 1201), and the analysis
  // fields are the only variable-length part of the prompt. Every anchored
  // field LEADS with its load-bearing token (scale word, age band, face shape,
  // build), so trimming the tail at a word boundary keeps the anchor. Level 1
  // keeps only each field's leading clause; level 2 keeps only the anchor word.
  const clamp = (s: string | undefined, max: number): string | undefined => {
    if (!s) return s;
    if (level >= 1) s = s.split(/[,.]/)[0].trim();
    if (level >= 2) s = s.split(/\s+/).slice(0, 3).join(" ");
    const limit = level >= 1 ? Math.floor(max / 2) : max;
    if (s.length <= limit) return s;
    const cut = s.slice(0, limit);
    return cut.slice(0, Math.max(cut.lastIndexOf(" "), limit - 20)).trimEnd();
  };
  if (analysis.subjectType === "pet") {
    const kind = [p.breed, p.species || "pet"].filter(Boolean).join(" ");
    const features =
      p.keyFeatures && p.keyFeatures.length > 0
        ? `, with ${p.keyFeatures.join(", ")}`
        : "";
    return `a ${kind} with ${clamp(p.coloring, 300)}${features}`;
  }
  const who = p.genderPresentation || "person";
  const age = p.ageBracket ? `, ${clamp(p.ageBracket, 60)},` : "";
  // Hair is not optional detail: the swap transfers the face region only, so
  // whatever hair the stand-in is generated with is the hair the customer
  // receives. Coloring carries hair COLOUR; this carries length and texture.
  // Hair styling is the first thing to go under budget pressure: colour, age,
  // face shape and build all decide whether the swap reads as the subject,
  // whereas the parting and fringe do not.
  // Labelled like face shape and build, NOT "wearing": once the analysis field
  // was anchored to lead with a length word, "wearing chin-length, wavy" read as
  // a garment and the stand-in came back with the hair swept up instead of the
  // subject's bob (lead-verified 2026-08-18).
  const hair = p.hair && level < 2 ? `, hair: ${clamp(p.hair, 140)}` : "";
  // Face shape for the same reason as hair: the swap redraws the features
  // inside the face region, but head width, jawline and chin come from the
  // stand-in. A narrow-faced subject built on a broad-jawed stand-in still
  // reads as a different woman even after a clean swap (lead-verified
  // 2026-08-17 on starry-night).
  const face = p.faceShape ? `, face shape: ${clamp(p.faceShape, 200)}` : "";
  // Build for the same reason as face shape: neck, shoulders and face fullness
  // are stand-in geometry, and noble-portrait templates default to a slim
  // sitter — a heavyset subject came back slim-faced (lead-verified 2026-08-17,
  // renaissance).
  const build = p.build ? `, build: ${clamp(p.build, 140)}` : "";
  // Under budget pressure the long prose `coloring` gives way to the short
  // literal colour fields rather than being trimmed: the same values are
  // restated as a hard constraint at the end of the scene prompt, and trimming
  // the prose can silently drop the eye or hair colour off the tail.
  const shortColoring = [
    p.skinTone && `${p.skinTone} skin`,
    p.hairColor && `${p.hairColor} hair`,
    p.eyeColor && `${p.eyeColor} eyes`,
  ].filter(Boolean);
  const coloring =
    level >= 1 && shortColoring.length > 0
      ? shortColoring.join(", ")
      : clamp(p.coloring, 300);
  return `a ${who}${age} with ${coloring}${hair}${face}${build}`;
}

/**
 * Build the step-1 stand-in scene prompt from the style template.
 * No identity-preservation block — identity is carried by step 2, not here.
 */
export function buildStandInScenePrompt(
  promptTemplate: string,
  standInDescriptor: string,
  styleModifiers: Record<string, string>,
  analysis: PortraitSubjectAnalysis,
  userScene?: string,
  styleVariantSlug?: string
): string {
  const modifierText = Object.entries(styleModifiers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const assemble = (descriptor: string) =>
    promptTemplate
      .replace(/\{\{subject\}\}/g, descriptor)
      .replace(/\{\{style_modifiers\}\}/g, modifierText)
      .replace(/\{\{user_details\}\}/g, userScene || "");

  let prompt = assemble(standInDescriptor);

  // Stand-in framing rules (test findings): the stand-in face must be a
  // viable swap surface, and pet scenes must not hide extra figures.
  // Generous headroom is a generation-time requirement (fix directive,
  // mobile framing): narrow viewports crop-scale the image, so a head
  // touching the top edge clips at 375px. Never fixed with CSS.
  let suffix =
    analysis.subjectType === "pet"
      ? ` The ${analysis.primarySubject.species || "animal"} is the ONLY living figure in the scene — no faces or figures hidden in trees, bark, or background. Its face is large in the frame, clearly visible, and well-lit. Classical portrait composition with generous headroom: the entire head fully inside the frame with clear space above it — nothing cropped by the top edge.`
      : " Waist-up framing. The subject's face is large in the frame, clearly visible, unobstructed, and well-lit. Classical portrait composition with generous headroom: the entire head, including hair and any headwear, fully inside the frame with clear space above it — nothing cropped by the top edge.";

  // Noble/royal portrait templates carry a strong prior toward idealised young
  // adults, which overrides an age phrase buried mid-descriptor: a 5-year-old
  // came back as roughly a 13-year-old (lead-verified 2026-08-17, renaissance).
  // The swap redraws inside the face region only, so an aged-up stand-in ships
  // a stranger. Restate the age as a hard constraint at the end of the prompt.
  //
  // These stay at the TAIL. Moving them to the front was tested and made things
  // worse on both subjects tried — it displaces the template's own opening
  // ("A magnificent Renaissance oil portrait of …"), which is what anchors the
  // sitter, and the control subject came back a stranger (lead-verified
  // 2026-08-18). Editing the style template to strip "contradicting" directives
  // was tried too and was worse (6/6 identity failures on the control); the
  // templates are a measured bake-off artifact. Residual colour drift is caught
  // and corrected by the stand-in fidelity gate's regeneration loop, not by
  // re-ordering or rewriting prompts.
  const ageBand = (analysis.primarySubject.ageBracket || "").toLowerCase();
  if (
    analysis.subjectType !== "pet" &&
    /^(infant|toddler|young child|child)\b/.test(ageBand)
  ) {
    suffix +=
      ` CRITICAL AGE CONSTRAINT: the subject is ${analysis.primarySubject.ageBracket} and MUST be depicted at exactly that age —` +
      " a small child with childlike proportions, a head large relative to the body, full rounded cheeks," +
      " a soft undefined jawline, and smooth unlined skin. Do NOT age the subject up:" +
      " no teenager, no young adult, no adult facial structure, no defined or tapering jawline," +
      " no adult body proportions.";
  }

  // Style palettes overrode attributes the analysis had already specified:
  // near-black hair rendered mid-brown and dark brown eyes hazel under
  // renaissance's warm Rembrandt lighting; dark blonde rendered coppery red and
  // a heavyset sitter rendered slim (both lead-verified 2026-08-17). Mid-prompt
  // attributes lose to the style prior, so restate them last as constraints.
  // A back-reference ("as described above") does not survive — the age
  // constraint works because it restates the literal value, so do the same.
  if (analysis.subjectType !== "pet") {
    const s = analysis.primarySubject;
    const literals = [
      s.hairColor && `hair is ${s.hairColor}`,
      s.eyeColor && `eyes are ${s.eyeColor}`,
      s.skinTone && `skin is ${s.skinTone}`,
      s.build && `build is ${s.build.split(/[,.]/)[0].trim()}`,
    ].filter(Boolean);
    if (literals.length > 0) {
      suffix +=
        ` CRITICAL LIKENESS CONSTRAINT: the subject's ${literals.join(", ")}.` +
        " Render exactly those values. The artistic palette and lighting must not shift them:" +
        " do not warm, redden, lighten or golden the hair, do not lighten the eyes or the skin," +
        " and do not slim, narrow or otherwise idealise the subject.";
    }
  }

  prompt = prompt + suffix;

  // Kling rejects prompts over 2500 characters outright (error 1201), which
  // surfaces as an opaque provider failure mid-generation. The constraints in
  // the suffix are load-bearing for identity, so the descriptor gives way
  // first, never the constraints.
  //
  // The ceiling is Kling's alone. Enforced unconditionally it killed every
  // comic-hero × child run at 2403-2411 chars — a style pinned to Higgsfield,
  // which has no such limit. Unpinned styles still get the limit: they go to
  // the auto-route service, which may land on Kling.
  const enginePin = styleVariantSlug ? STYLE_ENGINE[styleVariantSlug] : undefined;
  if (!enginePin || enginePin.provider === "kling") {
    for (let level = 1; level <= 2 && prompt.length > STANDIN_PROMPT_CHAR_LIMIT; level++) {
      prompt = assemble(buildStandInDescriptor(analysis, level)) + suffix;
    }
    if (prompt.length > STANDIN_PROMPT_CHAR_LIMIT) {
      throw new Error(
        `Stand-in prompt is ${prompt.length} characters, over the ${STANDIN_PROMPT_CHAR_LIMIT} limit even after compacting the descriptor — the style template is too long to carry the identity constraints.`
      );
    }
  }

  return prompt;
}

/**
 * Build the single-pass prompt. The subject placeholder is the NEUTRAL phrase
 * "this person"/"this animal" — the photo itself carries identity, so no
 * descriptor is generated and no likeness constraints are appended.
 *
 * This reproduces the benched prompt exactly (scripts/smoke/single-pass-ab.ts).
 * Do NOT add the stand-in framing suffix or the likeness literals: the measured
 * 12/12 was taken with the age constraint as the ONLY addition, and every extra
 * descriptive constraint tried made things worse. In particular a gender
 * restatement pulled the model toward a generic slender ideal and took a
 * heavyset subject 3/3 → 0/3 → 3/3 on revert (lead-verified 2026-08-18).
 */
export function buildSinglePassPrompt(
  promptTemplate: string,
  styleModifiers: Record<string, string>,
  analysis: PortraitSubjectAnalysis,
  userScene?: string
): string {
  const modifierText = Object.entries(styleModifiers)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const isPet = analysis.subjectType === "pet";

  // Templates that open "an oil painting OF {{subject}}" (renaissance) paint the
  // whole frame; templates that open "{{subject}} standing in ..." (starry-night)
  // read to Kontext as "keep this photo, paint the scene behind it" and returned
  // a photoreal subject against a painted backdrop. Single-pass hands it the REAL
  // photo, so the medium has to be stated for the subject too, and stated
  // alongside a likeness constraint — pushing style alone trades away the
  // identity that single-pass exists to win.
  //
  // It has to be stated BEFORE the scene as well as after. With the trailing
  // constraint alone, tight selfies stayed photographic 0/3: the model reads
  // "{{subject}} standing in ..." first, commits to keeping the photo, and
  // treats everything after as background work. Leading with the medium makes
  // the task a repaint rather than a composite (that cell went 0/3 → 2/3, with
  // renaissance and the other starry-night cells unchanged at 3/3).
  const base =
    `TASK: repaint this photograph entirely as an original artwork. Every part of the output — including the ${
      isPet ? "animal's face and fur" : "subject's face, skin and hair"
    } — must be painted, never photographic. SCENE: ` +
    promptTemplate
      .replace(/\{\{subject\}\}/g, isPet ? "this animal" : "this person")
      .replace(/\{\{style_modifiers\}\}/g, modifierText)
      .replace(/\{\{user_details\}\}/g, userScene || "") +
    ` CRITICAL MEDIUM CONSTRAINT: render the ENTIRE image as artwork in this style. The ${
      isPet ? "animal's face, fur" : "subject's face, skin, hair"
    } and surroundings must all carry the same visible brushwork and paint texture as the background — do NOT leave a photographic ${
      isPet ? "animal" : "person"
    } standing in a painted scene. Preserve their exact facial structure, proportions and coloring while painting them.`;

  if (isPet) return base;

  const ageBracket = analysis.primarySubject.ageBracket;
  if (!ageBracket) return base;

  // Without this the renaissance template's "period-accurate noble attire"
  // resolved toward an adult sitter and a 3-year-old came back as a teenager in
  // 3/3 runs. The same literal restatement that fixed the two-step swap leg
  // took the same subject to 3/3 PASS.
  const isChild = /^(infant|toddler|young child|child)\b/.test(ageBracket.toLowerCase());
  return (
    base +
    ` CRITICAL AGE CONSTRAINT: the subject is ${ageBracket} and MUST be rendered at exactly that age. Do NOT age them up.` +
    (isChild
      ? " Keep their childlike proportions: a head large relative to the body, full rounded cheeks, a soft undefined jawline, small facial features set low on the face, and smooth unlined skin. Do not mature the face, lengthen or define the jaw, or slim the cheeks. Dress them in a child's version of the attire."
      : "")
  );
}

async function enhanceCustomScenePrompt(
  userScene: string,
  subjectDescription: string
): Promise<string | null> {
  // null is a SIGNALED failure — the caller falls back to a deterministic
  // prompt. Every null path logs loudly (fail-open audit, fix directive P1#3).
  if (!AI_GATEWAY_KEY) {
    console.error("[CustomScene] AI_GATEWAY_KEY not configured — using deterministic fallback prompt");
    return null;
  }

  try {
    const response = await fetch(getAiGatewayUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: CUSTOM_SCENE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `User's scene description: ${userScene}\nSubject description: ${subjectDescription}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`[CustomScene] AI gateway returned ${response.status} — using deterministic fallback prompt`);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("[CustomScene] Enhancement call failed — using deterministic fallback prompt:", error);
    return null;
  }
}

// =============================================================================
// PER-STYLE ENGINE ROUTING (fix directive P3 — measured bake-off winners)
// =============================================================================
//
// Style→engine is a MEASURED assignment from the Jul-7 bake-off (15/15), not
// an auto-route. The bake-off ran via Higgsfield MCP generators; mapping to
// the image-gen service's REST providers:
//   "Kling" winner   → provider "kling", model "kling-v3" — the model MUST be
//                      sent explicitly: the async layer fills the GLOBAL default
//                      (gemini-2.5-flash-image) when model is omitted, which the
//                      Kling provider rejects (verified live 2026-07-12). The
//                      omni models require reference images; the stand-in is
//                      pure text-to-image, so kling-v3.
//   "Nano Banana"    → provider "higgsfield", model "nano_banana_pro"
// Pinning requires the ASYNC endpoint: the sync /api/v1/generate request
// enum is frozen by service design — new providers are reached by routing,
// never by widening request enums. Unmapped styles auto-route as before.
export const STYLE_ENGINE: Record<string, { provider: string; model?: string }> = {
  renaissance: { provider: "kling", model: "kling-v3" },
  egyptian: { provider: "kling", model: "kling-v3" },
  elven: { provider: "kling", model: "kling-v3" },
  "starry-night": { provider: "higgsfield", model: "nano_banana_pro" },
  "comic-hero": { provider: "higgsfield", model: "nano_banana_pro" },
};

// Architecture per style is a MEASURED assignment (PLAN/results/single-pass-ab.md,
// 2026-08-18), not a preference. Single-pass sends the REAL photo straight to
// Kontext; two-step launders identity through photo → English text → stand-in →
// swap, and everything the swap cannot redraw is inherited from an image built
// out of words.
//   renaissance   single-pass 12/12 across adult, 3-5y child, heavyset adult, dog
//                 — every subject two-step was failing.
//   starry-night  single-pass 8/9.
//   elven         STAYS two-step: single-pass idealises body type (heavyset 0/3).
//   comic-hero    STAYS two-step: Kontext ignored the template's explicit ban on
//                 the Superman S-shield and drew one in 2 of 3 runs. IP risk.
const SINGLE_PASS_STYLES = new Set(["renaissance", "starry-night"]);

// Styles whose output is checked for third-party IP. comic-hero is the only
// one that asks an engine for a genre defined by living trademarks; the rest
// draw on public-domain art movements.
const IP_SENSITIVE_STYLES = new Set(["comic-hero"]);

const ASYNC_POLL_INTERVAL_MS = 3_000;
const ASYNC_POLL_TIMEOUT_MS = 300_000;

/** Generate a stand-in scene on a PINNED engine via the async endpoint. */
async function generatePinnedScene(
  prompt: string,
  engine: { provider: string; model?: string }
): Promise<{ sceneUrl: string } | { error: string }> {
  let res;
  try {
    res = await postToService("/api/v1/async/generate", {
      prompt,
      aspect_ratio: "3:4",
      source_app: "imagecrafter",
      provider: engine.provider,
      ...(engine.model ? { model: engine.model } : {}),
    });
  } catch (error) {
    return {
      error: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  const jobId = res.ok && res.json ? (res.json.job_id as string | undefined) : undefined;
  if (!res.ok || !jobId) {
    return {
      error: res.ok
        ? "Image service returned no job_id for pinned stand-in scene"
        : serviceErrorMessage(res, "pinned stand-in scene submission"),
    };
  }

  const deadline = Date.now() + ASYNC_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, ASYNC_POLL_INTERVAL_MS));
    let poll;
    try {
      poll = await getFromService(`/api/v1/async/jobs/${jobId}`);
    } catch (error) {
      return {
        error: `Image service unreachable while polling job ${jobId}: ${error instanceof Error ? error.message : "network error"}`,
      };
    }
    if (!poll.ok || !poll.json) {
      return { error: serviceErrorMessage(poll, "stand-in job status") };
    }
    const status = poll.json.status as string | undefined;
    if (status === "completed") {
      const result = poll.json.result as Record<string, unknown> | null | undefined;
      const sceneUrl = result?.image_url as string | undefined;
      if (!sceneUrl) {
        return { error: `Stand-in job ${jobId} completed without an image URL` };
      }
      console.log(
        `[PortraitGen] Pinned stand-in served by ${result?.provider}/${result?.model}`
      );
      return { sceneUrl };
    }
    if (status === "failed" || status === "cancelled") {
      return {
        error: `Stand-in job ${status}: ${(poll.json.error as string) || "no error detail"}`,
      };
    }
  }
  return { error: `Stand-in job ${jobId} timed out after ${ASYNC_POLL_TIMEOUT_MS / 1000}s` };
}

/**
 * Step 1: generate the generic stand-in scene via the image-gen service.
 * Styles with a measured bake-off winner are PINNED to that engine (P3);
 * unmapped styles auto-route (guide v3). Honest error on failure; there is
 * NO fallback path.
 */
export async function generateStandInScene(
  prompt: string,
  styleVariantSlug?: string
): Promise<{ sceneUrl: string } | { error: string }> {
  const engine = styleVariantSlug ? STYLE_ENGINE[styleVariantSlug] : undefined;
  if (engine) {
    console.log(
      `[PortraitGen] Style "${styleVariantSlug}" pinned to ${engine.provider}${engine.model ? `/${engine.model}` : ""} (bake-off winner)`
    );
    return generatePinnedScene(prompt, engine);
  }

  let res;
  try {
    res = await postToService("/api/v1/generate", {
      prompt,
      aspect_ratio: "3:4",
      source_app: "imagecrafter",
    });
  } catch (error) {
    return {
      error: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
    };
  }

  const imageData =
    res.ok && res.json
      ? (res.json.image as Record<string, unknown> | undefined)
      : undefined;
  const sceneUrl = imageData?.image_url as string | undefined;
  if (!res.ok || !sceneUrl) {
    return {
      error: res.ok
        ? "Image service returned no image URL for stand-in scene"
        : serviceErrorMessage(res, "stand-in scene generation"),
    };
  }
  return { sceneUrl };
}

// =============================================================================
// MAIN GENERATION PIPELINE
// =============================================================================

export async function generatePortrait(
  params: GeneratePortraitParams
): Promise<GeneratePortraitResult> {
  const { portraitId, stylePackSlug, styleVariantSlug, userId, userScene } = params;

  const startTime = Date.now();

  // --- Step 1: Load portrait record ---
  const portrait = await prisma.portrait.findUnique({
    where: { id: portraitId },
  });

  if (!portrait) {
    return { success: false, error: "Portrait not found", errorType: "notfound" };
  }

  // --- Step 2: Update status to analyzing ---
  await prisma.portrait.update({
    where: { id: portraitId },
    data: { status: "analyzing" },
  });

  // --- Step 3: Analyze photo with Claude Vision ---
  const analysisResult = await analyzePortraitPhoto(portrait.sourceImageUrl);

  if (!analysisResult.success || !analysisResult.analysis) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: analysisResult.error || "Photo analysis failed",
      },
    });
    return {
      success: false,
      error: analysisResult.error || "Could not analyze your photo. Please try a clearer image.",
      errorType: "quality",
    };
  }

  const analysis = analysisResult.analysis;

  // --- Step 4: Check photo quality ---
  if (!analysis.photoQuality.usable) {
    const issues = analysis.photoQuality.issues || ["Photo quality insufficient"];
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        subjectAnalysis: analysis as object,
        errorMessage: `Photo quality issues: ${issues.join(", ")}`,
      },
    });
    return {
      success: false,
      error: `Your photo has quality issues that may affect the portrait: ${issues.join(", ")}. Please try a clearer photo with good lighting.`,
      errorType: "quality",
      qualityIssues: issues,
    };
  }

  // --- Step 4b: v1 constraint — single subject only ---
  // Two-step identity transfer to multiple people is unreliable (couples
  // scored 0-1/5 in testing). Honest rejection, not a degraded result.
  if ((analysis.subjectCount || 1) > 1) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        subjectAnalysis: analysis as object,
        errorMessage: `Multiple subjects detected (${analysis.subjectCount}) — single-subject only in v1`,
      },
    });
    return {
      success: false,
      error:
        "Portraits currently support one subject at a time. Please upload a photo with a single person or pet.",
      errorType: "quality",
    };
  }

  // --- Step 4c: style/subject compatibility ---
  // Elven idealises the sitter: heavyset subjects came back as strangers 0/3
  // under BOTH single-pass and two-step, so it is the style's limit, not the
  // pipeline's. Reject up front — reaching the acceptance gate would spend a
  // full generation to arrive at the same honest failure, and this runs before
  // the paid download step.
  const subjectBuild = analysis.primarySubject.build?.toLowerCase() ?? "";
  if (styleVariantSlug === "elven" && /^(very\s+)?heavyset\b/.test(subjectBuild)) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        subjectAnalysis: analysis as object,
        errorMessage: `Style/subject incompatible: elven does not preserve likeness for build="${subjectBuild}"`,
      },
    });
    return {
      success: false,
      error:
        "The Elven style doesn't capture this photo's likeness well. Please pick another style — Renaissance and Starry Night work beautifully with this photo.",
      errorType: "quality",
    };
  }

  // --- Step 5: Load StyleVariant ---
  const stylePack = await prisma.stylePack.findUnique({
    where: { slug: stylePackSlug },
    include: {
      variants: {
        where: { slug: styleVariantSlug, isActive: true },
      },
    },
  });

  if (!stylePack || stylePack.variants.length === 0) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Style not found" },
    });
    return {
      success: false,
      error: "Selected style not found. Please choose a different style.",
      errorType: "notfound",
    };
  }

  const variant = stylePack.variants[0];

  // --- Step 6: Build the generation prompt for this style's architecture ---
  // Single-pass sends the real photo itself, so the prompt carries no
  // descriptor. Two-step needs a GENERIC stand-in: coloring + demographics from
  // the analysis JSON (required for the swap to bridge), never the real identity.
  const useSinglePass =
    SINGLE_PASS_STYLES.has(styleVariantSlug) && stylePackSlug !== "custom-scene";
  const standInDescriptor = buildStandInDescriptor(analysis);
  let enhancedPrompt: string;

  if (useSinglePass) {
    enhancedPrompt = buildSinglePassPrompt(
      variant.promptTemplate,
      variant.styleModifiers as Record<string, string>,
      analysis,
      userScene
    );
  } else if (stylePackSlug === "custom-scene" && userScene) {
    // Custom scene: enhance user description with Claude
    const customPrompt = await enhanceCustomScenePrompt(userScene, standInDescriptor);
    enhancedPrompt =
      customPrompt ||
      `${standInDescriptor} in a scene described as: ${userScene}. High quality digital art. Waist-up framing, the subject's face large in the frame and clearly visible.`;
  } else {
    // Standard style: fill template placeholders
    enhancedPrompt = buildStandInScenePrompt(
      variant.promptTemplate,
      standInDescriptor,
      variant.styleModifiers as Record<string, string>,
      analysis,
      userScene,
      styleVariantSlug
    );
  }

  // --- Step 7: Update portrait record with analysis + style ---
  await prisma.portrait.update({
    where: { id: portraitId },
    data: {
      status: "generating",
      stylePackSlug,
      styleVariantSlug,
      subjectType: analysis.subjectType,
      subjectAnalysis: analysis as object,
      enhancedPrompt,
      userId: userId || portrait.userId,
    },
  });

  // --- Step 8: Two-step generation (stand-in scene → identity swap) ---
  if (!isFacePreservationAvailable()) {
    // Step 2 requires Replicate. Fail loud — no text-to-image fallback:
    // a portrait that isn't the customer's subject is a mock result.
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage:
          "Face preservation not configured (ENABLE_FACE_PRESERVATION / REPLICATE_API_TOKEN)",
      },
    });
    return {
      success: false,
      error: "Portrait generation is temporarily unavailable. Please try again later.",
      errorType: "server",
    };
  }

  // COMBINED ACCEPTANCE GATE (P1 + P2.1 + P2.3) — the output must be BOTH the
  // same subject as the source (identity) AND carry the style. Both
  // architectures are judged by it, unchanged. FAIL-CLOSED: "unknown" on either
  // axis blocks — the old gate silently returned inert "unknown" and shipped
  // strangers.
  // The IP axis is only checked for styles that draw from a corpus where real
  // trademarks ARE the subject matter. Running it on renaissance would spend a
  // vision call per portrait to ask whether a 16th-century oil painting
  // infringes Marvel.
  const needsIpCheck = IP_SENSITIVE_STYLES.has(styleVariantSlug);

  const assessOutput = async (imageUrl: string) => {
    const [identity, style, ip] = await Promise.all([
      checkIdentityPresence(portrait.sourceImageUrl, imageUrl),
      checkStylePresence(imageUrl, `${stylePack.name} — ${variant.name}`),
      needsIpCheck ? checkIpSafety(imageUrl) : Promise.resolve("clean" as const),
    ]);
    return {
      identity,
      style,
      ip,
      pass: identity === "same" && style === "styled" && ip === "clean",
    };
  };

  // The rejected image URL is logged so a blocked portrait can actually be
  // inspected: "identity=different" is a claim about an image, and without the
  // URL there is no way to tell a correct rejection from a gate false-positive.
  const gateFailure = async (
    identity: string,
    style: string,
    ip: string,
    rejectedUrl: string
  ) => {
    console.error(
      `[PortraitGen] Acceptance gate FAILED after retry (identity=${identity}, style=${style}, ip=${ip}) — portrait blocked; rejected=${rejectedUrl}`
    );
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: `Output failed acceptance gate (identity=${identity}, style=${style}, ip=${ip})`,
      },
    });
    return {
      success: false as const,
      error:
        "The generated portrait didn't match your photo closely enough. Please try again.",
      errorType: "generation" as const,
    };
  };

  let genResult: { imageUrl: string };

  if (useSinglePass) {
    // --- Step 8 (single-pass): the real photo goes straight to Kontext ---
    console.log(`[PortraitGen] Single-pass generation (${styleVariantSlug})`);
    let pass = await generateSinglePassPortrait({
      photoUrl: portrait.sourceImageUrl,
      prompt: enhancedPrompt,
    });
    if (!pass.success || !pass.imageUrl) {
      await prisma.portrait.update({
        where: { id: portraitId },
        data: { status: "failed", errorMessage: pass.error || "Single-pass generation failed" },
      });
      return {
        success: false,
        error: "Portrait generation failed. Please try again.",
        errorType: "generation",
      };
    }

    let spVerdict = await assessOutput(pass.imageUrl);
    if (!spVerdict.pass) {
      console.log(
        `[PortraitGen] Acceptance gate failed (identity=${spVerdict.identity}, style=${spVerdict.style}, ip=${spVerdict.ip}) — retrying single-pass once`
      );
      const retry = await generateSinglePassPortrait({
        photoUrl: portrait.sourceImageUrl,
        prompt: enhancedPrompt,
      });
      if (retry.success && retry.imageUrl) {
        const retryVerdict = await assessOutput(retry.imageUrl);
        if (retryVerdict.pass) {
          pass = retry;
          spVerdict = retryVerdict;
        }
      }
    }
    if (!spVerdict.pass) {
      return gateFailure(spVerdict.identity, spVerdict.style, spVerdict.ip, pass.imageUrl!);
    }
    console.log(
      `[PortraitGen] Acceptance gate PASSED (identity=${spVerdict.identity}, style=${spVerdict.style}, ip=${spVerdict.ip})`
    );
    genResult = { imageUrl: pass.imageUrl! };
    console.log("[PortraitGen] Single-pass generation complete");
  } else {
    // Step 8a: stand-in scene (per-style pinned engine, P3) + FIDELITY GATE
    // (P2.2). The swap can only bridge what the stand-in already resembles: a
    // mismatched stand-in (wrong hair/eye/skin coloring vs the analysis JSON)
    // is regenerated and NEVER reaches the swap. This automates the human QA
    // bar behind the Jul-7 15/15.
    const MAX_STANDIN_ATTEMPTS = 3;
    type StandInOutcome =
      | { ok: true; sceneUrl: string }
      | { ok: false; kind: "engine"; message: string }
      | { ok: false; kind: "verifier" }
      | { ok: false; kind: "mismatch" };

    const acquireStandIn = async (): Promise<StandInOutcome> => {
      for (let attempt = 1; attempt <= MAX_STANDIN_ATTEMPTS; attempt++) {
        console.log(
          `[PortraitGen] Step 1: generating stand-in scene (attempt ${attempt}/${MAX_STANDIN_ATTEMPTS})`
        );
        const scene = await generateStandInScene(enhancedPrompt, styleVariantSlug);
        if ("error" in scene) {
          console.error("[PortraitGen] Stand-in scene failed:", scene.error);
          return { ok: false, kind: "engine", message: scene.error };
        }

        const fidelity = await checkStandInFidelity(
          portrait.sourceImageUrl,
          scene.sceneUrl
        );
        if (fidelity === "match") return { ok: true, sceneUrl: scene.sceneUrl };
        if (fidelity === "unknown") {
          // FAIL-CLOSED: the verifier is blind — abort rather than burn
          // regeneration spend on unverifiable stand-ins (standing rule: fail
          // loudly, never proceed on missing/degraded dependencies).
          console.error("[PortraitGen] Stand-in fidelity check UNAVAILABLE — aborting");
          return { ok: false, kind: "verifier" };
        }
        console.warn(
          `[PortraitGen] Stand-in fidelity MISMATCH on attempt ${attempt} — regenerating`
        );
      }
      return { ok: false, kind: "mismatch" };
    };

    const firstStandIn = await acquireStandIn();
    if (!firstStandIn.ok) {
      if (firstStandIn.kind === "engine") {
        await prisma.portrait.update({
          where: { id: portraitId },
          data: { status: "failed", errorMessage: firstStandIn.message },
        });
        return {
          success: false,
          error: "Portrait generation failed. Please try again.",
          errorType: "generation",
        };
      }
      if (firstStandIn.kind === "verifier") {
        await prisma.portrait.update({
          where: { id: portraitId },
          data: {
            status: "failed",
            errorMessage: "Stand-in fidelity verification unavailable (vision leg down)",
          },
        });
        return {
          success: false,
          error: "Portrait generation is temporarily unavailable. Please try again later.",
          errorType: "server",
        };
      }
      await prisma.portrait.update({
        where: { id: portraitId },
        data: {
          status: "failed",
          errorMessage: `Stand-in did not match subject coloring after ${MAX_STANDIN_ATTEMPTS} attempts`,
        },
      });
      return {
        success: false,
        error: "We couldn't generate a portrait that matches your photo. Please try again.",
        errorType: "generation",
      };
    }
    const sceneUrl = firstStandIn.sceneUrl;

    // Step 8b: identity swap — the real photo is image 1 (identity anchor).
    const subjectKind =
      analysis.subjectType === "pet" ? ("pet" as const) : ("person" as const);
    console.log("[PortraitGen] Step 2: swapping identity onto stand-in scene");
    let swap = await swapFaceIntoScene({
      photoUrl: portrait.sourceImageUrl,
      sceneUrl,
      subjectKind,
      subjectAge: analysis.primarySubject.ageBracket,
    });

    if (!swap.success || !swap.imageUrl) {
      await prisma.portrait.update({
        where: { id: portraitId },
        data: { status: "failed", errorMessage: swap.error || "Identity swap failed" },
      });
      return {
        success: false,
        error: "Portrait generation failed. Please try again.",
        errorType: "generation",
      };
    }

    // Step 8c: acceptance gate. The old retry fired only on "photoreal"
    // (inverted risk: it pushed outputs AWAY from likeness); now a retry must win
    // on BOTH axes or the portrait fails honestly.
    let verdict = await assessOutput(swap.imageUrl);
    if (!verdict.pass) {
      // The retry regenerates the STAND-IN, not just the swap. The swap can
      // only redraw the face; build, skin tone and head geometry are inherited
      // from the scene, so re-rolling the swap against the same stand-in keeps
      // the input that lost the identity in the first place.
      console.log(
        `[PortraitGen] Acceptance gate failed (identity=${verdict.identity}, style=${verdict.style}, ip=${verdict.ip}) — retrying with a fresh stand-in`
      );
      const retryStandIn = await acquireStandIn();
      if (retryStandIn.ok) {
        const retry = await swapFaceIntoScene({
          photoUrl: portrait.sourceImageUrl,
          sceneUrl: retryStandIn.sceneUrl,
          subjectKind,
          subjectAge: analysis.primarySubject.ageBracket,
        });
        if (retry.success && retry.imageUrl) {
          const retryVerdict = await assessOutput(retry.imageUrl);
          if (retryVerdict.pass) {
            swap = retry;
            verdict = retryVerdict;
          }
        }
      }
    }

    if (!verdict.pass) {
      return gateFailure(verdict.identity, verdict.style, verdict.ip, swap.imageUrl!);
    }
    console.log(
      `[PortraitGen] Acceptance gate PASSED (identity=${verdict.identity}, style=${verdict.style}, ip=${verdict.ip})`
    );

    // swap.imageUrl is guaranteed here: the initial swap was checked above and
    // the retry is only adopted when retry.imageUrl is present.
    genResult = { imageUrl: swap.imageUrl! };
    console.log("[PortraitGen] Two-step generation complete");
  }


  // --- Step 9: Fetch generated image ---
  let imageBuffer: Buffer;
  try {
    const imgResponse = await fetch(genResult.imageUrl);
    if (!imgResponse.ok) throw new Error(`Failed to fetch generated image: ${imgResponse.status}`);
    const arrayBuffer = await imgResponse.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[PortraitGen] Failed to fetch generated image:", error);
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Failed to retrieve generated image" },
    });
    return {
      success: false,
      error: "Failed to retrieve generated portrait. Please try again.",
      errorType: "generation",
    };
  }

  // --- Step 10: Apply watermark to preview ---
  const watermarkResult = await applyWatermark(imageBuffer);
  if (!watermarkResult.success || !watermarkResult.buffer) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Watermark processing failed" },
    });
    return {
      success: false,
      error: "Preview processing failed. Please try again.",
      errorType: "server",
    };
  }

  // --- Step 11: Calculate version number for cache busting ---
  // Count how many times this portrait has been generated (for regeneration)
  const existingVersions = portrait.previewImageUrl
    ? (portrait.previewImageUrl.match(/-v(\d+)-preview/) || [null, "0"])[1]
    : "0";
  const newVersion = parseInt(existingVersions || "0", 10) + 1;
  console.log(`[PortraitGen] Generating version ${newVersion} for portrait ${portraitId}`);

  // --- Step 12: Upscale ×4 + store hi-res (unwatermarked) ---
  // Engines output ~1MP; we sell "full 4K". Real-ESRGAN ×4 makes the
  // promise true. Fail CLOSED: a preview whose hi-res can't be delivered
  // would be a purchasable product we can't fulfill.
  const upscale = await upscalePortraitBuffer(imageBuffer);
  if (!upscale.success || !upscale.buffer) {
    console.error(`[PortraitGen] Upscale failed: ${upscale.error}`);
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: `Upscale failed: ${upscale.error}` },
    });
    return {
      success: false,
      error: "Final image processing failed. Please try again.",
      errorType: "generation",
    };
  }
  console.log(
    `[PortraitGen] Upscaled ×4 in ${upscale.processingTimeMs}ms (${imageBuffer.length} → ${upscale.buffer.length} bytes)`
  );

  const hiResBuffer = await prepareHiResImage(upscale.buffer);
  let hiResImageUrl: string | undefined;
  if (hiResBuffer.success && hiResBuffer.buffer) {
    const hiResUpload = await uploadPortraitHiRes(hiResBuffer.buffer, portraitId, newVersion);
    if (hiResUpload.success) hiResImageUrl = hiResUpload.url;
  }
  if (!hiResImageUrl) {
    console.error(
      `[PortraitGen] Hi-res prep/upload failed: ${hiResBuffer.error || "upload failed"}`
    );
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Failed to store hi-res image" },
    });
    return {
      success: false,
      error: "Failed to store portrait. Please try again.",
      errorType: "upload",
    };
  }

  // --- Step 13: Upload watermarked preview to R2 ---
  const previewUpload = await uploadPortraitPreview(watermarkResult.buffer, portraitId, newVersion);
  if (!previewUpload.success || !previewUpload.url) {
    await prisma.portrait.update({
      where: { id: portraitId },
      data: { status: "failed", errorMessage: "Failed to store preview" },
    });
    return {
      success: false,
      error: "Failed to store portrait preview. Please try again.",
      errorType: "upload",
    };
  }

  // --- Step 14: Update portrait record as complete ---
  const generationTimeMs = Date.now() - startTime;
  await prisma.portrait.update({
    where: { id: portraitId },
    data: {
      status: "preview",
      previewImageUrl: previewUpload.url,
      hiResImageUrl: hiResImageUrl || null,
      generationTimeMs,
      // Clear any failure message from a previous attempt — a successful
      // regeneration otherwise leaves stale error text on a "preview" row.
      errorMessage: null,
      updatedAt: new Date(),
    },
  });

  return {
    success: true,
    previewImageUrl: previewUpload.url,
    subjectType: analysis.subjectType,
  };
}
