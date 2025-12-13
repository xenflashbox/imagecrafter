"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History as HistoryIcon,
  Search,
  Copy,
  Play,
  Bookmark,
  BookmarkCheck,
  Trash2,
  ChevronDown,
  Image as ImageIcon,
  Check,
  Filter,
  Calendar,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface PromptHistoryItem {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  templateSlug?: string;
  templateName?: string;
  presetName?: string;
  aspectRatio: string;
  imageUrl?: string;
  wasSuccessful: boolean;
  isSaved: boolean;
  timesReused: number;
  createdAt: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockHistory: PromptHistoryItem[] = [
  {
    id: "1",
    originalPrompt: "A cozy coffee shop in autumn",
    enhancedPrompt:
      "Warm editorial photograph of artisan coffee being poured in cozy autumn cafe, morning light streaming through windows, fall leaves visible outside, steam rising from cup, lifestyle photography style",
    templateSlug: "blog-hero",
    templateName: "Blog Hero",
    presetName: "Lifestyle",
    aspectRatio: "16:9",
    imageUrl: "https://picsum.photos/seed/hist1/200/112",
    wasSuccessful: true,
    isSaved: true,
    timesReused: 3,
    createdAt: "2024-12-13T10:30:00Z",
  },
  {
    id: "2",
    originalPrompt: "Friendly green turtle with pink bow",
    enhancedPrompt:
      "Tina Tortoise: A friendly sea turtle with sage-green shell, pink satin bow on head, large expressive brown eyes, warm cream underbelly, soft watercolor children's book illustration style",
    templateSlug: "childrens-book",
    templateName: "Children's Book",
    presetName: "Classic Watercolor",
    aspectRatio: "4:3",
    imageUrl: "https://picsum.photos/seed/hist2/200/150",
    wasSuccessful: true,
    isSaved: true,
    timesReused: 5,
    createdAt: "2024-12-12T15:45:00Z",
  },
  {
    id: "3",
    originalPrompt: "Tech startup team brainstorming",
    enhancedPrompt:
      "Modern flat illustration of diverse tech team collaborating around holographic display, blue and purple gradient, geometric shapes, innovative startup aesthetic",
    templateSlug: "blog-hero",
    templateName: "Blog Hero",
    presetName: "Technology",
    aspectRatio: "16:9",
    imageUrl: "https://picsum.photos/seed/hist3/200/112",
    wasSuccessful: true,
    isSaved: false,
    timesReused: 1,
    createdAt: "2024-12-11T09:15:00Z",
  },
  {
    id: "4",
    originalPrompt: "Abstract AI visualization",
    enhancedPrompt:
      "Futuristic neural network visualization, flowing data streams in cyan and purple, glowing nodes on dark background, cinematic lighting",
    templateSlug: "blog-hero",
    templateName: "Blog Hero",
    presetName: "Technology",
    aspectRatio: "16:9",
    wasSuccessful: false,
    isSaved: false,
    timesReused: 0,
    createdAt: "2024-12-10T14:20:00Z",
  },
  {
    id: "5",
    originalPrompt: "Professional headshot background blue",
    enhancedPrompt:
      "Professional corporate background, subtle navy blue gradient, soft geometric shapes in corners, ample center space, headshot photography backdrop",
    templateSlug: "profile-background",
    templateName: "Profile Background",
    presetName: "Corporate Blue",
    aspectRatio: "1:1",
    imageUrl: "https://picsum.photos/seed/hist5/200/200",
    wasSuccessful: true,
    isSaved: false,
    timesReused: 2,
    createdAt: "2024-12-09T11:00:00Z",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function HistoryPage() {
  const [history, setHistory] = useState<PromptHistoryItem[]>(mockHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSaved, setFilterSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter history
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.originalPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.templateName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSaved = !filterSaved || item.isSaved;
    return matchesSearch && matchesSaved;
  });

  // Group by date
  const groupedHistory = filteredHistory.reduce(
    (groups, item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    },
    {} as Record<string, PromptHistoryItem[]>
  );

  const toggleSaved = (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    );
  };

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-light">Prompt History</h1>
              <p className="text-sm text-white/40">{filteredHistory.length} prompts</p>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Filter */}
            <button
              onClick={() => setFilterSaved(!filterSaved)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                filterSaved
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center py-20">
            <HistoryIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-light text-white/60 mb-2">No prompts found</h3>
            <p className="text-white/40">
              {searchQuery || filterSaved
                ? "Try adjusting your search or filters"
                : "Your prompt history will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-4 h-4 text-white/30" />
                  <span className="text-sm text-white/40">{date}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                    >
                      {/* Main Row */}
                      <div
                        className="p-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Thumbnail */}
                          <div className="w-16 h-16 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white/20" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white/90 line-clamp-2 mb-2">{item.originalPrompt}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {item.templateName && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                                  {item.templateName}
                                </span>
                              )}
                              {item.presetName && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                                  {item.presetName}
                                </span>
                              )}
                              <span className="text-white/30">{formatTime(item.createdAt)}</span>
                              {item.timesReused > 0 && (
                                <span className="text-white/30">• Reused {item.timesReused}x</span>
                              )}
                              {!item.wasSuccessful && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                                  Failed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaved(item.id);
                              }}
                              className={`p-2 rounded-lg transition-all ${
                                item.isSaved
                                  ? "bg-violet-500/20 text-violet-300"
                                  : "bg-white/5 text-white/40 hover:text-white"
                              }`}
                            >
                              {item.isSaved ? (
                                <BookmarkCheck className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPrompt(item.originalPrompt, item.id);
                              }}
                              className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <ChevronDown
                              className={`w-4 h-4 text-white/30 transition-transform ${
                                expandedId === item.id ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedId === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/10"
                          >
                            <div className="p-4 space-y-4">
                              {/* Enhanced Prompt */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-white/40 uppercase tracking-wider">
                                    Enhanced Prompt
                                  </span>
                                  <button
                                    onClick={() =>
                                      copyPrompt(item.enhancedPrompt, `${item.id}-enhanced`)
                                    }
                                    className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-all"
                                  >
                                    {copiedId === `${item.id}-enhanced` ? (
                                      <>
                                        <Check className="w-3 h-3 text-green-400" />
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
                                <p className="text-sm text-white/50 leading-relaxed bg-white/5 rounded-lg p-3">
                                  {item.enhancedPrompt}
                                </p>
                              </div>

                              {/* Settings */}
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-white/40">Aspect:</span>{" "}
                                  <span className="text-white/70">{item.aspectRatio}</span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2 font-medium">
                                  <Play className="w-4 h-4" />
                                  Run Again
                                </button>
                                <button className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-red-400">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
