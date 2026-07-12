/**
 * / — Public Landing Page
 *
 * Server-rendered. No auth required.
 * Auth-aware: shows "Go to Dashboard" for signed-in users, "Get Started" for guests.
 *
 * Conversion paths:
 *   A — Guest Portrait: /portraits/create (no auth)
 *   B — Subscription: /sign-up → plans
 *   C — Style pack gallery from real DB data
 *
 * SEO: full Open Graph, Twitter Card, JSON-LD.
 */

import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PRICING_TABLE } from "@/lib/plans";
import {
  Camera,
  Sparkles,
  Check,
  ArrowRight,
  Zap,
  Palette,
  ShoppingBag,
  Rss,
  Crown,
} from "lucide-react";
import NewsletterSignup from "./NewsletterSignup";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export const metadata: Metadata = {
  title: "ImageCrafter — AI Portrait Studio & Image Generator",
  description:
    "Transform your photo into stunning AI art in seconds. Royal portraits, fantasy scenes, fine art masterpieces — no account needed. Or subscribe for unlimited AI image generation.",
  openGraph: {
    title: "ImageCrafter — AI Portrait Studio",
    description:
      "Transform any photo into stunning AI art. Royal portraits, fantasy scenes, masterpieces. No account needed for guest portraits.",
    url: APP_URL,
    type: "website",
    siteName: "ImageCrafter",
    images: [
      {
        url: `${APP_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "ImageCrafter AI Portrait Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ImageCrafter — AI Portrait Studio",
    description:
      "Transform any photo into stunning AI art. No account needed for guest portraits.",
    images: [`${APP_URL}/og-image.jpg`],
  },
  alternates: { canonical: APP_URL },
};

// JSON-LD structured data
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ImageCrafter",
  url: APP_URL,
  description:
    "AI portrait studio and image generation platform. Transform photos into art.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${APP_URL}/blog?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

// Real before/after pairs — actual production two-step pipeline outputs,
// hosted on R2 CDN (gallery v2: gate-passing P4 regeneration). Not stock, not
// mock. Egyptian is held back (failed the identity acceptance gate) and is
// intentionally absent — never ship a stranger.
const GALLERY_CDN = "https://images.imagecrafter.app/gallery/v2";
const BEFORE_PHOTO = `${GALLERY_CDN}/before/adult-face-thumb.jpg`;
const AFTER_GALLERY = [
  { slug: "renaissance", name: "Renaissance", pack: "Royal Gallery" },
  { slug: "starry-night", name: "Starry Night", pack: "Masterpiece" },
  { slug: "elven", name: "Elven Royalty", pack: "Fantasy Realm" },
  { slug: "comic-hero", name: "Comic Book Hero", pack: "Pop Culture" },
].map((s) => ({ ...s, url: `${GALLERY_CDN}/thumbs/${s.slug}.jpg` }));

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getStylePacks() {
  return prisma.stylePack.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      thumbnailUrl: true,
      isPremium: true,
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { sampleImageUrl: true, name: true },
      },
    },
  });
}

// =============================================================================
// COMPONENTS
// =============================================================================

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    classic: "Classic",
    masterpiece: "Art Masterpiece",
    "time-travel": "Time Travel",
    fantasy: "Fantasy",
    "pop-culture": "Pop Culture",
    "fine-art": "Fine Art",
    custom: "Custom Scene",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/10">
      {labels[category] || category}
    </span>
  );
}

// =============================================================================
// PAGE
// =============================================================================

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  const [stylePacks] = await Promise.all([
    getStylePacks().catch((err) => {
      console.error("StylePack fetch failed:", err);
      return [] as Awaited<ReturnType<typeof getStylePacks>>;
    }),
  ]);

  const paidPlans = PRICING_TABLE.filter((p) => p.tier !== "FREE");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div className="min-h-screen bg-[#06060a] text-white">
        {/* ================================================================
            NAV
        ================================================================ */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#06060a]/80 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg tracking-tight">ImageCrafter</span>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
              <Link href="#portraits" className="hover:text-white transition-colors">
                Portraits
              </Link>
              <Link href="#styles" className="hover:text-white transition-colors">
                Style Packs
              </Link>
              <Link href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all text-sm font-medium"
                >
                  Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ================================================================
            PATH A — HERO: PORTRAIT STUDIO (no auth required)
        ================================================================ */}
        <section
          id="portraits"
          className="pt-32 pb-20 px-6 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
            <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-fuchsia-600/8 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto">
            <div className="text-center mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-sm mb-6">
                <Camera className="w-3.5 h-3.5" />
                No account needed · Instant preview
              </div>

              <h1 className="text-5xl md:text-7xl font-light leading-[1.08] tracking-tight mb-6">
                Transform Your Photo
                <br />
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent font-normal">
                  Into Stunning Art
                </span>
              </h1>

              <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                Upload any photo. Choose an artistic style. Get a museum-quality portrait
                delivered to your door — or download instantly.
                <strong className="text-white/80"> No account required.</strong>
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/portraits/create"
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-lg font-semibold shadow-lg shadow-violet-900/30"
                >
                  <Camera className="w-5 h-5" />
                  Create Your Portrait
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#styles"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/10 transition-all text-base"
                >
                  <Palette className="w-5 h-5 text-white/50" />
                  See All Styles
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-white/40">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  No sign-up needed
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  Preview before you buy
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  Prints delivered worldwide
                </span>
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-green-400" />
                  Museum-quality prints
                </span>
              </div>
            </div>

            {/* Style pack preview grid — top 4 packs */}
            {stylePacks.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                {stylePacks.slice(0, 4).map((pack) => (
                  <Link
                    key={pack.id}
                    href={`/portraits/create?pack=${pack.slug}`}
                    className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pack.thumbnailUrl}
                      alt={pack.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {pack.isPremium && (
                      <div className="absolute top-3 right-3">
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-medium text-sm">{pack.name}</p>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-1">{pack.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            BEFORE / AFTER — real production pipeline outputs
        ================================================================ */}
        <section id="results" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-300 text-sm mb-4">
                <Camera className="w-3.5 h-3.5" />
                Real results — one photo, five styles
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4">
                From One Photo to Any Style
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                Every image below was generated from the single photo on the left —
                the same pipeline your photo goes through.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
              {/* Before */}
              <div className="rounded-2xl overflow-hidden border-2 border-violet-500/50 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BEFORE_PHOTO}
                  alt="Original photo before transformation"
                  className="w-full aspect-[3/4] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <p className="text-xs font-medium text-violet-300">Original photo</p>
                </div>
              </div>

              {/* Afters */}
              {AFTER_GALLERY.map((item) => (
                <div
                  key={item.slug}
                  className="rounded-2xl overflow-hidden border border-white/10 relative group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`${item.name} style portrait generated from the original photo`}
                    className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-white/50">{item.pack}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            PATH C — STYLE PACK GALLERY (active packs)
        ================================================================ */}
        <section id="styles" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 text-fuchsia-300 text-sm mb-4">
                <Palette className="w-3.5 h-3.5" />
                {stylePacks.length} Style Packs
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4">
                Every Style Imaginable
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                From oil painting masters to fantasy realms — upload your photo and see yourself
                transformed in any artistic style.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {stylePacks.map((pack) => (
                <Link
                  key={pack.id}
                  href={`/portraits/create?pack=${pack.slug}`}
                  className="group bg-white/[0.04] rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/50 hover:bg-white/[0.06] transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        pack.variants[0]?.sampleImageUrl || pack.thumbnailUrl
                      }
                      alt={pack.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {pack.isPremium && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs">
                        <Crown className="w-3 h-3" />
                        Premium
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm group-hover:text-violet-300 transition-colors">
                        {pack.name}
                      </h3>
                      <CategoryBadge category={pack.category} />
                    </div>
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                      {pack.tagline}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Create with this style <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/portraits/create"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all font-semibold"
              >
                <Camera className="w-5 h-5" />
                Start Your Portrait — Free Preview
              </Link>
              <p className="text-white/30 text-sm mt-3">
                No account required · Pay only if you love it
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            PATH B — SUBSCRIPTION PLANS
        ================================================================ */}
        <section id="pricing" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-sm mb-4">
                <Zap className="w-3.5 h-3.5" />
                Unlimited AI Image Generation
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-4">
                Create Without Limits
              </h2>
              <p className="text-white/50 max-w-xl mx-auto">
                Subscribers get full access to the AI image generator — templates, batch mode,
                4K resolution, and subscriber discounts on portrait prints.
              </p>
            </div>

            {/* Feature comparison */}
            <div className="mb-12 max-w-2xl mx-auto bg-white/[0.03] rounded-2xl border border-white/10 p-6">
              <h3 className="text-sm font-medium text-white/60 mb-4 uppercase tracking-wider">
                Subscriber advantages
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  "Unlimited template access",
                  "15% off portrait prints",
                  "Batch generate up to 10 images",
                  "Up to 4K resolution",
                  "No watermarks",
                  "Priority generation queue",
                  "Project & character consistency",
                  "Full prompt history",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-white/70">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {paidPlans.map((plan) => (
                <div
                  key={plan.tier}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.highlighted
                      ? "border-violet-500/60 bg-gradient-to-b from-violet-900/20 to-transparent"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-light">{plan.price}</span>
                      <span className="text-white/40 text-sm">/mo</span>
                    </div>
                    <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
                    <p className="text-sm text-white/50">{plan.description}</p>
                  </div>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                        <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.tier === "TEAM" ? "/sign-up" : "/sign-up"}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                        : "bg-white/8 hover:bg-white/12 border border-white/10"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>

            <p className="text-center text-white/30 text-sm mt-6">
              Free plan available · No credit card required to start ·{" "}
              <Link href="/sign-up" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </section>

        {/* ================================================================
            FOOTER
        ================================================================ */}
        <footer className="border-t border-white/5 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <Link href="/" className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-lg">ImageCrafter</span>
                </Link>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                  AI portrait studio and image generation platform. Transform photos into
                  art that you'll treasure forever.
                </p>

                {/* Newsletter signup */}
                <div className="mt-6">
                  <p className="text-sm text-white/60 mb-3">Get AI art tips &amp; tutorials:</p>
                  <NewsletterSignup />
                </div>
              </div>

              {/* Portrait Studio */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-white/80">Portrait Studio</h4>
                <ul className="space-y-2.5 text-sm text-white/50">
                  <li>
                    <Link href="/portraits/create" className="hover:text-white transition-colors">
                      Create a Portrait
                    </Link>
                  </li>
                  {stylePacks.slice(0, 4).map((pack) => (
                    <li key={pack.slug}>
                      <Link
                        href={`/portraits/create?pack=${pack.slug}`}
                        className="hover:text-white transition-colors"
                      >
                        {pack.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Platform */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-white/80">Platform</h4>
                <ul className="space-y-2.5 text-sm text-white/50">
                  <li>
                    <Link href="/sign-up" className="hover:text-white transition-colors">
                      Sign Up Free
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-white transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="hover:text-white transition-colors flex items-center gap-1.5">
                      <Rss className="w-3 h-3" /> Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/sign-in" className="hover:text-white transition-colors">
                      Sign In
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
              <p>© {new Date().getFullYear()} ImageCrafter · Powered by Xenco Labs</p>
              <div className="flex items-center gap-4">
                <Link href="/blog/rss.xml" className="hover:text-white/60 flex items-center gap-1 transition-colors">
                  <Rss className="w-3 h-3" /> RSS
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

