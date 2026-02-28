"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, X, Zap, Crown, Star } from "lucide-react";

/**
 * Pricing Section Component
 * 
 * Displays the credit-based pricing tiers.
 * Use this in landing pages and settings page.
 */

// =============================================================================
// PRICING DATA
// =============================================================================

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    credits: "10",
    creditsLabel: "credits/month",
    description: "Try it out",
    highlighted: false,
    cta: "Get Started",
    ctaHref: "/sign-up",
    features: [
      { text: "10 credits per month", included: true },
      { text: "1K resolution (1 credit each)", included: true },
      { text: "Basic templates", included: true },
      { text: "Watermarked images", included: true, note: true },
    ],
    limitations: [
      "No batch generation",
      "No projects",
      "No 2K or 4K resolution",
    ],
  },
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    credits: "150",
    creditsLabel: "credits/month",
    description: "For regular creators",
    highlighted: false,
    cta: "Start Free Trial",
    ctaHref: "/sign-up?plan=starter",
    features: [
      { text: "150 credits per month", included: true },
      { text: "Up to 2K resolution", included: true },
      { text: "1K = 1 credit, 2K = 2 credits", included: true },
      { text: "No watermark", included: true },
      { text: "Batch mode (up to 4)", included: true },
      { text: "All templates", included: true },
    ],
    limitations: [
      "No projects",
      "No 4K resolution",
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    credits: "400",
    creditsLabel: "credits/month",
    description: "For power users",
    highlighted: true,
    badge: "Most Popular",
    cta: "Start Free Trial",
    ctaHref: "/sign-up?plan=pro",
    features: [
      { text: "400 credits per month", included: true },
      { text: "Up to 4K resolution", included: true },
      { text: "1K = 1, 2K = 2, 4K = 5 credits", included: true },
      { text: "No watermark", included: true },
      { text: "Batch mode (up to 10)", included: true },
      { text: "Projects & character consistency", included: true },
      { text: "Priority generation queue", included: true },
    ],
    limitations: [],
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    credits: "1,200",
    creditsLabel: "credits/month",
    description: "For teams & agencies",
    highlighted: false,
    cta: "Contact Sales",
    ctaHref: "/contact",
    features: [
      { text: "1,200 credits per month", included: true },
      { text: "Everything in Pro", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
    ],
    limitations: [],
  },
];

// =============================================================================
// CREDIT EXPLAINER
// =============================================================================

function CreditExplainer() {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-violet-400" />
        <h3 className="font-medium">How Credits Work</h3>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-white/5 rounded-xl">
          <div className="text-2xl font-bold text-white mb-1">1</div>
          <div className="text-sm text-white/70">credit</div>
          <div className="text-xs text-white/40 mt-2">1K Standard</div>
          <div className="text-xs text-white/40">1024×1024</div>
        </div>
        <div className="text-center p-4 bg-white/5 rounded-xl">
          <div className="text-2xl font-bold text-white mb-1">2</div>
          <div className="text-sm text-white/70">credits</div>
          <div className="text-xs text-white/40 mt-2">2K HD</div>
          <div className="text-xs text-white/40">2048×2048</div>
        </div>
        <div className="text-center p-4 bg-violet-500/20 rounded-xl border border-violet-500/30">
          <div className="text-2xl font-bold text-violet-300 mb-1">5</div>
          <div className="text-sm text-white/70">credits</div>
          <div className="text-xs text-white/40 mt-2">4K Ultra</div>
          <div className="text-xs text-white/40">4096×4096</div>
        </div>
      </div>
      <p className="text-sm text-white/50 mt-4 text-center">
        Use fewer credits for quick drafts, or spend more for print-ready quality.
      </p>
    </div>
  );
}

// =============================================================================
// PRICING CARD
// =============================================================================

interface PlanCardProps {
  plan: (typeof PLANS)[number];
  index: number;
}

function PlanCard({ plan, index }: PlanCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`relative rounded-2xl p-6 ${
        plan.highlighted
          ? "bg-gradient-to-b from-violet-600/20 to-fuchsia-600/10 border-2 border-violet-500/50"
          : "bg-white/5 border border-white/10"
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full text-xs font-medium">
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
        <p className="text-sm text-white/50">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-2">
        <span className="text-4xl font-light">{plan.price}</span>
        <span className="text-white/50 text-sm">{plan.period}</span>
      </div>

      {/* Credits */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm">
          <Zap className="w-3 h-3" />
          {plan.credits} {plan.creditsLabel}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className={`block w-full py-3 rounded-xl text-center font-medium transition-all mb-6 ${
          plan.highlighted
            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            : "bg-white/10 hover:bg-white/20"
        }`}
      >
        {plan.cta}
      </Link>

      {/* Features */}
      <ul className="space-y-3">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <span className={"note" in feature && feature.note ? "text-white/50" : "text-white/80"}>
              {feature.text}
            </span>
          </li>
        ))}
        {plan.limitations.map((limitation, i) => (
          <li key={`limit-${i}`} className="flex items-start gap-2 text-sm text-white/40">
            <X className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />
            {limitation}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PricingSection() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, credit-based pricing</h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Pay for what you use. Use fewer credits for quick drafts, 
            or spend more for print-ready 4K quality.
          </p>
        </div>

        {/* Credit Explainer */}
        <div className="max-w-2xl mx-auto">
          <CreditExplainer />
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, index) => (
            <PlanCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* FAQ hint */}
        <div className="text-center mt-12">
          <p className="text-sm text-white/40">
            All plans include prompt enhancement and all templates.
            <br />
            Credits reset monthly. Unused credits don't roll over.
          </p>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
