/**
 * /portraits/[id]/preview — Portrait Preview + Purchase Page
 * PUBLIC — no authentication required.
 * DUAL-FLOW: guest sessionId cookie OR Clerk userId.
 */

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Lock,
  Printer,
  Ticket,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getCreditBalance } from "@/lib/services/credits";
import { RedeemButton } from "@/components/redeem-button";
import { CreditPackCards } from "@/components/credit-pack-cards";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  getPackCatalog,
  getPrices,
  getPrice,
  formatUsd,
  DIGITAL_SKU,
} from "@/lib/services/pricing";
import { resolveSku } from "@/lib/services/print-fulfillment";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your Portrait Preview | ImageCrafter" };
}

// The four art-print sizes teased here; sizes come from the catalog, amounts
// from Stripe (keyed on these SKUs).
const PRINT_TEASER_SKUS = ["ART-8x10", "ART-12x16", "ART-16x20", "ART-24x36"];

/** Full-page states (not found / working / failed) wear the same chrome. */
function Standalone({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader links={false} />
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-md text-center">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default async function PortraitPreviewPage({ params }: Props) {
  const { id: portraitId } = await params;

  // Auth: optional
  let userId: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId;
  } catch {
    // Guest
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;

  const portrait = await prisma.portrait.findUnique({
    where: { id: portraitId },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      previewImageUrl: true,
      stylePackSlug: true,
      styleVariantSlug: true,
      subjectType: true,
      status: true,
      errorMessage: true,
      order: { select: { id: true, status: true, type: true } },
    },
  });

  if (!portrait) notFound();

  // Authorization
  const isOwner =
    (userId && portrait.userId === userId) ||
    (sessionId && portrait.sessionId === sessionId);

  if (!isOwner) {
    return (
      <Standalone>
        <Lock className="mx-auto mb-5 size-10 text-ink-faint" />
        <h1 className="font-display mb-2 text-2xl font-light">Portrait not found</h1>
        <p className="mb-8 text-ink-muted">
          This portrait belongs to another session. Create a new portrait to get started.
        </p>
        <Link
          href="/portraits/create"
          className="inline-block rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-semibold transition-all hover:brightness-110"
        >
          Create Your Portrait
        </Link>
      </Standalone>
    );
  }

  if (portrait.status === "generating" || portrait.status === "analyzing") {
    return (
      <Standalone>
        <div className="mx-auto mb-6 size-14 animate-spin rounded-full border-4 border-rim border-t-accent" />
        <h1 className="font-display mb-2 text-2xl font-light">
          Your portrait is being created…
        </h1>
        <p className="text-ink-muted">
          Good portraits take 3–4 minutes. We paint a scene around you, then work
          your face into it by hand — that&rsquo;s the part that makes it look like
          you. Refresh this page in a few minutes.
        </p>
      </Standalone>
    );
  }

  if (portrait.status === "failed") {
    return (
      <Standalone>
        <h1 className="font-display mb-2 text-2xl font-light">Generation failed</h1>
        <p className="text-ink-muted">
          {portrait.errorMessage || "Something went wrong during generation."}
        </p>
        <Link
          href="/portraits/create"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-accent to-accent-2 px-6 py-3 font-semibold transition-all hover:brightness-110"
        >
          Try Again
        </Link>
      </Standalone>
    );
  }

  const isPurchased = portrait.status === "purchased";

  // Pack credits (signed-in users only — packs require an account)
  const creditBalance = userId ? await getCreditBalance(userId) : 0;

  const [packs, digital, printPrices] = await Promise.all([
    getPackCatalog(),
    getPrice(DIGITAL_SKU),
    getPrices(PRINT_TEASER_SKUS),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader
        links={false}
        cta={
          <Link
            href="/portraits/create"
            className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Create Another
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-28 pb-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* Preview image */}
          <div className="flex flex-col gap-4">
            <div className="artframe relative bg-surface">
              {portrait.previewImageUrl ? (
                <>
                  <Image
                    src={portrait.previewImageUrl}
                    alt="Your portrait preview"
                    width={800}
                    height={800}
                    className="w-full"
                    priority
                  />
                  {!isPurchased && (
                    <div className="absolute bottom-4 left-0 right-0 z-10 text-center">
                      <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm backdrop-blur-sm">
                        <Lock className="size-3.5" />
                        Watermarked preview — purchase to unlock
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-square items-center justify-center text-ink-faint">
                  No preview available
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-ink-subtle">
              <span className="rounded-full border border-rim px-3 py-1 capitalize">
                {portrait.stylePackSlug?.replace(/-/g, " ")}
              </span>
              <span>·</span>
              <span className="capitalize">
                {portrait.styleVariantSlug?.replace(/-/g, " ")}
              </span>
            </div>
          </div>

          {/* Purchase options */}
          {isPurchased ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-positive">
                <CheckCircle2 className="size-9" />
                <div>
                  <h2 className="text-xl font-semibold text-ink">Portrait purchased</h2>
                  <p className="text-sm">Check your email for the download link.</p>
                </div>
              </div>
              <Link
                href="/portraits/create"
                className="block w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-3 text-center font-semibold transition-all hover:brightness-110"
              >
                Create Another Portrait
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="font-display mb-2 text-3xl font-light">
                  Love your portrait?
                </h1>
                <p className="text-ink-muted">
                  Remove the watermark and get your full-resolution portrait, delivered
                  instantly to your email.
                </p>
              </div>

              {/* Redeem with pack credit */}
              {creditBalance > 0 && (
                <div className="rounded-2xl border border-rim bg-surface p-5">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-accent-soft p-2 text-positive">
                      <Ticket className="size-5" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <h3 className="font-semibold">Redeem a Credit</h3>
                        <span className="text-xl font-semibold text-positive">Free</span>
                      </div>
                      <p className="mb-4 text-sm text-ink-muted">
                        Use 1 of your {creditBalance} portrait credit
                        {creditBalance !== 1 ? "s" : ""} for the full-resolution digital
                        download — no charge.
                      </p>
                      <RedeemButton portraitId={portrait.id} balance={creditBalance} />
                    </div>
                  </div>
                </div>
              )}

              {/* Digital download */}
              <div className="rounded-2xl border border-rim bg-surface p-5 transition-colors hover:border-accent-rim">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-accent-soft p-2 text-accent">
                    <Download className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold">Digital Download</h3>
                      <span className="text-xl font-semibold">
                        {formatUsd(digital.unitAmount)}
                      </span>
                    </div>
                    <ul className="mb-4 flex flex-col gap-1 text-sm text-ink-muted">
                      {[
                        "Full 4K resolution, no watermark",
                        "Instant delivery to your email",
                        "Download up to 5 times (72 hours)",
                        "No account required",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="size-4 shrink-0 text-positive" /> {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/api/orders/create?portraitId=${portrait.id}&type=digital`}
                      className="block w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-3 text-center text-sm font-semibold transition-all hover:brightness-110"
                    >
                      Purchase Digital Download
                    </Link>
                  </div>
                </div>
              </div>

              {/* Credit packs upsell */}
              {creditBalance === 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Ticket className="size-4 text-accent" /> Making more than one?
                  </h3>
                  <CreditPackCards
                    packs={packs}
                    singlePriceCents={digital.unitAmount}
                    theme="dark"
                  />
                  <p className="mt-2 text-center text-xs text-ink-faint">
                    Credits never expire · Redeem any portrait as a digital download ·
                    Requires a free account
                  </p>
                </div>
              )}

              {/* Print options */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Printer className="size-4 text-accent" /> Museum-Quality Print
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {printPrices.map((opt) => (
                    <div
                      key={opt.sku}
                      className="rounded-xl border border-rim bg-surface p-3 text-center transition-colors hover:border-accent-rim"
                    >
                      <div className="text-sm text-ink-muted">
                        {resolveSku(opt.sku)?.size}
                      </div>
                      <div className="text-lg font-semibold">
                        {formatUsd(opt.unitAmount)}
                      </div>
                      <Link
                        href={`/api/orders/create?portraitId=${portrait.id}&type=print&sku=${opt.sku}`}
                        className="mt-2 block w-full rounded-lg border border-rim py-1.5 text-center text-xs text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
                      >
                        Order Print
                      </Link>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-ink-faint">
                  Canvas, framed, and art print options · Ships worldwide
                </p>
              </div>

              <p className="text-center text-xs text-ink-faint">
                Secure checkout powered by Stripe · No account required
              </p>
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
