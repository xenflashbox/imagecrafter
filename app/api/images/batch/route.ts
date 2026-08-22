/**
 * POST /api/images/batch
 *
 * INTERIM STATE — 503, no credits touched.
 *
 * The previous implementation reserved credits into a BatchJob row and then
 * never processed it (processBatchJob() was an empty stub), permanently
 * stranding user credits. That stub has been removed.
 *
 * Whether batch ships at all is FOUNDER CONFIRMATION #1 (PLAN/01-plan.md
 * Amendment A2): either wire the image-gen service's real batch endpoint
 * (POST /api/v1/generate/batch, ≤10 items, per-item settings) or drop batch
 * for v1 and remove the UI affordance. Until that decision lands, this
 * endpoint answers honestly that batch is unavailable and reserves NOTHING.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Batch generation is temporarily unavailable. No credits were used.",
    },
    { status: 503, headers: { "Retry-After": "86400" } }
  );
}
