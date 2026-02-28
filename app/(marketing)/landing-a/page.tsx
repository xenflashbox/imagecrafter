"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  X,
  Check,
  Zap,
  Clock,
  DollarSign,
  Frown,
  MessageSquare,
  Image as ImageIcon,
  Star,
  ChevronRight,
  Play,
} from "lucide-react";

/**
 * LANDING PAGE VARIANT A
 * 
 * Hook: "Prompt Frustration"
 * Primary Pain Point: Spending hours writing prompts that produce garbage
 * Emotional Trigger: Frustration, wasted time, feeling stupid
 * Solution Angle: We handle the complex prompts, you just describe what you want
 */

export default function LandingPageVariantA() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[180px]" />
      </div>

      {/* Minimal Nav */}
      <nav className="relative z-50 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
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

      {/* Hero Section - Pain Point Hook */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-20 text-center">
        {/* Frustration Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-8"
        >
          <Frown className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">Sound familiar?</span>
        </motion.div>

        {/* Main Hook - The Pain */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold leading-[1.1] mb-6"
        >
          <span className="text-white/90">You describe exactly what you want.</span>
          <br />
          <span className="text-red-400">The AI gives you garbage.</span>
        </motion.h1>

        {/* Agitation */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-white/50 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          You've spent <span className="text-white/80">hours</span> tweaking prompts. Googling "how to write Midjourney prompts." 
          Adding random keywords like "8k, ultra detailed, masterpiece" and <span className="text-white/80">still</span> getting 
          results that look nothing like what you imagined.
        </motion.p>

        {/* The Pain List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {[
            "Prompts that work once, then never again",
            "Results that look obviously AI-generated",
            "Hours wasted on trial and error",
            "Paying $30/month for confusing tools",
          ].map((pain, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
            >
              <X className="w-4 h-4 text-red-400" />
              <span className="text-sm text-white/70">{pain}</span>
            </div>
          ))}
        </motion.div>

        {/* The Turn - Solution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 text-violet-400 mb-4">
            <div className="w-12 h-px bg-violet-500/50" />
            <span className="text-sm font-medium uppercase tracking-wider">There's a better way</span>
            <div className="w-12 h-px bg-violet-500/50" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What if the AI understood you
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              the first time?
            </span>
          </h2>
          
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            ImageCrafter translates your simple descriptions into the complex prompts AI actually needs. 
            You say what you want. We handle the technical stuff.
          </p>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold mb-2">Try it free. No credit card.</h3>
            <p className="text-white/50 text-sm mb-4">
              Get 5 free images. See the difference for yourself.
            </p>
            
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <Link
                href={`/sign-up${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium flex items-center justify-center gap-2 transition-all"
              >
                Start Creating for Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <p className="text-xs text-white/30 mt-3">
              No credit card required • 5 free images • Cancel anytime
            </p>
          </div>
        </motion.div>
      </section>

      {/* Before/After Section */}
      <section className="relative z-10 py-20 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Same request. Different results.</h2>
            <p className="text-white/50">See what happens when AI actually understands you.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <X className="w-5 h-5" />
                <span className="font-medium">What you usually get</span>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-sm text-white/40 mb-2">Your prompt:</div>
                <p className="text-white/80 text-sm mb-4">
                  "A professional blog header about artificial intelligence"
                </p>
                <div className="aspect-video bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🤖</div>
                    <p className="text-sm text-white/40">Generic robot face #47,382</p>
                    <p className="text-xs text-white/30 mt-1">Looks like every other AI image</p>
                  </div>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">What ImageCrafter creates</span>
              </div>
              <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-xl p-4 border border-violet-500/20">
                <div className="text-sm text-white/40 mb-2">Your prompt:</div>
                <p className="text-white/80 text-sm mb-2">
                  "A professional blog header about artificial intelligence"
                </p>
                <div className="text-xs text-violet-300 mb-4">
                  ✨ Enhanced: "Futuristic visualization of neural network layers processing data, 
                  flowing cyan and purple data streams, dark background with glowing nodes, 
                  cinematic lighting, modern tech aesthetic"
                </div>
                <div className="aspect-video bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 rounded-lg overflow-hidden">
                  <img 
                    src="https://picsum.photos/seed/ai-demo/800/450" 
                    alt="Professional AI visualization"
                    className="w-full h-full object-cover opacity-90"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Stupidly simple. Seriously.</h2>
            <p className="text-white/50">Three steps. That's it.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Pick a template",
                description: "Blog header? Social post? Children's book? We've got you.",
                icon: ImageIcon,
              },
              {
                step: "2",
                title: "Describe it simply",
                description: '"A cozy coffee shop in autumn" works perfectly.',
                icon: MessageSquare,
              },
              {
                step: "3",
                title: "Get perfect results",
                description: "Our AI transforms your words into pro-level prompts.",
                icon: Sparkles,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-violet-400" />
                </div>
                <div className="text-sm text-violet-400 font-medium mb-1">Step {item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-20 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <h2 className="text-3xl font-bold mb-2">
              "Finally, an AI tool that doesn't make me feel stupid."
            </h2>
            <p className="text-white/50">
              Join creators who stopped fighting with prompts
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I used to spend 30 minutes per image. Now it's 30 seconds. Same quality, zero frustration.",
                name: "Sarah K.",
                role: "Content Creator",
              },
              {
                quote: "My children's book illustrations finally look consistent. This was impossible before.",
                name: "Michael R.",
                role: "Self-Published Author",
              },
              {
                quote: "Cancelled my Midjourney subscription. This is simpler and I get better results.",
                name: "Jessica T.",
                role: "Marketing Manager",
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 rounded-xl p-6 border border-white/10"
              >
                <p className="text-white/70 text-sm mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-medium text-sm">{testimonial.name}</div>
                  <div className="text-white/40 text-xs">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="relative z-10 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Start free. Upgrade when you need more.</h2>
          <p className="text-white/50 mb-8">
            No credit card required. No commitment. Just better images.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Zap, label: "5 free images", sublabel: "to try it out" },
              { icon: Clock, label: "30 seconds", sublabel: "average generation time" },
              { icon: DollarSign, label: "From $9/mo", sublabel: "when you're ready" },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <item.icon className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                <div className="font-semibold">{item.label}</div>
                <div className="text-xs text-white/40">{item.sublabel}</div>
              </div>
            ))}
          </div>

          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium text-lg transition-all"
          >
            Create Your First Image Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 bg-gradient-to-b from-violet-600/10 to-transparent">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop wrestling with prompts.
            <br />
            <span className="text-violet-400">Start creating.</span>
          </h2>
          <p className="text-white/50 mb-8">
            Your first 5 images are free. No credit card. No catch.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-black font-medium text-lg hover:bg-white/90 transition-all"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
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
