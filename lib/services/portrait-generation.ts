/**
 * Portrait Generation Pipeline — TWO-STEP FACE-INTO-SCENE, BEST-OF-N
 *
 * Every portrait is analyzed with Claude Vision (identity + coloring +
 * demographics), then:
 *
 * 1. STAND-IN CANDIDATES. Render STANDIN_CANDIDATES generic stand-in scenes in
 *    parallel (full costume/style, no real identity) via image-gen.xencolabs.com,
 *    pinned to the per-style bake-off winner engine, with stand-in coloring built
 *    from the analysis JSON.
 * 2. VETO, THEN SELECT. A fidelity gate drops any candidate whose colouring has
 *    drifted off the subject; the survivors are ranked side by side and the
 *    strongest is chosen. Selection is where the quality comes from — these
 *    engines are high-variance, so which of three renders you ship matters more
 *    than any prompt edit (rule #49).
 * 3. SWAP. The real subject's identity goes onto the chosen scene via Replicate
 *    multi-image Kontext Pro (real photo = image 1, the identity anchor).
 *
 * A single-pass leg (real photo straight to Kontext) was measured and removed on
 * 2026-08-23: it scored well on identity benchmarks precisely BECAUSE it barely
 * changes the input, and shipped a colour-washed photo rather than a portrait —
 * "something I can do on my phone with a filter" (founder, on a delivered print).
 * The benchmark was measuring the wrong thing. Do not reinstate it on identity
 * scores alone; any revival must first be judged portrait-vs-filter.
 *
 * Then:
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

/**
 * How many stand-in candidates to render per attempt. They exist so the
 * fidelity veto has somewhere to fall back to, NOT so one can be judged best:
 * comparative ranking was measured and did not pay
 * (PLAN/results/best-of-n-verdict.md), so we now take the first that clears
 * the veto.
 *
 * The candidates render in PARALLEL, so this costs engine spend but roughly no
 * wall-clock against a sequential retry loop.
 */
const STANDIN_CANDIDATES = Number(process.env.STANDIN_CANDIDATES) || 3;

/**
 * Total identity swaps allowed per portrait, including the first. The gate
 * passes roughly 2 swaps in 3 (rule #49, measured both styles), so three
 * attempts put the effective pass rate near 96% — and a swap is $0.08/~17s
 * against a stand-in set that dominates both cost and latency.
 */
const SWAP_ATTEMPTS = Number(process.env.SWAP_ATTEMPTS) || 3;

/**
 * How far into the request a swap retry may still START. The stand-in phase is
 * allowed 600s of the route's 800s budget, so a fixed attempt count alone does
 * not bound us — the same reasoning as STANDIN_PHASE_BUDGET_MS. 700s leaves a
 * swap, its gate, and the upscale/storage tail.
 */
const SWAP_RETRY_CUTOFF_MS = Number(process.env.SWAP_RETRY_CUTOFF_MS) || 700_000;

// Styles whose output is checked for third-party IP. comic-hero is the only
// one that asks an engine for a genre defined by living trademarks; the rest
// draw on public-domain art movements.
const IP_SENSITIVE_STYLES = new Set(["comic-hero"]);

const ASYNC_POLL_INTERVAL_MS = 3_000;
// Per single job, not cumulative. Measured on comic-hero/nano_banana_pro: 1
// stand-in job in 12 exceeds 300s, observed max 373.0s
// (PLAN/results/standin-latency.md), so the old 300s default abandoned paid
// work that was about to succeed. STANDIN_PHASE_BUDGET_MS below is what keeps
// the retries from adding up past the route's function budget.
const ASYNC_POLL_TIMEOUT_MS = Number(process.env.ASYNC_POLL_TIMEOUT_MS) || 480_000;

/**
 * Whole-phase ceiling for stand-in generation, shared across all retry
 * attempts. The per-attempt timeout alone is not a safe bound: three attempts
 * each waiting ASYNC_POLL_TIMEOUT_MS can outlast the route's 800s Fluid
 * compute budget, which kills the request with FUNCTION_INVOCATION_TIMEOUT and
 * loses the portrait after real spend.
 *
 * 450s, not the old 600s: the swap leg moved to openai/gpt-image-2, which takes
 * ~110s instead of ~12s. Worst case downstream of here is two swaps (220s) plus
 * the acceptance gates and the upscale — roughly 300s. 600s + 300s overruns the
 * route and loses a paid portrait at the last step.
 */
const STANDIN_PHASE_BUDGET_MS =
  Number(process.env.STANDIN_PHASE_BUDGET_MS) || 450_000;

/** Generate a stand-in scene on a PINNED engine via the async endpoint. */
async function generatePinnedScene(
  prompt: string,
  engine: { provider: string; model?: string },
  phaseDeadline: number
): Promise<{ sceneUrl: string } | { error: string }> {
  if (Date.now() >= phaseDeadline) {
    return { error: "Stand-in phase budget exhausted before submitting a job" };
  }
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

  const deadline = Math.min(Date.now() + ASYNC_POLL_TIMEOUT_MS, phaseDeadline);
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
  const waited = Math.round((Date.now() - (deadline - ASYNC_POLL_TIMEOUT_MS)) / 1000);
  return {
    error:
      deadline === phaseDeadline
        ? `Stand-in job ${jobId} abandoned after ${waited}s — stand-in phase budget exhausted`
        : `Stand-in job ${jobId} timed out after ${ASYNC_POLL_TIMEOUT_MS / 1000}s`,
  };
}

/**
 * Step 1: generate the generic stand-in scene via the image-gen service.
 * Styles with a measured bake-off winner are PINNED to that engine (P3);
 * unmapped styles auto-route (guide v3). Honest error on failure; there is
 * NO fallback path.
 */
export async function generateStandInScene(
  prompt: string,
  styleVariantSlug?: string,
  phaseDeadline?: number
): Promise<{ sceneUrl: string } | { error: string }> {
  const engine = styleVariantSlug ? STYLE_ENGINE[styleVariantSlug] : undefined;
  if (engine) {
    console.log(
      `[PortraitGen] Style "${styleVariantSlug}" pinned to ${engine.provider}${engine.model ? `/${engine.model}` : ""} (bake-off winner)`
    );
    return generatePinnedScene(
      prompt,
      engine,
      phaseDeadline ?? Date.now() + STANDIN_PHASE_BUDGET_MS
    );
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

  // --- Step 6: Build the stand-in prompt ---
  // The stand-in is GENERIC: coloring + demographics from the analysis JSON
  // (required for the swap to bridge), never the real identity.
  const standInDescriptor = buildStandInDescriptor(analysis);
  let enhancedPrompt: string;

  if (stylePackSlug === "custom-scene" && userScene) {
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

  // The IP axis is the only hard block left in this gate. Identity and style
  // verdicts are recorded and the image is delivered regardless: the gate has
  // demonstrated errors in both directions, and a verdict the customer never
  // sees cannot be corrected. Trademark exposure is legal, not taste, so it
  // still fails closed.
  const ipBlock = async (identity: string, style: string, ip: string, rejectedUrl: string) => {
    console.error(
      `[PortraitGen] IP gate FAILED (identity=${identity}, style=${style}, ip=${ip}) — portrait blocked; rejected=${rejectedUrl}`
    );
    await prisma.portrait.update({
      where: { id: portraitId },
      data: {
        status: "failed",
        errorMessage: `Output failed IP safety check (ip=${ip})`,
      },
    });
    return {
      success: false as const,
      error:
        "We couldn't produce this style for your photo. Please try a different style.",
      errorType: "generation" as const,
    };
  };

  let genResult: { imageUrl: string };

  // Step 8a: stand-in scene (per-style pinned engine, P3) + FIDELITY GATE
  // (P2.2). The swap can only bridge what the stand-in already resembles: a
  // mismatched stand-in (wrong hair/eye/skin coloring vs the analysis JSON)
  // is regenerated and NEVER reaches the swap. This automates the human QA
  // bar behind the Jul-7 15/15.
  type StandInOutcome =
    | { ok: true; sceneUrl: string }
    | { ok: false; kind: "engine"; message: string }
    | { ok: false; kind: "verifier" }
    | { ok: false; kind: "mismatch" };

  // One clock for every stand-in attempt in this request. Per-attempt timeouts
  // alone do not bound the request: parallel candidates that each retry could
  // outlast the route's 800s budget and die with FUNCTION_INVOCATION_TIMEOUT
  // after real spend.
  const standInPhaseDeadline = Date.now() + STANDIN_PHASE_BUDGET_MS;

  const subjectKind =
    analysis.subjectType === "pet" ? ("pet" as const) : ("person" as const);

  const acquireStandIn = async (): Promise<StandInOutcome> => {
    console.log(
      `[PortraitGen] Step 1: generating ${STANDIN_CANDIDATES} stand-in candidates in parallel`
    );
    const results = await Promise.all(
      Array.from({ length: STANDIN_CANDIDATES }, () =>
        generateStandInScene(enhancedPrompt, styleVariantSlug, standInPhaseDeadline)
      )
    );

    const sceneUrls = results.flatMap((r) => ("error" in r ? [] : [r.sceneUrl]));
    if (sceneUrls.length === 0) {
      // Every candidate failed, so the engine itself is the problem. Report
      // the first error verbatim rather than a count: the operator needs the
      // provider's own message to tell an outage from a rejected prompt.
      const firstError = results.find((r) => "error" in r) as { error: string };
      console.error("[PortraitGen] All stand-in candidates failed:", firstError.error);
      return { ok: false, kind: "engine", message: firstError.error };
    }
    if (sceneUrls.length < STANDIN_CANDIDATES) {
      console.warn(
        `[PortraitGen] Only ${sceneUrls.length}/${STANDIN_CANDIDATES} stand-in candidates rendered — selecting from those`
      );
    }

    // The fidelity veto still runs on every candidate, unchanged: a stand-in
    // whose colouring has drifted off the subject cannot be rescued by being
    // the best of a bad set.
    const fidelities = await Promise.all(
      sceneUrls.map((url) =>
        checkStandInFidelity(portrait.sourceImageUrl, url, subjectKind)
      )
    );
    if (fidelities.includes("unknown")) {
      // FAIL-CLOSED: the verifier is blind — abort rather than ship an
      // unverified stand-in (standing rule: fail loudly, never proceed on
      // missing/degraded dependencies).
      console.error("[PortraitGen] Stand-in fidelity check UNAVAILABLE — aborting");
      return { ok: false, kind: "verifier" };
    }
    const eligible = sceneUrls.filter((_, i) => fidelities[i] === "match");
    if (eligible.length === 0) {
      console.warn(
        `[PortraitGen] All ${sceneUrls.length} stand-in candidates failed the fidelity veto`
      );
      return { ok: false, kind: "mismatch" };
    }

    // First eligible candidate, not a ranked one. Comparative ranking was
    // measured and did not pay (PLAN/results/best-of-n-verdict.md): across 4
    // divergent head-to-heads it went 2-1-1 by gate and 1-2-1 by eye, and in
    // one run it vetoed the candidate that produced the better likeness. The
    // ranker had nothing to work with — it called 17/18 candidates defect-free,
    // because N candidates from a pinned engine come back near-identical.
    console.log(`[PortraitGen] Using first of ${eligible.length} eligible stand-ins`);
    return { ok: true, sceneUrl: eligible[0] };
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
        errorMessage: `No stand-in candidate matched subject coloring (${STANDIN_CANDIDATES} rendered)`,
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

  // Step 8c: acceptance gate. A failing verdict still buys retries — a better
  // draw is worth $0.08 — but it no longer decides whether the customer gets an
  // image.
  // The retry re-rolls the SWAP against the same stand-in. The swap does not
  // repaint a face onto a fixed scene — it redraws the whole composition, and
  // measurably reframes it in both directions (PLAN/results/best-of-n-verdict.md,
  // #78b) — so a second swap onto one stand-in is a genuinely independent draw,
  // at a fraction of the cost of regenerating the stand-in set.
  let verdict = await assessOutput(swap.imageUrl);
  let swapAttempts = 1;
  for (let attempt = 2; attempt <= SWAP_ATTEMPTS && !verdict.pass; attempt++) {
    if (Date.now() - startTime > SWAP_RETRY_CUTOFF_MS) {
      console.warn(
        `[PortraitGen] Skipping swap attempt ${attempt} — request budget nearly spent`
      );
      break;
    }
    console.log(
      `[PortraitGen] Acceptance gate failed (identity=${verdict.identity}, style=${verdict.style}, ip=${verdict.ip}) — swap attempt ${attempt}/${SWAP_ATTEMPTS}`
    );
    const retry = await swapFaceIntoScene({
      photoUrl: portrait.sourceImageUrl,
      sceneUrl,
      subjectKind,
      subjectAge: analysis.primarySubject.ageBracket,
    });
    swapAttempts = attempt;
    if (!retry.success || !retry.imageUrl) {
      console.error(`[PortraitGen] Swap attempt ${attempt} failed:`, retry.error);
      continue;
    }
    const retryVerdict = await assessOutput(retry.imageUrl);
    swap = retry;
    verdict = retryVerdict;
  }

  if (verdict.ip !== "clean") {
    return ipBlock(verdict.identity, verdict.style, verdict.ip, swap.imageUrl!);
  }
  if (verdict.pass) {
    console.log(
      `[PortraitGen] Acceptance gate PASSED (identity=${verdict.identity}, style=${verdict.style}, ip=${verdict.ip}) after ${swapAttempts} swap(s)`
    );
  } else {
    // Delivered anyway, verdict recorded on the row. The URL is logged so the
    // call can be second-guessed against the actual image.
    console.warn(
      `[PortraitGen] Acceptance gate did not pass (identity=${verdict.identity}, style=${verdict.style}) after ${swapAttempts} swap(s) — DELIVERING, verdict recorded; image=${swap.imageUrl}`
    );
  }

  // swap.imageUrl is guaranteed here: the initial swap was checked above and
  // the retry is only adopted when retry.imageUrl is present.
  genResult = { imageUrl: swap.imageUrl! };
  console.log("[PortraitGen] Two-step generation complete");


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
      gateVerdict: { ...verdict, swapAttempts },
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
