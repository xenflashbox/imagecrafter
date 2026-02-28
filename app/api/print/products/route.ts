/**
 * GET /api/print/products
 *
 * Returns the complete print product catalog with pricing, sizes,
 * frame/wrap options, and Prodigi SKU mapping.
 *
 * PUBLIC — no authentication required.
 * Static catalog (no Prodigi API call needed per request).
 */

import { NextRequest, NextResponse } from "next/server";
import { PRINT_CATALOG, isProdigiSandbox } from "@/lib/services/print-fulfillment";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const grouped = {
    art_prints: PRINT_CATALOG.filter((p) => p.format === "art_print"),
    framed_prints: PRINT_CATALOG.filter((p) => p.format === "framed_print"),
    canvas: PRINT_CATALOG.filter((p) => p.format === "canvas"),
    framed_canvas: PRINT_CATALOG.filter((p) => p.format === "framed_canvas"),
  };

  return NextResponse.json({
    success: true,
    sandbox: isProdigiSandbox(),
    products: PRINT_CATALOG,
    grouped,
  });
}
