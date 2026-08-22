import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// =============================================================================
// SEO METADATA
// =============================================================================

export const metadata: Metadata = {
  // Basic Meta
  title: {
    default: "ImageCrafter - AI Image Generation Made Simple",
    template: "%s | ImageCrafter",
  },
  description:
    "Create stunning AI images without learning complex prompts. Smart templates, character consistency, and professional results every time. Start free.",
  keywords: [
    "AI image generation",
    "text to image",
    "AI art generator",
    "image creator",
    "children's book illustrations",
    "blog images",
    "AI graphics",
    "prompt engineering",
    "Gemini image generator",
    "AI marketing images",
  ],
  authors: [{ name: "Xenco Labs", url: "https://xencolabs.com" }],
  creator: "Xenco Labs",
  publisher: "Xenco Labs",

  // Robots - ALLOW INDEXING
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://imagecrafter.app",
    siteName: "ImageCrafter",
    title: "ImageCrafter - AI Image Generation Made Simple",
    description:
      "Create stunning AI images without learning complex prompts. Smart templates and professional results every time.",
    images: [
      {
        url: "https://imagecrafter.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "ImageCrafter - AI Image Generation Made Simple",
      },
    ],
  },

  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "ImageCrafter - AI Image Generation Made Simple",
    description:
      "Create stunning AI images without learning complex prompts. Start free.",
    images: ["https://imagecrafter.app/og-image.png"],
    creator: "@xencolabs",
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  // Manifest
  manifest: "/site.webmanifest",

  // Verification (add your IDs)
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },

  // Canonical
  alternates: {
    canonical: "https://imagecrafter.app",
  },

  // Category
  category: "technology",
};

// =============================================================================
// VIEWPORT
// =============================================================================

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#06060a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// =============================================================================
// STRUCTURED DATA (JSON-LD)
// =============================================================================

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ImageCrafter",
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description:
    "AI portrait studio — turn your photo into a Renaissance, Starry Night, or Elven fantasy portrait. Full 4K digital downloads and museum-quality prints.",
  url: "https://imagecrafter.app",
  author: {
    "@type": "Organization",
    name: "Xenco Labs",
    url: "https://xencolabs.com",
  },
  // Real catalog only (founder-approved 2026-08 ladder). No aggregateRating:
  // a fabricated rating is a Google structured-data policy violation.
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "29.95",
    highPrice: "149.95",
    priceCurrency: "USD",
    offerCount: "4",
    offers: [
      {
        "@type": "Offer",
        name: "Single Portrait",
        price: "29.95",
        priceCurrency: "USD",
        description: "One portrait — full 4K digital download, no watermark",
      },
      {
        "@type": "Offer",
        name: "3-Portrait Pack",
        price: "39.95",
        priceCurrency: "USD",
        description: "3 portrait credits — never expire",
      },
      {
        "@type": "Offer",
        name: "10-Portrait Pack",
        price: "74.95",
        priceCurrency: "USD",
        description: "10 portrait credits — never expire",
      },
      {
        "@type": "Offer",
        name: "25-Portrait Pack",
        price: "149.95",
        priceCurrency: "USD",
        description: "25 portrait credits — never expire",
      },
    ],
  },
};

// =============================================================================
// LAYOUT
// =============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          {/* Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />

          {/* Preconnect to external domains */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="preconnect" href="https://www.googletagmanager.com" />
          <link rel="preconnect" href="https://analytics.tiktok.com" />
          <link rel="preconnect" href="https://connect.facebook.net" />
        </head>
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}

          {/* Google Analytics */}
          {GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `}
              </Script>
            </>
          )}

          {/* TikTok Pixel */}
          {TIKTOK_PIXEL_ID && (
            <Script id="tiktok-pixel" strategy="afterInteractive">
              {`
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                  ttq.load('${TIKTOK_PIXEL_ID}');
                  ttq.page();
                }(window, document, 'ttq');
              `}
            </Script>
          )}

          {/* Meta Pixel */}
          {META_PIXEL_ID && (
            <>
              <Script id="meta-pixel" strategy="afterInteractive">
                {`
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${META_PIXEL_ID}');
                  fbq('track', 'PageView');
                `}
              </Script>
              <noscript>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  height="1"
                  width="1"
                  style={{ display: "none" }}
                  alt=""
                  src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
                />
              </noscript>
            </>
          )}

          {/* Ahrefs Web Analytics */}
          <Script
            src="https://analytics.ahrefs.com/analytics.js"
            data-key="3nx4JzGVP31C1ZRQV+ESEw"
            strategy="afterInteractive"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
