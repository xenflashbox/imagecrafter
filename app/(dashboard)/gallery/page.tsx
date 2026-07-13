"use client";

/**
 * /gallery — Subscriber Image Gallery (Phase 5 Redesign)
 *
 * Shows two tabs:
 *   • AI Images    — generated images from /api/images (real data)
 *   • My Portraits — portrait history from /api/portraits (subscriber integration)
 *
 * Features:
 *   - Search, template filter, favorites filter
 *   - Grid / masonry toggle
 *   - Image detail modal with download + favorite
 *   - Pagination via "Load more"
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Grid3X3,
  LayoutGrid,
  Download,
  Heart,
  Trash2,
  Copy,
  X,
  Calendar,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Camera,
  ChevronDown,
  Check,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// =============================================================================
// TYPES
// =============================================================================

interface GalleryImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  originalPrompt: string;
  enhancedPrompt: string | null;
  aspectRatio: string;
  resolution: string;
  creditsCost: number;
  hasWatermark: boolean;
  isFavorite: boolean;
  generatedAt: string;
  template: { name: string; slug: string } | null;
  project: { name: string } | null;
}

interface PortraitItem {
  id: string;
  previewImageUrl: string | null;
  status: string;
  stylePackSlug: string | null;
  styleVariantSlug: string | null;
  createdAt: string;
  order: {
    id: string;
    type: string;
    status: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type Tab = "images" | "portraits";
type ViewMode = "grid" | "masonry";

// =============================================================================
// COMPONENT
// =============================================================================

export default function GalleryPage() {
  const [tab, setTab] = useState<Tab>("images");

  // Image gallery state
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Portrait history state
  const [portraits, setPortraits] = useState<PortraitItem[]>([]);
  const [loadingPortraits, setLoadingPortraits] = useState(false);
  const [portraitsLoaded, setPortraitsLoaded] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemplate, setFilterTemplate] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Unique template names from loaded images (for filter)
  const templateNames = [...new Set(images.map((img) => img.template?.name).filter(Boolean))];

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  const buildImageParams = useCallback((page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: "24" });
    if (searchQuery) params.set("search", searchQuery);
    if (filterTemplate) params.set("template", filterTemplate);
    if (favoritesOnly) params.set("favorite", "true");
    return params.toString();
  }, [searchQuery, filterTemplate, favoritesOnly]);

  const fetchImages = useCallback(async (page: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoadingImages(true);

    try {
      const res = await fetch(`/api/images?${buildImageParams(page)}`);
      if (!res.ok) throw new Error("Failed to load images");
      const data = await res.json();
      if (data.success) {
        setImages((prev) => append ? [...prev, ...data.images] : data.images);
        setPagination(data.pagination);
        setLoadError(null);
      }
    } catch (err) {
      console.error("Failed to load images:", err);
      setLoadError("Failed to load your images. Please refresh the page.");
    } finally {
      setLoadingImages(false);
      setLoadingMore(false);
    }
  }, [buildImageParams]);

  const fetchPortraits = useCallback(async () => {
    if (portraitsLoaded) return;
    setLoadingPortraits(true);
    try {
      const res = await fetch("/api/portraits?userId=me&limit=50");
      if (!res.ok) throw new Error("Failed to load portraits");
      const data = await res.json();
      if (data.success && Array.isArray(data.portraits)) {
        setPortraits(data.portraits);
      }
    } catch (err) {
      console.error("Failed to load portraits:", err);
      setLoadError("Failed to load your portraits. Please refresh the page.");
    } finally {
      setLoadingPortraits(false);
      setPortraitsLoaded(true);
    }
  }, [portraitsLoaded]);

  // Load images on mount and filter change
  useEffect(() => {
    setCurrentPage(1);
    fetchImages(1);
  }, [searchQuery, filterTemplate, favoritesOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load portraits when tab switched
  useEffect(() => {
    if (tab === "portraits") fetchPortraits();
  }, [tab, fetchPortraits]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchImages(nextPage, true);
  };

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  const toggleFavorite = async (img: GalleryImage) => {
    const newVal = !img.isFavorite;
    setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, isFavorite: newVal } : i));
    if (selectedImage?.id === img.id) setSelectedImage({ ...img, isFavorite: newVal });

    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: img.id, isFavorite: newVal }),
      });
    } catch {
      // Revert on error
      setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, isFavorite: !newVal } : i));
    }
  };

  const handleDownload = async (img: GalleryImage) => {
    const url = `/api/images/download?url=${encodeURIComponent(img.imageUrl)}&filename=imagecrafter-${img.id}`;
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `imagecrafter-${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatPortraitStyle = (portrait: PortraitItem) => {
    const pack = portrait.stylePackSlug?.replace(/-/g, " ") || "Unknown style";
    const variant = portrait.styleVariantSlug?.replace(/-/g, " ") || "";
    return variant ? `${pack} / ${variant}` : pack;
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setTab("images")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "images" ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                AI Images
                {pagination && <span className="text-xs opacity-60">({pagination.total})</span>}
              </button>
              <button
                onClick={() => setTab("portraits")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "portraits" ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                My Portraits
                {portraits.length > 0 && <span className="text-xs opacity-60">({portraits.length})</span>}
              </button>
            </div>

            {/* Search (images tab only) */}
            {tab === "images" && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, templates..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all text-sm"
                />
              </div>
            )}

            {/* View controls */}
            {tab === "images" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    favoritesOnly
                      ? "bg-pink-500/20 border-pink-500/50 text-pink-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                  }`}
                  title="Favorites only"
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    showFilters || filterTemplate
                      ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                </button>
                <div className="flex rounded-xl overflow-hidden border border-white/10">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 transition-all ${viewMode === "grid" ? "bg-white/10 text-white" : "bg-white/5 text-white/50"}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("masonry")}
                    className={`p-2.5 transition-all ${viewMode === "masonry" ? "bg-white/10 text-white" : "bg-white/5 text-white/50"}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter pills */}
          {tab === "images" && showFilters && templateNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setFilterTemplate(null)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  !filterTemplate ? "bg-violet-500 text-white" : "bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                All templates
              </button>
              {templateNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setFilterTemplate(name === filterTemplate ? null : name || null)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    filterTemplate === name ? "bg-violet-500 text-white" : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {loadError && (
          <div className="text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl mb-6">
            {loadError}
          </div>
        )}

        {/* ===== IMAGES TAB ===== */}
        {tab === "images" && (
          <>
            {loadingImages ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-24">
                <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-light text-white/60 mb-2">
                  {searchQuery || filterTemplate || favoritesOnly ? "No matching images" : "No images yet"}
                </h3>
                <p className="text-white/40 mb-6">
                  {searchQuery || filterTemplate || favoritesOnly
                    ? "Try adjusting your filters"
                    : "Create your first image to start your gallery"}
                </p>
                {!searchQuery && !filterTemplate && !favoritesOnly && (
                  <Link
                    href="/generate"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                  >
                    Create an image
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className={`grid gap-4 ${
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "columns-1 sm:columns-2 lg:columns-3"
                }`}>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative ${viewMode === "masonry" ? "mb-4 break-inside-avoid" : ""}`}
                    >
                      <div
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 cursor-pointer"
                        onClick={() => setSelectedImage(img)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.thumbnailUrl || img.imageUrl}
                          alt={img.originalPrompt}
                          className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                            viewMode === "grid" ? "aspect-video" : ""
                          }`}
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-sm text-white/90 line-clamp-2 mb-2">{img.originalPrompt}</p>
                            <div className="flex items-center gap-2 text-xs text-white/50">
                              {img.template && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10">{img.template.name}</span>
                              )}
                              <span>{formatDate(img.generatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(img); }}
                            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
                              img.isFavorite ? "bg-pink-500/80 text-white" : "bg-black/50 text-white/70 hover:text-white"
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${img.isFavorite ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(img); }}
                            className="p-2 rounded-lg bg-black/50 backdrop-blur-xl text-white/70 hover:text-white transition-all"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>

                        {img.isFavorite && (
                          <div className="absolute top-3 left-3">
                            <Heart className="w-4 h-4 text-pink-500 fill-current" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more */}
                {pagination?.hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                      Load more images
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ===== PORTRAITS TAB ===== */}
        {tab === "portraits" && (
          <>
            {loadingPortraits ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              </div>
            ) : portraits.length === 0 ? (
              <div className="text-center py-24">
                <Camera className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-light text-white/60 mb-2">No portraits yet</h3>
                <p className="text-white/40 mb-6">
                  Transform your photos into AI-generated art with Portrait Studio.
                </p>
                <Link
                  href="/portraits/create"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all"
                >
                  Create a portrait
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portraits.map((portrait) => (
                  <div key={portrait.id} className="group relative rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    {/* Preview image */}
                    <div className="aspect-square bg-gradient-to-br from-violet-900/30 to-pink-900/30 flex items-center justify-center">
                      {portrait.previewImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={portrait.previewImageUrl}
                          alt={formatPortraitStyle(portrait)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-12 h-12 text-white/20" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="text-sm font-medium text-white mb-1 capitalize">
                        {formatPortraitStyle(portrait)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Calendar className="w-3 h-3" />
                        {formatDate(portrait.createdAt)}
                        {portrait.order && (
                          <span className={`ml-auto px-2 py-0.5 rounded-full ${
                            portrait.order.status === "paid" || portrait.order.status === "fulfilled" || portrait.order.status === "shipped"
                              ? "bg-green-500/20 text-green-400"
                              : portrait.order.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-white/10 text-white/40"
                          }`}>
                            {portrait.order.type === "digital" ? "Digital" : "Print"} · {portrait.order.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                      <div className="flex gap-2">
                        <Link
                          href={`/portraits/${portrait.id}/preview`}
                          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-all flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                          View portrait
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== IMAGE DETAIL MODAL ===== */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] bg-[#12121a] rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
              {/* Image */}
              <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.originalPrompt}
                  className="max-w-full max-h-[60vh] lg:max-h-[80vh] object-contain rounded-lg"
                />
              </div>

              {/* Details */}
              <div className="w-full lg:w-80 p-6 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium">Image Details</h3>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Meta */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span className="text-white/60">{formatDate(selectedImage.generatedAt)}</span>
                  </div>
                  <div className="text-xs text-white/40">
                    {selectedImage.resolution} · {selectedImage.aspectRatio} · {selectedImage.creditsCost} credit{selectedImage.creditsCost > 1 ? "s" : ""}
                  </div>
                  {selectedImage.template && (
                    <span className="inline-flex px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs">
                      {selectedImage.template.name}
                    </span>
                  )}
                  {selectedImage.project && (
                    <span className="inline-flex px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs ml-2">
                      {selectedImage.project.name}
                    </span>
                  )}
                </div>

                {/* Prompts */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Your prompt</span>
                      <button onClick={() => copyPrompt(selectedImage.originalPrompt)} className="p-1 rounded hover:bg-white/10 transition-all">
                        <Copy className="w-3 h-3 text-white/40" />
                      </button>
                    </div>
                    <p className="text-sm text-white/70">{selectedImage.originalPrompt}</p>
                  </div>

                  {selectedImage.enhancedPrompt && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">Enhanced</span>
                        <button onClick={() => copyPrompt(selectedImage.enhancedPrompt!)} className="p-1 rounded hover:bg-white/10 transition-all">
                          <Copy className="w-3 h-3 text-white/40" />
                        </button>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed line-clamp-6">{selectedImage.enhancedPrompt}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(selectedImage)}
                      className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        selectedImage.isFavorite ? "bg-pink-500/20 text-pink-300" : "bg-white/5 text-white/60 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${selectedImage.isFavorite ? "fill-current" : ""}`} />
                      {selectedImage.isFavorite ? "Saved" : "Save"}
                    </button>
                    <Link
                      href="/generate"
                      className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      New image
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
