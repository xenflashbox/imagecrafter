"use client";

/**
 * DualPickPanel — side-by-side provider comparison for a DUAL
 * GenerationRequest. Shows exactly the images the service returned (never a
 * fabricated placeholder for a failed provider) and persists the user's pick
 * via POST /api/images/requests/[id]/select.
 */

import { useState } from "react";
import { AlertCircle, Check, Loader2, Trophy } from "lucide-react";

export interface DualImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
}

export interface FailedProvider {
  provider: string;
  error: string;
}

interface DualPickPanelProps {
  requestId: string;
  images: DualImage[];
  failedProviders?: FailedProvider[];
  /** Server-side auto-selection (single surviving image on PARTIAL). */
  initialSelectedImageId?: string | null;
  onWinnerSelected: (image: DualImage) => void;
}

function providerLabel(provider: string | null): string {
  if (!provider) return "Unknown engine";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function DualPickPanel({
  requestId,
  images,
  failedProviders,
  initialSelectedImageId,
  onWinnerSelected,
}: DualPickPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedImageId ?? null
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const handlePick = async (image: DualImage) => {
    if (pendingId || selectedId === image.id) return;
    setPendingId(image.id);
    setSelectError(null);
    try {
      const res = await fetch(`/api/images/requests/${requestId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: image.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save your pick");
      }
      setSelectedId(image.id);
      onWinnerSelected(image);
    } catch (err) {
      setSelectError(
        err instanceof Error ? err.message : "Failed to save your pick"
      );
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Partial-failure notice: honest about what the service returned */}
      {failedProviders && failedProviders.length > 0 && (
        <div className="flex items-start gap-2 text-amber-400 text-sm bg-amber-500/10 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            {failedProviders.map((f) => (
              <div key={f.provider}>
                {providerLabel(f.provider)} failed to generate — you were only
                charged for the image{images.length > 1 ? "s" : ""} you
                received.
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`grid gap-4 ${
          images.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {images.map((image) => {
          const isWinner = selectedId === image.id;
          const isPending = pendingId === image.id;
          return (
            <div
              key={image.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isWinner
                  ? "border-violet-500 ring-2 ring-violet-500/30"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="relative aspect-square bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={`${providerLabel(image.provider)} result`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/60 text-xs text-white/80">
                  {providerLabel(image.provider)}
                  {image.model ? ` · ${image.model}` : ""}
                </div>
                {isWinner && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-violet-600 text-xs text-white flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Your pick
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">
                  {image.latencyMs != null
                    ? `${(image.latencyMs / 1000).toFixed(1)}s`
                    : ""}
                </span>
                {images.length > 1 && (
                  <button
                    onClick={() => handlePick(image)}
                    disabled={isPending || isWinner || pendingId !== null}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      isWinner
                        ? "bg-violet-600/30 text-violet-300 cursor-default"
                        : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isWinner ? (
                      <Check className="w-4 h-4" />
                    ) : null}
                    {isWinner ? "Selected" : "Choose this one"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectError && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {selectError}
        </div>
      )}

      {images.length > 1 && !selectedId && (
        <p className="text-xs text-white/40 text-center">
          Pick your favorite — it becomes the image shown in your gallery.
        </p>
      )}
    </div>
  );
}
