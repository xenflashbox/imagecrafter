/**
 * Grant portrait credits to an account without a Stripe purchase.
 *
 * Writes a single admin_adjust row to the append-only ledger; balance is
 * SUM(delta), so this is the same mechanism a pack grant uses minus the
 * stripeSessionId idempotency key. Re-running adds MORE credits — it does not
 * set a balance — so check the printed balance before repeating.
 *
 *   npx tsx scripts/admin/grant-credits.ts --email=a@b.com --credits=50 [--apply]
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const APPLY = process.argv.includes("--apply");

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main(): Promise<void> {
  const email = arg("email");
  const credits = Number(arg("credits"));
  if (!email) throw new Error("--email is required");
  if (!Number.isInteger(credits) || credits <= 0) throw new Error("--credits must be a positive integer");

  const prisma = new PrismaClient();
  console.log(`→ DB host: ${new URL(process.env.DATABASE_URL!).host}`);

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new Error(`No ic_User row for ${email} — the Clerk webhook may not have fired`);

  const balanceOf = async () =>
    (await prisma.creditLedger.aggregate({ where: { userId: user.id }, _sum: { delta: true } }))._sum.delta ?? 0;

  console.log(`→ ${email} (${user.id}) balance before: ${await balanceOf()}`);

  if (!APPLY) {
    console.log(`→ WOULD GRANT +${credits} (dry run). Re-run with --apply to write.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.creditLedger.create({
    data: { userId: user.id, delta: credits, reason: "admin_adjust" },
  });
  console.log(`→ GRANTED +${credits}. Balance after: ${await balanceOf()}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
