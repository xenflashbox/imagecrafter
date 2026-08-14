/**
 * /portraits — Portrait Studio Landing + Style Pack Gallery
 * PUBLIC — no authentication required.
 */

import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Portrait Studio — Transform Your Photo Into Art | ImageCrafter",
  description:
    "Upload your photo and receive a stunning AI-generated artistic portrait in five signature styles — Renaissance royalty, Starry Night, Ancient Egyptian, Elven fantasy, and comic book hero. Guest checkout — no account required.",
};

async function getStylePacks() {
  return prisma.stylePack.findMany({
    where: { isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
        select: { id: true, name: true, sampleImageUrl: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function PortraitsPage() {
  const stylePacks = await getStylePacks();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-24 px-4">
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
            ✨ 5 signature styles · Guest checkout · Digital + Print
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Your Photo,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Transformed Into Art
            </span>
          </h1>
          <p className="mb-8 text-xl text-white/70 max-w-2xl mx-auto">
            Upload a photo with one clear subject — person or pet — and our AI transforms
            it into a stunning artistic portrait. Choose from Renaissance, Starry Night,
            Ancient Egyptian, Elven, and Comic Book Hero styles.
          </p>
          <Link
            href="/portraits/create"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-slate-900 hover:bg-white/90 transition-colors"
          >
            📷 Create Your Portrait
          </Link>
          <p className="mt-4 text-sm text-white/50">
            No account required · From $29.95 · Delivered in seconds
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">
            Three steps to your portrait
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "📷", title: "Upload your photo", desc: "Any photo with one clear subject — a person or pet. JPEG or PNG up to 10MB." },
              { step: "2", icon: "🎨", title: "Choose your style", desc: "Pick from five signature styles — Renaissance royalty to comic book hero." },
              { step: "3", icon: "⬇️", title: "Download or print", desc: "Get your portrait as a high-res digital download or order a museum-quality print." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-3xl">
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

      {/* Style Pack Gallery */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Choose your style</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From classical oil paintings to anime and fantasy — every pack includes multiple
              style variants to find your perfect look.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stylePacks.map((pack) => (
              <div
                key={pack.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300"
              >
                {/* Sample image grid */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {pack.variants.length > 0 ? (
                    <div className="grid grid-cols-2 h-full">
                      {pack.variants.slice(0, 4).map((variant) => (
                        <div key={variant.id} className="relative overflow-hidden bg-slate-200">
                          <Image
                            src={variant.sampleImageUrl}
                            alt={variant.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">🎨</div>
                  )}
                  {pack.isPremium && (
                    <div className="absolute top-3 right-3 rounded-full bg-amber-500 px-2 py-1 text-xs font-semibold text-white">
                      ✨ Premium
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white text-xs font-medium">
                    {pack.variants.length} styles
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{pack.name}</h3>
                  <p className="text-sm text-purple-600 font-medium mb-2">{pack.tagline}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{pack.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-10 py-4 text-base font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              📷 Start Creating — Free Preview
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              See a watermarked preview free. Purchase to unlock full resolution.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-12">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-purple-200 p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⬇️</span>
                <h3 className="text-xl font-bold text-slate-900">Digital Download</h3>
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-1">$29.95</div>
              <p className="text-sm text-slate-500 mb-6">One-time purchase</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {["Full-resolution (up to 4K)", "No watermark", "Instant delivery via email", "Download up to 5 times", "No account required"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-amber-200 p-6 bg-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🖨️</span>
                <h3 className="text-xl font-bold text-slate-900">Art Print</h3>
              </div>
              <div className="text-4xl font-bold text-slate-900 mb-1">from $49.95</div>
              <p className="text-sm text-slate-500 mb-6">Multiple sizes · Free US shipping</p>
              <ul className="space-y-2 text-sm text-slate-700">
                {["Museum-quality print", "Canvas, framed, or art print", "Ships worldwide", "Tracking included"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-600 to-pink-600 text-white text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to create your portrait?</h2>
        <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
          See your free watermarked preview in under 30 seconds. No account needed.
        </p>
        <Link
          href="/portraits/create"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-base font-semibold text-purple-600 hover:bg-white/90 transition-colors"
        >
          📷 Upload Your Photo Now
        </Link>
      </section>
    </div>
  );
}
