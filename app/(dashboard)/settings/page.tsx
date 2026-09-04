/**
 * /settings — server shell.
 *
 * The page itself is a client component (Clerk's useUser + the live credit
 * balance), so pack prices are read from Stripe here and handed down as
 * already-rendered cards.
 */

import { CreditPackCards } from "@/components/credit-pack-cards";
import { getPackCatalog, getPrice, DIGITAL_SKU } from "@/lib/services/pricing";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [packs, single] = await Promise.all([getPackCatalog(), getPrice(DIGITAL_SKU)]);

  return (
    <SettingsClient
      packCards={
        <CreditPackCards packs={packs} singlePriceCents={single.unitAmount} theme="dark" />
      }
    />
  );
}
