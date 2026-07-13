/**
 * Admin Blog Management
 *
 * Blog content is managed in Payload CMS at cms.xencolabs.com (site ID 7 = ImageCrafter).
 * This page provides a quick link to the CMS admin plus a live preview of recent posts.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getBlogPosts, getCategoryTitle, getPostPublishedDate } from "@/lib/payload";
import { ExternalLink, PenSquare, Eye } from "lucide-react";

const CMS_ADMIN_URL =
  process.env.NEXT_PUBLIC_PAYLOAD_URL
    ? `${process.env.NEXT_PUBLIC_PAYLOAD_URL}/admin`
    : "https://cms.xencolabs.com/admin";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

export default async function AdminBlogPage() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }

  // No catch-and-render-empty: the admin must see the CMS failure, not
  // "0 posts" (fail-open audit, fix directive P1#3).
  const postsData = await getBlogPosts({ page: 1, limit: 20 });

  const posts = postsData.docs;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-medium">Blog Posts</h1>
          <p className="text-white/40 text-sm mt-1">
            Content managed via Payload CMS · {postsData.totalDocs} total
          </p>
        </div>
        <a
          href={`${CMS_ADMIN_URL}/collections/articles`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
        >
          <PenSquare className="w-4 h-4" />
          Open CMS Editor
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      {/* CMS info card */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5 mb-8">
        <h2 className="font-medium text-violet-300 mb-1">Managing Blog Content</h2>
        <p className="text-sm text-white/60 mb-3">
          All blog posts are created and published in the shared Payload CMS. ImageCrafter
          content is filtered by site ID 7. The live site automatically pulls published posts.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href={`${CMS_ADMIN_URL}/collections/articles/create`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
          >
            <PenSquare className="w-3.5 h-3.5" />
            New Article
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href={`${CMS_ADMIN_URL}/collections/categories`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
          >
            Manage Categories
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href={`${CMS_ADMIN_URL}/collections/media`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors"
          >
            Media Library
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* Live post list */}
      {posts.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-lg mb-2">No published posts found</p>
          <p className="text-sm">Create posts in the CMS and set status to &ldquo;published&rdquo;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const pubDate = getPostPublishedDate(post);
            const firstCategory = post.categories?.[0];
            return (
              <div
                key={post.id}
                className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 hover:border-white/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{post.title}</h3>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      published
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    {firstCategory && (
                      <span className="text-violet-400/70">
                        {getCategoryTitle(firstCategory)}
                      </span>
                    )}
                    {pubDate && (
                      <span>
                        {new Date(pubDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="text-white/20">/blog/{post.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    title="Preview post"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <a
                    href={`${CMS_ADMIN_URL}/collections/articles/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 hover:bg-violet-500/20 transition-colors text-white/50 hover:text-violet-400"
                    title="Edit in CMS"
                  >
                    <PenSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
