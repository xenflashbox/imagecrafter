"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Facebook, Share2, Twitter } from "lucide-react";

interface Props {
  portraitId: string;
  /** Public /p/[id] URL — the preview route itself is owner-gated. */
  shareUrl: string;
  /** Public R2 preview, needed by Pinterest's media param. */
  imageUrl: string;
}

const CAPTION = "I turned one photo into this.";

/** Pinterest has no lucide glyph and it is a real channel for portrait art. */
function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.03-.655 2.569-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.137.893 2.739a.36.36 0 0 1 .083.345c-.091.379-.293 1.194-.333 1.361-.052.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146A12 12 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}

export function ShareButtons({ portraitId, shareUrl, imageUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const openIntent = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer,width=620,height=680");

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(CAPTION);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Chrome desktop exposes navigator.share too, so this is not a mobile-only
  // branch — it is simply the best available surface when the browser has one.
  const nativeShare = async () => {
    try {
      await navigator.share({ title: "ImageCrafter", text: CAPTION, url: shareUrl });
    } catch {
      // The user dismissed the sheet. Not an error worth surfacing.
    }
  };

  // Resolved after mount: the server has no navigator, and rendering the button
  // straight from the feature check would fail hydration.
  const [hasNativeShare, setHasNativeShare] = useState(false);
  useEffect(() => {
    setHasNativeShare(typeof navigator.share === "function");
  }, []);

  return (
    <div className="rounded-2xl border border-rim bg-surface p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <Share2 className="size-4 text-accent" /> Show someone
      </h3>
      <p className="mb-4 text-sm text-ink-muted">
        Share the watermarked preview anywhere — it stays yours, and you can
        still buy the clean copy afterwards.
      </p>

      <div className="flex flex-wrap gap-2">
        {hasNativeShare && (
          <button
            onClick={nativeShare}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
          >
            <Share2 className="size-4" /> Share
          </button>
        )}

        <button
          onClick={() =>
            openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)
          }
          className="inline-flex items-center gap-2 rounded-lg border border-rim px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
        >
          <Facebook className="size-4" /> Facebook
        </button>

        <button
          onClick={() =>
            openIntent(
              `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            )
          }
          className="inline-flex items-center gap-2 rounded-lg border border-rim px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
        >
          <Twitter className="size-4" /> X
        </button>

        <button
          onClick={() =>
            openIntent(
              `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(
                imageUrl,
              )}&description=${encodedText}`,
            )
          }
          className="inline-flex items-center gap-2 rounded-lg border border-rim px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
        >
          <PinterestIcon className="size-4" /> Pinterest
        </button>

        <button
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-lg border border-rim px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
        >
          {copied ? (
            <>
              <Check className="size-4 text-positive" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copy link
            </>
          )}
        </button>

        <a
          href={`/api/portraits/${portraitId}/share-image`}
          className="inline-flex items-center gap-2 rounded-lg border border-rim px-3 py-2 text-sm text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
        >
          <Download className="size-4" /> Save image
        </a>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Instagram and TikTok have no web posting — save the image and post it
        from the app.
      </p>
    </div>
  );
}
