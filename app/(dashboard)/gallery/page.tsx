"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid3X3,
  LayoutGrid,
  Download,
  Heart,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface GalleryImage {
  id: string;
  imageUrl: string;
  originalPrompt: string;
  enhancedPrompt: string;
  aspectRatio: string;
  templateName?: string;
  projectName?: string;
  isFavorite: boolean;
  createdAt: string;
}

// ============================================================================
// MOCK DATA - Replace with API call
// ============================================================================

const mockImages: GalleryImage[] = [
  {
    id: "1",
    imageUrl: "https://picsum.photos/seed/img1/800/450",
    originalPrompt: "A cozy coffee shop in autumn",
    enhancedPrompt:
      "Warm editorial photograph of artisan coffee being poured in cozy autumn cafe, morning light streaming through windows, fall leaves visible outside, steam rising from cup, wooden counter and plants, lifestyle photography style",
    aspectRatio: "16:9",
    templateName: "Blog Hero",
    isFavorite: true,
    createdAt: "2024-12-13T10:30:00Z",
  },
  {
    id: "2",
    imageUrl: "https://picsum.photos/seed/img2/800/800",
    originalPrompt: "Tech startup team meeting",
    enhancedPrompt:
      "Modern flat illustration of diverse team collaborating around holographic display, blue and purple gradient background, tech startup aesthetic, clean geometric shapes",
    aspectRatio: "1:1",
    templateName: "Social Media",
    isFavorite: false,
    createdAt: "2024-12-12T15:45:00Z",
  },
  {
    id: "3",
    imageUrl: "https://picsum.photos/seed/img3/450/800",
    originalPrompt: "Friendly turtle character",
    enhancedPrompt:
      "Tina Tortoise: A friendly sea turtle with sage-green shell, pink bow, large expressive brown eyes, soft watercolor children's book illustration style",
    aspectRatio: "9:16",
    templateName: "Children's Book",
    projectName: "Tina Tortoise",
    isFavorite: true,
    createdAt: "2024-12-11T09:15:00Z",
  },
  {
    id: "4",
    imageUrl: "https://picsum.photos/seed/img4/800/450",
    originalPrompt: "AI neural network visualization",
    enhancedPrompt:
      "Futuristic visualization of neural network layers processing data, flowing cyan and purple data streams, dark background with glowing nodes, cinematic lighting",
    aspectRatio: "16:9",
    templateName: "Blog Hero",
    isFavorite: false,
    createdAt: "2024-12-10T14:20:00Z",
  },
  {
    id: "5",
    imageUrl: "https://picsum.photos/seed/img5/800/600",
    originalPrompt: "Product shot of headphones",
    enhancedPrompt:
      "Premium wireless headphones on pure white background, soft studio shadows, product photography style, floating angle, clean and minimal",
    aspectRatio: "4:3",
    templateName: "Product Shots",
    isFavorite: false,
    createdAt: "2024-12-09T11:00:00Z",
  },
  {
    id: "6",
    imageUrl: "https://picsum.photos/seed/img6/800/450",
    originalPrompt: "Presentation slide background",
    enhancedPrompt:
      "Abstract professional background, subtle blue gradient, geometric shapes in corners, large empty center space for text, corporate presentation style",
    aspectRatio: "16:9",
    templateName: "Presentations",
    isFavorite: false,
    createdAt: "2024-12-08T16:30:00Z",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>(mockImages);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemplate, setFilterTemplate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter images
  const filteredImages = images.filter((img) => {
    const matchesSearch =
      searchQuery === "" ||
      img.originalPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.templateName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterTemplate || img.templateName === filterTemplate;
    return matchesSearch && matchesFilter;
  });

  // Get unique template names for filter
  const templateNames = [...new Set(images.map((img) => img.templateName).filter(Boolean))];

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, isFavorite: !img.isFavorite } : img))
    );
    if (selectedImage?.id === id) {
      setSelectedImage((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Download image
  const handleDownload = async (img: GalleryImage) => {
    const response = await fetch(img.imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imagecrafter-${img.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Copy prompt
  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    // TODO: Show toast notification
  };

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Title & Count */}
            <div className="flex-1">
              <h1 className="text-2xl font-light">Gallery</h1>
              <p className="text-sm text-white/40">{filteredImages.length} images</p>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts, templates..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
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
                  className={`p-2.5 transition-all ${
                    viewMode === "grid" ? "bg-white/10 text-white" : "bg-white/5 text-white/50"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("masonry")}
                  className={`p-2.5 transition-all ${
                    viewMode === "masonry" ? "bg-white/10 text-white" : "bg-white/5 text-white/50"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <button
                  onClick={() => setFilterTemplate(null)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    !filterTemplate
                      ? "bg-violet-500 text-white"
                      : "bg-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  All
                </button>
                {templateNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setFilterTemplate(name || null)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      filterTemplate === name
                        ? "bg-violet-500 text-white"
                        : "bg-white/5 text-white/50 hover:text-white"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredImages.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white/60 mb-2">No images found</h3>
            <p className="text-white/40">
              {searchQuery || filterTemplate
                ? "Try adjusting your search or filters"
                : "Start creating to build your gallery"}
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "columns-1 sm:columns-2 lg:columns-3"
            }`}
          >
            {filteredImages.map((img, index) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative ${viewMode === "masonry" ? "mb-4 break-inside-avoid" : ""}`}
              >
                <div
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 cursor-pointer"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.originalPrompt}
                    className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      viewMode === "grid" ? "aspect-video" : ""
                    }`}
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-sm text-white/90 line-clamp-2 mb-2">
                        {img.originalPrompt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        {img.templateName && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10">
                            {img.templateName}
                          </span>
                        )}
                        <span>{formatDate(img.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(img.id);
                      }}
                      className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
                        img.isFavorite
                          ? "bg-pink-500/80 text-white"
                          : "bg-black/50 text-white/70 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${img.isFavorite ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(img);
                      }}
                      className="p-2 rounded-lg bg-black/50 backdrop-blur-xl text-white/70 hover:text-white transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Favorite indicator */}
                  {img.isFavorite && (
                    <div className="absolute top-3 left-3">
                      <Heart className="w-4 h-4 text-pink-500 fill-current" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Image Detail Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] bg-[#12121a] rounded-2xl overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
                {/* Image */}
                <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
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
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <span className="text-white/60">{formatDate(selectedImage.createdAt)}</span>
                    </div>
                    {selectedImage.templateName && (
                      <div className="inline-flex px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm">
                        {selectedImage.templateName}
                      </div>
                    )}
                    {selectedImage.projectName && (
                      <div className="inline-flex ml-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm">
                        {selectedImage.projectName}
                      </div>
                    )}
                  </div>

                  {/* Prompts */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Your Prompt
                        </span>
                        <button
                          onClick={() => copyPrompt(selectedImage.originalPrompt)}
                          className="p-1 rounded hover:bg-white/10 transition-all"
                        >
                          <Copy className="w-3 h-3 text-white/40" />
                        </button>
                      </div>
                      <p className="text-sm text-white/70">{selectedImage.originalPrompt}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 uppercase tracking-wider">
                          Enhanced Prompt
                        </span>
                        <button
                          onClick={() => copyPrompt(selectedImage.enhancedPrompt)}
                          className="p-1 rounded hover:bg-white/10 transition-all"
                        >
                          <Copy className="w-3 h-3 text-white/40" />
                        </button>
                      </div>
                      <p className="text-sm text-white/50 leading-relaxed">
                        {selectedImage.enhancedPrompt}
                      </p>
                    </div>
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
                        onClick={() => toggleFavorite(selectedImage.id)}
                        className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                          selectedImage.isFavorite
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${selectedImage.isFavorite ? "fill-current" : ""}`}
                        />
                        {selectedImage.isFavorite ? "Saved" : "Save"}
                      </button>
                      <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all">
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </button>
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-white/5 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
