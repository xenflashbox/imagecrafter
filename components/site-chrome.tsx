/**
 * Shared site chrome — the one nav and footer every page wears.
 *
 * No server imports, so both the server-rendered marketing page and the
 * client-side wizard can use it. Auth-aware controls are passed in as `cta` by
 * whichever page knows the auth state.
 */

import Link from "next/link";
import { Rss } from "lucide-react";
import { ArchMark } from "@/components/arch-mark";
import { MobileNav, type NavLink } from "@/components/mobile-nav";
import { LEGAL_LINKS } from "@/lib/legal";

const NAV_LINKS: NavLink[] = [
  { href: "/#styles", label: "Styles" },
  { href: "/#results", label: "Results" },
  { href: "/memorial", label: "Memorial" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function Wordmark({
  size = "md",
  href = "/",
}: {
  size?: "sm" | "md";
  href?: string;
}) {
  const box = size === "sm" ? "size-7" : "size-8";
  const text = size === "sm" ? "text-base" : "text-lg";
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2">
      <ArchMark className={`${box} rounded-md`} />
      <span className={`font-semibold ${text}`}>ImageCrafter</span>
    </Link>
  );
}

export function SiteHeader({
  cta,
  links = true,
}: {
  cta?: React.ReactNode;
  links?: boolean;
}) {
  return (
    <nav aria-label="Main navigation" className="chrome-veil fixed top-0 left-0 right-0 z-50 border-b border-rim">
      <div className="max-w-6xl mx-auto min-h-[68px] px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <Wordmark />

        {links && (
          <div className="hidden lg:flex items-center gap-5 text-sm text-ink-muted">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-ink transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex min-w-0 items-center gap-2">
          {cta}
          <MobileNav links={[...NAV_LINKS, { href: "/sign-in", label: "My account" }]} />
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rim py-10 px-6 mt-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Wordmark size="sm" />
          <span>© {new Date().getFullYear()} · Powered by Xenco Labs</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/#styles" className="hover:text-ink-muted transition-colors">
            Styles
          </Link>
          <Link href="/blog" className="hover:text-ink-muted transition-colors">Blog</Link>
          <Link href="/memorial" className="hover:text-ink-muted transition-colors">
            Memorial
          </Link>
          <Link href="/#pricing" className="hover:text-ink-muted transition-colors">
            Pricing
          </Link>
          <Link
            href="/blog/rss.xml"
            className="hover:text-ink-muted flex items-center gap-1 transition-colors"
          >
            <Rss className="size-3" /> RSS
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-rim pt-6 text-xs text-ink-faint md:justify-end">
        {LEGAL_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="hover:text-ink-muted transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
