# ImageCrafter Implementation Guide

## For: Local Development Admin / AI Coding Assistant
## Project: ImageCrafter - AI Image Generation SaaS
## Owner: Xenco Labs

---

## CRITICAL CONTEXT

You are implementing ImageCrafter, an AI-powered image generation service. The architecture has been fully designed. Your job is to implement it correctly following Xenco Labs production standards:

- **NO mock data** - All data comes from real services
- **NO mock fallbacks** - If a service isn't configured, fail explicitly
- **Services layer architecture** - Business logic in `/lib/services/`, not in route handlers
- **Proper error handling** - Typed errors, proper HTTP status codes
- **Schema validation** - Zod for all API inputs

---

## PROJECT OVERVIEW

**What ImageCrafter Does:**
1. User describes an image in plain English
2. Our AI (Claude) enhances the prompt for optimal Gemini results
3. We call our existing Gemini Image Gen API at `image-gen.xencolabs.com`
4. User gets a professional image without learning prompt engineering

**Key Features:**
- Template-based prompt enhancement (Blog Hero, Social Media, Children's Book, etc.)
- Character consistency for projects (children's books, storyboards)
- Usage-based billing with Stripe
- Prompt history and reuse

**Tech Stack:**
- Next.js 15 (App Router)
- Prisma + Neon PostgreSQL
- Clerk Authentication
- Stripe Billing
- Anthropic Claude (prompt enhancement)
- Existing Gemini Image Gen API

---

## PHASE 1: REPOSITORY SETUP

### 1.1 Create GitHub Repository

```bash
# Create new repository
gh repo create xenco-labs/imagecrafter --private --description "AI Image Generation Made Simple"

# Or if repo exists, clone it
git clone git@github.com:xenco-labs/imagecrafter.git
cd imagecrafter
```

### 1.2 Initialize Next.js Project

```bash
# Create Next.js app with TypeScript, Tailwind, App Router
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# Install dependencies
pnpm add @clerk/nextjs @prisma/client stripe svix zod zustand framer-motion lucide-react @anthropic-ai/sdk
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip
pnpm add class-variance-authority clsx tailwind-merge tailwindcss-animate

# Dev dependencies
pnpm add -D prisma tsx @types/node @types/react @types/react-dom
```

### 1.3 Directory Structure

Create the following structure. The implementation files are provided in the attached zip - copy them into place:

```
imagecrafter/
├── app/
│   ├── (dashboard)/              # Authenticated routes
│   │   ├── layout.tsx            # Dashboard sidebar layout
│   │   ├── generate/
│   │   │   └── page.tsx          # Main generation UI
│   │   ├── gallery/
│   │   │   └── page.tsx          # Image gallery
│   │   ├── projects/
│   │   │   └── page.tsx          # Project management
│   │   ├── history/
│   │   │   └── page.tsx          # Prompt history
│   │   └── settings/
│   │       └── page.tsx          # Account/billing settings
│   ├── (marketing)/              # Public routes
│   │   ├── layout.tsx            # Minimal layout
│   │   └── page.tsx              # Landing page
│   ├── api/
│   │   ├── images/
│   │   │   ├── generate/
│   │   │   │   └── route.ts      # POST - Generate single image
│   │   │   └── batch/
│   │   │       └── route.ts      # POST - Generate batch
│   │   └── webhooks/
│   │       ├── clerk/
│   │       │   └── route.ts      # Clerk user sync
│   │       └── stripe/
│   │           └── route.ts      # Stripe subscription sync
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx          # Clerk sign-in
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx          # Clerk sign-up
│   ├── globals.css
│   └── layout.tsx                # Root layout with ClerkProvider
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   └── services/
│       ├── prompt-enhancement.ts # Claude prompt enhancement
│       └── image-generation.ts   # Image gen + usage tracking
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Template seeding
├── .env.local                    # Environment variables (DO NOT COMMIT)
├── .env.example                  # Example env file
├── middleware.ts                 # Clerk auth middleware
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## PHASE 2: EXTERNAL SERVICE SETUP

### 2.1 Neon PostgreSQL Database

1. Go to https://console.neon.tech
2. Create new project: `imagecrafter-prod`
3. Copy the connection string (with `?sslmode=require`)
4. Save as `DATABASE_URL` in `.env.local`

### 2.2 Clerk Authentication

1. Go to https://dashboard.clerk.com
2. Create new application: `ImageCrafter`
3. Enable Email + Google sign-in methods
4. Get API keys from "API Keys" section:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. Configure URLs in Clerk Dashboard → Paths:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/generate`
   - After sign-up URL: `/generate`
6. Set up webhook:
   - Go to Webhooks → Add Endpoint
   - URL: `https://imagecrafter.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy signing secret as `CLERK_WEBHOOK_SECRET`

### 2.3 Stripe Billing

1. Go to https://dashboard.stripe.com
2. Create 3 products with monthly prices:

**Product 1: ImageCrafter Starter**
- Price: $9/month
- Description: "100 images per month, no watermark, 2K resolution"
- Copy price ID as `STRIPE_PRICE_STARTER`

**Product 2: ImageCrafter Pro**
- Price: $19/month
- Description: "500 images per month, Pro model, 4K, projects"
- Copy price ID as `STRIPE_PRICE_PRO`

**Product 3: ImageCrafter Team**
- Price: $49/month
- Description: "2,000 images per month, API access, multiple seats"
- Copy price ID as `STRIPE_PRICE_TEAM`

3. Get API keys:
   - `STRIPE_SECRET_KEY` (from Developers → API keys)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

4. Set up webhook:
   - Go to Developers → Webhooks → Add endpoint
   - URL: `https://imagecrafter.app/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy signing secret as `STRIPE_WEBHOOK_SECRET`

### 2.4 Anthropic API (for Prompt Enhancement)

1. Go to https://console.anthropic.com
2. Create API key
3. Save as `ANTHROPIC_API_KEY`

---

## PHASE 3: ENVIRONMENT CONFIGURATION

### 3.1 Create `.env.local`

```bash
# =============================================================================
# DATABASE (Neon PostgreSQL)
# =============================================================================
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/imagecrafter?sslmode=require"

# =============================================================================
# AUTHENTICATION (Clerk)
# =============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/generate"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/generate"

# =============================================================================
# PAYMENTS (Stripe)
# =============================================================================
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_TEAM="price_..."

# =============================================================================
# IMAGE GENERATION API (Existing Xenco Labs Service)
# =============================================================================
IMAGE_GEN_API_URL="https://image-gen.xencolabs.com"
IMAGE_GEN_API_KEY="xgen-img-7f3k9m2p4q8r5t1v6w0y"

# =============================================================================
# AI SERVICES (Anthropic)
# =============================================================================
ANTHROPIC_API_KEY="sk-ant-..."

# =============================================================================
# APPLICATION
# =============================================================================
NEXT_PUBLIC_APP_URL="https://imagecrafter.app"
```

### 3.2 Create `.env.example`

Copy the above but remove actual values, replacing with placeholders like `"your-value-here"`.

---

## PHASE 4: DATABASE SETUP

### 4.1 Generate Prisma Client

```bash
pnpm prisma generate
```

### 4.2 Push Schema to Database

```bash
pnpm prisma db push
```

### 4.3 Seed Templates

```bash
pnpm db:seed
```

This should output:
```
🌱 Seeding database...
  ✓ Blog Hero Image (5 presets)
  ✓ Social Media Pack (4 presets)
  ✓ Presentation Graphics (3 presets)
  ✓ Children's Book Illustration (3 presets)
  ✓ Storyboard Sequence (3 presets)
  ✓ Product Photography (3 presets)
  ✓ Profile & Headshot Backgrounds (3 presets)
  ✓ Infographic Elements (3 presets)

✅ Seeded 8 templates
```

### 4.4 Verify Database

```bash
pnpm prisma studio
```

Open http://localhost:5555 and verify:
- `Template` table has 8 records
- `TemplatePreset` table has 27 records

---

## PHASE 5: CLERK AUTH PAGES

### 5.1 Create Sign-In Page

Create `app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#06060a] flex items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0c0c12] border border-white/10",
            headerTitle: "text-white",
            headerSubtitle: "text-white/60",
            socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/5 border-white/10 text-white",
            footerActionLink: "text-violet-400 hover:text-violet-300",
          },
        }}
      />
    </div>
  );
}
```

### 5.2 Create Sign-Up Page

Create `app/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#06060a] flex items-center justify-center">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#0c0c12] border border-white/10",
            headerTitle: "text-white",
            headerSubtitle: "text-white/60",
            socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
            formFieldLabel: "text-white/70",
            formFieldInput: "bg-white/5 border-white/10 text-white",
            footerActionLink: "text-violet-400 hover:text-violet-300",
          },
        }}
      />
    </div>
  );
}
```

### 5.3 Create Middleware

Create `middleware.ts` in project root:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

## PHASE 6: ADDITIONAL API ROUTES

### 6.1 User Images List

Create `app/api/images/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const projectId = searchParams.get("projectId");

  const where = {
    userId,
    deletedAt: null,
    ...(projectId && { projectId }),
  };

  const [images, total] = await Promise.all([
    prisma.image.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        template: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.image.count({ where }),
  ]);

  return NextResponse.json({
    images,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
```

### 6.2 User Usage Stats

Create `app/api/usage/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return NextResponse.json({
      plan: "FREE",
      used: 0,
      limit: 5,
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return NextResponse.json({
    plan: subscription.plan,
    used: subscription.imagesUsedThisPeriod,
    limit: subscription.monthlyImageLimit,
    periodEnd: subscription.stripeCurrentPeriodEnd.toISOString(),
    features: {
      canUsePro: subscription.canUsePro,
      canUseBatch: subscription.canUseBatch,
      canUse4K: subscription.canUse4K,
      canUseProjects: subscription.canUseProjects,
    },
  });
}
```

### 6.3 Templates List

Create `app/api/templates/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      presets: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return NextResponse.json({ templates });
}
```

---

## PHASE 7: STRIPE CHECKOUT INTEGRATION

### 7.1 Create Checkout Session Route

Create `app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro: process.env.STRIPE_PRICE_PRO!,
  team: process.env.STRIPE_PRICE_TEAM!,
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await request.json();
  
  if (!PRICE_IDS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
    customer_email: user.emailAddresses[0]?.emailAddress,
    metadata: {
      userId,
    },
  });

  return NextResponse.json({ url: session.url });
}
```

---

## PHASE 8: DOCKER DEPLOYMENT

### 8.1 Create Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && pnpm prisma generate && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 8.2 Create docker-compose.yml

```yaml
version: "3.8"

services:
  imagecrafter:
    image: imagecrafter:latest
    build: .
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - CLERK_WEBHOOK_SECRET=${CLERK_WEBHOOK_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      - STRIPE_PRICE_STARTER=${STRIPE_PRICE_STARTER}
      - STRIPE_PRICE_PRO=${STRIPE_PRICE_PRO}
      - STRIPE_PRICE_TEAM=${STRIPE_PRICE_TEAM}
      - IMAGE_GEN_API_URL=${IMAGE_GEN_API_URL}
      - IMAGE_GEN_API_KEY=${IMAGE_GEN_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    networks:
      - traefik-public
    deploy:
      replicas: 2
      labels:
        - traefik.enable=true
        - traefik.http.routers.imagecrafter.rule=Host(`imagecrafter.app`)
        - traefik.http.routers.imagecrafter.entrypoints=websecure
        - traefik.http.routers.imagecrafter.tls.certresolver=letsencrypt
        - traefik.http.services.imagecrafter.loadbalancer.server.port=3000

networks:
  traefik-public:
    external: true
```

### 8.3 Update next.config.ts for Standalone Output

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image-gen.xencolabs.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
```

---

## PHASE 9: TESTING CHECKLIST

Before deploying, verify each component:

### 9.1 Authentication
- [ ] Can sign up with email
- [ ] Can sign in with email
- [ ] Can sign in with Google (if enabled)
- [ ] Unauthorized users redirected to sign-in
- [ ] User record created in database on signup

### 9.2 Image Generation
- [ ] Can select a template
- [ ] Can select a preset
- [ ] Can enter a prompt
- [ ] Image generates successfully
- [ ] Image appears in gallery
- [ ] Usage counter increments
- [ ] Free limit enforced (5 images)

### 9.3 Billing
- [ ] Can view current plan
- [ ] Can initiate checkout
- [ ] Webhook updates subscription on payment
- [ ] Usage resets on new billing period
- [ ] Plan features properly gated

### 9.4 Database
- [ ] All tables created
- [ ] Templates seeded
- [ ] Foreign keys working
- [ ] Cascade deletes working

---

## PHASE 10: DEPLOY TO PRODUCTION

### 10.1 Build and Push Docker Image

```bash
docker build -t imagecrafter:latest .
docker tag imagecrafter:latest registry.xencolabs.com/imagecrafter:latest
docker push registry.xencolabs.com/imagecrafter:latest
```

### 10.2 Deploy to Swarm

```bash
docker stack deploy -c docker-compose.yml imagecrafter
```

### 10.3 Verify Deployment

```bash
# Check service status
docker service ls | grep imagecrafter

# Check logs
docker service logs imagecrafter_imagecrafter

# Verify health
curl https://imagecrafter.app/api/health
```

### 10.4 Update Webhook URLs

After deployment, update webhook URLs in:
1. Clerk Dashboard → Webhooks
2. Stripe Dashboard → Webhooks

---

## TROUBLESHOOTING

### Database Connection Issues
```bash
# Test connection
pnpm prisma db pull

# If SSL issues, ensure ?sslmode=require in DATABASE_URL
```

### Clerk Webhook Not Working
- Verify signing secret matches
- Check webhook logs in Clerk Dashboard
- Ensure route is public in middleware

### Stripe Webhook Not Working
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Verify signing secret
- Check event types are subscribed

### Image Generation Failing
- Verify IMAGE_GEN_API_KEY is correct
- Check API health: `curl https://image-gen.xencolabs.com/health`
- Verify ANTHROPIC_API_KEY for prompt enhancement

---

## FILES PROVIDED

The following files are provided in the `imagecrafter.zip` archive:

```
✓ prisma/schema.prisma         - Complete database schema
✓ prisma/seed.ts               - Template seeding script
✓ lib/prisma.ts                - Prisma client singleton
✓ lib/services/prompt-enhancement.ts - Claude prompt service
✓ lib/services/image-generation.ts   - Image gen service
✓ app/layout.tsx               - Root layout with ClerkProvider
✓ app/globals.css              - Tailwind styles
✓ app/(marketing)/page.tsx     - Landing page
✓ app/(marketing)/layout.tsx   - Marketing layout
✓ app/(dashboard)/layout.tsx   - Dashboard sidebar layout
✓ app/(dashboard)/generate/page.tsx  - Generation UI
✓ app/(dashboard)/gallery/page.tsx   - Gallery UI
✓ app/(dashboard)/projects/page.tsx  - Projects UI
✓ app/(dashboard)/history/page.tsx   - History UI
✓ app/(dashboard)/settings/page.tsx  - Settings UI
✓ app/api/images/generate/route.ts   - Generate endpoint
✓ app/api/images/batch/route.ts      - Batch endpoint
✓ app/api/webhooks/clerk/route.ts    - Clerk webhook
✓ app/api/webhooks/stripe/route.ts   - Stripe webhook
✓ package.json                 - Dependencies
✓ tailwind.config.ts           - Tailwind config
✓ .env.example                 - Environment template
✓ README.md                    - Project readme
✓ ARCHITECTURE.md              - Full architecture doc
```

---

## SUCCESS CRITERIA

Implementation is complete when:

1. ✅ User can sign up and sign in
2. ✅ User can generate an image with a template
3. ✅ Image appears in gallery
4. ✅ Prompt appears in history
5. ✅ Usage counter shows correct count
6. ✅ Free tier limit (5 images) is enforced
7. ✅ Upgrade flow redirects to Stripe
8. ✅ Webhook updates subscription on payment
9. ✅ Pro users can access projects feature
10. ✅ All pages render without errors

---

## CONTACT

If you encounter issues not covered here, escalate to Xenophon with:
- Error message/stack trace
- Environment (local/production)
- Steps to reproduce
