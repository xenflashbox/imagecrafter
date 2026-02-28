# ImageCrafter - Architecture & Implementation Guide

## Overview

ImageCrafter is an AI-powered image generation service that wraps Xenophon's existing Gemini Image Gen API with intelligent prompt enhancement, template-based workflows, and character consistency for projects like children's books.

**Domain**: imagecrafter.app  
**Tagline**: AI Image Generation Made Simple

**Core Value Proposition**: Simple image generation for non-technical users through AI-assisted prompt engineering and pre-built templates.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │  Generator  │  │  Projects   │  │   Prompt History    │ │
│  │   (Usage)   │  │   (Main)    │  │  (Books)    │  │   (Reuse/Edit)      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ /api/images/    │  │ /api/projects/  │  │ /api/webhooks/              │  │
│  │   generate      │  │   [CRUD]        │  │   stripe, clerk             │  │
│  │   batch         │  │   character     │  │                             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Prompt Enhancement     │  │  Image Generation Service               │   │
│  │  (Claude Sonnet)        │  │  (Wraps image-gen.xencolabs.com)        │   │
│  │  - Template injection   │  │  - Usage tracking                       │   │
│  │  - Character profiles   │  │  - Plan limits                          │   │
│  │  - Style optimization   │  │  - Watermarking                         │   │
│  └─────────────────────────┘  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌───────────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐
│   Neon PostgreSQL     │  │  Gemini Image     │  │   External Services       │
│   (via Prisma)        │  │  Gen API          │  │   - Clerk (Auth)          │
│   - Users             │  │  (Your existing   │  │   - Stripe (Billing)      │
│   - Subscriptions     │  │   infrastructure) │  │   - Anthropic (Claude)    │
│   - Images            │  │                   │  │                           │
│   - Projects          │  │                   │  │                           │
│   - Templates         │  │                   │  │                           │
└───────────────────────┘  └───────────────────┘  └───────────────────────────┘
```

---

## Key Flows

### 1. Simple Image Generation Flow

```
User: "I need a hero image for my blog about coffee"
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 1. User selects template: "Blog Hero"               │
│ 2. User selects preset: "Food & Lifestyle"          │
│ 3. User enters: "coffee shop morning vibes"         │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Prompt Enhancement Service (Claude)                 │
│                                                     │
│ Input: "coffee shop morning vibes"                  │
│ Template: Blog Hero + Food/Lifestyle preset         │
│                                                     │
│ Output: "Warm editorial photograph of artisan       │
│ coffee being poured in cozy cafe, morning light     │
│ streaming through windows, steam rising from cup,   │
│ wooden counter and plants in background, lifestyle  │
│ photography style, inviting atmosphere"             │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Image Generation Service                            │
│ - Check user plan limits ✓                          │
│ - Call image-gen.xencolabs.com API                  │
│ - Store image record                                │
│ - Record usage                                      │
│ - Return CDN URL                                    │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
           User gets image URL
```

### 2. Children's Book Project Flow (Character Consistency)

```
User: "I'm creating a children's book about Tina Tortoise"
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ 1. Create Project (type: CHILDRENS_BOOK)            │
│ 2. Select style preset: "Classic Watercolor"        │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Generate Character Variations                        │
│                                                     │
│ User prompt: "friendly green turtle with pink bow"  │
│ System generates 4 variations                       │
│ User selects favorite → "Use as Character Anchor"   │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Character Analysis (Claude Vision)                  │
│                                                     │
│ Analyzes selected image and creates profile:        │
│                                                     │
│ "Tina Tortoise: A friendly sea turtle with a        │
│ rounded sage-green shell featuring darker hexagonal │
│ patterns. She has large, expressive brown eyes with │
│ long lashes, a warm cream underbelly, and wears a   │
│ small pink satin bow on the right side of her head. │
│ Art style: soft watercolor with gentle edges,       │
│ child-friendly proportions with larger head."       │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│ Generate Book Scenes                                │
│                                                     │
│ User: "Tina refuses to go to bed"                   │
│                                                     │
│ System builds prompt:                               │
│ [Character Profile] + [Scene] + [Style Lock]        │
│                                                     │
│ "Tina Tortoise: [full description]...               │
│  Scene: Tina standing defiantly in her bedroom,     │
│  arms crossed, looking away from her small bed,     │
│  toys scattered on floor, nightlight glowing,       │
│  soft watercolor children's book illustration"      │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema Summary

| Table | Purpose |
|-------|---------|
| `User` | Synced from Clerk, stores Stripe customer ID |
| `Subscription` | Plan tier, usage limits, feature flags |
| `Project` | Groups images for consistency (children's books, etc.) |
| `CharacterProfile` | Detailed character descriptions for injection |
| `Image` | All generated images with prompts and metadata |
| `PromptHistory` | Reusable/editable prompt history |
| `Template` | Pre-built prompt templates (Blog Hero, etc.) |
| `TemplatePreset` | Style variations within templates |
| `UsageRecord` | Granular usage tracking for billing |
| `BatchJob` | Tracks multi-image generation jobs |

---

## Template System

### Available Templates (Launch Set)

| Template | Category | Use Case |
|----------|----------|----------|
| **Blog Hero** | Blog Images | Article headers with tech/health/business/lifestyle presets |
| **Social Media Pack** | Social Media | Instagram, LinkedIn, Twitter sizes in one batch |
| **Presentation Graphics** | Presentations | Slide backgrounds, concept illustrations |
| **Children's Book** | Storytelling | Character-consistent illustrations |
| **Storyboard** | Storytelling | Scene-by-scene with style lock |
| **Product Shots** | Product Marketing | E-commerce, lifestyle, flat lay |
| **Profile Backgrounds** | Profile | Professional headshot backdrops |
| **Infographic Elements** | Infographics | Icons, headers, data viz |

### Template Structure

```typescript
{
  slug: "blog-hero",
  name: "Blog Hero Image",
  promptTemplate: "Professional hero image for a blog about {{topic}}, {{visualElements}}, {{style}}",
  defaultAspectRatio: "16:9",
  defaultStyleHints: "editorial photography, professional",
  presets: [
    {
      slug: "tech",
      name: "Technology",
      styleOverrides: {
        mood: "innovative, futuristic",
        colors: ["blue", "purple", "cyan"]
      },
      promptSuffix: "tech startup aesthetic, clean composition"
    }
  ]
}
```

---

## Pricing & Plans

| Tier | Price | Images/Month | Features |
|------|-------|--------------|----------|
| **Free** | $0 | 5 | Watermarked, 1K only, basic templates |
| **Starter** | $9/mo | 100 | No watermark, 2K, batch mode |
| **Pro** | $19/mo | 500 | Pro model, 4K, projects, character profiles |
| **Team** | $49/mo | 2,000 | API access, multiple seats |

### Stripe Products to Create

```bash
# In Stripe Dashboard or via API
stripe products create --name="ImageCraft Starter" --description="100 images/month"
stripe prices create --product=prod_xxx --unit-amount=900 --currency=usd --recurring[interval]=month

stripe products create --name="ImageCraft Pro" --description="500 images/month"  
stripe prices create --product=prod_xxx --unit-amount=1900 --currency=usd --recurring[interval]=month

stripe products create --name="ImageCraft Team" --description="2000 images/month"
stripe prices create --product=prod_xxx --unit-amount=4900 --currency=usd --recurring[interval]=month
```

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_TEAM="price_..."

# Your Image Gen API
IMAGE_GEN_API_URL="https://image-gen.xencolabs.com"
IMAGE_GEN_API_KEY="xgen-img-7f3k9m2p4q8r5t1v6w0y"

# Anthropic (for prompt enhancement)
ANTHROPIC_API_KEY="sk-ant-..."
```

---

## Frontend Pages

### 1. Dashboard (`/dashboard`)
- Usage meter (images used / limit)
- Recent images grid
- Quick generate button
- Upgrade prompt if near limit

### 2. Generate (`/generate`)
- Template selector (grid of template cards)
- Preset selector (based on template)
- Prompt input (with AI suggestions)
- Settings panel (aspect ratio, resolution, style hints)
- Generate button → Shows result with download

### 3. Gallery (`/gallery`)
- All user images in grid
- Filter by project, date, template
- Click to view details
- Download, favorite, delete actions
- Re-run prompt button

### 4. Projects (`/projects`) [Pro+]
- Project list with thumbnails
- Create new project (type selector)
- Project detail view:
  - Character profile display/edit
  - Project images grid
  - Generate new scene button

### 5. History (`/history`)
- Prompt history list
- Search/filter
- Click to re-run or edit
- Save favorite prompts

### 6. Settings (`/settings`)
- Subscription management
- Usage history
- API key (Team plan)
- Account settings

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/images/generate` | Generate single image |
| POST | `/api/images/batch` | Generate up to 10 images |
| GET | `/api/images` | List user's images |
| GET | `/api/images/[id]` | Get image details |
| DELETE | `/api/images/[id]` | Soft delete image |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Get project with images |
| POST | `/api/projects/[id]/character` | Create/update character profile |
| GET | `/api/templates` | List all templates |
| GET | `/api/prompts/history` | Get prompt history |
| POST | `/api/prompts/enhance` | Enhance a prompt without generating |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/webhooks/clerk` | Clerk webhook handler |
| GET | `/api/usage` | Get current usage stats |

---

## Implementation Order

### Phase 1: MVP (Week 1-2)
1. ✅ Database schema (Prisma)
2. ✅ Clerk webhook for user sync
3. ✅ Stripe webhook for subscriptions
4. ✅ Image generation service
5. ✅ Prompt enhancement service
6. ✅ Generate API endpoint
7. [ ] Basic frontend: Generate page
8. [ ] Basic frontend: Gallery page
9. [ ] Stripe checkout flow

### Phase 2: Templates (Week 3)
1. [ ] Seed all templates
2. [ ] Template selector UI
3. [ ] Preset system UI
4. [ ] Dashboard with usage

### Phase 3: Projects (Week 4)
1. [ ] Project CRUD
2. [ ] Character analysis
3. [ ] Character profile injection
4. [ ] Project detail UI

### Phase 4: Polish (Week 5)
1. [ ] Prompt history
2. [ ] Batch generation UI
3. [ ] Settings page
4. [ ] Mobile responsive
5. [ ] Landing page

---

## Domain Availability Check

Before finalizing, check availability:
- imagecraft.app
- imagecraft.io  
- imagecraft.co
- getimagecraft.com

Fallbacks:
- imagecraftai.com
- tryimagecraft.com

---

## Next Steps

1. **Domain**: Secure imagecraft domain
2. **Stripe**: Create products and prices
3. **Clerk**: Set up application
4. **Deploy**: Set up on your Docker Swarm
5. **Frontend**: Build the Next.js UI

The backend is spec'd and ready. Want me to build out the frontend components next?
