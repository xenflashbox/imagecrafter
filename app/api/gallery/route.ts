import { NextRequest, NextResponse } from "next/server";
import {
  GALLERY_PAGE_SIZE,
  galleryVoterKey,
  getPublicGalleryPage,
} from "@/lib/services/public-gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor");
  const visitorId = request.cookies.get("gallery_visitor_id")?.value;
  const page = await getPublicGalleryPage({
    cursor,
    limit: GALLERY_PAGE_SIZE,
    voterKey: visitorId ? galleryVoterKey(visitorId) : null,
  });

  return NextResponse.json(
    {
      ...page,
      items: page.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
