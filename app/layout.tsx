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
    "AI-powered image generation tool that creates professional images from simple text descriptions.",
  url: "https://imagecrafter.app",
  author: {
    "@type": "Organization",
    name: "Xenco Labs",
    url: "https://xencolabs.com",
  },
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "0",
    highPrice: "49",
    priceCurrency: "USD",
    offerCount: "4",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description: "5 images per month, watermarked",
      },
      {
        "@type": "Offer",
        name: "Starter",
        price: "9",
        priceCurrency: "USD",
        description: "100 images per month, no watermark",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "19",
        priceCurrency: "USD",
        description: "500 images per month, 4K, projects",
      },
      {
        "@type": "Offer",
        name: "Team",
        price: "49",
        priceCurrency: "USD",
        description: "2000 images per month, API access",
      },
    ],
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "127",
    bestRating: "5",
    worstRating: "1",
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
        </body>
      </html>
    </ClerkProvider>
  );
}
