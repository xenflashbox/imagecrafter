/**
 * Stripe is the single source of truth for every price we show or charge.
 *
 * Prices are keyed on the `sku` set in each Stripe *product's* metadata, so
 * repricing is a Stripe edit (new price + archive old) and never a code
 * change. Nothing here falls back to a literal amount: a price we cannot
 * read is an error, because a stale hardcoded number is how the site came to
 * advertise $29.95 while Stripe charged something else.
 */

import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

export interface CatalogPrice {
  sku: string;
  priceId: string;
  unitAmount: number; // cents
  name: string;
  credits: number | null; // credit packs only
}

export class PriceUnavailableError extends Error {
  constructor(sku: string) {
    super(`No active Stripe price for SKU "${sku}"`);
    this.name = "PriceUnavailableError";
  }
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; catalog: Map<string, CatalogPrice> } | null = null;
let inflight: Promise<Map<string, CatalogPrice>> | null = null;

async function fetchCatalog(): Promise<Map<string, CatalogPrice>> {
  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const catalog = new Map<string, CatalogPrice>();

  for await (const price of stripe.prices.list({
    active: true,
    limit: 100,
    expand: ["data.product"],
  })) {
    const product = price.product;
    if (typeof product === "string" || product.deleted || !product.active) continue;
    const sku = product.metadata?.sku;
    if (!sku || price.unit_amount == null) continue;

    // A product with several active prices is ambiguous, so prefer the one
    // Stripe itself calls default — that is what repricing sets.
    const isDefault = product.default_price === price.id;
    if (catalog.has(sku) && !isDefault) continue;

    const credits = Number(product.metadata?.credits);
    catalog.set(sku, {
      sku,
      priceId: price.id,
      unitAmount: price.unit_amount,
      name: product.name,
      credits: Number.isFinite(credits) && credits > 0 ? credits : null,
    });
  }

  if (catalog.size === 0) throw new Error("Stripe returned no active priced products");
  return catalog;
}

export async function getPriceCatalog(): Promise<Map<string, CatalogPrice>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.catalog;
  if (!inflight) {
    inflight = fetchCatalog()
      .then((catalog) => {
        cache = { at: Date.now(), catalog };
        return catalog;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function getPrice(sku: string): Promise<CatalogPrice> {
  const price = (await getPriceCatalog()).get(sku);
  if (!price) throw new PriceUnavailableError(sku);
  return price;
}

export async function getPrices(skus: string[]): Promise<CatalogPrice[]> {
  const catalog = await getPriceCatalog();
  return skus.map((sku) => {
    const price = catalog.get(sku);
    if (!price) throw new PriceUnavailableError(sku);
    return price;
  });
}

export function formatUsd(cents: number): string {
  return cents % 100 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}

export const DIGITAL_SKU = "DIGITAL";

/** Credit packs, cheapest first. Credit counts come from Stripe too. */
export const PACK_SKUS = ["PACK-5", "PACK-10", "PACK-60"];

export interface PackPrice extends CatalogPrice {
  credits: number;
}

function assertPack(price: CatalogPrice): PackPrice {
  if (price.credits == null) {
    throw new Error(`Stripe product for ${price.sku} has no credits metadata`);
  }
  return price as PackPrice;
}

export async function getPackCatalog(): Promise<PackPrice[]> {
  return (await getPrices(PACK_SKUS)).map(assertPack);
}

export async function resolvePackPrice(sku: string): Promise<PackPrice | null> {
  if (!PACK_SKUS.includes(sku)) return null;
  const price = (await getPriceCatalog()).get(sku);
  return price ? assertPack(price) : null;
}
