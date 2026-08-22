/**
 * TikTok Events API (server-side) — v1.3 event/track
 *
 * Complements the client pixel (app/layout.tsx) with server events that
 * survive ad blockers and browser loss (e.g. Stripe webhook purchases).
 *
 * Config (both required, else events are skipped with a logged warning):
 *   NEXT_PUBLIC_TIKTOK_PIXEL_ID — pixel/event source ID (shared with client)
 *   TIKTOK_EVENTS_API_TOKEN     — Events API access token (vault + Vercel only)
 *
 * PII (email, external_id) is SHA-256 hashed before sending, per TikTok spec.
 * Failures are logged loudly but never thrown — analytics must not break
 * registration or checkout.
 */

import { createHash } from "node:crypto";

const ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

export type TikTokEventName =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "PlaceAnOrder"
  | "ViewContent";

export interface TikTokEventInput {
  event: TikTokEventName;
  /** Stable per-action ID — used by TikTok to dedupe pixel vs server events and webhook retries. */
  eventId: string;
  url?: string;
  email?: string | null;
  /** Internal user ID (hashed before sending). */
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** TikTok click ID (ttclid URL param / cookie). */
  ttclid?: string | null;
  /** TikTok browser ID (_ttp cookie). */
  ttp?: string | null;
  value?: number;
  currency?: string;
  contentId?: string;
  contentName?: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function trackTikTokEvent(
  input: TikTokEventInput
): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_API_TOKEN;

  if (!pixelId || !token) {
    console.warn(
      `[tiktok-events] Skipping ${input.event} — TikTok Events API not configured (pixel/token missing)`
    );
    return { success: false, error: "not configured" };
  }

  const user: Record<string, string> = {};
  if (input.email) user.email = sha256(input.email);
  if (input.externalId) user.external_id = sha256(input.externalId);
  if (input.ip) user.ip = input.ip;
  if (input.userAgent) user.user_agent = input.userAgent;
  if (input.ttclid) user.ttclid = input.ttclid;
  if (input.ttp) user.ttp = input.ttp;

  const properties: Record<string, string | number> = {};
  if (input.value !== undefined) {
    properties.value = input.value;
    properties.currency = input.currency || "USD";
  }
  if (input.contentId) {
    properties.content_id = input.contentId;
    properties.content_type = "product";
  }
  if (input.contentName) properties.content_name = input.contentName;

  const body = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        user,
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
        ...(input.url ? { page: { url: input.url } } : {}),
      },
    ],
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { code?: number; message?: string };
    if (!res.ok || json.code !== 0) {
      console.error(
        `[tiktok-events] ${input.event} rejected: HTTP ${res.status} code=${json.code} ${json.message}`
      );
      return { success: false, error: json.message || `HTTP ${res.status}` };
    }
    console.log(`[tiktok-events] ${input.event} sent (event_id=${input.eventId})`);
    return { success: true };
  } catch (err) {
    console.error(`[tiktok-events] ${input.event} failed:`, err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
