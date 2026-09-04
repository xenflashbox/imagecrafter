/**
 * Point every advertised style at its real catalog example, and stop
 * advertising the ones that have none.
 *
 * Run: DATABASE_URL=<target> npx tsx scripts/gallery/sync-catalog-db.ts
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const manifest: Record<string, { full: string; thumb: string }> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "catalog-manifest.json"), "utf8")
);

// The custom scene is written by the customer, so it can never have a canned
// example. It stays active and the grid renders it as a prompt card.
const NO_EXAMPLE_BY_DESIGN = new Set(["custom"]);

async function main(): Promise<void> {
  const host = (process.env.DATABASE_URL || "").split("@")[1]?.split("/")[0];
  console.log(`HOST: ${host}\n`);

  const packs = await prisma.stylePack.findMany({ include: { variants: true } });

  for (const pack of packs) {
    const shipped: string[] = [];
    const dropped: string[] = [];

    for (const v of pack.variants) {
      const urls = manifest[v.slug];
      if (urls) {
        await prisma.styleVariant.update({
          where: { id: v.id },
          data: { sampleImageUrl: urls.thumb, isActive: true },
        });
        shipped.push(v.slug);
      } else if (NO_EXAMPLE_BY_DESIGN.has(v.slug)) {
        await prisma.styleVariant.update({
          where: { id: v.id },
          data: { sampleImageUrl: "", isActive: true },
        });
        shipped.push(`${v.slug} (no example by design)`);
      } else {
        await prisma.styleVariant.update({
          where: { id: v.id },
          data: { sampleImageUrl: "", isActive: false },
        });
        dropped.push(v.slug);
      }
    }

    const thumbSlug = pack.variants.map((v) => v.slug).find((s) => manifest[s]);
    const packActive = shipped.length > 0;
    await prisma.stylePack.update({
      where: { id: pack.id },
      data: {
        thumbnailUrl: thumbSlug ? manifest[thumbSlug].thumb : "",
        isActive: packActive,
      },
    });
    console.log(
      `${packActive ? "✓" : "✗"} ${pack.slug}: ${shipped.length} shipping${
        dropped.length ? `, dropped ${dropped.join(", ")}` : ""
      }`
    );
  }

  const activeVars = await prisma.styleVariant.count({ where: { isActive: true } });
  const missing = await prisma.styleVariant.count({
    where: { isActive: true, sampleImageUrl: "", slug: { notIn: [...NO_EXAMPLE_BY_DESIGN] } },
  });
  const activePacks = await prisma.stylePack.count({ where: { isActive: true } });
  console.log(`\nactive: packs=${activePacks} variants=${activeVars}`);
  if (missing > 0) throw new Error(`${missing} active variants still have no example image`);
  console.log("✓ Every advertised style has a real example");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
