/**
 * /portraits/create — Portrait Studio Creation Wizard
 * PUBLIC — no authentication required.
 * 3-step client-side wizard with dual-flow (guest + subscriber).
 */

"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Download,
  Loader2,
  Lock,
  LogIn,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

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
  thumbnailUrl: string;
  variants: StyleVariant[];
}

type Step = "upload" | "style" | "generate";

// Height of the fixed SiteHeader (py-4 + a size-8 wordmark + hairline border).
const CHROME_OFFSET = "65px";

// ─── Photo normalization ─────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PICK_BYTES = 25 * 1024 * 1024;
const DOWNSCALE_TRIGGER_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_EDGE_PX = 2048;

/**
 * Shrink oversized photos in the browser before they are uploaded.
 *
 * The photo goes straight to R2, so size is no longer a platform limit — this is
 * about the seconds a customer waits on a phone connection. 2048px is well above
 * what the analysis and swap legs consume, so it costs nothing in the delivered
 * portrait.
 */
async function normalizePhoto(file: File): Promise<File> {
  if (file.size <= DOWNSCALE_TRIGGER_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    // Applies EXIF rotation, so portrait-orientation phone photos are analyzed upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  const scale = Math.min(
    1,
    MAX_UPLOAD_EDGE_PX / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) throw new Error("encode failed");

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

// ─── Shared controls ─────────────────────────────────────────────────────────

function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 [&_svg]:size-4 ${className}`}
    >
      {children}
    </button>
  );
}

function QuietButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-rim bg-surface px-4 font-semibold text-ink-muted transition-colors hover:border-rim-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4 ${className}`}
    >
      {children}
    </button>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "info" | "danger";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const rim = tone === "danger" ? "border-danger" : "border-rim";
  const ink = tone === "danger" ? "text-danger" : "text-ink-subtle";
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${rim} bg-surface p-3`}>
      <span className={`mt-px flex-shrink-0 ${ink} [&_svg]:size-4`}>{icon}</span>
      <div className="text-xs leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}

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
    if (file) onFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
          dragging
            ? "border-accent bg-accent-soft"
            : preview
            ? "border-rim bg-surface"
            : "border-rim bg-surface hover:border-accent-rim"
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
            <Image src={preview} alt="Your photo" fill className="rounded-2xl object-contain p-2" />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 transition-opacity hover:opacity-100">
              <div className="flex flex-col items-center gap-2 text-white">
                <Camera className="size-6" />
                <p className="text-sm font-medium">Click to change photo</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-accent-soft ring-1 ring-accent-rim">
              <Upload className="size-5 text-accent" />
            </div>
            <p className="text-lg font-semibold text-ink">Drop your photo here</p>
            <p className="text-sm text-ink-subtle">or click to browse</p>
            <p className="text-xs text-ink-faint">
              JPEG, PNG, or WebP · Large photos are resized automatically
            </p>
          </div>
        )}
      </div>

      {error && (
        <Notice tone="danger" icon={<AlertTriangle />}>
          {error}
        </Notice>
      )}

      {/* The pipeline hard-rejects multi-subject photos. Say so here rather than
          letting the customer discover it as a failed generation. */}
      <Notice tone="info" icon={<UserRound />}>
        <strong className="font-semibold text-ink">One subject per portrait.</strong>{" "}
        A single person or a single pet — group photos of couples or families are
        declined by the studio. Use a well-lit, forward-facing photo and avoid heavy
        shadows, blur, or very small subjects.
      </Notice>
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
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">Choose a Style Pack</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {packs.map((pack) => {
            const active = selectedPack?.id === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => { onSelectPack(pack); onSelectVariant(pack.variants[0]); }}
                className={`relative overflow-hidden rounded-xl border text-left transition-all ${
                  active
                    ? "border-accent shadow-[0_12px_32px_-16px_var(--accent)]"
                    : "border-rim hover:border-rim-strong"
                }`}
              >
                <div className="relative aspect-square bg-surface-raised">
                  <Image
                    src={pack.thumbnailUrl}
                    alt={pack.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-white">
                        <Check className="size-4" />
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-surface p-2">
                  <p className="truncate text-xs font-semibold text-ink">{pack.name}</p>
                  <p className="truncate text-[10px] text-ink-subtle">{pack.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedPack && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">
            Choose a style within {selectedPack.name}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {selectedPack.variants.map((variant) => {
              const active = selectedVariant?.id === variant.id;
              return (
                <button
                  key={variant.id}
                  onClick={() => onSelectVariant(variant)}
                  className={`relative overflow-hidden rounded-lg border text-left transition-all ${
                    active ? "border-accent" : "border-rim hover:border-rim-strong"
                  }`}
                >
                  <div className="relative aspect-square bg-surface-raised">
                    <Image
                      src={variant.sampleImageUrl}
                      alt={variant.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white">
                          <Check className="size-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="bg-surface p-1.5">
                    <p className="truncate text-[11px] font-medium text-ink">{variant.name}</p>
                  </div>
                </button>
              );
            })}
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
  onRegenerate,
  onChangeStyle,
  onNewPhoto,
  onSaveToAccount,
  isAuthenticated,
  isSaved,
  isSaving,
  saveError,
}: {
  portraitId: string | null;
  previewUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  generationStep: string;
  onRegenerate?: () => void;
  onChangeStyle?: () => void;
  onNewPhoto?: () => void;
  onSaveToAccount?: () => void;
  isAuthenticated?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}) {
  if (isGenerating) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
        <div className="relative size-24">
          <div className="size-24 animate-spin rounded-full border-4 border-rim border-t-accent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="size-6 text-accent" />
          </span>
        </div>
        <div className="text-center">
          <p className="mb-1 font-display text-xl text-ink">Creating your portrait…</p>
          <p className="text-sm text-ink-subtle">{generationStep}</p>
        </div>
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-gradient-to-r from-accent to-accent-2" />
        </div>
        <p className="text-xs text-ink-faint">This usually takes 15–30 seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-5">
        <div className="flex size-12 items-center justify-center rounded-full border border-danger">
          <AlertTriangle className="size-5 text-danger" />
        </div>
        <div className="max-w-sm text-center">
          <p className="mb-2 font-display text-xl text-ink">Generation failed</p>
          <p className="text-sm text-ink-muted">{error}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {onRegenerate && (
            <PrimaryButton onClick={onRegenerate} className="py-2 text-sm">
              <RefreshCw /> Try Again
            </PrimaryButton>
          )}
          {onChangeStyle && (
            <QuietButton onClick={onChangeStyle} className="py-2 text-sm">
              <Palette /> Different Style
            </QuietButton>
          )}
          {onNewPhoto && (
            <QuietButton onClick={onNewPhoto} className="py-2 text-sm">
              <Camera /> New Photo
            </QuietButton>
          )}
        </div>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="flex flex-col gap-6">
        <div className="artframe relative">
          <Image
            src={previewUrl}
            alt="Your portrait preview"
            width={800}
            height={800}
            className="w-full"
          />
          <div className="absolute inset-x-4 bottom-4 z-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs text-white backdrop-blur">
              <Lock className="size-3.5" />
              Watermarked preview — purchase to unlock full resolution
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-2">
          {onRegenerate && (
            <QuietButton onClick={onRegenerate} className="py-2 text-sm">
              <RefreshCw /> Regenerate
            </QuietButton>
          )}
          {onChangeStyle && (
            <QuietButton onClick={onChangeStyle} className="py-2 text-sm">
              <Palette /> Change Style
            </QuietButton>
          )}
          {onNewPhoto && (
            <QuietButton onClick={onNewPhoto} className="py-2 text-sm">
              <Camera /> New Photo
            </QuietButton>
          )}
          {onSaveToAccount && (
            <QuietButton
              onClick={onSaveToAccount}
              disabled={isSaved || isSaving}
              className={`py-2 text-sm ${isSaved ? "!text-positive" : ""}`}
            >
              {isSaving ? (
                <><Loader2 className="animate-spin" /> Saving…</>
              ) : isSaved ? (
                <><Check /> Saved</>
              ) : isAuthenticated ? (
                <><Download /> Save to Account</>
              ) : (
                <><LogIn /> Sign In to Save</>
              )}
            </QuietButton>
          )}
        </div>
        {saveError && (
          <Notice tone="danger" icon={<AlertTriangle />}>
            {saveError}
          </Notice>
        )}
        <p className="text-center text-xs text-ink-faint">
          Regenerate for a different version · Change style or photo to start fresh
        </p>

        <div className="rounded-2xl border border-accent-rim bg-surface p-6">
          <h3 className="mb-1 font-display text-xl text-ink">Love your portrait?</h3>
          <p className="mb-4 text-sm text-ink-muted">
            Purchase to remove the watermark and get full 4K resolution — delivered
            instantly to your email.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/portraits/${portraitId}/preview`}
              className="flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:brightness-110"
            >
              Purchase Digital — $29.95
            </Link>
            <Link
              href={`/portraits/${portraitId}/preview`}
              className="flex-1 rounded-xl border border-rim px-4 py-3 text-center text-sm font-semibold text-ink-muted transition-colors hover:border-rim-strong hover:text-ink"
            >
              See All Options
            </Link>
          </div>
          <p className="mt-3 text-center text-xs text-ink-faint">
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
  const steps: Array<{ id: Step; label: string; icon: typeof Camera }> = [
    { id: "upload", label: "Upload", icon: Camera },
    { id: "style", label: "Style", icon: Palette },
    { id: "generate", label: "Preview", icon: Sparkles },
  ];
  const idx = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex flex-1 items-center gap-2">
      {steps.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        const Icon = done ? Check : step.icon;
        return (
          <div key={step.id} className="flex flex-1 items-center gap-2">
            <div
              className={`flex items-center gap-1.5 ${
                active ? "text-accent" : done ? "text-positive" : "text-ink-faint"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden text-xs font-medium sm:block">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px flex-1 rounded ${done ? "bg-positive" : "bg-rim"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CreatePortraitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();

  const [step, setStep] = useState<Step>("upload");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [portraitId, setPortraitId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stylePacks, setStylePacks] = useState<StylePack[]>([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<StylePack | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<StyleVariant | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("Analyzing your photo…");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stepIdx = step === "upload" ? 0 : step === "style" ? 1 : 2;

  /**
   * Load the style catalog.
   *
   * Every exit surfaces: an empty catalog used to leave `stylePacks` as `[]`
   * with no error, which is what produced a "Choose a Style Pack" heading over
   * an empty grid — and left `handleRetry` selecting from an empty array.
   */
  const loadStylePacks = useCallback(async () => {
    setPacksLoading(true);
    setPacksError(null);
    try {
      const packsRes = await fetch("/api/portraits/style-packs");
      const packsData = await packsRes.json().catch(() => ({}));

      if (!packsRes.ok || !packsData.success) {
        setPacksError(
          packsData.error || `We couldn't load the style catalog (HTTP ${packsRes.status}).`
        );
        return;
      }
      if (!packsData.stylePacks?.length) {
        setPacksError("No styles are available right now. Please try again shortly.");
        return;
      }

      setStylePacks(packsData.stylePacks);
      setSelectedPack(packsData.stylePacks[0]);
      setSelectedVariant(packsData.stylePacks[0].variants[0] || null);
    } catch {
      setPacksError("Network error loading styles. Please check your connection and try again.");
    } finally {
      setPacksLoading(false);
    }
  }, []);

  // Restore session state from sessionStorage on mount
  useEffect(() => {
    const savedPortraitId = searchParams.get("portraitId") || sessionStorage.getItem("ic_portraitId");
    const savedSessionId = sessionStorage.getItem("ic_sessionId");
    const savedPreviewUrl = sessionStorage.getItem("ic_previewUrl");
    const savedSourceUrl = sessionStorage.getItem("ic_sourceUrl");

    if (savedPortraitId && savedPreviewUrl) {
      setPortraitId(savedPortraitId);
      setSessionId(savedSessionId);
      setPreviewUrl(savedPreviewUrl);
      setPhotoPreview(savedSourceUrl);
      setStep("generate");
      // Restoring straight to the preview still needs the catalog: "Change Style"
      // and "Regenerate" both read from it.
      loadStylePacks();
    } else if (savedPortraitId && savedSourceUrl) {
      setPortraitId(savedPortraitId);
      setSessionId(savedSessionId);
      setPhotoPreview(savedSourceUrl);
      loadStylePacks().then(() => setStep("style"));
    }
  }, [searchParams, loadStylePacks]);

  // Save session state to sessionStorage when it changes
  useEffect(() => {
    if (portraitId) sessionStorage.setItem("ic_portraitId", portraitId);
    if (sessionId) sessionStorage.setItem("ic_sessionId", sessionId);
    if (previewUrl) sessionStorage.setItem("ic_previewUrl", previewUrl);
    if (photoPreview) sessionStorage.setItem("ic_sourceUrl", photoPreview);
  }, [portraitId, sessionId, previewUrl, photoPreview]);

  // Handle retry/change style - go back to style selection, keep the uploaded photo
  // Clears preview URL so regeneration creates a fresh version
  const handleRetry = () => {
    setGenerationError(null);
    setPreviewUrl(null);
    setIsSaved(false);
    sessionStorage.removeItem("ic_previewUrl");
    setStep("style");
    if (stylePacks.length === 0) {
      loadStylePacks();
      return;
    }
    // Reset selected style to force user to pick again
    setSelectedPack(stylePacks[0]);
    setSelectedVariant(stylePacks[0].variants[0] || null);
  };

  // Clear all session data and start fresh
  const handleStartOver = () => {
    // Clear sessionStorage FIRST
    sessionStorage.removeItem("ic_portraitId");
    sessionStorage.removeItem("ic_sessionId");
    sessionStorage.removeItem("ic_previewUrl");
    sessionStorage.removeItem("ic_sourceUrl");

    // Replace URL immediately (before state changes trigger re-renders)
    // Using window.location for a clean navigation that won't restore state
    window.location.href = "/portraits/create";
  };

  // Validate the picked file up front so bad picks fail visibly, not silently
  const handlePickPhoto = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setUploadError("That file type isn't supported. Please choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (f.size > MAX_PICK_BYTES) {
      setUploadError(
        `That photo is ${(f.size / 1024 / 1024).toFixed(1)}MB. Please choose one under 25MB.`
      );
      return;
    }
    setPhotoFile(f);
    setUploadError(null);
    setPhotoPreview(URL.createObjectURL(f));
  };

  // Upload photo and proceed to style selection
  const handleUploadAndContinue = async () => {
    if (!photoFile) { setUploadError("Please select a photo first."); return; }
    setIsUploading(true);
    setUploadError(null);
    try {
      let upload: File;
      try {
        upload = await normalizePhoto(photoFile);
      } catch {
        setUploadError("We couldn't read that photo. Please try a different JPEG, PNG, or WebP.");
        return;
      }

      const ticketRes = await fetch("/api/portraits/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: upload.type, sizeBytes: upload.size }),
      });
      const ticket: {
        success?: boolean;
        error?: string;
        portraitId?: string;
        sessionId?: string;
        key?: string;
        uploadUrl?: string;
      } = await ticketRes.json().catch(() => ({}));

      if (!ticketRes.ok || !ticket.success || !ticket.uploadUrl || !ticket.key) {
        setUploadError(
          ticket.error || `Upload failed (HTTP ${ticketRes.status}). Please try again.`
        );
        return;
      }

      const putRes = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": upload.type },
        body: upload,
      });
      if (!putRes.ok) {
        setUploadError("We couldn't upload your photo. Please try again.");
        return;
      }

      const confirmRes = await fetch("/api/portraits/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portraitId: ticket.portraitId, key: ticket.key }),
      });
      const data: { success?: boolean; error?: string; portraitId?: string; sessionId?: string } =
        await confirmRes.json().catch(() => ({}));

      if (!confirmRes.ok || !data.success) {
        setUploadError(
          data.error || `Upload failed (HTTP ${confirmRes.status}). Please try again.`
        );
        return;
      }
      if (!data.portraitId || !data.sessionId) {
        setUploadError("Upload succeeded but the response was incomplete. Please try again.");
        return;
      }
      setPortraitId(data.portraitId);
      setSessionId(data.sessionId);

      // Update URL with portraitId for session persistence
      router.replace(`/portraits/create?portraitId=${data.portraitId}`, { scroll: false });

      // Load style packs
      await loadStylePacks();
      setStep("style");
    } catch {
      setUploadError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
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

  // Regenerate - same style, new generation
  const handleRegenerate = async () => {
    if (!portraitId || !selectedPack || !selectedVariant) return;
    // Clear preview and regenerate
    setPreviewUrl(null);
    setIsSaved(false);
    sessionStorage.removeItem("ic_previewUrl");
    await handleGenerate();
  };

  // Save portrait to user account
  const handleSaveToAccount = async () => {
    if (!portraitId || !sessionId) return;

    if (!isSignedIn) {
      // Redirect to sign in with return URL
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/portraits/create?portraitId=${portraitId}`)}`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/portraits/${portraitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSaved(true);
        setSaveError(null);
      } else {
        console.error("Failed to save portrait:", data.error);
        setSaveError("Failed to save your portrait. Please try again.");
      }
    } catch (err) {
      console.error("Error saving portrait:", err);
      setSaveError("Failed to save your portrait. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader
        cta={
          <span className="text-xs font-medium tabular-nums text-ink-subtle">
            Step {stepIdx + 1} of 3
          </span>
        }
      />

      {/* Progress rail — sits directly under the fixed site chrome */}
      <div
        className="chrome-veil sticky z-40 border-b border-rim"
        style={{ top: CHROME_OFFSET, marginTop: CHROME_OFFSET }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-3">
          <Link
            href="/portraits"
            className="flex items-center gap-1.5 text-xs text-ink-subtle transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Style Gallery</span>
          </Link>
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="mb-1 font-display text-3xl tracking-tight text-ink">
                Upload your photo
              </h1>
              <p className="text-sm text-ink-muted">
                One clear photo of your subject. We&apos;ll paint them into the era you choose.
              </p>
            </div>
            <UploadZone onFile={handlePickPhoto} preview={photoPreview} error={uploadError} />
            <PrimaryButton
              className="w-full py-4 text-base"
              onClick={handleUploadAndContinue}
              disabled={!photoFile || isUploading}
            >
              {isUploading ? (
                <><Loader2 className="animate-spin" /> Uploading…</>
              ) : (
                <>Continue to Style Selection <ArrowRight /></>
              )}
            </PrimaryButton>
          </div>
        )}

        {/* Step 2: Style */}
        {step === "style" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              {photoPreview && (
                <div className="relative size-16 flex-shrink-0 overflow-hidden rounded-lg border border-rim">
                  <Image src={photoPreview} alt="Your photo" fill className="object-cover" />
                </div>
              )}
              <div>
                <h1 className="mb-1 font-display text-3xl tracking-tight text-ink">
                  Choose your style
                </h1>
                <p className="text-sm text-ink-muted">
                  Select a style pack, then a specific style within it.
                </p>
              </div>
            </div>

            {packsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-accent" />
              </div>
            ) : packsError ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-rim bg-surface py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-full border border-danger">
                  <AlertTriangle className="size-5 text-danger" />
                </div>
                <div className="max-w-xs">
                  <p className="mb-1 font-semibold text-ink">Styles didn&apos;t load</p>
                  <p className="text-sm text-ink-muted">{packsError}</p>
                </div>
                <QuietButton onClick={loadStylePacks} className="py-2 text-sm">
                  <RefreshCw /> Retry
                </QuietButton>
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
              <QuietButton onClick={() => setStep("upload")} className="flex-1 py-3 text-sm">
                <ArrowLeft /> Change Photo
              </QuietButton>
              <PrimaryButton
                onClick={handleGenerate}
                disabled={!selectedPack || !selectedVariant}
                className="flex-1 py-3 text-sm"
              >
                <Sparkles /> Generate Portrait
              </PrimaryButton>
            </div>
            <p className="text-center text-xs text-ink-faint">
              Free watermarked preview. Purchase to unlock full resolution.
            </p>
          </div>
        )}

        {/* Step 3: Generate/Preview */}
        {step === "generate" && (
          <div className="flex flex-col gap-6">
            {!isGenerating && !generationError && previewUrl && (
              <div>
                <h1 className="mb-1 font-display text-3xl tracking-tight text-ink">
                  Your portrait is ready
                </h1>
                <p className="text-sm text-ink-muted">
                  Purchase to download the full-resolution version without the watermark.
                </p>
              </div>
            )}
            <PreviewSection
              portraitId={portraitId}
              previewUrl={previewUrl}
              isGenerating={isGenerating}
              error={generationError}
              generationStep={generationStep}
              onRegenerate={handleRegenerate}
              onChangeStyle={handleRetry}
              onNewPhoto={handleStartOver}
              onSaveToAccount={handleSaveToAccount}
              isAuthenticated={isSignedIn}
              isSaved={isSaved}
              isSaving={isSaving}
              saveError={saveError}
            />
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function CreatePortraitPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2 className="size-10 animate-spin text-accent" />
      </div>
    }>
      <CreatePortraitContent />
    </Suspense>
  );
}
