/**
 * Preview gate — three layers in front of preview generation.
 *
 * The money is spent at generation (Claude Vision, then the stand-in provider,
 * then the swap, then the upscale). So the gate runs in the route handler
 * BEFORE generatePortrait() is called: a refusal here costs nothing. A gate that
 * sits between generation and viewing protects the image, not the wallet.
 *
 *   Layer 1  first preview free, every one after it needs an email.
 *   Layer 2  a loose per-IP and per-email daily backstop — a runaway-abuse net,
 *            deliberately far above any real session so exploring never walls.
 *   Layer 3  captcha once the velocity signal says this is not a human. This is
 *            the actual lock: rapid-fire is what separates a bot from a buyer.
 *
 * The counts come from ic_PreviewUsage, never from the client — a cookie-based
 * count resets when the cookie clears, which is the whole abuse case.
 */

import { prisma } from "@/lib/prisma";
import { verifyCaptcha, captchaConfigured } from "@/lib/services/captcha";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Previews allowed before an email is required. */
export const FREE_PREVIEWS = envInt("PREVIEW_FREE_LIMIT", 1);

/**
 * Rolling-24h backstop per IP and per email. This is NOT the lock — the
 * velocity trigger below is. Repeat previewing is a buying signal, so a person
 * switching styles, poses and pets must never hit a wall; 200 is ~4.5 hours of
 * continuous serial generation at ~80s each, which is a script, not a shopper.
 */
export const DAILY_CAP = envInt("PREVIEW_DAILY_CAP", 200);

/**
 * The primary lock. 8 generations inside 10 minutes is not reachable serially
 * (8 x ~80s > 600s), so this only fires on parallel requests — the thing that
 * separates a bot from an enthusiast rather than a raw count that punishes both.
 */
export const VELOCITY_COUNT = envInt("PREVIEW_VELOCITY_COUNT", 8);
export const VELOCITY_WINDOW_MIN = envInt("PREVIEW_VELOCITY_WINDOW_MIN", 10);

const DAY_MS = 24 * 60 * 60 * 1000;

export type GateDecision =
  | { allowed: true; usageId: string; email: string | null; isFirstPreview: boolean }
  | {
      allowed: false;
      code: GateRefusal;
      error: string;
      previewsUsed: number;
    };

export type GateRefusal =
  | "email_required"
  | "captcha_required"
  | "captcha_failed"
  | "rate_limited"
  | "daily_limit";

/**
 * Caller's IP as Vercel presents it. x-forwarded-for is a chain; the first hop
 * is the client. Falls back to a constant so a missing header collapses every
 * anonymous caller into one bucket rather than granting each of them a fresh
 * free preview.
 */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

function normalizeEmail(raw?: string | null): string | null {
  const email = raw?.trim().toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * Decide whether this caller may burn a generation, and record the attempt.
 *
 * The usage row is written before the count is taken, so two racing requests
 * both see themselves in the total and the tie resolves toward refusal. Refused
 * attempts are marked "blocked" and do not consume quota, but they still feed
 * the velocity signal.
 */
export async function checkPreviewGate(params: {
  sessionId: string;
  ip: string;
  portraitId: string;
  /** Signed-in address. Present means Layer 1 is already satisfied. */
  accountEmail?: string | null;
  /** Address supplied by the gate prompt on this request. */
  submittedEmail?: string | null;
  captchaToken?: string | null;
}): Promise<GateDecision> {
  const { sessionId, ip, portraitId, captchaToken } = params;

  const accountEmail = normalizeEmail(params.accountEmail);
  const submittedEmail = normalizeEmail(params.submittedEmail);

  const since = new Date(Date.now() - DAY_MS);
  const velocitySince = new Date(Date.now() - VELOCITY_WINDOW_MIN * 60 * 1000);

  // An address already tied to this session or IP carries forward, so a
  // returning visitor is not asked for their email a second time.
  const knownEmail =
    accountEmail ??
    submittedEmail ??
    (
      await prisma.previewUsage.findFirst({
        where: {
          createdAt: { gte: since },
          email: { not: null },
          OR: [{ sessionId }, { ip }],
        },
        orderBy: { createdAt: "desc" },
        select: { email: true },
      })
    )?.email ??
    null;

  const identity = [{ sessionId }, { ip }, ...(knownEmail ? [{ email: knownEmail }] : [])];

  // Record the attempt first so concurrent callers see each other.
  const usage = await prisma.previewUsage.create({
    data: { sessionId, ip, portraitId, email: knownEmail, status: "allowed" },
  });

  const refuse = async (
    code: GateRefusal,
    error: string,
    previewsUsed: number
  ): Promise<GateDecision> => {
    await prisma.previewUsage.update({
      where: { id: usage.id },
      data: { status: "blocked" },
    });
    return { allowed: false, code, error, previewsUsed };
  };

  // --- Layer 3 first: a flagged actor is stopped before anything else ---
  const recentAttempts = await prisma.previewUsage.count({
    where: { createdAt: { gte: velocitySince }, OR: identity },
  });

  if (recentAttempts >= VELOCITY_COUNT) {
    if (!captchaConfigured()) {
      // No keys provisioned yet. Refuse rather than wave it through — an
      // unconfigured captcha must not become an open faucet.
      return refuse(
        "rate_limited",
        "Too many requests from this connection. Please try again in a few minutes.",
        recentAttempts
      );
    }
    if (!captchaToken) {
      return refuse(
        "captcha_required",
        "Please confirm you're human to continue.",
        recentAttempts
      );
    }
    const ok = await verifyCaptcha(captchaToken, ip);
    if (!ok) {
      return refuse("captcha_failed", "That check didn't pass. Please try again.", recentAttempts);
    }
  }

  // Attempts this caller has actually been granted in the last 24h, including
  // the row just written for this one.
  const used = await prisma.previewUsage.count({
    where: { createdAt: { gte: since }, status: "allowed", OR: identity },
  });

  // --- Layer 2: the hard ceiling, applied to everyone including subscribers ---
  if (used > DAILY_CAP) {
    return refuse(
      "daily_limit",
      `You've reached the daily limit of ${DAILY_CAP} previews. It resets 24 hours after your first one today — or buy a portrait to keep going.`,
      used - 1
    );
  }

  // --- Layer 1: the email gate ---
  if (used > FREE_PREVIEWS && !knownEmail) {
    return refuse(
      "email_required",
      "Enter your email to keep creating previews.",
      used - 1
    );
  }

  return {
    allowed: true,
    usageId: usage.id,
    email: knownEmail,
    isFirstPreview: used <= FREE_PREVIEWS,
  };
}

/** True when this address has not been pushed to Mautic as a previewer yet. */
export async function isNewPreviewer(email: string): Promise<boolean> {
  const existing = await prisma.mauticCapture.findUnique({
    where: { dedupeKey: `preview:${email}` },
    select: { id: true },
  });
  return !existing;
}
