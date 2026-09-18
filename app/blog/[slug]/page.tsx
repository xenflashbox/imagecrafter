/**
 * /blog/[slug] — Blog Post Detail (Public)
 *
 * Server-rendered. Fetches from Payload CMS (cms.imagecrafter.app) with
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
  getLegacyHtml,
  getLexicalContent,
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
import { AuthorAvatar } from "@/components/author-avatar";
import { ArticleBody } from "@/components/article-body";

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
  const legacyHtml = getLegacyHtml(post);
  const lexicalContent = legacyHtml ? null : getLexicalContent(post);
  const imageUrl = getMediaUrlOrNull(post.featuredImage);
  const postUrl = `${APP_URL}/blog/${post.slug}`;
  const canonical = post.canonicalUrl || postUrl;

  const firstCategory = post.categories?.[0];
  const tags = (post.tags || []).filter((t) => getTagLabel(t));
  const author = typeof post.author === "object" ? post.author : null;
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

      <article className="bg-canvas text-ink">
        {/* Header */}
        <header className="border-b border-rim">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-ink-faint mb-8" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-ink transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-ink transition-colors">Blog</Link>
              {firstCategory && (
                <>
                  <span>/</span>
                  <Link
                    href={`/blog?category=${getCategorySlug(firstCategory)}`}
                    className="hover:text-ink transition-colors"
                  >
                    {getCategoryTitle(firstCategory)}
                  </Link>
                </>
              )}
            </nav>

            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-ink-subtle hover:text-ink mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>

            {firstCategory && (
              <Link
                href={`/blog?category=${getCategorySlug(firstCategory)}`}
                className="text-xs px-3 py-1 rounded-full bg-accent-soft text-accent hover:bg-accent-soft transition-colors mb-4 inline-block"
              >
                {getCategoryTitle(firstCategory)}
              </Link>
            )}

            <h1 className="text-3xl md:text-4xl font-light leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-subtle">
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
              {authorName !== SITE_NAME &&
                (author?.slug ? (
                  <Link
                    href={`/blog/author/${author.slug}`}
                    className="flex items-center gap-2 hover:text-accent transition-colors"
                  >
                    <AuthorAvatar author={author} size={32} />
                    By {authorName}
                  </Link>
                ) : (
                  <span className="text-ink-subtle">By {authorName}</span>
                ))}
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

        {/* Article body */}
        <div className="max-w-3xl mx-auto px-6 py-10">
          {legacyHtml ? (
            <div
              className="
              prose prose-invert prose-lg max-w-none
              prose-headings:font-medium prose-headings:text-ink prose-headings:scroll-mt-8
              prose-p:text-ink-muted prose-p:leading-relaxed
              prose-a:text-accent prose-a:no-underline hover:prose-a:underline
              prose-strong:text-ink
              prose-code:bg-surface prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-accent
              prose-pre:bg-surface prose-pre:border prose-pre:border-rim
              prose-blockquote:border-accent-rim prose-blockquote:bg-accent-soft prose-blockquote:text-ink-muted
              prose-blockquote:not-italic prose-blockquote:rounded-r-xl prose-blockquote:py-0.5
              prose-hr:border-rim
              prose-img:rounded-xl
              prose-ul:text-ink-muted
              prose-ol:text-ink-muted
              prose-li:text-ink-muted
              [&_figure.article-image]:my-8
              [&_figure.article-image_img]:rounded-xl [&_figure.article-image_img]:w-full
              [&_figure.article-image_figcaption]:text-sm [&_figure.article-image_figcaption]:text-ink-subtle [&_figure.article-image_figcaption]:mt-2 [&_figure.article-image_figcaption]:text-center
              [&_code.inline-code]:bg-accent-soft [&_code.inline-code]:text-accent [&_code.inline-code]:px-1.5 [&_code.inline-code]:py-0.5 [&_code.inline-code]:rounded [&_code.inline-code]:text-sm
              [&_hr.article-divider]:border-none [&_hr.article-divider]:h-px [&_hr.article-divider]:bg-gradient-to-r [&_hr.article-divider]:from-transparent [&_hr.article-divider]:via-rim [&_hr.article-divider]:to-transparent [&_hr.article-divider]:my-12
              [&_blockquote.article-blockquote]:border-l-4 [&_blockquote.article-blockquote]:border-accent [&_blockquote.article-blockquote]:bg-accent-soft [&_blockquote.article-blockquote]:px-6 [&_blockquote.article-blockquote]:py-4 [&_blockquote.article-blockquote]:my-8 [&_blockquote.article-blockquote]:rounded-r-xl [&_blockquote.article-blockquote]:italic [&_blockquote.article-blockquote]:text-ink-muted
            "
              dangerouslySetInnerHTML={{ __html: legacyHtml }}
            />
          ) : lexicalContent ? (
            <ArticleBody content={lexicalContent} />
          ) : post.excerpt ? (
            <p className="text-ink-muted leading-relaxed">{post.excerpt}</p>
          ) : null}
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
                    className="text-xs px-3 py-1 rounded-full bg-surface text-ink-subtle border border-rim hover:border-accent-rim hover:text-ink transition-colors"
                  >
                    #{label}
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Share + CTA */}
        <div className="border-t border-rim">
          <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Social sharing */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-ink-subtle">
                <Share2 className="w-4 h-4" />
                Share:
              </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-surface hover:bg-surface transition-colors text-sm flex items-center gap-2"
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
                className="px-4 py-2 rounded-lg bg-surface hover:bg-surface transition-colors text-sm flex items-center gap-2"
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
                className="px-4 py-2 rounded-lg bg-surface hover:bg-surface transition-colors text-sm flex items-center gap-2"
                aria-label="Share on Facebook"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            </div>

            <Link
              href="/"
              className="px-6 py-3 rounded-xl bg-accent text-canvas hover:opacity-90 font-medium transition-all text-sm whitespace-nowrap"
            >
              Try Portrait Studio Free →
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="border-t border-rim bg-surface">
            <div className="max-w-5xl mx-auto px-6 py-12">
              <h2 className="text-xl font-medium mb-6 text-ink-muted">
                Related Articles
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => {
                  const relImg = getMediaUrlOrNull(related.featuredImage);
                  return (
                    <Link
                      key={related.id}
                      href={`/blog/${related.slug}`}
                      className="group bg-surface rounded-xl border border-rim overflow-hidden hover:border-accent-rim transition-all"
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
                        <div className="aspect-video bg-surface flex items-center justify-center">
                          <span className="text-3xl">🎨</span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-accent transition-colors">
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
