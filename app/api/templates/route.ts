/**
 * GET /api/templates
 *
 * Returns all active templates with their presets, grouped into the
 * 5 display categories from Section 5.1 of the PRD.
 *
 * Display categories (mapped from DB TemplateCategory enum):
 *   Content Creation → BLOG_IMAGES, INFOGRAPHICS
 *   Social Media     → SOCIAL_MEDIA
 *   Marketing        → PRODUCT_MARKETING
 *   Storytelling     → STORYTELLING
 *   Professional     → PRESENTATIONS, PROFILE_BACKGROUNDS
 *
 * Auth: required (dashboard feature for subscribers)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map DB enum → PRD display category
const CATEGORY_MAP: Record<string, { displayCategory: string; icon: string; description: string }> = {
  BLOG_IMAGES:        { displayCategory: "Content Creation", icon: "pen-tool",  description: "Blog images, article headers, editorial visuals" },
  INFOGRAPHICS:       { displayCategory: "Content Creation", icon: "pen-tool",  description: "Blog images, article headers, editorial visuals" },
  SOCIAL_MEDIA:       { displayCategory: "Social Media",     icon: "share-2",   description: "Platform-optimized content for every channel" },
  PRODUCT_MARKETING:  { displayCategory: "Marketing",        icon: "megaphone", description: "Ads, product shots, landing page imagery" },
  STORYTELLING:       { displayCategory: "Storytelling",     icon: "book-open", description: "Children's books, storyboards, scene illustrations" },
  PRESENTATIONS:      { displayCategory: "Professional",     icon: "briefcase", description: "Business graphics, profile backgrounds, icon sets" },
  PROFILE_BACKGROUNDS:{ displayCategory: "Professional",     icon: "briefcase", description: "Business graphics, profile backgrounds, icon sets" },
  CUSTOM:             { displayCategory: "Professional",     icon: "briefcase", description: "Business graphics, profile backgrounds, icon sets" },
};

// Ordering of display categories
const DISPLAY_CATEGORY_ORDER = [
  "Content Creation",
  "Social Media",
  "Marketing",
  "Storytelling",
  "Professional",
];

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const templates = await prisma.template.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      iconName: true,
      defaultAspectRatio: true,
      defaultStyleHints: true,
      presets: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          isPro: true,
          promptSuffix: true,
          styleOverrides: true,
        },
      },
    },
  });

  // Group into 5 display categories
  const grouped: Record<string, {
    displayCategory: string;
    icon: string;
    description: string;
    templates: typeof templates;
  }> = {};

  for (const template of templates) {
    const meta = CATEGORY_MAP[template.category] ?? CATEGORY_MAP.CUSTOM;
    if (!grouped[meta.displayCategory]) {
      grouped[meta.displayCategory] = {
        displayCategory: meta.displayCategory,
        icon: meta.icon,
        description: meta.description,
        templates: [],
      };
    }
    grouped[meta.displayCategory].templates.push(template);
  }

  // Return in specified order
  const categories = DISPLAY_CATEGORY_ORDER.map((cat) => grouped[cat]).filter(Boolean);

  return NextResponse.json({
    success: true,
    categories,
    total: templates.length,
  });
}
