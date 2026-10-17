"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics-client";

export type PublicGalleryItem = {
  id: string;
  sourceImageUrl: string;
  previewImageUrl: string;
  stylePackSlug: string;
  styleVariantSlug: string;
  createdAt: string;
  votes: { up: number; down: number };
  myVote: number;
};

function titleCase(slug: string) {
  return slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function GalleryShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = "https://imagecrafter.app/gallery";
    trackEvent("gallery_shared", { metadata: { target: "gallery" } });
    if (navigator.share) {
      try {
        await navigator.share({ title: "ImageCrafter pet portrait gallery", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={() => void share()} className="inline-flex items-center justify-center gap-2 rounded-sm border border-rim px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-rim-strong hover:bg-surface">
      {copied ? <Check className="size-4 text-positive" /> : <Share2 className="size-4" />}
      {copied ? "Copied" : "Share gallery"}
    </button>
  );
}

export function PublicGallery({ initialItems, initialCursor }: { initialItems: PublicGalleryItem[]; initialCursor: string | null }) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const vote = async (portraitId: string, value: 1 | -1) => {
    setVoting(portraitId);
    setError("");
    try {
      const response = await fetch("/api/gallery/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portraitId, value }),
      });
      if (!response.ok) throw new Error("Vote failed");
      const result = await response.json() as { votes: { up: number; down: number }; myVote: number };
      setItems((current) => current.map((item) => item.id === portraitId ? { ...item, votes: result.votes, myVote: result.myVote } : item));
    } catch {
      setError("Your vote could not be saved. Please try again.");
    } finally {
      setVoting(null);
    }
  };

  const sharePortrait = async (item: PublicGalleryItem) => {
    const url = `https://imagecrafter.app/gallery#portrait-${item.id}`;
    trackEvent("gallery_shared", { portraitId: item.id, metadata: { target: "portrait" } });
    if (navigator.share) {
      try {
        await navigator.share({ title: `${titleCase(item.styleVariantSlug)} pet portrait`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/gallery?cursor=${encodeURIComponent(cursor)}`);
      if (!response.ok) throw new Error("Could not load gallery");
      const page = await response.json() as { items: PublicGalleryItem[]; nextCursor: string | null };
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
      trackEvent("gallery_load_more", { metadata: { loaded: page.items.length } });
    } catch {
      setError("More portraits could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((portrait, index) => {
          const style = [portrait.stylePackSlug, portrait.styleVariantSlug].filter(Boolean).map(titleCase).join(" / ");
          return (
            <article id={`portrait-${portrait.id}`} key={portrait.id} className="group min-w-0 scroll-mt-24 border-t border-rim pt-5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <figure>
                  <div className="artframe aspect-[4/5] bg-surface"><Image src={portrait.sourceImageUrl} alt={`Original pet photo before transformation ${index + 1}`} width={600} height={750} className="h-full w-full object-cover" sizes="(min-width: 1024px) 18vw, (min-width: 640px) 42vw, 48vw" /></div>
                  <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Before</figcaption>
                </figure>
                <figure>
                  <div className="artframe aspect-[4/5] bg-surface"><Image src={portrait.previewImageUrl} alt={`Generated ${style} pet portrait ${index + 1}`} width={600} height={750} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" sizes="(min-width: 1024px) 18vw, (min-width: 640px) 42vw, 48vw" /></div>
                  <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-accent">After</figcaption>
                </figure>
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">{style || "Pet Portrait"}</p>
                <p className="shrink-0 text-xs tabular-nums text-ink-faint">{new Date(portrait.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
              <div className="mt-3 flex items-center gap-1 border-t border-rim pt-3">
                <button aria-label="Love this portrait" aria-pressed={portrait.myVote === 1} disabled={voting === portrait.id} onClick={() => void vote(portrait.id, 1)} className={`inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors ${portrait.myVote === 1 ? "bg-ink text-canvas" : "text-ink-muted hover:bg-surface hover:text-ink"}`}><ThumbsUp className="size-4" /> {portrait.votes.up}</button>
                <button aria-label="Not for me" aria-pressed={portrait.myVote === -1} disabled={voting === portrait.id} onClick={() => void vote(portrait.id, -1)} className={`inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors ${portrait.myVote === -1 ? "bg-ink text-canvas" : "text-ink-muted hover:bg-surface hover:text-ink"}`}><ThumbsDown className="size-4" /> {portrait.votes.down}</button>
                <button aria-label="Share this portrait" onClick={() => void sharePortrait(portrait)} className="ml-auto inline-flex size-9 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink" title="Share this portrait">{copiedId === portrait.id ? <Check className="size-4 text-positive" /> : <Share2 className="size-4" />}</button>
                {copiedId === portrait.id && <span className="sr-only">Link copied</span>}
              </div>
            </article>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-6 text-center text-sm font-medium text-accent">{error}</p>}
      {cursor && <div className="mt-14 flex justify-center"><button onClick={() => void loadMore()} disabled={loading} className="inline-flex min-h-11 items-center rounded-sm border border-rim px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-rim-strong hover:bg-surface disabled:opacity-50">{loading ? "Loading..." : "Show more portraits"}</button></div>}
    </>
  );
}
