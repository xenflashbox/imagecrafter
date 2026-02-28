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
8. [Print-on-Demand Integration (Prodigi)](#8-print-on-demand-integration)
8.1 [Prodigi API Ref Dock] 
Phase #5
5. [Template System Overhaul](#5-template-system-overhaul)
7. [API Endpoints](#7-api-endpoints)
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

-

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
