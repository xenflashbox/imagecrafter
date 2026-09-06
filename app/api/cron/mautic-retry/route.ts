import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mauticPurchaseType,
  mauticSubject,
  pushContact,
  splitName,
} from "@/lib/services/mautic";

/**
 * Drains MauticCapture rows the webhook could not push.
 *
 * The webhook records a failure instead of throwing so a Mautic outage can
 * never unwind a paid checkout. This is the other half of that contract: the
 * recorded failures have to actually get retried.
 *
 * GET /api/cron/mautic-retry
 * Authorization: Bearer <CRON_SECRET>
 */

const MAX_ATTEMPTS = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.mauticCapture.findMany({
    where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let captured = 0;
  let stillFailing = 0;

  for (const row of pending) {
    const isPreviewer = row.stage === "previewer";
    const subject = mauticSubject(row.subjectType);

    // Rebuild the original push from the row. Stage decides the shape: a
    // previewer has no purchase type and belongs in the win-back drip, not the
    // buyer segment.
    const result = await pushContact({
      email: row.email,
      ...splitName(row.name),
      tags: [
        "imagecrafter",
        isPreviewer ? "imagecrafter-previewer" : "imagecrafter-buyer",
        ...(!isPreviewer && row.purchaseType ? [`ic-${row.purchaseType}`] : []),
        ...(row.subjectType ? [`ic-${row.subjectType}`] : []),
      ],
      customFields: {
        ic_stage: isPreviewer ? "previewer" : "buyer",
        ic_source: isPreviewer ? "preview" : "purchase",
        ...(!isPreviewer && row.purchaseType
          ? { ic_purchase_type: mauticPurchaseType(row.purchaseType) }
          : {}),
        ...(subject ? { ic_subject: subject } : {}),
        ...(row.style ? { ic_style: row.style } : {}),
        ...(isPreviewer && row.previewUrl ? { ic_preview_url: row.previewUrl } : {}),
        ...(isPreviewer ? {} : { ic_purchased_at: row.createdAt.toISOString() }),
      },
    });

    await prisma.mauticCapture.update({
      where: { id: row.id },
      data: {
        attempts: row.attempts + 1,
        status: result.success ? "captured" : "failed",
        contactId: result.success ? result.contactId ?? null : null,
        lastError: result.success ? null : result.error.slice(0, 1000),
      },
    });

    if (result.success) {
      captured++;
      console.log(
        `[mautic-retry] Recovered ${row.stage} ${row.email} (${row.dedupeKey}) as contact ${result.contactId}`
      );
    } else {
      stillFailing++;
      console.error(
        `[mautic-retry] Still failing for ${row.email} (attempt ${row.attempts + 1}): ${result.error}`
      );
    }
  }

  const exhausted = await prisma.mauticCapture.count({
    where: { status: "failed", attempts: { gte: MAX_ATTEMPTS } },
  });
  if (exhausted > 0) {
    console.error(
      `[mautic-retry] ${exhausted} capture(s) exhausted ${MAX_ATTEMPTS} attempts and need manual attention`
    );
  }

  return NextResponse.json({
    success: true,
    processed: pending.length,
    captured,
    stillFailing,
    exhausted,
  });
}
