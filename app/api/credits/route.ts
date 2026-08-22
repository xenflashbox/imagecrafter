/**
 * GET /api/credits — current pack-credit balance for the signed-in user.
 * Guests get { balance: 0, signedIn: false } (packs require an account).
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCreditBalance } from "@/lib/services/credits";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: true, signedIn: false, balance: 0 });
  }
  const balance = await getCreditBalance(userId);
  return NextResponse.json({ success: true, signedIn: true, balance });
}
