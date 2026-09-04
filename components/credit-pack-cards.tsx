/**
 * Credit pack cards — links to /api/packs/checkout (Clerk sign-in enforced
 * there). Themable for the light preview page and dark success/marketing
 * pages.
 *
 * Presentational only: prices arrive as props so this can be rendered from a
 * client page too. Callers read them from Stripe via lib/services/pricing.ts.
 */

// Type-only: importing a value from pricing.ts would drag the Stripe SDK into
// any client bundle that renders these cards.
import type { PackPrice } from "@/lib/services/pricing";

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PACK_BADGES: Record<string, string | undefined> = {
  "PACK-10": "Most Popular",
};

export function CreditPackCards({
  packs,
  singlePriceCents,
  theme = "light",
}: {
  packs: PackPrice[];
  singlePriceCents: number;
  theme?: "light" | "dark";
}) {
  const dark = theme === "dark";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {packs.map((pack) => {
        const perPortrait = pack.unitAmount / pack.credits;
        const savingsPct = Math.round((1 - perPortrait / singlePriceCents) * 100);
        const badge = PACK_BADGES[pack.sku];
        return (
          <a
            key={pack.sku}
            href={`/api/packs/checkout?sku=${pack.sku}`}
            className={`relative rounded-xl border p-4 text-center transition-colors ${
              dark
                ? "border-white/15 bg-white/5 hover:border-purple-400/60"
                : "border-slate-200 bg-white hover:border-purple-400"
            }`}
          >
            {badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-0.5 text-[11px] font-semibold text-white whitespace-nowrap">
                {badge}
              </span>
            )}
            <div className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
              {pack.credits} Portraits
            </div>
            <div className={`text-xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
              {usd(pack.unitAmount)}
            </div>
            <div className={`text-xs ${dark ? "text-purple-300" : "text-purple-600"}`}>
              {usd(perPortrait)} each · Save {savingsPct}%
            </div>
          </a>
        );
      })}
    </div>
  );
}
