/**
 * READ-ONLY: full style catalog including deactivated packs/variants, so we
 * can see what was retired rather than assume it must be rebuilt.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const packs = await prisma.stylePack.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    include: { variants: { orderBy: { slug: "asc" } } },
  });

  for (const p of packs) {
    console.log(
      `\n${p.isActive ? "ACTIVE  " : "INACTIVE"} pack ${p.slug}  "${p.name}"  sort=${p.sortOrder}`
    );
    for (const v of p.variants) {
      console.log(
        `   ${v.isActive ? "on " : "OFF"}  ${v.slug.padEnd(16)} "${v.name}"  tmpl=${v.promptTemplate.length}ch  sample=${v.sampleImageUrl ? "y" : "-"}`
      );
    }
    if (p.variants.length === 0) console.log("   (no variants)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
