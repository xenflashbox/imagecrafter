/**
 * /memorial — the memorial portrait entry point.
 *
 * Its own route rather than a style buried in the catalog: memorial is the
 * highest-intent search term we can win, and the register it needs — calm,
 * unhurried, no urgency devices — is incompatible with the rest of the
 * marketing page. No countdowns, no scarcity, no "act now". The funnel it
 * feeds is the ordinary one: /portraits/create.
 */

import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import { getPrice, formatUsd, DIGITAL_SKU } from "@/lib/services/pricing";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";
const CDN = "https://images.imagecrafter.app/gallery/v4";

export const metadata: Metadata = {
  title: "Memorial Portraits — ImageCrafter",
  description:
    "A hand-finished painted portrait of someone you have lost, made from a single photograph. Pets and people. See it before you decide.",
  openGraph: {
    title: "Memorial Portraits — ImageCrafter",
    description:
      "A painted portrait made from one photograph of the pet or person you have lost.",
    url: `${APP_URL}/memorial`,
    type: "website",
    siteName: "ImageCrafter",
    images: [
      {
        url: `${APP_URL}/og-memorial.png`,
        width: 1200,
        height: 630,
        alt: "A scruffy terrier in a soft oil-painted portrait",
      },
    ],
  },
  alternates: { canonical: `${APP_URL}/memorial` },
};

// Oil Painting only. The costume styles are wrong for this page, and these are
// the same gallery/v4 renders shown on the homepage — real pipeline output.
const KEEPSAKES = [
  { subject: "d-dog-terrier-scruffy", label: "A terrier" },
  { subject: "d-cat-orange", label: "An orange tabby" },
  { subject: "d-woman-60s-silver", label: "A grandmother" },
];

const REASSURANCES = [
  {
    q: "The only photo I have is old, or a little blurry.",
    a: "That is the usual case, and it is usually fine. What matters is that their face is visible and roughly facing the camera. Phone snapshots, scans of prints, and screenshots all work.",
  },
  {
    q: "Will it actually look like them?",
    a: "You see the finished portrait before you pay anything. If it does not look like them, you owe nothing and nothing is kept.",
  },
  {
    q: "Can I have it printed?",
    a: "Yes. Museum-quality prints ship worldwide, or you can download the full-resolution file and print it yourself.",
  },
  {
    q: "How long does it take?",
    a: "About a minute to see it. There is no queue and no deadline — come back to it whenever you are ready.",
  },
];

export default async function MemorialPage() {
  const { userId } = await auth();
  const digital = await getPrice(DIGITAL_SKU);

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

      <section className="px-6 pt-36 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-sm uppercase tracking-[0.2em] text-ink-faint">
            Memorial portraits
          </p>
          <h1 className="font-display mb-6 text-4xl font-light leading-[1.15] tracking-tight md:text-6xl">
            A painting of the one you lost
          </h1>
          <p className="text-lg leading-relaxed text-ink-muted">
            From a single photograph — a pet, a parent, a grandparent — a
            painted portrait you can hang on a wall. Take your time with it.
            You will see the finished piece before you decide anything.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          {KEEPSAKES.map((k) => (
            <figure key={k.subject}>
              <div className="artframe artframe-matted">
                <img
                  src={`${CDN}/after/${k.subject}--oil-painting.jpg`}
                  alt={`${k.label} painted as an oil portrait`}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <figcaption className="mt-3 text-center text-sm text-ink-subtle">
                {k.label}, from one photograph
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="border-y border-rim bg-surface px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-10 text-center text-3xl font-light">
            How it works
          </h2>
          <ol className="flex flex-col gap-8">
            {[
              [
                "Find one photograph",
                "Any photo where you can see their face. It does not need to be a good one.",
              ],
              [
                "See the painting",
                "About a minute later the finished portrait appears. Look at it as long as you want.",
              ],
              [
                "Keep it, or don't",
                `If it is right, the download is ${formatUsd(digital.unitAmount)} and prints can be posted to you. If it is not, you owe nothing.`,
              ],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-5">
                <span className="font-display mt-0.5 shrink-0 text-2xl font-light text-ink-faint">
                  {i + 1}
                </span>
                <div>
                  <h3 className="mb-1.5 font-medium">{title}</h3>
                  <p className="leading-relaxed text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          {REASSURANCES.map((r) => (
            <div key={r.q}>
              <h3 className="font-display mb-2 text-lg font-normal">{r.q}</h3>
              <p className="leading-relaxed text-ink-muted">{r.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <Link
            href="/portraits/create"
            className="inline-flex items-center gap-3 rounded-sm bg-ink px-8 py-4 text-lg text-canvas transition-opacity hover:opacity-85"
          >
            Begin a portrait
            <ArrowRight className="size-5" />
          </Link>
          <p className="mt-4 text-sm text-ink-faint">
            No account needed. Nothing is charged until you have seen it.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
