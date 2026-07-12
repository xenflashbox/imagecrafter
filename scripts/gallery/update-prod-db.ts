/**
 * Phase 2 prod DB update:
 * 1. Apply egyptian + comic-hero template/modifier fixes (same texts as seed).
 * 2. Shipping variants get real R2 sample URLs; shipping packs get real R2 thumbs.
 * 3. Non-shipping variants and packs deactivated, picsum URLs cleared.
 * 4. Verify zero picsum remains.
 *
 * Run: npx tsx scripts/gallery/update-prod-db.ts
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const manifest: Record<string, { full: string; thumb: string }> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "r2-manifest.json"), "utf8")
);

// pack slug -> shipping variant slug
const SHIPPING: Record<string, string> = {
  "royal-gallery": "renaissance",
  masterpiece: "starry-night",
  "time-traveler": "egyptian",
  "fantasy-realm": "elven",
  "pop-culture": "comic-hero",
};

const EGYPTIAN_TEMPLATE = `{{subject}} depicted as Egyptian royalty in a rich, painterly New Kingdom royal portrait with a lifelike, naturally proportioned face. The subject wears a magnificent nemes headdress (or vulture crown), broad gold and lapis lazuli collar necklace, kohl-lined eyes, and richly embroidered linen garments. {{style_modifiers}}. Hieroglyphic cartouches and sacred symbols frame the composition. Background of temple columns and the Nile at sunset. The subject faces the viewer in a three-quarter pose with a realistic, clearly visible face, painted in rich New Kingdom-inspired style with precise gold leaf accents. Warm palette of gold, lapis lazuli blue, terracotta, and papyrus cream.`;

const COMIC_TEMPLATE = `{{subject}} as a completely original comic book superhero on a dramatic comic book cover. The subject wears an entirely original costume: a teal and copper suit with angular silver piping, a short copper cape, and a chest emblem shaped like an abstract origami falcon built from geometric triangles — an original invented design that is not any existing logo. Bold black ink outlines, dynamic heroic pose, halftone dot shading, vibrant colors. The cityscape behind is rendered in dramatic perspective with speed lines and action effects. {{style_modifiers}}. Classic American comic book art style. The subject's face is unmasked, clearly visible, and well-lit. Any cover title text or corner stamp must be an original invented mark. Strictly no existing superhero intellectual property: no Superman S-shield, no Batman bat symbol, no Spider-Man webbing or spider emblem, no Marvel or DC character, logo, lettering, or signature costume. Comic book cover quality, dynamic and powerful.`;

const COMIC_MODIFIERS = {
  mood: "heroic, dynamic, powerful, larger than life",
  palette: "teal, copper, silver, bold black ink, white highlights",
  lighting: "dramatic comic lighting, bold shadows, rim light effects",
};

async function main(): Promise<void> {
  // 1. Template fixes
  const eg = await prisma.styleVariant.updateMany({
    where: { slug: "egyptian" },
    data: { promptTemplate: EGYPTIAN_TEMPLATE },
  });
  const ch = await prisma.styleVariant.updateMany({
    where: { slug: "comic-hero" },
    data: { promptTemplate: COMIC_TEMPLATE, styleModifiers: COMIC_MODIFIERS },
  });
  console.log(`templates: egyptian=${eg.count} comic-hero=${ch.count}`);

  // 2. Shipping packs + variants: real R2 URLs. A style with no manifest
  // entry failed the gates this run — HOLD IT BACK (deactivate) rather than
  // ship a stranger or a stale pre-gate asset.
  for (const [packSlug, variantSlug] of Object.entries(SHIPPING)) {
    const urls = manifest[variantSlug];
    if (!urls) {
      console.warn(`⚠ ${variantSlug} HELD BACK — deactivating pack ${packSlug}`);
      const heldPack = await prisma.stylePack.update({
        where: { slug: packSlug },
        data: { isActive: false, thumbnailUrl: "" },
        include: { variants: true },
      });
      for (const v of heldPack.variants) {
        await prisma.styleVariant.update({
          where: { id: v.id },
          data: { isActive: false, sampleImageUrl: "" },
        });
      }
      continue;
    }

    const pack = await prisma.stylePack.update({
      where: { slug: packSlug },
      data: { thumbnailUrl: urls.thumb, isActive: true },
      include: { variants: true },
    });

    const ship = pack.variants.find((v) => v.slug === variantSlug);
    if (!ship) throw new Error(`Variant ${variantSlug} not found in ${packSlug}`);
    await prisma.styleVariant.update({
      where: { id: ship.id },
      data: { sampleImageUrl: urls.thumb, isActive: true },
    });

    // 3a. Non-shipping variants within shipping packs: deactivate + clear picsum
    const others = pack.variants.filter((v) => v.slug !== variantSlug);
    for (const v of others) {
      await prisma.styleVariant.update({
        where: { id: v.id },
        data: { isActive: false, sampleImageUrl: "" },
      });
    }
    console.log(`pack ${packSlug}: ship=${variantSlug}, deactivated ${others.length} variants`);
  }

  // 3b. Non-shipping packs: deactivate everything, clear picsum
  const nonShipping = await prisma.stylePack.findMany({
    where: { slug: { notIn: Object.keys(SHIPPING) } },
    include: { variants: true },
  });
  for (const pack of nonShipping) {
    await prisma.stylePack.update({
      where: { id: pack.id },
      data: { isActive: false, thumbnailUrl: "" },
    });
    for (const v of pack.variants) {
      await prisma.styleVariant.update({
        where: { id: v.id },
        data: { isActive: false, sampleImageUrl: "" },
      });
    }
    console.log(`pack ${pack.slug}: DEACTIVATED (+ ${pack.variants.length} variants)`);
  }

  // 4. Verify zero picsum
  const picsumVars = await prisma.styleVariant.count({
    where: { sampleImageUrl: { contains: "picsum" } },
  });
  const picsumPacks = await prisma.stylePack.count({
    where: { thumbnailUrl: { contains: "picsum" } },
  });
  const picsumTemplates = await prisma.styleVariant.count({
    where: { promptTemplate: { contains: "picsum" } },
  });
  console.log(`\npicsum remaining: variants=${picsumVars} packs=${picsumPacks} templates=${picsumTemplates}`);
  if (picsumVars + picsumPacks + picsumTemplates > 0) throw new Error("picsum still present in DB");

  const shipped = Object.values(SHIPPING).filter((s) => manifest[s]).length;
  const activeVars = await prisma.styleVariant.count({ where: { isActive: true } });
  const activePacks = await prisma.stylePack.count({ where: { isActive: true } });
  console.log(`active: packs=${activePacks} (expect ${shipped}), variants=${activeVars} (expect ${shipped})`);
  if (activePacks !== shipped || activeVars !== shipped) throw new Error("active counts do not match shipped styles");
  console.log("✓ Prod DB updated: real R2 gallery, zero picsum");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
