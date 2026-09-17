/**
 * POST /api/revalidate?secret=<REVALIDATE_SECRET>&slug=<article-slug>
 *
 * Called by Payload CMS (fire-and-forget, 10s timeout, no body) when an
 * article is published or updated. Contract matches the EWP/WCC handlers so
 * the CMS needs no per-site special-casing.
 *
 * The blog routes are `force-dynamic`, so there is no route cache to bust —
 * staleness comes entirely from the 60s Data Cache on the Payload fetches.
 * `revalidateTag` is therefore the load-bearing call here; the path
 * revalidation only matters if a blog route ever becomes static again.
 */

import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { PAYLOAD_CACHE_TAG } from "@/lib/payload";

/** Compare digests so a wrong-length guess costs the same as a wrong value. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return a.equals(b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;

  // Fails closed. The reference handler on the other sites treats a missing
  // secret as "no auth required", which leaves the endpoint open to anyone.
  if (!expected) {
    console.error(
      "[Revalidate] REVALIDATE_SECRET is not set — rejecting. The blog will serve stale content until it is configured."
    );
    return NextResponse.json(
      { error: "Revalidation is not configured" },
      { status: 503 }
    );
  }

  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || !secretMatches(secret, expected)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  revalidateTag(PAYLOAD_CACHE_TAG);
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog");

  console.log(`[Revalidate] purged Payload cache for slug="${slug}"`);

  return NextResponse.json({ revalidated: true, slug });
}
