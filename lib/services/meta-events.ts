/**
 * Meta Conversions API (server-side) — Graph API /{pixel}/events
 *
 * Complements the client pixel (app/layout.tsx) with server events that
 * survive ad blockers and browser loss (e.g. Stripe webhook purchases).
 *
 * Config (both required, else events are skipped with a logged warning):
 *   NEXT_PUBLIC_META_PIXEL_ID — pixel/dataset ID (shared with client)
 *   META_CAPI_ACCESS_TOKEN    — Conversions API access token (vault + Vercel only)
 *
 * PII (email, external_id) is SHA-256 hashed before sending, per Meta spec.
 * event_id + event_name drive dedup against the browser pixel.
 * Failures are logged loudly but never thrown — analytics must not break
 * registration or checkout.
 */

import { createHash } from "node:crypto";
import { logAnalyticsEvent } from "@/lib/services/analytics";

const API_VERSION = "v23.0";

export type MetaEventName =
  | "CompleteRegistration"
  | "CustomizeProduct"
  | "InitiateCheckout"
  | "Purchase"
  | "Share"
  | "ViewContent";

export interface MetaEventInput {
  event: MetaEventName;
  /** Stable per-action ID — Meta dedupes pixel vs server events on (event_id, event_name). */
  eventId: string;
  url?: string;
  email?: string | null;
  /** Internal user ID (hashed before sending). */
  externalId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Meta click ID cookie (_fbc) or one built from the fbclid URL param. */
  fbc?: string | null;
  /** Meta browser ID cookie (_fbp). */
  fbp?: string | null;
  value?: number;
  currency?: string;
  contentId?: string;
  contentName?: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function recordDelivery(
  status: "accepted" | "rejected" | "failed" | "skipped",
  input: MetaEventInput,
  detail?: { httpStatus?: number; error?: string }
) {
  await logAnalyticsEvent({
    eventName: `meta_capi_${status}`,
    portraitId: input.contentId?.length === 32 ? input.contentId : null,
    metadata: {
      metaEventName: input.event,
      httpStatus: detail?.httpStatus ?? null,
      error: detail?.error?.slice(0, 500) ?? null,
      hasFbc: Boolean(input.fbc),
      hasFbp: Boolean(input.fbp),
      hasEmail: Boolean(input.email),
    },
  });
}

/** Build a _fbc-format value from an fbclid URL param when the cookie is absent. */
export function fbcFromFbclid(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

export async function trackMetaEvent(
  input: MetaEventInput
): Promise<{ success: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !token) {
    console.warn(
      `[meta-events] Skipping ${input.event} — Meta Conversions API not configured (pixel/token missing)`
    );
    await recordDelivery("skipped", input, { error: "pixel/token missing" });
    return { success: false, error: "not configured" };
  }

  const userData: Record<string, string | string[]> = {};
  if (input.email) userData.em = [sha256(input.email)];
  if (input.externalId) userData.external_id = [sha256(input.externalId)];
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;

  const customData: Record<string, string | number | string[]> = {};
  if (input.value !== undefined) {
    customData.value = input.value;
    customData.currency = input.currency || "USD";
  }
  if (input.contentId) {
    customData.content_ids = [input.contentId];
    customData.content_type = "product";
  }
  if (input.contentName) customData.content_name = input.contentName;

  const body = {
    data: [
      {
        event_name: input.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        ...(input.url ? { event_source_url: input.url } : {}),
        user_data: userData,
        ...(Object.keys(customData).length > 0 ? { custom_data: customData } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const json = (await res.json()) as {
      events_received?: number;
      error?: { message?: string };
    };
    if (!res.ok || !json.events_received) {
      console.error(
        `[meta-events] ${input.event} rejected: HTTP ${res.status} ${json.error?.message || ""}`
      );
      await recordDelivery("rejected", input, {
        httpStatus: res.status,
        error: json.error?.message || `HTTP ${res.status}`,
      });
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    console.log(`[meta-events] ${input.event} sent (event_id=${input.eventId})`);
    await recordDelivery("accepted", input, { httpStatus: res.status });
    return { success: true };
  } catch (err) {
    console.error(`[meta-events] ${input.event} failed:`, err);
    const error = err instanceof Error ? err.message : String(err);
    await recordDelivery("failed", input, { error });
    return { success: false, error };
  }
}
