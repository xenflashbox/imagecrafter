import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createPortraitShareLink } from "@/lib/services/portrait-sharing";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const sessionId = request.cookies.get("portrait_session_id")?.value;
  if (!userId && !sessionId) return NextResponse.json({ error: "Sign in or open your original preview" }, { status: 401 });
  const portrait = await prisma.portrait.findUnique({ where: { id }, select: {
    userId: true, sessionId: true, status: true, previewImageUrl: true,
  } });
  if (!portrait || !((userId && portrait.userId === userId) || (sessionId && portrait.sessionId === sessionId))) {
    return NextResponse.json({ error: "Portrait not found" }, { status: 404 });
  }
  if (!portrait.previewImageUrl || !["preview", "purchased"].includes(portrait.status)) {
    return NextResponse.json({ error: "Your preview is not ready yet" }, { status: 409 });
  }
  try {
    const url = await createPortraitShareLink(id);
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[portrait-share] Branded link unavailable", error);
    return NextResponse.json({ error: "Branded link temporarily unavailable. Your direct preview link still works." }, { status: 503 });
  }
}
