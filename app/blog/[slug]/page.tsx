/**
 * /blog/[slug] — Blog Post Detail (Public)
 *
 * Server-rendered. Fetches from Payload CMS (cms.xencolabs.com) with
 * site ID 7 (ImageCrafter). Renders Lexical rich text content.
 *
 * SEO:
 * - Dynamic generateMetadata with Open Graph, Twitter Card
 * - Article + BreadcrumbList JSON-LD structured data
 * - Canonical URL, robots meta
 *
 * Social sharing: Twitter/X and LinkedIn buttons.
 * No authentication required — fully public.
 */

import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogPost,
  getRelatedPosts,
  getPostHtml,
  getMediaUrl,
  getMediaUrlOrNull,
  getCategoryTitle,
  getCategorySlug,
  getTagLabel,
  getTagSlug,
  getPostPublishedDate,
  estimateReadTime,
} from "@/lib/payload";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";

export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";
const SITE_NAME = "ImageCrafter";
const SITE_DOMAIN = "imagecrafter.app";

// =============================================================================
// METADATA (Open Graph, Twitter, Canonical)
// =============================================================================

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };

  const pubDate = getPostPublishedDate(post);
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || "";
  const imageUrl = getMediaUrlOrNull(post.featuredImage);
  const canonical = post.canonicalUrl || `https://${SITE_DOMAIN}/blog/${slug}`;
  const robots = post.noIndex ? "noindex, nofollow" : "index, follow";

  const firstCategory = post.categories?.[0];
  const tags = (post.tags || []).map((t) => getTagLabel(t)).filter(Boolean);

  return {
    title: `${title} | ${SITE_NAME} Blog`,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      publishedTime: pubDate,
      modifiedTime: post.updatedAt,
      authors: post.author
        ? [typeof post.author === "string" ? post.author : post.author.name]
        : undefined,
      section: firstCategory ? getCategoryTitle(firstCategory) : undefined,
      tags: tags.length ? tags : undefined,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width:
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.width ?? undefined)
                  : undefined,
              height:
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.height ?? undefined)
                  : undefined,
              alt:
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.alt ?? post.title)
                  : post.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

// =============================================================================
// PAGE
// =============================================================================

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const pubDate = getPostPublishedDate(post);
  const readTime = estimateReadTime(post);
  const contentHtml = getPostHtml(post);
  const imageUrl = getMediaUrlOrNull(post.featuredImage);
  const postUrl = `${APP_URL}/blog/${post.slug}`;
  const canonical = post.canonicalUrl || postUrl;

  const firstCategory = post.categories?.[0];
  const tags = (post.tags || []).filter((t) => getTagLabel(t));
  const authorName =
    post.author
      ? typeof post.author === "string"
        ? post.author
        : post.author.name
      : SITE_NAME;

  const formattedDate = pubDate
    ? new Date(pubDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Related posts (same category)
  const categoryIds =
    (post.categories || [])
      .filter((c): c is { id: string; title: string; slug: string } => typeof c !== "string")
      .map((c) => c.id);
  const relatedPosts = await getRelatedPosts({
    currentSlug: post.slug,
    categoryIds,
    limit: 3,
  });

  // JSON-LD: Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || "",
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: pubDate,
    dateModified: post.updatedAt || pubDate,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${APP_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    keywords: [
      post.focusKeyword,
      ...tags.map((t) => getTagLabel(t)),
    ]
      .filter(Boolean)
      .join(", "),
  };

  // JSON-LD: BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `https://${SITE_DOMAIN}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `https://${SITE_DOMAIN}/blog`,
      },
      ...(firstCategory
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: getCategoryTitle(firstCategory),
              item: `https://${SITE_DOMAIN}/blog?category=${getCategorySlug(firstCategory)}`,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: post.title,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 3,
              name: post.title,
            },
          ]),
    ],
  };

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      <article className="min-h-screen bg-[#06060a] text-white">
        {/* Header */}
        <header className="border-b border-white/5">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-8" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              {firstCategory && (
                <>
                  <span>/</span>
                  <Link
                    href={`/blog?category=${getCategorySlug(firstCategory)}`}
                    className="hover:text-white transition-colors"
                  >
                    {getCategoryTitle(firstCategory)}
                  </Link>
                </>
              )}
            </nav>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            {firstCategory && (
              <Link
                href={`/blog?category=${getCategorySlug(firstCategory)}`}
                className="text-xs px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors mb-4 inline-block"
              >
                {getCategoryTitle(firstCategory)}
              </Link>
            )}

            <h1 className="text-3xl md:text-4xl font-light leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
              {formattedDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {readTime} min read
              </span>
              {authorName !== SITE_NAME && (
                <span className="text-white/40">By {authorName}</span>
              )}
            </div>
          </div>
        </header>

        {/* Cover image */}
        {imageUrl && (
          <div className="max-w-4xl mx-auto px-6 pt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.alt ?? post.title)
                  : post.title
              }
              width={
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.width ?? undefined)
                  : undefined
              }
              height={
                typeof post.featuredImage === "object"
                  ? (post.featuredImage?.height ?? undefined)
                  : undefined
              }
              className="w-full rounded-2xl object-cover max-h-96"
            />
          </div>
        )}

        {/* Lexical content */}
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div
            className="
              prose prose-invert prose-lg max-w-none
              prose-headings:font-medium prose-headings:text-white prose-headings:scroll-mt-8
              prose-p:text-white/80 prose-p:leading-relaxed
              prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white
              prose-code:bg-white/10 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-violet-300
              prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
              prose-blockquote:border-violet-500/60 prose-blockquote:bg-violet-500/5 prose-blockquote:text-white/70
              prose-blockquote:not-italic prose-blockquote:rounded-r-xl prose-blockquote:py-0.5
              prose-hr:border-white/10
              prose-img:rounded-xl
              prose-ul:text-white/80
              prose-ol:text-white/80
              prose-li:text-white/80
              [&_figure.article-image]:my-8
              [&_figure.article-image_img]:rounded-xl [&_figure.article-image_img]:w-full
              [&_figure.article-image_figcaption]:text-sm [&_figure.article-image_figcaption]:text-white/40 [&_figure.article-image_figcaption]:mt-2 [&_figure.article-image_figcaption]:text-center
              [&_code.inline-code]:bg-violet-900/40 [&_code.inline-code]:text-violet-300 [&_code.inline-code]:px-1.5 [&_code.inline-code]:py-0.5 [&_code.inline-code]:rounded [&_code.inline-code]:text-sm
              [&_hr.article-divider]:border-none [&_hr.article-divider]:h-px [&_hr.article-divider]:bg-gradient-to-r [&_hr.article-divider]:from-transparent [&_hr.article-divider]:via-white/20 [&_hr.article-divider]:to-transparent [&_hr.article-divider]:my-12
              [&_blockquote.article-blockquote]:border-l-4 [&_blockquote.article-blockquote]:border-violet-500 [&_blockquote.article-blockquote]:bg-violet-500/5 [&_blockquote.article-blockquote]:px-6 [&_blockquote.article-blockquote]:py-4 [&_blockquote.article-blockquote]:my-8 [&_blockquote.article-blockquote]:rounded-r-xl [&_blockquote.article-blockquote]:italic [&_blockquote.article-blockquote]:text-white/70
            "
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="max-w-3xl mx-auto px-6 pb-8">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => {
                const label = getTagLabel(tag);
                const tagSlug = getTagSlug(tag);
                return label ? (
                  <Link
                    key={i}
                    href={`/blog?tag=${tagSlug}`}
                    className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/50 border border-white/10 hover:border-violet-500/50 hover:text-white/80 transition-colors"
                  >
                    #{label}
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Share + CTA */}
        <div className="border-t border-white/5">
          <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Social sharing */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-white/50">
                <Share2 className="w-4 h-4" />
                Share:
              </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                aria-label="Share on Twitter/X"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                aria-label="Share on LinkedIn"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                aria-label="Share on Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            </div>

            <Link
              href="/portraits"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 font-medium transition-all text-sm whitespace-nowrap"
            >
              Try Portrait Studio Free →
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="border-t border-white/5 bg-white/2">
            <div className="max-w-5xl mx-auto px-6 py-12">
              <h2 className="text-xl font-medium mb-6 text-white/80">
                Related Articles
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => {
                  const relImg = getMediaUrlOrNull(related.featuredImage);
                  return (
                    <Link
                      key={related.id}
                      href={`/blog/${related.slug}`}
                      className="group bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-violet-500/40 transition-all"
                    >
                      {relImg ? (
                        <div className="aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={relImg}
                            alt={related.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-violet-900/30 to-pink-900/30 flex items-center justify-center">
                          <span className="text-3xl">🎨</span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-violet-300 transition-colors">
                          {related.title}
                        </h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </article>
    </>
  );
}
