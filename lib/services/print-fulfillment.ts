/**
 * Print Fulfillment Service
 *
 * Gelato is the primary print-on-demand provider. Prodigi remains as the hot
 * fallback for legacy SKUs and temporary Gelato failures.
 *
 * Reference: https://www.prodigi.com/print-api/docs/reference/
 *
 * Sandbox vs Production is controlled by USE_PRODIGI_SANDBOX env var.
 * When true, uses PRODIGI_SANDBOX_URL + PRODIGI_SANDBOX_API_KEY.
 *
 * SKU Catalog mapping (our internal ID → Prodigi):
 *   Art Prints:      GLOBAL-FAP-{WIDTH}X{HEIGHT}
 *   Framed Prints:   GLOBAL-CFPM-{WIDTH}X{HEIGHT}  (attribute: color=black|white|natural|gold|silver)
 *   Canvas:          GLOBAL-CAN-{WIDTH}X{HEIGHT}   (attribute: wrap=ImageWrap|Black|White)
 *   Framed Canvas:   GLOBAL-FRA-CAN-{WIDTH}X{HEIGHT} (attributes: color AND wrap — both required)
 */


// =============================================================================
// CONFIGURATION
// =============================================================================

const USE_SANDBOX =
  process.env.USE_PRODIGI_SANDBOX === "true" ||
  process.env.NODE_ENV !== "production";

const PRODIGI_BASE_URL = USE_SANDBOX
  ? process.env.PRODIGI_SANDBOX_URL || "https://api.sandbox.prodigi.com/v4.0"
  : process.env.PRODIGI_API_URL || "https://api.prodigi.com/v4.0";

const PRODIGI_API_KEY = USE_SANDBOX
  ? process.env.PRODIGI_SANDBOX_API_KEY || process.env.PRODIGI_API_KEY || ""
  : process.env.PRODIGI_API_KEY || "";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";
const WEBHOOK_SECRET = process.env.PRODIGI_WEBHOOK_SECRET || "";
const GELATO_API_KEY = process.env.GELATO_API_KEY || "";
const GELATO_STORE_ID = process.env.GELATO_STORE_ID || "";
const GELATO_ORDERS_URL =
  process.env.GELATO_ORDERS_URL || "https://order.gelatoapis.com/v4";
const USE_GELATO_PRIMARY = process.env.USE_GELATO_PRIMARY !== "false";
const GELATO_FALLBACK_TO_PRODIGI = process.env.GELATO_FALLBACK_TO_PRODIGI !== "false";

// =============================================================================
// PRINT PRODUCT CATALOG
// =============================================================================

export type PrintFormat = "art_print" | "framed_print" | "canvas" | "framed_canvas";
export type FrameColor = "black" | "white" | "natural" | "gold" | "silver";
export type CanvasWrap = "ImageWrap" | "Black" | "White";

/**
 * What a print IS. What it COSTS lives in Stripe, keyed on this `sku` — see
 * lib/services/pricing.ts.
 */
export interface PrintProduct {
  sku: string;                // Our internal SKU (stored in Order.printProductSku)
  prodigiSku: string;         // Prodigi product SKU
  gelatoProductUid?: string;  // Gelato productUid for products with no options
  gelatoProductUids?: Partial<Record<FrameColor, string>>;
  name: string;
  format: PrintFormat;
  size: string;               // Human-readable (e.g. "8×10"")
  dimensionsIn: string;       // Prodigi dimension string (e.g. "8X10")
  frameOptions?: FrameColor[];
  wrapOptions?: CanvasWrap[];
  defaultFrame?: FrameColor;
  defaultWrap?: CanvasWrap;
}

export const PRINT_CATALOG: PrintProduct[] = [
  // --- ART PRINTS (Fine Art Paper) ---
  { sku: "ART-8x10",   prodigiSku: "GLOBAL-FAP-8X10",   gelatoProductUid: "fine_arts_poster_geo_simplified_product_12-0_ver_200x250-mm-8x10-inch_200-gsm-80lb-enhanced-uncoated", name: '8×10" Art Print',   format: "art_print",      size: '8×10"',   dimensionsIn: "8X10" },
  { sku: "ART-12x16",  prodigiSku: "GLOBAL-FAP-12X16",  gelatoProductUid: "fine_arts_poster_geo_simplified_product_12-0_ver_300x400-mm-12x16-inch_200-gsm-80lb-enhanced-uncoated", name: '12×16" Art Print',  format: "art_print",      size: '12×16"',  dimensionsIn: "12X16" },
  { sku: "ART-16x20",  prodigiSku: "GLOBAL-FAP-16X20",  gelatoProductUid: "fine_arts_poster_geo_simplified_product_12-0_ver_400x500-mm-16x20-inch_200-gsm-80lb-enhanced-uncoated", name: '16×20" Art Print',  format: "art_print",      size: '16×20"',  dimensionsIn: "16X20" },
  { sku: "ART-24x36",  prodigiSku: "GLOBAL-FAP-24X36",  gelatoProductUid: "fine_arts_poster_geo_simplified_product_12-0_ver_600x900-mm-24x36-inch_200-gsm-80lb-enhanced-uncoated", name: '24×36" Art Print',  format: "art_print",      size: '24×36"',  dimensionsIn: "24X36" },

  // --- FRAMED PRINTS (Gelato activated vertical fine-art framed posters) ---
  { sku: "FRAME-8x10",  prodigiSku: "GLOBAL-CFPM-8X10",  name: '8×10" Framed Print',  format: "framed_print", size: '8×10"',  dimensionsIn: "8X10",  frameOptions: ["black"], defaultFrame: "black", gelatoProductUids: { black: "framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_200x250-mm-8x10-inch_200x250-mm-8x10-inch_200-gsm-80lb-enhanced-uncoated" } },
  { sku: "FRAME-12x16", prodigiSku: "GLOBAL-CFPM-12X16", name: '12×16" Framed Print', format: "framed_print", size: '12×16"', dimensionsIn: "12X16", frameOptions: ["black"], defaultFrame: "black", gelatoProductUids: { black: "framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_300x400-mm-12x16-inch_300x400-mm-12x16-inch_200-gsm-80lb-enhanced-uncoated" } },
  { sku: "FRAME-16x20", prodigiSku: "GLOBAL-CFPM-16X20", name: '16×20" Framed Print', format: "framed_print", size: '16×20"', dimensionsIn: "16X20", frameOptions: ["black"], defaultFrame: "black", gelatoProductUids: { black: "framed_fine_arts_poster_geo_simplified_product_12-0_black_aluminum_w10xt22-mm_plexiglass_ver_400x500-mm-16x20-inch_400x500-mm-16x20-inch_200-gsm-80lb-enhanced-uncoated" } },

  // --- CANVAS (Stretched) ---
  { sku: "CANVAS-12x12", prodigiSku: "GLOBAL-CAN-12X12", gelatoProductUid: "canvas_300x300-mm-12x12-inch_canvas_wood-fsc-slim_4-0_ver", name: '12×12" Canvas',    format: "canvas", size: '12×12"', dimensionsIn: "12X12", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
  { sku: "CANVAS-16x20", prodigiSku: "GLOBAL-CAN-16X20", gelatoProductUid: "canvas_400x500-mm-16x20-inch_canvas_wood-fsc-slim_4-0_ver", name: '16×20" Canvas',    format: "canvas", size: '16×20"', dimensionsIn: "16X20", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
  { sku: "CANVAS-24x36", prodigiSku: "GLOBAL-CAN-24X36", gelatoProductUid: "canvas_600x900-mm-24x36-inch_canvas_wood-fsc-slim_4-0_ver", name: '24×36" Canvas',    format: "canvas", size: '24×36"', dimensionsIn: "24X36", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },

  // --- FRAMED CANVAS ---
  { sku: "FCANVAS-16x20", prodigiSku: "GLOBAL-FRA-CAN-16X20", name: '16×20" Framed Canvas', format: "framed_canvas", size: '16×20"', dimensionsIn: "16X20", frameOptions: ["black"], defaultFrame: "black", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap", gelatoProductUids: { black: "framed_canvas_geo_simplified_400x500-mm-16x20-inch_black_452x552-mm-18x22-inch_wood-fsc-slim_ver_wood_w14xt42-mm_canvas_4-0" } },
  { sku: "FCANVAS-24x36", prodigiSku: "GLOBAL-FRA-CAN-24X36", name: '24×36" Framed Canvas', format: "framed_canvas", size: '24×36"', dimensionsIn: "24X36", frameOptions: ["black"], defaultFrame: "black", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap", gelatoProductUids: { black: "framed_canvas_geo_simplified_600x900-mm-24x36-inch_black_652x952-mm-26x38-inch_wood-fsc-slim_ver_wood_w14xt42-mm_canvas_4-0" } },
];

// Legacy Phase 3 SKU aliases → new catalog (backward compatible)
const LEGACY_SKU_MAP: Record<string, string> = {
  "GICLÉE_8x10":  "ART-8x10",
  "GICLÉE_12x16": "ART-12x16",
  "GICLÉE_16x20": "ART-16x20",
  "GICLÉE_24x36": "ART-24x36",
};

export function resolveSku(sku: string): PrintProduct | null {
  const resolved = LEGACY_SKU_MAP[sku] || sku;
  return PRINT_CATALOG.find((p) => p.sku === resolved) || null;
}

// =============================================================================
// PRODIGI API TYPES
// =============================================================================

interface ProdigiRecipient {
  name: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
}

interface ProdigiAsset {
  printArea: "default";
  url: string;
}

interface ProdigiItem {
  merchantReference: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea";
  attributes: Record<string, string>;
  assets: ProdigiAsset[];
}

interface ProdigiOrderRequest {
  merchantReference: string;
  shippingMethod: "Budget" | "Standard" | "Express" | "Overnight";
  recipient: ProdigiRecipient;
  items: ProdigiItem[];
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface GelatoOrderRequest {
  orderType: "order";
  orderReferenceId: string;
  customerReferenceId: string;
  currency: "USD";
  shipmentMethodUid: "normal" | "standard" | "express";
  items: Array<{
    itemReferenceId: string;
    productUid: string;
    files: Array<{ type: "default"; url: string }>;
    quantity: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    state?: string;
    city: string;
    postCode: string;
    country: string;
    email: string;
  };
  metadata: Array<{ key: string; value: string }>;
}

interface GelatoOrderResponse {
  id: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
}

export interface ProdigiShipment {
  id: string;
  carrier: { name: string; service: string };
  tracking?: { number: string; url?: string };
  status?: string;
}

export interface ProdigiOrderStatus {
  id: string;
  stage: "InProgress" | "Complete" | "Cancelled" | "Error";
  details: {
    downloadAssets: string;
    printReadyAssetsPrepared: string;
    allocateProductionLocation: string;
    inProduction: string;
    shipping: string;
  };
  issues: Array<{ objectId: string; errorCode: string; description: string }>;
  shipments: ProdigiShipment[];
  merchantReference: string;
  created: string;
}

// CloudEvents webhook format from Prodigi
export interface ProdigiWebhookPayload {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  data: {
    order: {
      id: string;
      merchantReference: string;
      status: {
        stage: "InProgress" | "Complete" | "Cancelled" | "Error";
        issues: Array<{ objectId: string; errorCode: string; description: string }>;
        details: Record<string, string>;
      };
      shipments: ProdigiShipment[];
      created: string;
      lastUpdated: string;
    };
  };
}

// =============================================================================
// PRODIGI API CLIENT
// =============================================================================

async function prodigiRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${PRODIGI_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-API-Key": PRODIGI_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Prodigi API error ${res.status} for ${method} ${path}: ${text}`
    );
  }

  return JSON.parse(text) as T;
}

async function gelatoRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  if (!GELATO_API_KEY) {
    throw new Error("GELATO_API_KEY is not configured");
  }
  const res = await fetch(`${GELATO_ORDERS_URL}${path}`, {
    method,
    headers: {
      "X-API-KEY": GELATO_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Gelato API error ${res.status} for ${method} ${path}: ${text}`
    );
  }

  return JSON.parse(text) as T;
}

// =============================================================================
// CORE SERVICE FUNCTIONS
// =============================================================================

export interface CreateProdigiOrderParams {
  orderId: string;           // Our Order.id (used as merchantReference)
  portraitId: string;
  hiResImageUrl: string;     // Publicly accessible URL for Prodigi to download
  sku: string;               // Our internal SKU
  frame?: string;            // Frame color (for framed prints)
  wrap?: string;             // Canvas wrap style
  recipient: {
    name: string;
    email?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
  };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Customer", lastName: "ImageCrafter" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Customer" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! };
}

function resolveGelatoProductUid(
  product: PrintProduct,
  frame?: string
): string | null {
  if (product.gelatoProductUid) return product.gelatoProductUid;
  const color = (frame || product.defaultFrame || "black") as FrameColor;
  return product.gelatoProductUids?.[color] || null;
}

async function createGelatoOrder(
  params: CreateProdigiOrderParams
): Promise<{ prodigiOrderId: string; stage: string }> {
  const product = resolveSku(params.sku);
  if (!product) {
    throw new Error(`Unknown print SKU: ${params.sku}`);
  }
  if (!GELATO_STORE_ID) {
    throw new Error("GELATO_STORE_ID is not configured");
  }
  const productUid = resolveGelatoProductUid(product, params.frame);
  if (!productUid) {
    throw new Error(
      `No Gelato productUid for ${product.sku} frame=${params.frame || product.defaultFrame || "none"}`
    );
  }
  if (!params.recipient.email) {
    throw new Error("Gelato print orders require a recipient email");
  }

  const { firstName, lastName } = splitName(params.recipient.name);
  const requestBody: GelatoOrderRequest = {
    orderType: "order",
    orderReferenceId: params.orderId,
    customerReferenceId: params.portraitId,
    currency: "USD",
    shipmentMethodUid: "normal",
    items: [
      {
        itemReferenceId: `${params.orderId}-item-1`,
        productUid,
        files: [{ type: "default", url: params.hiResImageUrl }],
        quantity: 1,
      },
    ],
    shippingAddress: {
      firstName,
      lastName,
      addressLine1: params.recipient.line1,
      addressLine2: params.recipient.line2 || undefined,
      city: params.recipient.city,
      state: params.recipient.state || undefined,
      postCode: params.recipient.zip,
      country: params.recipient.country,
      email: params.recipient.email,
    },
    metadata: [
      { key: "provider", value: "gelato" },
      { key: "storeId", value: GELATO_STORE_ID },
      { key: "orderId", value: params.orderId },
      { key: "portraitId", value: params.portraitId },
      { key: "sku", value: product.sku },
    ],
  };

  const response = await gelatoRequest<GelatoOrderResponse>(
    "POST",
    "/orders",
    requestBody
  );
  if (!response.id) {
    throw new Error("Gelato returned success but no order id");
  }

  const stage = `gelato:${response.fulfillmentStatus || "created"}`;
  console.log(
    `[print-fulfillment] Gelato order ${response.id} accepted (status=${stage}) for Order ${params.orderId}`
  );

  return {
    prodigiOrderId: response.id,
    stage,
  };
}

/**
 * Submit a print order to Prodigi after payment is confirmed.
 * Returns the Prodigi order ID to store in Order.prodigiOrderId.
 */
export async function createProdigiOrder(
  params: CreateProdigiOrderParams
): Promise<{ prodigiOrderId: string; stage: string }> {
  if (USE_GELATO_PRIMARY && GELATO_API_KEY && GELATO_STORE_ID) {
    try {
      return await createGelatoOrder(params);
    } catch (gelatoError) {
      if (!GELATO_FALLBACK_TO_PRODIGI) {
        throw gelatoError;
      }
      console.error(
        `[print-fulfillment] Gelato submission failed for Order ${params.orderId}; falling back to Prodigi:`,
        gelatoError
      );
    }
  }

  const product = resolveSku(params.sku);
  if (!product) {
    throw new Error(`Unknown print SKU: ${params.sku}`);
  }

  // Build Prodigi SKU attributes. Framed prints need color; canvas needs wrap;
  // framed canvas (GLOBAL-FRA-CAN) requires BOTH color and wrap or Prodigi 400s.
  const attributes: Record<string, string> = {};
  if (product.format === "framed_print" || product.format === "framed_canvas") {
    attributes.color = params.frame || product.defaultFrame || "black";
  }
  if (product.format === "canvas" || product.format === "framed_canvas") {
    attributes.wrap = params.wrap || product.defaultWrap || "ImageWrap";
  }

  // Build callback URL including webhook secret for verification.
  // The order is already paid for, so a missing secret must not block
  // fulfilment — but it does mean every status callback will be rejected,
  // so say so loudly rather than losing tracking updates in silence.
  if (!WEBHOOK_SECRET) {
    console.error(
      `[prodigi] PRODIGI_WEBHOOK_SECRET is not configured — order ${params.orderId} will receive NO status/tracking updates; status must be reconciled manually`
    );
  }
  const callbackUrl = WEBHOOK_SECRET
    ? `${APP_URL}/api/webhooks/prodigi?secret=${encodeURIComponent(WEBHOOK_SECRET)}`
    : `${APP_URL}/api/webhooks/prodigi`;

  const requestBody: ProdigiOrderRequest = {
    merchantReference: params.orderId,
    shippingMethod: "Budget",
    callbackUrl,
    recipient: {
      name: params.recipient.name,
      email: params.recipient.email,
      address: {
        line1: params.recipient.line1,
        line2: params.recipient.line2 || undefined,
        postalOrZipCode: params.recipient.zip,
        countryCode: params.recipient.country,
        townOrCity: params.recipient.city,
        stateOrCounty: params.recipient.state || undefined,
      },
    },
    items: [
      {
        merchantReference: `${params.orderId}-item-1`,
        sku: product.prodigiSku,
        copies: 1,
        sizing: "fillPrintArea",
        attributes,
        assets: [{ printArea: "default", url: params.hiResImageUrl }],
      },
    ],
    metadata: {
      orderId: params.orderId,
      portraitId: params.portraitId,
      environment: USE_SANDBOX ? "sandbox" : "production",
    },
  };

  const response = await prodigiRequest<{
    outcome: string;
    order: { id: string; status?: { stage?: string; issues?: unknown[] } };
  }>("POST", "/Orders", requestBody);

  // Prodigi success outcomes (v4 docs): Created, CreatedWithIssues (order accepted
  // but has issues, e.g. UsSalesTaxWarning or RequiresPaymentAuthorisation), OnHold
  // (dashboard pause window active — status unavailable until window expires),
  // AlreadyExists (idempotent replay). Everything else is a failure.
  const outcome = (response.outcome || "").toLowerCase();
  const SUCCESS_OUTCOMES = new Set(["created", "createdwithissues", "onhold", "alreadyexists"]);

  if (!SUCCESS_OUTCOMES.has(outcome)) {
    throw new Error(`Prodigi order creation failed with outcome: ${response.outcome}`);
  }
  if (!response.order?.id) {
    throw new Error(
      `Prodigi returned success outcome "${response.outcome}" but no order id — refusing to treat as created`
    );
  }

  if (outcome === "createdwithissues") {
    console.warn(
      `[print-fulfillment] Prodigi order ${response.order.id} created WITH ISSUES for Order ${params.orderId}: ${JSON.stringify(response.order.status?.issues ?? [])}`
    );
  }

  const stage =
    response.order.status?.stage || (outcome === "onhold" ? "OnHold" : "InProgress");

  console.log(
    `[print-fulfillment] Prodigi order ${response.order.id} accepted (outcome=${response.outcome}, stage=${stage}) for Order ${params.orderId} (${USE_SANDBOX ? "SANDBOX" : "PRODUCTION"})`
  );

  return {
    prodigiOrderId: response.order.id,
    stage,
  };
}

/**
 * Fetch current status of a Prodigi order.
 */
export async function getProdigiOrderStatus(
  prodigiOrderId: string
): Promise<ProdigiOrderStatus> {
  const response = await prodigiRequest<{ outcome: string; order: ProdigiOrderStatus }>(
    "GET",
    `/orders/${prodigiOrderId}`
  );

  if (response.outcome !== "Ok") {
    throw new Error(`Prodigi getOrder failed with outcome: ${response.outcome}`);
  }

  return response.order;
}

/**
 * Extract the first tracking number/URL from Prodigi shipments array.
 * Prodigi shipments look like: { carrier: { name, service }, tracking: { number, url } }
 */
export function extractTracking(
  shipments: ProdigiShipment[]
): { trackingNumber: string | null; trackingUrl: string | null; carrier: string | null } {
  const first = shipments[0];
  if (!first) return { trackingNumber: null, trackingUrl: null, carrier: null };

  return {
    trackingNumber: first.tracking?.number || null,
    trackingUrl: first.tracking?.url || null,
    carrier: first.carrier?.name || null,
  };
}

/** Check if we're running in sandbox mode */
export function isProdigiSandbox(): boolean {
  return USE_SANDBOX;
}
