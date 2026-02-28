/**
 * GET /api/images
 *
 * Returns the authenticated user's generated images for the gallery.
 * Supports pagination, search, and template filtering.
 *
 * Query params:
 *   page     - page number (default: 1)
 *   limit    - items per page (default: 24, max: 48)
 *   search   - filter by prompt text
 *   template - filter by template slug
 *   favorite - "true" to return only favorites
 *
 * Auth: required
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "24")));
  const search = searchParams.get("search") || "";
  const templateFilter = searchParams.get("template") || "";
  const favoritesOnly = searchParams.get("favorite") === "true";

  const skip = (page - 1) * limit;

  const where = {
    userId,
    deletedAt: null,
    status: "COMPLETED" as const,
    ...(search
      ? {
          OR: [
            { originalPrompt: { contains: search, mode: "insensitive" as const } },
            { enhancedPrompt: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(templateFilter ? { template: { slug: templateFilter } } : {}),
    ...(favoritesOnly ? { isFavorite: true } : {}),
  };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        imageUrl: true,
        thumbnailUrl: true,
        originalPrompt: true,
        enhancedPrompt: true,
        aspectRatio: true,
        resolution: true,
        creditsCost: true,
        hasWatermark: true,
        isFavorite: true,
        generatedAt: true,
        template: {
          select: { name: true, slug: true },
        },
        project: {
          select: { name: true },
        },
      },
    }),
    prisma.image.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    images,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + images.length < total,
    },
  });
}

/**
 * PATCH /api/images
 * Toggle favorite on an image.
 */
export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  let body: { imageId?: string; isFavorite?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.imageId) {
    return NextResponse.json({ success: false, error: "imageId required" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: { id: body.imageId, userId },
    select: { id: true, isFavorite: true },
  });

  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }

  const newFavorite = typeof body.isFavorite === "boolean" ? body.isFavorite : !image.isFavorite;

  await prisma.image.update({
    where: { id: image.id },
    data: { isFavorite: newFavorite },
  });

  return NextResponse.json({ success: true, isFavorite: newFavorite });
}
