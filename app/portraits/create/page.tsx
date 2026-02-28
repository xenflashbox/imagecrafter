/**
 * /portraits/create — Portrait Studio Creation Wizard
 *
 * PUBLIC PAGE — no authentication required.
 * 3-step client-side wizard:
 *   Step 1: Upload photo → validate → create portrait record
 *   Step 2: Choose Style Pack + Variant
 *   Step 3: Generate → show watermarked preview + purchase CTA
 *
 * DUAL-FLOW: Same page for guests (sessionId cookie) and subscribers (Clerk).
 * Auth state is detected at generation time; purchase flow handles the rest.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Camera,
  Palette,
  Lock,
} from "lucide-react";

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
  category: string;
  thumbnailUrl: string;
  isPremium: boolean;
  variants: StyleVariant[];
}

type Step = "upload" | "style" | "generate";

// ─── Upload Zone Component ──────────────────────────────────────────────────

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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  return (
    <div className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer min-h-[320px] ${
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
            <Image
              src={preview}
              alt="Your uploaded photo"
              fill
              className="object-contain rounded-2xl p-2"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl bg-black/40">
              <div className="text-white text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to change photo</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-700 mb-2">
              Drop your photo here
            </p>
            <p className="text-sm text-slate-500 mb-4">or click to browse</p>
            <p className="text-xs text-slate-400">
              JPEG, PNG, or WebP · Max 10MB · Min 512×512
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
        <p className="text-xs text-blue-700">
          <strong>Tips for best results:</strong> Use a well-lit photo with a clear,
          forward-facing subject. Avoid heavy shadows, blur, or very small subjects.
        </p>
      </div>
    </div>
  );
}

// ─── Style Pack Selector ───────────────────────────────────────────────────

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
      {/* Pack grid */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Choose a Style Pack
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => { onSelectPack(pack); onSelectVariant(pack.variants[0]); }}
              className={`relative rounded-xl overflow-hidden border-2 text-left transition-all ${
                selectedPack?.id === pack.id
                  ? "border-purple-500 shadow-md shadow-purple-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="aspect-square bg-slate-100 relative">
                <Image
                  src={pack.thumbnailUrl}
                  alt={pack.name}
                  fill
                  className="object-cover"
                  onError={() => {}}
                />
                {pack.isPremium && (
                  <div className="absolute top-1.5 right-1.5">
                    <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      Pro
                    </Badge>
                  </div>
                )}
                {selectedPack?.id === pack.id && (
                  <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white drop-shadow" />
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

      {/* Variant selector */}
      {selectedPack && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Choose a Style within {selectedPack.name}
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
                    onError={() => {}}
                  />
                  {selectedVariant?.id === variant.id && (
                    <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white drop-shadow" />
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

// ─── Preview Section ───────────────────────────────────────────────────────

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
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin" />
          <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-purple-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900 mb-1">Creating your portrait…</p>
          <p className="text-sm text-slate-500">{generationStep}</p>
        </div>
        <div className="w-64">
          <Progress value={undefined} className="h-2 animate-pulse" />
        </div>
        <p className="text-xs text-slate-400">This usually takes 15-30 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold text-slate-900 mb-2">Generation failed</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="space-y-6">
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          <Image
            src={previewUrl}
            alt="Your portrait preview (watermarked)"
            width={800}
            height={800}
            className="w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
              <Lock className="h-4 w-4" />
              Watermarked preview — purchase to unlock full resolution
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Love your portrait?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Purchase to remove the watermark and get full 4K resolution — delivered
            instantly to your email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              asChild
            >
              <Link href={`/portraits/${portraitId}/preview`}>
                <Download className="mr-2 h-4 w-4" />
                Purchase Digital — $14.95
              </Link>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <Link href={`/portraits/${portraitId}/preview`}>
                See All Options
              </Link>
            </Button>
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

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CreatePortraitPage() {
  const router = useRouter();
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

  // Step progress
  const stepIndex = step === "upload" ? 0 : step === "style" ? 1 : 2;
  const progressPercent = (stepIndex / 2) * 100;

  // ── Handle photo selection ─────────────────────────────────────────
  const handlePhotoSelected = (file: File) => {
    setPhotoFile(file);
    setUploadError(null);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  // ── Upload photo and proceed to style step ─────────────────────────
  const handleUploadAndContinue = async () => {
    if (!photoFile) {
      setUploadError("Please select a photo first.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("photo", photoFile);

      const res = await fetch("/api/portraits/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data.error || "Upload failed. Please try again.");
        return;
      }

      setPortraitId(data.portraitId);
      setSessionId(data.sessionId);

      // Load style packs
      setPacksLoading(true);
      const packsRes = await fetch("/api/portraits/style-packs");
      const packsData = await packsRes.json();
      if (packsData.success) {
        setStylePacks(packsData.stylePacks);
        if (packsData.stylePacks.length > 0) {
          setSelectedPack(packsData.stylePacks[0]);
          setSelectedVariant(packsData.stylePacks[0].variants[0] || null);
        }
      }

      setStep("style");
    } catch (err) {
      setUploadError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
      setPacksLoading(false);
    }
  };

  // ── Generate portrait ──────────────────────────────────────────────
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

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx = (stepIdx + 1) % steps.length;
      setGenerationStep(steps[stepIdx]);
    }, 4000);

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
        setGenerationError(
          data.error || "Generation failed. Please try with a different photo or style."
        );
        return;
      }

      setPreviewUrl(data.previewImageUrl);
    } catch {
      setGenerationError("Network error during generation. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Progress header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/portraits" className="text-sm text-slate-500 hover:text-slate-700">
              ← Style Gallery
            </Link>
            <span className="text-sm font-medium text-slate-600">
              Step {stepIndex + 1} of 3
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: "Upload", icon: Camera },
              { label: "Style", icon: Palette },
              { label: "Preview", icon: Sparkles },
            ].map((s, i) => {
              const Icon = s.icon;
              const isDone = i < stepIndex;
              const isActive = i === stepIndex;
              return (
                <div key={s.label} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-1.5 ${isActive ? "text-purple-600" : isDone ? "text-green-600" : "text-slate-400"}`}>
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 rounded ${isDone ? "bg-green-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {step === "upload" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Upload your photo</h1>
              <p className="text-slate-600">
                Choose a clear photo of your subject — pet, person, couple, or family.
              </p>
            </div>
            <UploadZone
              onFile={handlePhotoSelected}
              preview={photoPreview}
              error={uploadError}
            />
            <Button
              size="lg"
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleUploadAndContinue}
              disabled={!photoFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  Continue to Style Selection
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}

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
                <p className="text-slate-600">
                  Select a style pack, then a specific style variant.
                </p>
              </div>
            </div>

            {packsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="flex-1"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleGenerate}
                disabled={!selectedPack || !selectedVariant}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate Portrait
              </Button>
            </div>

            <p className="text-center text-xs text-slate-400">
              Free watermarked preview. Purchase to unlock full resolution.
            </p>
          </div>
        )}

        {step === "generate" && (
          <div className="space-y-6">
            {!isGenerating && !generationError && previewUrl && (
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Your portrait is ready!</h1>
                <p className="text-slate-600">
                  Here's your watermarked preview. Purchase to download the full-resolution version.
                </p>
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
                <Button variant="outline" className="flex-1" onClick={() => setStep("style")}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Try Different Style
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setStep("upload")}>
                  Change Photo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Missing import
function Download(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
