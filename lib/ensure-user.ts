import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Resolve the ic_User row for a signed-in Clerk user, creating it from Clerk if
 * it is absent.
 *
 * User.id IS the Clerk user_id, and rows are normally created by the
 * user.created webhook. Accounts that predate the webhook — or any signup where
 * it has not landed yet — otherwise hit "Account not found. Please sign in
 * again," which signing in again cannot fix. Throws rather than returning null
 * so callers cannot silently proceed without a row.
 */
export async function ensureUser(userId: string): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error(`Clerk has no user ${userId}`);

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error(`Clerk user ${userId} has no email address`);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
    },
    select: { id: true },
  });

  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: `free_${userId}`,
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

  console.log(`[ensureUser] provisioned ${userId} (webhook had not landed)`);
  return user;
}
