/**
 * Image Generation Service
 *
 * Integrates ImageCrafter with the shared image-gen service
 * (image-gen.xencolabs.com) per IMAGE-GEN-USER_GUIDE.md.
 *
 * Flows:
 * - SINGLE (Free + Pro): POST /api/v1/generate — one image, one
 *   GenerationRequest with one Image child.
 * - DUAL (Pro only):     POST /api/v1/dual/generate — the service fans out to
 *   two providers and returns a slot envelope ({gemini: {...}, openai: {...}}).
 *   Both results are persisted under ONE GenerationRequest; the user picks the
 *   winner via selectWinnerImage().
 *
 * Credit accounting (brief §Credit accounting):
 * - Credits are DEBITED when the request is created (before the service call).
 * - On total service failure the request is marked FAILED and credits are
 *   fully REFUNDED.
 * - On a partial dual result (one provider errored) only the returned image is
 *   charged; the missing image's credit is refunded and the request is marked
 *   PARTIAL. We never fabricate the missing image.
 *
 * There is deliberately NO mock/placeholder/fallback image path in this file.
 * If the service fails, the request fails honestly.
 */

import { prisma } from "@/lib/prisma";
import { requireEnv } from "@/lib/env";
import {
  RESOLUTION_DIMENSIONS,
  PLANS,
  getCreditCost,
  isResolutionAvailable,
  type Resolution,
  type PlanTier,
} from "@/lib/plans";
import {
  isR2Available,
  uploadToR2Async,
  calculateExpiration,
} from "@/lib/r2";

// =============================================================================
// TYPES
// =============================================================================

export interface GenerateImageParams {
  userId: string;
  prompt: string;
  enhancedPrompt?: string;
  resolution?: Resolution;
  aspectRatio?: string;
  templateId?: string;
  presetId?: string;
  projectId?: string;
  characterId?: string;
  seed?: number;
}

export interface GenerateDualParams {
  userId: string;
  prompt: string;
  enhancedPrompt?: string;
  aspectRatio?: string;
  templateId?: string;
  presetId?: string;
  projectId?: string;
}

export interface GeneratedImageInfo {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  resolution: string;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
  creditsCost: number;
  hasWatermark: boolean;
}

export type GenerationRequestStatusValue =
  | "PENDING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export interface GenerationResult {
  success: boolean;
  requestId?: string;
  mode: "SINGLE" | "DUAL";
  status?: GenerationRequestStatusValue;
  images: GeneratedImageInfo[];
  /** Providers the service reported as failed (dual partial/total failure). */
  failedProviders?: { provider: string; error: string }[];
  error?: string;
  creditsCharged?: number;
  creditsRemaining?: number;
}

export interface UserCredits {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  plan: PlanTier;
  maxResolution: Resolution;
}

// =============================================================================
// SERVICE CLIENT (image-gen.xencolabs.com)
// =============================================================================

/**
 * Both env vars are verified present in Vercel production. requireEnv() fails
 * loud at call time — no silent fallback to a dead host.
 */
function serviceConfig(): { apiUrl: string; apiKey: string } {
  return {
    apiUrl: requireEnv("IMAGE_GEN_API_URL"),
    apiKey: requireEnv("IMAGE_GEN_API_KEY"),
  };
}

export interface ServiceResponse {
  ok: boolean;
  status: number;
  json: Record<string, unknown> | null;
  rawText: string | null;
}

/**
 * POST to the image-gen service with guarded parsing.
 *
 * Empirical finding (2026-07-05): on internal failure the service can return
 * HTTP 500 with a PLAIN-TEXT body ("Internal Server Error"), not JSON. A
 * naive response.json() would throw an opaque SyntaxError, so parsing is
 * guarded and the raw text is preserved for the error message.
 */
export async function postToService(
  path: string,
  body: Record<string, unknown>
): Promise<ServiceResponse> {
  const { apiUrl, apiKey } = serviceConfig();

  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
    // Guide v3: generation regularly takes 1-3 minutes; client timeout >= 300s.
    signal: AbortSignal.timeout(300_000),
  });

  const rawText = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    json = null; // Non-JSON body (observed on service 500s) — keep rawText.
  }

  return { ok: response.ok, status: response.status, json, rawText };
}

/**
 * GET from the image-gen service (async job polling) with the same guarded
 * parsing as postToService.
 */
export async function getFromService(path: string): Promise<ServiceResponse> {
  const { apiUrl, apiKey } = serviceConfig();

  const response = await fetch(`${apiUrl}${path}`, {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(30_000),
  });

  const rawText = await response.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, json, rawText };
}

/**
 * Resolve the serving provider from the response (guide v3: read
 * provider/model from the RESPONSE — auto-routing means the serving engine
 * may differ from any default). The single-generate ImageResponse schema
 * carries `model` but not always `provider`, so fall back to inferring the
 * provider from the model family. Never hardcode an engine.
 */
function resolveProvider(
  provider: string | undefined,
  model: string | undefined
): string | null {
  if (provider) return provider;
  if (!model) return null;
  const m = model.toLowerCase();
  if (m.startsWith("soul") || m.includes("nano_banana") || m.includes("marketing_studio"))
    return "higgsfield";
  if (m.startsWith("kling")) return "kling";
  if (m.startsWith("gpt-image") || m.startsWith("dall-e")) return "openai";
  if (m.startsWith("gemini")) return "gemini";
  return null;
}

export function serviceErrorMessage(res: ServiceResponse, context: string): string {
  const detail =
    (res.json &&
      ((res.json.detail as string) ||
        (res.json.error as string) ||
        (res.json.message as string))) ||
    res.rawText?.slice(0, 200) ||
    "no response body";
  return `Image service ${context} failed (HTTP ${res.status}): ${detail}`;
}

// =============================================================================
// CREDIT MANAGEMENT
// =============================================================================

/**
 * Get user's current credit status
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get or create subscription
  let subscription = user.subscription;
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "FREE",
        creditsLimit: PLANS.FREE.creditsPerMonth,
        creditsUsed: 0,
        creditsResetAt: getNextResetDate(),
        maxResolution: PLANS.FREE.maxResolution,
        hasWatermark: true,
      },
    });
  }

  // Check if credits should reset
  if (new Date() >= subscription.creditsResetAt) {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsUsed: 0,
        creditsResetAt: getNextResetDate(),
      },
    });
  }

  return {
    used: subscription.creditsUsed,
    limit: subscription.creditsLimit,
    remaining: subscription.creditsLimit - subscription.creditsUsed,
    resetsAt: subscription.creditsResetAt,
    plan: subscription.plan as PlanTier,
    maxResolution: subscription.maxResolution as Resolution,
  };
}

/**
 * Check if user can generate at a specific resolution
 */
export async function canGenerate(
  userId: string,
  resolution: Resolution,
  imageCount: number = 1
): Promise<{ allowed: boolean; reason?: string; creditsNeeded?: number }> {
  const credits = await getUserCredits(userId);
  const cost = getCreditCost(resolution) * imageCount;

  // Check resolution access
  if (!isResolutionAvailable(credits.plan, resolution)) {
    return {
      allowed: false,
      reason: `${resolution} resolution requires the Pro plan`,
    };
  }

  // Check credits
  if (credits.remaining < cost) {
    return {
      allowed: false,
      reason: `Not enough credits. Need ${cost}, have ${credits.remaining}`,
      creditsNeeded: cost,
    };
  }

  return { allowed: true, creditsNeeded: cost };
}

/**
 * Debit credits at request creation time (before the service call).
 */
async function debitCredits(params: {
  userId: string;
  subscriptionId: string;
  credits: number;
  resolution: Resolution;
  requestId: string;
}): Promise<void> {
  await prisma.subscription.update({
    where: { id: params.subscriptionId },
    data: { creditsUsed: { increment: params.credits } },
  });

  await prisma.usageRecord.create({
    data: {
      userId: params.userId,
      action: "generate",
      creditsUsed: params.credits,
      resolution: params.resolution,
      imageId: params.requestId, // request-level debit; per-image rows are not created
    },
  });
}

/**
 * Refund credits on total or partial service failure.
 * Recorded as a negative-credit UsageRecord so the ledger stays auditable.
 */
async function refundCredits(params: {
  userId: string;
  subscriptionId: string;
  credits: number;
  resolution: Resolution;
  requestId: string;
}): Promise<void> {
  if (params.credits <= 0) return;

  await prisma.subscription.update({
    where: { id: params.subscriptionId },
    data: { creditsUsed: { decrement: params.credits } },
  });

  await prisma.usageRecord.create({
    data: {
      userId: params.userId,
      action: "refund",
      creditsUsed: -params.credits,
      resolution: params.resolution,
      imageId: params.requestId,
    },
  });
}

// =============================================================================
// SINGLE GENERATION (Free + Pro)
// =============================================================================

/**
 * Generate a single image via POST /api/v1/generate.
 * Persists one GenerationRequest with one Image child.
 */
export async function generateImage(
  params: GenerateImageParams
): Promise<GenerationResult> {
  const {
    userId,
    prompt,
    enhancedPrompt,
    resolution = "1K",
    aspectRatio = "1:1",
    templateId,
    presetId,
    projectId,
    characterId,
    seed,
  } = params;

  // Check plan + credits
  const canGen = await canGenerate(userId, resolution, 1);
  if (!canGen.allowed) {
    return { success: false, mode: "SINGLE", images: [], error: canGen.reason };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user?.subscription) {
    return {
      success: false,
      mode: "SINGLE",
      images: [],
      error: "User or subscription not found",
    };
  }
  const subscription = user.subscription;
  const hasWatermark = subscription.hasWatermark;
  const creditsCost = getCreditCost(resolution);

  // 1. Create the request and debit upfront
  const request = await prisma.generationRequest.create({
    data: {
      userId: user.id,
      mode: "SINGLE",
      status: "PENDING",
      prompt,
      enhancedPrompt: enhancedPrompt || null,
      aspectRatio,
      resolution,
      creditsCharged: creditsCost,
    },
  });

  await debitCredits({
    userId: user.id,
    subscriptionId: subscription.id,
    credits: creditsCost,
    resolution,
    requestId: request.id,
  });

  // 2. Call the service (contract per IMAGE-GEN-USER_GUIDE.md)
  const startTime = Date.now();
  let res: ServiceResponse;
  try {
    res = await postToService("/api/v1/generate", {
      prompt: enhancedPrompt || prompt,
      aspect_ratio: aspectRatio,
      resolution,
      source_app: "imagecrafter",
    });
  } catch (error) {
    return failRequest(request.id, user.id, subscription.id, creditsCost, resolution, {
      message: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
    });
  }

  const imageData =
    res.ok && res.json
      ? (res.json.image as Record<string, unknown> | undefined)
      : undefined;
  const imageUrl = imageData?.image_url as string | undefined;

  if (!res.ok || !imageUrl) {
    return failRequest(request.id, user.id, subscription.id, creditsCost, resolution, {
      message: res.ok
        ? "Image service returned no image URL"
        : serviceErrorMessage(res, "generate"),
    });
  }

  const totalLatencyMs = Date.now() - startTime;
  const thumbnailUrl = (imageData?.download_url as string | undefined) || null;
  const modelVersion = (imageData?.model as string | undefined) || null;
  const externalId =
    (imageData?.external_id as string | undefined) ||
    (imageData?.id as string | undefined) ||
    null;

  const dimensions = calculateDimensions(resolution, aspectRatio);
  const expiresAt = isR2Available()
    ? calculateExpiration(subscription.plan)
    : null;

  // 3. Persist the image under the request
  const image = await prisma.image.create({
    data: {
      userId: user.id,
      generationRequestId: request.id,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt || null,
      imageUrl,
      thumbnailUrl,
      width: dimensions.width,
      height: dimensions.height,
      resolution,
      creditsCost,
      templateId,
      presetId,
      projectId,
      characterId,
      aspectRatio,
      seed,
      modelVersion,
      generationTime: totalLatencyMs,
      hasWatermark,
      expiresAt,
      externalId,
      // Guide v3: the serving engine is auto-routed — read it from the
      // RESPONSE. ImageResponse has no provider field, so infer from model.
      provider:
        resolveProvider(
          imageData?.provider as string | undefined,
          modelVersion ?? undefined
        ) ?? "unknown",
    },
  });

  // 4. Mark completed; single mode auto-selects its only image so the gallery
  //    data shape ("show the pick") is uniform across SINGLE and DUAL.
  await prisma.generationRequest.update({
    where: { id: request.id },
    data: {
      status: "COMPLETED",
      totalLatencyMs,
      selectedImageId: image.id,
    },
  });

  // 5. Async R2 migration (non-blocking) + prompt history
  if (isR2Available()) {
    uploadToR2Async(image.id, imageUrl, thumbnailUrl, user.id).catch((err) => {
      console.error("[R2] Async upload failed for image:", image.id, err);
    });
  }
  await recordPromptHistory(user.id, prompt, enhancedPrompt, templateId, presetId);

  const updatedCredits = await getUserCredits(userId);

  return {
    success: true,
    requestId: request.id,
    mode: "SINGLE",
    status: "COMPLETED",
    images: [
      {
        id: image.id,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl || undefined,
        width: image.width,
        height: image.height,
        resolution: image.resolution,
        provider: image.provider,
        model: modelVersion,
        latencyMs: totalLatencyMs,
        creditsCost,
        hasWatermark: image.hasWatermark,
      },
    ],
    creditsCharged: creditsCost,
    creditsRemaining: updatedCredits.remaining,
  };
}

// =============================================================================
// DUAL GENERATION (Pro)
// =============================================================================

/** Slot keys in the dual/generate response envelope (per the user guide). */
const DUAL_SLOTS = ["gemini", "openai"] as const;

interface DualSlot {
  provider?: string;
  success?: boolean;
  external_id?: string;
  image_url?: string;
  download_url?: string;
  model?: string;
  latency_ms?: number;
  estimated_cost_usd?: number;
  /** OpenAPI: ProviderImageResult.error_message (not `error`). */
  error_message?: string;
  error?: string;
}

/**
 * Generate two images (two providers) via POST /api/v1/dual/generate,
 * persisted under ONE GenerationRequest. The user then picks the winner via
 * selectWinnerImage().
 *
 * The dual endpoint takes NO resolution parameter — dual comparisons run at
 * the service default (1K-class output), so cost is 2 × the 1K credit cost.
 *
 * Partial results are real results: if one provider errored, the returned
 * image is persisted and charged, the missing image is refunded, and the
 * request is marked PARTIAL with the provider's error surfaced verbatim.
 */
export async function generateDual(
  params: GenerateDualParams
): Promise<GenerationResult> {
  const {
    userId,
    prompt,
    enhancedPrompt,
    aspectRatio = "1:1",
    templateId,
    presetId,
    projectId,
  } = params;

  const resolution: Resolution = "1K";
  const perImageCost = getCreditCost(resolution);
  const upfrontCost = perImageCost * 2;

  // Plan gate: dual compare is a Pro capability
  const credits = await getUserCredits(userId);
  if (credits.plan !== "PRO") {
    return {
      success: false,
      mode: "DUAL",
      images: [],
      error: "Dual-engine generation requires the Pro plan",
    };
  }
  if (credits.remaining < upfrontCost) {
    return {
      success: false,
      mode: "DUAL",
      images: [],
      error: `Not enough credits. Need ${upfrontCost}, have ${credits.remaining}`,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user?.subscription) {
    return {
      success: false,
      mode: "DUAL",
      images: [],
      error: "User or subscription not found",
    };
  }
  const subscription = user.subscription;
  const hasWatermark = subscription.hasWatermark;

  // 1. Create the request and debit both images upfront
  const request = await prisma.generationRequest.create({
    data: {
      userId: user.id,
      mode: "DUAL",
      status: "PENDING",
      prompt,
      enhancedPrompt: enhancedPrompt || null,
      aspectRatio,
      resolution,
      creditsCharged: upfrontCost,
    },
  });

  await debitCredits({
    userId: user.id,
    subscriptionId: subscription.id,
    credits: upfrontCost,
    resolution,
    requestId: request.id,
  });

  // 2. Call the dual endpoint
  const startTime = Date.now();
  let res: ServiceResponse;
  try {
    res = await postToService("/api/v1/dual/generate", {
      prompt: enhancedPrompt || prompt,
      aspect_ratio: aspectRatio,
      source_app: "imagecrafter",
    });
  } catch (error) {
    return failRequest(request.id, user.id, subscription.id, upfrontCost, resolution, {
      message: `Image service unreachable: ${error instanceof Error ? error.message : "network error"}`,
      mode: "DUAL",
    });
  }

  // Total failure: non-OK status or non-JSON body (both observed empirically:
  // the service returned HTTP 500 plain-text "Internal Server Error" while its
  // /health reported gemini_api: false).
  if (!res.ok || !res.json) {
    return failRequest(request.id, user.id, subscription.id, upfrontCost, resolution, {
      message: serviceErrorMessage(res, "dual/generate"),
      mode: "DUAL",
    });
  }

  const totalLatencyMs =
    typeof res.json.total_latency_ms === "number"
      ? res.json.total_latency_ms
      : Date.now() - startTime;

  // 3. Persist exactly what the service returned — N may be 0, 1, or 2.
  const dimensions = calculateDimensions(resolution, aspectRatio);
  const expiresAt = isR2Available()
    ? calculateExpiration(subscription.plan)
    : null;

  const persisted: GeneratedImageInfo[] = [];
  const failedProviders: { provider: string; error: string }[] = [];

  for (const slotKey of DUAL_SLOTS) {
    const slot = res.json[slotKey] as DualSlot | undefined;
    if (!slot) {
      failedProviders.push({
        provider: slotKey,
        error: "Provider slot missing from service response",
      });
      continue;
    }
    if (!slot.success || !slot.image_url) {
      failedProviders.push({
        provider: slot.provider || slotKey,
        error:
          slot.error_message ||
          slot.error ||
          "Provider reported failure without detail",
      });
      continue;
    }

    const image = await prisma.image.create({
      data: {
        userId: user.id,
        generationRequestId: request.id,
        originalPrompt: prompt,
        enhancedPrompt: enhancedPrompt || null,
        imageUrl: slot.image_url,
        thumbnailUrl: slot.download_url || null,
        width: dimensions.width,
        height: dimensions.height,
        resolution,
        creditsCost: perImageCost,
        templateId,
        presetId,
        projectId,
        aspectRatio,
        modelVersion: slot.model || null,
        generationTime: slot.latency_ms ?? null,
        hasWatermark,
        expiresAt,
        externalId: slot.external_id || null,
        provider: slot.provider || slotKey,
        providerLatencyMs: slot.latency_ms ?? null,
        estimatedCostUsd: slot.estimated_cost_usd ?? null,
      },
    });

    if (isR2Available()) {
      uploadToR2Async(
        image.id,
        slot.image_url,
        slot.download_url || null,
        user.id
      ).catch((err) => {
        console.error("[R2] Async upload failed for image:", image.id, err);
      });
    }

    persisted.push({
      id: image.id,
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl || undefined,
      width: image.width,
      height: image.height,
      resolution: image.resolution,
      provider: image.provider,
      model: slot.model || null,
      latencyMs: slot.latency_ms ?? null,
      creditsCost: perImageCost,
      hasWatermark: image.hasWatermark,
    });
  }

  // 4. Settle status + credits based on what actually came back
  if (persisted.length === 0) {
    return failRequest(request.id, user.id, subscription.id, upfrontCost, resolution, {
      message: `Both providers failed: ${failedProviders
        .map((f) => `${f.provider}: ${f.error}`)
        .join("; ")}`,
      mode: "DUAL",
      failedProviders,
    });
  }

  const missingCount = 2 - persisted.length;
  const refund = missingCount * perImageCost;
  if (refund > 0) {
    await refundCredits({
      userId: user.id,
      subscriptionId: subscription.id,
      credits: refund,
      resolution,
      requestId: request.id,
    });
  }

  const finalStatus: GenerationRequestStatusValue =
    persisted.length === 2 ? "COMPLETED" : "PARTIAL";
  const creditsCharged = upfrontCost - refund;

  await prisma.generationRequest.update({
    where: { id: request.id },
    data: {
      status: finalStatus,
      totalLatencyMs,
      creditsCharged,
      errorMessage:
        failedProviders.length > 0
          ? failedProviders.map((f) => `${f.provider}: ${f.error}`).join("; ")
          : null,
      // With only one real image there is nothing to compare — auto-select it
      // so the gallery pick shape stays consistent. Two images = user picks.
      selectedImageId: persisted.length === 1 ? persisted[0].id : null,
    },
  });

  await recordPromptHistory(user.id, prompt, enhancedPrompt, templateId, presetId);

  const updatedCredits = await getUserCredits(userId);

  return {
    success: true,
    requestId: request.id,
    mode: "DUAL",
    status: finalStatus,
    images: persisted,
    failedProviders: failedProviders.length > 0 ? failedProviders : undefined,
    creditsCharged,
    creditsRemaining: updatedCredits.remaining,
  };
}

// =============================================================================
// WINNER SELECTION (dual pick)
// =============================================================================

export interface SelectWinnerResult {
  success: boolean;
  requestId?: string;
  selectedImageId?: string;
  error?: string;
}

/**
 * Persist the user's side-by-side pick. Ownership is enforced here: the
 * request must belong to the calling user and the image must belong to the
 * request.
 */
export async function selectWinnerImage(
  userId: string,
  requestId: string,
  imageId: string
): Promise<SelectWinnerResult> {
  const request = await prisma.generationRequest.findUnique({
    where: { id: requestId },
    include: { images: { select: { id: true } } },
  });

  if (!request || request.userId !== userId) {
    // Same message for missing and foreign requests — no existence oracle.
    return { success: false, error: "Generation request not found" };
  }

  if (!request.images.some((img) => img.id === imageId)) {
    return {
      success: false,
      error: "Image does not belong to this generation request",
    };
  }

  const updated = await prisma.generationRequest.update({
    where: { id: requestId },
    data: { selectedImageId: imageId },
  });

  return {
    success: true,
    requestId: updated.id,
    selectedImageId: updated.selectedImageId ?? imageId,
  };
}

// =============================================================================
// FAILURE PATH (honest: mark FAILED + refund, never fabricate an image)
// =============================================================================

async function failRequest(
  requestId: string,
  userId: string,
  subscriptionId: string,
  creditsToRefund: number,
  resolution: Resolution,
  opts: {
    message: string;
    mode?: "SINGLE" | "DUAL";
    failedProviders?: { provider: string; error: string }[];
  }
): Promise<GenerationResult> {
  console.error(`[image-gen] Request ${requestId} failed:`, opts.message);

  await prisma.generationRequest.update({
    where: { id: requestId },
    data: {
      status: "FAILED",
      errorMessage: opts.message,
      creditsCharged: 0,
    },
  });

  await refundCredits({
    userId,
    subscriptionId,
    credits: creditsToRefund,
    resolution,
    requestId,
  });

  return {
    success: false,
    requestId,
    mode: opts.mode ?? "SINGLE",
    status: "FAILED",
    images: [],
    failedProviders: opts.failedProviders,
    error: opts.message,
    creditsCharged: 0,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function recordPromptHistory(
  userId: string,
  prompt: string,
  enhancedPrompt?: string,
  templateId?: string,
  presetId?: string
): Promise<void> {
  await prisma.promptHistory
    .upsert({
      where: {
        id: `${userId}-${prompt.slice(0, 100)}`,
      },
      create: {
        id: `${userId}-${prompt.slice(0, 100)}`,
        userId,
        prompt,
        enhancedPrompt,
        templateId,
        presetId,
      },
      update: {
        timesUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    })
    .catch(() => {
      // Prompt history is best-effort — never blocks generation.
    });
}

function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

function calculateDimensions(
  resolution: Resolution,
  aspectRatio: string
): { width: number; height: number } {
  const baseDimensions = RESOLUTION_DIMENSIONS[resolution];
  const baseSize = baseDimensions.width;

  // Parse aspect ratio
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!w || !h) {
    return { width: baseSize, height: baseSize };
  }

  const ratio = w / h;

  if (ratio >= 1) {
    // Landscape or square
    return {
      width: baseSize,
      height: Math.round(baseSize / ratio),
    };
  } else {
    // Portrait
    return {
      width: Math.round(baseSize * ratio),
      height: baseSize,
    };
  }
}

// NOTE: batchGenerate() / processBatchJob() were removed 2026-07-05.
// The old implementation reserved credits into a BatchJob row and then did
// nothing (empty processor) — credits were stranded forever. Per the brief,
// that stub must not survive. Whether ImageCrafter wires the service's real
// batch endpoint (POST /api/v1/generate/batch) or drops batch for v1 is
// founder confirmation #1 (PLAN/01-plan.md Amendment A2) — unresolved.
// app/api/images/batch/route.ts returns 503 in the interim.

// =============================================================================
// IMAGE DOWNLOAD
// =============================================================================

/**
 * Get a downloadable URL for an image
 * This fetches the image and returns it as a blob URL or base64
 */
export async function getDownloadableImage(
  imageUrl: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = blob.type || "image/png";

    return {
      success: true,
      data: `data:${mimeType};base64,${base64}`,
    };
  } catch (error) {
    console.error("Download failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}
