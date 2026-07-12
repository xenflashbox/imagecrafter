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
  // Increase body size limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
