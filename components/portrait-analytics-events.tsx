"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics-client";

export function PortraitViewEvent({
  eventName,
  portraitId,
  metadata,
}: {
  eventName: "preview_viewed" | "share_page_viewed" | "checkout_returned";
  portraitId: string;
  metadata?: Record<string, unknown>;
}) {
  useEffect(() => {
    trackEvent(eventName, { portraitId, metadata });
  }, [eventName, portraitId, metadata]);

  return null;
}
