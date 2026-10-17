"use client";

type Attribution = Record<string, string | null>;

const STORAGE_KEY = "ic_attribution";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "placement",
  "gclid",
  "fbclid",
  "ttclid",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function readStoredAttribution(): (Attribution & { timestamp?: string }) | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution & { timestamp?: string };
    if (!parsed.timestamp) return null;
    if (Date.now() - new Date(parsed.timestamp).getTime() > ATTRIBUTION_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeAttributionCookies(attribution: Attribution) {
  const maxAge = Math.floor(ATTRIBUTION_TTL_MS / 1000);
  for (const key of ATTRIBUTION_PARAMS) {
    const value = attribution[key];
    if (!value) continue;
    document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
  }
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const existing = readStoredAttribution();
  if (existing) return existing;

  const url = new URL(window.location.href);
  const attribution: Attribution & { timestamp: string; landing_page: string; referrer?: string } = {
    timestamp: nowIso(),
    landing_page: `${url.pathname}${url.search}`,
  };

  for (const key of ATTRIBUTION_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) attribution[key] = value;
  }

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.hostname !== window.location.hostname) attribution.referrer = document.referrer;
    } catch {
      attribution.referrer = document.referrer;
    }
  }

  const hasSignal = ATTRIBUTION_PARAMS.some((key) => attribution[key]) || attribution.referrer;
  if (hasSignal) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      writeAttributionCookies(attribution);
    } catch {
      // Analytics must never block the product.
    }
  }

  return hasSignal ? attribution : {};
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  return readStoredAttribution() || captureAttribution();
}

export function trackEvent(
  eventName: string,
  input: {
    portraitId?: string | null;
    orderId?: string | null;
    stripeSessionId?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  if (typeof window === "undefined") return;

  const body = {
    eventName,
    portraitId: input.portraitId || null,
    orderId: input.orderId || null,
    stripeSessionId: input.stripeSessionId || null,
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    attribution: getAttribution(),
    metadata: input.metadata || {},
  };

  const payload = JSON.stringify(body);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/events", new Blob([payload], { type: "application/json" }));
    return;
  }

  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Analytics must never break a customer action.
  });
}
