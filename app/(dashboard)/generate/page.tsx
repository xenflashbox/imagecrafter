"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Download,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Zap,
  AlertCircle,
  Loader2,
  Info,
  Star,
  Crown,
} from "lucide-react";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface Template {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
}

interface Preset {
  id: string;
  name: string;
  slug: string;
  isPro: boolean;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  enhancedPrompt?: string;
  resolution: string;
  creditsCost: number;
  hasWatermark: boolean;
}

interface UserCredits {
  used: number;
  limit: number;
  remaining: number;
  plan: string;
  maxResolution: string;
}

type Resolution = "1K" | "2K" | "4K";

// =============================================================================
// CREDIT COSTS
// =============================================================================

const CREDIT_COSTS: Record<Resolution, number> = {
  "1K": 1,
  "2K": 2,
  "4K": 5,
};

const RESOLUTION_INFO: Record<Resolution, { label: string; size: string }> = {
  "1K": { label: "Standard", size: "1024×1024" },
  "2K": { label: "HD", size: "2048×2048" },
  "4K": { label: "Ultra", size: "4096×4096" },
};

// =============================================================================
// MOCK DATA - Replace with API calls
// =============================================================================

const MOCK_TEMPLATES: Template[] = [
  { id: "1", name: "Blog Hero", slug: "blog-hero", icon: "📝", category: "blog" },
  { id: "2", name: "Social Media", slug: "social-media", icon: "📱", category: "social" },
  { id: "3", name: "Children's Book", slug: "childrens-book", icon: "📚", category: "illustration" },
  { id: "4", name: "Product Shot", slug: "product-shot", icon: "📦", category: "product" },
  { id: "5", name: "Presentation", slug: "presentation", icon: "📊", category: "business" },
];

const MOCK_PRESETS: Record<string, Preset[]> = {
  "blog-hero": [
    { id: "1", name: "Tech Minimal", slug: "tech-minimal", isPro: false },
    { id: "2", name: "Warm & Cozy", slug: "warm-cozy", isPro: false },
    { id: "3", name: "Bold & Modern", slug: "bold-modern", isPro: true },
  ],
  "social-media": [
    { id: "4", name: "Instagram Aesthetic", slug: "instagram", isPro: false },
    { id: "5", name: "LinkedIn Professional", slug: "linkedin", isPro: false },
  ],
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function GeneratePage() {
  // State
  const [prompt, setPrompt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Credits
  const [credits, setCredits] = useState<UserCredits>({
    used: 3,
    limit: 10,
    remaining: 7,
    plan: "FREE",
    maxResolution: "1K",
  });

  // Fetch credits on mount
  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/usage");
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  // Get available presets for selected template
  const availablePresets = selectedTemplate
    ? MOCK_PRESETS[selectedTemplate.slug] || []
    : [];

  // Check if resolution is available
  const isResolutionAvailable = (res: Resolution): boolean => {
    const resOrder = ["1K", "2K", "4K"];
    const maxIndex = resOrder.indexOf(credits.maxResolution);
    const resIndex = resOrder.indexOf(res);
    return resIndex <= maxIndex;
  };

  // Calculate if user can generate
  const creditCost = CREDIT_COSTS[resolution];
  const canGenerate = credits.remaining >= creditCost && isResolutionAvailable(resolution);

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt.trim() || !canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resolution,
          aspectRatio,
          templateId: selectedTemplate?.id,
          presetId: selectedPreset?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImage(data.image);
      
      // Update credits
      if (data.creditsRemaining !== undefined) {
        setCredits((prev) => ({
          ...prev,
          remaining: data.creditsRemaining,
          used: prev.limit - data.creditsRemaining,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download - FIXED VERSION
  const handleDownload = async () => {
    if (!generatedImage) return;

    setIsDownloading(true);

    try {
      // Use our proxy API to handle CORS
      const downloadUrl = `/api/images/download?url=${encodeURIComponent(generatedImage.imageUrl)}&filename=imagecrafter-${generatedImage.id}`;
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `imagecrafter-${generatedImage.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open in new tab
      window.open(generatedImage.imageUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle regenerate
  const handleRegenerate = () => {
    handleGenerate();
  };

  // Copy prompt
  const handleCopyPrompt = async () => {
    if (!generatedImage?.enhancedPrompt) return;
    await navigator.clipboard.writeText(generatedImage.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header with Credits */}
      <div className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light">Create Image</h1>
            <p className="text-sm text-white/50">Describe what you want to see</p>
          </div>

          {/* Credits Display */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <span className="font-medium">
                  {credits.remaining}
                  <span className="text-white/40"> / {credits.limit}</span>
                </span>
                <span className="text-xs text-white/40">credits</span>
              </div>
              <div className="text-xs text-white/40">{credits.plan} Plan</div>
            </div>
            {credits.plan === "FREE" && (
              <Link
                href="/settings"
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Input Panel */}
          <div className="space-y-6">
            {/* Template Selection */}
            <div>
              <label className="text-sm text-white/60 block mb-2">Template (optional)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {MOCK_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(
                        selectedTemplate?.id === template.id ? null : template
                      );
                      setSelectedPreset(null);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedTemplate?.id === template.id
                        ? "bg-violet-500/20 border-violet-500/50"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl mb-1">{template.icon}</div>
                    <div className="text-xs text-white/70 truncate">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Selection */}
            <AnimatePresence>
              {selectedTemplate && availablePresets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-sm text-white/60 block mb-2">Style</label>
                  <div className="flex flex-wrap gap-2">
                    {availablePresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() =>
                          setSelectedPreset(
                            selectedPreset?.id === preset.id ? null : preset
                          )
                        }
                        disabled={preset.isPro && credits.plan === "FREE"}
                        className={`px-4 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                          selectedPreset?.id === preset.id
                            ? "bg-violet-500/20 border-violet-500/50"
                            : preset.isPro && credits.plan === "FREE"
                            ? "bg-white/5 border-white/5 text-white/30 cursor-not-allowed"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {preset.name}
                        {preset.isPro && <Crown className="w-3 h-3 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resolution Selection */}
            <div>
              <label className="text-sm text-white/60 block mb-2">
                Resolution
                <span className="text-white/40 ml-2">(credit cost)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["1K", "2K", "4K"] as Resolution[]).map((res) => {
                  const available = isResolutionAvailable(res);
                  const cost = CREDIT_COSTS[res];
                  const info = RESOLUTION_INFO[res];

                  return (
                    <button
                      key={res}
                      onClick={() => available && setResolution(res)}
                      disabled={!available}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        resolution === res
                          ? "bg-violet-500/20 border-violet-500/50"
                          : available
                          ? "bg-white/5 border-white/10 hover:border-white/20"
                          : "bg-white/5 border-white/5 text-white/30 cursor-not-allowed"
                      }`}
                    >
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-white/50">{info.size}</div>
                      <div
                        className={`text-xs mt-1 ${
                          resolution === res ? "text-violet-300" : "text-white/40"
                        }`}
                      >
                        {cost} {cost === 1 ? "credit" : "credits"}
                      </div>
                      {!available && (
                        <div className="text-xs text-amber-400 mt-1">
                          {res === "4K" ? "Pro" : "Starter"}+
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-sm text-white/60 block mb-2">Aspect Ratio</label>
              <div className="flex gap-2">
                {["1:1", "16:9", "9:16", "4:3", "3:4"].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                      aspectRatio === ratio
                        ? "bg-violet-500/20 border-violet-500/50"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div>
              <label className="text-sm text-white/60 block mb-2">
                Describe your image
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cozy coffee shop on a rainy autumn day, warm lighting, steam rising from cups..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !canGenerate || isGenerating}
              className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                !prompt.trim() || !canGenerate || isGenerating
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate ({creditCost} {creditCost === 1 ? "credit" : "credits"})
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Not enough credits warning */}
            {!canGenerate && credits.remaining < creditCost && (
              <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Not enough credits. You need {creditCost} but have {credits.remaining}.
                <Link href="/settings" className="underline ml-1">
                  Upgrade
                </Link>
              </div>
            )}
          </div>

          {/* Right: Preview Panel */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              {/* Preview Area */}
              <div className="aspect-square bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center relative">
                {generatedImage ? (
                  <img
                    src={generatedImage.imageUrl}
                    alt={generatedImage.prompt}
                    className="w-full h-full object-contain"
                  />
                ) : isGenerating ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/50">Creating your image...</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <ImageIcon className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30">Your image will appear here</p>
                  </div>
                )}

                {/* Watermark badge */}
                {generatedImage?.hasWatermark && (
                  <div className="absolute top-4 right-4 px-2 py-1 rounded bg-black/50 text-xs text-white/60">
                    Watermarked
                  </div>
                )}
              </div>

              {/* Actions */}
              {generatedImage && (
                <div className="p-4 border-t border-white/5">
                  {/* Enhanced Prompt Display */}
                  {generatedImage.enhancedPrompt && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" />
                          Enhanced Prompt
                        </span>
                        <button
                          onClick={handleCopyPrompt}
                          className="text-xs text-white/40 hover:text-white flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-white/60 bg-white/5 rounded-lg p-3 max-h-24 overflow-y-auto">
                        {generatedImage.enhancedPrompt}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={isGenerating || credits.remaining < creditCost}
                      className="flex-1 py-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                      Regenerate
                    </button>
                  </div>

                  {/* Image Info */}
                  <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>
                      {generatedImage.resolution} • {creditCost} credit
                      {creditCost > 1 ? "s" : ""} used
                    </span>
                    <span>ID: {generatedImage.id.slice(0, 8)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
