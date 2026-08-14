/**
 * Credits system smoke — exercises the REAL production code paths
 * (grantPackCredits, getCreditBalance, redeemCreditForPortrait from
 * lib/services/credits.ts) against the database in DATABASE_URL.
 *
 * Scenarios:
 *   1. Pack grant (+3)                          → balance 3
 *   2. Webhook replay of the same session       → alreadyGranted, balance 3
 *   3. Redeem portrait A                        → order paid $0, balance 2
 *   4. Redeem portrait A again                  → AlreadyPurchasedError
 *   5. Concurrent double-redeem of portrait B   → exactly one wins
 *   6. Drain to 0, then redeem portrait C       → InsufficientCreditsError
 *
 * Creates a throwaway smoke user + portraits; deletes ALL smoke rows in
 * a finally block (ledger, orders, portraits, user).
 *
 * Run: npx tsx scripts/smoke/credits-smoke.ts
 */

import { prisma } from "../../lib/prisma";
import {
  grantPackCredits,
  getCreditBalance,
  redeemCreditForPortrait,
  InsufficientCreditsError,
  AlreadyPurchasedError,
} from "../../lib/services/credits";

const ts = Date.now();
const USER_ID = `smoke-credits-${ts}`;
const SESSION = `cs_test_smoke_${ts}`;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function makePortrait(tag: string) {
  return prisma.portrait.create({
    data: {
      userId: USER_ID,
      sessionId: `smoke-session-${ts}`,
      sourceImageUrl: `https://smoke.invalid/${tag}.jpg`,
      sourceImageKey: `smoke/${tag}`,
      previewImageUrl: `https://smoke.invalid/${tag}-preview.jpg`,
      stylePackSlug: "renaissance",
      styleVariantSlug: "royal-portrait",
      subjectType: "person",
      subjectAnalysis: {},
      enhancedPrompt: "smoke",
      status: "preview",
    },
  });
}

const paidOrderData = {
  email: `smoke+${ts}@imagecrafter.app`,
  name: "Smoke Test",
  maxDownloads: 5,
  downloadExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
};

async function main() {
  await prisma.user.create({
    data: { id: USER_ID, email: paidOrderData.email, updatedAt: new Date() },
  });

  try {
    // 1. Pack grant
    const g1 = await grantPackCredits({
      userId: USER_ID,
      packSku: "PACK_3",
      credits: 3,
      stripeSessionId: SESSION,
    });
    check("grant PACK_3", g1.granted && !g1.alreadyGranted);
    check("balance after grant = 3", (await getCreditBalance(USER_ID)) === 3);

    // 2. Webhook replay
    const g2 = await grantPackCredits({
      userId: USER_ID,
      packSku: "PACK_3",
      credits: 3,
      stripeSessionId: SESSION,
    });
    check("replay rejected (idempotent)", !g2.granted && g2.alreadyGranted);
    check("balance still 3 after replay", (await getCreditBalance(USER_ID)) === 3);

    // 3. Redeem portrait A
    const pA = await makePortrait("a");
    const r1 = await redeemCreditForPortrait({
      userId: USER_ID,
      portraitId: pA.id,
      existingOrderId: null,
      paidOrderData,
    });
    const orderA = await prisma.order.findUnique({ where: { id: r1.orderId } });
    check(
      "redeem A: paid $0 digital order",
      orderA?.status === "paid" && orderA.amount === 0 && orderA.type === "digital"
    );
    const pAAfter = await prisma.portrait.findUnique({ where: { id: pA.id } });
    check("redeem A: portrait purchased", pAAfter?.status === "purchased");
    check("redeem A: balance 2", r1.balanceAfter === 2 && (await getCreditBalance(USER_ID)) === 2);

    // 4. Double-redeem same portrait
    let doubleRedeemBlocked = false;
    try {
      await redeemCreditForPortrait({
        userId: USER_ID,
        portraitId: pA.id,
        existingOrderId: r1.orderId,
        paidOrderData,
      });
    } catch (err) {
      doubleRedeemBlocked = err instanceof AlreadyPurchasedError;
    }
    check("re-redeem A blocked (AlreadyPurchasedError)", doubleRedeemBlocked);
    check("balance still 2", (await getCreditBalance(USER_ID)) === 2);

    // 5. Concurrent double-redeem of portrait B — exactly one may win
    const pB = await makePortrait("b");
    const results = await Promise.allSettled([
      redeemCreditForPortrait({ userId: USER_ID, portraitId: pB.id, existingOrderId: null, paidOrderData }),
      redeemCreditForPortrait({ userId: USER_ID, portraitId: pB.id, existingOrderId: null, paidOrderData }),
    ]);
    const wins = results.filter((r) => r.status === "fulfilled").length;
    check("concurrent redeem B: exactly 1 winner", wins === 1, `wins=${wins}`);
    check("balance 1 after concurrent race", (await getCreditBalance(USER_ID)) === 1);

    // 6. Drain to 0, then insufficient
    const pC = await makePortrait("c");
    await redeemCreditForPortrait({ userId: USER_ID, portraitId: pC.id, existingOrderId: null, paidOrderData });
    check("balance 0 after drain", (await getCreditBalance(USER_ID)) === 0);

    const pD = await makePortrait("d");
    let insufficientBlocked = false;
    try {
      await redeemCreditForPortrait({ userId: USER_ID, portraitId: pD.id, existingOrderId: null, paidOrderData });
    } catch (err) {
      insufficientBlocked = err instanceof InsufficientCreditsError;
    }
    check("zero-balance redeem blocked (InsufficientCreditsError)", insufficientBlocked);
    check("balance still 0", (await getCreditBalance(USER_ID)) === 0);

    const ledger = await prisma.creditLedger.findMany({ where: { userId: USER_ID } });
    const sum = ledger.reduce((a, e) => a + e.delta, 0);
    check("ledger integrity: 4 entries summing to 0", ledger.length === 4 && sum === 0, `entries=${ledger.length} sum=${sum}`);
  } finally {
    // Cleanup — remove every smoke row
    const del1 = await prisma.creditLedger.deleteMany({ where: { userId: USER_ID } });
    const del2 = await prisma.order.deleteMany({ where: { userId: USER_ID } });
    const del3 = await prisma.portrait.deleteMany({ where: { userId: USER_ID } });
    await prisma.user.delete({ where: { id: USER_ID } }).catch((e) => {
      console.error(`cleanup: user delete failed: ${e}`);
    });
    console.log(
      `\nCleanup: deleted ${del1.count} ledger, ${del2.count} orders, ${del3.count} portraits, user ${USER_ID}`
    );
  }

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE CRASHED:", err);
  process.exit(1);
});
