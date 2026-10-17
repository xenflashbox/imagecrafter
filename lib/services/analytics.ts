import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AnalyticsEventInput = {
  eventName: string;
  sessionId?: string | null;
  userId?: string | null;
  portraitId?: string | null;
  orderId?: string | null;
  stripeSessionId?: string | null;
  path?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  placement?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  ttp?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

const MAX_EVENT_NAME = 80;
const MAX_TEXT = 600;
const MAX_METADATA_BYTES = 6000;

function cleanText(value: string | null | undefined, max = MAX_TEXT): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanEventName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, MAX_EVENT_NAME);
}

function cleanMetadata(value: Record<string, unknown> | undefined): Prisma.InputJsonValue {
  if (!value) return {};
  const json = JSON.stringify(value);
  if (json.length <= MAX_METADATA_BYTES) return JSON.parse(json) as Prisma.InputJsonValue;
  return { truncated: true, originalBytes: json.length };
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "imagecrafter-analytics";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function clientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

export function attributionFromRequest(request: NextRequest) {
  const url = new URL(request.url);
  const cookie = request.cookies;
  const fbclid = url.searchParams.get("fbclid");
  const ttclid = url.searchParams.get("ttclid") || cookie.get("ttclid")?.value || null;

  return {
    path: `${url.pathname}${url.search}`,
    referrer: request.headers.get("referer"),
    utmSource: url.searchParams.get("utm_source") || cookie.get("utm_source")?.value || null,
    utmMedium: url.searchParams.get("utm_medium") || cookie.get("utm_medium")?.value || null,
    utmCampaign: url.searchParams.get("utm_campaign") || cookie.get("utm_campaign")?.value || null,
    utmTerm: url.searchParams.get("utm_term") || cookie.get("utm_term")?.value || null,
    utmContent: url.searchParams.get("utm_content") || cookie.get("utm_content")?.value || null,
    placement: url.searchParams.get("placement") || cookie.get("placement")?.value || null,
    gclid: url.searchParams.get("gclid") || cookie.get("gclid")?.value || null,
    fbclid: fbclid || cookie.get("fbclid")?.value || null,
    ttclid,
    fbc: cookie.get("_fbc")?.value || null,
    fbp: cookie.get("_fbp")?.value || null,
    ttp: cookie.get("_ttp")?.value || null,
  };
}

export async function logAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  const eventName = cleanEventName(input.eventName);
  if (!eventName) return;

  try {
    await prisma.analyticsEvent.create({
      data: {
        eventName,
        sessionId: cleanText(input.sessionId, 120),
        userId: cleanText(input.userId, 160),
        portraitId: cleanText(input.portraitId, 80),
        orderId: cleanText(input.orderId, 80),
        stripeSessionId: cleanText(input.stripeSessionId, 255),
        path: cleanText(input.path, 1000),
        referrer: cleanText(input.referrer, 1000),
        utmSource: cleanText(input.utmSource, 255),
        utmMedium: cleanText(input.utmMedium, 255),
        utmCampaign: cleanText(input.utmCampaign, 255),
        utmTerm: cleanText(input.utmTerm, 255),
        utmContent: cleanText(input.utmContent, 255),
        placement: cleanText(input.placement, 255),
        gclid: cleanText(input.gclid, 255),
        fbclid: cleanText(input.fbclid, 255),
        ttclid: cleanText(input.ttclid, 255),
        fbc: cleanText(input.fbc, 255),
        fbp: cleanText(input.fbp, 255),
        ttp: cleanText(input.ttp, 255),
        metadata: cleanMetadata(input.metadata),
        ipHash: hashIp(input.ip),
        userAgent: cleanText(input.userAgent, 1000),
      },
    });
  } catch (error) {
    console.error("[analytics] event write failed:", error);
  }
}

export async function logStripeEvent(input: {
  stripeEventId: string;
  eventType: string;
  orderId?: string | null;
  portraitId?: string | null;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  summary?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.stripeEvent.upsert({
      where: { stripeEventId: input.stripeEventId },
      update: {},
      create: {
        stripeEventId: input.stripeEventId,
        eventType: input.eventType,
        orderId: cleanText(input.orderId, 80),
        portraitId: cleanText(input.portraitId, 80),
        stripeSessionId: cleanText(input.stripeSessionId, 255),
        paymentIntentId: cleanText(input.paymentIntentId, 255),
        status: cleanText(input.status, 120),
        amount: input.amount ?? null,
        currency: cleanText(input.currency, 20),
        summary: cleanMetadata(input.summary),
      },
    });
  } catch (error) {
    console.error("[analytics] stripe event write failed:", error);
  }
}
