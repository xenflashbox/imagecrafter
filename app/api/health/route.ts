import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "imagecrafter",
    version: process.env.npm_package_version ?? "0.1.0",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    builtAt: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    timestamp: new Date().toISOString(),
  });
}
