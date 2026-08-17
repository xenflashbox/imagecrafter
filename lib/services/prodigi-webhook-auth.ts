import { timingSafeEqual } from "node:crypto";

const WEBHOOK_SECRET = process.env.PRODIGI_WEBHOOK_SECRET || "";

/**
 * Verify a Prodigi webhook request by checking the secret query param.
 *
 * Fails CLOSED when no secret is configured: this endpoint mutates order
 * status and sends customers shipping emails, so an unset secret must not
 * leave it open to anyone who knows the URL.
 *
 * Lives outside print-fulfillment.ts because that module is imported by a
 * client component, and node: builtins cannot be bundled for the browser.
 */
export function verifyProdigiWebhook(requestSecret: string | null): boolean {
  if (!WEBHOOK_SECRET) {
    console.error(
      "[prodigi] PRODIGI_WEBHOOK_SECRET is not configured — rejecting webhook (fail-closed)"
    );
    return false;
  }
  if (!requestSecret) return false;

  const provided = Buffer.from(requestSecret);
  const expected = Buffer.from(WEBHOOK_SECRET);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}
