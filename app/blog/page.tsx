import Link from "next/link";
import { Metadata } from "next";
import { getBlogPosts, getCategories } from "@/lib/payload";
import { Calendar, Clock, User, ChevronRight, Tag } from "lucide-react";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Blog - AI Image Generation Tips & Tutorials",
  description:
    "Learn how to create stunning AI images with ImageCrafter. Tips, tutorials, and best practices for prompt engineering, character consistency, and more.",
  openGraph: {
    title: "ImageCrafter Blog",
    description: "Tips and tutorials for AI image generation",
  },
};

// =============================================================================
// PAGE
// =============================================================================

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const category = params.category;

  const [postsData, categories] = await Promise.all([
    getBlogPosts({ page, limit: 9, category }),
    getCategories(),
  ]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const estimateReadTime = (content: any) => {
    // Rough estimate: 200 words per minute
    const text = JSON.stringify(content);
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-violet-600/10 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-light mb-4">Blog</h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Tips, tutorials, and best practices for creating stunning AI images
          </p>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="border-b border-white/5">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Link
                href="/blog"
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  !category
                    ? "bg-violet-500 text-white"
                    : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                All Posts
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    category === cat.slug
                      ? "bg-violet-500 text-white"
                      : "bg-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {postsData.docs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50">No posts found.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {postsData.docs.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-violet-500/50 transition-all"
                >
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.featuredImage.url}
                        alt={post.featuredImage.alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-5">
                    {/* Categories */}
                    {post.categories && post.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.categories.map((cat) => (
                          <span
                            key={cat.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-lg font-medium mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="text-sm text-white/50 line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {estimateReadTime(post.content)} min read
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {postsData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {postsData.hasPrevPage && (
                  <Link
                    href={`/blog?page=${postsData.prevPage}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Previous
                  </Link>
                )}
                <span className="px-4 py-2 text-white/50">
                  Page {postsData.page} of {postsData.totalPages}
                </span>
                {postsData.hasNextPage && (
                  <Link
                    href={`/blog?page=${postsData.nextPage}${category ? `&category=${category}` : ""}`}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
