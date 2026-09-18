/**
 * Secure Download Token Service
 *
 * Generates and validates HMAC-signed tokens for portrait digital downloads.
 * No JWT library needed — uses Node.js built-in crypto.
 *
 * Token format (URL-safe base64):
 *   {orderId}.{expiresAt}.{hmac}
 *
 * The HMAC is signed with STRIPE_WEBHOOK_SECRET (already set in production)
 * so tokens cannot be forged without the secret.
 */

import { createHmac, timingSafeEqual } from "crypto";

const SECRET =
  process.env.DOWNLOAD_TOKEN_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  "fallback-dev-secret";

const EXPIRY_HOURS = parseInt(process.env.PORTRAIT_DOWNLOAD_EXPIRY_HOURS || "72");

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

/** Generate a signed download token for an order */
export function generateDownloadToken(orderId: string): string {
  const expiresAt = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
  const payload = `${orderId}.${expiresAt}`;
  const hmac = sign(payload);
  const raw = `${payload}.${hmac}`;
  return Buffer.from(raw).toString("base64url");
}

export interface TokenValidationResult {
  valid: boolean;
  orderId?: string;
  error?: "expired" | "invalid" | "malformed";
}

/** Validate and decode a download token */
export function validateDownloadToken(token: string): TokenValidationResult {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 3) return { valid: false, error: "malformed" };

    const [orderId, expiresAtStr, providedHmac] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt)) return { valid: false, error: "malformed" };

    // Check expiry
    if (Date.now() > expiresAt) return { valid: false, error: "expired" };

    // Verify HMAC
    const expectedHmac = sign(`${orderId}.${expiresAtStr}`);
    if (!safeEqual(providedHmac, expectedHmac)) {
      return { valid: false, error: "invalid" };
    }

    return { valid: true, orderId };
  } catch {
    return { valid: false, error: "malformed" };
  }
}

/**
 * Direct download URL. Fetching it consumes one of the order's downloads, so
 * it is only safe behind a control the customer physically clicks in our own UI.
 */
export function buildDownloadUrl(orderId: string, baseUrl: string): string {
  const token = generateDownloadToken(orderId);
  return `${baseUrl}/api/orders/download?token=${token}&confirm=1`;
}

/**
 * Landing page for the same token — use this in email. Brevo rewrites every
 * link through its click tracker, and mail scanners, chat unfurls and browser
 * prefetch all GET the rewritten URL; each would otherwise burn a download
 * before the customer had opened the message.
 */
export function buildDownloadPageUrl(orderId: string, baseUrl: string): string {
  const token = generateDownloadToken(orderId);
  return `${baseUrl}/download?token=${token}`;
}
