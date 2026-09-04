/**
 * GET /api/pricing
 *
 * Stripe-sourced amounts for client components, which cannot import the
 * pricing service (it pulls the Stripe SDK into the bundle).
 */

import { NextResponse } from "next/server";
import {
  getPackCatalog,
  getPrice,
  DIGITAL_SKU,
  PriceUnavailableError,
} from "@/lib/services/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [digital, packs] = await Promise.all([getPrice(DIGITAL_SKU), getPackCatalog()]);
    return NextResponse.json({
      success: true,
      digital: { sku: digital.sku, unitAmount: digital.unitAmount, name: digital.name },
      packs: packs.map((p) => ({
        sku: p.sku,
        unitAmount: p.unitAmount,
        name: p.name,
        credits: p.credits,
      })),
    });
  } catch (err) {
    if (err instanceof PriceUnavailableError) {
      console.error(`[pricing] ${err.message}`);
      return NextResponse.json(
        { success: false, error: "Pricing isn't available right now." },
        { status: 503 }
      );
    }
    throw err;
  }
}
