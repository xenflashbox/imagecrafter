import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  attributionFromRequest,
  clientIp,
  logAnalyticsEvent,
} from "@/lib/services/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "upload_started",
  "upload_completed",
  "upload_failed",
  "style_selected",
  "generation_started",
  "generation_succeeded",
  "generation_failed",
  "preview_viewed",
  "share_link_created",
  "share_button_clicked",
  "share_page_viewed",
  "share_cta_clicked",
  "checkout_started",
  "checkout_returned",
  "landing_cta_clicked",
  "gallery_shared",
  "gallery_load_more",
  "social_outbound_clicked",
]);

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    userId = null;
  }

  let body: {
    eventName?: string;
    portraitId?: string | null;
    orderId?: string | null;
    stripeSessionId?: string | null;
    path?: string | null;
    referrer?: string | null;
    attribution?: Record<string, string | null | undefined>;
    metadata?: Record<string, unknown>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = body.eventName || "";
  if (!ALLOWED_EVENTS.has(eventName)) {
    return NextResponse.json({ success: false, error: "Unsupported event" }, { status: 400 });
  }

  const serverAttribution = attributionFromRequest(request);
  const clientAttribution = body.attribution || {};

  await logAnalyticsEvent({
    eventName,
    sessionId: request.cookies.get("portrait_session_id")?.value || null,
    userId,
    portraitId: body.portraitId,
    orderId: body.orderId,
    stripeSessionId: body.stripeSessionId,
    path: body.path || serverAttribution.path,
    referrer: body.referrer || serverAttribution.referrer,
    utmSource: clientAttribution.utm_source || serverAttribution.utmSource,
    utmMedium: clientAttribution.utm_medium || serverAttribution.utmMedium,
    utmCampaign: clientAttribution.utm_campaign || serverAttribution.utmCampaign,
    utmTerm: clientAttribution.utm_term || serverAttribution.utmTerm,
    utmContent: clientAttribution.utm_content || serverAttribution.utmContent,
    placement: clientAttribution.placement || serverAttribution.placement,
    gclid: clientAttribution.gclid || serverAttribution.gclid,
    fbclid: clientAttribution.fbclid || serverAttribution.fbclid,
    ttclid: clientAttribution.ttclid || serverAttribution.ttclid,
    fbc: serverAttribution.fbc,
    fbp: serverAttribution.fbp,
    ttp: serverAttribution.ttp,
    metadata: body.metadata,
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
