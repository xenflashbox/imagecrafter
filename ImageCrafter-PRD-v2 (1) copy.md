# ImageCrafter — Product Requirements Document
## Portrait Studio Feature + Template System Overhaul

**Product:** ImageCrafter (imagecrafter.app)  
**Version:** 2.0  
**Author:** Xenco Labs  
**Date:** February 2026  
**Status:** Ready for Development  
**Stack:** Next.js 15 (App Router) · Neon PostgreSQL · Prisma · Clerk · Stripe · Gemini · Claude · Prodigi API  

---


## Table of Contents

Phase # 1
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
Phase #2
4. [Portrait Studio — Feature Spec](#4-portrait-studio)
6. [Complete Prompt Deck](#6-complete-prompt-deck)
Phase #3
9. [Stripe Payment Flows](#9-stripe-payment-flows)
10. [Frontend Pages & Routes](#10-frontend-pages--routes)
Phase #4
7. [API Endpoints](#7-api-endpoints)
8. [Print-on-Demand Integration (Prodigi)](#8-print-on-demand-integration)
8.1 [Prodigi API Ref Dock] 
Phase #5
5. [Template System Overhaul](#5-template-system-overhaul)

Phase #6
11. [Email Notifications](#11-email-notifications)
12. [Blog Infrastructure](#12-blog-infrastructure)
Project Resources
13. [Environment Variables](#13-environment-variables)
14. [Implementation Phases](#14-implementation-phases)
15. [Validation & QA Checklist](#15-validation--qa-checklist)

---

## 1. Executive Summary

ImageCrafter 2.0 adds two major capabilities:

**Portrait Studio** — A photo-to-art transformation feature where users upload their own photos (pets, people, families) and receive AI-generated portraits in curated artistic styles. Includes a guest purchase flow (no account required) for one-off buyers, digital downloads, and print-on-demand fulfillment via Prodigi. This feature targets a proven $100K+/month market currently dominated by single-style competitors.

**Template System Overhaul** — A complete restructure of the existing template and preset system to eliminate confusion, improve prompt quality, and align the general image generation experience with the same level of polish as Portrait Studio.

Both features share the same underlying AI pipeline (Claude prompt enhancement → Gemini image generation) but serve different user intents and purchase flows.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 15)                               │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                    EXISTING (Authenticated Dashboard)                     │    │
│  │  Dashboard · Generator · Gallery · Projects · History · Settings         │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                    NEW: Portrait Studio (Public + Auth)                   │    │
│  │  Landing · Upload+Style · Preview · Checkout · Print Options             │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                    NEW: Blog (Public)                                     │    │
│  │  Blog Index · Blog Post · Categories · Tags                              │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js Route Handlers)                  │
│                                                                                  │
│  EXISTING:                           NEW:                                        │
│  /api/images/generate                /api/portraits/upload                       │
│  /api/images/batch                   /api/portraits/analyze                      │
│  /api/projects/[CRUD]                /api/portraits/generate                     │
│  /api/webhooks/stripe                /api/portraits/[id]                         │
│  /api/webhooks/clerk                 /api/orders/create                          │
│  /api/templates                      /api/orders/[id]                            │
│  /api/prompts/enhance                /api/print/products                         │
│  /api/prompts/history                /api/print/order                            │
│  /api/usage                          /api/webhooks/prodigi                       │
│                                      /api/blog/[slug]                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                       │
│                                                                                  │
│  EXISTING:                           NEW:                                        │
│  lib/services/                       lib/services/                               │
│    prompt-enhancement.ts               portrait-analysis.ts (Claude Vision)      │
│    image-generation.ts                 portrait-generation.ts                    │
│                                        print-fulfillment.ts (Prodigi API)       │
│                                        email-notification.ts                     │
│                                        file-storage.ts (upload handling)         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────────┐
                    ▼                   ▼                       ▼
┌────────────────────────┐  ┌────────────────────┐  ┌──────────────────────────┐
│   Neon PostgreSQL      │  │  Gemini Image Gen  │  │  External Services       │
│   (Prisma ORM)         │  │  API (your infra)  │  │                          │
│                        │  │  image-gen.         │  │  Clerk (Auth)            │
│  EXISTING tables +     │  │  xencolabs.com     │  │  Stripe (Payments)       │
│  NEW: Portrait         │  │                    │  │  Anthropic (Claude)      │
│       Order            │  │                    │  │  Prodigi (Print-on-      │
│       StylePack        │  │                    │  │    Demand Fulfillment)   │
│       BlogPost         │  │                    │  │  Resend/SendGrid (Email) │
│       BlogCategory     │  │                    │  │  S3/R2 (File Storage)    │
└────────────────────────┘  └────────────────────┘  └──────────────────────────┘
```

---

## 3. Database Schema

### New Prisma Models

Add these to your existing `prisma/schema.prisma`:

```prisma
// =============================================================
// PORTRAIT STUDIO MODELS
// =============================================================

model Portrait {
  id                String    @id @default(cuid())
  userId            String?   // nullable — guest portraits have no user
  sessionId         String    // browser session ID for guest tracking
  sourceImageUrl    String    // original uploaded photo (S3/R2)
  sourceImageKey    String    // storage key for cleanup
  previewImageUrl   String?   // watermarked preview (generated)
  hiResImageUrl     String?   // full-res, unwatermarked (generated)
  stylePackSlug     String    // FK to StylePack.slug
  styleVariantSlug  String    // specific variant within the pack
  subjectType       String    // "pet" | "person" | "couple" | "family" | "group"
  subjectAnalysis   Json      // Claude Vision output (features, description)
  enhancedPrompt    String    // final prompt sent to Gemini
  status            String    @default("pending") // pending | analyzing | generating | preview | purchased | failed
  errorMessage      String?   // populated on failure
  generationTimeMs  Int?      // track performance
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user              User?     @relation(fields: [userId], references: [id])
  order             Order?

  @@index([userId])
  @@index([sessionId])
  @@index([status])
  @@index([createdAt])
}

model Order {
  id                String    @id @default(cuid())
  portraitId        String    @unique
  userId            String?   // nullable for guest orders
  email             String    // always required — guest provides at checkout
  name              String?   // customer name for shipping
  type              String    // "digital" | "print"
  
  // Digital delivery
  downloadUrl       String?   // secure, time-limited download link
  downloadCount     Int       @default(0)
  maxDownloads      Int       @default(5)
  downloadExpiresAt DateTime? // link expiry
  
  // Print fulfillment (Prodigi)
  printProductSku   String?   // Prodigi product SKU
  printSize         String?   // "8x10", "12x16", "16x20", "24x36"
  printFrame        String?   // "none", "black", "white", "natural", "gold", "silver"
  printFormat       String?   // "canvas", "framed_print", "art_print"
  prodigiOrderId    String?   // Prodigi's order reference
  prodigiStatus     String?   // Prodigi fulfillment status
  trackingNumber    String?   // shipping tracking
  trackingUrl       String?   // carrier tracking URL
  
  // Shipping address (print orders only)
  shippingName      String?
  shippingLine1     String?
  shippingLine2     String?
  shippingCity      String?
  shippingState     String?
  shippingZip       String?
  shippingCountry   String?
  
  // Payment
  stripePaymentIntentId  String?
  stripeSessionId        String?
  amount                 Int       // total in cents
  currency               String    @default("usd")
  status                 String    @default("pending") // pending | paid | fulfilled | shipped | delivered | refunded | failed
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  portrait          Portrait  @relation(fields: [portraitId], references: [id])
  user              User?     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([email])
  @@index([status])
  @@index([prodigiOrderId])
}

model StylePack {
  id              String    @id @default(cuid())
  slug            String    @unique
  name            String    // display name
  tagline         String    // short hook for the card
  description     String    // longer description for the detail view
  category        String    // "classic" | "masterpiece" | "time-travel" | "fantasy" | "pop-culture" | "fine-art"
  sortOrder       Int       @default(0)
  thumbnailUrl    String    // hero image for the pack card
  isActive        Boolean   @default(true)
  isPremium       Boolean   @default(false) // Pro subscribers or higher per-portrait price
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  variants        StyleVariant[]

  @@index([category])
  @@index([isActive])
}

model StyleVariant {
  id              String    @id @default(cuid())
  stylePackId     String
  slug            String    // unique within parent pack
  name            String    // display name
  description     String    // what this variant produces
  promptTemplate  String    @db.Text // the full prompt template with {{subject}} and {{style_modifiers}}
  styleModifiers  Json      // default modifiers for this variant
  sampleImageUrl  String    // example output for preview
  sortOrder       Int       @default(0)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  stylePack       StylePack @relation(fields: [stylePackId], references: [id], onDelete: Cascade)

  @@unique([stylePackId, slug])
  @@index([stylePackId])
}


// =============================================================
// BLOG MODELS
// =============================================================

model BlogPost {
  id              String    @id @default(cuid())
  slug            String    @unique
  title           String
  excerpt         String    // for meta description + cards
  content         String    @db.Text // MDX or HTML
  coverImageUrl   String?
  categoryId      String?
  tags            String[]  // array of tag strings
  status          String    @default("draft") // draft | published | archived
  publishedAt     DateTime?
  metaTitle       String?   // SEO override
  metaDescription String?   // SEO override
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  category        BlogCategory? @relation(fields: [categoryId], references: [id])

  @@index([slug])
  @@index([status])
  @@index([publishedAt])
  @@index([categoryId])
}

model BlogCategory {
  id              String    @id @default(cuid())
  slug            String    @unique
  name            String
  description     String?
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  posts           BlogPost[]
}


// =============================================================
// UPDATED TEMPLATE MODELS (replaces existing Template/TemplatePreset)
// =============================================================

model Template {
  id                  String    @id @default(cuid())
  slug                String    @unique
  name                String    // clear, action-oriented name
  description         String    // what this template produces
  category            String    // "content" | "social" | "marketing" | "storytelling" | "professional"
  icon                String?   // Lucide icon name for UI
  defaultAspectRatio  String    @default("16:9")
  defaultResolution   String    @default("2k") // "1k" | "2k" | "4k"
  sortOrder           Int       @default(0)
  isActive            Boolean   @default(true)
  requiredPlan        String    @default("free") // "free" | "starter" | "pro" | "team"
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  presets             TemplatePreset[]

  @@index([category])
  @@index([isActive])
}

model TemplatePreset {
  id                String    @id @default(cuid())
  templateId        String
  slug              String    // unique within parent template
  name              String    // clear style name
  description       String    // what this preset produces
  promptTemplate    String    @db.Text // full prompt with {{topic}}, {{details}}, etc.
  styleKeywords     String[]  // for UI tag display
  sampleImageUrl    String?   // example output
  sortOrder         Int       @default(0)
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  template          Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, slug])
  @@index([templateId])
}
```

### User Model Updates

Add these relations to your existing `User` model:

```prisma
model User {
  // ... existing fields ...
  
  // NEW relations
  portraits   Portrait[]
  orders      Order[]
}
```

---

## 4. Portrait Studio — Feature Spec

### 4.1 User Flow: Guest (No Auth)

```
1. User lands on /portraits (from ad, search, or site nav)
2. User sees style pack gallery with sample transformations
3. User clicks "Create Your Portrait"
4. User uploads photo
5. System validates photo:
   - File type: JPEG, PNG, WebP
   - Min resolution: 512x512
   - Max file size: 10MB
   - Contains a detectable face/subject (Claude Vision)
6. User selects Style Pack → Style Variant
7. System generates watermarked preview (~10-15 seconds)
8. User sees preview with purchase options:
   - Digital Download: $14.95
   - Art Print (various sizes): $29.95 - $129.95
9. User clicks purchase → Stripe Checkout (guest email required)
10. On payment success:
    - Digital: Instant secure download link via email
    - Print: Prodigi order created, confirmation email with tracking
11. Post-purchase: "Want unlimited portraits? Try ImageCrafter Pro — first month free"
```

### 4.2 User Flow: Subscriber

```
1. Subscriber navigates to Portrait Studio from their dashboard
2. Same flow as guest, but:
   - Portraits count against their plan quota (or separate portrait quota)
   - Subscriber discount on prints (10-15%)
   - Portraits saved to their gallery
   - No email required at checkout (already authenticated)
   - Access to Premium style packs
```

### 4.3 Portrait Generation Pipeline

**Service: `lib/services/portrait-analysis.ts`**

This service uses Claude Vision to analyze uploaded photos:

```typescript
// Input: uploaded photo URL
// Output: PortraitSubjectAnalysis

interface PortraitSubjectAnalysis {
  subjectType: "pet" | "person" | "couple" | "family" | "group";
  subjectCount: number;
  primarySubject: {
    description: string;      // "A golden retriever with floppy ears and warm brown eyes"
    species?: string;         // for pets: "dog", "cat", etc.
    breed?: string;           // for pets: "golden retriever", "tabby", etc.
    keyFeatures: string[];    // ["floppy ears", "cream-colored coat", "pink tongue"]
    coloring: string;         // "warm golden with cream undertones"
    expression: string;       // "happy, tongue out, bright eyes"
  };
  additionalSubjects?: Array<{
    description: string;
    relationship?: string;    // "second dog", "person holding pet", etc.
  }>;
  photoQuality: {
    resolution: "low" | "medium" | "high";
    lighting: "poor" | "acceptable" | "good" | "excellent";
    focus: "blurry" | "soft" | "sharp";
    composition: "poor" | "acceptable" | "good";
    usable: boolean;
    issues?: string[];        // ["backlit", "motion blur", "too far away"]
  };
}
```

**Claude Vision System Prompt for Analysis:**

```
You are a portrait photography analyst for an AI art generation service. 
Your job is to analyze an uploaded photo and extract detailed subject 
descriptions that will be used to generate artistic portraits.

Analyze the photo and return a JSON object with the following structure:
{
  "subjectType": one of "pet", "person", "couple", "family", "group",
  "subjectCount": number of subjects,
  "primarySubject": {
    "description": A detailed, vivid description of the primary subject 
      as they appear in the photo. Include physical characteristics, 
      coloring, distinguishing features, expression, and pose. 
      Be specific enough that an artist could paint them from this 
      description alone. 2-3 sentences.
    "species": if pet, the species,
    "breed": if pet, the breed (or best guess),
    "keyFeatures": array of 3-6 distinctive physical features,
    "coloring": description of their coloring/complexion,
    "expression": description of their facial expression/mood
  },
  "photoQuality": {
    "resolution": quality assessment,
    "lighting": lighting assessment,
    "focus": focus assessment,
    "composition": composition assessment,
    "usable": boolean - can we generate a good portrait from this?,
    "issues": array of any quality problems
  }
}

Be thorough but concise. The description must capture the subject's 
unique identity so the generated portrait looks like THEM, not a 
generic version.
```

**Service: `lib/services/portrait-generation.ts`**

This service orchestrates the full portrait pipeline:

```
Step 1: Receive uploaded photo + selected style variant
Step 2: Call portrait-analysis.ts → get subject analysis
Step 3: If photoQuality.usable === false → return error with issues
Step 4: Build enhanced prompt:
  a. Fetch StyleVariant.promptTemplate
  b. Replace {{subject}} with subjectAnalysis.primarySubject.description
  c. Replace {{style_modifiers}} with StyleVariant.styleModifiers
  d. Pass to Claude prompt enhancement for final polish
Step 5: Call image-gen.xencolabs.com with:
  - Source image (the uploaded photo)
  - Enhanced prompt
  - Aspect ratio: 1:1 (portrait default) or 3:4
  - Resolution: 2K for preview, 4K for purchased hi-res
Step 6: Apply watermark to preview version
Step 7: Store both versions, update Portrait record
Step 8: Return preview URL to frontend
```

### 4.4 Watermarking Service

```typescript
// lib/services/watermark.ts

// Apply a subtle, professional watermark to preview images
// Options:
//   - Diagonal "ImageCrafter" text overlay at 15% opacity
//   - Small ImageCrafter logo in bottom-right corner
//   - Reduced resolution (1K max for preview vs 4K for purchased)

// Implementation: Use Sharp (npm package) for server-side image processing
// DO NOT use canvas or browser-based solutions — this runs server-side

// The watermark must be:
//   - Visible enough to prevent screenshot theft
//   - Subtle enough to not ruin the preview experience
//   - Consistent across all generated portraits
```

### 4.5 Style Packs — Complete Catalog

Each Style Pack contains multiple Style Variants. Here is the full catalog:

---

#### PACK 1: Royal Gallery
**Slug:** `royal-gallery`  
**Category:** `classic`  
**Tagline:** "Reign supreme in royal splendor"  
**Description:** "Transform your photo into a majestic royal portrait. Rich oil painting textures, ornate settings, and regal attire worthy of palace walls."

| Variant | Slug | Description |
|---------|------|-------------|
| Renaissance Noble | `renaissance` | Raphael/Titian-era Italian court portrait |
| Baroque Royalty | `baroque` | Dramatic Caravaggio lighting, Velázquez grandeur |
| Rococo Elegance | `rococo` | Soft pastels, Fragonard-style aristocratic charm |
| Tudor Court | `tudor` | English court portrait, Holbein-inspired formality |
| Imperial Commander | `imperial` | Napoleonic-era military portrait with medals and regalia |
| Victorian Aristocrat | `victorian` | Formal Victorian portrait, dark rich tones |

---

#### PACK 2: Masterpiece
**Slug:** `masterpiece`  
**Category:** `masterpiece`  
**Tagline:** "Step inside the world's greatest paintings"  
**Premium:** Yes  
**Description:** "You don't just get painted in the style — you become PART of the painting. Stand in the swirling skies of Starry Night, sit where the Mona Lisa sits, emerge from the Great Wave."

| Variant | Slug | Description |
|---------|------|-------------|
| The Starry Night | `starry-night` | Subject placed in Van Gogh's swirling night landscape |
| Mona Lisa Throne | `mona-lisa` | Subject seated in the Mona Lisa's pose and background |
| The Great Wave | `great-wave` | Subject emerging from Hokusai's iconic wave |
| Girl with a Pearl | `pearl-earring` | Vermeer's dramatic lighting and dark background |
| Water Lilies Garden | `water-lilies` | Subject surrounded by Monet's impressionist garden |
| The Persistence of Memory | `persistence` | Dalí's surreal melting landscape surrounding subject |
| The Kiss | `the-kiss` | Klimt's golden mosaic style embracing the subject |
| American Gothic | `american-gothic` | Grant Wood-style stoic farmstead portrait |

---

#### PACK 3: Time Traveler
**Slug:** `time-traveler`  
**Category:** `time-travel`  
**Tagline:** "Visit any era, no time machine required"  
**Description:** "Travel through history and see yourself in any time period. From ancient civilizations to retro decades, each variant is a portal to another age."

| Variant | Slug | Description |
|---------|------|-------------|
| Ancient Egyptian | `egyptian` | Pharaonic regalia, hieroglyphic backgrounds, gold and lapis lazuli |
| Roman Senator | `roman` | Marble bust style or toga-clad portrait with Roman architecture |
| Medieval Knight | `medieval` | Armor, castle backdrop, illuminated manuscript style |
| Samurai Warrior | `samurai` | Traditional ukiyo-e inspired Japanese warrior portrait |
| 1920s Art Deco | `art-deco` | Gatsby-era glamour, geometric patterns, gold accents |
| 1950s Americana | `1950s` | Norman Rockwell-esque warmth, Saturday Evening Post cover |
| 1970s Disco | `disco` | Glitter, neon, Studio 54 energy |
| 1980s Synthwave | `synthwave` | Neon grids, chrome, retrowave sunset |

---

#### PACK 4: Fantasy Realm
**Slug:** `fantasy-realm`  
**Category:** `fantasy`  
**Tagline:** "Enter worlds beyond imagination"  
**Premium:** Yes  
**Description:** "Step into the pages of your favorite fantasy worlds. Epic, cinematic, and utterly transportive."

| Variant | Slug | Description |
|---------|------|-------------|
| Elven Court | `elven` | Tolkien-esque ethereal woodland royalty |
| Dragon Rider | `dragon-rider` | Epic fantasy, soaring above a mythical landscape |
| Dark Sorcerer | `dark-sorcerer` | Mysterious magical figure with arcane energy |
| Fairy Tale | `fairy-tale` | Storybook illustration, enchanted forest setting |
| Steampunk Inventor | `steampunk` | Brass, gears, goggles, Victorian-industrial aesthetic |
| Cyberpunk Runner | `cyberpunk` | Neon-drenched dystopian city, tech-augmented subject |
| Underwater Kingdom | `underwater` | Atlantean royalty, bioluminescent ocean depths |
| Celestial Being | `celestial` | Cosmic, ethereal, surrounded by stars and galaxies |

---

#### PACK 5: Pop Culture
**Slug:** `pop-culture`  
**Category:** `pop-culture`  
**Tagline:** "Become the main character"  
**Description:** "See yourself rendered in the most iconic visual styles of modern culture. No copyrighted characters — just the styles and aesthetics."

| Variant | Slug | Description |
|---------|------|-------------|
| Comic Book Hero | `comic-hero` | Bold lines, halftone dots, dynamic comic book cover |
| Anime Protagonist | `anime` | Japanese animation style, large expressive eyes, dynamic pose |
| Pixar Portrait | `pixar-3d` | 3D animated character render, Pixar/DreamWorks quality |
| Retro Pixel Art | `pixel-art` | 16-bit video game character sprite, nostalgic |
| Street Art Mural | `street-art` | Banksy/Shepard Fairey-inspired urban wall art |
| Psychedelic Poster | `psychedelic` | 1960s concert poster, Peter Max color explosion |
| Vaporwave | `vaporwave` | Pastel gradients, Greek busts, retro-digital aesthetic |
| Studio Ghibli | `ghibli-style` | Miyazaki-esque watercolor anime, gentle and whimsical |

---

#### PACK 6: Fine Art Studio
**Slug:** `fine-art`  
**Category:** `fine-art`  
**Tagline:** "Your portrait, gallery ready"  
**Description:** "Pure artistic styles with no thematic overlay. Just your subject rendered in beautiful fine art techniques suitable for display."

| Variant | Slug | Description |
|---------|------|-------------|
| Oil on Canvas | `oil-painting` | Classical oil portrait with visible brushwork |
| Watercolor | `watercolor` | Soft, flowing watercolor with white paper edges |
| Charcoal Sketch | `charcoal` | Black and white charcoal drawing, dramatic contrast |
| Impressionist | `impressionist` | Monet/Renoir brushwork, dappled light |
| Pencil Drawing | `pencil` | Detailed graphite pencil portrait |
| Stained Glass | `stained-glass` | Medieval church window style, bold colors and lead lines |
| Mosaic | `mosaic` | Ancient Roman/Byzantine tile mosaic style |
| Ink Wash | `ink-wash` | East Asian sumi-e brush painting, minimalist |

---

#### PACK 7: Custom Scene (Premium)
**Slug:** `custom-scene`  
**Category:** `custom`  
**Premium:** Yes  
**Tagline:** "Describe your dream scene — we'll put you in it"  
**Description:** "Type any scene you can imagine. Our AI understands your vision and places your subject in a completely custom world. No templates, no limits."

This pack has NO preset variants. Instead, it provides:
- A text input field for the user to describe their scene
- Claude enhances the user's description into a full prompt
- The subject analysis is injected into the enhanced prompt
- Generation proceeds as normal

The prompt enhancement system prompt for Custom Scene:

```
You are a creative director for an AI portrait generation service. 
A user has uploaded a photo and described a custom scene they want 
their subject placed into.

Your job is to transform their description into a detailed, 
high-quality image generation prompt that:

1. Preserves the subject description exactly as provided (do not alter it)
2. Expands the user's scene description into vivid, specific visual detail
3. Adds appropriate artistic style, lighting, composition, and atmosphere
4. Ensures the subject is the clear focal point of the scene
5. Includes technical quality descriptors (resolution, detail level, etc.)

User's scene description: {{user_scene}}
Subject description: {{subject}}

Return ONLY the enhanced prompt. No explanation, no preamble.
```

---

## 5. Template System Overhaul

The current template system is confusing because templates and presets have vague names, the prompt templates are too generic, and users don't understand what they'll get. Here's the complete restructure:

### 5.1 New Template Categories

Instead of loose templates, organize into clear **use-case categories**:

| Category | Icon | Description | Templates |
|----------|------|-------------|-----------|
| **Content Creation** | `pen-tool` | Blog images, article headers, editorial | Blog Hero, Article Illustration |
| **Social Media** | `share-2` | Platform-optimized social content | Instagram Post, LinkedIn Banner, Twitter/X Header, YouTube Thumbnail |
| **Marketing** | `megaphone` | Ads, product shots, landing page images | Product Shot, Ad Creative, Landing Page Hero |
| **Storytelling** | `book-open` | Children's books, storyboards, scenes | Children's Book, Scene Illustration, Storyboard Frame |
| **Professional** | `briefcase` | Business-appropriate imagery | Presentation Graphic, Profile Background, Icon Set |

### 5.2 Redesigned Template UI Flow

**OLD (confusing):**
```
Step 1: Select template (vague names)
Step 2: Select preset (unclear what changes)
Step 3: Type prompt (no guidance)
Step 4: Adjust settings (too many knobs)
```

**NEW (clear):**
```
Step 1: Select Category (visual cards with icons)
Step 2: Select Template (clear name + example image showing output)
Step 3: Select Style (each style shows a before/after or sample)
Step 4: Describe your image (guided prompt with placeholder text specific to the chosen template+style)
Step 5: One-click generate (settings are smart-defaulted, expandable for power users)
```

### 5.3 Smart Defaults

Each template+preset combination pre-configures:
- Aspect ratio (16:9 for blog headers, 1:1 for Instagram, etc.)
- Resolution (based on plan)
- Style hints (injected automatically, user doesn't see them)

The user only fills in ONE field: "What's your image about?"

---

## 6. Complete Prompt Deck

### 6.1 Portrait Style Pack Prompts

Every prompt template uses these placeholders:
- `{{subject}}` — filled by Claude Vision subject analysis
- `{{style_modifiers}}` — filled by variant-specific modifiers
- `{{user_details}}` — optional user-provided description additions

---

#### ROYAL GALLERY PROMPTS

**Renaissance Noble** (`royal-gallery/renaissance`)
```
A magnificent Italian Renaissance oil portrait painting of {{subject}}, posed 
in a three-quarter view wearing elaborate period-accurate noble attire with 
intricate gold thread embroidery, jeweled accessories, and a richly textured 
velvet cloak. {{style_modifiers}}. Set against a backdrop of a palatial 
interior with arched windows revealing a distant Tuscan landscape. Rich 
Venetian color palette dominated by deep crimsons, royal blues, and burnished 
gold. Dramatic yet flattering Rembrandt lighting with warm golden tones 
illuminating the face. Masterful brushwork reminiscent of Raphael and Titian, 
with visible oil paint texture. Museum-quality fine art painting, ultra 
detailed, 8K resolution.
```

Style modifiers: `{"mood": "dignified, serene nobility", "palette": "deep crimson, royal blue, burnished gold, ivory", "lighting": "warm Rembrandt, golden hour through tall windows"}`

**Baroque Royalty** (`royal-gallery/baroque`)
```
A dramatic Baroque-era royal portrait of {{subject}} in the grand manner of 
Velázquez and Van Dyck. The subject wears sumptuous court attire with an 
ermine-trimmed robe, lace collar, and elaborate jewelry. {{style_modifiers}}. 
Theatrical chiaroscuro lighting with a single dramatic light source casting 
rich, deep shadows. Background of heavy velvet drapery in burgundy and gold 
with a marble column partially visible. The composition conveys power and 
authority. Dense, layered oil painting technique with rich impasto highlights 
on jewelry and fabric. Opulent and commanding presence. Museum masterwork 
quality, ultra detailed.
```

Style modifiers: `{"mood": "powerful, commanding, theatrical", "palette": "burgundy, deep gold, black, cream, rich earth tones", "lighting": "dramatic chiaroscuro, single source, deep shadows"}`

**Rococo Elegance** (`royal-gallery/rococo`)
```
An exquisite Rococo portrait of {{subject}} in the refined style of 
Fragonard and Boucher. The subject is adorned in pastel silk garments with 
delicate lace trim, pearl accessories, and flowers woven into the 
composition. {{style_modifiers}}. Set in an ornate French salon or pastoral 
garden with soft, dreamy atmosphere. Light, airy brushwork with soft edges 
and luminous skin tones. Pastel color harmony of powder blue, blush pink, 
soft gold, and cream. Playful yet elegant, with decorative flourishes and 
natural elements. A painting of aristocratic charm and refined beauty. 
Museum-quality, delicate brushwork, ultra detailed.
```

Style modifiers: `{"mood": "elegant, playful, refined, romantic", "palette": "powder blue, blush pink, soft gold, cream, lavender", "lighting": "soft diffused, flattering, garden light"}`

**Tudor Court** (`royal-gallery/tudor`)
```
A formal Tudor-era court portrait of {{subject}} in the style of Hans 
Holbein the Younger. The subject wears richly embroidered Tudor attire 
with a high collar, jeweled brooch, and intricate blackwork embroidery. 
{{style_modifiers}}. Flat, jewel-toned background in deep green or blue. 
Precise, meticulous detail on fabrics and jewelry. The subject's gaze is 
direct and confident. Restrained color palette with bold accents of ruby 
red and gold against dark backgrounds. Sharp focus, photorealistic detail 
in the Northern Renaissance tradition. Oil on oak panel quality, highly 
detailed, archival painting.
```

Style modifiers: `{"mood": "formal, authoritative, precise", "palette": "deep green, ruby red, gold, black, cream", "lighting": "even, flat, Northern European studio light"}`

**Imperial Commander** (`royal-gallery/imperial`)
```
A commanding Napoleonic-era military portrait of {{subject}} in the 
neoclassical style of Jacques-Louis David. The subject wears a magnificent 
military dress uniform with gold epaulettes, medals of honor, braided 
aiguillettes, and a ceremonial sash. {{style_modifiers}}. Background of a 
battlefield at dawn or a war room with maps and a globe. Strong directional 
lighting emphasizing the face with heroic grandeur. Composition conveys 
leadership and courage. Rich, saturated oil painting with meticulous detail 
on military regalia. Neoclassical idealism meets portraiture. Grand scale, 
epic, museum masterwork.
```

Style modifiers: `{"mood": "heroic, commanding, noble courage", "palette": "navy blue, gold, deep red, white, battle grey", "lighting": "heroic dawn light, strong directional from upper left"}`

**Victorian Aristocrat** (`royal-gallery/victorian`)
```
A refined Victorian-era portrait of {{subject}} in the style of John Singer 
Sargent. The subject wears elegant late 19th century formal attire — rich 
dark fabrics with subtle sheen, perhaps a top hat or elaborate hairstyle 
with jewelry. {{style_modifiers}}. Set in a dimly lit Victorian parlor with 
mahogany furniture, books, and a warm fireplace glow in the background. 
Sargent's signature loose yet precise brushwork, luminous skin rendering, 
and masterful fabric textures. Moody, warm color palette of deep browns, 
burgundy, forest green, and candlelit gold. Sophisticated and timeless 
elegance. Museum portraiture quality, ultra detailed.
```

Style modifiers: `{"mood": "sophisticated, reserved elegance, warm", "palette": "deep brown, burgundy, forest green, candlelit gold, ivory", "lighting": "warm interior, fireplace glow, soft Sargent-style"}`

---

#### MASTERPIECE PROMPTS

**Starry Night** (`masterpiece/starry-night`)
```
{{subject}} standing in the undulating landscape of Vincent van Gogh's 
The Starry Night. The iconic deep cobalt blue night sky swirls above with 
luminous spiraling stars rendered in thick impasto brushstrokes of cadmium 
yellow and white. A radiant crescent moon glows in the upper right. The 
rolling cypress-dotted hills and small village with its glowing windows 
extend behind the subject. {{style_modifiers}}. The subject is rendered 
in the same post-impressionist style — bold directional brushstrokes, 
vibrant complementary colors, visible paint texture. The entire scene 
pulses with Van Gogh's emotional energy. Oil on canvas, thick impasto, 
post-impressionist masterwork.
```

Style modifiers: `{"mood": "emotionally charged, dreamlike, cosmic", "palette": "deep cobalt blue, cadmium yellow, white, emerald green, violet", "lighting": "starlight and moonlight, luminous night"}`

**Mona Lisa Throne** (`masterpiece/mona-lisa`)
```
{{subject}} seated in the exact pose and setting of Leonardo da Vinci's 
Mona Lisa. The subject sits with hands gently folded, turned slightly 
to face the viewer with an enigmatic expression. Behind them, the famous 
sfumato landscape of winding rivers, distant mountains, and arched 
bridges recedes into atmospheric haze. {{style_modifiers}}. Rendered in 
Leonardo's sfumato technique — soft, seamless gradations of tone with no 
visible brushstrokes. Subtle earth-toned palette of olive, amber, and 
warm brown. Masterful chiaroscuro modeling of the face. The entire image 
has the warm, amber patina of a centuries-old masterwork. Oil on poplar 
panel quality, High Renaissance perfection.
```

Style modifiers: `{"mood": "enigmatic, serene, mysteriously knowing", "palette": "olive, amber, warm brown, soft blue-grey haze", "lighting": "soft Leonardo sfumato, diffused and mysterious"}`

**The Great Wave** (`masterpiece/great-wave`)
```
{{subject}} emerging from the iconic composition of Katsushika Hokusai's 
The Great Wave off Kanagawa. The massive curling wave towers above with 
its famous claw-like white foam fingers reaching toward the sky. Mount 
Fuji sits small and serene in the background beneath the wave's arch. 
The subject is positioned within the wave's dynamic curve, as if riding 
or emerging from the sea spray. {{style_modifiers}}. Rendered in the 
ukiyo-e woodblock print style — bold Prussian blue outlines, flat color 
areas, decorative foam patterns. Japanese woodblock print aesthetic with 
clean lines and dramatic composition. Traditional Japanese color palette.
```

Style modifiers: `{"mood": "dynamic, powerful, nature's majesty", "palette": "Prussian blue, indigo, white foam, pale sky, Fuji snow", "lighting": "flat ukiyo-e lighting, graphic and bold"}`

**Girl with a Pearl Earring** (`masterpiece/pearl-earring`)
```
{{subject}} rendered in the intimate, luminous style of Vermeer's Girl 
with a Pearl Earring. The subject turns to look over their shoulder at 
the viewer with parted lips and a captivating gaze. A single luminous 
pearl earring catches the light. {{style_modifiers}}. Deep, velvety 
black background that makes the subject emerge like a jewel from 
darkness. Vermeer's signature treatment of light — soft, pearlescent 
skin tones, the gentle gleam of the earring, a turban or head covering 
in ultramarine and gold. Photorealistic yet painterly, with the Dutch 
Golden Age's mastery of light and intimacy. Oil on canvas, Vermeer 
quality, luminous and captivating.
```

Style modifiers: `{"mood": "intimate, luminous, captivating gaze", "palette": "ultramarine blue, gold, pearl white, deep black, warm skin tones", "lighting": "soft Vermeer light from upper left, pearlescent"}`

**Water Lilies Garden** (`masterpiece/water-lilies`)
```
{{subject}} standing on the famous Japanese bridge in Claude Monet's 
Water Lily garden at Giverny. Lush impressionist vegetation surrounds 
them — cascading wisteria, weeping willows, and the famous pond covered 
in floating water lilies in pink, white, and lavender. {{style_modifiers}}. 
Dappled afternoon sunlight filters through the foliage creating dancing 
patterns of light and shadow. Rendered in Monet's late impressionist 
style — loose, expressive brushwork that dissolves forms into shimmering 
patches of color. The entire scene vibrates with captured light. Visible 
brushstrokes, complementary color harmonies, en plein air immediacy. Oil 
on canvas, French Impressionist masterwork.
```

Style modifiers: `{"mood": "peaceful, sun-dappled, dreamy garden", "palette": "soft green, lavender, pink, white, golden sunlight, water reflections", "lighting": "dappled afternoon sunlight through foliage"}`

**Persistence of Memory** (`masterpiece/persistence`)
```
{{subject}} placed within the surreal desert landscape of Salvador Dalí's 
The Persistence of Memory. Melting clocks drape over branches and ledges 
around the subject. The barren, dreamlike landscape stretches to distant 
cliffs under a twilight amber sky. {{style_modifiers}}. Rendered in 
Dalí's hyper-realistic surrealist technique — photographic precision 
applied to impossible subjects. Hard, precise edges on soft, melting 
forms. The uncanny juxtaposition of realistic rendering and dreamlike 
content. Warm amber and cool blue-grey palette. Meticulous oil painting 
technique, surrealist masterwork quality.
```

Style modifiers: `{"mood": "dreamlike, surreal, uncanny, contemplative", "palette": "warm amber, cool blue-grey, sandy beige, soft shadow purple", "lighting": "late afternoon Mediterranean light, long shadows"}`

**The Kiss** (`masterpiece/the-kiss`)
```
{{subject}} enveloped in the golden, mosaic-rich style of Gustav Klimt's 
The Kiss. The subject is adorned in elaborate robes decorated with 
geometric gold leaf patterns, spirals, and organic shapes. A field of 
wildflowers forms the ground beneath them. {{style_modifiers}}. Klimt's 
signature fusion of realistic portraiture and decorative flat patterning. 
Rich gold leaf dominates the composition, with the subject's face and 
hands rendered in naturalistic detail emerging from the ornamental 
abstraction. Art Nouveau organic curves meet Byzantine mosaic geometry. 
Gold, warm bronze, deep emerald, and floral accents. Mixed media 
appearance of oil paint and gold leaf, Viennese Secession masterwork.
```

Style modifiers: `{"mood": "romantic, golden, ornate intimacy", "palette": "gold leaf, warm bronze, deep emerald, floral colors, rich brown", "lighting": "warm golden glow, flat decorative with realistic face"}`

**American Gothic** (`masterpiece/american-gothic`)
```
{{subject}} posed in the stern, stoic composition of Grant Wood's American 
Gothic. Standing before a white clapboard house with the distinctive 
Gothic window. The subject holds a pitchfork and wears simple, 
hardworking rural attire. {{style_modifiers}}. Rendered in Grant Wood's 
precise, polished Regionalist style — smooth, almost porcelain-like 
skin, sharp detail, and slightly stylized features. The composition is 
frontal and symmetrical with a deadpan, unflinching quality. Muted 
midwestern palette of white, grey, farm green, and brown. Meticulous 
detail on fabric and architecture. Oil on beaverboard quality, American 
Regionalist precision.
```

Style modifiers: `{"mood": "stern, stoic, deadpan, American rural", "palette": "white, grey-green, farm brown, denim blue, pale skin", "lighting": "flat, overcast midwestern light, even and unflattering"}`

---

#### TIME TRAVELER PROMPTS

**Ancient Egyptian** (`time-traveler/egyptian`)
```
{{subject}} depicted as Egyptian royalty in the style of ancient tomb 
paintings and New Kingdom portraiture. The subject wears a magnificent 
nemes headdress (or vulture crown), broad gold and lapis lazuli collar 
necklace, kohl-lined eyes, and richly embroidered linen garments. 
{{style_modifiers}}. Hieroglyphic cartouches and sacred symbols frame 
the composition. Background of temple columns and the Nile at sunset. 
Rendered in the distinctive Egyptian profile style with frontal torso, 
using flat colors with precise gold leaf accents. Warm palette of gold, 
lapis lazuli blue, terracotta, and papyrus cream. Ancient Egyptian 
artistry meets portraiture, highly detailed, archival quality.
```

Style modifiers: `{"mood": "divine authority, eternal, sacred", "palette": "gold, lapis lazuli blue, terracotta, black kohl, papyrus cream", "lighting": "warm desert sun, golden hour on the Nile"}`

**Roman Senator** (`time-traveler/roman`)
```
{{subject}} portrayed as a Roman patrician in the tradition of Roman 
portrait busts and painted frescoes. The subject wears a pristine white 
toga with a purple-bordered toga praetexta, laurel wreath, and gold 
fibula brooch. {{style_modifiers}}. Background of a Roman forum with 
marble columns, the Senate building, and a Mediterranean blue sky. 
Rendered with the unflinching realism of Roman veristic portraiture — 
every feature captured honestly, conveying gravitas and authority. 
Warm marble and fresco color palette. Classical composition evoking the 
grandeur of the Roman Republic. Painted fresco quality with marble 
bust precision.
```

Style modifiers: `{"mood": "gravitas, authority, Republican virtue", "palette": "white marble, tyrian purple, gold, Mediterranean blue, warm stone", "lighting": "bright Mediterranean sun, classical marble clarity"}`

**Medieval Knight** (`time-traveler/medieval`)
```
{{subject}} depicted as a noble knight in the style of medieval 
illuminated manuscripts and tapestries. The subject wears polished plate 
armor with a heraldic surcoat, holds a sword or shield bearing a 
personal coat of arms, with a castle and tournament grounds behind them. 
{{style_modifiers}}. Rich, saturated colors typical of illuminated 
manuscripts — ultramarine, vermillion, burnished gold leaf borders. 
Slightly flattened medieval perspective with decorative border elements 
of interlacing vines and heraldic devices. The style bridges realistic 
portraiture with the decorative richness of the Book of Hours. Gold 
leaf accents, vellum texture, illuminated manuscript masterwork.
```

Style modifiers: `{"mood": "chivalric honor, noble duty, heraldic pride", "palette": "ultramarine, vermillion, gold leaf, forest green, parchment", "lighting": "bright, flat manuscript lighting with gold accents"}`

**Samurai Warrior** (`time-traveler/samurai`)
```
{{subject}} portrayed as a legendary samurai warrior in the ukiyo-e 
woodblock print tradition of Utagawa Kuniyoshi and Yoshitoshi. The 
subject wears ornate samurai armor (yoroi) with a fearsome kabuto 
helmet, katana at their side, standing before a moonlit Japanese 
landscape of cherry blossoms and ancient temple. {{style_modifiers}}. 
Bold, dramatic linework with flat color areas characteristic of 
Japanese woodblock printing. Dynamic composition with wind-blown 
elements and dramatic pose. Color palette of deep indigo, crimson, 
gold, and ink black. Ukiyo-e woodblock print style, museum-quality 
Japanese art.
```

Style modifiers: `{"mood": "fierce honor, warrior discipline, poetic intensity", "palette": "deep indigo, crimson, gold, ink black, cherry blossom pink", "lighting": "moonlight and lantern glow, dramatic ukiyo-e"}`

**1920s Art Deco** (`time-traveler/art-deco`)
```
A glamorous 1920s Art Deco portrait of {{subject}}, posed with Jazz Age 
sophistication in a luxurious speakeasy or grand ballroom setting. The 
subject wears dazzling period attire — beaded gown with fringe or 
sharp tuxedo with a boutonniere, marcelled waves or sleek hair, and 
elegant accessories. {{style_modifiers}}. Bold geometric patterns 
frame the composition — chevrons, sunbursts, stepped forms in gold 
and black. Warm, theatrical lighting with golden highlights and 
dramatic shadows. The style of Tamara de Lempicka meets Erté: 
sculptural forms, saturated colors, and unapologetic glamour. Art 
Deco illustration meets painted portraiture, vintage poster quality.
```

Style modifiers: `{"mood": "glamorous, sophisticated, Jazz Age excess", "palette": "black, gold, emerald, ruby, champagne, ivory", "lighting": "warm theatrical spotlight, golden highlights"}`

**1950s Americana** (`time-traveler/1950s`)
```
A warm, nostalgic portrait of {{subject}} in the style of Norman 
Rockwell's Saturday Evening Post covers. The subject is captured in a 
charming everyday moment — at a soda fountain, on a front porch, or 
at a community gathering. Wearing classic 1950s attire with 
period-perfect styling. {{style_modifiers}}. Rockwell's signature 
warmth — photorealistic detail combined with gentle idealization, 
capturing humor and humanity. Rich, warm color palette of cherry red, 
sky blue, cream, and warm wood tones. Meticulous detail on fabrics, 
props, and expressions. The composition tells a story. Oil on canvas, 
American illustration golden age, heartwarming and nostalgic.
```

Style modifiers: `{"mood": "warm, nostalgic, wholesome, gently humorous", "palette": "cherry red, sky blue, cream, warm wood, grass green", "lighting": "warm afternoon light, golden and inviting"}`

**1970s Disco** (`time-traveler/disco`)
```
A dazzling disco-era portrait of {{subject}} owning the dance floor at 
Studio 54. The subject wears spectacular 1970s fashion — sequined 
jumpsuit or flowing halter dress, platform shoes, and statement 
jewelry. Hair is voluminous and era-perfect. {{style_modifiers}}. 
Mirrored disco ball reflections scatter light across the scene. 
Background of a packed nightclub with neon signs and a lit-up dance 
floor. Saturated, high-contrast color with intense purples, electric 
blues, gold, and hot pink. Painted in a photorealistic style with 
a slight film grain and vintage color processing reminiscent of 
1970s photography. Glamour, energy, and nightlife magic.
```

Style modifiers: `{"mood": "euphoric, glamorous, electric nightlife", "palette": "electric purple, hot pink, gold, electric blue, mirror silver", "lighting": "disco ball reflections, neon glow, dance floor lights"}`

**1980s Synthwave** (`time-traveler/synthwave`)
```
A retro-futuristic synthwave portrait of {{subject}} set against an 
iconic 1980s retrofuture landscape. Neon grid extending to the horizon, 
chrome palm trees, a massive setting sun in gradient pink-to-purple, 
and a DeLorean or sports car in the background. The subject has 
rad 80s styling — aviator sunglasses, leather jacket, neon accents. 
{{style_modifiers}}. Hyper-saturated neon color palette of hot pink, 
electric cyan, chrome silver, and deep purple. Digital airbrush quality 
with smooth gradients and sharp neon glow effects. Retro VHS aesthetic 
with subtle scan lines. Synthwave album cover quality, ultra vibrant, 
nostalgic retrofuturism.
```

Style modifiers: `{"mood": "cool, retro-futuristic, neon-drenched", "palette": "hot pink, electric cyan, chrome silver, deep purple, sunset orange", "lighting": "neon glow, sunset gradient, chrome reflections"}`

---

#### FANTASY REALM PROMPTS

**Elven Court** (`fantasy-realm/elven`)
```
{{subject}} as noble elven royalty in a magnificent woodland palace. 
The subject wears flowing ethereal robes of silver and leaf-green with 
intricate vine and leaf motifs, an elegant circlet with a central 
gemstone, and pointed ear tips visible. The throne room is carved from 
a living ancient tree, with luminous crystal lanterns, hanging moss, 
and starlight filtering through a canopy of golden leaves. 
{{style_modifiers}}. Hyper-detailed digital fantasy painting in the 
tradition of Alan Lee and John Howe. Ethereal, otherworldly beauty 
with soft luminous lighting. Color palette of silver, emerald, gold 
leaf, moonlight blue, and bark brown. Epic fantasy illustration, 
cinematic composition, ultra detailed.
```

Style modifiers: `{"mood": "ethereal, ancient wisdom, otherworldly grace", "palette": "silver, emerald, gold leaf, moonlight blue, bark brown", "lighting": "ethereal starlight through canopy, luminous crystal glow"}`

**Dragon Rider** (`fantasy-realm/dragon-rider`)
```
An epic fantasy scene of {{subject}} mounted upon a massive dragon, 
soaring above a dramatic landscape of mountain peaks piercing through 
cloud layers. The subject wears battle-worn dragon rider armor with 
scale mail and a flowing cloak that whips in the wind. The dragon has 
iridescent scales, leathery wings spread wide, and breathes wisps of 
flame. {{style_modifiers}}. Cinematic fantasy art with dramatic 
perspective — viewed from slightly below looking up, conveying power 
and freedom. Epic scale with tiny castles visible far below. Rich, 
saturated color palette with warm firelight against cool sky. Digital 
fantasy painting, concept art quality, breathtaking and epic.
```

Style modifiers: `{"mood": "epic freedom, power, exhilarating adventure", "palette": "dragon fire orange, sky blue, cloud white, dark scale green, storm grey", "lighting": "dramatic backlighting from setting sun, dragon fire glow"}`

**Dark Sorcerer** (`fantasy-realm/dark-sorcerer`)
```
{{subject}} as a powerful dark sorcerer channeling arcane energy in a 
gothic stone tower. The subject wears elaborate dark robes with 
mystical runes that glow with eldritch light, a staff crowned with a 
pulsing crystal, and ancient tomes float in the background. Arcane 
energy crackles between their outstretched fingers in streams of 
purple and teal lightning. {{style_modifiers}}. Dark, atmospheric 
scene lit primarily by magical energy and candlelight. Gothic stone 
architecture with carved gargoyles and stained glass. Color palette 
dominated by deep purple, teal arcane glow, obsidian black, and 
candlelight amber. Dark fantasy digital painting, ominous and 
powerful, highly detailed.
```

Style modifiers: `{"mood": "ominous power, dark knowledge, mystical authority", "palette": "deep purple, teal glow, obsidian black, candlelight amber, blood red", "lighting": "magical energy glow, candlelight, eldritch illumination"}`

**Fairy Tale** (`fantasy-realm/fairy-tale`)
```
{{subject}} in an enchanted fairy tale forest clearing, illustrated in 
the style of classic storybook art by Arthur Rackham and Edmund Dulac. 
The subject wears whimsical attire with magical elements — perhaps a 
crown of flowers, a cape of leaves, or boots with curling toes. Tiny 
fairy lights dance around them, mushroom rings dot the mossy ground, 
and friendly woodland creatures peek from behind ancient trees. 
{{style_modifiers}}. Delicate, detailed illustration style with fine 
pen linework and soft watercolor washes. Enchanted forest color palette 
of moss green, warm gold, soft purple, and fairy-light white. Gentle, 
magical atmosphere with dappled sunlight through the canopy. Classic 
fairy tale book illustration, whimsical and enchanting.
```

Style modifiers: `{"mood": "enchanted, whimsical, gentle magic, storybook wonder", "palette": "moss green, warm gold, soft purple, fairy-light white, bark brown", "lighting": "dappled forest sunlight, fairy light glow, magical sparkle"}`

**Steampunk Inventor** (`fantasy-realm/steampunk`)
```
{{subject}} as a brilliant steampunk inventor in a cluttered workshop 
filled with extraordinary brass contraptions. The subject wears a 
leather aviator coat with brass buckles, ornate goggles pushed up on 
their forehead, and fingerless gloves with mechanical enhancements. 
Gears turn, steam hisses from copper pipes, and a half-built flying 
machine looms in the background. {{style_modifiers}}. Victorian 
industrial aesthetic meets fantastical engineering. Warm, amber-toned 
lighting from gas lamps and furnace glow. Color palette of polished 
brass, aged copper, dark leather, mahogany wood, and steam white. 
Intricate mechanical detail on every surface. Digital painting with 
industrial warmth, steampunk genre art, highly detailed.
```

Style modifiers: `{"mood": "inventive genius, Victorian adventure, mechanical wonder", "palette": "polished brass, aged copper, dark leather, mahogany, steam white", "lighting": "gas lamp warmth, furnace glow, amber industrial light"}`

**Cyberpunk Runner** (`fantasy-realm/cyberpunk`)
```
{{subject}} as a cyberpunk street operative in a rain-soaked neon 
cityscape. The subject wears a tech-augmented jacket with holographic 
patches, cybernetic implant accents glowing at the temple, and carries 
advanced tech gear. Towering megacorp skyscrapers loom behind, covered 
in holographic advertisements in Japanese and English. Rain reflects 
the neon lights in puddles across the wet asphalt. {{style_modifiers}}. 
Cinematic cyberpunk atmosphere with dense visual storytelling. Blade 
Runner-meets-Ghost-in-the-Shell aesthetic. Saturated neon palette of 
electric blue, hot magenta, toxic green, and rain-slick black. Moody, 
rain-drenched night scene with volumetric neon fog. Digital concept 
art, cinematic quality, ultra detailed cyberpunk.
```

Style modifiers: `{"mood": "gritty, neon-noir, tech-augmented rebellion", "palette": "electric blue, hot magenta, toxic green, rain-slick black, neon orange", "lighting": "neon reflections in rain, holographic glow, volumetric fog"}`

**Underwater Kingdom** (`fantasy-realm/underwater`)
```
{{subject}} as Atlantean royalty in a magnificent underwater palace. 
The subject wears flowing robes that undulate with the current, 
adorned with pearls, coral, and bioluminescent gems. An ornate crown 
of twisted sea gold and abalone shell. Schools of tropical fish swim 
past, jellyfish glow softly above, and the palace architecture blends 
coral formations with impossibly delicate stone arches. 
{{style_modifiers}}. Dreamy underwater atmosphere with god rays 
penetrating from the surface above. Bioluminescent lighting from sea 
creatures and glowing flora. Color palette of deep ocean blue, 
bioluminescent teal, coral pink, pearl white, and sea gold. Digital 
fantasy painting, ethereal underwater beauty, highly detailed.
```

Style modifiers: `{"mood": "serene majesty, ocean mystique, bioluminescent wonder", "palette": "deep ocean blue, bioluminescent teal, coral pink, pearl white, sea gold", "lighting": "god rays from surface, bioluminescent glow, caustic light patterns"}`

**Celestial Being** (`fantasy-realm/celestial`)
```
{{subject}} as a celestial being floating among the cosmos. The subject 
is surrounded by swirling nebulae in deep purple and gold, with 
countless stars glittering in the infinite darkness. They wear robes 
that seem woven from starlight itself, with cosmic energy flowing 
from their form. A halo of orbiting celestial bodies — moons, 
asteroids, rings of stardust. {{style_modifiers}}. Awe-inspiring 
cosmic scale — the subject is both human-sized and universe-spanning. 
Rich, deep space color palette of nebula purple, cosmic gold, 
starlight white, deep void black, and aurora green. Ethereal, 
luminous digital painting with lens flare and volumetric cosmic 
dust. Celestial fantasy art, transcendent and beautiful.
```

Style modifiers: `{"mood": "transcendent, cosmic awe, divine presence", "palette": "nebula purple, cosmic gold, starlight white, void black, aurora green", "lighting": "self-luminous, starlight, nebula glow, cosmic radiance"}`

---

#### POP CULTURE PROMPTS

**Comic Book Hero** (`pop-culture/comic-hero`)
```
{{subject}} as a powerful comic book superhero on a dramatic comic 
book cover. Bold black ink outlines, dynamic action pose, halftone 
dot shading, and vibrant primary colors. The subject wears a 
custom-designed hero costume (no existing IP) with a flowing cape 
and a unique emblem. The cityscape behind is rendered in dramatic 
perspective with speed lines and action effects. {{style_modifiers}}. 
Classic American comic book art style — Jack Kirby dynamism meets 
Jim Lee detail. Bold Ben-Day dots, dramatic foreshortening, heroic 
proportions. Speech bubble space in the composition. Primary color 
palette of comic red, blue, yellow, with black ink and white 
highlights. Comic book cover quality, dynamic and powerful.
```

Style modifiers: `{"mood": "heroic, dynamic, powerful, larger than life", "palette": "primary red, blue, yellow, bold black ink, white highlights", "lighting": "dramatic comic lighting, bold shadows, rim light effects"}`

**Anime Protagonist** (`pop-culture/anime`)
```
{{subject}} as the main character of a dramatic anime series. Rendered 
in high-quality anime illustration style with large expressive eyes, 
dynamic hair with colorful highlights, and a detailed character design. 
The subject wears an elaborate anime-style outfit with flowing elements 
that suggest motion. Wind blows dramatically through the scene. Cherry 
blossom petals or leaves scatter across the composition. 
{{style_modifiers}}. Professional anime key visual quality — clean 
cel-shaded coloring with precise linework, detailed eyes with light 
reflections, dynamic composition. Background is a detailed anime 
landscape (school rooftop, cherry blossom path, or dramatic cliff 
edge). Vibrant anime color palette with saturated tones. Studio-quality 
anime illustration, key visual poster quality.
```

Style modifiers: `{"mood": "determined, emotional, dramatic protagonist energy", "palette": "vibrant anime palette, saturated sky blue, cherry pink, warm gold", "lighting": "anime golden hour, dramatic rim lighting, sparkle effects"}`

**Pixar Portrait** (`pop-culture/pixar-3d`)
```
{{subject}} rendered as a charming 3D animated character in the style 
of Pixar and Disney Animation Studios. Smooth, stylized features with 
exaggerated proportions — slightly larger head, expressive eyes with 
catchlights, and a warm, appealing character design. The character 
wears detailed, textured clothing with realistic fabric simulation. 
Placed in a richly detailed 3D environment appropriate to their 
personality. {{style_modifiers}}. Professional 3D render quality with 
subsurface scattering on skin, detailed hair/fur simulation, and 
cinematic depth of field. Warm, inviting Pixar color palette with 
saturated tones and soft ambient lighting. Movie poster composition. 
CG animated film quality, charming and full of personality.
```

Style modifiers: `{"mood": "charming, warm, full of personality, family-friendly", "palette": "warm Pixar palette, saturated but friendly tones", "lighting": "soft Pixar lighting, warm key light, subtle bounce light, cinematic"}`

**Retro Pixel Art** (`pop-culture/pixel-art`)
```
{{subject}} as an 16-bit pixel art video game character portrait. 
The style references classic SNES/Genesis era RPG character portraits — 
carefully placed pixels creating detailed facial features within a 
constrained grid. The character has a pixel art costume and is framed 
in an RPG-style character dialog box or inventory screen. 
{{style_modifiers}}. Authentic 16-bit aesthetic with a limited but 
vibrant color palette (32-64 colors), careful dithering for shading, 
and clean pixel placement. Optional scanline overlay for CRT 
authenticity. The portrait should feel like it belongs in a classic 
JRPG like Final Fantasy VI or Chrono Trigger. Nostalgic pixel art, 
retro gaming quality.
```

Style modifiers: `{"mood": "nostalgic, retro gaming charm, heroic pixel character", "palette": "limited 16-bit palette, vibrant primary and secondary colors", "lighting": "pixel art shading with 3-4 tone levels, clean highlights"}`

**Street Art Mural** (`pop-culture/street-art`)
```
{{subject}} as a massive street art mural painted on a weathered brick 
wall. The style blends photorealistic portraiture with bold graphic 
elements — geometric shapes, dripping paint, stencil layers, and 
typographic elements. The subject's portrait dominates the wall with 
intense detail on the face while the surrounding elements dissolve 
into abstract spray paint patterns. {{style_modifiers}}. Authentic 
street art aesthetic — visible brick texture beneath paint, spray 
paint overspray, wheat-paste layers, stencil edges. Bold, high-contrast 
color palette of bright spray paint against weathered grey brick. The 
mural has depth from multiple layered techniques. Urban art 
photography capturing the mural in its environment, documentary quality.
```

Style modifiers: `{"mood": "bold, urban, countercultural, visually striking", "palette": "bright spray paint colors against grey brick, high contrast", "lighting": "natural daylight on the wall, realistic shadow from wall texture"}`

**Psychedelic Poster** (`pop-culture/psychedelic`)
```
{{subject}} at the center of a mind-expanding 1960s psychedelic concert 
poster. Swirling Art Nouveau lettering frames the composition, flowing 
organic shapes morph and undulate, and kaleidoscopic color patterns 
radiate outward. The subject's features are recognizable but stylized 
with flowing, melting lines and rainbow color shifts. {{style_modifiers}}. 
Authentic 1960s San Francisco poster art style of Victor Moscoso, 
Wes Wilson, and Rick Griffin. Vibrant, high-saturation complementary 
color collisions — orange against blue, red against green, purple 
against yellow. Organic flowing linework, optical vibration effects 
at color boundaries. Letterpress poster quality on textured paper.
```

Style modifiers: `{"mood": "mind-expanding, kaleidoscopic, countercultural ecstasy", "palette": "vibrating complementary pairs: orange/blue, red/green, purple/yellow", "lighting": "flat psychedelic, no realistic light — pure color interaction"}`

**Vaporwave** (`pop-culture/vaporwave`)
```
{{subject}} floating in a surreal vaporwave dreamscape. Pastel pink 
and cyan gradients fill the sky, glitched Roman busts and Greek 
columns scatter the composition, tropical palms rendered in retrowave 
wireframe, and a checkerboard floor extends to infinity. The subject 
has a dreamy, nostalgic quality with soft pastel color shifting. 
{{style_modifiers}}. Classic vaporwave aesthetic — Windows 95 UI 
elements, Japanese text fragments, VHS glitch artifacts, marble 
textures. Soft, pastel color palette of millennial pink, seafoam, 
lavender, and sunset orange against a dreamy gradient sky. Retro-
digital collage meets surreal portraiture. A E S T H E T I C quality, 
lo-fi digital nostalgia.
```

Style modifiers: `{"mood": "dreamy nostalgia, retro-digital surrealism, melancholic beauty", "palette": "millennial pink, seafoam, lavender, sunset orange, marble white", "lighting": "soft gradient glow, no hard shadows, pastel ambient"}`

**Studio Ghibli Style** (`pop-culture/ghibli-style`)
```
{{subject}} in the gentle, hand-painted animation style of Studio 
Ghibli and Hayao Miyazaki. The subject is placed in a rich, detailed 
natural environment — perhaps a flower-covered hillside, a quaint 
countryside village, or a lush forest with dappled sunlight. Soft, 
rounded character design with warm, expressive features. Gentle wind 
moves through the scene, ruffling hair and grass. {{style_modifiers}}. 
Miyazaki's signature warmth — meticulous background painting with 
watercolor textures, puffy cumulus clouds in a brilliant blue sky, 
and lovingly detailed vegetation. Character has cel-style coloring 
with subtle hand-painted softness. Warm, pastoral color palette. 
Studio Ghibli film quality, heartwarming and beautiful.
```

Style modifiers: `{"mood": "heartwarming, gentle wonder, pastoral peace", "palette": "sky blue, grass green, warm earth, soft pink, cumulus white", "lighting": "warm afternoon sunlight, dappled through trees, gentle and inviting"}`

---

#### FINE ART STUDIO PROMPTS

**Oil on Canvas** (`fine-art/oil-painting`)
```
A masterful oil portrait of {{subject}} painted in the classical 
academic tradition. Rich, layered paint application with visible 
brushwork — thick impasto in highlights, thin transparent glazes 
in shadows. The subject is posed naturally with a warm, genuine 
expression. {{style_modifiers}}. Neutral background that keeps 
focus on the subject. Warm, natural color palette with accurate 
skin tones and subtle color temperature shifts between light and 
shadow sides. Masterful edge control — sharp focus on eyes and 
features, softer edges on hair and clothing. Studio lighting from 
upper left. Classical oil portrait on stretched canvas, gallery 
quality, timeless and elegant.
```

Style modifiers: `{"mood": "timeless, honest, classically beautiful", "palette": "natural warm tones, accurate skin, rich earth palette", "lighting": "classic portrait studio, 45-degree key light from upper left"}`

**Watercolor** (`fine-art/watercolor`)
```
A luminous watercolor portrait of {{subject}} painted with confident, 
expressive washes. The portrait emerges from white paper with areas 
left deliberately unpainted, allowing the paper to breathe and glow 
through the transparent pigments. Wet-into-wet techniques create soft, 
blooming edges while precise dry-brush details define the eyes and 
key features. {{style_modifiers}}. Watercolor-specific qualities: 
visible pigment granulation, water bloom effects, color mixing on 
the paper surface, and the distinctive luminosity that comes from 
light passing through transparent pigment and reflecting off white 
paper. Limited but vibrant palette. Professional watercolor on 
cold-pressed paper, expressive and luminous.
```

Style modifiers: `{"mood": "luminous, fresh, expressive spontaneity", "palette": "limited watercolor palette, transparent pigments, white paper glow", "lighting": "natural daylight, warm and even, letting watercolor transparency shine"}`

**Charcoal Sketch** (`fine-art/charcoal`)
```
A dramatic charcoal portrait drawing of {{subject}} on textured cream 
paper. The drawing ranges from delicate fine lines to deep, velvety 
black tones achieved through heavy charcoal application. The subject 
is rendered with powerful contrast — bright highlights where charcoal 
has been lifted with an eraser, deep shadows where compressed charcoal 
is pressed into the paper grain. {{style_modifiers}}. Visible paper 
texture throughout, with charcoal sitting in the grain. A mix of 
vine charcoal (soft, atmospheric areas) and compressed charcoal 
(sharp details, deep blacks). White chalk or eraser highlights on 
the nose, cheekbones, and eyes create luminous focal points. 
Monochromatic with subtle warm/cool undertones from the paper. 
Fine art charcoal drawing, museum quality.
```

Style modifiers: `{"mood": "dramatic, raw, honest intensity", "palette": "monochromatic — deep black to cream white, subtle warm paper tone", "lighting": "strong directional, dramatic contrast, Rembrandt lighting"}`

**Impressionist** (`fine-art/impressionist`)
```
An Impressionist portrait of {{subject}} painted en plein air in the 
style of Renoir and Monet. The subject is captured in a natural 
moment, perhaps in a garden or by a window, with dappled sunlight 
playing across their features. Loose, visible brushstrokes of pure 
color placed side by side to optically mix. {{style_modifiers}}. 
The emphasis is on captured light rather than precise detail — 
features are suggested through color relationships rather than drawn 
outlines. Warm, sun-filled palette with complementary color shadows 
(blue-violet in shadows, warm yellow in highlights). Spontaneous, 
joyful brushwork that captures the fleeting impression of a moment. 
Oil on canvas, French Impressionist quality, light-filled and alive.
```

Style modifiers: `{"mood": "joyful, sun-dappled, fleeting beauty captured", "palette": "pure spectral colors, warm light, complementary color shadows", "lighting": "natural plein-air sunlight, dappled through foliage or windows"}`

**Pencil Drawing** (`fine-art/pencil`)
```
A highly detailed graphite pencil portrait drawing of {{subject}} on 
smooth Bristol paper. The drawing demonstrates virtuosic pencil 
technique — from delicate HB hairline marks for fine details to rich 
6B tones for deep shadows. Every feature is rendered with 
photorealistic precision: individual hairs, the subtle texture of 
skin, the gleam in the eyes. {{style_modifiers}}. Clean, precise 
rendering with smooth tonal gradations achieved through careful 
layered hatching and blending. The portrait emerges from white paper 
with a natural vignette — fully rendered in the center, dissolving 
into loose sketch marks at the edges. Monochromatic graphite on 
white paper. Hyperrealistic pencil drawing, master draftsman quality.
```

Style modifiers: `{"mood": "precise, intimate, photorealistic dedication", "palette": "monochromatic graphite — full range from white paper to near-black", "lighting": "soft studio lighting, gentle modeling, clean highlights"}`

**Stained Glass** (`fine-art/stained-glass`)
```
{{subject}} rendered as a magnificent stained glass window in the 
tradition of medieval cathedrals and Art Nouveau masters like 
Louis Comfort Tiffany. The subject's portrait is composed of 
hundreds of colored glass pieces separated by bold lead came lines. 
Light appears to stream through from behind, illuminating the rich 
jewel-toned glass. {{style_modifiers}}. The design blends realistic 
portraiture with the graphic constraints of stained glass — features 
defined by the lead lines, color areas are flat within each glass 
piece, and the overall effect is luminous and sacred. Jewel-tone 
palette of ruby, sapphire, emerald, amethyst, and gold. Ornamental 
border with Gothic tracery or Art Nouveau vine motifs. Cathedral 
quality stained glass, radiant and magnificent.
```

Style modifiers: `{"mood": "sacred luminosity, jewel-toned radiance, architectural art", "palette": "ruby, sapphire, emerald, amethyst, gold, clear glass white", "lighting": "backlit — light streaming through colored glass, radiant glow"}`

**Mosaic** (`fine-art/mosaic`)
```
{{subject}} depicted as an ancient mosaic in the Byzantine or Roman 
tradition. The portrait is composed of thousands of small tesserae 
(tile pieces) in stone, glass, and gold leaf. The subject's features 
are rendered with the distinctive mosaic aesthetic — slightly 
abstracted by the grid of tiles yet clearly recognizable. 
{{style_modifiers}}. A rich gold leaf background typical of Byzantine 
mosaics, with the subject rendered in natural stone and colored glass 
tesserae. Visible grout lines between tiles add texture and pattern. 
The composition includes a decorative border of geometric or floral 
mosaic patterns. Color palette of gold leaf, deep blue, terracotta, 
white marble, and rich green glass. Ancient mosaic quality, 
monumental and enduring.
```

Style modifiers: `{"mood": "monumental, eternal, sacred craftsmanship", "palette": "gold leaf, deep blue glass, terracotta stone, white marble, green glass", "lighting": "warm ambient light reflecting off gold and glass tesserae"}`

**Ink Wash** (`fine-art/ink-wash`)
```
{{subject}} painted in the East Asian sumi-e ink wash tradition. 
The portrait is rendered with confident, minimal brushstrokes — 
each mark carries maximum expression with minimum effort. The 
subject emerges from expansive negative space (white paper) with 
a few masterful strokes of black ink diluted to various tones. 
{{style_modifiers}}. Traditional sumi-e qualities: the beauty of 
the empty space is as important as the painted areas, ink 
gradations from deepest black to pale grey wash, spontaneous 
brushwork that captures essence rather than detail. Occasional 
red seal stamp (hanko) in the composition. Monochromatic with 
the warm tone of rice paper. East Asian brush painting on rice 
paper, meditative and masterful.
```

Style modifiers: `{"mood": "meditative, essential, the beauty of restraint", "palette": "sumi ink black through grey washes, white rice paper, red seal accent", "lighting": "no represented lighting — tonal values only, Eastern aesthetic"}`

---

### 6.2 Revamped ImageCrafter Template Prompts

These replace the existing vague template prompts for the general image generation feature:

---

#### CONTENT CREATION TEMPLATES

**Template: Blog Hero Image**
Category: `content`  
Aspect Ratio: `16:9`  
Icon: `image`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Tech & Innovation** | `tech` | `A striking editorial hero image for a technology blog article about {{topic}}. Clean, modern composition with a tech-forward aesthetic. Elements include: {{details}}. Cool blue and purple color palette with bright accent highlights, shallow depth of field, premium tech photography feel. Sharp focus on the primary subject with subtle bokeh background. Professional editorial photography, 16:9 widescreen composition, magazine cover quality.` |
| **Health & Wellness** | `health` | `A calming, aspirational hero image for a health and wellness blog article about {{topic}}. Fresh, clean composition evoking vitality and balance. Elements include: {{details}}. Natural light streaming through windows or outdoors, soft green and earth tone palette with white space. Peaceful, inviting atmosphere. Professional lifestyle photography, editorial quality, 16:9 widescreen.` |
| **Business & Finance** | `business` | `A sophisticated, authoritative hero image for a business blog article about {{topic}}. Professional composition conveying expertise and clarity. Elements include: {{details}}. Premium corporate aesthetic — deep navy, charcoal, and gold accents. Clean lines, modern office or abstract geometric elements. Confident, trustworthy, executive feel. Professional editorial photography, 16:9 widescreen.` |
| **Food & Lifestyle** | `food` | `A warm, inviting editorial hero image for a food and lifestyle blog about {{topic}}. Rich, appetizing composition that draws the reader in. Elements include: {{details}}. Warm golden-hour lighting, rustic wood surfaces, natural textures. Rich, saturated color palette with warm tones. Shot from above or 45-degree angle. Professional food photography, editorial styling, 16:9 widescreen.` |
| **Travel & Adventure** | `travel` | `A breathtaking hero image for a travel blog article about {{topic}}. Epic, wanderlust-inducing composition that makes readers want to pack their bags. Elements include: {{details}}. Dramatic natural lighting — golden hour, blue hour, or dramatic weather. Vibrant, saturated colors with strong horizon lines. Cinematic travel photography feel, 16:9 widescreen, National Geographic quality.` |
| **Creative & Design** | `creative` | `An eye-catching, design-forward hero image for a creative industry blog about {{topic}}. Bold, artistic composition that speaks to creative professionals. Elements include: {{details}}. Vibrant color palette or striking monochromatic choice, thoughtful typography space, creative use of negative space. Art-directed photography or illustration feel, 16:9 widescreen.` |

---

**Template: Article Illustration**
Category: `content`  
Aspect Ratio: `4:3`  
Icon: `pen-tool`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Concept Visualization** | `concept` | `A clear, informative illustration that visually explains the concept of {{topic}}. The image should make an abstract idea tangible and understandable. Elements include: {{details}}. Clean, modern illustration style with a white or light background. Flat design with subtle depth and shadow. Limited color palette of 3-4 harmonious colors. Infographic-quality clarity, professional editorial illustration, 4:3.` |
| **Photorealistic Scene** | `photo-scene` | `A photorealistic stock-quality image depicting {{topic}} in a natural, unposed setting. Authentic and relatable rather than staged. Elements include: {{details}}. Natural lighting, contemporary setting, diverse and realistic. Professional photography quality with editorial polish but not overly styled. Warm, natural color grading, 4:3 composition.` |
| **Abstract & Metaphorical** | `abstract` | `An abstract, metaphorical visual interpretation of {{topic}}. The image should evoke the feeling and meaning of the concept through shape, color, and form rather than literal depiction. Elements include: {{details}}. Bold, artistic composition with strong visual impact. Harmonious color palette that conveys the right emotional tone. Abstract digital art with depth and sophistication, 4:3.` |

---

#### SOCIAL MEDIA TEMPLATES

**Template: Instagram Post**
Category: `social`  
Aspect Ratio: `1:1`  
Icon: `instagram`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Feed Post — Bold** | `feed-bold` | `A scroll-stopping Instagram feed image about {{topic}}. Bold, high-contrast composition designed to grab attention in a crowded feed. Elements include: {{details}}. Vibrant, saturated colors with strong visual hierarchy. Text-safe zone in the center or bottom third. Clean composition that reads well at thumbnail size. Instagram-optimized 1:1 square, influencer-quality photography.` |
| **Feed Post — Minimal** | `feed-minimal` | `A clean, minimalist Instagram feed image about {{topic}}. Elegant simplicity that stands out through restraint. Elements include: {{details}}. Muted, cohesive color palette (2-3 tones), generous negative space, centered subject. The aesthetic of a well-curated Instagram feed. Instagram-optimized 1:1 square, editorial quality.` |
| **Carousel Cover** | `carousel` | `An engaging Instagram carousel cover slide about {{topic}} that makes people want to swipe. Bold typography space, clear visual hook, and a sense that more content follows. Elements include: {{details}}. Eye-catching but not cluttered, with a clear focal point and text-safe areas. Instagram-optimized 1:1 square with a clear swipe-bait quality.` |

---

**Template: LinkedIn Banner**
Category: `social`  
Aspect Ratio: `4:1`  
Icon: `linkedin`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Professional** | `professional` | `A polished LinkedIn banner image conveying expertise in {{topic}}. Professional, corporate-appropriate composition with a modern edge. Elements include: {{details}}. Deep blue, navy, or charcoal palette with subtle accent color. Abstract geometric or architectural elements suggesting innovation. Left side has space for the profile photo overlap. LinkedIn banner format 4:1, executive-level quality.` |
| **Thought Leader** | `thought-leader` | `A distinctive LinkedIn banner for a thought leader in {{topic}}. Stands out from generic corporate banners while remaining professional. Elements include: {{details}}. Bold, modern design with personality — not generic stock. Unique color palette that feels branded. Text-safe area on the right two-thirds. LinkedIn banner 4:1, personal brand quality.` |

---

**Template: YouTube Thumbnail**
Category: `social`  
Aspect Ratio: `16:9`  
Icon: `youtube`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **High Energy** | `high-energy` | `A high-click-rate YouTube thumbnail about {{topic}}. Designed for maximum curiosity and click-through. Elements include: {{details}}. Ultra-vibrant, oversaturated colors that pop on any screen. Strong visual contrast, dramatic expression or reveal moment. Large text-safe area on the right side. Bright, high-key lighting. YouTube thumbnail-optimized 16:9, designed for 5% CTR.` |
| **Clean Tutorial** | `tutorial` | `A professional YouTube tutorial thumbnail about {{topic}}. Credible, helpful, and clearly communicates the video topic. Elements include: {{details}}. Clean background (gradient or soft solid), clear subject in the center with room for text overlay. Professional but approachable. Consistent series look. YouTube thumbnail 16:9, edu-creator quality.` |

---

#### MARKETING TEMPLATES

**Template: Product Shot**
Category: `marketing`  
Aspect Ratio: `1:1`  
Icon: `shopping-bag`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Clean E-Commerce** | `ecommerce` | `A premium product photography shot of {{topic}} on a clean, neutral background. Studio-lit with soft shadows, multiple angle suggestion. Elements include: {{details}}. White or light grey seamless background, professional product photography lighting (three-point setup), sharp focus throughout with high detail. Color-accurate, no heavy filters. E-commerce listing quality, 1:1 square, Amazon/Shopify standard.` |
| **Lifestyle Context** | `lifestyle` | `A styled lifestyle product shot of {{topic}} in a natural, aspirational setting. The product is in use or in context, showing how it fits into real life. Elements include: {{details}}. Warm, editorial lighting (golden hour or soft window light), styled scene with complementary props, shallow depth of field focusing on the product. Instagram-worthy lifestyle photography, 1:1.` |
| **Flat Lay** | `flat-lay` | `A beautiful flat lay composition featuring {{topic}} shot from directly above. Carefully arranged with complementary items, textures, and props creating a curated, editorial feel. Elements include: {{details}}. Clean, bright styling on a textured surface (marble, wood, linen). Overhead studio lighting with soft, even illumination. Thoughtful negative space. Professional flat-lay photography, 1:1 square.` |

---

**Template: Ad Creative**
Category: `marketing`  
Aspect Ratio: `1:1` (default, adjustable)  
Icon: `megaphone`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Social Ad — Attention** | `social-ad` | `A high-performing social media ad image for {{topic}}. Designed to stop the scroll and drive clicks. Elements include: {{details}}. Bold, contrasting colors (complementary color scheme), strong visual hierarchy with a single clear focal point. Large text-safe zone for headline and CTA. Bright, high-energy composition. Performance marketing ad creative, 1:1, designed for conversion.` |
| **Story/Reel Ad** | `story-ad` | `A full-screen story or reel ad image for {{topic}} in 9:16 vertical format. Immersive, engaging, designed for mobile-first consumption. Elements include: {{details}}. Vertical composition with the main visual in the center, text-safe zones top and bottom. Vibrant, mobile-optimized colors that pop on phone screens. Story ad creative, 9:16, thumb-stopping quality.` |

---

#### STORYTELLING TEMPLATES

**Template: Children's Book Illustration**
Category: `storytelling`  
Aspect Ratio: `3:2`  
Icon: `book-open`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Classic Watercolor** | `watercolor` | `A warm, gentle children's book illustration depicting {{topic}}. Soft watercolor style with hand-painted charm, friendly and inviting for young readers. Elements include: {{details}}. Pastel color palette with gentle washes and soft edges. Characters have large, expressive eyes and rounded, friendly proportions. Whimsical details and a sense of wonder. Professional children's book illustration, 3:2 spread format, picture book quality.` |
| **Modern Digital** | `modern` | `A vibrant, contemporary children's book illustration of {{topic}}. Clean digital art style with bold colors and strong character design. Elements include: {{details}}. Bright, saturated color palette, clean vector-inspired shapes with subtle texture overlays. Characters are expressive and appealing with modern proportions. Fun, energetic composition. Professional children's book illustration, 3:2.` |
| **Cozy Storybook** | `storybook` | `A cozy, nostalgic storybook illustration of {{topic}} in the tradition of classic bedtime stories. Warm, gentle atmosphere that feels like being tucked in at night. Elements include: {{details}}. Rich, warm palette of golden yellows, deep blues, and soft oranges. Detailed, immersive scene with many small discoveries. Soft lighting suggesting evening or candlelight. Classic storybook illustration quality, 3:2.` |

---

#### PROFESSIONAL TEMPLATES

**Template: Presentation Graphic**
Category: `professional`  
Aspect Ratio: `16:9`  
Icon: `presentation`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Keynote Visual** | `keynote` | `A bold, presentation-ready visual for a slide about {{topic}}. High-impact image designed to support a speaker's message, not compete with text. Elements include: {{details}}. Dark or gradient background (navy to black or deep blue to purple) with a dramatic visual focal point. Clean composition with ample space for text overlay on the left or right third. Cinematic quality, 16:9 widescreen, keynote presentation standard.` |
| **Concept Diagram** | `diagram` | `A clear, visually appealing diagram or conceptual illustration for a presentation about {{topic}}. Makes complex information visually intuitive. Elements include: {{details}}. Clean, modern style with a white or light background. Color-coded elements with clear visual hierarchy. Flat or isometric design language. Professional presentation graphic, 16:9.` |

---

**Template: Icon Set**
Category: `professional`  
Aspect Ratio: `1:1`  
Icon: `grid`

| Preset | Slug | Prompt Template |
|--------|------|----------------|
| **Line Icons** | `line` | `A set of clean, consistent line icons representing {{topic}}. Uniform 2px stroke weight, rounded corners, single accent color on white background. Elements include: {{details}}. Each icon occupies a consistent square frame, designed to work at 24px-64px sizes. Professional icon design, minimal and universally readable, 1:1 grid layout.` |
| **Filled Icons** | `filled` | `A set of bold, filled icons representing {{topic}}. Solid shapes with consistent visual weight, 2-color palette (primary + accent). Elements include: {{details}}. Friendly, rounded style that works in UI, presentations, and marketing. Consistent padding within each icon frame. Professional icon set, 1:1 grid layout.` |

---

## 7. API Endpoints

### 7.1 New Portrait Studio Endpoints

```
POST   /api/portraits/upload
  - Accepts: multipart/form-data (image file)
  - Validates: file type, size, dimensions
  - Stores: image to S3/R2
  - Returns: { portraitId, sourceImageUrl, status: "uploaded" }
  - Auth: Optional (generates sessionId for guests)

POST   /api/portraits/analyze
  - Accepts: { portraitId }
  - Calls: Claude Vision for subject analysis
  - Updates: Portrait.subjectAnalysis, Portrait.subjectType
  - Returns: { subjectAnalysis, photoQuality }
  - Note: Returns quality issues if photo is unusable

POST   /api/portraits/generate
  - Accepts: { portraitId, stylePackSlug, styleVariantSlug, userDetails? }
  - Pipeline: builds prompt → enhances via Claude → generates via Gemini
  - Stores: preview (watermarked) + hi-res
  - Updates: Portrait status to "preview"
  - Returns: { previewImageUrl, status: "preview" }

GET    /api/portraits/[id]
  - Returns: portrait data with preview URL
  - If purchased: includes hi-res URL

POST   /api/portraits/[id]/regenerate
  - Regenerates with same settings (new variation)
  - Costs 1 generation credit (subscribers) or is free (first regen for guests)

GET    /api/style-packs
  - Returns: all active style packs with their variants
  - Includes: sample images, names, descriptions
  - Filterable: by category, premium status

GET    /api/style-packs/[slug]
  - Returns: single style pack with full variant details
```

### 7.2 New Order & Print Endpoints

```
POST   /api/orders/create
  - Accepts: { portraitId, type, email, printOptions? }
  - Creates: Stripe Checkout Session
  - Returns: { stripeSessionUrl }
  - Auth: Optional (email required for guests)

GET    /api/orders/[id]
  - Returns: order status, tracking info
  - Auth: email match or authenticated user

POST   /api/orders/[id]/download
  - Validates: order is paid, download count < max, not expired
  - Returns: signed URL to hi-res image
  - Increments: downloadCount

GET    /api/print/products
  - Returns: available print products with sizes, prices, frame options
  - Source: cached from Prodigi catalog (refresh daily)

POST   /api/print/order
  - Internal: called after Stripe payment success
  - Creates: Prodigi order via their API
  - Updates: Order with prodigiOrderId

POST   /api/webhooks/prodigi
  - Handles: Prodigi status webhooks (printing → shipped → delivered)
  - Updates: Order status, tracking info
  - Triggers: email notifications to customer
```

### 7.3 Updated Template Endpoints

```
GET    /api/templates
  - Returns: all templates grouped by category
  - Includes: preset count and sample images
  - Replaces: existing endpoint with new structure

GET    /api/templates/[slug]
  - Returns: template with all presets and their prompt templates

GET    /api/templates/[slug]/presets/[presetSlug]
  - Returns: single preset with full prompt template
```

---

## 8. Print-on-Demand Integration (Prodigi)

### 8.1 Setup

1. Create account at prodigi.com
2. Get sandbox API key from dashboard
3. Get production API key (separate)
4. Set up webhook endpoint for order status updates

### 8.2 Service: `lib/services/print-fulfillment.ts`

```typescript
// Core methods:

interface ProdigiService {
  // Get available products and pricing
  getProducts(): Promise<ProdigiProduct[]>;
  
  // Create a print order
  createOrder(params: {
    imageUrl: string;       // hi-res image URL (must be publicly accessible)
    product: {
      sku: string;          // Prodigi product SKU
      sizing: string;       // "fillPrintArea" | "fitPrintArea"
    };
    recipient: {
      name: string;
      address: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        zip: string;
        country: string;    // ISO 3166-1 alpha-2
      };
    };
    merchantReference: string; // your Order.id
  }): Promise<ProdigiOrderResponse>;
  
  // Get order status
  getOrderStatus(prodigiOrderId: string): Promise<ProdigiOrderStatus>;
  
  // Handle webhook
  handleWebhook(payload: ProdigiWebhookPayload): Promise<void>;
}
```

### 8.3 Product Catalog (Initial Launch)

Map these Prodigi products to your print options:

| Your Product Name | Prodigi SKU Pattern | Sizes | Frame Options |
|-------------------|---------------------|-------|---------------|
| Art Print | `GLOBAL-FAP-*` (Fine Art Print) | 8x10, 12x16, 16x20, 24x36 | N/A |
| Framed Print | `GLOBAL-CFP-*` (Classic Framed Print) | 8x10, 12x16, 16x20 | Black, White, Natural, Gold, Silver |
| Canvas | `GLOBAL-CAN-*` (Stretched Canvas) | 12x12, 16x16, 16x20, 24x36 | N/A |
| Framed Canvas | `GLOBAL-CFC-*` (Classic Framed Canvas) | 12x12, 16x16, 16x20 | Black, White, Natural, Gold |

### 8.4 Pricing Matrix

| Product | Size | Prodigi Cost (est.) | Your Price | Margin |
|---------|------|---------------------|------------|--------|
| Digital Download | N/A | ~$0.02 | $14.95 | $14.93 |
| Art Print | 8x10 | ~$5 | $29.95 | ~$25 |
| Art Print | 16x20 | ~$10 | $49.95 | ~$40 |
| Art Print | 24x36 | ~$15 | $69.95 | ~$55 |
| Framed Print | 8x10 | ~$15 | $49.95 | ~$35 |
| Framed Print | 12x16 | ~$22 | $69.95 | ~$48 |
| Framed Print | 16x20 | ~$30 | $89.95 | ~$60 |
| Canvas | 16x16 | ~$15 | $59.95 | ~$45 |
| Canvas | 16x20 | ~$18 | $69.95 | ~$52 |
| Canvas | 24x36 | ~$28 | $99.95 | ~$72 |
| Framed Canvas | 16x16 | ~$25 | $79.95 | ~$55 |
| Framed Canvas | 16x20 | ~$32 | $99.95 | ~$68 |
| Framed Canvas | 24x36 | ~$45 | $129.95 | ~$85 |

**Subscriber discount:** 15% off all print orders (applied at checkout for authenticated users with active subscription).

---

## 9. Stripe Payment Flows

### 9.1 Existing Subscription Products (finalize these)

```
ImageCrafter Starter — $9/mo — price_STARTER
ImageCrafter Pro — $19/mo — price_PRO
ImageCrafter Team — $49/mo — price_TEAM
```

### 9.2 New One-Time Payment Products

For portrait purchases, use **Stripe Checkout Sessions** with dynamic line items (not pre-created products), since the price varies by print product and size:

```typescript
// Create checkout session for portrait purchase
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer_email: guestEmail, // or customer: stripeCustomerId for subscribers
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: `Portrait — ${productName}`,
        description: `${stylePack} / ${styleVariant} — ${size}`,
        images: [previewImageUrl],
      },
      unit_amount: priceInCents,
    },
    quantity: 1,
  }],
  // For print orders, collect shipping address
  ...(orderType === 'print' && {
    shipping_address_collection: {
      allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL'],
    },
  }),
  metadata: {
    orderId: order.id,
    portraitId: portrait.id,
    orderType: orderType,
  },
  success_url: `${baseUrl}/portraits/${portrait.id}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/portraits/${portrait.id}?cancelled=true`,
});
```

### 9.3 Webhook Handler Updates

Update your existing `/api/webhooks/stripe` to handle both subscriptions AND one-time portrait payments:

```
checkout.session.completed:
  - If metadata.orderId exists → portrait purchase flow:
    1. Update Order.status to "paid"
    2. If digital: generate secure download link, send email
    3. If print: extract shipping address, call Prodigi API, send confirmation email
  - If subscription → existing flow

payment_intent.payment_failed:
  - Update Order.status to "failed"
  - Send failure notification email
```

---

## 10. Frontend Pages & Routes

### 10.1 Portrait Studio (Public)

```
/portraits                    → Landing page with style gallery, hero, CTA
/portraits/create             → Upload photo + select style + preview wizard
/portraits/[id]               → Result view with purchase options
/portraits/[id]/checkout      → Stripe checkout redirect
/portraits/[id]/print-options → Print customization (size, frame, format)
/portraits/[id]/success       → Post-purchase confirmation + download/tracking
```

### 10.2 Portrait Studio (Dashboard — Authenticated)

```
/dashboard/portraits          → Subscriber's portrait history
/dashboard/portraits/create   → Same create flow but with plan benefits
```

### 10.3 Blog (Public)

```
/blog                         → Blog index with featured + recent posts
/blog/[slug]                  → Individual blog post
/blog/category/[slug]         → Category archive
```

### 10.4 Updated Existing Routes (No Changes to URLs)

```
/generate                     → Updated with new template UI flow
/gallery                      → Now includes portrait filter
/settings                     → Now includes portrait purchase history
```

---

## 11. Email Notifications

Implement with Resend (resend.com) or SendGrid. Transactional emails required:

| Trigger | Recipient | Content |
|---------|-----------|---------|
| Digital purchase complete | Customer email | Download link, thank you, subscription upsell |
| Print order confirmed | Customer email | Order summary, expected delivery, tracking (when available) |
| Print order shipped | Customer email | Tracking number + URL, delivery estimate |
| Print order delivered | Customer email | Delivery confirmation, review request, social share CTA |
| Download link reminder | Customer email | Sent 48hrs before download link expires |
| Portrait generation failed | Customer email | Apology, auto-refund notice, retry suggestion |

---

## 12. Blog Infrastructure

### 12.1 Content Strategy Topics

Target keywords for organic traffic that feed into Portrait Studio:

- "AI pet portrait" / "AI pet portrait generator"
- "custom pet portrait online"
- "AI family portrait"
- "turn photo into painting"
- "AI image generation for beginners"
- "best AI art generators 2026"
- "personalized pet gifts"
- "custom portrait prints"
- "AI Renaissance portrait"
- "how AI image generation works"

### 12.2 Blog Tech Stack

- Content stored in database (BlogPost model)
- Admin: build a simple admin page at `/admin/blog` (auth-gated to admin users)
- Rendering: server-rendered MDX or HTML content
- SEO: dynamic meta tags, Open Graph images, JSON-LD structured data
- RSS feed at `/blog/rss.xml`

---

## 13. Environment Variables

### New Variables to Add

```bash
# Prodigi (Print-on-Demand)
PRODIGI_API_KEY="your-production-api-key"
PRODIGI_SANDBOX_API_KEY="your-sandbox-api-key"
PRODIGI_API_URL="https://api.prodigi.com/v4.0"
PRODIGI_SANDBOX_URL="https://api.sandbox.prodigi.com/v4.0"
PRODIGI_WEBHOOK_SECRET="your-webhook-secret"
USE_PRODIGI_SANDBOX="true"  # set to "false" for production

# File Storage (for photo uploads)
S3_BUCKET="imagecrafter-uploads"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
# OR for Cloudflare R2:
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET="imagecrafter-uploads"
R2_PUBLIC_URL="https://uploads.imagecrafter.app"

# Email (Resend recommended)
RESEND_API_KEY="re_your-api-key"
EMAIL_FROM="ImageCrafter <hello@imagecrafter.app>"

# Portrait-specific
PORTRAIT_WATERMARK_OPACITY="0.15"
PORTRAIT_PREVIEW_MAX_RESOLUTION="1024"
PORTRAIT_HIRES_RESOLUTION="4096"
PORTRAIT_MAX_UPLOAD_SIZE_MB="10"
PORTRAIT_DOWNLOAD_EXPIRY_HOURS="72"
PORTRAIT_MAX_DOWNLOADS="5"
```

### Existing Variables (Unchanged)

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_TEAM="price_..."
IMAGE_GEN_API_URL="https://image-gen.xencolabs.com"
IMAGE_GEN_API_KEY="xgen-img-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## 14. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Prisma schema migration (all new models)
- [ ] File storage service (S3 or R2 upload handling)
- [ ] Portrait upload endpoint with validation
- [ ] Claude Vision subject analysis service
- [ ] Seed StylePack and StyleVariant data (all prompts from this PRD)
- [ ] Seed updated Template and TemplatePreset data

### Phase 2: Portrait Generation Pipeline (Week 2)
- [ ] Portrait prompt builder (subject + style → enhanced prompt)
- [ ] Portrait generation endpoint (integrates with existing Gemini API)
- [ ] Watermarking service (Sharp-based, server-side)
- [ ] Portrait Studio UI: upload → style select → preview
- [ ] Style pack gallery page

### Phase 3: Purchase Flow (Week 3)
- [ ] Stripe Checkout Session creation for portrait purchases
- [ ] Updated Stripe webhook handler (subscriptions + one-time)
- [ ] Digital download: secure URL generation and delivery
- [ ] Guest checkout flow (email collection, no auth required)
- [ ] Purchase confirmation page
- [ ] Email notifications: purchase confirmation, download link

### Phase 4: Print-on-Demand (Week 4)
- [ ] Prodigi account setup and API key configuration
- [ ] Print fulfillment service (create order, get status)
- [ ] Prodigi webhook handler (status updates)
- [ ] Print customization UI (size, frame, format selector)
- [ ] Stripe checkout with shipping address collection
- [ ] Email notifications: shipped, delivered

### Phase 5: Template Overhaul + Polish (Week 5)
- [ ] Implement new template category UI
- [ ] Update /generate page with new template flow
- [ ] Replace old template/preset seed data with new prompts
- [ ] Subscriber portrait dashboard integration
- [ ] Portrait history in gallery
- [ ] Subscriber discount logic for prints

### Phase 6: Blog + Launch Prep (Week 6)
- [ ] Blog schema and admin interface
- [ ] Blog frontend (index, post, category pages)
- [ ] SEO metadata and structured data
- [ ] Landing page for /portraits (conversion-optimized)
- [ ] Social sharing functionality
- [ ] Facebook Pixel / conversion tracking
- [ ] Final QA pass against validation checklist

---

## 15. Validation & QA Checklist

Per Xenco Production Standards, every phase completion must pass:

```bash
# Zero mock data
grep -rE 'mock|placeholder|lorem|test@|example\.com|TODO.*data' src/ && FAIL

# No silent failures  
grep -rE 'catch\s*\{\s*\}|\.catch\(\s*\(\)\s*=>' src/ && FAIL

# No workarounds
grep -rE 'HACK|FIXME|workaround|temporary fix' src/ && FAIL

# Schema validation before all DB operations
# Verify Prisma schema matches all query fields

# Stripe integration tested in test mode
# Prodigi integration tested in sandbox
# All email templates render correctly
# All API endpoints return proper error responses
# Watermarking visible on preview, absent on purchased
# Download links expire correctly
# Guest flow works end-to-end without auth
# Subscriber flow applies discount correctly
```

### Functional Test Cases

| Test | Expected Result |
|------|----------------|
| Upload valid photo | Analysis completes, subject described |
| Upload blurry photo | Quality warning returned with specific issues |
| Upload non-image file | Rejection with clear error message |
| Generate portrait (guest) | Watermarked preview returned |
| Purchase digital (guest) | Stripe checkout → email with download link |
| Download digital 5 times | 6th download blocked with message |
| Download after 72 hours | Link expired message |
| Purchase print (guest) | Stripe checkout with shipping → Prodigi order created |
| Generate portrait (subscriber) | Uses plan quota, saves to gallery |
| Purchase print (subscriber) | 15% discount applied |
| Prodigi webhook: shipped | Order updated, tracking email sent |
| Template generation | Correct prompt assembled from template + preset |
| Custom scene | User description enhanced and subject injected |

---

*This document is the single source of truth for ImageCrafter 2.0 development. All implementation must follow Xenco Production Standards — no mock data, no workarounds, schema-first development, explicit error handling.*
