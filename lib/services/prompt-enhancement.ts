/**
 * ImageCraft Prompt Enhancement Service
 * 
 * This service transforms plain English user input into Gemini-optimized prompts.
 * It handles:
 * - Template-based prompt construction
 * - Character profile injection for project consistency
 * - Style hint optimization
 * - Aspect ratio recommendations
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type { CharacterProfile, Template, TemplatePreset } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface PromptEnhancementRequest {
  userPrompt: string;
  templateSlug?: string;
  presetSlug?: string;
  projectId?: string;
  aspectRatio?: string;
  styleHints?: string;
  targetAudience?: string;
}

export interface EnhancedPrompt {
  enhancedPrompt: string;
  aspectRatio: string;
  styleHints: string | null;
  characterInjected: boolean;
  templateUsed: string | null;
  recommendations: {
    suggestedAspectRatio?: string;
    suggestedStyle?: string;
    warnings?: string[];
  };
}

export interface CharacterAnalysisRequest {
  imageUrl: string;
  characterName: string;
  projectType: string;
  styleNotes?: string;
}

export interface CharacterAnalysisResult {
  description: string;
  physicalTraits: Record<string, string>;
  clothing: Record<string, string[]>;
  styleNotes: string;
}

// ============================================================================
// PROMPT ENHANCEMENT SERVICE
// ============================================================================

export class PromptEnhancementService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  /**
   * Main method: Transform user input into an optimized Gemini prompt
   */
  async enhancePrompt(request: PromptEnhancementRequest): Promise<EnhancedPrompt> {
    const { userPrompt, templateSlug, presetSlug, projectId, aspectRatio, styleHints } = request;

    // 1. Load template if specified
    let template: (Template & { presets: TemplatePreset[] }) | null = null;
    let preset: TemplatePreset | null = null;

    if (templateSlug) {
      template = await prisma.template.findUnique({
        where: { slug: templateSlug },
        include: { presets: true },
      });

      if (template && presetSlug) {
        preset = template.presets.find((p) => p.slug === presetSlug) || null;
      }
    }

    // 2. Load character profile if project has one
    let characterProfile: CharacterProfile | null = null;
    if (projectId) {
      characterProfile = await prisma.characterProfile.findUnique({
        where: { projectId },
      });
    }

    // 3. Build the enhanced prompt
    const enhanced = await this.buildEnhancedPrompt({
      userPrompt,
      template,
      preset,
      characterProfile,
      aspectRatio,
      styleHints,
    });

    // 4. Update template usage count
    if (template) {
      await prisma.template.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    return enhanced;
  }

  /**
   * Build the enhanced prompt using AI assistance
   */
  private async buildEnhancedPrompt(params: {
    userPrompt: string;
    template: (Template & { presets: TemplatePreset[] }) | null;
    preset: TemplatePreset | null;
    characterProfile: CharacterProfile | null;
    aspectRatio?: string;
    styleHints?: string;
  }): Promise<EnhancedPrompt> {
    const { userPrompt, template, preset, characterProfile, aspectRatio, styleHints } = params;

    // Determine final aspect ratio
    const finalAspectRatio = aspectRatio || template?.defaultAspectRatio || "16:9";

    // Build style hints
    let finalStyleHints = styleHints || template?.defaultStyleHints || null;
    if (preset?.styleOverrides) {
      const overrides = preset.styleOverrides as Record<string, unknown>;
      if (overrides.style) {
        finalStyleHints = finalStyleHints
          ? `${finalStyleHints}, ${overrides.style}`
          : String(overrides.style);
      }
    }

    // Construct the prompt enhancement request
    const systemPrompt = this.buildSystemPrompt(template, preset, characterProfile);

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Transform this user request into an optimized Gemini image prompt:

USER REQUEST: "${userPrompt}"

ASPECT RATIO: ${finalAspectRatio}
${finalStyleHints ? `STYLE HINTS: ${finalStyleHints}` : ""}
${characterProfile ? `CHARACTER TO INCLUDE: ${characterProfile.name}` : ""}

Respond with ONLY the optimized prompt text, nothing else. Keep it 20-50 words.`,
        },
      ],
    });

    const enhancedPrompt = this.extractTextContent(response);

    // If character profile exists, prepend it
    let finalPrompt = enhancedPrompt;
    let characterInjected = false;

    if (characterProfile) {
      finalPrompt = `${characterProfile.description}\n\nScene: ${enhancedPrompt}`;
      characterInjected = true;
    }

    return {
      enhancedPrompt: finalPrompt,
      aspectRatio: finalAspectRatio,
      styleHints: finalStyleHints,
      characterInjected,
      templateUsed: template?.slug || null,
      recommendations: this.generateRecommendations(userPrompt, template),
    };
  }

  /**
   * Build the system prompt for the enhancement AI
   */
  private buildSystemPrompt(
    template: Template | null,
    preset: TemplatePreset | null,
    characterProfile: CharacterProfile | null
  ): string {
    let systemPrompt = `You are an expert at writing image generation prompts for Google's Gemini model.

GEMINI PROMPT BEST PRACTICES:
- Use conversational, natural language (not keyword stacking)
- Keep prompts 20-50 words (sweet spot for Gemini)
- Structure: [Subject/Scene] + [Setting/Context] + [Style] + [Mood/Lighting] + [Composition]
- Be specific about visual elements but don't over-describe
- Gemini excels at text rendering and photorealism

STYLE KEYWORDS TO USE:
- Photographic: "editorial photography", "lifestyle photography", "product photography"
- Illustrated: "flat illustration", "watercolor", "vector art", "line art"
- Mood: "golden hour lighting", "soft diffused light", "dramatic lighting"
- Composition: "overhead view", "close-up detail", "shallow depth of field"`;

    if (template) {
      systemPrompt += `\n\nTEMPLATE CONTEXT:
Template: ${template.name}
Description: ${template.description}
Default Style: ${template.defaultStyleHints || "not specified"}`;

      if (template.promptTemplate) {
        systemPrompt += `\nPrompt Pattern: ${template.promptTemplate}`;
      }
    }

    if (preset) {
      const overrides = preset.styleOverrides as Record<string, unknown>;
      systemPrompt += `\n\nPRESET STYLE: ${preset.name}`;
      if (overrides.mood) systemPrompt += `\nMood: ${overrides.mood}`;
      if (overrides.colors) systemPrompt += `\nColors: ${JSON.stringify(overrides.colors)}`;
      if (preset.promptSuffix) systemPrompt += `\nStyle suffix to include: ${preset.promptSuffix}`;
    }

    if (characterProfile) {
      systemPrompt += `\n\nCHARACTER CONSISTENCY:
A character named "${characterProfile.name}" must appear in this image.
The character description will be prepended automatically.
Focus your prompt on the SCENE and ACTION, referencing the character by name.
Example: "Tina Tortoise sitting at a small breakfast table, looking sleepy..."`;
    }

    return systemPrompt;
  }

  /**
   * Analyze an image to create a character profile
   */
  async analyzeCharacterImage(request: CharacterAnalysisRequest): Promise<CharacterAnalysisResult> {
    const { imageUrl, characterName, projectType, styleNotes } = request;

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: `Analyze this image to create a detailed character profile for "${characterName}".

PROJECT TYPE: ${projectType}
${styleNotes ? `STYLE NOTES: ${styleNotes}` : ""}

Create an exhaustive visual description that can be used to maintain character consistency across multiple AI-generated images. Include:

1. PHYSICAL DESCRIPTION (2-3 sentences): Overall appearance, body type/shape, proportions
2. DISTINGUISHING FEATURES: Colors, patterns, textures, unique characteristics
3. ACCESSORIES/CLOTHING: Any items worn or carried
4. EXPRESSION/PERSONALITY: Default expression, demeanor conveyed
5. ART STYLE: The illustration/photo style (watercolor, flat vector, 3D render, etc.)

Format your response as JSON:
{
  "description": "Complete 4-6 sentence description suitable for prompt injection",
  "physicalTraits": {
    "bodyType": "...",
    "colors": "...",
    "distinguishingFeatures": "...",
    "proportions": "..."
  },
  "clothing": {
    "accessories": ["..."],
    "outfit": ["..."]
  },
  "styleNotes": "Art style description for consistency"
}`,
            },
          ],
        },
      ],
    });

    const content = this.extractTextContent(response);

    // Parse the JSON response
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      return JSON.parse(jsonMatch[0]) as CharacterAnalysisResult;
    } catch {
      // Fallback: create structured response from text
      return {
        description: content,
        physicalTraits: {},
        clothing: { accessories: [] },
        styleNotes: styleNotes || "Style not analyzed",
      };
    }
  }

  /**
   * Generate recommendations based on the user's prompt
   */
  private generateRecommendations(
    userPrompt: string,
    template: Template | null
  ): EnhancedPrompt["recommendations"] {
    const recommendations: EnhancedPrompt["recommendations"] = {};
    const warnings: string[] = [];

    // Check for common issues
    const lowerPrompt = userPrompt.toLowerCase();

    if (lowerPrompt.length > 500) {
      warnings.push("Prompt is quite long. Gemini works best with 20-50 word prompts.");
    }

    if (lowerPrompt.includes("8k") || lowerPrompt.includes("ultra detailed")) {
      warnings.push(
        'DALL-E style keywords like "8k" or "ultra detailed" are not needed for Gemini.'
      );
    }

    // Suggest aspect ratios based on content
    if (
      lowerPrompt.includes("social media") ||
      lowerPrompt.includes("instagram") ||
      lowerPrompt.includes("tiktok")
    ) {
      recommendations.suggestedAspectRatio = "9:16";
    } else if (
      lowerPrompt.includes("blog") ||
      lowerPrompt.includes("header") ||
      lowerPrompt.includes("banner")
    ) {
      recommendations.suggestedAspectRatio = "16:9";
    } else if (
      lowerPrompt.includes("profile") ||
      lowerPrompt.includes("avatar") ||
      lowerPrompt.includes("thumbnail")
    ) {
      recommendations.suggestedAspectRatio = "1:1";
    }

    if (warnings.length > 0) {
      recommendations.warnings = warnings;
    }

    return recommendations;
  }

  /**
   * Extract text content from Anthropic response
   */
  private extractTextContent(response: Anthropic.Message): string {
    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : "";
  }
}

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const TEMPLATE_DEFINITIONS = [
  // BLOG IMAGES
  {
    slug: "blog-hero",
    name: "Blog Hero Image",
    description: "Eye-catching header images for blog posts and articles",
    category: "BLOG_IMAGES",
    iconName: "Image",
    promptTemplate:
      "Professional hero image for a blog about {{topic}}, {{visualElements}}, {{style}}, modern and clean",
    defaultAspectRatio: "16:9",
    defaultStyleHints: "editorial photography, professional",
    presets: [
      {
        slug: "tech",
        name: "Technology",
        styleOverrides: {
          mood: "innovative, futuristic",
          colors: ["blue", "purple", "cyan"],
          style: "modern flat illustration OR futuristic 3D",
        },
        promptSuffix: "tech startup aesthetic, clean composition",
      },
      {
        slug: "health",
        name: "Health & Wellness",
        styleOverrides: {
          mood: "warm, hopeful, empowering",
          colors: ["soft blue", "green", "warm neutrals"],
          style: "warm photorealistic",
        },
        promptSuffix: "approachable healthcare photography style",
      },
      {
        slug: "business",
        name: "Business & Professional",
        styleOverrides: {
          mood: "confident, professional",
          colors: ["navy", "gold", "white"],
          style: "corporate photography",
        },
        promptSuffix: "modern office environment, professional lighting",
      },
      {
        slug: "lifestyle",
        name: "Lifestyle",
        styleOverrides: {
          mood: "warm, authentic, aspirational",
          colors: ["warm earth tones", "natural"],
          style: "lifestyle photography",
        },
        promptSuffix: "natural lighting, candid feel",
      },
      {
        slug: "food-wine",
        name: "Food & Wine",
        styleOverrides: {
          mood: "sophisticated, warm, inviting",
          colors: ["burgundy", "gold", "cream"],
          style: "editorial food photography",
        },
        promptSuffix: "golden hour lighting, wine magazine style",
      },
    ],
  },

  // SOCIAL MEDIA
  {
    slug: "social-media-pack",
    name: "Social Media Pack",
    description: "Generate matching images for multiple social platforms at once",
    category: "SOCIAL_MEDIA",
    iconName: "Share2",
    promptTemplate: "{{content}} for social media, {{style}}, engaging and scroll-stopping",
    defaultAspectRatio: "1:1",
    defaultStyleHints: "vibrant, high contrast, social-optimized",
    presets: [
      {
        slug: "instagram-post",
        name: "Instagram Post",
        styleOverrides: { aspectRatio: "1:1", style: "instagram aesthetic" },
        promptSuffix: "visually striking, grid-worthy",
      },
      {
        slug: "instagram-story",
        name: "Instagram Story",
        styleOverrides: { aspectRatio: "9:16", style: "vertical format" },
        promptSuffix: "full-screen vertical, text-space at top and bottom",
      },
      {
        slug: "linkedin",
        name: "LinkedIn",
        styleOverrides: { aspectRatio: "1.91:1", style: "professional" },
        promptSuffix: "professional, business-appropriate",
      },
      {
        slug: "twitter",
        name: "Twitter/X",
        styleOverrides: { aspectRatio: "16:9", style: "attention-grabbing" },
        promptSuffix: "bold, clear focal point",
      },
    ],
  },

  // PRESENTATIONS
  {
    slug: "presentation-graphics",
    name: "Presentation Graphics",
    description: "Clean backgrounds and concept illustrations for slides",
    category: "PRESENTATIONS",
    iconName: "Presentation",
    promptTemplate:
      "{{concept}} for presentation slide, clean professional style, {{composition}}",
    defaultAspectRatio: "16:9",
    defaultStyleHints: "minimalist, corporate, presentation-ready",
    presets: [
      {
        slug: "background",
        name: "Slide Background",
        styleOverrides: { style: "abstract, subtle" },
        promptSuffix: "large empty center space for text, subtle design elements in corners",
      },
      {
        slug: "concept",
        name: "Concept Illustration",
        styleOverrides: { style: "simple icon-style" },
        promptSuffix: "centered composition, lots of white space, single accent color",
      },
      {
        slug: "data-viz",
        name: "Data Visualization Background",
        styleOverrides: { style: "abstract data visualization" },
        promptSuffix: "subtle graph elements, professional blue tones",
      },
    ],
  },

  // CHILDREN'S BOOKS / STORYTELLING
  {
    slug: "childrens-book",
    name: "Children's Book Illustration",
    description: "Whimsical illustrations for children's stories with character consistency",
    category: "STORYTELLING",
    iconName: "BookOpen",
    promptTemplate: "{{scene}} in children's book illustration style, {{mood}}, child-friendly",
    defaultAspectRatio: "4:3",
    defaultStyleHints: "watercolor, soft edges, warm and friendly",
    presets: [
      {
        slug: "watercolor",
        name: "Classic Watercolor",
        styleOverrides: {
          style: "soft watercolor illustration",
          mood: "gentle, dreamy",
          colors: ["soft pastels", "warm"],
        },
        promptSuffix: "reminiscent of Beatrix Potter, soft edges, storybook quality",
      },
      {
        slug: "bold-graphic",
        name: "Bold & Graphic",
        styleOverrides: {
          style: "bold flat illustration",
          mood: "playful, energetic",
          colors: ["bright primary colors"],
        },
        promptSuffix: "Eric Carle inspired, bold shapes, high contrast",
      },
      {
        slug: "cozy",
        name: "Cozy & Warm",
        styleOverrides: {
          style: "warm textured illustration",
          mood: "cozy, nurturing",
          colors: ["warm browns", "soft oranges", "creams"],
        },
        promptSuffix: "bedtime story feel, soft lighting, comforting",
      },
    ],
  },

  // STORYBOARDS
  {
    slug: "storyboard",
    name: "Storyboard Sequence",
    description: "Scene-by-scene generation with consistent visual style",
    category: "STORYTELLING",
    iconName: "LayoutGrid",
    promptTemplate: "{{scene}} storyboard panel, {{style}}, clear composition",
    defaultAspectRatio: "16:9",
    defaultStyleHints: "cinematic, clear staging",
    presets: [
      {
        slug: "cinematic",
        name: "Cinematic",
        styleOverrides: { style: "movie storyboard, dramatic lighting" },
        promptSuffix: "film production quality, clear camera angle",
      },
      {
        slug: "animation",
        name: "Animation",
        styleOverrides: { style: "animation pre-production" },
        promptSuffix: "clean lines, character animation ready",
      },
      {
        slug: "comic",
        name: "Comic/Graphic Novel",
        styleOverrides: { style: "comic book panel" },
        promptSuffix: "dynamic composition, sequential art style",
      },
    ],
  },

  // PRODUCT MARKETING
  {
    slug: "product-shots",
    name: "Product Photography",
    description: "E-commerce and marketing product images",
    category: "PRODUCT_MARKETING",
    iconName: "Package",
    promptTemplate: "{{product}} product photography, {{setting}}, commercial quality",
    defaultAspectRatio: "1:1",
    defaultStyleHints: "product photography, studio lighting",
    presets: [
      {
        slug: "white-background",
        name: "Clean White Background",
        styleOverrides: { style: "e-commerce product shot" },
        promptSuffix: "pure white background, soft shadows, studio lighting",
      },
      {
        slug: "lifestyle",
        name: "Lifestyle Context",
        styleOverrides: { style: "lifestyle product photography" },
        promptSuffix: "in-use context, natural setting, aspirational",
      },
      {
        slug: "flat-lay",
        name: "Flat Lay",
        styleOverrides: { style: "overhead flat lay" },
        promptSuffix: "top-down view, arranged composition, styled props",
      },
    ],
  },

  // PROFILE BACKGROUNDS
  {
    slug: "profile-background",
    name: "Profile & Headshot Backgrounds",
    description: "Professional backdrops for profile photos",
    category: "PROFILE_BACKGROUNDS",
    iconName: "User",
    promptTemplate: "Professional background for headshot, {{style}}, {{mood}}",
    defaultAspectRatio: "1:1",
    defaultStyleHints: "professional, soft focus background",
    presets: [
      {
        slug: "corporate",
        name: "Corporate Blue",
        styleOverrides: {
          colors: ["navy", "blue gradient"],
          style: "corporate professional",
        },
        promptSuffix: "subtle blue gradient, professional headshot backdrop",
      },
      {
        slug: "creative",
        name: "Creative Studio",
        styleOverrides: {
          colors: ["warm", "artistic"],
          style: "creative professional",
        },
        promptSuffix: "artistic studio setting, warm tones, creative industry",
      },
      {
        slug: "nature",
        name: "Natural/Outdoor",
        styleOverrides: {
          colors: ["green", "natural"],
          style: "outdoor portrait",
        },
        promptSuffix: "soft bokeh nature background, golden hour feel",
      },
    ],
  },

  // INFOGRAPHICS
  {
    slug: "infographic-elements",
    name: "Infographic Elements",
    description: "Icons, headers, and visual elements for infographics",
    category: "INFOGRAPHICS",
    iconName: "BarChart",
    promptTemplate: "{{element}} infographic element, {{style}}, clear and informative",
    defaultAspectRatio: "1:1",
    defaultStyleHints: "flat design, infographic style, clean",
    presets: [
      {
        slug: "icons",
        name: "Icon Set",
        styleOverrides: { style: "flat icon design" },
        promptSuffix: "simple icon, single color, centered, transparent-ready",
      },
      {
        slug: "section-header",
        name: "Section Header",
        styleOverrides: { style: "infographic header" },
        promptSuffix: "wide banner format, text space, decorative elements",
      },
      {
        slug: "data-illustration",
        name: "Data Illustration",
        styleOverrides: { style: "data visualization illustration" },
        promptSuffix: "abstract representation of data concept",
      },
    ],
  },
] as const;

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seedTemplates() {
  for (const templateDef of TEMPLATE_DEFINITIONS) {
    const { presets, ...templateData } = templateDef;

    await prisma.template.upsert({
      where: { slug: templateData.slug },
      update: templateData,
      create: {
        ...templateData,
        presets: {
          create: presets.map((preset, index) => ({
            ...preset,
            styleOverrides: preset.styleOverrides,
            sortOrder: index,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${TEMPLATE_DEFINITIONS.length} templates`);
}
