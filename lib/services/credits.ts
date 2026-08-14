/**
 * Portrait credit packs — append-only ledger over ic_CreditLedger.
 *
 * Balance = SUM(delta). Grants are idempotent on the Stripe checkout
 * session id (unique column); redemptions are serialized in
 * redeemCreditForOrder() to prevent double-spend races.
 *
 * Pack credits never expire and are separate from Subscription's
 * monthly-reset creditsLimit/creditsUsed (founder decision 2026-08-14).
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PackProduct {
  sku: string;
  name: string;
  credits: number;
  priceUsd: number; // cents
}

export const PACK_CATALOG: PackProduct[] = [
  { sku: "PACK_3", name: "3-Portrait Pack", credits: 3, priceUsd: 3995 },
  { sku: "PACK_10", name: "10-Portrait Pack", credits: 10, priceUsd: 7495 },
  { sku: "PACK_25", name: "25-Portrait Pack", credits: 25, priceUsd: 14995 },
];

export function resolvePack(sku: string): PackProduct | null {
  return PACK_CATALOG.find((p) => p.sku === sku) || null;
}

export async function getCreditBalance(userId: string): Promise<number> {
  const result = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

/**
 * Grant pack credits after a paid Stripe checkout. Idempotent: the unique
 * stripeSessionId column rejects webhook replays (P2002 → already granted).
 */
export async function grantPackCredits(params: {
  userId: string;
  packSku: string;
  credits: number;
  stripeSessionId: string;
}): Promise<{ granted: boolean; alreadyGranted: boolean }> {
  const { userId, packSku, credits, stripeSessionId } = params;
  if (credits <= 0) {
    throw new Error(`Refusing pack grant with non-positive credits: ${credits}`);
  }
  try {
    await prisma.creditLedger.create({
      data: {
        userId,
        delta: credits,
        reason: "pack_grant",
        stripeSessionId,
        packSku,
      },
    });
    return { granted: true, alreadyGranted: false };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.warn(
        `[credits] pack grant already recorded for session ${stripeSessionId} — webhook replay ignored`
      );
      return { granted: false, alreadyGranted: true };
    }
    throw err;
  }
}

export class InsufficientCreditsError extends Error {
  constructor(public balance: number) {
    super(`Insufficient credits: balance is ${balance}, need 1`);
    this.name = "InsufficientCreditsError";
  }
}

export class AlreadyPurchasedError extends Error {
  constructor(public orderId: string | null) {
    super("Portrait already purchased");
    this.name = "AlreadyPurchasedError";
  }
}

/**
 * Redeem 1 credit for a portrait's digital download in ONE serializable
 * transaction: portrait-status re-check, balance check, order
 * create/update, −1 ledger entry, and portrait→purchased are atomic, so
 * concurrent redeems can neither double-spend a credit nor double-redeem
 * a portrait.
 *
 * `paidOrderData` carries the route-level order fields (email, name,
 * maxDownloads, downloadExpiresAt). Throws InsufficientCreditsError or
 * AlreadyPurchasedError.
 */
export async function redeemCreditForPortrait(params: {
  userId: string;
  portraitId: string;
  existingOrderId: string | null;
  paidOrderData: {
    email: string;
    name: string | null;
    maxDownloads: number;
    downloadExpiresAt: Date;
  };
}): Promise<{ orderId: string; balanceAfter: number }> {
  const { userId, portraitId, existingOrderId, paidOrderData } = params;

  return prisma.$transaction(
    async (tx) => {
      // Re-check portrait status inside the transaction — a concurrent
      // redeem or cash checkout may have completed since the caller's read.
      const current = await tx.portrait.findUnique({
        where: { id: portraitId },
        select: { status: true, order: { select: { id: true } } },
      });
      if (current?.status === "purchased") {
        throw new AlreadyPurchasedError(current.order?.id || null);
      }

      const sum = await tx.creditLedger.aggregate({
        where: { userId },
        _sum: { delta: true },
      });
      const balance = sum._sum.delta ?? 0;
      if (balance < 1) {
        throw new InsufficientCreditsError(balance);
      }

      const paidData = {
        userId,
        email: paidOrderData.email,
        name: paidOrderData.name,
        type: "digital",
        printProductSku: null,
        printSize: null,
        printFrame: null,
        printFormat: null,
        amount: 0, // credit redemption — no cash charged
        currency: "usd",
        status: "paid",
        maxDownloads: paidOrderData.maxDownloads,
        downloadExpiresAt: paidOrderData.downloadExpiresAt,
        updatedAt: new Date(),
      };

      // Order.portraitId is @unique — reuse an existing pending order
      // (e.g. an abandoned cash checkout) rather than violate it.
      const order = existingOrderId
        ? await tx.order.update({ where: { id: existingOrderId }, data: paidData })
        : await tx.order.create({ data: { portraitId, ...paidData } });

      await tx.creditLedger.create({
        data: {
          userId,
          delta: -1,
          reason: "portrait_redeem",
          orderId: order.id,
          portraitId,
        },
      });

      await tx.portrait.update({
        where: { id: portraitId },
        data: { status: "purchased" },
      });

      return { orderId: order.id, balanceAfter: balance - 1 };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
