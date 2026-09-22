import type { MauticCapture, PrismaClient } from "@prisma/client";
import type { pushContact } from "./mautic";
import { hashReturnToken } from "./portrait-return-token";

export const normalizeCaptureEmail = (email: string) => email.trim().toLowerCase();

export function capturePayload(row: MauticCapture): Parameters<typeof pushContact>[0] {
  const preview = row.stage === "previewer";
  const names = (row.name || "").trim().split(/\s+/).filter(Boolean);
  return {
    email: normalizeCaptureEmail(row.email),
    ...(names.length ? { firstname: names[0], ...(names.length > 1 ? { lastname: names.slice(1).join(" ") } : {}) } : {}),
    tags: ["imagecrafter", preview ? "imagecrafter-previewer" : "imagecrafter-buyer",
      ...(!preview && row.purchaseType ? [`ic-${row.purchaseType}`] : []),
      ...(row.subjectType ? [`ic-${row.subjectType}`] : [])],
    customFields: {
      ic_stage: preview ? "previewer" : "buyer",
      ic_source: preview ? "preview" : "purchase",
      ...(!preview && row.purchaseType ? { ic_purchase_type: row.purchaseType === "digital" ? "single" : row.purchaseType } : {}),
      ...(row.subjectType ? { ic_subject: row.subjectType === "pet" ? "pet" : "person" } : {}),
      ...(row.style ? { ic_style: row.style } : {}),
      ...(preview && row.previewUrl ? { ic_preview_url: row.previewUrl } : {}),
      ...(preview && row.returnUrl ? { ic_return_url: row.returnUrl } : {}),
      ic_captured_at: row.createdAt.toISOString(),
      ...(!preview ? { ic_purchased_at: row.createdAt.toISOString() } : {}),
    },
  };
}

/** All IC stage writers, including cron, serialize on the same normalized address. */
export async function deliverMauticCapture(
  db: Pick<PrismaClient, "mauticCapture" | "$transaction">,
  push: typeof pushContact,
  id: string,
): Promise<"captured" | "failed" | "superseded" | "skipped"> {
  const initial = await db.mauticCapture.findUnique({ where: { id } });
  if (!initial) return "skipped";
  const email = normalizeCaptureEmail(initial.email);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`;
    const row = await tx.mauticCapture.findUnique({ where: { id } });
    if (!row || row.status !== "failed") return "skipped";

    // Failed buyer delivery still proves a purchase. Never demote while it retries.
    const buyer = await tx.mauticCapture.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, stage: "buyer" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (buyer && buyer.id !== row.id) {
      await tx.mauticCapture.update({ where: { id }, data: {
        status: "superseded", lastError: null,
      } });
      return "superseded";
    }

    const consent = await tx.marketingConsent.findUnique({ where: { email } });
    const payload = capturePayload(row);
    if (row.returnUrl) {
      const token = new URLSearchParams(new URL(row.returnUrl).hash.slice(1)).get("token");
      const access = token ? await tx.portraitReturn.findUnique({ where: { tokenHash: hashReturnToken(token) } }) : null;
      payload.customFields = { ...payload.customFields,
        ic_return_url: access?.verifiedAt && !access.revokedAt && access.expiresAt > new Date() ? row.returnUrl : "",
        ...(access ? { ic_return_expires_at: access.expiresAt.toISOString() } : {}),
      };
    }
    payload.customFields = { ...payload.customFields, ic_marketing_ok: consent?.granted === true,
      ...(consent ? { ic_consent_at: consent.confirmedAt.toISOString() } : {}),
    };
    const result = await push(payload);
    const updated = await tx.mauticCapture.updateMany({ where: { id, updatedAt: row.updatedAt }, data: {
      attempts: { increment: 1 },
      status: result.success ? "captured" : "failed",
      contactId: result.success ? result.contactId ?? null : row.contactId,
      lastError: result.success ? null : result.error.slice(0, 1000),
    } });
    // A finished generation can enrich this row while an earlier push is in flight.
    // Leave that newer payload pending instead of claiming it was delivered.
    return updated.count && result.success ? "captured" : "failed";
  }, { maxWait: 5000, timeout: 25000 });
}
