import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { GalleryShareButton, PublicGallery } from "@/components/public-gallery";
import { SocialProfileShowcase } from "@/components/social-profile-showcase";
import { galleryVoterKey, getPublicGalleryPage } from "@/lib/services/public-gallery";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

export const metadata: Metadata = {
  title: { absolute: "Pet Portrait Gallery | ImageCrafter" },
  description:
    "Real unpaid pet previews made on ImageCrafter. See the uploaded pet photo beside the generated portrait, then make your own free preview.",
  alternates: { canonical: `${APP_URL}/gallery` },
  openGraph: {
    title: "Real pet portrait before-and-afters",
    description:
      "Browse real free pet previews from ImageCrafter: original pet photos beside the finished AI portrait.",
    url: `${APP_URL}/gallery`,
    type: "website",
    siteName: "ImageCrafter",
  },
};

export default async function PublicGalleryPage() {
  const visitorId = (await cookies()).get("gallery_visitor_id")?.value;
  const page = await getPublicGalleryPage({
    voterKey: visitorId ? galleryVoterKey(visitorId) : null,
  });
  const portraits = page.items.map((portrait) => ({
    ...portrait,
    createdAt: portrait.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen overflow-x-hidden bg-canvas text-ink">
      <SiteHeader
        cta={
          <Link
            href="/portraits/create?utm_source=gallery&utm_medium=owned&utm_campaign=public_gallery"
            className="inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
          >
            Make yours
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pt-28 pb-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 border-y border-rim py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Sparkles className="size-3.5" />
            Real pet previews
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-light leading-[1.02] text-ink sm:text-6xl sm:leading-[0.95] lg:text-7xl">
            Before photos, finished portraits.
          </h1>
        </div>
        <div className="min-w-0 max-w-xl lg:pb-2">
          <p className="text-lg leading-8 text-ink-muted">
            These are unpaid pet previews created on ImageCrafter. The original
            upload sits beside the watermarked result so you can judge the
            transformation before making your own.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Link
              href="/portraits/create?utm_source=gallery&utm_medium=owned&utm_campaign=public_gallery"
              className="inline-flex items-center justify-center gap-3 rounded-sm bg-accent px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Create a free preview
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/pet-portraits"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-rim px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-rim-strong hover:bg-surface"
            >
              Pet portrait offer
            </Link>
            <GalleryShareButton />
          </div>
        </div>
      </section>

      <SocialProfileShowcase />

      <section className="mx-auto max-w-6xl px-6 py-20">
        {portraits.length > 0 ? (
          <PublicGallery initialItems={portraits} initialCursor={page.nextCursor} />
        ) : (
          <div className="border-t border-rim py-16 text-center">
            <h2 className="font-display text-3xl font-light">The pet gallery is warming up.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
              New unpaid pet previews will appear here after they are generated.
            </p>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
