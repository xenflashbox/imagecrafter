/**
 * /blog — Blog Index (Public)
 *
 * Server-rendered. Fetches content from Payload CMS (cms.imagecrafter.app)
 * filtered to ImageCrafter site (ID 7). Supports category filtering and
 * pagination via URL search params.
 *
 * No authentication required — fully public.
 */

import Link from "next/link";
import { Metadata } from "next";
import {
  getBlogPosts,
  getCategories,
  getMediaUrl,
  getCategoryTitle,
  getCategorySlug,
  getTagLabel,
  getPostPublishedDate,
  estimateReadTime,
} from "@/lib/payload";
import { Calendar, Clock, ChevronRight, Rss, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

const SITE_NAME = "ImageCrafter";
const SITE_DOMAIN = "imagecrafter.app";

export const metadata: Metadata = {
  title: "Blog — AI Portrait & Image Generation Tips | ImageCrafter",
  description:
    "Learn how to create stunning AI portraits and images. Tips on AI pet portraits, family portraits, prompt engineering, and the best AI art generators in 2026.",
  openGraph: {
    title: "ImageCrafter Blog",
    description:
      "AI portrait and image generation tips, tutorials, and inspiration",
    url: `https://${SITE_DOMAIN}/blog`,
    type: "website",
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "ImageCrafter Blog",
    description:
      "AI portrait and image generation tips, tutorials, and inspiration",
  },
  alternates: {
    canonical: `https://${SITE_DOMAIN}/blog`,
    types: {
      "application/rss+xml": `https://${SITE_DOMAIN}/blog/rss.xml`,
    },
  },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const category = params.category;

  // No catch-and-render-empty: a dead CMS must surface as an error page,
  // not as "a blog with no posts" (fail-open audit, fix directive P1#3).
  const [postsData, categories] = await Promise.all([
    getBlogPosts({ page, category, limit: 9 }),
    getCategories(),
  ]);

  const { docs: posts, totalPages, hasPrevPage, hasNextPage } = postsData;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Header */}
      <div className="border-b border-rim bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-accent bg-accent-soft rounded-full px-3 py-1 mb-4">
            <Tag className="w-3 h-3" />
            AI Art &amp; Portrait Studio
          </div>
          <h1 className="text-4xl md:text-5xl font-light mb-4">Blog</h1>
          <p className="text-lg text-ink-muted max-w-xl mx-auto">
            Tips, tutorials, and inspiration for AI portraits and image
            generation
          </p>
          <div className="mt-4">
            <a
              href="/blog/rss.xml"
              className="inline-flex items-center gap-1.5 text-xs text-ink-subtle hover:text-orange-400 transition-colors"
            >
              <Rss className="w-3 h-3" /> RSS Feed
            </a>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="border-b border-rim">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Link
                href="/blog"
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  !category
                    ? "bg-accent text-canvas"
                    : "bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                All Posts
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${getCategorySlug(cat)}`}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    category === getCategorySlug(cat)
                      ? "bg-accent text-canvas"
                      : "bg-surface text-ink-muted hover:text-ink"
                  }`}
                >
                  {getCategoryTitle(cat)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✍️</div>
            <p className="text-ink-subtle mb-2">No posts yet.</p>
            <p className="text-ink-faint text-sm">
              Check back soon for AI image generation tips and tutorials.
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const pubDate = getPostPublishedDate(post);
                const imgUrl = getMediaUrl(post.featuredImage);
                const hasImage = imgUrl !== "/placeholder-blog.jpg";
                const firstCategory =
                  post.categories?.[0];
                const tags = post.tags || [];

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface rounded-xl border border-rim overflow-hidden hover:border-accent-rim transition-all"
                  >
                    {/* Cover image */}
                    {hasImage ? (
                      <div className="aspect-video overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={
                            typeof post.featuredImage === "object" &&
                            post.featuredImage?.alt
                              ? post.featuredImage.alt
                              : post.title
                          }
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-surface flex items-center justify-center">
                        <span className="text-4xl">🎨</span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {firstCategory && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent mb-3 inline-block">
                          {getCategoryTitle(firstCategory)}
                        </span>
                      )}
                      <h2 className="text-base font-medium mb-2 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-ink-subtle line-clamp-2 mb-4">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-ink-subtle">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(pubDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(post)} min
                        </span>
                      </div>
                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((t, i) => {
                            const label = getTagLabel(t);
                            return label ? (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-surface text-ink-faint border border-rim"
                              >
                                #{label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                {hasPrevPage && (
                  <Link
                    href={`/blog?page=${page - 1}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 rounded-lg bg-surface hover:bg-surface transition-colors text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="px-4 py-2 text-ink-subtle text-sm">
                  Page {page} of {totalPages}
                </span>
                {hasNextPage && (
                  <Link
                    href={`/blog?page=${page + 1}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 rounded-lg bg-surface hover:bg-surface transition-colors text-sm"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <div className="border-t border-rim bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-light mb-3">
            Ready to create your own AI portrait?
          </h2>
          <p className="text-ink-subtle mb-6">
            Transform any photo into stunning art — no account required.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-canvas font-medium hover:opacity-90 transition-all"
          >
            Start Portrait Studio <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
