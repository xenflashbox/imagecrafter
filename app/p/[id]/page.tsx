/**
 * /p/[id] — the public face of a portrait.
 *
 * The preview page is owner-gated on session/user, so a link to it is dead to
 * everyone the customer sends it to. This is the shareable twin: read-only, no
 * purchase controls, keyed on the portrait's unguessable cuid.
 *
 * It serves the WATERMARKED preview and never the hi-res file — the watermark
 * is the point. Someone who never buys but shows this to fifty people is worth
 * more than the sale.
 */

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

interface Props {
  params: Promise<{ id: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

// Only a finished portrait has anything to show. Anything mid-flight or failed
// is a 404 here rather than a "come back later" — this page is reached from a
// stranger's feed, not from the owner's tab.
const SHAREABLE = ["preview", "purchased"];

async function getPortrait(id: string) {
  const portrait = await prisma.portrait.findUnique({
    where: { id },
    select: {
      previewImageUrl: true,
      stylePackSlug: true,
      styleVariantSlug: true,
      subjectType: true,
      status: true,
    },
  });

  if (!portrait?.previewImageUrl) return null;
  if (!SHAREABLE.includes(portrait.status)) return null;
  return portrait;
}

/** "the dog", "the cat" — what the sharer is showing off. */
function subjectNoun(subjectType: string) {
  switch (subjectType) {
    case "pet":
      return "my pet";
    case "couple":
      return "us";
    case "family":
    case "group":
      return "my family";
    default:
      return "me";
  }
}

function titleCase(slug: string | null) {
  return slug?.replace(/-/g, " ") ?? "";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const portrait = await getPortrait(id);

  if (!portrait) return { title: "Portrait not found | ImageCrafter" };

  const style = titleCase(portrait.stylePackSlug);
  const title = `Someone turned one photo of ${subjectNoun(
    portrait.subjectType,
  )} into this`;
  const description = `A ${style} portrait painted from a single photograph on ImageCrafter. Make your own free — no account needed, pay only if you love it.`;

  return {
    title,
    description,
    // og:image / twitter:image come from the co-located opengraph-image route.
    openGraph: {
      title,
      description,
      url: `${APP_URL}/p/${id}`,
      type: "website",
      siteName: "ImageCrafter",
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${APP_URL}/p/${id}` },
  };
}

export default async function PublicPortraitPage({ params }: Props) {
  const { id } = await params;
  const portrait = await getPortrait(id);

  if (!portrait) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader
        cta={
          <Link
            href="/portraits/create"
            className="whitespace-nowrap rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
          >
            Make<span className="hidden sm:inline"> your own</span>
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-28 pb-16">
        <figure>
          <div className="artframe artframe-matted bg-surface">
            <Image
              src={portrait.previewImageUrl!}
              alt={`A ${titleCase(portrait.stylePackSlug)} portrait painted from one photograph`}
              width={900}
              height={1200}
              className="w-full"
              priority
            />
          </div>
          <figcaption className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-subtle">
            <span className="rounded-full border border-rim px-3 py-1 capitalize">
              {titleCase(portrait.stylePackSlug)}
            </span>
            <span>·</span>
            <span className="capitalize">{titleCase(portrait.styleVariantSlug)}</span>
          </figcaption>
        </figure>

        <div className="mt-14 text-center">
          <h1 className="font-display mb-4 text-3xl font-light leading-tight md:text-4xl">
            Painted from a single photograph
          </h1>
          <p className="mx-auto mb-8 max-w-md leading-relaxed text-ink-muted">
            Upload one photo of your pet or your family and watch it become an
            oil painting, a Baroque portrait or a 70s disco shot. You see the
            finished piece before you decide anything.
          </p>
          <Link
            href="/portraits/create"
            className="inline-flex items-center gap-3 rounded-sm bg-ink px-8 py-4 text-lg text-canvas transition-opacity hover:opacity-85"
          >
            Make your own
            <ArrowRight className="size-5" />
          </Link>
          <p className="mt-4 text-sm text-ink-faint">
            No account needed. Nothing is charged until you have seen it.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
