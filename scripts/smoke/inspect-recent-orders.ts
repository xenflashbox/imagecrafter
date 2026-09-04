/**
 * READ-ONLY: inspect recent orders + the portraits behind them, so a quality
 * complaint can be traced to a style, an architecture and a source photo
 * instead of being guessed at.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      amount: true,
      printSize: true,
      createdAt: true,
      portrait: {
        select: {
          id: true,
          stylePackSlug: true,
          styleVariantSlug: true,
          subjectType: true,
          status: true,
          previewImageUrl: true,
          hiResImageUrl: true,
          createdAt: true,
        },
      },
    },
  });

  for (const o of orders) {
    console.log(
      [
        o.createdAt.toISOString().slice(0, 16),
        o.type,
        o.status,
        `$${((o.amount || 0) / 100).toFixed(2)}`,
        o.printSize || "-",
        `pack=${o.portrait?.stylePackSlug}`,
        `variant=${o.portrait?.styleVariantSlug}`,
        `portrait=${o.portrait?.id}`,
      ].join("  ")
    );
    if (o.portrait?.previewImageUrl) console.log(`    preview: ${o.portrait.previewImageUrl}`);
  }

  console.log("\n--- recent portraits (any status) ---");
  const portraits = await prisma.portrait.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      styleVariantSlug: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });
  for (const p of portraits) {
    console.log(
      `${p.createdAt.toISOString().slice(0, 16)}  ${(p.styleVariantSlug || "-").padEnd(14)} ${p.status.padEnd(10)} ${p.errorMessage || ""}`
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
