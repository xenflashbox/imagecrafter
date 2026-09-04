/**
 * Backfill ic_User rows for Clerk accounts that predate the user.created webhook.
 *
 * Mirrors handleUserCreated in app/api/webhooks/clerk/route.ts (user + free
 * subscription) but deliberately omits the TikTok/Meta CompleteRegistration
 * events — these are not new registrations and firing them would corrupt
 * acquisition attribution.
 *
 * Idempotent: upserts by Clerk id, which IS User.id.
 *
 *   npx tsx scripts/admin/backfill-clerk-users.ts [--apply]
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const APPLY = process.argv.includes("--apply");

type ClerkUser = {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

async function main(): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("CLERK_SECRET_KEY not set");

  const res = await fetch("https://api.clerk.com/v1/users?limit=100", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error(`Clerk list users failed: HTTP ${res.status}`);
  const clerkUsers = (await res.json()) as ClerkUser[];

  const prisma = new PrismaClient();
  const host = new URL(process.env.DATABASE_URL!).host;
  console.log(`→ DB host: ${host}`);
  console.log(`→ Clerk users: ${clerkUsers.length}`);
  console.log(`→ ic_User rows before: ${await prisma.user.count()}`);

  for (const u of clerkUsers) {
    const email = u.email_addresses[0]?.email_address;
    if (!email) {
      console.log(`  skip ${u.id} — no email address`);
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { id: u.id } });
    if (existing) {
      console.log(`  ${u.id} ${email} — already present`);
      continue;
    }
    if (!APPLY) {
      console.log(`  ${u.id} ${email} — WOULD CREATE (dry run)`);
      continue;
    }

    await prisma.user.create({
      data: {
        id: u.id,
        email,
        firstName: u.first_name,
        lastName: u.last_name,
        imageUrl: u.image_url,
      },
    });
    await prisma.subscription.create({
      data: {
        userId: u.id,
        stripeSubscriptionId: `free_${u.id}`,
        stripePriceId: "free",
        stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeStatus: "ACTIVE",
        plan: "FREE",
        monthlyImageLimit: 5,
        canUsePro: false,
        canUseBatch: false,
        canUse4K: false,
        canUseProjects: false,
        maxProjectCount: 0,
        imagesUsedThisPeriod: 0,
      },
    });
    console.log(`  ${u.id} ${email} — CREATED (user + free subscription)`);
  }

  console.log(`→ ic_User rows after: ${await prisma.user.count()}`);
  if (!APPLY) console.log("\nDry run. Re-run with --apply to write.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
