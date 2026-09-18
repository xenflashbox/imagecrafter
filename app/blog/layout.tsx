/**
 * Chrome for every blog route — index, post, author archive.
 *
 * The nav is `fixed`, so the padding here is what keeps the first band of each
 * page out from under it. Without this layout the blog was a dead end: no
 * header, no footer, no way back to the storefront.
 */

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader
        cta={
          userId ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-sm border border-rim-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
            >
              Dashboard <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              href="/portraits/create"
              className="whitespace-nowrap rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
            >
              Begin<span className="hidden sm:inline"> a portrait</span>
            </Link>
          )
        }
      />
      <div className="pt-[69px]">{children}</div>
      <SiteFooter />
    </div>
  );
}
