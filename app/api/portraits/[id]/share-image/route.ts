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
import sharp from "sharp";

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

  const upstream = await fetch(portrait.previewImageUrl, { signal: AbortSignal.timeout(15000) });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Preview unavailable (${upstream.status})` },
      { status: 502 },
    );
  }

  const filename = `imagecrafter-${portrait.stylePackSlug || "portrait"}-${id}.png`;
  const preview = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .resize({ width: 900, withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  const width = preview.info.width;
  const footerHeight = Math.round(width * 0.16);
  const footer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${footerHeight}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="50%" y="40%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(width * 0.038)}" font-weight="bold" fill="#182c29">ImageCrafter</text>
    <text x="50%" y="75%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(width * 0.025)}" fill="#182c29">Make your own at imagecrafter.app</text>
  </svg>`);
  const branded = await sharp(preview.data).extend({ bottom: footerHeight, background: "#ffffff" })
    .composite([{ input: footer, top: preview.info.height, left: 0 }]).png().toBuffer();

  return new NextResponse(new Uint8Array(branded), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
