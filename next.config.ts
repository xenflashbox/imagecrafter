import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image-gen.xencolabs.com",
      },
      {
        protocol: "https",
        hostname: "images.imagecrafter.app",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
  // `/` is the canonical landing page. /portraits was a second, divergent
  // landing page — permanently folded into it. Sub-paths (/portraits/create,
  // /portraits/[id]/…) are untouched: `source` matches this path exactly.
  async redirects() {
    return [{ source: "/portraits", destination: "/", permanent: true }];
  },
  // Increase body size limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
