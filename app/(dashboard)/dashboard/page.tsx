"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Download,
  Zap,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  Sparkles,
  FolderKanban,
  History,
  Camera,
  Loader2,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface DashboardStats {
  imagesGenerated: number;
  imagesLimit: number;
  plan: string;
  daysUntilReset: number;
  favoriteTemplate: string;
  averageGenerationTime: number;
}

interface RecentImage {
  id: string;
  imageUrl: string;
  prompt: string;
  templateName?: string;
  createdAt: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

// Quick actions (static config — no mock data)


const quickActions: QuickAction[] = [
  {
    label: "Create Image",
    href: "/generate",
    icon: Sparkles,
    description: "Start a new generation",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    label: "Portrait Studio",
    href: "/portraits/create",
    icon: Camera,
    description: "Transform photos into art",
    color: "from-pink-500 to-rose-500",
  },
  {
    label: "Gallery",
    href: "/gallery",
    icon: ImageIcon,
    description: "Browse all your images",
    color: "from-cyan-500 to-blue-500",
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Manage character consistency",
    color: "from-orange-500 to-pink-500",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [portraitCount, setPortraitCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/usage").then((r) => r.json()),
      fetch("/api/images?limit=6").then((r) => r.json()),
      fetch("/api/portraits?userId=me&limit=1").then((r) => r.json()).catch((err) => {
        console.error("Portrait count fetch failed:", err);
        setLoadError("Some dashboard data failed to load. Please refresh the page.");
        return null;
      }),
    ]).then(([usageData, imagesData, portraitsData]) => {
      if (usageData && !usageData.error) {
        const daysLeft = usageData.creditsResetAt
          ? Math.max(0, Math.ceil((new Date(usageData.creditsResetAt).getTime() - Date.now()) / 86400000))
          : 30;
        setStats({
          imagesGenerated: usageData.used ?? 0,
          imagesLimit: usageData.limit ?? 10,
          plan: usageData.plan ?? "FREE",
          daysUntilReset: daysLeft,
          favoriteTemplate: "—",
          averageGenerationTime: 18,
        });
      } else {
        console.error("Usage fetch returned error:", usageData?.error);
        setLoadError("Failed to load your usage stats. Please refresh the page.");
      }
      if (imagesData?.success && Array.isArray(imagesData.images)) {
        setRecentImages(
          imagesData.images.map((img: { id: string; imageUrl: string; originalPrompt: string; template?: { name: string } | null; generatedAt?: string; createdAt?: string }) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            prompt: img.originalPrompt,
            templateName: img.template?.name,
            createdAt: img.generatedAt || img.createdAt || new Date().toISOString(),
          }))
        );
      }
      if (portraitsData?.success) {
        setPortraitCount(portraitsData.pagination?.total ?? portraitsData.portraits?.length ?? 0);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Dashboard data fetch failed:", err);
      setLoadError("Failed to load your dashboard. Please refresh the page.");
      setLoading(false);
    });
  }, []);

  const usagePercent = stats ? (stats.imagesGenerated / stats.imagesLimit) * 100 : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const handleDownload = async (image: RecentImage) => {
    const response = await fetch(image.imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `imagecrafter-${image.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/50 text-sm mb-1">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </div>
              <h1 className="text-2xl font-light">Welcome back</h1>
            </div>
            <Link
              href="/generate"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center gap-2 font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Create Image
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loadError && (
          <div className="text-red-400 text-sm bg-red-500/10 px-4 py-3 rounded-xl mb-6">
            {loadError}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Usage Card */}
          <div className="md:col-span-2 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 rounded-xl p-6 border border-violet-500/20">
            {loading || !stats ? (
              <div className="flex items-center gap-3 text-white/40">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading usage...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-white/60 mb-1">Monthly Usage</div>
                    <div className="text-3xl font-light">
                      {stats.imagesGenerated}
                      <span className="text-white/40 text-lg"> / {stats.imagesLimit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs px-2 py-1 rounded-full bg-white/10 inline-block mb-1">
                      {stats.plan} Plan
                    </div>
                    <div className="text-xs text-white/40">
                      Resets in {stats.daysUntilReset} days
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usagePercent}%` }}
                    className={`h-full rounded-full ${
                      usagePercent > 80
                        ? "bg-gradient-to-r from-orange-500 to-red-500"
                        : "bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    }`}
                  />
                </div>
              </>
            )}
          </div>

          {/* Portrait count */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
              <Camera className="w-4 h-4" />
              Portraits
            </div>
            <div className="text-xl font-medium">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-white/40" /> : (portraitCount ?? 0)}
            </div>
            <Link href="/gallery?tab=portraits" className="text-xs text-violet-400 hover:text-violet-300 mt-1 flex items-center gap-1">
              View portrait history <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
              <Clock className="w-4 h-4" />
              Avg. Generation
            </div>
            <div className="text-xl font-medium">~18s</div>
            <div className="text-xs text-white/40 mt-1">Per image</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={action.href}
                  className="block bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all group"
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-medium group-hover:text-violet-300 transition-colors">
                    {action.label}
                  </div>
                  <div className="text-xs text-white/40">{action.description}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Images */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Recent Images</h2>
            <Link
              href="/gallery"
              className="text-sm text-white/50 hover:text-white flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentImages.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-12 border border-white/10 text-center">
              <ImageIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No images yet</h3>
              <p className="text-white/50 mb-4">Create your first image to get started</p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Create Image
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {recentImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative aspect-video">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.imageUrl}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Link
                        href={`/gallery?image=${image.id}`}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDownload(image)}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-sm text-white/80 line-clamp-1 mb-2">{image.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      {image.templateName && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                          {image.templateName}
                        </span>
                      )}
                      <span>{formatDate(image.createdAt)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-6 border border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Pro Tip</h3>
              <p className="text-sm text-white/60 mb-3">
                Try the Children's Book template with character anchoring to create consistent 
                illustrations across multiple pages. Perfect for self-publishing!
              </p>
              <Link
                href="/generate?template=childrens-book"
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Try it now →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
