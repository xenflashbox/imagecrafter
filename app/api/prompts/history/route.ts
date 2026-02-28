/**
 * GET /api/prompts/history — Prompt History
 *
 * Returns the authenticated user's prompt history with pagination.
 * Supports filtering by saved status and search on prompt text.
 *
 * PATCH /api/prompts/history — Toggle isSaved / delete entry
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const savedOnly = searchParams.get("saved") === "true";
  const search = searchParams.get("search")?.trim() || "";
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(savedOnly ? { isSaved: true } : {}),
    ...(search
      ? {
          OR: [
            { prompt: { contains: search, mode: "insensitive" as const } },
            { originalPrompt: { contains: search, mode: "insensitive" as const } },
            { enhancedPrompt: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.promptHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        originalPrompt: true,
        enhancedPrompt: true,
        prompt: true,
        templateSlug: true,
        aspectRatio: true,
        wasSuccessful: true,
        isSaved: true,
        timesUsed: true,
        createdAt: true,
      },
    }),
    prisma.promptHistory.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: skip + items.length < total,
    hasPrevPage: page > 1,
  });
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !action) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  const entry = await prisma.promptHistory.findFirst({ where: { id, userId } });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "toggleSave") {
    const updated = await prisma.promptHistory.update({
      where: { id },
      data: { isSaved: !entry.isSaved },
      select: { id: true, isSaved: true },
    });
    return NextResponse.json(updated);
  }

  if (action === "delete") {
    await prisma.promptHistory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
