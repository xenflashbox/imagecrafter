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

/** Contact-field aliases provisioned on the shared Mautic instance for ImageCrafter. */
export type MauticCustomFields = {
  ic_source?: string;
  ic_purchase_type?: string;
  ic_subject_type?: string;
  ic_style?: string;
  ic_purchased_at?: string;
  signup_source?: string;
  signup_date?: string;
};

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

  const existing = await prisma.mauticCapture.findUnique({ where: { stripeSessionId } });
  if (existing?.status === "captured") return; // webhook replay

  const result = await pushContact({
    email,
    ...splitName(capture.name),
    tags: ["imagecrafter", "imagecrafter-buyer", `ic-${purchaseType}`,
      ...(subjectType ? [`ic-${subjectType}`] : [])],
    customFields: {
      ic_source: "purchase",
      ic_purchase_type: purchaseType,
      ...(subjectType ? { ic_subject_type: subjectType } : {}),
      ...(style ? { ic_style: style } : {}),
      ic_purchased_at: purchasedAt.toISOString(),
    },
  });

  const record = {
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
    where: { stripeSessionId },
    create: { stripeSessionId, ...record },
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

/** Splits a Stripe-collected full name into Mautic's first/last fields. */
export function splitName(full?: string | null): { firstname?: string; lastname?: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}
