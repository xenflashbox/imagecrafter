/**
 * /portraits/create — Portrait Studio Creation Wizard
 * PUBLIC — no authentication required.
 * 3-step client-side wizard with dual-flow (guest + subscriber).
 */

"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────

interface StyleVariant {
  id: string;
  slug: string;
  name: string;
  sampleImageUrl: string;
}

interface StylePack {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  isPremium: boolean;
  thumbnailUrl: string;
  variants: StyleVariant[];
}

type Step = "upload" | "style" | "generate";

// ─── Upload Zone ─────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  preview,
  error,
}: {
  onFile: (file: File) => void;
  preview: string | null;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onFile(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer min-h-[320px] transition-all ${
          dragging
            ? "border-purple-500 bg-purple-50"
            : preview
            ? "border-slate-200 bg-slate-50"
            : "border-slate-300 bg-slate-50 hover:border-purple-400 hover:bg-purple-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {preview ? (
          <>
            <Image src={preview} alt="Your photo" fill className="object-contain rounded-2xl p-2" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl bg-black/40">
              <div className="text-white text-center">
                <p className="text-2xl mb-2">📷</p>
                <p className="text-sm font-medium">Click to change photo</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <div className="text-5xl mb-4">📤</div>
            <p className="text-lg font-semibold text-slate-700 mb-2">Drop your photo here</p>
            <p className="text-sm text-slate-500 mb-4">or click to browse</p>
            <p className="text-xs text-slate-400">JPEG, PNG, or WebP · Max 10MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
          <span className="text-red-500 flex-shrink-0">⚠️</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
        <p className="text-xs text-blue-700">
          <strong>Tips for best results:</strong> Use a well-lit photo with a clear, forward-facing
          subject. Avoid heavy shadows, blur, or very small subjects.
        </p>
      </div>
    </div>
  );
}

// ─── Style Pack Selector ──────────────────────────────────────────────────────

function StylePackSelector({
  packs,
  selectedPack,
  selectedVariant,
  onSelectPack,
  onSelectVariant,
}: {
  packs: StylePack[];
  selectedPack: StylePack | null;
  selectedVariant: StyleVariant | null;
  onSelectPack: (pack: StylePack) => void;
  onSelectVariant: (variant: StyleVariant) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Choose a Style Pack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => { onSelectPack(pack); onSelectVariant(pack.variants[0]); }}
              className={`relative rounded-xl overflow-hidden border-2 text-left transition-all ${
                selectedPack?.id === pack.id
                  ? "border-purple-500 shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="aspect-square bg-slate-100 relative">
                <Image
                  src={pack.thumbnailUrl}
                  alt={pack.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {pack.isPremium && (
                  <div className="absolute top-1.5 right-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    ✨ Pro
                  </div>
                )}
                {selectedPack?.id === pack.id && (
                  <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                    <span className="text-2xl drop-shadow">✅</span>
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{pack.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{pack.tagline}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPack && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Choose a style within {selectedPack.name}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {selectedPack.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => onSelectVariant(variant)}
                className={`relative rounded-lg overflow-hidden border-2 text-left transition-all ${
                  selectedVariant?.id === variant.id
                    ? "border-purple-500 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="aspect-square bg-slate-100 relative">
                  <Image
                    src={variant.sampleImageUrl}
                    alt={variant.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {selectedVariant?.id === variant.id && (
                    <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                      <span className="text-xl drop-shadow">✅</span>
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-[11px] font-medium text-slate-800 truncate">{variant.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preview Section ──────────────────────────────────────────────────────────

function PreviewSection({
  portraitId,
  previewUrl,
  isGenerating,
  error,
  generationStep,
}: {
  portraitId: string | null;
  previewUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  generationStep: string;
}) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
        <div className="relative h-24 w-24">
          <div className="h-24 w-24 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">✨</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 mb-1">Creating your portrait…</p>
          <p className="text-sm text-slate-500">{generationStep}</p>
        </div>
        <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-purple-600 rounded-full animate-pulse w-3/4" />
        </div>
        <p className="text-xs text-slate-400">This usually takes 15–30 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-5xl">😕</div>
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">Generation failed</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="space-y-6">
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          <Image src={previewUrl} alt="Your portrait preview" width={800} height={800} className="w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
              🔒 Watermarked preview — purchase to unlock full resolution
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Love your portrait?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Purchase to remove the watermark and get full 4K resolution — delivered instantly to your email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/portraits/${portraitId}/preview`}
              className="flex-1 text-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 font-semibold text-sm transition-colors"
            >
              ⬇️ Purchase Digital — $14.95
            </Link>
            <Link
              href={`/portraits/${portraitId}/preview`}
              className="flex-1 text-center rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 font-semibold text-sm transition-colors"
            >
              See All Options
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            No account required · Secure checkout · Instant delivery
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ id: Step; label: string; icon: string }> = [
    { id: "upload", label: "Upload", icon: "📷" },
    { id: "style", label: "Style", icon: "🎨" },
    { id: "generate", label: "Preview", icon: "✨" },
  ];
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 flex-1">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 ${active ? "text-purple-600" : done ? "text-green-600" : "text-slate-400"}`}>
              <span className="text-base">{done ? "✅" : step.icon}</span>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${done ? "bg-green-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreatePortraitPage() {
  const [step, setStep] = useState<Step>("upload");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [portraitId, setPortraitId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stylePacks, setStylePacks] = useState<StylePack[]>([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<StylePack | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<StyleVariant | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("Analyzing your photo…");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const stepIdx = step === "upload" ? 0 : step === "style" ? 1 : 2;

  // Upload photo and proceed to style selection
  const handleUploadAndContinue = async () => {
    if (!photoFile) { setUploadError("Please select a photo first."); return; }
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await fetch("/api/portraits/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) { setUploadError(data.error || "Upload failed."); return; }
      setPortraitId(data.portraitId);
      setSessionId(data.sessionId);

      // Load style packs
      setPacksLoading(true);
      const packsRes = await fetch("/api/portraits/style-packs");
      const packsData = await packsRes.json();
      if (packsData.success && packsData.stylePacks.length > 0) {
        setStylePacks(packsData.stylePacks);
        setSelectedPack(packsData.stylePacks[0]);
        setSelectedVariant(packsData.stylePacks[0].variants[0] || null);
      }
      setStep("style");
    } catch {
      setUploadError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
      setPacksLoading(false);
    }
  };

  // Generate portrait
  const handleGenerate = async () => {
    if (!portraitId || !selectedPack || !selectedVariant) return;
    setIsGenerating(true);
    setGenerationError(null);
    setStep("generate");

    const steps = [
      "Analyzing your photo…",
      "Identifying subject features…",
      "Crafting your portrait prompt…",
      "Generating your artwork…",
      "Applying finishing touches…",
    ];
    let si = 0;
    const interval = setInterval(() => { si = (si + 1) % steps.length; setGenerationStep(steps[si]); }, 4000);

    try {
      const res = await fetch("/api/portraits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portraitId,
          stylePackSlug: selectedPack.slug,
          styleVariantSlug: selectedVariant.slug,
          sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setGenerationError(data.error || "Generation failed. Please try with a different photo or style.");
        return;
      }
      setPreviewUrl(data.previewImageUrl);
    } catch {
      setGenerationError("Network error during generation. Please try again.");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/portraits" className="text-sm text-slate-500 hover:text-slate-700">
              ← Style Gallery
            </Link>
            <span className="text-sm font-medium text-slate-600">Step {stepIdx + 1} of 3</span>
          </div>
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload your photo</h1>
              <p className="text-slate-600">Choose a clear photo of your subject — pet, person, couple, or family.</p>
            </div>
            <UploadZone onFile={(f) => { setPhotoFile(f); setUploadError(null); setPhotoPreview(URL.createObjectURL(f)); }} preview={photoPreview} error={uploadError} />
            <button
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 text-base transition-colors flex items-center justify-center gap-2"
              onClick={handleUploadAndContinue}
              disabled={!photoFile || isUploading}
            >
              {isUploading ? (
                <><span className="animate-spin">⟳</span> Uploading…</>
              ) : (
                <>Continue to Style Selection →</>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Style */}
        {step === "style" && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              {photoPreview && (
                <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                  <Image src={photoPreview} alt="Your photo" fill className="object-cover" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Choose your style</h1>
                <p className="text-slate-600">Select a style pack, then a specific style variant.</p>
              </div>
            </div>

            {packsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
              </div>
            ) : (
              <StylePackSelector
                packs={stylePacks}
                selectedPack={selectedPack}
                selectedVariant={selectedVariant}
                onSelectPack={setSelectedPack}
                onSelectVariant={setSelectedVariant}
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 text-sm transition-colors"
              >
                ← Change Photo
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedPack || !selectedVariant}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 text-sm transition-colors"
              >
                ✨ Generate Portrait
              </button>
            </div>
            <p className="text-center text-xs text-slate-400">Free watermarked preview. Purchase to unlock full resolution.</p>
          </div>
        )}

        {/* Step 3: Generate/Preview */}
        {step === "generate" && (
          <div className="space-y-6">
            {!isGenerating && !generationError && previewUrl && (
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Your portrait is ready!</h1>
                <p className="text-slate-600">Purchase to download the full-resolution version without the watermark.</p>
              </div>
            )}
            <PreviewSection
              portraitId={portraitId}
              previewUrl={previewUrl}
              isGenerating={isGenerating}
              error={generationError}
              generationStep={generationStep}
            />
            {generationError && (
              <div className="flex gap-3">
                <button onClick={() => setStep("style")} className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 text-sm transition-colors">
                  ← Different Style
                </button>
                <button onClick={() => setStep("upload")} className="flex-1 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 text-sm transition-colors">
                  Change Photo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
