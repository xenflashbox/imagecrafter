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

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [Portrait Studio — Feature Spec](#4-portrait-studio)
5. [Template System Overhaul](#5-template-system-overhaul)
6. [Complete Prompt Deck](#6-complete-prompt-deck)
7. [API Endpoints](#7-api-endpoints)
8. [Print-on-Demand Integration (Prodigi)](#8-print-on-demand-integration)
9. [Stripe Payment Flows](#9-stripe-payment-flows)
10. [Frontend Pages & Routes](#10-frontend-pages--routes)
11. [Email Notifications](#11-email-notifications)
12. [Blog Infrastructure](#12-blog-infrastructure)
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
