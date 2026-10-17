"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "yx28k3400t";
const CANONICAL_HOSTS = new Set(["imagecrafter.app", "www.imagecrafter.app"]);

export function ClarityAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(CANONICAL_HOSTS.has(window.location.hostname));
  }, []);

  if (!CLARITY_PROJECT_ID || !allowed) return null;

  return (
    <Script
      id="ms-clarity"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
        `,
      }}
    />
  );
}
