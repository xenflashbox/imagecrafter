/**
 * /portraits — Portrait Studio Landing + Style Pack Gallery
 * PUBLIC — no authentication required.
 */

import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Camera, Check, Download, Palette, Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Portrait Studio — Transform Your Photo Into Art | ImageCrafter",
  description:
    "Upload your photo and receive a stunning AI-generated artistic portrait. Guest checkout — no account required.",
};

async function getStylePacks() {
  return prisma.stylePack.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, sampleImageUrl: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function PortraitsPage() {
  const { userId } = await auth();
  const stylePacks = await getStylePacks();
  // Counted from what is actually shippable, never hardcoded — a style held
  // back for identity failures must not still be advertised.
  const styleCount = stylePacks.reduce((n, p) => n + p.variants.length, 0);
  // Same reason the count is derived: naming styles in prose goes stale the
  // moment the catalog changes.
  const styleNames = stylePacks.flatMap((p) => p.variants.map((v) => v.name));

  const steps = [
    {
      icon: <Camera />,
      title: "Upload your photo",
      desc: "One clear subject — a person or a pet. JPEG, PNG, or WebP up to 25MB.",
    },
    {
      icon: <Palette />,
      title: "Choose your style",
      desc: "Pick the era you want to be painted into. Every style is a different studio setup.",
    },
    {
      icon: <Download />,
      title: "Download or print",
      desc: "Take the high-resolution file, or have a museum-quality print shipped to you.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader
        cta={
          userId ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium transition-all hover:bg-white/15"
            >
              Dashboard <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <Link
              href="/portraits/create"
              className="rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium transition-all hover:brightness-110"
            >
              Upload Your Photo
            </Link>
          )
        }
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-32 pb-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-accent-soft blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-rim bg-accent-soft px-4 py-1.5 text-sm text-ink-muted">
            <Palette className="size-3.5" />
            {styleCount} signature {styleCount === 1 ? "style" : "styles"} · Guest checkout
          </div>
          <h1 className="font-display mb-6 text-5xl leading-[1.05] font-light tracking-tight md:text-6xl">
            Your photo,{" "}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              painted into another era
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-ink-muted">
            Upload one photo with a single clear subject — a person or a pet — and we
            paint them into the scene you choose.
          </p>
          <Link
            href="/portraits/create"
            className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-8 py-4 text-base font-semibold transition-all hover:brightness-110"
          >
            <Camera className="size-5" />
            Create Your Portrait
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="mt-4 text-sm text-ink-faint">
            No account required · From $29.95 · Preview before you buy
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-rim px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-14 text-center text-3xl font-light">
            Three steps to your portrait
          </h2>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {steps.map((item, i) => (
              <div key={item.title} className="flex flex-col items-center text-center">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-rim bg-surface text-accent [&_svg]:size-6">
                  {item.icon}
                </div>
                <div className="mb-2 text-xs font-medium tracking-widest text-ink-faint tabular-nums">
                  STEP {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-medium">{item.title}</h3>
                <p className="max-w-xs text-sm leading-relaxed text-ink-subtle">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Style pack gallery */}
      <section className="border-t border-rim px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-display mb-4 text-3xl font-light">Choose your style</h2>
            <p className="mx-auto max-w-xl text-ink-muted">
              {styleNames.length > 0
                ? `Every pack is a different studio setup — ${styleNames.join(", ")}.`
                : "Style packs are being updated. Check back shortly."}
            </p>
          </div>

          {/* Flex-wrap, not a fixed grid: a partial row stays centred no matter
              how many packs are live. */}
          <div className="flex flex-wrap justify-center gap-6">
            {stylePacks.map((pack) => {
              const hero = pack.variants.find((v) => v.sampleImageUrl?.trim());
              return (
              <Link
                key={pack.id}
                href={`/portraits/create?pack=${pack.slug}`}
                className="group w-full overflow-hidden rounded-2xl border border-rim bg-surface transition-all hover:border-accent-rim sm:w-80"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-raised">
                  {/* One large example, never a mosaic of four unrelated crops.
                      A variant with no sample renders the mark, never an
                      <Image> with an empty src — that is what produced the
                      broken-image icons. */}
                  {hero ? (
                    <Image
                      src={hero.sampleImageUrl}
                      alt={hero.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-faint">
                      <Palette className="size-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-xs font-medium text-ink-muted">
                    {pack.variants.length}{" "}
                    {pack.variants.length === 1 ? "style" : "styles"}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="mb-1 text-lg font-medium">{pack.name}</h3>
                  <p className="mb-2 text-sm font-medium text-accent">{pack.tagline}</p>
                  <p className="line-clamp-2 text-sm text-ink-subtle">{pack.description}</p>
                </div>
              </Link>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-10 py-4 text-base font-semibold transition-all hover:brightness-110"
            >
              <Camera className="size-5" />
              Start Creating — Free Preview
            </Link>
            <p className="mt-4 text-sm text-ink-faint">
              See a watermarked preview free. Purchase to unlock full resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-rim px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-14 text-center text-3xl font-light">
            Simple pricing
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                icon: <Download />,
                title: "Digital Download",
                price: "$29.95",
                note: "One-time purchase",
                items: [
                  "Full resolution (up to 4K)",
                  "No watermark",
                  "Instant delivery via email",
                  "Download up to 5 times",
                  "No account required",
                ],
              },
              {
                icon: <Printer />,
                title: "Art Print",
                price: "from $49.95",
                note: "Multiple sizes · Free US shipping",
                items: [
                  "Museum-quality print",
                  "Canvas, framed, or art print",
                  "Ships worldwide",
                  "Tracking included",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.title}
                className="rounded-2xl border border-rim bg-surface p-6"
              >
                <div className="mb-4 flex items-center gap-3 text-accent [&_svg]:size-5">
                  {tier.icon}
                  <h3 className="text-lg font-medium text-ink">{tier.title}</h3>
                </div>
                <div className="mb-1 text-4xl font-light">{tier.price}</div>
                <p className="mb-6 text-sm text-ink-faint">{tier.note}</p>
                <ul className="flex flex-col gap-2.5 text-sm text-ink-muted">
                  {tier.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-positive" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-rim px-6 py-20 text-center">
        <h2 className="font-display mb-4 text-4xl font-light">
          Ready to create your portrait?
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-ink-muted">
          See your free watermarked preview. No account needed.
        </p>
        <Link
          href="/portraits/create"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-2 px-10 py-4 text-base font-semibold transition-all hover:brightness-110"
        >
          <Camera className="size-5" />
          Upload Your Photo Now
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
