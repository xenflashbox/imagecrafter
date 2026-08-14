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
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { buildDownloadUrl } from "@/lib/services/download-token";
import { CreditPackCards } from "@/components/credit-pack-cards";

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
    <main className="min-h-screen bg-gradient-to-b from-purple-950 via-gray-950 to-gray-950 text-white py-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* ---------------------------------------------------------------- */}
        {/* SUCCESS HEADER */}
        {/* ---------------------------------------------------------------- */}
        <div className="text-center mb-10">
          {isPaid ? (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-white mb-2">Payment confirmed!</h1>
              <p className="text-purple-200 text-lg">
                {isDigital
                  ? "Your high-resolution portrait is ready to download."
                  : "Your museum-quality print is on its way to production."}
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4 animate-spin">⏳</div>
              <h1 className="text-3xl font-bold text-white mb-2">Processing your order…</h1>
              <p className="text-purple-200">
                This usually takes just a moment. Please refresh in a few seconds.
              </p>
              <a
                href={`/portraits/${portraitId}/success?orderId=${orderId}`}
                className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors"
              >
                Refresh
              </a>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* PORTRAIT PREVIEW */}
        {/* ---------------------------------------------------------------- */}
        {order.portrait?.previewImageUrl && (
          <div className="rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl">
            <div className="relative aspect-square">
              <Image
                src={order.portrait.previewImageUrl}
                alt="Your portrait"
                fill
                className="object-cover"
                sizes="(max-width: 672px) 100vw, 672px"
                priority
              />
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* ORDER SUMMARY CARD */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-white mb-4 text-lg">Order summary</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Style</dt>
              <dd className="text-white capitalize">{stylePackLabel} — {styleVariantLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Type</dt>
              <dd className="text-white">{isDigital ? "Digital Download" : `Fine Art Print (${order.printSize || "Custom"})`}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Amount</dt>
              <dd className="text-white font-semibold">{amountFormatted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Order ref</dt>
              <dd className="text-white font-mono text-xs">{orderId.slice(0, 8).toUpperCase()}</dd>
            </div>
          </dl>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* DIGITAL DOWNLOAD */}
        {/* ---------------------------------------------------------------- */}
        {isDigital && isPaid && (
          <div className="mb-6">
            {downloadUrl && !downloadExpired ? (
              <div className="bg-gradient-to-br from-purple-900/60 to-pink-900/60 border border-purple-500/30 rounded-2xl p-6 text-center">
                <p className="text-purple-200 text-sm mb-4">
                  Full 4K resolution · No watermark · {downloadsRemaining} download{downloadsRemaining !== 1 ? "s" : ""} remaining
                  {expiryDate ? ` · Expires ${expiryDate}` : ""}
                </p>
                <a
                  href={downloadUrl}
                  className="inline-block px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg text-white transition-all transform hover:scale-105 shadow-lg"
                >
                  ⬇️ Download Your Portrait
                </a>
                <p className="text-xs text-gray-500 mt-4">
                  A download link was also sent to {order.email}
                </p>
              </div>
            ) : downloadExpired ? (
              <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-6 text-center">
                <p className="text-red-300 mb-2 font-semibold">Download link expired</p>
                <p className="text-gray-400 text-sm">
                  Your download link has expired (72-hour limit). Please{" "}
                  <Link href="/contact" className="text-purple-400 underline">
                    contact support
                  </Link>{" "}
                  to request a new link.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-2xl p-6 text-center">
                <p className="text-yellow-300 mb-2 font-semibold">Download limit reached</p>
                <p className="text-gray-400 text-sm">
                  You've downloaded this portrait the maximum number of times.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* PRINT ORDER STATUS */}
        {/* ---------------------------------------------------------------- */}
        {isPrint && isPaid && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-white mb-4 text-lg flex items-center gap-2">
              🖼️ Print Status
            </h2>

            {order.prodigiStatus ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Fulfillment status</span>
                  <span className="text-white capitalize">{order.prodigiStatus}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tracking</span>
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} className="text-purple-400 underline" target="_blank" rel="noopener noreferrer">
                        {order.trackingNumber}
                      </a>
                    ) : (
                      <span className="text-white font-mono text-xs">{order.trackingNumber}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span>In production — you'll receive a shipping email with tracking when it dispatches.</span>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">
              Confirmation sent to {order.email} · Estimated delivery: 5–10 business days
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* CREDIT PACK UPSELL */}
        {/* ---------------------------------------------------------------- */}
        {isPaid && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-white mb-1 text-lg">🎟️ Making more portraits?</h2>
            <p className="text-sm text-gray-400 mb-5">
              Grab a credit pack and redeem future portraits as digital downloads —
              credits never expire.
            </p>
            <CreditPackCards theme="dark" />
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* NEXT STEPS */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            href="/portraits/create"
            className="flex-1 text-center py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors"
          >
            🎨 Create another portrait
          </Link>
          <Link
            href="/portraits"
            className="flex-1 text-center py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors"
          >
            ← Back to Portrait Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
