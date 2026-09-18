/**
 * /download?token=… — the click-through that email links land on.
 *
 * The download itself is metered (5 per order), so the URL that spends one
 * must only ever be reached by a deliberate human click. Email clients,
 * scanners and Brevo's click tracker all fetch links unattended; they land
 * here, which reads state and writes nothing.
 */

import Link from "next/link";
import { Metadata } from "next";
import { Download, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { validateDownloadToken } from "@/lib/services/download-token";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download your portrait — ImageCrafter",
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader links={false} />
      <div className="mx-auto w-full max-w-lg flex-1 px-6 pt-32 pb-16">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="text-center">
        <AlertCircle className="mx-auto mb-5 size-10 text-ink-faint" />
        <h1 className="font-display mb-3 text-2xl font-light">{title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-sm border border-rim-strong px-5 py-2.5 text-sm transition-colors hover:bg-surface"
        >
          Back to ImageCrafter
        </Link>
      </div>
    </Shell>
  );
}

const SUPPORT = "Reply to your order email and we will sort it out.";

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Problem
        title="No download link"
        body="This page needs the link from your order email."
      />
    );
  }

  const validation = validateDownloadToken(token);

  if (!validation.valid) {
    return validation.error === "expired" ? (
      <Problem
        title="This link has expired"
        body={`Download links are valid for 72 hours after purchase. ${SUPPORT}`}
      />
    ) : (
      <Problem
        title="This link is not valid"
        body={`It may have been truncated by your email client. ${SUPPORT}`}
      />
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: validation.orderId },
    select: {
      status: true,
      downloadCount: true,
      maxDownloads: true,
      downloadExpiresAt: true,
      portrait: {
        select: {
          previewImageUrl: true,
          stylePackSlug: true,
          styleVariantSlug: true,
        },
      },
    },
  });

  if (!order) {
    return <Problem title="Order not found" body={SUPPORT} />;
  }

  if (order.status !== "paid" && order.status !== "fulfilled") {
    return (
      <Problem
        title="This order is not paid yet"
        body="If you have just paid, give it a moment and reload this page."
      />
    );
  }

  if (order.downloadExpiresAt && new Date() > order.downloadExpiresAt) {
    return (
      <Problem
        title="This link has expired"
        body={`Download links are valid for 72 hours after purchase. ${SUPPORT}`}
      />
    );
  }

  const remaining = order.maxDownloads - order.downloadCount;

  if (remaining <= 0) {
    return (
      <Problem
        title="Download limit reached"
        body={`This portrait has been downloaded ${order.maxDownloads} times. ${SUPPORT}`}
      />
    );
  }

  const styleLabel = [order.portrait?.stylePackSlug, order.portrait?.styleVariantSlug]
    .filter(Boolean)
    .join(" · ")
    .replace(/-/g, " ");

  const expiryLabel = order.downloadExpiresAt
    ? new Date(order.downloadExpiresAt).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <Shell>
      <div className="text-center">
        <h1 className="font-display mb-2 text-3xl font-light">
          Your portrait is ready
        </h1>
        {styleLabel && (
          <p className="mb-8 text-sm capitalize text-ink-muted">{styleLabel}</p>
        )}

        {order.portrait?.previewImageUrl && (
          <div className="artframe artframe-matted mx-auto mb-8 max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.portrait.previewImageUrl}
              alt="Your portrait"
              className="w-full"
            />
          </div>
        )}

        <a
          href={`/api/orders/download?token=${encodeURIComponent(token)}&confirm=1`}
          className="inline-flex items-center gap-2 rounded-sm bg-ink px-6 py-3 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
        >
          <Download className="size-4" /> Download full resolution
        </a>

        <p className="mt-5 text-xs leading-relaxed text-ink-faint">
          {remaining} of {order.maxDownloads} downloads remaining
          {expiryLabel ? ` · link expires ${expiryLabel}` : ""}
        </p>
      </div>
    </Shell>
  );
}
