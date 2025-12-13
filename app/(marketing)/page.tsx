"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  BookOpen,
  Presentation,
  Image as ImageIcon,
  Zap,
  Check,
  ArrowRight,
  Play,
  Star,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

// ============================================================================
// COMPONENT
// ============================================================================

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06060a] text-white overflow-hidden">
      {/* Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[200px] opacity-50" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-fuchsia-500/15 rounded-full blur-[180px] opacity-50" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[150px] opacity-50" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#06060a]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg">ImageCrafter</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Features
            </a>
            <a href="#templates" className="text-sm text-white/60 hover:text-white transition-colors">
              Templates
            </a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">
              Pricing
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-white/5 bg-[#06060a]/95 backdrop-blur-xl px-6 py-4 space-y-4"
          >
            <a href="#features" className="block text-white/60">
              Features
            </a>
            <a href="#templates" className="block text-white/60">
              Templates
            </a>
            <a href="#pricing" className="block text-white/60">
              Pricing
            </a>
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Link href="/sign-in" className="flex-1 py-2 text-center rounded-lg bg-white/5">
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="flex-1 py-2 text-center rounded-lg bg-white text-black font-medium"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-white/70">Powered by Google Gemini</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-light tracking-tight leading-[1.1] mb-6"
          >
            Create stunning images
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              without learning prompts
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/50 max-w-2xl mx-auto mb-10"
          >
            ImageCrafter turns your simple descriptions into professional AI images. Our smart
            templates handle the prompt engineering so you get perfect results every time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25"
            >
              Start Creating Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium flex items-center justify-center gap-2 transition-all">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-white/40"
          >
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <span>Loved by creators</span>
            <span>•</span>
            <span>No credit card required</span>
          </motion.div>
        </div>

        {/* Hero Image/Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1">
            <div className="rounded-xl overflow-hidden bg-[#0a0a0f]">
              <img
                src="https://picsum.photos/seed/hero/1200/600"
                alt="ImageCrafter Interface"
                className="w-full opacity-80"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#06060a] via-transparent to-transparent" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              Everything you need to create
              <br />
              <span className="text-white/50">professional images</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Wand2,
                title: "Smart Prompt Enhancement",
                description:
                  "Just describe what you want. Our AI transforms your simple words into perfectly optimized prompts for stunning results.",
                gradient: "from-violet-500 to-purple-500",
              },
              {
                icon: BookOpen,
                title: "Character Consistency",
                description:
                  "Create children's books with the same character across every page. Our anchor system keeps your visuals consistent.",
                gradient: "from-pink-500 to-orange-500",
              },
              {
                icon: Presentation,
                title: "Template Library",
                description:
                  "Pre-built templates for blog headers, social posts, presentations, and more. Just pick a style and go.",
                gradient: "from-cyan-500 to-blue-500",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="relative py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              Templates for every use case
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Pre-configured styles for blogs, social media, presentations, children's books, and
              more.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Blog Hero", icon: "📝", count: 5 },
              { name: "Social Media", icon: "📱", count: 4 },
              { name: "Children's Book", icon: "📚", count: 3 },
              { name: "Presentations", icon: "📊", count: 3 },
              { name: "Product Shots", icon: "📦", count: 3 },
              { name: "Profile Backgrounds", icon: "👤", count: 3 },
              { name: "Storyboards", icon: "🎬", count: 3 },
              { name: "Infographics", icon: "📈", count: 3 },
            ].map((template, index) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all cursor-pointer group"
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <div className="font-medium text-sm group-hover:text-violet-300 transition-colors">
                  {template.name}
                </div>
                <div className="text-xs text-white/40">{template.count} styles</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-4">Simple, transparent pricing</h2>
            <p className="text-white/50">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: 0,
                description: "Perfect for trying it out",
                features: ["5 images/month", "Basic templates", "Watermarked", "1K resolution"],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Pro",
                price: 19,
                description: "For creators who need more",
                features: [
                  "500 images/month",
                  "All templates",
                  "No watermark",
                  "4K resolution",
                  "Projects & character consistency",
                  "Pro model access",
                ],
                cta: "Start Free Trial",
                highlight: true,
              },
              {
                name: "Team",
                price: 49,
                description: "For teams and agencies",
                features: [
                  "2,000 images/month",
                  "Everything in Pro",
                  "API access",
                  "Multiple seats",
                  "Priority support",
                ],
                cta: "Contact Sales",
                highlight: false,
              },
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl p-6 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-violet-600/20 to-fuchsia-600/10 border-2 border-violet-500/50"
                    : "bg-white/[0.02] border border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-medium mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/40">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-light">${plan.price}</span>
                  <span className="text-white/40">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent border border-violet-500/20"
          >
            <h2 className="text-3xl md:text-4xl font-light mb-4">
              Ready to create amazing images?
            </h2>
            <p className="text-white/50 mb-8">
              Join thousands of creators using ImageCrafter to bring their ideas to life.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all"
            >
              Start Creating Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold">ImageCrafter</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/40">
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Support
              </a>
            </div>

            <div className="text-sm text-white/30">
              © 2024 ImageCrafter. A Xenco Labs product.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
