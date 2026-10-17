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
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { ShareButtons } from "@/components/share-buttons";
import { Turnstile } from "@/components/turnstile";
import { PORTRAIT_STAGES, STAGE_LABELS, type PortraitStage } from "@/lib/portrait-stages";
import { subscribeToProgress } from "@/lib/portrait-progress-client";
import { trackEvent } from "@/lib/analytics-client";

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

interface PortraitStatus {
  id: string;
  status: string;
  previewImageUrl: string | null;
  sourceImageUrl?: string;
  stylePackSlug: string;
  styleVariantSlug: string;
  errorMessage: string | null;
  isSavedToAccount?: boolean;
}

const PORTRAIT_ID_KEY = "ic_portraitId";
const PREVIEW_URL_KEY = "ic_previewUrl";
const SOURCE_URL_KEY = "ic_sourceUrl";
const PROCESSING_STATUSES = new Set(["queued", "analyzing", "generating"]);

type Step = "upload" | "style" | "generate";

// Height of the fixed SiteHeader (py-4 + a size-8 wordmark + hairline border).
const CHROME_OFFSET = "69px";

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
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 font-semibold text-canvas transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100 [&_svg]:size-4 ${className}`}
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
            <p className="text-lg font-semibold text-ink">Drop their photo here</p>
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
        A single person or a single pet — we paint one at a time, so couples and
        family photos will not work. Beyond that, what matters is that their face
        is visible and roughly facing the camera. Phone snapshots, scans of
        prints, and screenshots all work.
      </Notice>
    </div>
  );
}

// ─── Style Pack Selector ──────────────────────────────────────────────────────

// A style only carries imagery once a real pipeline output for it exists on R2,
// so most tiles render name-only until their example is generated.
function StyleThumb({ src, name }: { src: string; name: string }) {
  if (!src) {
    return (
      <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface-raised to-surface p-2">
        <span className="text-center text-xs font-medium leading-tight text-ink-subtle">
          {name}
        </span>
      </div>
    );
  }
  return <Image src={src} alt={name} fill className="object-cover" unoptimized />;
}

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
                  <StyleThumb src={pack.thumbnailUrl} name={pack.name} />
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-canvas">
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
                    <StyleThumb src={variant.sampleImageUrl} name={variant.name} />
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
                        <span className="flex size-6 items-center justify-center rounded-full bg-accent text-canvas">
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

/**
 * What the visitor sees when the preview gate refuses.
 *
 * The refusal arrives BEFORE any generation has run, so nothing has been spent
 * and nothing is being withheld — the ask is for the next portrait, not for the
 * one they already have. The copy is written that way on purpose.
 */
function PreviewGatePanel({
  code,
  message,
  portraitId,
  onSubmitCaptcha,
  onCaptchaToken,
  captchaReady,
  onChangeStyle,
}: {
  code: string;
  message: string | null;
  portraitId: string | null;
  onSubmitCaptcha: () => void;
  onCaptchaToken: (token: string | null) => void;
  captchaReady: boolean;
  onChangeStyle?: () => void;
}) {
  const isAccount = code === "account_required";
  const isCaptcha = code === "captcha_required" || code === "captcha_failed";
  const returnTo = `/portraits/create${portraitId ? `?portraitId=${portraitId}` : ""}`;

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-5">
      <div className="flex size-12 items-center justify-center rounded-full border border-rim">
        {isAccount ? (
          <LogIn className="size-5 text-accent" />
        ) : (
          <ShieldCheck className="size-5 text-accent" />
        )}
      </div>

      <div className="max-w-sm text-center">
        <p className="mb-2 font-display text-xl text-ink">
          {isAccount
            ? "Save your work and keep creating"
            : isCaptcha
            ? "Quick check"
            : "That's the limit for today"}
        </p>
        <p className="text-sm text-ink-muted">
          {isAccount
            ? "Sign in with Google or Facebook so every finished portrait and in-progress job follows you to your account."
            : message}
        </p>
      </div>

      {isAccount && (
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-canvas transition-opacity hover:opacity-90"
        >
          <LogIn className="size-4" /> Continue with an account
        </Link>
      )}

      {isCaptcha && (
        <div className="flex flex-col items-center gap-3">
          <Turnstile onToken={onCaptchaToken} />
          <PrimaryButton
            onClick={onSubmitCaptcha}
            disabled={!captchaReady}
            className="py-2 text-sm"
          >
            <RefreshCw /> Continue
          </PrimaryButton>
        </div>
      )}

      {!isAccount && !isCaptcha && (
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/portraits">
            <QuietButton className="py-2 text-sm">
              <Palette /> Browse Styles
            </QuietButton>
          </Link>
          {onChangeStyle && (
            <QuietButton onClick={onChangeStyle} className="py-2 text-sm">
              <ArrowLeft /> Back
            </QuietButton>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * What the wizard knows about the run. `stage` is null until the pipeline
 * reports its first boundary — nothing here is ever inferred from a timer.
 */
type ProgressState = {
  stage: PortraitStage | null;
  note: string | null;
  /** Value of generationElapsedMs when the current stage began. */
  stageAtMs: number;
};

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The waiting screen.
 *
 * Every completed row is a boundary the pipeline actually crossed; the active
 * row carries its own timer. When the progress feed says nothing — it is
 * unreachable, or the run has not reached its first boundary — this degrades
 * to the elapsed clock rather than inventing a stage.
 */
function GenerationProgress({
  generationElapsedMs,
  progress,
}: {
  generationElapsedMs: number;
  progress: ProgressState;
}) {
  const currentIdx = progress.stage ? PORTRAIT_STAGES.indexOf(progress.stage) : -1;
  const overall = mmss(generationElapsedMs);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 py-8">
      <div className="relative size-16">
        <div className="size-16 animate-spin rounded-full border-4 border-rim border-t-accent" />
        <span className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="size-5 text-accent" />
        </span>
      </div>

      <div className="max-w-sm text-center">
        <p className="mb-1 font-display text-xl text-ink">Creating your portrait…</p>
        <p className="text-sm leading-relaxed text-ink-muted">
          Most take 4–6 minutes. You can lock your phone, switch apps, or leave
          this page. Your portrait keeps running and will be restored when you return.
        </p>
        <Link
          href="/gallery"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <Palette className="size-4" /> Browse the gallery while you wait
        </Link>
      </div>

      {currentIdx === -1 ? (
        <p className="font-display text-2xl tabular-nums text-ink-subtle">{overall}</p>
      ) : (
        <ol className="w-full max-w-sm">
          {PORTRAIT_STAGES.map((stage, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li
                key={stage}
                className="flex items-baseline gap-3 border-b border-rim py-2 last:border-0"
              >
                <span className="flex w-4 shrink-0 justify-center self-center">
                  {done ? (
                    <Check className="size-4 text-positive" />
                  ) : active ? (
                    <Loader2 className="size-4 animate-spin text-accent" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-rim" />
                  )}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    active ? "text-ink" : done ? "text-ink-muted" : "text-ink-faint"
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
                {active && (
                  <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
                    {mmss(generationElapsedMs - progress.stageAtMs)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* A real complication the pipeline reported — a retry, a short render.
          Never decoration: the server only sends this when something happened. */}
      {progress.note && (
        <p className="flex max-w-sm items-start gap-2 text-center text-xs text-ink-muted">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span className="text-left">{progress.note}</span>
        </p>
      )}

      {currentIdx !== -1 && (
        <p className="text-xs tabular-nums text-ink-faint">{overall} elapsed</p>
      )}
    </div>
  );
}

function PreviewSection({
  portraitId,
  previewUrl,
  isGenerating,
  error,
  generationElapsedMs,
  progress,
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
  generationElapsedMs: number;
  progress: ProgressState;
  onRegenerate?: () => void;
  onChangeStyle?: () => void;
  onNewPhoto?: () => void;
  onSaveToAccount?: () => void;
  isAuthenticated?: boolean;
  isSaved?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}) {
  // Amounts live in Stripe; this is a client component, so it reads them from
  // the catalog API rather than holding a literal.
  const [digitalCents, setDigitalCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/pricing");
      const data = await res.json();
      if (cancelled || !res.ok || !data.success) return;
      setDigitalCents(data.digital.unitAmount as number);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isGenerating) {
    return (
      <GenerationProgress
        generationElapsedMs={generationElapsedMs}
        progress={progress}
      />
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

        {portraitId && <ShareButtons
          portraitId={portraitId}
          imageUrl={previewUrl}
          heading="Share or save your preview"
          description="Send the link or save the watermarked image while it is in front of you."
          prominent
        />}

        {onSaveToAccount && !isSaved && (
          <div className="border-y border-rim bg-surface px-4 py-5 sm:px-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 flex-none text-accent" />
              <div>
                <h3 className="font-display text-lg text-ink">
                  {isAuthenticated ? "Save this portrait to your account" : "Don't lose this portrait"}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {isAuthenticated
                    ? "Save it to My Portraits so you can return to it from any device."
                    : "Your image is safe on our server, but it is not saved to an account. Sign in now to put it in My Portraits. Without that, there is no account history to return to if you lose this page or switch devices."}
                </p>
              </div>
            </div>
            <PrimaryButton
              onClick={onSaveToAccount}
              disabled={isSaving}
              className="mt-4 min-h-12 w-full text-sm sm:w-auto"
            >
              {isSaving ? (
                <><Loader2 className="animate-spin" /> Saving...</>
              ) : isAuthenticated ? (
                <><Download /> Save to My Portraits</>
              ) : (
                <><LogIn /> Sign in and save it</>
              )}
            </PrimaryButton>
          </div>
        )}

        {isSaved && (
          <div className="flex items-start gap-3 border-y border-positive/40 bg-positive/5 px-4 py-4 text-sm text-ink-muted sm:px-5">
            <Check className="mt-0.5 size-4 flex-none text-positive" />
            <p><strong className="text-ink">Saved to My Portraits.</strong> You can return to it from any device after signing in.</p>
          </div>
        )}

        {saveError && (
          <Notice tone="danger" icon={<AlertTriangle />}>
            {saveError}
          </Notice>
        )}

        <div className="rounded-2xl border border-accent-rim bg-surface p-6">
          <h3 className="mb-1 font-display text-xl text-ink">Love your portrait?</h3>
          <p className="mb-4 text-sm text-ink-muted">
            Purchase to remove the watermark and get the high-resolution file — delivered
            instantly to your email.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/portraits/${portraitId}/preview`}
              className="flex-1 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-center text-sm font-semibold text-canvas transition-all hover:brightness-110"
            >
              {digitalCents === null
                ? "Purchase Digital"
                : `Purchase Digital — $${(digitalCents / 100).toFixed(2)}`}
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

        <div className="border-t border-rim pt-5">
          <h3 className="mb-3 text-center text-sm font-semibold text-ink-muted">
            Try another version
          </h3>
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
          </div>
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
  const [userScene, setUserScene] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [progress, setProgress] = useState<ProgressState>({
    stage: null,
    note: null,
    stageAtMs: 0,
  });
  const unsubscribeProgress = useRef<(() => void) | null>(null);
  const generationStartedAt = useRef(Date.now());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // Preview gate. The first guest preview is free; later previews require a
  // verified Clerk account rather than an arbitrary typed email address.
  const [gateCode, setGateCode] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
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
        return null;
      }
      if (!packsData.stylePacks?.length) {
        setPacksError("No styles are available right now. Please try again shortly.");
        return null;
      }

      setStylePacks(packsData.stylePacks);
      setSelectedPack(packsData.stylePacks[0]);
      setSelectedVariant(packsData.stylePacks[0].variants[0] || null);
      return packsData.stylePacks as StylePack[];
    } catch {
      setPacksError("Network error loading styles. Please check your connection and try again.");
      return null;
    } finally {
      setPacksLoading(false);
    }
  }, []);

  // Restore the server-owned job on mount. localStorage survives OAuth,
  // mobile tab eviction, and browser restarts; sessionStorage does not.
  const restoredSession = useRef(false);
  useEffect(() => {
    // Upload updates the portraitId query string. That is not a fresh mount:
    // replaying restoration starts a catalog fetch that can reset an active
    // generation back to the style step when it eventually resolves.
    if (restoredSession.current) return;
    restoredSession.current = true;
    const legacyId = sessionStorage.getItem(PORTRAIT_ID_KEY);
    const savedPortraitId =
      searchParams.get("portraitId") ||
      localStorage.getItem(PORTRAIT_ID_KEY) ||
      legacyId;
    const savedPreviewUrl =
      localStorage.getItem(PREVIEW_URL_KEY) ||
      sessionStorage.getItem(PREVIEW_URL_KEY);
    const savedSourceUrl =
      localStorage.getItem(SOURCE_URL_KEY) ||
      sessionStorage.getItem(SOURCE_URL_KEY);

    if (!savedPortraitId) return;
    localStorage.setItem(PORTRAIT_ID_KEY, savedPortraitId);
    setPortraitId(savedPortraitId);
    if (savedSourceUrl && !savedSourceUrl.startsWith("blob:")) {
      setPhotoPreview(savedSourceUrl);
    }

    (async () => {
      const packs = await loadStylePacks();
      try {
        const res = await fetch(`/api/portraits/${savedPortraitId}`, {
          cache: "no-store",
        });
        const data: { success?: boolean; error?: string; portrait?: PortraitStatus } =
          await res.json().catch(() => ({}));
        if (!res.ok || !data.portrait) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const current = data.portrait;
        setIsSaved(Boolean(current.isSavedToAccount));
        if (current.sourceImageUrl) {
          setPhotoPreview(current.sourceImageUrl);
          localStorage.setItem(SOURCE_URL_KEY, current.sourceImageUrl);
        }
        const pack = packs?.find((item) => item.slug === current.stylePackSlug);
        const variant = pack?.variants.find(
          (item) => item.slug === current.styleVariantSlug
        );
        if (pack) setSelectedPack(pack);
        if (variant) setSelectedVariant(variant);

        if (PROCESSING_STATUSES.has(current.status)) {
          generationStartedAt.current = Date.now();
          setGenerationElapsedMs(0);
          setGenerationError(null);
          setIsGenerating(true);
          setStep("generate");
          return;
        }
        if (
          current.previewImageUrl &&
          (current.status === "preview" || current.status === "purchased")
        ) {
          setPreviewUrl(current.previewImageUrl);
          localStorage.setItem(PREVIEW_URL_KEY, current.previewImageUrl);
          setGenerationError(null);
          setIsGenerating(false);
          setStep("generate");
          return;
        }
        if (current.status === "failed") {
          setGenerationError(
            current.errorMessage || "Generation failed. Please try another photo or style."
          );
          setIsGenerating(false);
          setStep("generate");
          return;
        }
        setStep("style");
      } catch (error) {
        console.error("[portrait recovery] status lookup failed:", error);
        if (savedPreviewUrl) {
          setPreviewUrl(savedPreviewUrl);
          setStep("generate");
        } else {
          setGenerationError(
            "We couldn't check your portrait yet. Reopen this page when your connection returns."
          );
          setStep("generate");
        }
      }
    })();
  }, [searchParams, loadStylePacks]);

  // Persist only durable URLs. Blob URLs stop working as soon as a mobile tab
  // is evicted, which was another reason restored uploads appeared missing.
  useEffect(() => {
    if (portraitId) localStorage.setItem(PORTRAIT_ID_KEY, portraitId);
    if (previewUrl) localStorage.setItem(PREVIEW_URL_KEY, previewUrl);
    if (photoPreview && !photoPreview.startsWith("blob:")) {
      localStorage.setItem(SOURCE_URL_KEY, photoPreview);
    }
  }, [portraitId, sessionId, previewUrl, photoPreview]);

  // Handle retry/change style - go back to style selection, keep the uploaded photo
  // Clears preview URL so regeneration creates a fresh version
  const handleRetry = () => {
    setGenerationError(null);
    setGateCode(null);
    setPreviewUrl(null);
    setIsSaved(false);
    localStorage.removeItem(PREVIEW_URL_KEY);
    sessionStorage.removeItem(PREVIEW_URL_KEY);
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
    // Clear durable recovery pointers before starting a new portrait.
    for (const key of [PORTRAIT_ID_KEY, PREVIEW_URL_KEY, SOURCE_URL_KEY]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    sessionStorage.removeItem("ic_sessionId");

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
    trackEvent("upload_started", {
      metadata: { contentType: f.type, sizeBytes: f.size },
    });
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
      const data: {
        success?: boolean;
        error?: string;
        portraitId?: string;
        sessionId?: string;
        sourceImageUrl?: string;
      } =
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
      if (data.sourceImageUrl) {
        setPhotoPreview(data.sourceImageUrl);
        localStorage.setItem(SOURCE_URL_KEY, data.sourceImageUrl);
      }
      trackEvent("upload_completed", {
        portraitId: data.portraitId,
        metadata: { contentType: upload.type, sizeBytes: upload.size },
      });

      // Update URL with portraitId for session persistence
      router.replace(`/portraits/create?portraitId=${data.portraitId}`, { scroll: false });

      // Load style packs
      await loadStylePacks();
      setStep("style");
    } catch {
      trackEvent("upload_failed", {
        metadata: { reason: "network_error" },
      });
      setUploadError("Network error. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Keep the elapsed clock tied to the server job rather than the initiating
  // fetch. The fetch now returns immediately while generation continues.
  useEffect(() => {
    if (!isGenerating) return;
    const tick = () =>
      setGenerationElapsedMs(Date.now() - generationStartedAt.current);
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [isGenerating]);

  // Polling is the durable source of truth. Mobile browsers throttle timers in
  // the background, then this check runs immediately on focus/visibility and
  // restores either the finished preview or the real server error.
  useEffect(() => {
    if (!isGenerating || !portraitId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      unsubscribeProgress.current?.();
      unsubscribeProgress.current = null;
      setIsGenerating(false);
    };

    const check = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/portraits/${portraitId}`, {
          cache: "no-store",
        });
        const data: { portrait?: PortraitStatus } = await res.json();
        const current = data.portrait;
        if (!res.ok || !current) throw new Error(`HTTP ${res.status}`);
        setIsSaved(Boolean(current.isSavedToAccount));

        if (PROCESSING_STATUSES.has(current.status)) {
          timer = setTimeout(check, 4000);
          return;
        }
        if (
          current.previewImageUrl &&
          (current.status === "preview" || current.status === "purchased")
        ) {
          setPreviewUrl(current.previewImageUrl);
          localStorage.setItem(PREVIEW_URL_KEY, current.previewImageUrl);
          setGenerationError(null);
          setGateCode(null);
          trackEvent("generation_succeeded", {
            portraitId,
            metadata: { elapsedMs: Date.now() - generationStartedAt.current },
          });
          finish();
          return;
        }
        if (current.status === "failed") {
          setGenerationError(
            current.errorMessage ||
              "Generation failed. Please try another photo or style."
          );
          trackEvent("generation_failed", {
            portraitId,
            metadata: { error: current.errorMessage || "server_failed" },
          });
          finish();
          return;
        }
        timer = setTimeout(check, 4000);
      } catch {
        // A temporary offline period is not a failed generation. Check again
        // when connectivity returns or on the next polling interval.
        setProgress((current) => ({
          ...current,
          note: "Your portrait is still running safely. Reconnecting…",
        }));
        timer = setTimeout(check, 5000);
      }
    };

    const checkNow = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        timer = null;
        void check();
      }
    };
    void check();
    window.addEventListener("focus", checkNow);
    window.addEventListener("online", checkNow);
    document.addEventListener("visibilitychange", checkNow);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", checkNow);
      window.removeEventListener("online", checkNow);
      document.removeEventListener("visibilitychange", checkNow);
    };
  }, [isGenerating, portraitId]);

  const handleGenerate = async (gate?: { captchaToken?: string | null }) => {
    if (!portraitId || !selectedPack || !selectedVariant) return;
    const scene = userScene.trim();
    if (selectedPack.slug === "custom-scene" && !scene) return;
    const token = gate?.captchaToken ?? captchaToken;
    trackEvent("style_selected", {
      portraitId,
      metadata: {
        stylePackSlug: selectedPack.slug,
        styleVariantSlug: selectedVariant.slug,
      },
    });
    trackEvent("generation_started", {
      portraitId,
      metadata: {
        stylePackSlug: selectedPack.slug,
        styleVariantSlug: selectedVariant.slug,
      },
    });
    setIsGenerating(true);
    setGenerationError(null);
    setGateCode(null);
    setStep("generate");

    const startedAt = Date.now();
    generationStartedAt.current = startedAt;
    setGenerationElapsedMs(0);
    setProgress({ stage: null, note: null, stageAtMs: 0 });

    // Subscribed before the request goes out, so the first boundary the
    // pipeline crosses cannot land before anyone is listening.
    unsubscribeProgress.current?.();
    unsubscribeProgress.current = subscribeToProgress(portraitId, (event) => {
      if (event.stage === "done" || event.stage === "failed") return;
      setProgress({
        stage: event.stage,
        note: event.note ?? null,
        stageAtMs: Date.now() - startedAt,
      });
    });

    try {
      const res = await fetch("/api/portraits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portraitId,
          stylePackSlug: selectedPack.slug,
          styleVariantSlug: selectedVariant.slug,
          ...(scene ? { userScene: scene } : {}),
          ...(token ? { captchaToken: token } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        trackEvent("generation_failed", {
          portraitId,
          metadata: {
            status: res.status,
            code: data.code || null,
            error: data.error || null,
            stylePackSlug: selectedPack.slug,
            styleVariantSlug: selectedVariant.slug,
          },
        });
        if (res.status === 409 && data.code === "already_processing") {
          setGenerationError(null);
          setProgress((current) => ({
            ...current,
            note: "Your existing generation is still running. Reconnected.",
          }));
          return;
        }
        setGenerationError(
          data.error || "Generation failed. Please try with a different photo or style."
        );
        if (data.code) setGateCode(data.code);
        // A Turnstile token is single-use — a rejected one must not be replayed.
        if (data.code === "captcha_failed" || data.code === "captcha_required") {
          setCaptchaToken(null);
        }
        unsubscribeProgress.current?.();
        unsubscribeProgress.current = null;
        setIsGenerating(false);
        return;
      }
      setProgress((current) => ({
        ...current,
        note: "You can leave this page. We will keep working and restore the result when you return.",
      }));
    } catch {
      // The server owns the job once submitted. A browser disconnect is not
      // evidence that generation failed; the polling effect will reconcile it.
      setProgress((current) => ({
        ...current,
        note: "Connection changed, but your portrait keeps running. Reconnecting…",
      }));
    }
  };

  // A navigation mid-generation must not leave the socket reconnecting forever.
  useEffect(() => () => unsubscribeProgress.current?.(), []);

  // Retry a captcha refusal with the single-use token.
  const handleGateSubmit = async () => {
    await handleGenerate({ captchaToken });
  };

  // Regenerate - same style, new generation
  const handleRegenerate = async () => {
    if (!portraitId || !selectedPack || !selectedVariant) return;
    // Keep the last successful preview recoverable until its replacement wins.
    setIsSaved(false);
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
            href="/"
            aria-label="Style Gallery"
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
                Start with one photo
              </h1>
              <p className="text-sm text-ink-muted">
                Your dog, your cat, or someone you love. One clear photo is all a
                portrait needs — it does not have to be a good one.
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
            <p className="text-center text-xs leading-relaxed text-ink-subtle">
              You see the finished painting before you pay anything — about a
              minute from now. No account needed.
            </p>
            {/* The gallery licence has to be visible where the photo is handed
                over, not only in the terms, or it is not a fair bargain. */}
            <p className="text-center text-xs leading-relaxed text-ink-faint">
              Unpaid pet previews may be shown in our public gallery with the
              uploaded pet photo and generated portrait. Buying the portrait
              makes it private. See our{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-ink-muted">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-muted">
                privacy policy
              </Link>
              .
            </p>
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

            {selectedPack?.slug === "custom-scene" && (
              <div className="flex flex-col gap-2">
                <label htmlFor="user-scene" className="text-sm font-semibold text-ink">
                  Describe your scene
                </label>
                <textarea
                  id="user-scene"
                  value={userScene}
                  onChange={(e) => setUserScene(e.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="e.g. standing on a windswept cliff at sunset, wearing a long wool coat"
                  className="w-full rounded-xl border border-rim bg-surface-raised p-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
                <p className="text-xs text-ink-faint">
                  {userScene.trim().length === 0
                    ? "Required for a custom scene."
                    : `${userScene.length}/400`}
                </p>
              </div>
            )}

            {!isSignedIn && portraitId && (
              <div className="flex flex-col gap-4 border-y border-rim py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-semibold text-ink">Protect this portrait before it starts</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      Sign in with Google or Facebook and we will save the in-progress job to
                      your account and email you when it is ready. Guest portraits stay tied
                      to this browser and cannot be recovered on another device.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/sign-in?redirect_url=${encodeURIComponent(`/portraits/create?portraitId=${portraitId}`)}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-85"
                >
                  <LogIn className="size-4" /> Sign in and protect it
                </Link>
              </div>
            )}

            <div className="flex gap-3">
              <QuietButton onClick={() => setStep("upload")} className="flex-1 py-3 text-sm">
                <ArrowLeft /> Change Photo
              </QuietButton>
              <PrimaryButton
                onClick={() => handleGenerate()}
                disabled={
                  !selectedPack ||
                  !selectedVariant ||
                  (selectedPack.slug === "custom-scene" && !userScene.trim())
                }
                className="flex-1 py-3 text-sm"
              >
                <Sparkles /> Generate Portrait
              </PrimaryButton>
            </div>
            <p className="text-center text-xs text-ink-faint">
              Free watermarked preview. No account required. Purchase to unlock full resolution.
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
            {!isGenerating && gateCode ? (
              <PreviewGatePanel
                code={gateCode}
                message={generationError}
                portraitId={portraitId}
                onSubmitCaptcha={handleGateSubmit}
                onCaptchaToken={setCaptchaToken}
                captchaReady={Boolean(captchaToken)}
                onChangeStyle={handleRetry}
              />
            ) : (
            <PreviewSection
              portraitId={portraitId}
              previewUrl={previewUrl}
              isGenerating={isGenerating}
              error={generationError}
              generationElapsedMs={generationElapsedMs}
              progress={progress}
              onRegenerate={handleRegenerate}
              onChangeStyle={handleRetry}
              onNewPhoto={handleStartOver}
              onSaveToAccount={handleSaveToAccount}
              isAuthenticated={isSignedIn}
              isSaved={isSaved}
              isSaving={isSaving}
              saveError={saveError}
            />
            )}
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
