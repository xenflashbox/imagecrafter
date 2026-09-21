import assert from "node:assert/strict";
import { test } from "node:test";
import { expirePortraitOrder } from "../lib/services/expire-portrait-order";

test("expiry uses an atomic pending-state and current-session guard", async () => {
  let query: unknown;
  const orders = { updateMany: async (args: unknown) => {
    query = args;
    return { count: 1 };
  } } as unknown as Parameters<typeof expirePortraitOrder>[0];
  await expirePortraitOrder(orders, { id: "cs_current", metadata: { orderId: "order_test" } });
  assert.deepEqual(query, {
    where: { id: "order_test", stripeSessionId: "cs_current", status: "pending" },
    data: { status: "failed" },
  });
});

for (const status of ["pending", "paid", "fulfilled", "shipped", "delivered", "refunded", "failed"]) {
  for (const sessionId of ["cs_current", "cs_abandoned"]) {
    test(`${status} order receiving expiry for ${sessionId}`, async () => {
      const row = { id: "order_test", stripeSessionId: "cs_current", status };
      const orders = { updateMany: async ({ where, data }: {
        where: typeof row; data: { status: string };
      }) => {
        const matches = Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value);
        if (matches) row.status = data.status;
        return { count: Number(matches) };
      } } as unknown as Parameters<typeof expirePortraitOrder>[0];
      const event = { id: sessionId, metadata: { orderId: row.id } };
      await expirePortraitOrder(orders, event);
      await expirePortraitOrder(orders, event);
      assert.equal(row.status, status === "pending" && sessionId === "cs_current" ? "failed" : status);
    });
  }
}

test("non-portrait sessions do not write; database failures propagate for retry", async () => {
  const orders = { updateMany: async () => { throw new Error("database unavailable"); } } as unknown as Parameters<typeof expirePortraitOrder>[0];
  await expirePortraitOrder(orders, { id: "cs_other", metadata: null });
  await assert.rejects(expirePortraitOrder(orders, { id: "cs_current", metadata: { orderId: "order_test" } }), /database unavailable/);
});
