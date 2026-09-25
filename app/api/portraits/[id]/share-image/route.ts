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
import { ImageResponse } from "next/og";
import { createElement } from "react";

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
  // ImageResponse bundles its font; serverless hosts may have no system fonts
  // for Sharp's SVG text renderer, which otherwise produces missing-glyph boxes.
  const footerResponse = new ImageResponse(createElement("div", {
    style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Math.round(width * 0.015), background: "#ffffff", color: "#182c29" },
  },
  createElement("div", { style: { fontSize: Math.round(width * 0.038), fontWeight: 700 } }, "ImageCrafter"),
  createElement("div", { style: { fontSize: Math.round(width * 0.025) } }, "Make your own at https://imagecrafter.app")),
  { width, height: footerHeight });
  const footer = Buffer.from(await footerResponse.arrayBuffer());
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
