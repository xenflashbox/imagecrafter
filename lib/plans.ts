/**
 * Plan Configuration
 * 
 * Central source of truth for all plan limits, features, and credit costs.
 * Update these values to adjust pricing/limits across the entire app.
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

export type PlanTier = "FREE" | "STARTER" | "PRO" | "TEAM";

export interface PlanConfig {
  name: string;
  tier: PlanTier;
  price: number;              // Monthly price in USD
  creditsPerMonth: number;
  maxResolution: Resolution;
  features: {
    hasWatermark: boolean;
    hasBatchMode: boolean;
    maxBatchSize: number;
    hasProjects: boolean;
    hasApiAccess: boolean;
    hasPriorityQueue: boolean;
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
    },
  },
  STARTER: {
    name: "Starter",
    tier: "STARTER",
    price: 9,
    creditsPerMonth: 150,
    maxResolution: "2K",
    features: {
      hasWatermark: false,
      hasBatchMode: true,
      maxBatchSize: 4,
      hasProjects: false,
      hasApiAccess: false,
      hasPriorityQueue: false,
    },
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  PRO: {
    name: "Pro",
    tier: "PRO",
    price: 19,
    creditsPerMonth: 400,
    maxResolution: "4K",
    features: {
      hasWatermark: false,
      hasBatchMode: true,
      maxBatchSize: 10,
      hasProjects: true,
      hasApiAccess: false,
      hasPriorityQueue: true,
    },
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
  TEAM: {
    name: "Team",
    tier: "TEAM",
    price: 49,
    creditsPerMonth: 1200,
    maxResolution: "4K",
    features: {
      hasWatermark: false,
      hasBatchMode: true,
      maxBatchSize: 10,
      hasProjects: true,
      hasApiAccess: true,
      hasPriorityQueue: true,
    },
    stripePriceId: process.env.STRIPE_PRICE_TEAM,
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

export const PRICING_TABLE = [
  {
    tier: "FREE" as PlanTier,
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
      "No batch generation",
      "No projects",
      "No 2K or 4K",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    tier: "STARTER" as PlanTier,
    name: "Starter",
    price: "$9",
    period: "per month",
    credits: "150 credits/month",
    description: "For regular creators",
    features: [
      "150 credits per month",
      "Up to 2K resolution",
      "1K = 1 credit, 2K = 2 credits",
      "No watermark",
      "Batch mode (up to 4)",
      "All templates",
    ],
    limitations: [
      "No projects",
      "No 4K",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    tier: "PRO" as PlanTier,
    name: "Pro",
    price: "$19",
    period: "per month",
    credits: "400 credits/month",
    description: "For power users",
    features: [
      "400 credits per month",
      "Up to 4K resolution",
      "1K = 1, 2K = 2, 4K = 5 credits",
      "No watermark",
      "Batch mode (up to 10)",
      "Projects & character consistency",
      "Priority generation queue",
    ],
    limitations: [],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    tier: "TEAM" as PlanTier,
    name: "Team",
    price: "$49",
    period: "per month",
    credits: "1,200 credits/month",
    description: "For teams & agencies",
    features: [
      "1,200 credits per month",
      "Everything in Pro",
      "API access",
      "Priority support",
    ],
    limitations: [],
    cta: "Contact Sales",
    highlighted: false,
  },
];
