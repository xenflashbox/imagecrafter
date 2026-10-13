# ImageCrafter → Gelato SKU mapping

**Store:** ImageCrafter · ID `f36dfb88-5f51-4856-bd8e-a2ec58a0f762` · currency USD
**Created:** 2026-10-12
**Purpose:** map every IC internal SKU to the Gelato `productUid` used in `POST /v4/orders` so IC's fulfilment code can submit print orders without a storefront product in Gelato Studio.

## How this is different from Prodigi

Prodigi order submission uses a static SKU string like `GLOBAL-FAP-8X10` plus a size attribute. Gelato's `productUid` encodes **everything** — paper type, orientation, size, frame material, canvas thickness, finish — in one slug. Below are the resolved slugs. These are what IC's `lib/services/print-fulfillment.ts` calls Gelato with. The ImageCrafter store in Gelato Studio **does not need storefront products** to receive orders this way — orders go through the Order API, not the Ecommerce API.

## Mapping table

| IC SKU | Format | Price | Gelato `productUid` (vertical/portrait orientation) |
|---|---|---|---|
| `ART-8x10` | Fine-art paper 200gsm | $49.95 | `fine_arts_poster_geo_simplified_product_12-0_ver_200x250-mm-8x10-inch_200-gsm-80lb-enhanced-uncoated` |
| `ART-12x16` | Fine-art paper 200gsm | $69.95 | `fine_arts_poster_geo_simplified_product_12-0_ver_300x400-mm-12x16-inch_200-gsm-80lb-enhanced-uncoated` |
| `ART-16x20` | Fine-art paper 200gsm | $89.95 | `fine_arts_poster_geo_simplified_product_12-0_ver_400x500-mm-16x20-inch_200-gsm-80lb-enhanced-uncoated` |
| `ART-24x36` | Fine-art paper 200gsm | $149.95 | `fine_arts_poster_geo_simplified_product_12-0_ver_600x900-mm-24x36-inch_200-gsm-80lb-enhanced-uncoated` |
| `FRAME-8x10` (black) | Framed fine-art, black aluminum, plexiglass | $89.95 | `framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_200x250-mm-8x10-inch_200x250-mm-8x10-inch_200-gsm-80lb-enhanced-uncoated` |
| `FRAME-12x16` (black) | Framed fine-art, black aluminum, plexiglass | $109.95 | `framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_300x400-mm-12x16-inch_300x400-mm-12x16-inch_200-gsm-80lb-enhanced-uncoated` |
| `FRAME-16x20` (black) | Framed fine-art, black aluminum, plexiglass | $119.95 | `framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_400x500-mm-16x20-inch_400x500-mm-16x20-inch_200-gsm-80lb-enhanced-uncoated` |
| `CANVAS-12x12` | 12mm slim stretched canvas, FSC wood | $99.95 | `canvas_300x300-mm-12x12-inch_canvas_wood-fsc-slim_4-0_ver` |
| `CANVAS-16x20` | 12mm slim stretched canvas, FSC wood | $149.95 | `canvas_400x500-mm-16x20-inch_canvas_wood-fsc-slim_4-0_ver` |
| `CANVAS-24x36` | 12mm slim stretched canvas, FSC wood | $199.95 | `canvas_600x900-mm-24x36-inch_canvas_wood-fsc-slim_4-0_ver` |
| `FCANVAS-16x20` | Framed canvas, black wood slim | $199.95 | `framed_canvas_geo_simplified_400x500-mm-16x20-inch_black_452x552-mm-18x22-inch_wood-fsc-slim_ver_wood_w14xt42-mm_canvas_4-0` |
| `FCANVAS-24x36` | Framed canvas, black wood slim | $299.95 | `framed_canvas_geo_simplified_600x900-mm-24x36-inch_black_652x952-mm-26x38-inch_wood-fsc-slim_ver_wood_w14xt42-mm_canvas_4-0` |

## Frame-colour change note

Prodigi's `FRAME-*` SKU attributes advertise five colours: **black, white, natural, gold, silver**. The live Gelato `fine-art-framed-poster` catalog currently exposes ImageCrafter's vertical sizes as **black aluminum only**. The live `framed-canvas` catalog currently exposes the 16×20 and 24×36 ImageCrafter sizes as **black wood only**.

Code change completed in `lib/services/print-fulfillment.ts`: new checkout options are black only for framed products, while Prodigi remains a fallback for legacy/manual orders.

## Still to do

1. **Gelato primary is wired** in `lib/services/print-fulfillment.ts`, calling `POST https://order.gelatoapis.com/v4/orders` with `items[].productUid`.
2. **Fallback logic is present**: Gelato submission failures fall back to Prodigi unless `GELATO_FALLBACK_TO_PRODIGI=false`.
3. **Operational follow-up:** Gelato tracking webhooks are not yet wired; paid orders are submitted immediately and stored with `prodigiStatus='gelato:<status>'`, then need dashboard/order polling or a later Gelato webhook pass for shipment tracking.
4. **No live verification order required** per founder instruction on 2026-10-12; the same Gelato account was already live-verified by the Wine Country Corner merchandise order.

## References

- Store: `GELATO_STORE_ID` in imagecrafter vault (also mirrored to `/frontend` for Vercel if needed)
- Key: `GELATO_API_KEY` in imagecrafter vault
- Order endpoint: `https://order.gelatoapis.com/v4/orders`
- Product-search endpoint: `https://product.gelatoapis.com/v3/catalogs/<catalog>/products:search`
- Prodigi fallback mapping: `lib/services/print-fulfillment.ts` → `PRINT_CATALOG`
