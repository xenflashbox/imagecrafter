import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output is for Docker/self-hosted deployments only
  // Vercel sets VERCEL=1 automatically; Docker deploy sets NEXT_OUTPUT_STANDALONE=true
  ...(process.env.VERCEL !== "1" && { output: "standalone" }),
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
