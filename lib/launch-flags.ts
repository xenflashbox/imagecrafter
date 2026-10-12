// Print checkout can be explicitly disabled during an incident. Otherwise it is
// live when Gelato is configured; the account-level Gelato fulfilment path was
// accepted as already verified on 2026-10-12.
export const printCheckoutEnabled = () =>
  process.env.PRINT_CHECKOUT_ENABLED === "true" ||
  (
    process.env.PRINT_CHECKOUT_ENABLED !== "false" &&
    Boolean(process.env.GELATO_API_KEY && process.env.GELATO_STORE_ID)
  );
