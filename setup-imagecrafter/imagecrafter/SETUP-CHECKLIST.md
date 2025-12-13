# ImageCrafter Setup Checklist

Quick reference for implementation. See `IMPLEMENTATION-GUIDE.md` for full details.

---

## Pre-Implementation

- [ ] Download `imagecrafter.zip` and extract all files
- [ ] Create GitHub repo: `xenco-labs/imagecrafter`

---

## External Services Setup

### Neon Database
- [ ] Create project at console.neon.tech
- [ ] Copy connection string → `DATABASE_URL`

### Clerk Auth
- [ ] Create app at dashboard.clerk.com
- [ ] Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Copy `CLERK_SECRET_KEY`
- [ ] Configure sign-in/sign-up URLs
- [ ] Create webhook → `https://imagecrafter.app/api/webhooks/clerk`
- [ ] Copy webhook secret → `CLERK_WEBHOOK_SECRET`

### Stripe Billing
- [ ] Create 3 products (Starter $9, Pro $19, Team $49)
- [ ] Copy price IDs → `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`
- [ ] Copy `STRIPE_SECRET_KEY`
- [ ] Copy `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Create webhook → `https://imagecrafter.app/api/webhooks/stripe`
- [ ] Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

### Anthropic
- [ ] Create API key at console.anthropic.com
- [ ] Copy → `ANTHROPIC_API_KEY`

---

## Environment Variables

Create `.env.local` with:

```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_PRICE_STARTER="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_TEAM="price_..."
IMAGE_GEN_API_URL="https://image-gen.xencolabs.com"
IMAGE_GEN_API_KEY="xgen-img-7f3k9m2p4q8r5t1v6w0y"
ANTHROPIC_API_KEY="sk-ant-..."
NEXT_PUBLIC_APP_URL="https://imagecrafter.app"
```

---

## Installation Commands

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Push schema to database
pnpm prisma db push

# Seed templates
pnpm db:seed

# Run dev server
pnpm dev
```

---

## Verification

- [ ] Visit http://localhost:3000 - Landing page loads
- [ ] Click "Get Started" - Redirects to Clerk sign-up
- [ ] Sign up - User created in database
- [ ] Visit /generate - Template selector loads
- [ ] Generate an image - Image appears
- [ ] Visit /gallery - Image listed
- [ ] Visit /settings - Usage shows 1/5

---

## Deployment

```bash
# Build Docker image
docker build -t imagecrafter:latest .

# Deploy to swarm
docker stack deploy -c docker-compose.yml imagecrafter

# Update webhooks with production URL
```

---

## Key Files to Create (Not in ZIP)

1. `middleware.ts` - Clerk route protection
2. `app/sign-in/[[...sign-in]]/page.tsx` - Clerk sign-in
3. `app/sign-up/[[...sign-up]]/page.tsx` - Clerk sign-up
4. `app/api/checkout/route.ts` - Stripe checkout
5. `app/api/images/route.ts` - List user images
6. `app/api/usage/route.ts` - Usage stats
7. `app/api/templates/route.ts` - List templates
8. `Dockerfile` - Production build
9. `docker-compose.yml` - Swarm deployment
10. `next.config.ts` - Standalone output config
