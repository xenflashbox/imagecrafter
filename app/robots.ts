import type { MetadataRoute } from "next";

/**
 * Robots.txt Configuration
 * 
 * IMPORTANT: This replaces any dev-time noindex settings.
 * This file explicitly ALLOWS all crawlers.
 */

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://imagecrafter.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",           // Don't index API routes
          "/generate",       // Don't index authenticated pages
          "/gallery",
          "/projects",
          "/history",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
