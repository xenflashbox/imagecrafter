import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushContact } from "@/lib/services/mautic";
import { deliverMauticCapture } from "@/lib/services/mautic-delivery";

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
  let superseded = 0;
  let skipped = 0;

  for (const row of pending) {
    try {
      const status = await deliverMauticCapture(prisma, pushContact, row.id);
      if (status === "captured") captured++;
      else if (status === "superseded") superseded++;
      else if (status === "skipped") skipped++;
      else stillFailing++;
    } catch (error) {
      stillFailing++;
      console.error(`[mautic-retry] Capture ${row.id} remains pending`, error);
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
    superseded,
    skipped,
    exhausted,
  });
}
