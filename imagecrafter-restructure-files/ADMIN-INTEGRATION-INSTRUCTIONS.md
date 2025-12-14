# ImageCrafter Update Integration Guide

## Overview

This zip contains both the original codebase AND new additions. Since you've already deployed and configured the original files, you need to **selectively add only the new files** without overwriting your existing configuration.

---

## CRITICAL: Files to NOT Overwrite

These files exist in the zip but you've likely already configured them. **DO NOT replace these:**

| File | Reason |
|------|--------|
| `prisma/schema.prisma` | You may have run migrations |
| `prisma/seed.ts` | You may have customized seed data |
| `.env.example` | Reference only - check for new variables below |
| `package.json` | You may have added dependencies |
| `tailwind.config.ts` | You may have customized |
| `app/globals.css` | You may have customized |
| `app/(dashboard)/layout.tsx` | Already deployed |
| `app/(marketing)/layout.tsx` | Already deployed |

---

## NEW Files to Add

Copy these files/folders into your project. These are **brand new** and won't conflict:

### 1. SEO Files (Add to `app/`)
```
app/sitemap.ts          ← NEW: Generates /sitemap.xml
app/robots.ts           ← NEW: Generates /robots.txt (allows crawling)
```

### 2. A/B Landing Pages (Add to `app/(marketing)/`)
```
app/(marketing)/landing-a/page.tsx    ← NEW: Variant A "Prompt Frustration"
app/(marketing)/landing-b/page.tsx    ← NEW: Variant B "Generic AI Look"
```

### 3. Blog Integration (Add entire folder to `app/`)
```
app/blog/                             ← NEW FOLDER
app/blog/page.tsx                     ← Blog listing page
app/blog/[slug]/page.tsx              ← Individual blog post page
```

### 4. User Dashboard (Add to `app/(dashboard)/`)
```
app/(dashboard)/dashboard/page.tsx    ← NEW: Main user dashboard
```

### 5. Components (Create folder if doesn't exist)
```
components/reviews.tsx                ← NEW: Review system components
```

### 6. Payload CMS Integration (Add to `lib/`)
```
lib/payload.ts                        ← NEW: Payload CMS client for blog
```

### 7. PWA Manifest (Add to `public/`)
```
public/site.webmanifest               ← NEW: PWA manifest file
```

### 8. Documentation (Add to `docs/`)
```
docs/AB-TEST-LANDING-PAGES.md         ← NEW: A/B test documentation
```

---

## Files to MERGE (Careful Review Required)

### `app/layout.tsx` - IMPORTANT

The new version includes:
- Google Analytics integration
- Full SEO metadata
- Structured data (JSON-LD)
- Preconnect headers

**Option A (Recommended):** Replace your existing `app/layout.tsx` with the new one, then re-add any customizations you made.

**Option B:** Manually merge these additions into your existing file:

1. Add the `Script` import:
```tsx
import Script from "next/script";
```

2. Add the full `metadata` export (lines 18-95 in new file)

3. Add the `viewport` export

4. Add the `structuredData` object

5. Add Google Analytics scripts before closing `</body>` tag

6. Add the structured data `<script>` in `<head>`

### `app/(marketing)/page.tsx` - REPLACE

The new version is the A/B test router. It replaces the original landing page and randomly serves Variant A or B.

**Action:** Replace `app/(marketing)/page.tsx` with the new version.

The original landing page content is preserved in the individual variant files.

---

## New Environment Variables

Add these to your `.env` file:

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"

# Google Search Console verification (optional)
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION="your-verification-code"

# Payload CMS for Blog (if using blog feature)
PAYLOAD_CMS_URL="https://cms.xencolabs.com"
PAYLOAD_API_KEY="your-payload-api-key"
```

---

## Step-by-Step Integration

### Step 1: Backup Current Deployment
```bash
cp -r /path/to/imagecrafter /path/to/imagecrafter-backup
```

### Step 2: Extract Zip to Temporary Location
```bash
unzip imagecrafter.zip -d /tmp/imagecrafter-update
```

### Step 3: Copy New Files Only

```bash
# Navigate to your project
cd /path/to/your/imagecrafter

# SEO files
cp /tmp/imagecrafter-update/imagecrafter/app/sitemap.ts ./app/
cp /tmp/imagecrafter-update/imagecrafter/app/robots.ts ./app/

# A/B Landing pages
mkdir -p ./app/\(marketing\)/landing-a
mkdir -p ./app/\(marketing\)/landing-b
cp /tmp/imagecrafter-update/imagecrafter/app/\(marketing\)/landing-a/page.tsx ./app/\(marketing\)/landing-a/
cp /tmp/imagecrafter-update/imagecrafter/app/\(marketing\)/landing-b/page.tsx ./app/\(marketing\)/landing-b/

# Replace main marketing page with A/B router
cp /tmp/imagecrafter-update/imagecrafter/app/\(marketing\)/page.tsx ./app/\(marketing\)/

# Blog
mkdir -p ./app/blog/\[slug\]
cp /tmp/imagecrafter-update/imagecrafter/app/blog/page.tsx ./app/blog/
cp /tmp/imagecrafter-update/imagecrafter/app/blog/\[slug\]/page.tsx ./app/blog/\[slug\]/

# Dashboard
mkdir -p ./app/\(dashboard\)/dashboard
cp /tmp/imagecrafter-update/imagecrafter/app/\(dashboard\)/dashboard/page.tsx ./app/\(dashboard\)/dashboard/

# Components
mkdir -p ./components
cp /tmp/imagecrafter-update/imagecrafter/components/reviews.tsx ./components/

# Lib
cp /tmp/imagecrafter-update/imagecrafter/lib/payload.ts ./lib/

# Public
cp /tmp/imagecrafter-update/imagecrafter/public/site.webmanifest ./public/

# Docs
mkdir -p ./docs
cp /tmp/imagecrafter-update/imagecrafter/docs/AB-TEST-LANDING-PAGES.md ./docs/
```

### Step 4: Update Layout (Manual Merge or Replace)

Review the new `app/layout.tsx` and either:
- Replace yours and re-add customizations, OR
- Manually add the GA scripts and metadata

### Step 5: Add Environment Variables

Edit your `.env` file and add the new variables listed above.

### Step 6: Install Any New Dependencies (if needed)

The new files don't require additional dependencies beyond what's already in package.json.

### Step 7: Rebuild and Deploy

```bash
# If using Docker
docker build -t imagecrafter:latest .
docker stack deploy -c docker-compose.yml imagecrafter

# Or if running directly
npm run build
npm run start
```

### Step 8: Verify Deployment

Test these URLs after deployment:

| URL | Expected Result |
|-----|-----------------|
| `imagecrafter.app` | A/B landing page (random variant) |
| `imagecrafter.app/?variant=a` | Variant A (Prompt Frustration) |
| `imagecrafter.app/?variant=b` | Variant B (Generic AI Look) |
| `imagecrafter.app/sitemap.xml` | XML sitemap |
| `imagecrafter.app/robots.txt` | Robots file with `Allow: /` |
| `imagecrafter.app/dashboard` | User dashboard (requires auth) |
| `imagecrafter.app/blog` | Blog listing (may be empty if Payload not configured) |

---

## File Count Summary

| Category | Count | Action |
|----------|-------|--------|
| New files to add | 11 | Copy directly |
| Files to replace | 1 | `app/(marketing)/page.tsx` |
| Files to merge | 1 | `app/layout.tsx` |
| Files to ignore | ~20 | Already deployed |

---

## Troubleshooting

**Build fails after adding files:**
- Check for TypeScript errors in new files
- Ensure all imports resolve correctly
- Verify `components/` folder exists

**A/B test not working:**
- Check browser console for errors
- Verify both landing-a and landing-b folders exist
- Clear localStorage: `localStorage.removeItem('imagecrafter_ab_variant')`

**Blog returns 500 error:**
- Payload CMS may not be configured
- Check `PAYLOAD_CMS_URL` environment variable
- Blog will work once Payload is connected

**Google Analytics not tracking:**
- Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set
- Check browser console for gtag errors
- GA data takes 24-48 hours to appear

---

## Questions?

If anything is unclear, ask before making changes. The key principle is: **add new files, don't overwrite configured ones**.
