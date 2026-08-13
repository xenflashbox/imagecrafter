/**
 * Prodigi Print Fulfillment Service
 *
 * Handles all communication with the Prodigi Print-on-Demand API (v4.0).
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

// =============================================================================
// PRINT PRODUCT CATALOG
// =============================================================================

export type PrintFormat = "art_print" | "framed_print" | "canvas" | "framed_canvas";
export type FrameColor = "black" | "white" | "natural" | "gold" | "silver";
export type CanvasWrap = "ImageWrap" | "Black" | "White";

export interface PrintProduct {
  sku: string;                // Our internal SKU (stored in Order.printProductSku)
  prodigiSku: string;         // Prodigi product SKU
  name: string;
  format: PrintFormat;
  size: string;               // Human-readable (e.g. "8×10"")
  dimensionsIn: string;       // Prodigi dimension string (e.g. "8X10")
  priceUsd: number;           // In cents
  frameOptions?: FrameColor[];
  wrapOptions?: CanvasWrap[];
  defaultFrame?: FrameColor;
  defaultWrap?: CanvasWrap;
}

export const PRINT_CATALOG: PrintProduct[] = [
  // --- ART PRINTS (Fine Art Paper) ---
  { sku: "ART-8x10",   prodigiSku: "GLOBAL-FAP-8X10",   name: '8×10" Art Print',   format: "art_print",      size: '8×10"',   dimensionsIn: "8X10",   priceUsd: 4995 },
  { sku: "ART-12x16",  prodigiSku: "GLOBAL-FAP-12X16",  name: '12×16" Art Print',  format: "art_print",      size: '12×16"',  dimensionsIn: "12X16",  priceUsd: 6995 },
  { sku: "ART-16x20",  prodigiSku: "GLOBAL-FAP-16X20",  name: '16×20" Art Print',  format: "art_print",      size: '16×20"',  dimensionsIn: "16X20",  priceUsd: 8995 },
  { sku: "ART-24x36",  prodigiSku: "GLOBAL-FAP-24X36",  name: '24×36" Art Print',  format: "art_print",      size: '24×36"',  dimensionsIn: "24X36",  priceUsd: 14995 },

  // --- FRAMED PRINTS (Classic Framed Metal) ---
  { sku: "FRAME-8x10",  prodigiSku: "GLOBAL-CFPM-8X10",  name: '8×10" Framed Print',  format: "framed_print", size: '8×10"',  dimensionsIn: "8X10",  priceUsd: 8995, frameOptions: ["black","white","natural","gold","silver"], defaultFrame: "black" },
  { sku: "FRAME-12x16", prodigiSku: "GLOBAL-CFPM-12X16", name: '12×16" Framed Print', format: "framed_print", size: '12×16"', dimensionsIn: "12X16", priceUsd: 10995, frameOptions: ["black","white","natural","gold","silver"], defaultFrame: "black" },
  { sku: "FRAME-16x20", prodigiSku: "GLOBAL-CFPM-16X20", name: '16×20" Framed Print', format: "framed_print", size: '16×20"', dimensionsIn: "16X20", priceUsd: 11995, frameOptions: ["black","white","natural","gold","silver"], defaultFrame: "black" },

  // --- CANVAS (Stretched) ---
  { sku: "CANVAS-12x12", prodigiSku: "GLOBAL-CAN-12X12", name: '12×12" Canvas',    format: "canvas", size: '12×12"', dimensionsIn: "12X12", priceUsd: 9995, wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
  { sku: "CANVAS-16x20", prodigiSku: "GLOBAL-CAN-16X20", name: '16×20" Canvas',    format: "canvas", size: '16×20"', dimensionsIn: "16X20", priceUsd: 14995, wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
  { sku: "CANVAS-24x36", prodigiSku: "GLOBAL-CAN-24X36", name: '24×36" Canvas',    format: "canvas", size: '24×36"', dimensionsIn: "24X36", priceUsd: 19995, wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },

  // --- FRAMED CANVAS ---
  { sku: "FCANVAS-16x20", prodigiSku: "GLOBAL-FRA-CAN-16X20", name: '16×20" Framed Canvas', format: "framed_canvas", size: '16×20"', dimensionsIn: "16X20", priceUsd: 19995, frameOptions: ["black","white","natural","gold"], defaultFrame: "black", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
  { sku: "FCANVAS-24x36", prodigiSku: "GLOBAL-FRA-CAN-24X36", name: '24×36" Framed Canvas', format: "framed_canvas", size: '24×36"', dimensionsIn: "24X36", priceUsd: 29995, frameOptions: ["black","white","natural","gold"], defaultFrame: "black", wrapOptions: ["ImageWrap","Black","White"], defaultWrap: "ImageWrap" },
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

/**
 * Submit a print order to Prodigi after payment is confirmed.
 * Returns the Prodigi order ID to store in Order.prodigiOrderId.
 */
export async function createProdigiOrder(
  params: CreateProdigiOrderParams
): Promise<{ prodigiOrderId: string; stage: string }> {
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

  // Build callback URL including webhook secret for verification
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

  const response = await prodigiRequest<{ outcome: string; order: { id: string; status: { stage: string } } }>(
    "POST",
    "/Orders",
    requestBody
  );

  if (response.outcome !== "Created") {
    throw new Error(`Prodigi order creation failed with outcome: ${response.outcome}`);
  }

  console.log(
    `[print-fulfillment] Prodigi order ${response.order.id} created for Order ${params.orderId} (${USE_SANDBOX ? "SANDBOX" : "PRODUCTION"})`
  );

  return {
    prodigiOrderId: response.order.id,
    stage: response.order.status?.stage || "InProgress",
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

/**
 * Verify a Prodigi webhook request by checking the secret query param.
 * Returns true if the secret matches or no secret is configured.
 */
export function verifyProdigiWebhook(requestSecret: string | null): boolean {
  if (!WEBHOOK_SECRET) return true;
  if (!requestSecret) return false;
  return requestSecret === WEBHOOK_SECRET;
}

/** Check if we're running in sandbox mode */
export function isProdigiSandbox(): boolean {
  return USE_SANDBOX;
}
