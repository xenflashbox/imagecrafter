/**
 * The facts every legal page quotes. One place, so the operator name, contact
 * address and effective date can never disagree between Terms and Privacy.
 */

export const LEGAL = {
  service: "ImageCrafter",
  operator: "Xenco Labs",
  site: "imagecrafter.app",
  contactEmail: "hello@imagecrafter.app",
  /**
   * Street, city/state/zip, country — one entry per line. Stripe and the card
   * networks expect a reachable postal address on the contact page; until the
   * real one is here the block is omitted rather than invented.
   */
  postalAddress: [] as readonly string[],
  /** Bump when the substance changes — not for typo fixes. */
  effective: "September 18, 2026",
} as const;

export const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
] as const;
