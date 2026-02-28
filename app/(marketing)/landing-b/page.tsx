"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  X,
  Check,
  Zap,
  Eye,
  EyeOff,
  Palette,
  Target,
  Layers,
  Star,
  AlertTriangle,
  TrendingUp,
  Users,
  Award,
} from "lucide-react";

/**
 * LANDING PAGE VARIANT B
 * 
 * Hook: "The Generic AI Look Problem"
 * Primary Pain Point: Images look obviously AI-generated, hurting credibility
 * Emotional Trigger: Embarrassment, unprofessionalism, losing trust
 * Solution Angle: Professional-quality images that don't scream "I used AI"
 */

export default function LandingPageVariantB() {
  const [email, setEmail] = useState("");
  const [showComparison, setShowComparison] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Elegant gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[180px]" />
      </div>

      {/* Minimal Nav */}
      <nav className="relative z-50 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span className="font-semibold">ImageCrafter</span>
        </div>
        <Link
          href="/sign-in"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section - The Cringe Hook */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-16 text-center">
        {/* Warning Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-300">Your audience can tell</span>
        </motion.div>

        {/* Main Hook - The Cringe */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold leading-[1.1] mb-6"
        >
          <span className="text-white/90">Your AI images look...</span>
          <br />
          <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            AI-generated.
          </span>
        </motion.h1>

        {/* The Cringe Agitation */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-white/50 max-w-2xl mx-auto mb-6 leading-relaxed"
        >
          That weird plastic skin. The six-fingered hands. The soulless corporate stock photo vibe. 
          Your readers see it. Your clients see it. <span className="text-white/80">And it's costing you credibility.</span>
        </motion.p>

        {/* The Embarrassment List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-xl mx-auto mb-12"
        >
          <div className="text-sm text-white/40 uppercase tracking-wider mb-4">
            Signs your images scream "AI":
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              "Melted fingers & weird anatomy",
              "Generic purple/blue gradients",
              "That 'smooth' AI face look",
              "Random floating objects",
              "Text that's almost readable",
              "Lighting that makes no sense",
            ].map((sign, i) => (
              <div key={i} className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-amber-400/60 flex-shrink-0" />
                <span className="text-sm text-white/60">{sign}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* The Turn */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-amber-500/50" />
            <Eye className="w-5 h-5 text-amber-400" />
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What if your AI images looked
            <br />
            <span className="text-amber-400">intentionally designed?</span>
          </h2>
          
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            ImageCrafter uses smart templates and style systems to create images that look like 
            you hired a designer—not like you spent 10 seconds on Midjourney.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-lg transition-all shadow-lg shadow-amber-500/25"
          >
            Create Professional Images Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-white/30 mt-3">
            5 free images • No credit card • See the difference
          </p>
        </motion.div>
      </section>

      {/* Visual Comparison Section */}
      <section className="relative z-10 py-16 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">The difference is obvious</h2>
            <p className="text-white/50">Same concept. Completely different execution.</p>
          </div>

          {/* Side by Side Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Generic AI */}
            <div className="relative">
              <div className="absolute -top-3 left-4 px-3 py-1 bg-red-500/80 rounded-full text-xs font-medium z-10">
                Generic AI Output
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-red-500/20 h-full">
                <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  <img 
                    src="https://picsum.photos/seed/generic1/600/340" 
                    alt="Generic AI"
                    className="w-full h-full object-cover opacity-60 saturate-150"
                  />
                </div>
                <div className="space-y-2">
                  {[
                    "Over-saturated colors",
                    "Generic composition",
                    "Obviously AI-generated",
                    "No brand consistency",
                  ].map((issue, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/50">
                      <X className="w-4 h-4 text-red-400" />
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ImageCrafter */}
            <div className="relative">
              <div className="absolute -top-3 left-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs font-medium text-black z-10">
                ImageCrafter Output
              </div>
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl p-4 border border-amber-500/20 h-full">
                <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl mb-4 overflow-hidden">
                  <img 
                    src="https://picsum.photos/seed/crafted1/600/340" 
                    alt="ImageCrafter"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-2">
                  {[
                    "Intentional color palette",
                    "Professional composition",
                    "Looks designed, not generated",
                    "Matches your brand style",
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 text-amber-400" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Works Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Professional results through smart systems
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              We don't just generate images. We apply design principles that make them look intentional.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Palette,
                title: "Style Templates",
                description: "Pre-built visual systems for tech, health, lifestyle, and more. Consistent results every time.",
                color: "from-violet-500 to-purple-500",
              },
              {
                icon: Target,
                title: "Smart Composition",
                description: "Our prompts include professional photography rules—rule of thirds, proper lighting, focal points.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: Layers,
                title: "Brand Consistency",
                description: "Create projects with character anchors. Same character, same style, across all your images.",
                color: "from-cyan-500 to-blue-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 rounded-2xl p-6 border border-white/10"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 py-20 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for professionals who need quality</h2>
            <p className="text-white/50">Not hobbyists making memes. Serious creators who can't afford to look amateur.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Content Creators",
                description: "Blog headers that don't look like stock photos",
                icon: "✍️",
              },
              {
                title: "Authors",
                description: "Children's book illustrations with consistent characters",
                icon: "📚",
              },
              {
                title: "Marketers",
                description: "Social graphics that stop the scroll",
                icon: "📱",
              },
              {
                title: "Course Creators",
                description: "Professional slides without hiring a designer",
                icon: "🎓",
              },
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white/5 rounded-xl p-5 border border-white/10 text-center"
              >
                <div className="text-3xl mb-3">{useCase.icon}</div>
                <h3 className="font-semibold mb-1">{useCase.title}</h3>
                <p className="text-sm text-white/50">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <h2 className="text-2xl font-bold">
              "My clients stopped asking if I used AI."
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                quote: "Before ImageCrafter, my blog looked like every other AI-generated site. Now people actually compliment my visuals. The templates make all the difference.",
                name: "David Chen",
                role: "Tech Blogger",
                metric: "3x more shares",
              },
              {
                quote: "I was embarrassed to show my course materials. Generic AI art everywhere. Now my slides look like I hired a design team. Worth every penny.",
                name: "Amanda Torres",
                role: "Online Course Creator",
                metric: "Higher completion rates",
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-6 border border-white/10"
              >
                <p className="text-white/70 leading-relaxed mb-4">"{testimonial.quote}"</p>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{testimonial.name}</div>
                    <div className="text-sm text-white/40">{testimonial.role}</div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    {testimonial.metric}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Hint */}
      <section className="relative z-10 py-20 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Award className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Professional quality doesn't have to cost professional prices
          </h2>
          <p className="text-white/50 mb-8">
            Start with 5 free images. See the quality for yourself. 
            Then upgrade only if you need more.
          </p>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-8 border border-amber-500/20">
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-3xl font-bold text-amber-400">5</div>
                <div className="text-sm text-white/50">Free images</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">$0</div>
                <div className="text-sm text-white/50">To start</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">$9</div>
                <div className="text-sm text-white/50">When you're ready</div>
              </div>
            </div>
            
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold text-lg hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <p className="text-xs text-white/30 mt-4">
              No credit card required • Upgrade or cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your images represent your brand.
              <br />
              <span className="text-amber-400">Make them look like it.</span>
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Stop publishing images that scream "I spent 10 seconds on this." 
              Start creating visuals that build trust.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                Create Professional Images
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#comparison"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                See Examples
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">ImageCrafter by Xenco Labs</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
