import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const GALLERY_PAGE_SIZE = 36;

export function galleryVoterKey(visitorId: string) {
  const salt = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "imagecrafter-gallery";
  return createHash("sha256").update(`${salt}:${visitorId}`).digest("hex");
}

export const galleryEligibility = {
  subjectType: "pet",
  status: "preview",
  sourceImageUrl: { not: "" },
  previewImageUrl: { not: null },
  order: null,
} as const;

export async function getPublicGalleryPage({
  cursor,
  limit = GALLERY_PAGE_SIZE,
  voterKey,
}: {
  cursor?: string | null;
  limit?: number;
  voterKey?: string | null;
}) {
  const portraits = await prisma.portrait.findMany({
    where: galleryEligibility,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      sourceImageUrl: true,
      previewImageUrl: true,
      stylePackSlug: true,
      styleVariantSlug: true,
      createdAt: true,
    },
  });

  const hasMore = portraits.length > limit;
  const page = hasMore ? portraits.slice(0, limit) : portraits;
  const ids = page.map((portrait) => portrait.id);

  const [voteCounts, visitorVotes] = ids.length
    ? await Promise.all([
        prisma.galleryVote.groupBy({
          by: ["portraitId", "value"],
          where: { portraitId: { in: ids } },
          _count: { _all: true },
        }),
        voterKey
          ? prisma.galleryVote.findMany({
              where: { portraitId: { in: ids }, voterKey },
              select: { portraitId: true, value: true },
            })
          : Promise.resolve([]),
      ])
    : [[], []];

  const counts = new Map<string, { up: number; down: number }>();
  for (const vote of voteCounts) {
    const current = counts.get(vote.portraitId) || { up: 0, down: 0 };
    if (vote.value === 1) current.up = vote._count._all;
    if (vote.value === -1) current.down = vote._count._all;
    counts.set(vote.portraitId, current);
  }
  const mine = new Map(visitorVotes.map((vote) => [vote.portraitId, vote.value]));

  return {
    items: page.map((portrait) => ({
      ...portrait,
      previewImageUrl: portrait.previewImageUrl!,
      votes: counts.get(portrait.id) || { up: 0, down: 0 },
      myVote: mine.get(portrait.id) || 0,
    })),
    nextCursor: hasMore ? page.at(-1)?.id || null : null,
  };
}
