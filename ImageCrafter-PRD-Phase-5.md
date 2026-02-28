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

----
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
