<!--
Version: 2.1.0
Updated: 2025-10-11
-->

# Content Maestro - Enhanced Writing Review with Executive Summary

Run content-maestro-orchestrator writing workflows with automatic executive summary generation.

## Usage

```
/content-maestro-enhanced [writing task or content to review]
```

## What This Does

1. Invokes `content-maestro-orchestrator` for content generation/review
2. Generates multi-format outputs:
   - **Executive Summary** (1 page) - Content quality assessment
   - **Critical Edits List** (Top issues) - Must-fix before publishing
   - **TL;DR Guide** (2-3 pages) - SEO tips + writing improvements
   - **Quick Reference** (1 page) - Style guide, keywords, CTAs
   - **Full Content** - Complete article/review

## Instructions for Claude

### Step 1: Run Content Maestro Workflow

Use Task tool with `subagent_type: "content-maestro-orchestrator"`:

```
Please generate/review this content:

[User's writing task or content to review]

Focus Areas:
- SEO optimization (keywords, meta, structure)
- Readability and engagement
- Factual accuracy
- Brand voice consistency
- Call-to-action effectiveness
- Content structure and flow

Provide specific improvements with examples.
```

### Step 2: Generate Executive Summary

```markdown
# Content Review - Executive Summary

**Content Quality Score**: [X/10]
**SEO Readiness**: [Excellent/Good/Needs Work/Poor]
**Publish Ready**: [Yes/No - with conditions]

## Critical Issues Found: [Number]
1. **[Issue]** - [e.g., Missing target keywords]
2. **[Issue]** - [e.g., No clear CTA]
3. **[Issue]** - [e.g., Readability too complex]

## Content Strengths:
- [What works well 1]
- [What works well 2]
- [What works well 3]

## SEO Metrics:
- Primary Keyword: [keyword] - Density: [X]%
- Readability: Flesch Score [X]
- Word Count: [X] words (Target: [Y])
- Meta Description: [Present/Missing]

## Next Steps:
1. [Add target keywords to H2 headings]
2. [Simplify paragraph 3 for readability]
3. [Add CTA after section 2]
```

### Step 3: Critical Edits Checklist

```markdown
# ✍️ CRITICAL EDITS (Before Publishing)

## P0 - Must Fix (Blocks Publishing)
- [ ] **Missing Primary Keyword**
  - Current: [Text without keyword]
  - Fixed: [Text with keyword naturally integrated]
  - Impact: SEO ranking will suffer
  - Time: 5 min

- [ ] **No Call-to-Action**
  - Add: "[CTA example text]"
  - Placement: After section [X]
  - Impact: Zero conversions without CTA
  - Time: 3 min

## P1 - High Priority (Fix Within 24h)
- [ ] **Readability Issues in Paragraph 2**
  - Current: [Complex sentence]
  - Simplified: [Clearer version]
  - Impact: Bounce rate increase
  - Time: 10 min

[Total time to fix all: X minutes]
```

### Step 4: TL;DR Writing Guide

```markdown
# Writing Improvement Guide

## What Was Reviewed
[Brief description of content]

## SEO Optimization Needed

### Issue 1: Keyword Density
**Current:** Primary keyword "[keyword]" appears 2 times (0.5%)
**Target:** 8-12 times (2-3%)
**Fix:** Add keyword to:
- H2 heading in section 2
- First sentence of introduction
- Image alt text
- Meta description

### Issue 2: Heading Structure
**Current:**
```
H1: [Title]
H3: [Subheading]
```
**Fixed:**
```
H1: [Title with keyword]
H2: [Main section 1]
H3: [Subsection]
H2: [Main section 2]
```

## Readability Improvements

### Simplify Complex Sentences
**Before:**
> [Long, complex sentence example]

**After:**
> [Shorter, clearer version]

### Add Transition Words
- [Paragraph X]: Add "However" to start
- [Paragraph Y]: Add "In addition" to connect ideas

## CTA Placement
**Recommended CTAs:**
1. After introduction: "Learn more about [topic]"
2. Mid-content (after section 2): "Download our free guide"
3. End of article: "Start your free trial today"

## Publishing Checklist
- [ ] Primary keyword in title
- [ ] Meta description (150-160 chars)
- [ ] At least 3 H2 headings
- [ ] Featured image with alt text
- [ ] Internal links (3-5)
- [ ] External authoritative links (2-3)
- [ ] CTA present
```

### Step 5: Quick Reference

```markdown
# Content Quick Reference

## Target Keywords (Use These)
- Primary: "[keyword]" (8-12 mentions)
- Secondary: "[keyword 2]", "[keyword 3]" (3-5 mentions each)
- LSI: "[related term 1]", "[related term 2]"

## Readability Targets
- Flesch Reading Ease: 60-70 (8th-9th grade)
- Average Sentence Length: < 20 words
- Paragraph Length: < 150 words

## SEO Checklist
- [ ] Title: 50-60 characters
- [ ] Meta: 150-160 characters
- [ ] URL slug: lowercase, hyphens, keyword
- [ ] Image alt text: descriptive + keyword
- [ ] First paragraph: keyword within first 100 words

## Brand Voice Guidelines
- Tone: [Professional/Casual/etc.]
- Avoid: [Jargon, passive voice, etc.]
- Use: [Active voice, examples, data]

## Common CTAs
- Newsletter: "Subscribe for weekly tips"
- Product: "Start your free 14-day trial"
- Content: "Download the complete guide"
```

### Step 6: Present All Formats

Deliver in priority order:
1. Executive Summary (content quality + SEO score)
2. Critical Edits Checklist
3. TL;DR Writing Guide (SEO + readability)
4. Quick Reference Card (keywords, style, CTAs)
5. Full content/review

## Example

```
User: /content-maestro-enhanced Write an article about "best project management tools for startups"

[Runs content-maestro-orchestrator]
[Generates article + all summary formats]
[Presents multi-format output with improvement checklist]
```

## Notes

- Works for content generation AND content review
- SEO metrics are quantified (keyword density, readability scores)
- Before/after examples show exact improvements
- CTAs are specific to content context
- Quick reference maintains brand consistency
