import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, logAnalyticsEvent } from "@/lib/services/analytics";
import { galleryEligibility, galleryVoterKey } from "@/lib/services/public-gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "gallery_visitor_id";

export async function POST(request: NextRequest) {
  let body: { portraitId?: string; value?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.portraitId || ![1, -1].includes(body.value || 0)) {
    return NextResponse.json({ error: "portraitId and a valid vote are required" }, { status: 400 });
  }

  const portrait = await prisma.portrait.findFirst({
    where: { id: body.portraitId, ...galleryEligibility },
    select: { id: true },
  });
  if (!portrait) return NextResponse.json({ error: "Portrait not found" }, { status: 404 });

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value || randomUUID();
  const voterKey = galleryVoterKey(visitorId);
  const existing = await prisma.galleryVote.findUnique({
    where: { portraitId_voterKey: { portraitId: portrait.id, voterKey } },
    select: { value: true },
  });

  let myVote = body.value!;
  if (existing?.value === body.value) {
    await prisma.galleryVote.delete({
      where: { portraitId_voterKey: { portraitId: portrait.id, voterKey } },
    });
    myVote = 0;
  } else {
    await prisma.galleryVote.upsert({
      where: { portraitId_voterKey: { portraitId: portrait.id, voterKey } },
      update: { value: body.value! },
      create: { portraitId: portrait.id, voterKey, value: body.value! },
    });
  }

  const grouped = await prisma.galleryVote.groupBy({
    by: ["value"],
    where: { portraitId: portrait.id },
    _count: { _all: true },
  });
  const votes = grouped.reduce(
    (result, row) => {
      if (row.value === 1) result.up = row._count._all;
      if (row.value === -1) result.down = row._count._all;
      return result;
    },
    { up: 0, down: 0 },
  );

  await logAnalyticsEvent({
    eventName: "gallery_vote_cast",
    portraitId: portrait.id,
    path: request.nextUrl.pathname,
    metadata: { value: myVote },
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  const response = NextResponse.json({ votes, myVote });
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
  }
  return response;
}
