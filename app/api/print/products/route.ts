/**
 * GET /api/print/products
 *
 * Returns the complete print product catalog with pricing, sizes,
 * frame/wrap options, and Prodigi SKU mapping.
 *
 * PUBLIC — no authentication required.
 * The catalog itself is static; the amounts come from Stripe, so the client
 * pages that render prices read them from here rather than holding literals.
 */

import { NextRequest, NextResponse } from "next/server";
import { PRINT_CATALOG, isProdigiSandbox } from "@/lib/services/print-fulfillment";
import { getPrices, PriceUnavailableError } from "@/lib/services/pricing";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  let priced: Array<(typeof PRINT_CATALOG)[number] & { priceCents: number }>;
  try {
    const prices = await getPrices(PRINT_CATALOG.map((p) => p.sku));
    priced = PRINT_CATALOG.map((p, i) => ({ ...p, priceCents: prices[i].unitAmount }));
  } catch (err) {
    if (err instanceof PriceUnavailableError) {
      console.error(`[print/products] ${err.message}`);
      return NextResponse.json(
        { success: false, error: "The print catalog isn't available right now." },
        { status: 503 }
      );
    }
    throw err;
  }

  const grouped = {
    art_prints: priced.filter((p) => p.format === "art_print"),
    framed_prints: priced.filter((p) => p.format === "framed_print"),
    canvas: priced.filter((p) => p.format === "canvas"),
    framed_canvas: priced.filter((p) => p.format === "framed_canvas"),
  };

  return NextResponse.json({
    success: true,
    sandbox: isProdigiSandbox(),
    products: priced,
    grouped,
  });
}
