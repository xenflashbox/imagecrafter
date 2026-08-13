/**
 * /portraits/[id]/preview — Portrait Preview + Purchase Page
 * PUBLIC — no authentication required.
 * DUAL-FLOW: guest sessionId cookie OR Clerk userId.
 */

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: "Your Portrait Preview | ImageCrafter" };
}

const PRINT_OPTIONS = [
  { size: '8×10"', price: 49.95, sku: "GICLÉE_8x10" },
  { size: '12×16"', price: 69.95, sku: "GICLÉE_12x16" },
  { size: '16×20"', price: 89.95, sku: "GICLÉE_16x20" },
  { size: '24×36"', price: 149.95, sku: "GICLÉE_24x36" },
];

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Portrait not found</h1>
          <p className="text-slate-600 mb-6">
            This portrait belongs to another session. Create a new portrait to get started.
          </p>
          <Link href="/portraits/create" className="inline-block rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 transition-colors">
            Create Your Portrait
          </Link>
        </div>
      </div>
    );
  }

  if (portrait.status === "generating" || portrait.status === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Your portrait is being created…</h1>
          <p className="text-slate-600">This usually takes 15–30 seconds. Refresh this page in a moment.</p>
        </div>
      </div>
    );
  }

  if (portrait.status === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Generation failed</h1>
          <p className="text-slate-600 mb-2">{portrait.errorMessage || "Something went wrong during generation."}</p>
          <Link href="/portraits/create" className="inline-block mt-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 transition-colors">
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  const isPurchased = portrait.status === "purchased";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/portraits/create" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            ← Create Another
          </Link>
          <span className="text-sm font-medium text-slate-700">Portrait Preview</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Preview image */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-xl bg-slate-900">
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
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur-sm">
                        🔒 Watermarked preview — purchase to unlock
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center text-4xl">✨</div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full border border-slate-200 px-3 py-1 capitalize">
                {portrait.stylePackSlug?.replace(/-/g, " ")}
              </span>
              <span>·</span>
              <span className="capitalize">{portrait.styleVariantSlug?.replace(/-/g, " ")}</span>
            </div>
          </div>

          {/* Purchase options */}
          {isPurchased ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700">
                <span className="text-4xl">✅</span>
                <div>
                  <h2 className="text-xl font-bold">Portrait purchased!</h2>
                  <p className="text-sm text-green-600">Check your email for the download link.</p>
                </div>
              </div>
              <Link href="/portraits/create" className="block w-full text-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 transition-colors">
                Create Another Portrait
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Love your portrait?</h1>
                <p className="text-slate-600">
                  Remove the watermark and get your full-resolution portrait. Delivered instantly to your email.
                </p>
              </div>

              {/* Digital download */}
              <div className="rounded-2xl border-2 border-purple-200 p-5 bg-white hover:border-purple-400 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-purple-100 text-2xl">⬇️</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900">Digital Download</h3>
                      <span className="text-xl font-bold text-slate-900">$29.95</span>
                    </div>
                    <ul className="text-sm text-slate-600 space-y-1 mb-4">
                      {["Full 4K resolution, no watermark", "Instant delivery to your email", "Download up to 5 times (72 hours)", "No account required"].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="text-green-500">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                    {/* Phase 3: Stripe checkout */}
                    <Link
                      href={`/api/orders/create?portraitId=${portrait.id}&type=digital`}
                      className="block w-full text-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 text-sm transition-colors"
                    >
                      Purchase Digital Download
                    </Link>
                  </div>
                </div>
              </div>

              {/* Print options */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">🖨️ Museum-Quality Print</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PRINT_OPTIONS.map((opt) => (
                    <div key={opt.sku} className="rounded-xl border border-slate-200 hover:border-amber-400 transition-colors p-3 text-center bg-white">
                      <div className="text-sm font-semibold text-slate-900">{opt.size}</div>
                      <div className="text-lg font-bold text-slate-900">${opt.price}</div>
                      <Link
                        href={`/api/orders/create?portraitId=${portrait.id}&type=print&sku=${opt.sku}`}
                        className="mt-2 block w-full text-center rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs py-1.5 transition-colors"
                      >
                        Order Print
                      </Link>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Canvas, framed, and art print options · Ships worldwide
                </p>
              </div>

              <p className="text-center text-xs text-slate-400">
                Secure checkout powered by Stripe · No account required
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
