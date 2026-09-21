import type { PrismaClient } from "@prisma/client";

export async function expirePortraitOrder(
  orders: Pick<PrismaClient["order"], "updateMany">,
  session: { id: string; metadata: Record<string, string> | null }
) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  // An order can have several abandoned sessions before a successful payment.
  // Check the session and state in the write itself so delivery order is safe.
  return orders.updateMany({
    where: { id: orderId, stripeSessionId: session.id, status: "pending" },
    data: { status: "failed" },
  });
}
