import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const packs = await prisma.stylePack.findMany({
    orderBy: { sortOrder: "asc" },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  for (const p of packs) {
    console.log(`PACK ${p.slug} active=${p.isActive} thumb=${p.thumbnailUrl.slice(0, 60)}`);
    for (const v of p.variants) {
      console.log(`  VAR ${v.slug} active=${v.isActive} sample=${v.sampleImageUrl.slice(0, 60)}`);
    }
  }
  const picsumVars = await prisma.styleVariant.count({ where: { sampleImageUrl: { contains: "picsum" } } });
  const picsumPacks = await prisma.stylePack.count({ where: { thumbnailUrl: { contains: "picsum" } } });
  console.log(`\npicsum variants=${picsumVars} packs=${picsumPacks}`);
  const eg = await prisma.styleVariant.findFirst({ where: { slug: "egyptian" } });
  console.log(`\negyptian template head: ${eg?.promptTemplate.slice(0, 120)}`);
  const ch = await prisma.styleVariant.findFirst({ where: { slug: "comic-hero" } });
  console.log(`comic-hero template head: ${ch?.promptTemplate.slice(0, 120)}`);
  console.log(`comic-hero modifiers: ${JSON.stringify(ch?.styleModifiers)}`);
}
main().finally(() => prisma.$disconnect());
