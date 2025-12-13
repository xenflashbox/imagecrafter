/**
 * POST /api/webhooks/clerk
 * 
 * Handles Clerk webhook events for user synchronization
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!;

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();

  // Get Svix headers
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const wh = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event.data);
        break;

      case "user.updated":
        await handleUserUpdated(event.data);
        break;

      case "user.deleted":
        await handleUserDeleted(event.data);
        break;

      default:
        console.log(`Unhandled Clerk event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Clerk webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleUserCreated(userData: ClerkUserData) {
  const primaryEmail = userData.email_addresses[0]?.email_address;

  if (!primaryEmail) {
    console.error("No email address for user:", userData.id);
    return;
  }

  // Create user in our database
  const user = await prisma.user.create({
    data: {
      id: userData.id,
      email: primaryEmail,
      firstName: userData.first_name,
      lastName: userData.last_name,
      imageUrl: userData.image_url,
    },
  });

  // Create default free subscription
  await prisma.subscription.create({
    data: {
      userId: user.id,
      stripeSubscriptionId: `free_${user.id}`, // Placeholder for free users
      stripePriceId: "free",
      stripeCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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

  console.log(`Created user and free subscription: ${user.id}`);
}

async function handleUserUpdated(userData: ClerkUserData) {
  const primaryEmail = userData.email_addresses[0]?.email_address;

  await prisma.user.update({
    where: { id: userData.id },
    data: {
      email: primaryEmail,
      firstName: userData.first_name,
      lastName: userData.last_name,
      imageUrl: userData.image_url,
    },
  });
}

async function handleUserDeleted(userData: ClerkUserData) {
  // Soft delete - mark images as deleted but keep for billing records
  await prisma.image.updateMany({
    where: { userId: userData.id },
    data: { deletedAt: new Date() },
  });

  // Delete user (cascades to subscription, projects, etc.)
  await prisma.user.delete({
    where: { id: userData.id },
  });
}
