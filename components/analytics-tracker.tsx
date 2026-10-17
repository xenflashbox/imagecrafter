"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution, trackEvent } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    const path = `${window.location.pathname}${window.location.search}`;
    if (lastTracked.current === path) return;
    lastTracked.current = path;
    trackEvent("page_view");
  }, [pathname]);

  return null;
}
