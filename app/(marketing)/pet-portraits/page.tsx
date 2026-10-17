import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Eye,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { CampaignLink } from "@/components/campaign-link";
import { SiteHeader, Wordmark } from "@/components/site-chrome";
import { LEGAL_LINKS } from "@/lib/legal";
import { DIGITAL_SKU, formatUsd, getPrice } from "@/lib/services/pricing";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";
const CREATE_PATH = "/portraits/create";

export const metadata: Metadata = {
  title: {
    absolute: "Custom Pet Portraits from One Photo | ImageCrafter",
  },
  description:
    "Turn one photo of your dog or cat into a stylized portrait. See a free, watermarked preview before you pay. No account needed.",
  alternates: { canonical: `${APP_URL}/pet-portraits` },
  openGraph: {
    title: "A portrait for the face you know by heart.",
    description:
      "Upload one pet photo, choose a style, and preview the portrait free before deciding whether to buy.",
    url: `${APP_URL}/pet-portraits`,
    type: "website",
    siteName: "ImageCrafter",
    images: [
      {
        url: `${APP_URL}/marketing/flash/renaissance-general.png`,
        width: 768,
        height: 1024,
        alt: "Flash the dog transformed into a Renaissance general portrait",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "A portrait for the face you know by heart.",
    description:
      "Free watermarked preview first. Pay only if you love it.",
    images: [`${APP_URL}/marketing/flash/renaissance-general.png`],
  },
};

const flashImages = {
  renaissanceBefore: "/marketing/flash/renaissance-before.jpg",
  renaissance: "/marketing/flash/renaissance-general.png",
  americanaBefore: "/marketing/flash/americana-before.jpeg",
  americana: "/marketing/flash/americana.png",
};

function Cta({
  children = "Create a free preview",
  className = "",
  location,
}: {
  children?: ReactNode;
  className?: string;
  location: string;
}) {
  return (
    <CampaignLink
      href={CREATE_PATH}
      eventName="landing_cta_clicked"
      eventMetadata={{ page: "pet-portraits", location }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-canvas transition hover:bg-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {children} <ArrowRight className="size-4" />
    </CampaignLink>
  );
}

function ProofImage({
  src,
  alt,
  label,
  priority = false,
  shape = "portrait",
}: {
  src: string;
  alt: string;
  label: string;
  priority?: boolean;
  shape?: "portrait" | "landscape";
}) {
  return (
    <figure className="relative overflow-hidden rounded-lg border border-rim bg-surface">
      <Image
        src={src}
        alt={alt}
        width={768}
        height={1024}
        priority={priority}
        className={`${shape === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} h-full w-full object-cover`}
        sizes="(min-width: 1024px) 28vw, 90vw"
      />
      <figcaption className="absolute left-3 top-3 rounded-md bg-canvas/90 px-2.5 py-1 text-[11px] font-semibold uppercase text-ink shadow-sm">
        {label}
      </figcaption>
    </figure>
  );
}

function ResultPair({
  before,
  after,
  title,
  beforeAlt,
  afterAlt,
  priority = false,
}: {
  before: string;
  after: string;
  title: string;
  beforeAlt: string;
  afterAlt: string;
  priority?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <ProofImage
        src={before}
        alt={beforeAlt}
        label="Original photo"
        shape="landscape"
        priority={priority}
      />
      <ProofImage src={after} alt={afterAlt} label={title} priority={priority} />
    </div>
  );
}

function Step({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="border-t border-rim pt-5">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </div>
      <h3 className="font-display text-2xl text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
    </div>
  );
}

function LegalFooter() {
  return (
    <footer className="border-t border-rim px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-xs text-ink-faint md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Wordmark size="sm" />
          <span>© {new Date().getFullYear()} · Xenco Labs</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink-muted">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default async function PetPortraitsPage() {
  const digital = await getPrice(DIGITAL_SKU);
  const price = formatUsd(digital.unitAmount);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <SiteHeader
        links={false}
        cta={
          <Cta location="header" className="hidden min-h-10 px-4 py-2 sm:inline-flex">
            Create a free preview
          </Cta>
        }
      />

      <section className="px-4 pb-14 pt-24 sm:px-6 lg:pb-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Pet portraits from one photo
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl font-light leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
              A portrait for the face you know by heart.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
              Turn one photo of your dog or cat into a stylized portrait. See a
              free, watermarked preview before you pay. No account needed.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Cta location="hero" className="w-full sm:w-auto" />
              <p className="text-sm text-ink-faint">
                Pay only if you love it. 4K download from {price}, delivered by
                email.
              </p>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 text-sm text-ink-muted sm:grid-cols-3">
              {[
                "Free preview first",
                "No account needed",
                "Secure Stripe checkout",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-accent" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ResultPair
              before={flashImages.renaissanceBefore}
              after={flashImages.renaissance}
              title="Renaissance General"
              beforeAlt="Original couch photo of Flash with his tongue out"
              afterAlt="Flash transformed into a decorated Renaissance general portrait"
              priority
            />
            <ResultPair
              before={flashImages.americanaBefore}
              after={flashImages.americana}
              title="Americana"
              beforeAlt="Original couch photo of Flash beside a window"
              afterAlt="Flash transformed into an Americana farm portrait"
              priority
            />
          </div>
        </div>
      </section>

      <section className="border-y border-rim bg-surface px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <Step
            icon={<Upload className="size-5" />}
            title="Upload one photo."
            body="Choose a clear photo of one pet, with their face visible. A phone snapshot is fine."
          />
          <Step
            icon={<Sparkles className="size-5" />}
            title="Choose a style."
            body="Try Americana, Renaissance General, Fine Art, Baroque, or another gallery style."
          />
          <Step
            icon={<Eye className="size-5" />}
            title="Preview before you pay."
            body="See your free, watermarked preview in about a minute. If you love it, pay once for the 4K download."
          />
        </div>
        <div className="mx-auto mt-8 max-w-6xl">
          <Cta location="steps" />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Real ImageCrafter output
            </p>
            <h2 className="mt-3 font-display text-4xl font-light sm:text-5xl">
              Flash went from couch photo to gallery wall.
            </h2>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              These examples came from real Flash uploads and real ImageCrafter
              outputs. Results depend on the photo you use, which is why you see
              the preview before deciding whether to buy.
            </p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <ResultPair
              before={flashImages.americanaBefore}
              after={flashImages.americana}
              title="Americana"
              beforeAlt="Original couch and window photo of Flash before portrait generation"
              afterAlt="Americana portrait result for Flash"
            />
            <ResultPair
              before={flashImages.renaissanceBefore}
              after={flashImages.renaissance}
              title="Renaissance General"
              beforeAlt="Original couch photo of Flash before portrait generation"
              afterAlt="Renaissance General portrait result for Flash"
            />
          </div>
        </div>
      </section>

      <section className="bg-ink px-4 py-16 text-canvas sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-2">
              You decide after you see it
            </p>
            <h2 className="mt-3 font-display text-4xl font-light sm:text-5xl">
              Free preview first. No account needed. Pay only if you love it.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: <Clock3 className="size-5" />,
                title: "About a minute",
                body: "Most previews are ready quickly, so the ad click turns into a real decision fast.",
              },
              {
                icon: <Download className="size-5" />,
                title: "4K download",
                body: `Buy once for the watermark-free digital file, from ${price}. No subscription.`,
              },
              {
                icon: <LockKeyhole className="size-5" />,
                title: "Your photo stays yours",
                body: "Your original photo, name, and email are not published.",
              },
              {
                icon: <ShieldCheck className="size-5" />,
                title: "Secure checkout",
                body: "Stripe handles payment. If you do not like the preview, you do not have to buy.",
              },
            ].map((item) => (
              <div key={item.title} className="border-t border-canvas/20 pt-5">
                <div className="mb-3 text-accent-2">{item.icon}</div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-canvas/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <h2 className="font-display text-4xl font-light sm:text-5xl">
              One portrait. One payment.
            </h2>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              You see the preview before deciding whether to pay. If you buy,
              the watermark-free file is delivered by email.
            </p>
            <div className="mt-6 border-y border-rim py-6">
              <p className="text-sm uppercase tracking-[0.2em] text-ink-faint">
                Digital portrait
              </p>
              <p className="mt-2 font-display text-5xl font-light">{price}</p>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Free watermarked preview. One 4K download without the
                watermark. No subscription.
              </p>
            </div>
            <Cta location="pricing" className="mt-6 w-full sm:w-auto" />
          </div>

          <div className="grid gap-5">
            {[
              [
                "Is the preview free?",
                "Yes. You can see a watermarked preview before paying, and you do not need an account.",
              ],
              [
                "What photo works best?",
                "One pet, with the face visible and roughly facing the camera. A phone photo is fine.",
              ],
              [
                "What do I receive if I buy?",
                "A 4K digital download without the watermark, delivered by email.",
              ],
              [
                "Will it look exactly like my pet?",
                "It is a stylized interpretation of your photo, not a guaranteed exact copy. That is why you can preview it first.",
              ],
              [
                "Are my photos private?",
                "Unpaid pet previews may appear in our public gallery as before-and-afters. Your name and email are not published. Buying the portrait makes it private.",
              ],
            ].map(([question, answer]) => (
              <div key={question} className="border-t border-rim pt-5">
                <h3 className="font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl border-t border-rim pt-12">
          <h2 className="font-display text-4xl font-light sm:text-5xl">
            Start with one photo.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">
            Free preview. No account needed. Pay only if you love it.
          </p>
          <Cta location="final" className="mt-7 w-full sm:w-auto" />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rim bg-canvas/95 p-3 backdrop-blur md:hidden">
        <Cta location="mobile_sticky" className="w-full" />
      </div>

      <LegalFooter />
    </main>
  );
}
