/**
 * /portraits — Portrait Studio Landing + Style Pack Gallery
 *
 * PUBLIC PAGE — no authentication required.
 * Serves both guests browsing and subscribers navigating from dashboard.
 * Primary conversion point: "Create Your Portrait" CTA.
 */

import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Camera, Palette, Download, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Portrait Studio — Transform Your Photo Into Art | ImageCrafter",
  description:
    "Upload your photo and receive a stunning AI-generated artistic portrait in 50+ styles. Oil paintings, anime, fantasy, masterpieces. Guest checkout — no account required.",
  openGraph: {
    title: "Portrait Studio — Transform Your Photo Into Art",
    description: "Upload your photo → choose a style → get a stunning portrait in seconds.",
    images: [{ url: "https://images.imagecrafter.app/og/portrait-studio.jpg" }],
  },
};

// Category display config
const CATEGORIES = [
  { slug: "classic", label: "Classic" },
  { slug: "masterpiece", label: "Masterpiece" },
  { slug: "time-travel", label: "Time Travel" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "pop-culture", label: "Pop Culture" },
  { slug: "fine-art", label: "Fine Art" },
  { slug: "custom", label: "Custom Scene" },
];

async function getStylePacks() {
  return prisma.stylePack.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
        select: {
          id: true,
          name: true,
          sampleImageUrl: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function PortraitsPage() {
  const stylePacks = await getStylePacks();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-24 px-4">
        <div className="absolute inset-0 bg-[url('/portraits/hero-bg.jpg')] bg-cover bg-center opacity-10" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
            <Sparkles className="h-4 w-4" />
            50+ artistic styles · Guest checkout · Digital + Print
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Your Photo,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Transformed Into Art
            </span>
          </h1>
          <p className="mb-8 text-xl text-white/70 max-w-2xl mx-auto">
            Upload your photo — pet, person, family — and our AI transforms it into a
            stunning artistic portrait. Choose from oil paintings, masterpieces,
            fantasy art, anime, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-slate-900 hover:bg-white/90 text-base px-8">
              <Link href="/portraits/create">
                <Camera className="mr-2 h-5 w-5" />
                Create Your Portrait
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-white/50">
            No account required · From $14.95 · Delivered in seconds
          </p>
        </div>
      </section>

      {/* ── How it Works ────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">
            Three steps to your portrait
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <Camera className="h-8 w-8" />,
                title: "Upload your photo",
                desc: "Any photo with a clear subject — pet, person, family. JPEG or PNG up to 10MB.",
              },
              {
                step: "2",
                icon: <Palette className="h-8 w-8" />,
                title: "Choose your style",
                desc: "Pick from 50+ artistic styles across 7 style packs. Oil paintings, anime, fantasy, and more.",
              },
              {
                step: "3",
                icon: <Download className="h-8 w-8" />,
                title: "Download or print",
                desc: "Get your portrait as a high-res digital download or order a museum-quality print.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  {item.icon}
                </div>
                <div className="mb-2 text-4xl font-bold text-purple-200">{item.step}</div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Style Pack Gallery ───────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Choose your style
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From classical oil paintings to anime and fantasy — every pack includes
              multiple style variants to find your perfect look.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stylePacks.map((pack) => (
              <Card
                key={pack.id}
                className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* Sample image grid */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {pack.variants.length > 0 ? (
                    <div className="grid grid-cols-2 h-full">
                      {pack.variants.slice(0, 4).map((variant, i) => (
                        <div key={variant.id} className="relative overflow-hidden">
                          <Image
                            src={variant.sampleImageUrl}
                            alt={variant.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={() => {}}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Palette className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  {pack.isPremium && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500 text-white text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-xs font-medium">
                      {pack.variants.length} styles
                    </p>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{pack.name}</h3>
                  <p className="text-sm text-purple-600 font-medium mb-2">{pack.tagline}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{pack.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" asChild className="bg-purple-600 hover:bg-purple-700 text-base px-10">
              <Link href="/portraits/create">
                <Camera className="mr-2 h-5 w-5" />
                Start Creating — Free Preview
              </Link>
            </Button>
            <p className="mt-3 text-sm text-slate-500">
              See a watermarked preview free. Purchase to unlock full resolution.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">
            Simple pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-purple-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Download className="h-6 w-6 text-purple-600" />
                <h3 className="text-xl font-bold text-slate-900">Digital Download</h3>
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-1">$14.95</div>
              <p className="text-sm text-slate-500 mb-6">One-time purchase</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Full-resolution (up to 4K)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> No watermark
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Instant delivery via email
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Download up to 5 times
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> No account required
                </li>
              </ul>
            </Card>

            <Card className="border-2 border-amber-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-6 w-6 text-amber-600" />
                <h3 className="text-xl font-bold text-slate-900">Art Print</h3>
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-1">
                from $29.95
              </div>
              <p className="text-sm text-slate-500 mb-6">Multiple sizes available</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Museum-quality print
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Canvas, framed, or art print
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Ships worldwide
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Tracking included
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-500">★</span> Subscribers save 15%
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-pink-600 text-white text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to create your portrait?</h2>
        <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
          See your free watermarked preview in under 30 seconds. No account needed.
        </p>
        <Button
          size="lg"
          asChild
          className="bg-white text-purple-600 hover:bg-white/90 text-base px-10"
        >
          <Link href="/portraits/create">
            <Camera className="mr-2 h-5 w-5" />
            Upload Your Photo Now
          </Link>
        </Button>
      </section>
    </div>
  );
}
