"use client";

import { useState, useEffect, useCallback } from "react";
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
  Calendar,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface PromptHistoryItem {
  id: string;
  originalPrompt: string | null;
  enhancedPrompt: string | null;
  prompt: string;
  templateSlug: string | null;
  aspectRatio: string | null;
  wasSuccessful: boolean;
  isSaved: boolean;
  timesUsed: number;
  createdAt: string;
}

interface HistoryApiResponse {
  items: PromptHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HistoryPage() {
  const [items, setItems] = useState<PromptHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSaved, setFilterSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchHistory = useCallback(async (pg: number, search: string, saved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: "20",
        ...(search ? { search } : {}),
        ...(saved ? { saved: "true" } : {}),
      });
      const res = await fetch(`/api/prompts/history?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HistoryApiResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("History fetch failed:", err);
      setError("Failed to load prompt history. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(1, searchQuery, filterSaved);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filterSaved, fetchHistory]);

  // Group by date
  const groupedItems = items.reduce(
    (groups, item) => {
      const date = new Date(item.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    },
    {} as Record<string, PromptHistoryItem[]>
  );

  const toggleSaved = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/prompts/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "toggleSave" }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      const updated: { id: string; isSaved: boolean } = await res.json();
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isSaved: updated.isSaved } : item))
      );
    } catch (err) {
      console.error("Toggle saved failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this prompt from history?")) return;
    setActionLoading(id + "-delete");
    try {
      const res = await fetch("/api/prompts/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "delete" }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const copyPrompt = (prompt: string, copyId: string) => {
    navigator.clipboard.writeText(prompt).catch(console.error);
    setCopiedId(copyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const displayPrompt = (item: PromptHistoryItem) =>
    item.originalPrompt || item.prompt;

  const displayEnhanced = (item: PromptHistoryItem) =>
    item.enhancedPrompt || item.prompt;

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="sticky top-0 z-30 chrome-veil border-b border-rim">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-light text-ink">Prompt History</h1>
              <p className="text-sm text-ink-subtle">
                {loading ? "Loading…" : `${total} prompts`}
              </p>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-raised border border-rim rounded-xl text-ink placeholder-ink-subtle focus:outline-none focus:border-accent transition-all"
              />
            </div>

            {/* Filter */}
            <button
              onClick={() => setFilterSaved(!filterSaved)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                filterSaved
                  ? "bg-accent-soft border-accent-rim text-accent"
                  : "bg-surface-raised border-rim text-ink-muted hover:text-ink"
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-danger mb-4">{error}</p>
            <button
              onClick={() => fetchHistory(page, searchQuery, filterSaved)}
              className="px-4 py-2 rounded-xl bg-surface text-ink hover:bg-accent-soft transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        ) : Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-20">
            <HistoryIcon className="w-16 h-16 text-rim-strong mx-auto mb-4" />
            <h3 className="text-xl font-light text-ink mb-2">No prompts found</h3>
            <p className="text-ink-muted mb-6">
              {searchQuery || filterSaved
                ? "Try adjusting your search or filters"
                : "Your prompt history will appear here after you generate images"}
            </p>
            <Link
              href="/portraits/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-canvas hover:bg-accent-2 transition-all font-medium text-sm"
            >
              Create Your First Portrait
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedItems).map(([date, dateItems]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-4 h-4 text-ink-subtle" />
                  <span className="text-sm text-ink-subtle">{date}</span>
                  <div className="flex-1 h-px bg-rim" />
                </div>

                <div className="space-y-3">
                  {dateItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-surface-raised rounded-xl border border-rim overflow-hidden"
                    >
                      {/* Main Row */}
                      <div
                        className="p-4 cursor-pointer hover:bg-surface transition-all"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="artframe w-12 h-12 bg-surface flex-shrink-0 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-ink-subtle" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-ink line-clamp-2 mb-2">
                              {displayPrompt(item)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {item.templateSlug && (
                                <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                                  {item.templateSlug}
                                </span>
                              )}
                              {item.aspectRatio && (
                                <span className="px-2 py-0.5 rounded-full bg-surface text-ink-muted">
                                  {item.aspectRatio}
                                </span>
                              )}
                              <span className="text-ink-subtle">{formatTime(item.createdAt)}</span>
                              {item.timesUsed > 1 && (
                                <span className="text-ink-subtle">• Used {item.timesUsed}×</span>
                              )}
                              {!item.wasSuccessful && (
                                <span className="px-2 py-0.5 rounded-full border border-danger text-danger">
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
                              disabled={actionLoading === item.id}
                              className={`p-2 rounded-lg transition-all ${
                                item.isSaved
                                  ? "bg-accent-soft text-accent"
                                  : "bg-surface text-ink-subtle hover:text-ink"
                              }`}
                            >
                              {actionLoading === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : item.isSaved ? (
                                <BookmarkCheck className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPrompt(displayPrompt(item), item.id);
                              }}
                              className="p-2 rounded-lg bg-surface text-ink-subtle hover:text-ink transition-all"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-4 h-4 text-positive" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <ChevronDown
                              className={`w-4 h-4 text-ink-subtle transition-transform ${
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
                            className="border-t border-rim"
                          >
                            <div className="p-4 space-y-4">
                              {/* Enhanced Prompt */}
                              {displayEnhanced(item) !== displayPrompt(item) && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-ink-subtle uppercase tracking-wider">
                                      Enhanced Prompt
                                    </span>
                                    <button
                                      onClick={() =>
                                        copyPrompt(displayEnhanced(item), `${item.id}-enhanced`)
                                      }
                                      className="text-xs text-ink-muted hover:text-accent flex items-center gap-1 transition-all"
                                    >
                                      {copiedId === `${item.id}-enhanced` ? (
                                        <>
                                          <Check className="w-3 h-3 text-positive" />
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
                                  <p className="text-sm text-ink-muted leading-relaxed bg-surface rounded-lg p-3">
                                    {displayEnhanced(item)}
                                  </p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                <Link
                                  href={`/generate?prompt=${encodeURIComponent(displayPrompt(item))}`}
                                  className="flex-1 py-2.5 rounded-xl bg-accent text-canvas hover:bg-accent-2 transition-all flex items-center justify-center gap-2 font-medium text-sm"
                                >
                                  <Play className="w-4 h-4" />
                                  Run Again
                                </Link>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  disabled={actionLoading === `${item.id}-delete`}
                                  className="py-2.5 px-4 rounded-xl bg-surface text-ink-subtle hover:text-danger transition-all"
                                >
                                  {actionLoading === `${item.id}-delete` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
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

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => fetchHistory(page - 1, searchQuery, filterSaved)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg bg-surface text-ink hover:bg-accent-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ← Previous
            </button>
            <span className="text-ink-muted text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchHistory(page + 1, searchQuery, filterSaved)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-lg bg-surface text-ink hover:bg-accent-soft disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
