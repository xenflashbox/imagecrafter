"use client";

import Script from "next/script";
import { ExternalLink, Play } from "lucide-react";
import { trackEvent } from "@/lib/analytics-client";

const TIKTOK_PROFILE = "https://www.tiktok.com/@imagecrafter.app";

export function SocialProfileShowcase() {
  const trackTikTokVisit = () => {
    trackEvent("social_outbound_clicked", {
      metadata: { platform: "tiktok", destination: "creator_profile" },
    });
  };

  return (
    <section className="border-y border-rim bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:py-16">
        <div className="min-w-0 lg:sticky lg:top-28">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            <Play className="size-3.5 fill-current" />
            ImageCrafter on TikTok
          </p>
          <h2 className="mt-5 font-display text-3xl font-light leading-tight text-ink sm:text-4xl">
            Portraits in motion.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-ink-muted">
            Watch real pet transformations come to life, then share your favorites
            directly from TikTok.
          </p>
          <a
            href={TIKTOK_PROFILE}
            target="_blank"
            rel="noreferrer"
            onClick={trackTikTokVisit}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-ink px-5 py-3 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
          >
            Watch on TikTok <ExternalLink className="size-4" />
          </a>
        </div>

        <div className="min-h-[460px] min-w-0 overflow-hidden" data-testid="tiktok-profile-embed">
          <blockquote
            className="tiktok-embed"
            cite={TIKTOK_PROFILE}
            data-unique-id="imagecrafter.app"
            data-embed-type="creator"
            data-embed-from="oembed"
            style={{ maxWidth: "720px", minWidth: "288px", margin: "0 auto" }}
          >
            <section>
              <a
                href={TIKTOK_PROFILE}
                target="_blank"
                rel="noreferrer"
                onClick={trackTikTokVisit}
                className="text-sm font-semibold text-accent underline underline-offset-4"
              >
                @imagecrafter.app on TikTok
              </a>
            </section>
          </blockquote>
        </div>
      </div>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
    </section>
  );
}
