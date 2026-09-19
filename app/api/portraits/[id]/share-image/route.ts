/**
 * GET /api/portraits/[id]/share-image
 *
 * Streams the WATERMARKED preview back as an attachment so the sharer can save
 * it and post it by hand. Instagram and TikTok have no web share-to-feed, so
 * download-and-post is the only honest path on those two.
 *
 * Public by unguessable id, exactly like /p/[id], and it never touches the
 * hi-res file — that stays behind the purchase.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const portrait = await prisma.portrait.findUnique({
    where: { id },
    select: { previewImageUrl: true, stylePackSlug: true, status: true },
  });

  if (
    !portrait?.previewImageUrl ||
    !["preview", "purchased"].includes(portrait.status)
  ) {
    return NextResponse.json({ error: "Portrait not found" }, { status: 404 });
  }

  const upstream = await fetch(portrait.previewImageUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Preview unavailable (${upstream.status})` },
      { status: 502 },
    );
  }

  const filename = `imagecrafter-${portrait.stylePackSlug || "portrait"}-${id}.png`;

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
