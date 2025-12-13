"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Download,
  RefreshCw,
  Heart,
  ChevronRight,
  Loader2,
  Check,
  Info,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Template {
  slug: string;
  name: string;
  description: string;
  icon: string;
  presets: Preset[];
}

interface Preset {
  slug: string;
  name: string;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  originalPrompt: string;
  enhancedPrompt: string;
  aspectRatio: string;
}

// ============================================================================
// TEMPLATE DATA
// ============================================================================

const templates: Template[] = [
  {
    slug: "blog-hero",
    name: "Blog Hero",
    description: "Eye-catching headers for articles",
    icon: "📝",
    presets: [
      { slug: "tech", name: "Technology" },
      { slug: "health", name: "Health & Wellness" },
      { slug: "business", name: "Business" },
      { slug: "lifestyle", name: "Lifestyle" },
      { slug: "food-wine", name: "Food & Wine" },
    ],
  },
  {
    slug: "social-media-pack",
    name: "Social Media",
    description: "Multi-platform social graphics",
    icon: "📱",
    presets: [
      { slug: "instagram-post", name: "Instagram Post" },
      { slug: "instagram-story", name: "Instagram Story" },
      { slug: "linkedin", name: "LinkedIn" },
      { slug: "twitter", name: "Twitter/X" },
    ],
  },
  {
    slug: "presentation-graphics",
    name: "Presentations",
    description: "Clean slides and graphics",
    icon: "📊",
    presets: [
      { slug: "background", name: "Slide Background" },
      { slug: "concept", name: "Concept Illustration" },
      { slug: "data-viz", name: "Data Visualization" },
    ],
  },
  {
    slug: "childrens-book",
    name: "Children's Book",
    description: "Whimsical illustrations",
    icon: "📚",
    presets: [
      { slug: "watercolor", name: "Classic Watercolor" },
      { slug: "bold-graphic", name: "Bold & Graphic" },
      { slug: "cozy", name: "Cozy & Warm" },
    ],
  },
  {
    slug: "product-shots",
    name: "Product Photos",
    description: "E-commerce and marketing",
    icon: "📦",
    presets: [
      { slug: "white-background", name: "White Background" },
      { slug: "lifestyle", name: "Lifestyle Context" },
      { slug: "flat-lay", name: "Flat Lay" },
    ],
  },
  {
    slug: "profile-background",
    name: "Profile Backgrounds",
    description: "Professional backdrops",
    icon: "👤",
    presets: [
      { slug: "corporate", name: "Corporate Blue" },
      { slug: "creative", name: "Creative Studio" },
      { slug: "nature", name: "Natural/Outdoor" },
    ],
  },
];

const aspectRatios = [
  { value: "1:1", label: "Square", icon: "⬜" },
  { value: "16:9", label: "Landscape", icon: "🖼️" },
  { value: "9:16", label: "Portrait", icon: "📱" },
  { value: "4:3", label: "Standard", icon: "🎬" },
  { value: "3:4", label: "Tall", icon: "📄" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function GeneratePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [showEnhanced, setShowEnhanced] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          templateSlug: selectedTemplate?.slug,
          presetSlug: selectedPreset?.slug,
          aspectRatio,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedImage(data.image);
      } else {
        console.error("Generation failed:", data.error);
      }
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    const response = await fetch(generatedImage.imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imagecraft-${generatedImage.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-white/70">ImageCrafter Studio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
            Create stunning images
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              with simple prompts
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Select a template, describe what you want, and let ImageCrafter craft the perfect prompt.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Column - Controls */}
          <div className="space-y-8">
            {/* Template Selection */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                1. Choose a Template
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <motion.button
                    key={template.slug}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setSelectedPreset(null);
                    }}
                    className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                      selectedTemplate?.slug === template.slug
                        ? "bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border-violet-500/50"
                        : "bg-white/5 hover:bg-white/10 border-white/10"
                    } border`}
                  >
                    {selectedTemplate?.slug === template.slug && (
                      <motion.div
                        layoutId="template-check"
                        className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" />
                      </motion.div>
                    )}
                    <span className="text-2xl mb-2 block">{template.icon}</span>
                    <span className="font-medium block">{template.name}</span>
                    <span className="text-xs text-white/40">{template.description}</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            {/* Preset Selection */}
            <AnimatePresence mode="wait">
              {selectedTemplate && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                    2. Pick a Style
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.presets.map((preset) => (
                      <button
                        key={preset.slug}
                        onClick={() => setSelectedPreset(preset)}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${
                          selectedPreset?.slug === preset.slug
                            ? "bg-violet-500 text-white"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Aspect Ratio */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                3. Aspect Ratio
              </h2>
              <div className="flex gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => setAspectRatio(ratio.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                      aspectRatio === ratio.value
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    <span>{ratio.icon}</span>
                    <span>{ratio.label}</span>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Prompt Input */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
                4. Describe Your Image
              </h2>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to see... Our AI will enhance it automatically."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-white/30">
                  {prompt.length}/2000
                </div>
              </div>

              {/* Quick suggestions based on template */}
              {selectedTemplate && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-white/40">Try:</span>
                  {selectedTemplate.slug === "blog-hero" && (
                    <>
                      <QuickSuggestion
                        text="morning coffee in a cozy cafe"
                        onClick={setPrompt}
                      />
                      <QuickSuggestion text="team collaboration" onClick={setPrompt} />
                    </>
                  )}
                  {selectedTemplate.slug === "childrens-book" && (
                    <>
                      <QuickSuggestion
                        text="a bunny learning to share"
                        onClick={setPrompt}
                      />
                      <QuickSuggestion text="friends at the playground" onClick={setPrompt} />
                    </>
                  )}
                </div>
              )}
            </motion.section>

            {/* Generate Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Image
                </>
              )}
            </motion.button>
          </div>

          {/* Right Column - Preview/Result */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-8"
            >
              <div
                className={`aspect-video rounded-2xl overflow-hidden border border-white/10 bg-white/5 ${
                  isGenerating ? "animate-pulse" : ""
                }`}
              >
                {generatedImage ? (
                  <img
                    src={generatedImage.imageUrl}
                    alt={generatedImage.originalPrompt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                    <ImageIcon className="w-16 h-16 mb-4" />
                    <p>Your image will appear here</p>
                  </div>
                )}
              </div>

              {/* Image Actions */}
              {generatedImage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4"
                >
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedImage(null);
                        handleGenerate();
                      }}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <button className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                      <Heart className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prompt Details */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <button
                      onClick={() => setShowEnhanced(!showEnhanced)}
                      className="w-full flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-white/60">
                        <Info className="w-4 h-4" />
                        {showEnhanced ? "Enhanced Prompt" : "View AI-Enhanced Prompt"}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${showEnhanced ? "rotate-90" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {showEnhanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-white/10"
                        >
                          <p className="text-sm text-white/70 leading-relaxed">
                            {generatedImage.enhancedPrompt}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function QuickSuggestion({
  text,
  onClick,
}: {
  text: string;
  onClick: (text: string) => void;
}) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-1 rounded-full text-xs bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
    >
      {text}
    </button>
  );
}
