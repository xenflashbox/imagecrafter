/**
 * Mautic contact API.
 *
 * Two consumers: the public newsletter form and the Stripe webhook's buyer
 * capture. The webhook path must never fail a paid checkout, so pushContact
 * resolves a result object instead of throwing — the caller records the
 * failure and moves on.
 */

import { getMauticApiUrl, requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const MAUTIC_USER = process.env.MAUTIC_USER || "admin";

/**
 * Contact-field aliases provisioned on the shared Mautic instance, read off the
 * instance itself (ids 85-89, 95-97) rather than transcribed.
 *
 * ic_subject_type (87) is deliberately absent. It is labelled LEGACY on the
 * instance and no segment reads it — ic_subject (96) replaced it. A name that
 * does not match a provisioned alias is discarded by Mautic on a 201, so an
 * emit-side typo looks exactly like success.
 */
export type MauticCustomFields = {
  ic_stage?: string;
  ic_source?: string;
  ic_purchase_type?: string;
  ic_subject?: string;
  ic_style?: string;
  ic_preview_url?: string;
  ic_purchased_at?: string;
  signup_source?: string;
  signup_date?: string;
};

/**
 * Our domain calls a one-off portrait "digital"; the segments (43/44) key on
 * "single". Mautic's vocabulary is the contract, so translate at the boundary
 * and keep the domain word in our own tables.
 */
export function mauticPurchaseType(type: string): string {
  return type === "digital" ? "single" : type;
}

/**
 * Segments 41-44 split on pet vs person only. A couple, a family or a group is
 * a person subject for drip purposes — without this they would match no segment
 * at all and silently receive nothing.
 */
export function mauticSubject(subjectType?: string | null): string | undefined {
  if (!subjectType) return undefined;
  return subjectType === "pet" ? "pet" : "person";
}

export type MauticPushResult =
  | { success: true; contactId?: number }
  | { success: false; error: string };

function mauticAuthHeader(): string {
  const pass = requireEnv("MAUTIC_PASS");
  return "Basic " + Buffer.from(`${MAUTIC_USER}:${pass}`).toString("base64");
}

/**
 * Create or update a Mautic contact. Mautic upserts on email, so replaying the
 * same buyer is safe.
 */
export async function pushContact(params: {
  email: string;
  firstname?: string;
  lastname?: string;
  tags: string[];
  customFields?: MauticCustomFields;
}): Promise<MauticPushResult> {
  const { email, firstname, lastname, tags, customFields } = params;

  try {
    const response = await fetch(`${getMauticApiUrl()}/api/contacts/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: mauticAuthHeader(),
      },
      body: JSON.stringify({
        email,
        ...(firstname ? { firstname } : {}),
        ...(lastname ? { lastname } : {}),
        tags,
        // Field aliases go at the top level. Mautic accepts a nested
        // "custom_fields" object without complaining and then discards it.
        ...customFields,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: `Mautic API error ${response.status}: ${text.slice(0, 500)}`,
      };
    }

    const data = (await response.json()) as { contact?: { id: number } };
    return { success: true, contactId: data.contact?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    };
  }
}

export type BuyerCapture = {
  stripeSessionId: string;
  email: string;
  name?: string | null;
  purchaseType: "digital" | "print" | "pack";
  subjectType?: string | null;
  style?: string | null;
  orderId?: string | null;
  purchasedAt?: Date;
};

/**
 * Push a completed-checkout buyer into the imagecrafter-buyers segment and
 * record the outcome.
 *
 * Never throws: the customer has already paid, so a Mautic outage must not
 * unwind the webhook. A failure is written as status="failed" with the error,
 * which /api/cron/mautic-retry picks up — recorded, not swallowed.
 */
export async function captureBuyer(capture: BuyerCapture): Promise<void> {
  const { stripeSessionId, email, purchaseType, subjectType, style, orderId } = capture;
  const purchasedAt = capture.purchasedAt ?? new Date();
  const dedupeKey = `stripe:${stripeSessionId}`;

  const existing = await prisma.mauticCapture.findUnique({ where: { dedupeKey } });
  if (existing?.status === "captured") return; // webhook replay

  // Mautic upserts on email, so a previewer who buys is the same contact with
  // ic_stage rewritten to "buyer" — the win-back segment drops them, the buyer
  // segment picks them up. No second contact is created.
  const subject = mauticSubject(subjectType);
  const result = await pushContact({
    email,
    ...splitName(capture.name),
    tags: ["imagecrafter", "imagecrafter-buyer", `ic-${purchaseType}`,
      ...(subjectType ? [`ic-${subjectType}`] : [])],
    customFields: {
      ic_stage: "buyer",
      ic_source: "purchase",
      ic_purchase_type: mauticPurchaseType(purchaseType),
      ...(subject ? { ic_subject: subject } : {}),
      ...(style ? { ic_style: style } : {}),
      ic_purchased_at: purchasedAt.toISOString(),
    },
  });

  const record = {
    stage: "buyer",
    email,
    name: capture.name || null,
    purchaseType,
    subjectType: subjectType || null,
    style: style || null,
    orderId: orderId || null,
    attempts: (existing?.attempts ?? 0) + 1,
    status: result.success ? "captured" : "failed",
    contactId: result.success ? result.contactId ?? null : null,
    lastError: result.success ? null : result.error.slice(0, 1000),
  };

  await prisma.mauticCapture.upsert({
    where: { dedupeKey },
    create: { dedupeKey, ...record },
    update: record,
  });

  if (result.success) {
    console.log(
      `[mautic] Captured buyer ${email} (${purchaseType}) as contact ${result.contactId} for session ${stripeSessionId}`
    );
  } else {
    console.error(
      `[mautic] Buyer capture FAILED for ${email} (session ${stripeSessionId}) — recorded for retry: ${result.error}`
    );
  }
}

export type PreviewerCapture = {
  email: string;
  subjectType?: string | null;
  style?: string | null;
  previewUrl?: string | null;
};

/**
 * Push a previewer — the email captured at preview #2 — into the win-back drip.
 *
 * Same contract as the buyer capture: never throws, because a Mautic outage must
 * not cost the visitor the preview they just asked for. Failures are written as
 * status="failed" for /api/cron/mautic-retry to drain.
 *
 * Keyed on the address, so repeat previews from the same person re-push (style
 * and preview URL move forward) without ever creating a second capture row.
 */
export async function capturePreviewer(capture: PreviewerCapture): Promise<void> {
  const { email, subjectType, style, previewUrl } = capture;
  const dedupeKey = `preview:${email}`;

  const existing = await prisma.mauticCapture.findUnique({ where: { dedupeKey } });

  // Once they have bought, do not demote them back to previewer.
  if (existing?.stage === "buyer") return;

  const subject = mauticSubject(subjectType);
  const result = await pushContact({
    email,
    tags: ["imagecrafter", "imagecrafter-previewer",
      ...(subjectType ? [`ic-${subjectType}`] : [])],
    customFields: {
      ic_stage: "previewer",
      ic_source: "preview",
      ...(subject ? { ic_subject: subject } : {}),
      ...(style ? { ic_style: style } : {}),
      ...(previewUrl ? { ic_preview_url: previewUrl } : {}),
    },
  });

  const record = {
    stage: "previewer",
    email,
    purchaseType: null,
    subjectType: subjectType || null,
    style: style || null,
    previewUrl: previewUrl || null,
    attempts: (existing?.attempts ?? 0) + 1,
    status: result.success ? "captured" : "failed",
    contactId: result.success ? result.contactId ?? null : null,
    lastError: result.success ? null : result.error.slice(0, 1000),
  };

  await prisma.mauticCapture.upsert({
    where: { dedupeKey },
    create: { dedupeKey, ...record },
    update: record,
  });

  if (result.success) {
    console.log(`[mautic] Captured previewer ${email} as contact ${result.contactId}`);
  } else {
    console.error(
      `[mautic] Previewer capture FAILED for ${email} — recorded for retry: ${result.error}`
    );
  }
}

/** Splits a Stripe-collected full name into Mautic's first/last fields. */
export function splitName(full?: string | null): { firstname?: string; lastname?: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}
