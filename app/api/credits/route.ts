/**
 * GET /api/credits — current pack-credit balance for the signed-in user.
 * Guests get { balance: 0, signedIn: false } (packs require an account).
 *
 * `?history=1` also returns the ledger rows behind that balance, so the
 * dashboard can show what was bought and what it was spent on.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCreditBalance } from "@/lib/services/credits";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: true, signedIn: false, balance: 0 });
  }
  const balance = await getCreditBalance(userId);

  if (new URL(request.url).searchParams.get("history") !== "1") {
    return NextResponse.json({ success: true, signedIn: true, balance });
  }

  const history = await prisma.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      delta: true,
      reason: true,
      packSku: true,
      portraitId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, signedIn: true, balance, history });
}
