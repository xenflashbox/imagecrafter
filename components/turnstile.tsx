"use client";

/**
 * Cloudflare Turnstile widget for the preview gate's escalation layer.
 *
 * Renders nothing when no site key is configured — the server refuses a
 * velocity trip outright in that case, so there is no challenge to solve.
 */

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!siteKey || rendered.current) return;

    const draw = () => {
      if (!containerRef.current || rendered.current || !window.turnstile) return;
      rendered.current = true;
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => onToken(token),
        "error-callback": () => onToken(null),
        "expired-callback": () => onToken(null),
      });
    };

    if (window.turnstile) {
      draw();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", draw);
    return () => script?.removeEventListener("load", draw);
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
