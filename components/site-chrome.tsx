/**
 * Shared site chrome — the one nav and footer every page wears.
 *
 * Presentational only (no hooks, no server imports) so both the server-rendered
 * marketing page and the client-side wizard can use it. Auth-aware controls are
 * passed in as `cta` by whichever page knows the auth state.
 */

import Link from "next/link";
import { Sparkles, Rss } from "lucide-react";

export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-7" : "size-8";
  const text = size === "sm" ? "text-base" : "text-lg";
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div
        className={`${box} rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center`}
      >
        <Sparkles className="size-4 text-white" />
      </div>
      <span className={`font-semibold ${text} tracking-tight`}>ImageCrafter</span>
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
    <nav className="chrome-veil fixed top-0 left-0 right-0 z-50 border-b border-rim">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Wordmark />

        {links && (
          <div className="hidden md:flex items-center gap-6 text-sm text-ink-muted">
            <Link href="/portraits" className="hover:text-ink transition-colors">
              Styles
            </Link>
            <Link href="/#results" className="hover:text-ink transition-colors">
              Results
            </Link>
            <Link href="/#pricing" className="hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="hover:text-ink transition-colors">
              Blog
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">{cta}</div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-rim py-10 px-6 mt-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
        <div className="flex items-center gap-4">
          <Wordmark size="sm" />
          <span>© {new Date().getFullYear()} · Powered by Xenco Labs</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/portraits" className="hover:text-ink-muted transition-colors">
            Styles
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
    </footer>
  );
}
