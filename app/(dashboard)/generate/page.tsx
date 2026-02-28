"use client";

/**
 * /generate — Image Generation Page (Phase 5 Redesign)
 *
 * 5-step flow per PRD Section 5.2:
 *   Step 1: Category  (Content Creation / Social / Marketing / Storytelling / Professional)
 *   Step 2: Template  (within chosen category)
 *   Step 3: Style     (preset — smart defaults, each shows guidance)
 *   Step 4: Describe  (guided prompt with placeholder text for chosen template+style)
 *   Step 5: Generate  (resolution + aspect auto-set from template, expandable for power users)
 *
 * Templates loaded from /api/templates (real DB data, no mock data).
 * Credits loaded from /api/usage.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Download,
  RefreshCw,
  Copy,
  Check,
  Zap,
  AlertCircle,
  Loader2,
  Crown,
  ChevronRight,
  ChevronLeft,
  Settings2,
} from "lucide-react";
import Link from "next/link";

// =============================================================================
// TYPES (from /api/templates response)
// =============================================================================

interface TemplatePreset {
  id: string;
  slug: string;
  name: string;
  isPro: boolean;
  promptSuffix: string | null;
  styleOverrides: Record<string, unknown> | null;
}

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  iconName: string | null;
  defaultAspectRatio: string;
  defaultStyleHints: string | null;
  presets: TemplatePreset[];
}

interface DisplayCategory {
  displayCategory: string;
  icon: string;
  description: string;
  templates: Template[];
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
type Step = 1 | 2 | 3 | 4 | 5;

const CREDIT_COSTS: Record<Resolution, number> = { "1K": 1, "2K": 2, "4K": 5 };
const RESOLUTION_INFO: Record<Resolution, { label: string; size: string }> = {
  "1K": { label: "Standard", size: "1024×1024" },
  "2K": { label: "HD",       size: "2048×2048" },
  "4K": { label: "Ultra",    size: "4096×4096" },
};

// Category icon emojis (map icon names to emojis for display)
const CATEGORY_ICONS: Record<string, string> = {
  "Content Creation": "✍️",
  "Social Media":     "📱",
  "Marketing":        "📣",
  "Storytelling":     "📖",
  "Professional":     "💼",
};

// =============================================================================
// STEP INDICATOR
// =============================================================================

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step < current
                ? "bg-violet-600 text-white"
                : step === current
                ? "bg-violet-500 text-white ring-2 ring-violet-500/30"
                : "bg-white/10 text-white/40"
            }`}
          >
            {step < current ? "✓" : step}
          </div>
          {step < total && (
            <div
              className={`w-8 h-0.5 mx-1 transition-all ${
                step < current ? "bg-violet-600" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-white/40">Step {current} of {total}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function GeneratePage() {
  // --- Data State ---
  const [categories, setCategories] = useState<DisplayCategory[]>([]);
  const [credits, setCredits] = useState<UserCredits>({
    used: 0, limit: 10, remaining: 10, plan: "FREE", maxResolution: "1K",
  });
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // --- Selection State ---
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<TemplatePreset | null>(null);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // --- Generation State ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // --- Load templates + credits ---
  useEffect(() => {
    Promise.all([fetchTemplates(), fetchCredits()]);
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      if (data.success) setCategories(data.categories);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setCredits(data);
        // Auto-set best available resolution
        setResolution(
          data.maxResolution === "4K" ? "4K" :
          data.maxResolution === "2K" ? "2K" : "1K"
        );
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  // --- Navigation ---
  const goToStep = useCallback((s: Step) => {
    setStep(s);
    setError(null);
    setGeneratedImage(null);
  }, []);

  const handleSelectCategory = (cat: DisplayCategory) => {
    setSelectedCategory(cat);
    setSelectedTemplate(null);
    setSelectedPreset(null);
    goToStep(2);
  };

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setSelectedPreset(null);
    // Apply smart defaults from template
    setAspectRatio(tpl.defaultAspectRatio || "1:1");
    goToStep(3);
  };

  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPreset(preset);
    // Apply aspect ratio override from preset if present
    const ar = (preset.styleOverrides as Record<string, string> | null)?.aspectRatio;
    if (ar) setAspectRatio(ar);
    goToStep(4);
  };

  const handleSkipStyle = () => {
    setSelectedPreset(null);
    goToStep(4);
  };

  const handleBackToCategory = () => {
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setSelectedPreset(null);
    goToStep(1);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setSelectedPreset(null);
    goToStep(2);
  };

  const handleBackToStyles = () => {
    setSelectedPreset(null);
    goToStep(3);
  };

  // --- Generation ---
  const isResolutionAvailable = (res: Resolution) => {
    const order = ["1K", "2K", "4K"];
    return order.indexOf(res) <= order.indexOf(credits.maxResolution);
  };

  const creditCost = CREDIT_COSTS[resolution];
  const canGenerate = credits.remaining >= creditCost && isResolutionAvailable(resolution);

  const handleGenerate = async () => {
    if (!prompt.trim() || !canGenerate) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    goToStep(5);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resolution,
          aspectRatio,
          templateSlug: selectedTemplate?.slug,
          presetSlug: selectedPreset?.slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setGeneratedImage(data.image);
      if (data.creditsRemaining !== undefined) {
        setCredits((prev) => ({
          ...prev,
          remaining: data.creditsRemaining,
          used: prev.limit - data.creditsRemaining,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    setIsDownloading(true);
    try {
      const url = `/api/images/download?url=${encodeURIComponent(generatedImage.imageUrl)}&filename=imagecrafter-${generatedImage.id}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `imagecrafter-${generatedImage.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      if (generatedImage) window.open(generatedImage.imageUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedImage?.enhancedPrompt) return;
    await navigator.clipboard.writeText(generatedImage.enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Credits Header */}
      <div className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-light">Create Image</h1>
            <p className="text-sm text-white/50">
              {step === 1 && "Choose a category to get started"}
              {step === 2 && `${selectedCategory?.displayCategory} templates`}
              {step === 3 && `Choose a style for ${selectedTemplate?.name}`}
              {step === 4 && "Describe what you want to see"}
              {step === 5 && "Generating your image..."}
            </p>
          </div>
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
        <StepIndicator current={step} total={5} />

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT: Step Content */}
          <div>
            {/* STEP 1: Category Selection */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-medium mb-1">What are you creating?</h2>
                <p className="text-sm text-white/50 mb-6">Pick a category and we&apos;ll guide you to the perfect template.</p>
                {loadingTemplates ? (
                  <div className="flex items-center gap-3 text-white/50">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading templates...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.displayCategory}
                        onClick={() => handleSelectCategory(cat)}
                        className="group p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 text-left transition-all"
                      >
                        <div className="text-3xl mb-3">{CATEGORY_ICONS[cat.displayCategory] || "🎨"}</div>
                        <div className="font-semibold text-white mb-1">{cat.displayCategory}</div>
                        <div className="text-sm text-white/50 leading-snug">{cat.description}</div>
                        <div className="mt-3 text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          {cat.templates.length} template{cat.templates.length !== 1 ? "s" : ""} →
                        </div>
                      </button>
                    ))}
                    {/* Skip to free-form */}
                    <button
                      onClick={() => { setSelectedCategory(null); setSelectedTemplate(null); setSelectedPreset(null); setStep(4); }}
                      className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 text-left transition-all"
                    >
                      <div className="text-3xl mb-3">⚡</div>
                      <div className="font-semibold text-white mb-1">Free-form</div>
                      <div className="text-sm text-white/50 leading-snug">Skip templates — just describe what you want.</div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Template Selection */}
            {step === 2 && selectedCategory && (
              <div>
                <button onClick={handleBackToCategory} className="flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back to categories
                </button>
                <h2 className="text-lg font-medium mb-1">{selectedCategory.displayCategory}</h2>
                <p className="text-sm text-white/50 mb-6">Choose a template that matches your goal.</p>
                <div className="space-y-3">
                  {selectedCategory.templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className="group w-full p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 text-left transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white mb-1">{tpl.name}</div>
                        {tpl.description && (
                          <div className="text-sm text-white/50">{tpl.description}</div>
                        )}
                        <div className="text-xs text-white/30 mt-1">
                          Default: {tpl.defaultAspectRatio} · {tpl.presets.length} style{tpl.presets.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-violet-400 transition-colors flex-shrink-0 ml-4" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: Style / Preset Selection */}
            {step === 3 && selectedTemplate && (
              <div>
                <button onClick={handleBackToTemplates} className="flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back to templates
                </button>
                <h2 className="text-lg font-medium mb-1">Choose a style</h2>
                <p className="text-sm text-white/50 mb-6">
                  Each style changes the visual direction. You can skip this for a neutral result.
                </p>
                <div className="space-y-2">
                  {selectedTemplate.presets.map((preset) => {
                    const isLocked = preset.isPro && credits.plan === "FREE";
                    return (
                      <button
                        key={preset.id}
                        onClick={() => !isLocked && handleSelectPreset(preset)}
                        disabled={isLocked}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isLocked
                            ? "border-white/5 bg-white/5 text-white/30 cursor-not-allowed"
                            : "border-white/10 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{preset.name}</span>
                            {preset.isPro && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          {preset.promptSuffix && (
                            <div className="text-xs text-white/40">{preset.promptSuffix}</div>
                          )}
                        </div>
                        {isLocked ? (
                          <span className="text-xs text-amber-400 flex-shrink-0">Pro</span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  <button
                    onClick={handleSkipStyle}
                    className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 text-left transition-all text-sm text-white/50"
                  >
                    Skip — use template defaults
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Describe + Settings */}
            {step === 4 && (
              <div>
                {(selectedTemplate || selectedPreset) && (
                  <button onClick={selectedPreset ? handleBackToStyles : handleBackToTemplates} className="flex items-center gap-1 text-sm text-white/50 hover:text-white mb-4 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}

                {/* Selection summary */}
                {(selectedTemplate || selectedCategory) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedCategory && (
                      <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs">
                        {selectedCategory.displayCategory}
                      </span>
                    )}
                    {selectedTemplate && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                        {selectedTemplate.name}
                      </span>
                    )}
                    {selectedPreset && (
                      <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs">
                        {selectedPreset.name}
                      </span>
                    )}
                  </div>
                )}

                <h2 className="text-lg font-medium mb-1">Describe your image</h2>
                <p className="text-sm text-white/50 mb-4">
                  {selectedTemplate
                    ? `Describe what you want — template styles will be applied automatically.`
                    : "What do you want to create?"}
                </p>

                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    selectedTemplate
                      ? `E.g. "${selectedTemplate.name === "Blog Hero Image"
                          ? "A guide to remote work productivity with a home office setup"
                          : selectedTemplate.name === "Social Media Pack"
                          ? "A new product launch for eco-friendly water bottles"
                          : selectedTemplate.name === "Product Photography"
                          ? "A premium wireless headphone floating on a clean background"
                          : selectedTemplate.name === "Presentation Graphics"
                          ? "The future of AI in healthcare — slide background"
                          : "A friendly dragon teaching a classroom of kids"
                        }"`
                      : "A cozy coffee shop on a rainy autumn day, warm lighting, steam rising from cups..."
                  }
                  rows={5}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-all resize-none text-sm"
                />

                {/* Smart defaults badge */}
                {selectedTemplate && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                    <Wand2 className="w-3 h-3 text-violet-400" />
                    Smart defaults applied: {aspectRatio} aspect ratio
                    {selectedTemplate.defaultStyleHints && ` · ${selectedTemplate.defaultStyleHints}`}
                  </div>
                )}

                {/* Advanced Settings (collapsible) */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    Advanced settings
                    <ChevronRight className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      {/* Resolution */}
                      <div>
                        <label className="text-xs text-white/50 block mb-2">Resolution</label>
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
                                className={`p-2.5 rounded-lg border text-center text-xs transition-all ${
                                  resolution === res
                                    ? "bg-violet-500/20 border-violet-500/50"
                                    : available
                                    ? "bg-white/5 border-white/10 hover:border-white/20"
                                    : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                                }`}
                              >
                                <div className="font-medium">{info.label}</div>
                                <div className="text-white/40">{cost}cr</div>
                                {!available && <div className="text-amber-400">Pro+</div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Aspect Ratio */}
                      <div>
                        <label className="text-xs text-white/50 block mb-2">Aspect Ratio</label>
                        <div className="flex flex-wrap gap-2">
                          {["1:1", "16:9", "9:16", "4:3", "3:4"].map((ratio) => (
                            <button
                              key={ratio}
                              onClick={() => setAspectRatio(ratio)}
                              className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
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
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl mt-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Not enough credits */}
                {!canGenerate && credits.remaining < creditCost && (
                  <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 px-4 py-3 rounded-xl mt-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Not enough credits — need {creditCost}, have {credits.remaining}.
                    <Link href="/settings" className="underline ml-1">Upgrade</Link>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !canGenerate || isGenerating}
                  className={`mt-6 w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-lg ${
                    !prompt.trim() || !canGenerate || isGenerating
                      ? "bg-white/10 text-white/30 cursor-not-allowed"
                      : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/30"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  Generate ({creditCost} {creditCost === 1 ? "credit" : "credits"})
                </button>
              </div>
            )}

            {/* STEP 5: Generating / Result */}
            {step === 5 && (
              <div>
                <h2 className="text-lg font-medium mb-4">
                  {isGenerating ? "Generating your image..." : generatedImage ? "Your image is ready!" : "Generation complete"}
                </h2>

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 animate-pulse" />
                      <Loader2 className="w-10 h-10 animate-spin absolute inset-0 m-auto text-white" />
                    </div>
                    <p className="text-white/50 mt-6 text-sm">Building enhanced prompt → generating image...</p>
                    <p className="text-white/30 text-xs mt-2">This takes 15–30 seconds</p>
                  </div>
                )}

                {!isGenerating && generatedImage && (
                  <div className="space-y-4">
                    {/* Enhanced prompt */}
                    {generatedImage.enhancedPrompt && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <Wand2 className="w-3 h-3" /> Enhanced prompt
                          </span>
                          <button onClick={handleCopyPrompt} className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed line-clamp-3">{generatedImage.enhancedPrompt}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50"
                      >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Download
                      </button>
                      <button
                        onClick={() => { setPrompt(""); goToStep(4); }}
                        className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2 font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Generate again
                      </button>
                    </div>

                    <button
                      onClick={() => { setStep(1); setSelectedCategory(null); setSelectedTemplate(null); setSelectedPreset(null); setPrompt(""); setGeneratedImage(null); }}
                      className="w-full py-2.5 rounded-xl bg-white/5 text-white/50 hover:text-white transition-all text-sm"
                    >
                      Start a new image
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Preview Panel */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center relative">
                {step === 5 && generatedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImage.imageUrl}
                    alt={generatedImage.prompt}
                    className="w-full h-full object-contain"
                  />
                ) : step === 5 && isGenerating ? (
                  <div className="text-center p-8">
                    <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/50 text-sm">Creating your image...</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <ImageIcon className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 text-sm">Your image will appear here</p>
                    {step >= 2 && selectedTemplate && (
                      <div className="mt-4 space-y-1">
                        <div className="text-xs text-violet-400">{selectedTemplate.name}</div>
                        {selectedPreset && <div className="text-xs text-white/30">{selectedPreset.name}</div>}
                        <div className="text-xs text-white/20">{aspectRatio} · {RESOLUTION_INFO[resolution].label}</div>
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && generatedImage?.hasWatermark && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-xs text-white/60">
                    Watermarked
                  </div>
                )}
              </div>

              {/* Info panel */}
              {step === 5 && generatedImage && (
                <div className="p-4 border-t border-white/5 text-xs text-white/40 flex items-center justify-between">
                  <span>{RESOLUTION_INFO[resolution].size} · {creditCost} credit{creditCost > 1 ? "s" : ""}</span>
                  <span>ID: {generatedImage.id.slice(0, 8)}</span>
                </div>
              )}
            </div>

            {/* Quick navigation hints */}
            {step < 4 && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/40 space-y-1">
                <div className="font-medium text-white/60 mb-2">How it works</div>
                <div className={step >= 1 ? "text-white/60" : ""}>1. Pick a category</div>
                <div className={step >= 2 ? "text-white/60" : ""}>2. Choose a template</div>
                <div className={step >= 3 ? "text-white/60" : ""}>3. Select a style</div>
                <div className={step >= 4 ? "text-white/60" : ""}>4. Describe your idea</div>
                <div className={step >= 5 ? "text-white/60" : ""}>5. Generate!</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
