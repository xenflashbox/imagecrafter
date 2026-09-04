/**
 * /portraits/[id]/success
 *
 * Post-purchase confirmation page.
 *
 * DUAL-FLOW:
 * - Guest:       no login required; shown download link from signed token
 * - Subscriber:  same page, same experience (they also get email)
 *
 * Receives: ?orderId=... from our success_url
 * Polls order status to handle webhook latency.
 */

import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  Printer,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { buildDownloadUrl } from "@/lib/services/download-token";
import { CreditPackCards } from "@/components/credit-pack-cards";
import { getPackCatalog, getPrice, DIGITAL_SKU } from "@/lib/services/pricing";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Order Confirmed — ImageCrafter Portrait Studio",
  description: "Your portrait purchase is confirmed.",
  robots: { index: false, follow: false },
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-rim bg-surface p-6">{children}</div>;
}

export default async function PortraitSuccessPage({ params, searchParams }: Props) {
  const { id: portraitId } = await params;
  const { orderId } = await searchParams;

  // Auth — optional
  let userId: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId;
  } catch {
    // Guest
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;

  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      type: true,
      status: true,
      email: true,
      amount: true,
      currency: true,
      downloadCount: true,
      maxDownloads: true,
      downloadExpiresAt: true,
      printSize: true,
      prodigiStatus: true,
      trackingNumber: true,
      trackingUrl: true,
      portrait: {
        select: {
          id: true,
          userId: true,
          sessionId: true,
          previewImageUrl: true,
          stylePackSlug: true,
          styleVariantSlug: true,
        },
      },
    },
  });

  if (!order || order.portrait?.id !== portraitId) {
    notFound();
  }

  // Ownership verification
  const isOwner =
    (userId && order.portrait?.userId === userId) ||
    (sessionId && order.portrait?.sessionId === sessionId);

  if (!isOwner) {
    notFound();
  }

  const [packs, digital] = await Promise.all([getPackCatalog(), getPrice(DIGITAL_SKU)]);

  const isPaid = order.status === "paid" || order.status === "fulfilled";
  const isDigital = order.type === "digital";
  const isPrint = order.type === "print";

  const stylePackLabel = (order.portrait?.stylePackSlug || "Portrait").replace(/-/g, " ");
  const styleVariantLabel = (order.portrait?.styleVariantSlug || "").replace(/-/g, " ");
  const amountFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency || "usd",
  }).format((order.amount || 0) / 100);

  // Digital download link
  let downloadUrl: string | null = null;
  let downloadsRemaining = 0;
  let downloadExpired = false;

  if (isDigital && isPaid) {
    downloadsRemaining = (order.maxDownloads || 5) - (order.downloadCount || 0);
    downloadExpired = order.downloadExpiresAt ? new Date() > order.downloadExpiresAt : false;
    if (downloadsRemaining > 0 && !downloadExpired) {
      downloadUrl = buildDownloadUrl(orderId, BASE_URL);
    }
  }

  const expiryDate = order.downloadExpiresAt
    ? new Date(order.downloadExpiresAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader links={false} />

      <div className="mx-auto w-full max-w-2xl flex-1 px-6 pt-28 pb-16">
        {/* Header */}
        <div className="mb-10 text-center">
          {isPaid ? (
            <>
              <CheckCircle2 className="mx-auto mb-5 size-12 text-positive" />
              <h1 className="font-display mb-2 text-3xl font-light">Payment confirmed</h1>
              <p className="text-ink-muted">
                {isDigital
                  ? "Your high-resolution portrait is ready to download."
                  : "Your museum-quality print is on its way to production."}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-6 size-12 animate-spin rounded-full border-4 border-rim border-t-accent" />
              <h1 className="font-display mb-2 text-3xl font-light">Processing your order…</h1>
              <p className="text-ink-muted">
                This usually takes just a moment. Please refresh in a few seconds.
              </p>
              <a
                href={`/portraits/${portraitId}/success?orderId=${orderId}`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-rim px-6 py-2.5 text-sm font-medium transition-colors hover:border-rim-strong [&_svg]:size-4"
              >
                <RefreshCw /> Refresh
              </a>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {order.portrait?.previewImageUrl && (
            <div className="artframe relative aspect-square bg-surface">
              <Image
                src={order.portrait.previewImageUrl}
                alt="Your portrait"
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
                priority
              />
            </div>
          )}

          {/* Order summary */}
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Order summary</h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Style</dt>
                <dd className="capitalize">
                  {stylePackLabel} — {styleVariantLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Type</dt>
                <dd>
                  {isDigital
                    ? "Digital Download"
                    : `Fine Art Print (${order.printSize || "Custom"})`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Amount</dt>
                <dd className="font-semibold">{amountFormatted}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Order ref</dt>
                <dd className="font-mono text-xs">{orderId.slice(0, 8).toUpperCase()}</dd>
              </div>
            </dl>
          </Panel>

          {/* Digital download */}
          {isDigital && isPaid && (
            <>
              {downloadUrl && !downloadExpired ? (
                <div className="rounded-2xl border border-accent-rim bg-surface p-6 text-center">
                  <p className="mb-5 text-sm text-ink-muted">
                    Full 4K resolution · No watermark · {downloadsRemaining} download
                    {downloadsRemaining !== 1 ? "s" : ""} remaining
                    {expiryDate ? ` · Expires ${expiryDate}` : ""}
                  </p>
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-10 py-4 text-base font-semibold transition-all hover:brightness-110 [&_svg]:size-5"
                  >
                    <Download /> Download Your Portrait
                  </a>
                  <p className="mt-4 text-xs text-ink-faint">
                    A download link was also sent to {order.email}
                  </p>
                </div>
              ) : downloadExpired ? (
                <Panel>
                  <p className="mb-2 font-semibold text-danger">Download link expired</p>
                  <p className="text-sm text-ink-muted">
                    Your download link has expired (72-hour limit). Please{" "}
                    <Link href="/contact" className="text-accent underline">
                      contact support
                    </Link>{" "}
                    to request a new link.
                  </p>
                </Panel>
              ) : (
                <Panel>
                  <p className="mb-2 font-semibold text-warning">Download limit reached</p>
                  <p className="text-sm text-ink-muted">
                    You have downloaded this portrait the maximum number of times.
                  </p>
                </Panel>
              )}
            </>
          )}

          {/* Print status */}
          {isPrint && isPaid && (
            <Panel>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold [&_svg]:size-5">
                <Printer className="text-accent" /> Print status
              </h2>

              {order.prodigiStatus ? (
                <div className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-ink-muted">Fulfillment status</span>
                    <span className="capitalize">{order.prodigiStatus}</span>
                  </div>
                  {order.trackingNumber && (
                    <div className="flex justify-between gap-4">
                      <span className="text-ink-muted">Tracking</span>
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          className="text-accent underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {order.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-mono text-xs">{order.trackingNumber}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-ink-muted">
                  <div className="size-2 animate-pulse rounded-full bg-warning" />
                  <span>
                    In production — you&apos;ll receive a shipping email with tracking when it
                    dispatches.
                  </span>
                </div>
              )}

              <p className="mt-4 text-xs text-ink-faint">
                Confirmation sent to {order.email} · Estimated delivery: 5–10 business days
              </p>
            </Panel>
          )}

          {/* Credit pack upsell */}
          {isPaid && (
            <Panel>
              <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold [&_svg]:size-5">
                <Ticket className="text-accent" /> Making more portraits?
              </h2>
              <p className="mb-5 text-sm text-ink-muted">
                Grab a credit pack and redeem future portraits as digital downloads — credits
                never expire.
              </p>
              <CreditPackCards
                packs={packs}
                singlePriceCents={digital.unitAmount}
                theme="dark"
              />
            </Panel>
          )}

          {/* Next steps */}
          <div className="mt-2 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/portraits/create"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rim bg-surface px-6 py-3 font-medium transition-colors hover:border-rim-strong [&_svg]:size-4"
            >
              <Camera /> Create another portrait
            </Link>
            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rim bg-surface px-6 py-3 font-medium transition-colors hover:border-rim-strong [&_svg]:size-4"
            >
              <ArrowLeft /> Back to Portrait Studio
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
