# ImageCrafter Credit System Update

## Overview

This update changes the pricing model from "X images per month" to a **credit-based system** where different resolutions cost different amounts of credits. This protects margins while giving users flexibility.

---

## The New Pricing Model

### Credit Costs by Resolution

| Resolution | Dimensions | Credits | Your Cost |
|------------|------------|---------|-----------|
| 1K (Standard) | 1024×1024 | 1 credit | ~$0.01 |
| 2K (HD) | 2048×2048 | 2 credits | ~$0.02-0.03 |
| 4K (Ultra) | 4096×4096 | 5 credits | ~$0.05 |

### Plan Limits

| Plan | Price | Credits/Month | Max Resolution | Your Max Cost | Profit |
|------|-------|---------------|----------------|---------------|--------|
| Free | $0 | 10 | 1K only | $0.10 | — |
| Starter | $9 | 150 | 2K | $3.00 | $6.00 |
| Pro | $19 | 400 | 4K | $8.00 | $11.00 |
| Team | $49 | 1,200 | 4K | $24.00 | $25.00 |

**Worst case** (all 4K at Pro/Team): Still profitable because 4K costs 5 credits, limiting volume.

---

## Files to Update

### CRITICAL: Database Migration Required

You'll need to run a migration after updating the schema. The subscription model changed significantly.

```bash
npx prisma migrate dev --name add-credit-system
```

### Files List

#### Replace These Files:

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | New credit-based subscription model |
| `lib/services/image-generation.ts` | Credit deduction, resolution checks |
| `app/(dashboard)/generate/page.tsx` | Credit display, resolution selector, fixed download |
| `app/api/images/generate/route.ts` | May need updates to match new service |

#### Add These New Files:

| File | Purpose |
|------|---------|
| `lib/plans.ts` | Central plan configuration |
| `app/api/images/download/route.ts` | Proxy for image downloads (fixes CORS) |
| `app/api/usage/route.ts` | Get user's credit status |
| `components/pricing-section.tsx` | Updated pricing display |

---

## Step-by-Step Integration

### Step 1: Backup Database
```bash
# Export current data if needed
pg_dump $DATABASE_URL > backup.sql
```

### Step 2: Copy New Files

```bash
# From the extracted update folder:

# New files
cp lib/plans.ts /path/to/project/lib/
cp app/api/images/download/route.ts /path/to/project/app/api/images/download/
cp app/api/usage/route.ts /path/to/project/app/api/usage/
cp components/pricing-section.tsx /path/to/project/components/

# Updated files (careful - these replace existing)
cp prisma/schema.prisma /path/to/project/prisma/
cp lib/services/image-generation.ts /path/to/project/lib/services/
cp app/\(dashboard\)/generate/page.tsx /path/to/project/app/\(dashboard\)/generate/
```

### Step 3: Run Database Migration

```bash
cd /path/to/project
npx prisma migrate dev --name add-credit-system
```

If you get conflicts, you may need to reset:
```bash
npx prisma migrate reset  # WARNING: This deletes data
```

For production, generate a migration and apply it:
```bash
npx prisma migrate deploy
```

### Step 4: Seed Default Subscriptions

Existing users need subscriptions created. You can add this to your seed file or run manually:

```sql
-- Create FREE subscriptions for users without one
INSERT INTO "Subscription" ("id", "userId", "plan", "creditsLimit", "creditsUsed", "creditsResetAt", "maxResolution", "hasWatermark", "hasProjects", "hasBatchMode", "hasApiAccess", "hasPriorityQueue", "status", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  u."id",
  'FREE',
  10,
  0,
  date_trunc('month', now()) + interval '1 month',
  '1K',
  true,
  false,
  false,
  false,
  false,
  'active',
  now(),
  now()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."userId" = u."id"
);
```

### Step 5: Update Stripe Products

In Stripe Dashboard, update your product descriptions:

- **Starter ($9/month)**: "150 credits/month, up to 2K resolution"
- **Pro ($19/month)**: "400 credits/month, up to 4K resolution, projects"
- **Team ($49/month)**: "1,200 credits/month, API access"

### Step 6: Update Landing Page Pricing

The landing page needs to display the new credit-based pricing. Either:

1. Import and use the new `<PricingSection />` component, or
2. Update the existing pricing section to show credits instead of image counts

### Step 7: Test the Download Button

After deployment, verify:

1. Go to `/generate`
2. Create an image
3. Click Download button
4. Verify the image downloads with filename `imagecrafter-{id}.png`

The download now uses `/api/images/download` which proxies the request to avoid CORS issues.

### Step 8: Rebuild and Deploy

```bash
npm run build
# or
docker build -t imagecrafter:latest .
docker stack deploy -c docker-compose.yml imagecrafter
```

---

## Verification Checklist

After deployment, verify:

- [ ] `/api/usage` returns credit data
- [ ] Generate page shows credit cost per resolution
- [ ] Users can only select resolutions available to their plan
- [ ] Credits deduct correctly after generation
- [ ] Download button works (no CORS errors)
- [ ] Pricing section shows credits, not image counts
- [ ] Free users see watermark on images
- [ ] Pro users can access Projects

---

## About the Projects Feature

**Question from Xenophon:** "Do we need to have that built in your original package, or is it just a placeholder?"

**Answer:** The Projects page (`/projects`) is a **functional UI** with:
- Project creation modal
- Character management interface
- Pro-plan gating

However, the **backend integration** for character consistency (injecting character descriptions into prompts) requires:

1. The `CharacterProfile` table (included in schema)
2. Integration in the image generation service to prepend character descriptions
3. Claude Vision API call to analyze reference images and extract descriptions

The UI is built. The database schema supports it. The generation service has placeholders for `projectId` and `characterId`. But the actual "character anchor" functionality (upload image → Claude extracts description → inject into future prompts) is **not fully implemented**.

**To complete Projects:**
1. Add API route `/api/projects` for CRUD operations
2. Add API route `/api/characters` for character management
3. Add endpoint to analyze uploaded image with Claude Vision
4. Modify generation to prepend character description when `characterId` is provided

Let me know if you want me to build out the full Projects backend.

---

## Schema Changes Summary

### Subscription Model - Before vs After

| Field | Before | After |
|-------|--------|-------|
| `imagesLimit` | ✓ | ✗ (removed) |
| `imagesUsed` | ✓ | ✗ (removed) |
| `creditsLimit` | ✗ | ✓ (new) |
| `creditsUsed` | ✗ | ✓ (new) |
| `creditsResetAt` | ✗ | ✓ (new) |
| `maxResolution` | ✗ | ✓ (new) |
| `hasProjects` | ✗ | ✓ (new feature flag) |
| `hasBatchMode` | ✗ | ✓ (new feature flag) |
| `hasApiAccess` | ✗ | ✓ (new feature flag) |
| `hasPriorityQueue` | ✗ | ✓ (new feature flag) |

### Image Model - New Fields

| Field | Purpose |
|-------|---------|
| `creditsCost` | How many credits this image cost |
| `resolution` | "1K", "2K", or "4K" |

### UsageRecord Model - Updated

| Field | Purpose |
|-------|---------|
| `creditsUsed` | Credits consumed (was binary before) |
| `resolution` | Resolution used |
| `estimatedCost` | Your actual API cost (for analytics) |

---

## Questions?

If anything is unclear about the credit system migration, ask before making changes. The key files that MUST be updated together are:

1. `prisma/schema.prisma`
2. `lib/plans.ts`
3. `lib/services/image-generation.ts`

These three files define the credit system. Everything else (UI, API routes) depends on them.
