/**
 * Plan Configuration
 *
 * Central source of truth for plan limits, features, and credit costs.
 *
 * 2026-07-05 tier collapse (PLAN/01-plan.md Amendment A3): ImageCrafter sells
 * exactly two tiers — Free and Pro. STARTER and TEAM are gone; existing
 * STARTER/TEAM subscribers are mapped to PRO by the migration
 * prisma/migrations/20260705_generation_request_dual_engine_tier_collapse.sql
 * (mapping documented there).
 *
 * NOTE on prices: the numbers here are display copy only. What a customer is
 * actually charged comes from Stripe price objects (stripePriceId below) —
 * checkout/webhooks never read these numbers.
 */

// =============================================================================
// CREDIT COSTS BY RESOLUTION
// =============================================================================

export const CREDIT_COSTS = {
  "1K": 1,   // ~$0.01 actual cost
  "2K": 2,   // ~$0.02-0.03 actual cost
  "4K": 5,   // ~$0.05 actual cost
} as const;

export type Resolution = keyof typeof CREDIT_COSTS;

// =============================================================================
// RESOLUTION DIMENSIONS
// =============================================================================

export const RESOLUTION_DIMENSIONS = {
  "1K": { width: 1024, height: 1024 },
  "2K": { width: 2048, height: 2048 },
  "4K": { width: 4096, height: 4096 },
} as const;

// =============================================================================
// PLAN DEFINITIONS
// =============================================================================

export type PlanTier = "FREE" | "PRO";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: number;              // Display-only; billing amounts live in Stripe
  creditsPerMonth: number;
  maxResolution: Resolution;
  features: {
    hasWatermark: boolean;
    hasBatchMode: boolean;
    maxBatchSize: number;
    hasProjects: boolean;
    hasApiAccess: boolean;
    hasPriorityQueue: boolean;
    hasDualEngine: boolean;   // side-by-side two-provider generation
  };
  stripePriceId?: string;     // Set via environment variables
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  FREE: {
    name: "Free",
    tier: "FREE",
    price: 0,
    creditsPerMonth: 10,
    maxResolution: "1K",
    features: {
      hasWatermark: true,
      hasBatchMode: false,
      maxBatchSize: 1,
      hasProjects: false,
      hasApiAccess: false,
      hasPriorityQueue: false,
      hasDualEngine: false,
    },
  },
  PRO: {
    name: "Pro",
    tier: "PRO",
    price: 19,
    creditsPerMonth: 400,
    maxResolution: "4K",
    features: {
      hasWatermark: false,
      // Batch is founder confirmation #1 (PLAN/01-plan.md Amendment A2):
      // wire the service's real batch endpoint or drop batch for v1. Until
      // that decision lands, batch is OFF — nothing sellable maps to it.
      hasBatchMode: false,
      maxBatchSize: 1,
      hasProjects: true,
      hasApiAccess: false,
      hasPriorityQueue: true,
      hasDualEngine: true,
    },
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the credit cost for a given resolution
 */
export function getCreditCost(resolution: Resolution): number {
  return CREDIT_COSTS[resolution] || CREDIT_COSTS["1K"];
}

/**
 * Calculate how many images a user can generate with their remaining credits
 */
export function calculatePossibleImages(
  remainingCredits: number,
  resolution: Resolution
): number {
  const cost = getCreditCost(resolution);
  return Math.floor(remainingCredits / cost);
}

/**
 * Check if a resolution is available for a plan
 */
export function isResolutionAvailable(
  planTier: PlanTier,
  resolution: Resolution
): boolean {
  const plan = PLANS[planTier];
  const maxRes = plan.maxResolution;

  const resolutionOrder: Resolution[] = ["1K", "2K", "4K"];
  const maxIndex = resolutionOrder.indexOf(maxRes);
  const requestedIndex = resolutionOrder.indexOf(resolution);

  return requestedIndex <= maxIndex;
}

/**
 * Get plan by Stripe price ID
 */
export function getPlanByPriceId(priceId: string): PlanConfig | null {
  return Object.values(PLANS).find(plan => plan.stripePriceId === priceId) || null;
}

/**
 * Format credits display
 */
export function formatCredits(credits: number): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}K`;
  }
  return credits.toString();
}

/**
 * Get resolution label for display
 */
export function getResolutionLabel(resolution: Resolution): string {
  const dimensions = RESOLUTION_DIMENSIONS[resolution];
  return `${resolution} (${dimensions.width}×${dimensions.height})`;
}

// =============================================================================
// PRICING TABLE DATA (for UI)
// =============================================================================

// `tier` is intentionally a plain string (not PlanTier) — marketing UI compares
// against arbitrary strings and must not couple to the billing enum.
export const PRICING_TABLE = [
  {
    tier: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    credits: "10 credits/month",
    description: "Try it out",
    features: [
      "10 credits per month",
      "1K resolution (1 credit each)",
      "Basic templates",
      "Watermarked images",
    ],
    limitations: [
      "No dual-engine compare",
      "No projects",
      "No 2K or 4K",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    tier: "PRO",
    name: "Pro",
    price: "$19",
    period: "per month",
    credits: "400 credits/month",
    description: "For power users",
    features: [
      "400 credits per month",
      "Up to 4K resolution",
      "1K = 1, 2K = 2, 4K = 5 credits",
      "Dual-engine compare (two providers, pick the winner)",
      "No watermark",
      "Projects & character consistency",
      "Priority generation queue",
    ],
    limitations: [],
    cta: "Start Free Trial",
    highlighted: true,
  },
];
