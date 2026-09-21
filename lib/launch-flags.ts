// Enable only after a real print order passes fulfillment and delivery checks.
export const printCheckoutEnabled = () => process.env.PRINT_CHECKOUT_ENABLED === "true";
