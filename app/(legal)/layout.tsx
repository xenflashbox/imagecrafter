/**
 * Chrome and measure for the legal pages. A route group so /terms, /privacy,
 * /refunds and /contact stay at the top level of the URL — where a customer,
 * a card network and Stripe all expect to find them.
 */

import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { LEGAL, LEGAL_LINKS } from "@/lib/legal";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader
        cta={
          <Link
            href="/portraits/create"
            className="whitespace-nowrap rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
          >
            Begin<span className="hidden sm:inline"> a portrait</span>
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl px-6 pt-32 pb-20">
        {children}

        <nav className="mt-16 flex flex-wrap gap-x-5 gap-y-2 border-t border-rim pt-6 text-xs text-ink-faint">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink-muted">
              {l.label}
            </Link>
          ))}
          <span className="ml-auto">Last updated {LEGAL.effective}</span>
        </nav>
      </div>

      <SiteFooter />
    </div>
  );
}
