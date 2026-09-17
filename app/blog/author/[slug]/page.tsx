/**
 * /blog/author/[slug] — Author archive (Public)
 *
 * Server-rendered from Payload CMS. The CMS is host-scoped, so this only ever
 * sees ImageCrafter (site 7) authors and articles.
 */

import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAuthorBySlug,
  getPostsByAuthor,
  getMediaUrl,
  getCategoryTitle,
  getPostPublishedDate,
  estimateReadTime,
} from "@/lib/payload";
import { AuthorAvatar } from "@/components/author-avatar";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const SITE_NAME = "ImageCrafter";
const SITE_DOMAIN = "imagecrafter.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) {
    return { title: "Author not found" };
  }

  const description =
    author.bio || `Articles by ${author.name} on the ${SITE_NAME} blog.`;

  return {
    title: `${author.name} — Blog`,
    description,
    alternates: { canonical: `https://${SITE_DOMAIN}/blog/author/${slug}` },
    openGraph: {
      title: `${author.name} — ${SITE_NAME}`,
      description,
      url: `https://${SITE_DOMAIN}/blog/author/${slug}`,
      type: "profile",
      siteName: SITE_NAME,
    },
  };
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1"));

  const author = await getAuthorBySlug(slug);
  if (!author) notFound();

  const { docs: posts, totalPages, hasPrevPage, hasNextPage } =
    await getPostsByAuthor(author.id, { page, limit: 9 });

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: author.name,
              ...(author.role ? { jobTitle: author.role } : {}),
              ...(author.bio ? { description: author.bio } : {}),
              url: `https://${SITE_DOMAIN}/blog/author/${slug}`,
            },
          }),
        }}
      />

      {/* Header */}
      <div className="border-b border-rim bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-ink-subtle hover:text-accent transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" /> Back to blog
          </Link>

          <div className="flex items-start gap-5">
            <AuthorAvatar author={author} size={64} />
            <div>
              <h1 className="text-3xl md:text-4xl font-light">{author.name}</h1>
              {author.role && (
                <p className="text-sm text-accent mt-1">{author.role}</p>
              )}
              {author.bio && (
                <p className="text-ink-muted mt-3 max-w-2xl leading-relaxed">
                  {author.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-ink-subtle mb-2">
              No published articles from {author.name} yet.
            </p>
            <p className="text-ink-faint text-sm">Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const imgUrl = getMediaUrl(post.featuredImage);
                const hasImage = imgUrl !== "/placeholder-blog.jpg";
                const firstCategory = post.categories?.[0];

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface rounded-xl border border-rim overflow-hidden hover:border-accent-rim transition-all"
                  >
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
                          {formatDate(getPostPublishedDate(post))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {estimateReadTime(post)} min
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                {hasPrevPage && (
                  <Link
                    href={`/blog/author/${slug}?page=${page - 1}`}
                    className="px-4 py-2 rounded-lg bg-surface hover:border-accent-rim border border-rim transition-colors text-sm"
                  >
                    ← Previous
                  </Link>
                )}
                <span className="px-4 py-2 text-ink-subtle text-sm">
                  Page {page} of {totalPages}
                </span>
                {hasNextPage && (
                  <Link
                    href={`/blog/author/${slug}?page=${page + 1}`}
                    className="px-4 py-2 rounded-lg bg-surface hover:border-accent-rim border border-rim transition-colors text-sm"
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
            Ready to create your own portrait?
          </h2>
          <p className="text-ink-subtle mb-6">
            Turn a photo you love into art worth hanging — no account required.
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
