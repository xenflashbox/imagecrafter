import { prisma } from "../lib/prisma";
import { TEMPLATE_DEFINITIONS } from "../lib/services/prompt-enhancement";

async function main() {
  console.log("🌱 Seeding database...");

  // Seed templates
  for (const templateDef of TEMPLATE_DEFINITIONS) {
    const { presets, ...templateData } = templateDef;

    const template = await prisma.template.upsert({
      where: { slug: templateData.slug },
      update: {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        iconName: templateData.iconName,
        promptTemplate: templateData.promptTemplate,
        defaultAspectRatio: templateData.defaultAspectRatio,
        defaultStyleHints: templateData.defaultStyleHints,
      },
      create: {
        slug: templateData.slug,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        iconName: templateData.iconName,
        promptTemplate: templateData.promptTemplate,
        defaultAspectRatio: templateData.defaultAspectRatio,
        defaultStyleHints: templateData.defaultStyleHints,
      },
    });

    // Upsert presets
    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      await prisma.templatePreset.upsert({
        where: {
          templateId_slug: {
            templateId: template.id,
            slug: preset.slug,
          },
        },
        update: {
          name: preset.name,
          styleOverrides: preset.styleOverrides,
          promptSuffix: preset.promptSuffix,
          sortOrder: i,
        },
        create: {
          templateId: template.id,
          slug: preset.slug,
          name: preset.name,
          styleOverrides: preset.styleOverrides,
          promptSuffix: preset.promptSuffix,
          sortOrder: i,
        },
      });
    }

    console.log(`  ✓ ${templateData.name} (${presets.length} presets)`);
  }

  console.log(`\n✅ Seeded ${TEMPLATE_DEFINITIONS.length} templates`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
