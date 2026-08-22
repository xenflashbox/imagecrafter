/**
 * Prodigi LIVE verification order (spec 4.2 gate).
 *
 * Places ONE real order through the app's own createProdigiOrder() code path
 * against the LIVE Prodigi API. This is the gate that must pass before
 * USE_PRODIGI_SANDBOX can be flipped to false in production.
 *
 * Run (env forces the live path regardless of local NODE_ENV):
 *   NODE_ENV=production USE_PRODIGI_SANDBOX=false \
 *   PRODIGI_API_KEY=... PRODIGI_WEBHOOK_SECRET=... \
 *   npx tsx scripts/smoke/prodigi-live-verification.ts \
 *     --image <public-hires-url> \
 *     --name "Full Name" --line1 "123 St" --city "Town" --state CA \
 *     --zip 00000 --country US [--email x@y.com]
 *
 * Costs real money (~$20.85 for ART-8x10 incl. shipping) and ships a real print.
 */

import { createProdigiOrder, getProdigiOrderStatus } from "../../lib/services/print-fulfillment";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function requireArg(name: string): string {
  const v = arg(name);
  if (!v) {
    console.error(`Missing required --${name}`);
    process.exit(1);
  }
  return v;
}

async function main() {
  if (process.env.USE_PRODIGI_SANDBOX === "true" || process.env.NODE_ENV !== "production") {
    console.error(
      "Refusing to run: env resolves to SANDBOX. Set NODE_ENV=production and USE_PRODIGI_SANDBOX=false."
    );
    process.exit(1);
  }
  if (!process.env.PRODIGI_API_KEY) {
    console.error("PRODIGI_API_KEY not set.");
    process.exit(1);
  }

  const orderId = `live-verify-${Date.now()}`;
  console.log(`Placing LIVE verification order (merchantReference=${orderId}, sku=ART-8x10)…`);

  const result = await createProdigiOrder({
    orderId,
    portraitId: "live-verification",
    hiResImageUrl: requireArg("image"),
    sku: "ART-8x10",
    recipient: {
      name: requireArg("name"),
      email: arg("email"),
      line1: requireArg("line1"),
      line2: arg("line2"),
      city: requireArg("city"),
      state: arg("state"),
      zip: requireArg("zip"),
      country: requireArg("country"),
    },
  });

  console.log(`ORDER CREATED: prodigiOrderId=${result.prodigiOrderId} stage=${result.stage}`);

  try {
    const status = await getProdigiOrderStatus(result.prodigiOrderId);
    console.log("STATUS:", JSON.stringify(status, null, 2));
  } catch (err) {
    // Paused orders (dashboard pause window) expose no status until the window
    // expires — the order itself was still accepted above.
    console.warn(
      `STATUS UNAVAILABLE (order likely paused by the dashboard pause window): ${err instanceof Error ? err.message : err}`
    );
  }
}

main().catch((err) => {
  console.error("VERIFICATION ORDER FAILED:");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
