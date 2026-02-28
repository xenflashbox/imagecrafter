/**
 * GET /api/portraits/style-packs
 *
 * Returns all active style packs with their variants.
 * PUBLIC — no authentication required.
 * Used to populate the Portrait Studio gallery and style selector.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const stylePacks = await prisma.stylePack.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            sampleImageUrl: true,
            sortOrder: true,
            // Never expose promptTemplate or styleModifiers to the client
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      stylePacks,
    });
  } catch (error) {
    console.error("[StylePacks] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load style packs" },
      { status: 500 }
    );
  }
}
