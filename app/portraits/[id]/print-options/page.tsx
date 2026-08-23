"use client";
/**
 * /portraits/[id]/print-options
 *
 * Full print customization page.
 * Users select format (art print / framed / canvas / framed canvas),
 * size, and frame or wrap color, then are redirected to Stripe checkout.
 *
 * DUAL-FLOW: fully public — no auth required.
 * Stripe checkout will collect email for guests.
 */

import { useEffect, useState } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Brush,
  Frame,
  Lock,
  Printer,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PrintFormat, FrameColor, CanvasWrap } from "@/lib/services/print-fulfillment";
import { PRINT_CATALOG } from "@/lib/services/print-fulfillment";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

const FORMAT_LABELS: Record<PrintFormat, { label: string; icon: LucideIcon; desc: string }> = {
  art_print:     { label: "Art Print",     icon: Printer,  desc: "Fine art paper, unframed. Ships flat, frame it yourself." },
  framed_print:  { label: "Framed Print",  icon: Frame,    desc: "Classic metal frame, ready to hang on arrival." },
  canvas:        { label: "Canvas",        icon: Brush,    desc: "Stretched canvas on quality wooden bars, gallery-ready." },
  framed_canvas: { label: "Framed Canvas", icon: Sparkles, desc: "Gallery canvas inside an elegant frame. The premium option." },
};

const FRAME_COLOR_LABELS: Record<FrameColor, { label: string; hex: string }> = {
  black:   { label: "Matte Black",   hex: "#1a1a1a" },
  white:   { label: "White",         hex: "#f5f5f5" },
  natural: { label: "Natural Wood",  hex: "#c4956a" },
  gold:    { label: "Gold",          hex: "#d4af37" },
  silver:  { label: "Silver",        hex: "#c0c0c0" },
};

const WRAP_LABELS: Record<CanvasWrap, string> = {
  ImageWrap: "Image Wrap (extends onto sides)",
  Black:     "Black Sides",
  White:     "White Sides",
};

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-medium tracking-widest text-ink-faint uppercase">
      {children}
    </h2>
  );
}

export default function PrintOptionsPage() {
  const { id: portraitId } = useParams<{ id: string }>();

  const formats: PrintFormat[] = ["art_print", "framed_print", "canvas", "framed_canvas"];

  const [selectedFormat, setSelectedFormat] = useState<PrintFormat>("art_print");
  const [selectedSku, setSelectedSku] = useState<string>("ART-8x10");
  const [selectedFrame, setSelectedFrame] = useState<FrameColor>("black");
  const [selectedWrap, setSelectedWrap] = useState<CanvasWrap>("ImageWrap");

  // The customer must see the artwork they are about to pay to have printed.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!portraitId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/portraits/${portraitId}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok || !data.success) {
          setPreviewError(data.error || `We couldn't load your portrait (HTTP ${res.status}).`);
          return;
        }
        if (!data.portrait?.previewImageUrl) {
          setPreviewError("This portrait has no preview image yet.");
          return;
        }
        setPreviewUrl(data.portrait.previewImageUrl);
      } catch {
        if (!cancelled) setPreviewError("We couldn't reach the server to load your portrait.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [portraitId]);

  const formatProducts = PRINT_CATALOG.filter((p) => p.format === selectedFormat);
  const selectedProduct = PRINT_CATALOG.find((p) => p.sku === selectedSku);

  // When format changes, auto-select first product in that format
  const handleFormatChange = (fmt: PrintFormat) => {
    setSelectedFormat(fmt);
    const first = PRINT_CATALOG.find((p) => p.format === fmt);
    if (first) setSelectedSku(first.sku);
  };

  // Build the checkout URL
  const buildCheckoutUrl = () => {
    if (!selectedProduct) return "#";
    const params = new URLSearchParams({
      portraitId,
      type: "print",
      sku: selectedProduct.sku,
    });
    if (
      (selectedProduct.format === "framed_print" || selectedProduct.format === "framed_canvas") &&
      selectedFrame
    ) {
      params.set("frame", selectedFrame);
    }
    if (selectedProduct.format === "canvas" && selectedWrap) {
      params.set("wrap", selectedWrap);
    }
    return `/api/orders/create?${params.toString()}`;
  };

  const priceFormatted = selectedProduct
    ? `$${(selectedProduct.priceUsd / 100).toFixed(2)}`
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader
        links={false}
        cta={
          <Link
            href={`/portraits/${portraitId}/preview`}
            className="flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Back to preview
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-28 pb-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* LEFT: the artwork being ordered */}
          <div className="lg:sticky lg:top-28">
            <div className="artframe relative aspect-square bg-surface">
              {previewUrl ? (
                <>
                  <NextImage
                    src={previewUrl}
                    alt="Your portrait"
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                  <div className="absolute right-0 bottom-4 left-0 z-10 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs backdrop-blur-sm">
                      <Lock className="size-3" />
                      Watermarked preview — the print is full resolution
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center text-sm text-ink-faint">
                  {previewError ?? "Loading your portrait…"}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="mt-4 rounded-xl border border-rim bg-surface p-4 text-center">
                <p className="text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{selectedProduct.size}</span>{" "}
                  {selectedProduct.name.replace(selectedProduct.size, "").replace('"', "").trim()}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Museum-quality production · Ships worldwide
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: configuration */}
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display mb-2 text-3xl font-light">
                Order a museum-quality print
              </h1>
              <p className="text-sm text-ink-muted">
                Every print is produced by professional labs and ships directly to your door.
              </p>
            </div>

            {/* STEP 1: Format */}
            <div>
              <StepHeading>Step 1 — Choose format</StepHeading>
              <div className="grid grid-cols-2 gap-3">
                {formats.map((fmt) => {
                  const cfg = FORMAT_LABELS[fmt];
                  const isActive = selectedFormat === fmt;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={fmt}
                      onClick={() => handleFormatChange(fmt)}
                      className={`rounded-xl border p-4 text-left transition-all [&_svg]:size-5 ${
                        isActive
                          ? "border-accent-rim bg-accent-soft"
                          : "border-rim bg-surface hover:border-rim-strong"
                      }`}
                    >
                      <Icon className={`mb-2 ${isActive ? "text-accent" : "text-ink-subtle"}`} />
                      <div className="text-sm font-semibold">{cfg.label}</div>
                      <div className="mt-1 text-xs leading-tight text-ink-faint">{cfg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Size */}
            <div>
              <StepHeading>Step 2 — Choose size</StepHeading>
              <div className="grid grid-cols-2 gap-2">
                {formatProducts.map((product) => {
                  const isActive = selectedSku === product.sku;
                  return (
                    <button
                      key={product.sku}
                      onClick={() => setSelectedSku(product.sku)}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        isActive
                          ? "border-accent-rim bg-accent-soft"
                          : "border-rim bg-surface hover:border-rim-strong"
                      }`}
                    >
                      <div className="text-sm font-semibold">{product.size}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">
                        ${(product.priceUsd / 100).toFixed(2)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 3: Frame / Wrap color (conditional) */}
            {selectedProduct?.frameOptions && (
              <div>
                <StepHeading>Step 3 — Choose frame color</StepHeading>
                <div className="flex flex-wrap gap-3">
                  {selectedProduct.frameOptions.map((color) => {
                    const cfg = FRAME_COLOR_LABELS[color];
                    const isActive = selectedFrame === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedFrame(color)}
                        title={cfg.label}
                        className={`flex flex-col items-center gap-1.5 transition-all ${
                          isActive ? "opacity-100" : "opacity-60 hover:opacity-80"
                        }`}
                      >
                        <div
                          className={`size-8 rounded-full border-2 transition-all ${
                            isActive ? "scale-110 border-accent" : "border-rim-strong"
                          }`}
                          style={{ backgroundColor: cfg.hex }}
                        />
                        <span className="text-xs text-ink-muted">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedProduct?.wrapOptions && (
              <div>
                <StepHeading>Step 3 — Choose canvas wrap</StepHeading>
                <div className="flex flex-col gap-2">
                  {selectedProduct.wrapOptions.map((wrap) => {
                    const isActive = selectedWrap === wrap;
                    return (
                      <button
                        key={wrap}
                        onClick={() => setSelectedWrap(wrap)}
                        className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${
                          isActive
                            ? "border-accent-rim bg-accent-soft text-ink"
                            : "border-rim bg-surface text-ink-muted hover:border-rim-strong"
                        }`}
                      >
                        {WRAP_LABELS[wrap]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHECKOUT */}
            <div>
              <div className="rounded-2xl border border-accent-rim bg-surface p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {selectedProduct?.name || "Select a product"}
                    </p>
                    <p className="text-sm text-ink-muted">
                      {selectedProduct?.format && FORMAT_LABELS[selectedProduct.format]?.label}
                      {selectedProduct?.frameOptions &&
                        ` · ${FRAME_COLOR_LABELS[selectedFrame]?.label} frame`}
                      {selectedProduct?.wrapOptions && ` · ${WRAP_LABELS[selectedWrap]}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{priceFormatted}</p>
                    <p className="text-xs text-ink-faint">incl. shipping</p>
                  </div>
                </div>

                <a
                  href={buildCheckoutUrl()}
                  className="block w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 py-4 text-center text-base font-semibold transition-all hover:brightness-110"
                >
                  Order This Print
                </a>

                <p className="mt-4 text-center text-xs text-ink-faint">
                  Secure checkout via Stripe · Ships worldwide · No account required
                </p>
              </div>

              <p className="mt-4 text-center text-xs text-ink-faint">
                Estimated delivery: 5–10 business days.
              </p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
