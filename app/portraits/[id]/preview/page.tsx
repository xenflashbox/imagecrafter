/**
 * /portraits/[id]/preview — Portrait Preview + Purchase Page
 *
 * PUBLIC PAGE — no authentication required.
 * Shows the watermarked preview and purchase options.
 *
 * DUAL-FLOW:
 * - Guest: verified via sessionId cookie
 * - Subscriber: verified via Clerk userId
 *
 * Phase 3 will add the full Stripe checkout integration.
 * For Phase 2, this page shows the preview with purchase CTAs.
 */

import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Printer,
  Lock,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Your Portrait Preview | ImageCrafter`,
    description: "Your AI-generated portrait preview. Purchase to unlock full resolution.",
  };
}

async function getPortrait(portraitId: string) {
  return prisma.portrait.findUnique({
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
      createdAt: true,
      order: {
        select: { id: true, status: true, type: true },
      },
    },
  });
}

const PRINT_OPTIONS = [
  { size: "8×10\"", price: 29.95, sku: "GICLÉE_8x10" },
  { size: "12×16\"", price: 49.95, sku: "GICLÉE_12x16" },
  { size: "16×20\"", price: 79.95, sku: "GICLÉE_16x20" },
  { size: "24×36\"", price: 129.95, sku: "GICLÉE_24x36" },
];

export default async function PortraitPreviewPage({ params }: Props) {
  const { id: portraitId } = await params;

  // --- Verify ownership ---
  let userId: string | null = null;
  try {
    const { userId: clerkUserId } = await auth();
    userId = clerkUserId;
  } catch {
    // Guest
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("portrait_session_id")?.value;

  const portrait = await getPortrait(portraitId);

  if (!portrait) notFound();

  // Authorization: must be owner
  const isOwner =
    (userId && portrait.userId === userId) ||
    (sessionId && portrait.sessionId === sessionId);

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Portrait not found</h1>
          <p className="text-slate-600 mb-6">
            This portrait belongs to another session. Start a new portrait to get started.
          </p>
          <Button asChild>
            <Link href="/portraits/create">Create Your Portrait</Link>
          </Button>
        </div>
      </div>
    );
  }

  // --- Status: still generating ---
  if (portrait.status === "generating" || portrait.status === "analyzing") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Your portrait is being created…
          </h1>
          <p className="text-slate-600">
            This usually takes 15–30 seconds. Refresh this page in a moment.
          </p>
        </div>
      </div>
    );
  }

  // --- Status: failed ---
  if (portrait.status === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Generation failed</h1>
          <p className="text-slate-600 mb-2">
            {portrait.errorMessage || "Something went wrong during generation."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/portraits/create">Try Again</Link>
          </Button>
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
          <Link
            href="/portraits/create"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Create Another
          </Link>
          <span className="text-sm font-medium text-slate-700">Portrait Preview</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left: Preview image */}
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
                        <Lock className="h-4 w-4" />
                        Watermarked preview — purchase to unlock
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-slate-600" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Badge variant="outline" className="capitalize">
                {portrait.stylePackSlug?.replace(/-/g, " ")}
              </Badge>
              <span>·</span>
              <span className="capitalize">{portrait.styleVariantSlug?.replace(/-/g, " ")}</span>
            </div>
          </div>

          {/* Right: Purchase options */}
          {isPurchased ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-8 w-8" />
                <div>
                  <h2 className="text-xl font-bold">Portrait purchased!</h2>
                  <p className="text-sm text-green-600">
                    Check your email for the download link.
                  </p>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href="/portraits/create">Create Another Portrait</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Love your portrait?
                </h1>
                <p className="text-slate-600">
                  Remove the watermark and get your full-resolution portrait.
                  Delivered instantly to your email.
                </p>
              </div>

              {/* Digital download */}
              <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Download className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-900">Digital Download</h3>
                        <span className="text-xl font-bold text-slate-900">$14.95</span>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1 mb-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Full 4K resolution, no watermark
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Instant delivery to your email
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Download up to 5 times (72 hours)
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          No account required
                        </li>
                      </ul>
                      {/* Phase 3: Stripe checkout — link placeholder */}
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        asChild
                      >
                        <Link href={`/api/orders/create?portraitId=${portrait.id}&type=digital`}>
                          Purchase Digital Download
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Print options */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Printer className="h-5 w-5 text-slate-600" />
                  <h3 className="font-bold text-slate-900">Museum-Quality Print</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PRINT_OPTIONS.map((opt) => (
                    <Card
                      key={opt.sku}
                      className="border border-slate-200 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-3 text-center">
                        <div className="text-sm font-semibold text-slate-900">{opt.size}</div>
                        <div className="text-lg font-bold text-slate-900">${opt.price}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full text-xs"
                          asChild
                        >
                          <Link
                            href={`/api/orders/create?portraitId=${portrait.id}&type=print&sku=${opt.sku}`}
                          >
                            Order Print
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Canvas, framed, and art print options available · Ships worldwide
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
