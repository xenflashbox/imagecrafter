"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics-client";

const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "placement",
  "gclid",
  "fbclid",
  "ttclid",
] as const;

type CampaignLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  children: ReactNode;
  eventName?: string;
  eventMetadata?: Record<string, unknown>;
};

export function CampaignLink({
  href,
  children,
  eventName,
  eventMetadata,
  ...props
}: CampaignLinkProps) {
  const searchParams = useSearchParams();
  const target = new URL(href, "https://imagecrafter.app");

  for (const key of ATTRIBUTION_PARAMS) {
    const value = searchParams.get(key);
    if (value && !target.searchParams.has(key)) target.searchParams.set(key, value);
  }

  const path = `${target.pathname}${target.search}`;

  return (
    <Link
      {...props}
      href={path}
      onClick={() => {
        if (eventName) trackEvent(eventName, { metadata: eventMetadata });
      }}
    >
      {children}
    </Link>
  );
}
