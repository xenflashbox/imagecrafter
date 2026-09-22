import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendPortraitReturnEmail } from "./email-notification";
import { hashReturnToken, newReturnToken, RETURN_COOKIE, RETURN_SECONDS, returnUrl, usableReturn, validReturnToken } from "./portrait-return-token";

export async function portraitReturnAccess(portraitId: string, token?: string) {
  const value = token ?? (await cookies()).get(RETURN_COOKIE)?.value;
  if (!value || !validReturnToken(value)) return null;
  const row = await prisma.portraitReturn.findUnique({ where: { tokenHash: hashReturnToken(value) } });
  return usableReturn(row, portraitId) && row?.verifiedAt ? row : null;
}

export async function issuePortraitReturn(portraitId: string, email: string, marketingRequested: boolean) {
  const normalized = email.trim().toLowerCase();
  const token = newReturnToken();
  const now = new Date();
  const row = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`return:${portraitId}:${normalized}`}, 0))`;
    const old = await tx.portraitReturn.findUnique({ where: { portraitId_email: { portraitId, email: normalized } } });
    if (old?.revokedAt || (old && now.getTime() - old.lastSentAt.getTime() < 5 * 60_000)) return null;
    return tx.portraitReturn.upsert({
      where: { portraitId_email: { portraitId, email: normalized } },
      create: { portraitId, email: normalized, tokenHash: hashReturnToken(token), expiresAt: new Date(now.getTime() + RETURN_SECONDS * 1000), marketingRequested },
      update: { tokenHash: hashReturnToken(token), expiresAt: new Date(now.getTime() + RETURN_SECONDS * 1000), lastSentAt: now, verifiedAt: null, marketingRequested },
    });
  });
  if (!row) return null;
  const url = returnUrl(portraitId, token);
  await sendPortraitReturnEmail(normalized, url);
  return url;
}

export async function allowRecoveryRequest(ip: string) {
  const bucket = Math.floor(Date.now() / 3600_000);
  const key = hashReturnToken(`recovery:${ip}:${bucket}`);
  const row = await prisma.recoveryRateLimit.upsert({ where: { key },
    create: { key, expiresAt: new Date((bucket + 2) * 3600_000) },
    update: { count: { increment: 1 } },
  });
  await prisma.recoveryRateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return row.count <= 10;
}
