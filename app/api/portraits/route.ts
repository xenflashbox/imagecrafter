/**
 * GET /api/portraits
 *
 * Returns the authenticated subscriber's portrait history.
 * Guest portraits (no userId) are not included — they belong to sessionId.
 *
 * Query params:
 *   limit  - max items (default: 50, max: 100)
 *   page   - page number (default: 1)
 *
 * Auth: required (subscriber portrait history only)
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
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const skip = (page - 1) * limit;

  const [portraits, total] = await Promise.all([
    prisma.portrait.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        previewImageUrl: true,
        status: true,
        stylePackSlug: true,
        styleVariantSlug: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    }),
    prisma.portrait.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    success: true,
    portraits,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + portraits.length < total,
    },
  });
}
