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

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { PrintProduct, PrintFormat, FrameColor, CanvasWrap } from "@/lib/services/print-fulfillment";
import { PRINT_CATALOG } from "@/lib/services/print-fulfillment";

// Format display config
const FORMAT_LABELS: Record<PrintFormat, { label: string; emoji: string; desc: string }> = {
  art_print:     { label: "Art Print",     emoji: "🖼️",  desc: "Fine art paper, unframed. Ships flat, frame it yourself." },
  framed_print:  { label: "Framed Print",  emoji: "🪞",  desc: "Classic metal frame, ready to hang on arrival." },
  canvas:        { label: "Canvas",        emoji: "🎨",  desc: "Stretched canvas on quality wooden bars, gallery-ready." },
  framed_canvas: { label: "Framed Canvas", emoji: "✨",  desc: "Gallery canvas inside an elegant frame. The premium option." },
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

export default function PrintOptionsPage() {
  const { id: portraitId } = useParams<{ id: string }>();

  const formats: PrintFormat[] = ["art_print", "framed_print", "canvas", "framed_canvas"];

  const [selectedFormat, setSelectedFormat] = useState<PrintFormat>("art_print");
  const [selectedSku, setSelectedSku] = useState<string>("ART-8x10");
  const [selectedFrame, setSelectedFrame] = useState<FrameColor>("black");
  const [selectedWrap, setSelectedWrap] = useState<CanvasWrap>("ImageWrap");

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
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <div className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link
            href={`/portraits/${portraitId}/preview`}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to preview
          </Link>
          <span className="text-sm font-medium text-gray-300">Choose your print</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* LEFT: Portrait preview */}
          <div className="sticky top-6">
            <div className="rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl aspect-square flex items-center justify-center">
              <div className="text-gray-600 text-center p-8">
                <div className="text-5xl mb-3">🎨</div>
                <p className="text-sm">Your portrait preview</p>
                <p className="text-xs text-gray-500 mt-1">
                  Watermarked — full resolution unlocked after purchase
                </p>
              </div>
            </div>

            {/* Size visualization hint */}
            {selectedProduct && (
              <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{selectedProduct.size}</span>
                  {" "}{selectedProduct.name.replace(selectedProduct.size, "").replace('"', "").trim()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Museum-quality production · Ships worldwide</p>
              </div>
            )}
          </div>

          {/* RIGHT: Configuration */}
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Order a museum-quality print</h1>
              <p className="text-gray-400 text-sm">
                Every print is produced by professional labs and ships directly to your door.
              </p>
            </div>

            {/* STEP 1: Format */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Step 1 — Choose format
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {formats.map((fmt) => {
                  const cfg = FORMAT_LABELS[fmt];
                  const isActive = selectedFormat === fmt;
                  return (
                    <button
                      key={fmt}
                      onClick={() => handleFormatChange(fmt)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        isActive
                          ? "border-purple-500 bg-purple-900/30 shadow-lg shadow-purple-900/20"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="text-2xl mb-2">{cfg.emoji}</div>
                      <div className="text-sm font-semibold text-white">{cfg.label}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-tight">{cfg.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Size */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Step 2 — Choose size
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {formatProducts.map((product) => {
                  const isActive = selectedSku === product.sku;
                  return (
                    <button
                      key={product.sku}
                      onClick={() => setSelectedSku(product.sku)}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        isActive
                          ? "border-purple-500 bg-purple-900/30"
                          : "border-white/10 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      <div className="text-sm font-bold text-white">{product.size}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
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
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Step 3 — Choose frame color
                </h2>
                <div className="flex gap-3 flex-wrap">
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
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            isActive ? "border-purple-400 scale-110" : "border-white/20"
                          }`}
                          style={{ backgroundColor: cfg.hex }}
                        />
                        <span className="text-xs text-gray-400">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedProduct?.wrapOptions && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                  Step 3 — Choose canvas wrap
                </h2>
                <div className="space-y-2">
                  {selectedProduct.wrapOptions.map((wrap) => {
                    const isActive = selectedWrap === wrap;
                    return (
                      <button
                        key={wrap}
                        onClick={() => setSelectedWrap(wrap)}
                        className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-all ${
                          isActive
                            ? "border-purple-500 bg-purple-900/30 text-white"
                            : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"
                        }`}
                      >
                        {WRAP_LABELS[wrap]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CHECKOUT CTA */}
            <div className="pt-2">
              <div className="rounded-2xl bg-gradient-to-br from-purple-900/60 to-pink-900/60 border border-purple-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-lg">
                      {selectedProduct?.name || "Select a product"}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {selectedProduct?.format && FORMAT_LABELS[selectedProduct.format]?.label}
                      {selectedProduct?.frameOptions && ` · ${FRAME_COLOR_LABELS[selectedFrame]?.label} frame`}
                      {selectedProduct?.wrapOptions && ` · ${WRAP_LABELS[selectedWrap]}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{priceFormatted}</p>
                    <p className="text-xs text-gray-400">incl. shipping</p>
                  </div>
                </div>

                <a
                  href={buildCheckoutUrl()}
                  className="block w-full text-center py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-white text-lg transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Order This Print →
                </a>

                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                  <span>🔒 Secure checkout via Stripe</span>
                  <span>·</span>
                  <span>📦 Ships worldwide</span>
                  <span>·</span>
                  <span>No account required</span>
                </div>
              </div>

              <p className="text-center text-xs text-gray-600 mt-4">
                Estimated delivery: 5–10 business days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
