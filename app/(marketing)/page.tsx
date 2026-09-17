/**
 * / — Public Landing Page
 *
 * Server-rendered. No auth required.
 * Auth-aware: shows "Go to Dashboard" for signed-in users, "Get Started" for guests.
 *
 * Conversion paths:
 *   A — Guest Portrait: /portraits/create (no auth)
 *   B — Credit packs: /api/packs/checkout (sign-in enforced there)
 *   C — Style pack gallery from real DB data
 *
 * SEO: full Open Graph, Twitter Card, JSON-LD.
 */

import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CreditPackCards } from "@/components/credit-pack-cards";
import { getPackCatalog, getPrice, formatUsd, DIGITAL_SKU } from "@/lib/services/pricing";
import type { CatalogPrice, PackPrice } from "@/lib/services/pricing";
import {
  Camera,
  Check,
  ArrowRight,
  Zap,
  Palette,
  ShoppingBag,
  Rss,
} from "lucide-react";
import { SiteHeader, Wordmark } from "@/components/site-chrome";
import NewsletterSignup from "./NewsletterSignup";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export const metadata: Metadata = {
  title: "ImageCrafter — AI Portrait Studio & Image Generator",
  description:
    "Turn your photo — or your pet's — into a portrait that actually looks like them. Royal portraits, fine art, 70s disco. No account needed. Pay only if you love it.",
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

/** AggregateOffer for the real, Stripe-sourced catalog. */
function offersSchema(digital: CatalogPrice, packs: PackPrice[]) {
  const all = [digital, ...packs];
  const amounts = all.map((p) => p.unitAmount);
  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: (Math.min(...amounts) / 100).toFixed(2),
    highPrice: (Math.max(...amounts) / 100).toFixed(2),
    offerCount: String(all.length),
    offers: all.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: (p.unitAmount / 100).toFixed(2),
      priceCurrency: "USD",
      description: p.credits
        ? `${p.credits} portrait credits — never expire`
        : "One portrait — full 4K digital download, no watermark",
    })),
  };
}

// Real before/after pairs — actual production two-step pipeline outputs,
// hosted on R2 CDN (gallery v4, uploaded by scripts/gallery/upload-pets.ts).
// Not stock, not mock. Pets lead: they are the strongest renders we have and
// the biggest winnable search terms (dog painting 5.9k, cat portrait 2.9k).
const GALLERY_CDN = "https://images.imagecrafter.app/gallery/v4";
const STYLE_LABELS = [
  { slug: "oil-painting", name: "Oil Painting", pack: "Fine Art" },
  { slug: "baroque", name: "Baroque", pack: "Royal Gallery" },
  { slug: "disco", name: "Disco", pack: "Time Traveler" },
];

function showcase(subject: string, label: string) {
  return {
    subject,
    label,
    before: `${GALLERY_CDN}/before/${subject}.jpg`,
    afters: STYLE_LABELS.map((s) => ({
      ...s,
      url: `${GALLERY_CDN}/after/${subject}--${s.slug}.jpg`,
    })),
  };
}

const SHOWCASE = [
  showcase("d-dog-corgi", "Corgi"),
  showcase("d-cat-orange", "Orange tabby"),
  showcase("d-dog-terrier-scruffy", "Terrier"),
  showcase("d-woman-20s-braids", "Portrait"),
  showcase("d-man-50s-beard", "Portrait"),
  showcase("d-woman-60s-silver", "Portrait"),
];

// The hero pair. Corgi → Baroque is the single strongest render in the set.
const HERO = SHOWCASE[0];
const HERO_AFTER = HERO.afters[1];

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
    <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-ink-subtle border border-rim">
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

  // No catch-and-render-empty: the gallery IS the homepage. A dead DB must
  // surface as an error, never as a homepage with a silently missing
  // gallery (fail-open audit, fix directive P1#3).
  const stylePacks = await getStylePacks();
  const [packs, digital] = await Promise.all([getPackCatalog(), getPrice(DIGITAL_SKU)]);

  // Priced structured data lives here, not in the layout: this page is
  // force-dynamic, so it can read Stripe. Amounts must never be literals.
  const offerSchema = offersSchema(digital, packs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />

      <div className="min-h-screen bg-canvas text-ink">
        <SiteHeader
          cta={
            isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm font-medium transition-all hover:bg-surface"
              >
                Dashboard <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden text-sm text-ink-muted transition-colors hover:text-ink sm:block"
                >
                  Sign In
                </Link>
                <Link
                  href="/portraits/create"
                  className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium transition-all hover:brightness-110"
                >
                  Upload Your Photo
                </Link>
              </>
            )
          }
        />

        {/* ================================================================
            PATH A — HERO: PORTRAIT STUDIO (no auth required)
        ================================================================ */}
        <section
          id="portraits"
          className="pt-32 pb-20 px-6 relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent-soft rounded-full blur-3xl" />
            <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-accent-soft rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-6xl mx-auto">
            <div className="text-center mb-16">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft border border-accent-rim text-accent text-sm mb-6">
                <Camera className="w-3.5 h-3.5" />
                No account needed · Instant preview
              </div>

              <h1 className="font-display text-5xl md:text-7xl font-light leading-[1.08] tracking-tight mb-6">
                Your Pet, Painted
                <br />
                <span className="italic text-accent">Like a Masterpiece</span>
              </h1>

              <p className="text-xl text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
                Upload one photo of your dog, cat — or anyone you love. Choose a style.
                Get a museum-quality portrait delivered to your door, or download instantly.
                <strong className="text-ink-muted"> No account required.</strong>
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/portraits/create"
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent text-canvas hover:opacity-90 transition-all text-lg font-semibold shadow-lg shadow-rim-strong"
                >
                  <Camera className="w-5 h-5" />
                  Create Your Portrait
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#styles"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-surface hover:bg-surface border border-rim transition-all text-base"
                >
                  <Palette className="w-5 h-5 text-ink-subtle" />
                  See All {stylePacks.length} Styles
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-ink-subtle">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-positive" />
                  No sign-up needed
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-positive" />
                  Preview before you buy
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-positive" />
                  Prints delivered worldwide
                </span>
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-positive" />
                  Museum-quality prints
                </span>
              </div>
            </div>

            {/* The art is the product — show it big, once, above the fold.
                The full pack grid lives at #styles; four thumbnails here only
                shrank the one thing worth looking at. */}
            <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-6 lg:gap-10 max-w-5xl mx-auto">
              <figure className="w-52 sm:w-60 lg:w-72 shrink-0">
                <div className="artframe relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO.before}
                    alt="Original snapshot of a corgi, taken on a phone"
                    className="w-full aspect-[3/4] object-cover"
                  />
                </div>
                <figcaption className="mt-3 text-center text-sm text-ink-subtle">
                  Their photo
                </figcaption>
              </figure>

              <ArrowRight className="hidden lg:block w-8 h-8 mb-24 text-accent shrink-0" />

              {/* The finished piece is deliberately the largest thing on the
                  page, and the only one that gets the mat. */}
              <figure className="w-72 sm:w-[26rem] lg:w-[32rem] shrink-0">
                <div className="artframe artframe-matted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_AFTER.url}
                    alt={`The same corgi rendered as a ${HERO_AFTER.name} portrait`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                </div>
                <figcaption className="mt-4 text-center text-sm">
                  <span className="font-display text-base italic text-accent">
                    {HERO_AFTER.name}
                  </span>
                  <span className="text-ink-subtle"> · about a minute later</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ================================================================
            BEFORE / AFTER — real production pipeline outputs
        ================================================================ */}
        <section id="results" className="py-24 px-6 border-t border-rim">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-rim text-positive text-sm mb-4">
                <Camera className="w-3.5 h-3.5" />
                Real results — one photo, {stylePacks.length} styles to choose from
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-4">
                From One Photo to Any Style
              </h2>
              <p className="text-ink-subtle max-w-xl mx-auto">
                Every portrait below came from the single snapshot beside it —
                the same pipeline your photo goes through.
              </p>
            </div>

            <div className="flex flex-col gap-14">
              {SHOWCASE.map((row, rowIndex) => (
                <div key={row.subject}>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                    {/* Before */}
                    <figure>
                      <div className="artframe relative overflow-hidden border-accent-rim">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.before}
                          alt={`${row.label} — the original photo`}
                          loading={rowIndex === 0 ? undefined : "lazy"}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      </div>
                      <figcaption className="mt-2 text-xs text-accent font-medium">
                        {row.label} — their photo
                      </figcaption>
                    </figure>

                    {/* Afters */}
                    {row.afters.map((item) => (
                      <figure key={item.slug} className="group">
                        <div className="artframe relative overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`${row.label} rendered as a ${item.name} portrait`}
                            loading="lazy"
                            className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <figcaption className="mt-2 text-xs">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-ink-subtle"> · {item.pack}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            PATH C — STYLE PACK GALLERY (active packs)
        ================================================================ */}
        <section id="styles" className="py-24 px-6 border-t border-rim">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft border border-accent-rim text-accent text-sm mb-4">
                <Palette className="w-3.5 h-3.5" />
                {stylePacks.length} Style Packs
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-4">
                Every Style Imaginable
              </h2>
              <p className="text-ink-subtle max-w-xl mx-auto">
                From oil painting masters to fantasy realms — upload your photo and see yourself
                transformed in any artistic style.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-5">
              {stylePacks.map((pack) => {
                // An empty src renders a broken-image icon, so fall through to
                // the mark instead.
                const hero =
                  pack.variants.find((v) => v.sampleImageUrl?.trim())?.sampleImageUrl ||
                  pack.thumbnailUrl?.trim();
                return (
                <Link
                  key={pack.id}
                  href={`/portraits/create?pack=${pack.slug}`}
                  className="group w-full sm:w-64 rounded-2xl border border-rim bg-surface overflow-hidden hover:border-accent-rim transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[3/4] relative overflow-hidden bg-surface-raised">
                    {hero ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={hero}
                        alt={pack.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-ink-faint">
                        <Palette className="size-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm group-hover:text-accent transition-colors">
                        {pack.name}
                      </h3>
                      <CategoryBadge category={pack.category} />
                    </div>
                    <p className="text-xs text-ink-subtle line-clamp-2 leading-relaxed">
                      {pack.tagline}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Create with this style <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/portraits/create"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-accent text-canvas hover:opacity-90 transition-all font-semibold"
              >
                <Camera className="w-5 h-5" />
                Start Your Portrait — Free Preview
              </Link>
              <p className="text-ink-faint text-sm mt-3">
                No account required · Pay only if you love it
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            PATH B — PRICING (real catalog: single portrait + credit packs)
        ================================================================ */}
        <section id="pricing" className="py-24 px-6 border-t border-rim">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-soft border border-accent-rim text-accent text-sm mb-4">
                <Zap className="w-3.5 h-3.5" />
                Simple One-Time Pricing
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-4">
                Pay Per Portrait
              </h2>
              <p className="text-ink-subtle max-w-xl mx-auto">
                No subscription. Create your portrait free, preview it, and pay only if
                you love it — full 4K digital download, no watermark.
              </p>
            </div>

            {/* Single portrait */}
            <div className="mb-12 max-w-2xl mx-auto rounded-2xl border border-accent-rim bg-surface p-8 text-center">
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <span className="text-4xl font-light">{formatUsd(digital.unitAmount)}</span>
                <span className="text-ink-subtle text-sm">one-time</span>
              </div>
              <h3 className="text-lg font-medium mb-4">Single Portrait</h3>
              <ul className="space-y-2.5 mb-8 max-w-xs mx-auto text-left">
                {[
                  "Full 4K digital download",
                  "No watermark",
                  "Museum-quality prints & canvases available",
                  "Preview before you pay",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/portraits/create"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium text-sm bg-accent text-canvas hover:opacity-90 transition-all"
              >
                Create Your Portrait
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Credit packs */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-sm font-medium text-ink-muted mb-5 uppercase tracking-wider text-center">
                Creating more than one? Save with credit packs
              </h3>
              <CreditPackCards
                packs={packs}
                singlePriceCents={digital.unitAmount}
               
              />
              <p className="text-center text-ink-faint text-sm mt-6">
                Credits never expire · Each credit unlocks one full 4K portrait download
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            FOOTER
        ================================================================ */}
        <footer className="border-t border-rim py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-10 mb-12">
              {/* Brand */}
              <div className="md:col-span-2">
                <div className="mb-4">
                  <Wordmark />
                </div>
                <p className="text-ink-subtle text-sm leading-relaxed max-w-xs">
                  AI portrait studio and image generation platform. Transform photos into
                  art that you'll treasure forever.
                </p>

                {/* Newsletter signup */}
                <div className="mt-6">
                  <p className="text-sm text-ink-muted mb-3">Get AI art tips &amp; tutorials:</p>
                  <NewsletterSignup />
                </div>
              </div>

              {/* Portrait Studio */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-ink-muted">Portrait Studio</h4>
                <ul className="space-y-2.5 text-sm text-ink-subtle">
                  <li>
                    <Link href="/portraits/create" className="hover:text-ink transition-colors">
                      Create a Portrait
                    </Link>
                  </li>
                  {stylePacks.slice(0, 4).map((pack) => (
                    <li key={pack.slug}>
                      <Link
                        href={`/portraits/create?pack=${pack.slug}`}
                        className="hover:text-ink transition-colors"
                      >
                        {pack.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Platform */}
              <div>
                <h4 className="text-sm font-semibold mb-4 text-ink-muted">Platform</h4>
                <ul className="space-y-2.5 text-sm text-ink-subtle">
                  <li>
                    <Link href="/sign-up" className="hover:text-ink transition-colors">
                      Sign Up Free
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-ink transition-colors">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href="/blog" className="hover:text-ink transition-colors flex items-center gap-1.5">
                      <Rss className="w-3 h-3" /> Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/sign-in" className="hover:text-ink transition-colors">
                      Sign In
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-rim pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
              <p>© {new Date().getFullYear()} ImageCrafter · Powered by Xenco Labs</p>
              <div className="flex items-center gap-4">
                <Link href="/blog/rss.xml" className="hover:text-ink flex items-center gap-1 transition-colors">
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

