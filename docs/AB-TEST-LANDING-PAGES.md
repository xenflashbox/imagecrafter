# ImageCrafter Landing Page A/B Test

## Overview

This document describes the two landing page variants being tested for ImageCrafter. Both pages target the same audience (content creators, small business owners, self-publishing authors) but use different emotional hooks.

---

## Variant A: "Prompt Frustration"

**URL**: `/?variant=a` or `/landing-a`

### Psychological Hook
Taps into the frustration of spending hours on prompt engineering with poor results. Targets users who feel stupid or inadequate because they can't make AI tools work.

### Key Messages
- "You describe exactly what you want. The AI gives you garbage."
- Hours wasted on trial and error
- Prompts that work once, then never again
- Paying for tools that are too complex

### Emotional Triggers
- Frustration
- Wasted time
- Feeling incompetent
- Money wasted on confusing tools

### Value Proposition
"We handle the complex prompts, you just describe what you want in plain English."

### Visual Style
- Red accent colors (frustration/pain)
- Transitions to violet (relief/solution)
- Pain → Solution narrative arc

### CTA Focus
- "Start Creating for Free"
- Emphasizes simplicity and immediate relief

---

## Variant B: "Generic AI Look"

**URL**: `/?variant=b` or `/landing-b`

### Psychological Hook
Taps into embarrassment about publishing obviously AI-generated images. Targets users who care about professional appearance and brand credibility.

### Key Messages
- "Your AI images look... AI-generated."
- Weird anatomy, plastic skin, generic compositions
- Your audience can tell
- It's costing you credibility

### Emotional Triggers
- Embarrassment
- Unprofessionalism
- Loss of trust/credibility
- Looking cheap/amateur

### Value Proposition
"Professional-quality images that look intentionally designed, not obviously generated."

### Visual Style
- Amber/orange accent colors (warning/premium)
- Side-by-side comparisons
- Quality/credibility focus

### CTA Focus
- "Create Professional Images"
- Emphasizes quality and credibility

---

## Hypothesis

### Variant A Hypothesis
Users who have tried AI image tools before and struggled with prompts will resonate with the "frustration" angle. This variant may perform better with:
- Technical users frustrated by complexity
- Users who have tried Midjourney/DALL-E
- Time-constrained creators

### Variant B Hypothesis
Users who care about brand perception and professional appearance will resonate with the "credibility" angle. This variant may perform better with:
- Business owners
- Course creators
- Anyone selling services/products
- Users embarrassed by current AI image quality

---

## Testing URLs

| Purpose | URL |
|---------|-----|
| Random assignment (production) | `imagecrafter.app` |
| Force Variant A | `imagecrafter.app/?variant=a` |
| Force Variant B | `imagecrafter.app/?variant=b` |
| Direct Variant A | `imagecrafter.app/landing-a` |
| Direct Variant B | `imagecrafter.app/landing-b` |

---

## Metrics to Track

### Primary Metrics (Conversion)
1. **Sign-up Rate**: % of visitors who create an account
2. **Email Capture Rate**: % who enter email (even if don't complete signup)
3. **Bounce Rate**: % who leave without scrolling

### Secondary Metrics (Engagement)
1. **Scroll Depth**: How far down the page users scroll
2. **Time on Page**: Average time spent
3. **CTA Clicks**: Which CTAs get the most clicks
4. **Section Engagement**: Which sections users interact with

### Tertiary Metrics (Quality)
1. **Trial-to-Paid Conversion**: Do sign-ups from each variant convert differently?
2. **First Image Generated**: Do users from each variant actually use the product?
3. **Churn Rate**: Do users from each variant retain differently?

---

## Analytics Implementation

### localStorage Key
The assigned variant is stored in `imagecrafter_ab_variant` with value `"a"` or `"b"`.

### Include in Events
Add the variant to all tracked events:

```javascript
// When tracking sign-up
analytics.track('signup_completed', {
  ab_variant: localStorage.getItem('imagecrafter_ab_variant'),
  ...otherProps
});

// When tracking conversion
analytics.track('subscription_started', {
  ab_variant: localStorage.getItem('imagecrafter_ab_variant'),
  plan: 'starter',
  ...otherProps
});
```

### PostHog Integration
```javascript
// In your analytics setup
if (typeof window !== 'undefined' && window.posthog) {
  const variant = localStorage.getItem('imagecrafter_ab_variant');
  if (variant) {
    window.posthog.people.set({ ab_landing_variant: variant });
  }
}
```

### Google Analytics Integration
```javascript
// Set user property for cohort analysis
gtag('set', 'user_properties', {
  ab_landing_variant: localStorage.getItem('imagecrafter_ab_variant')
});
```

---

## Running the Test

### Duration
Run for minimum 2 weeks or until statistical significance is reached (95% confidence).

### Sample Size
Aim for at least 1,000 visitors per variant before making decisions.

### Avoiding Contamination
- Variant assignment persists in localStorage
- Users always see the same variant on return visits
- Forced variants (?variant=a/b) are tracked separately

---

## Decision Framework

### If Variant A Wins
- Double down on "simplicity" and "no prompt engineering" messaging
- Consider testing more specific frustrations (Midjourney complexity, DALL-E inconsistency)
- May indicate users are more problem-aware than we thought

### If Variant B Wins
- Double down on "professional quality" and "credibility" messaging
- Consider adding more visual comparisons
- May indicate users care more about output quality than input simplicity

### If No Clear Winner
- Test may need more time/traffic
- Consider combining best elements from both
- May need to segment by traffic source

---

## Post-Test Actions

1. **Document results** in this file with actual numbers
2. **Keep losing variant** for future testing (don't delete)
3. **Implement winner** as default landing page
4. **Plan next test** based on learnings

---

## Results (To Be Filled)

| Metric | Variant A | Variant B | Winner |
|--------|-----------|-----------|--------|
| Sign-up Rate | TBD | TBD | TBD |
| Bounce Rate | TBD | TBD | TBD |
| Avg Time on Page | TBD | TBD | TBD |
| Trial → Paid | TBD | TBD | TBD |

**Test Start Date**: ____________  
**Test End Date**: ____________  
**Total Visitors**: ____________  
**Statistical Significance**: ____________  
**Winner**: ____________  
**Decision**: ____________
