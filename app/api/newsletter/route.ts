/**
 * POST /api/newsletter — Newsletter Subscription
 *
 * Accepts an email (and optional first name) and creates a contact in Mautic
 * tagged as a newsletter subscriber for ImageCrafter.
 *
 * Integration: Mautic REST API via internal cluster URL.
 * Public endpoint — no authentication required.
 *
 * Mautic docs: MAUTIC_BLOGCRAFT_INTEGRATION_API.md
 */

import { NextRequest, NextResponse } from "next/server";
import { getMauticApiUrl, requireEnv } from "@/lib/env";

const MAUTIC_USER = process.env.MAUTIC_USER || "admin";

/** Basic auth header for Mautic REST API */
function mauticAuthHeader(): string {
  const pass = requireEnv("MAUTIC_PASS");
  return "Basic " + Buffer.from(`${MAUTIC_USER}:${pass}`).toString("base64");
}

/** Push contact to Mautic with newsletter tag */
async function createMauticContact(params: {
  email: string;
  firstname?: string;
  source?: string;
}): Promise<{ success: boolean; contactId?: number; error?: string }> {
  const { email, firstname, source = "imagecrafter_blog" } = params;

  const mauticApiUrl = `${getMauticApiUrl()}/api/contacts/new`;

  const body = {
    email,
    ...(firstname ? { firstname } : {}),
    tags: ["newsletter", "imagecrafter", source],
    custom_fields: {
      signup_source: source,
      signup_date: new Date().toISOString(),
    },
  };

  const response = await fetch(mauticApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: mauticAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { success: false, error: `Mautic API error ${response.status}: ${text}` };
  }

  const data = await response.json() as { contact?: { id: number } };
  return { success: true, contactId: data.contact?.id };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const email = (body.email as string | undefined)?.trim().toLowerCase();
  const firstname = (body.firstname as string | undefined)?.trim();
  const source = (body.source as string | undefined) || "imagecrafter_blog";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "A valid email address is required" },
      { status: 400 }
    );
  }

  try {
    const result = await createMauticContact({ email, firstname, source });

    if (!result.success) {
      console.error("Newsletter: Mautic contact creation failed:", result.error);
      return NextResponse.json(
        { success: false, error: "Failed to subscribe. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You're subscribed! Check your inbox for a confirmation.",
      contactId: result.contactId,
    });
  } catch (err) {
    console.error("Newsletter: Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
