/**
 * Payload CMS Integration — ImageCrafter
 *
 * Fetches blog content from the shared Xenco Labs Payload CMS instance.
 * Site: ImageCrafter (site ID = 7, slug = "imagecrafter")
 * API Base: https://cms.imagecrafter.app/api
 * Admin: https://cms.imagecrafter.app/admin
 *
 * The CMS is HOST-SCOPED: each tenant's domain serves only that tenant's
 * documents. https://cms.xencolabs.com returns site 9 and will report zero
 * ImageCrafter authors/articles no matter what `where[site]` filter or API key
 * you send. Point this at an imagecrafter.app host or every query comes back
 * empty.
 *
 * Articles are filtered by site ID so this app only sees its own content.
 * Lexical rich-text is rendered server-side to HTML (never sent raw JSON to client).
 */

const PAYLOAD_PUBLIC =
  process.env.NEXT_PUBLIC_PAYLOAD_URL ||
  process.env.PAYLOAD_CMS_URL ||
  "https://cms.imagecrafter.app";

const PAYLOAD_API = `${PAYLOAD_PUBLIC}/api`;
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;

/** ImageCrafter site ID in the shared CMS */
const SITE_ID = Number(process.env.PAYLOAD_SITE_ID || 7);

export const DEFAULT_BLOG_PLACEHOLDER = "/placeholder-blog.jpg";

/**
 * Cache tag on every CMS read, so /api/revalidate can drop the whole Payload
 * Data Cache the moment an article is published instead of waiting out the
 * 60s window below.
 */
export const PAYLOAD_CACHE_TAG = "payload";

// =============================================================================
// TYPES
// =============================================================================

export interface PayloadMediaSize {
  url?: string;
  width?: number;
  height?: number;
}

export interface PayloadMedia {
  id?: string | number;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Percent coordinates of the subject. Payload defaults both to 50. */
  focalX?: number;
  focalY?: number;
  sizes?: Record<string, PayloadMediaSize | undefined>;
}

export interface PayloadAuthor {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  bio?: string;
  avatar?: PayloadMedia;
  avatarUrl?: string;
}

export interface PayloadCategory {
  id: string;
  title: string;
  name?: string;
  slug: string;
}

export interface PayloadTag {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
  tag?: string;
}

export interface PayloadPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  featuredImage?: PayloadMedia | string;
  heroImage?: PayloadMedia | string;
  author?: PayloadAuthor | string;
  categories?: Array<PayloadCategory | string>;
  tags?: Array<PayloadTag | string>;
  /** Lexical JSON content */
  content?: unknown;
  html?: string;
  contentHtml?: string;
  publishedDate?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  readTime?: number;
  status?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  noIndex?: boolean;
  canonicalUrl?: string | null;
}

export interface PayloadPaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

// =============================================================================
// API CLIENT
// =============================================================================

async function payloadFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PAYLOAD_API}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(PAYLOAD_API_KEY && {
      Authorization: `users API-Key ${PAYLOAD_API_KEY}`,
    }),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    next: { revalidate: 60, tags: [PAYLOAD_CACHE_TAG] },
  });

  if (!response.ok) {
    throw new Error(
      `Payload CMS error: ${response.status} ${response.statusText} for ${url}`
    );
  }

  return response.json() as Promise<T>;
}

// =============================================================================
// MEDIA HELPERS
// =============================================================================

export function getMediaUrl(media?: PayloadMedia | string | null): string {
  if (!media) return DEFAULT_BLOG_PLACEHOLDER;

  if (typeof media === "string") {
    if (media.startsWith("http")) return media;
    if (media.startsWith("/")) return `${PAYLOAD_PUBLIC}${media}`;
    return media;
  }

  if (media.url) {
    if (media.url.startsWith("http")) return media.url;
    if (media.url.startsWith("/")) return `${PAYLOAD_PUBLIC}${media.url}`;
    return media.url;
  }

  return DEFAULT_BLOG_PLACEHOLDER;
}

export function getMediaUrlOrNull(
  media?: PayloadMedia | string | null
): string | null {
  if (!media) return null;
  const url = getMediaUrl(media);
  return url === DEFAULT_BLOG_PLACEHOLDER ? null : url;
}

export interface AuthorAvatarSource {
  url: string;
  alt: string;
  focalX: number;
  focalY: number;
}

/**
 * Avatar source for an author, preferring the square thumbnail derivative —
 * the originals are multi-megabyte PNGs and these render at 32–64px.
 */
export function getAuthorAvatar(
  author?: PayloadAuthor | string | null
): AuthorAvatarSource | null {
  if (!author || typeof author === "string") return null;

  const avatar = author.avatar;
  const url =
    getMediaUrlOrNull(avatar?.sizes?.thumbnail?.url) ??
    getMediaUrlOrNull(avatar) ??
    getMediaUrlOrNull(author.avatarUrl);
  if (!url) return null;

  return {
    url,
    alt: avatar?.alt || `${author.name} avatar`,
    focalX: avatar?.focalX ?? 50,
    focalY: avatar?.focalY ?? 50,
  };
}

// =============================================================================
// POST FIELD HELPERS
// =============================================================================

export function getPostPublishedDate(post: PayloadPost): string {
  return post.publishedAt || post.publishedDate || post.createdAt || "";
}

export function getTagLabel(tag: PayloadTag | string): string {
  if (typeof tag === "string") return tag;
  return tag.name || tag.title || tag.tag || "";
}

export function getTagSlug(tag: PayloadTag | string): string {
  if (typeof tag === "string") {
    return tag.trim().toLowerCase().replace(/\s+/g, "-");
  }
  const label = getTagLabel(tag);
  return (
    tag.slug || label.trim().toLowerCase().replace(/\s+/g, "-")
  );
}

export function getCategoryTitle(
  cat: PayloadCategory | string | undefined
): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat.title || cat.name || "";
}

export function getCategorySlug(
  cat: PayloadCategory | string | undefined
): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat.toLowerCase().replace(/\s+/g, "-");
  return cat.slug || "";
}

// =============================================================================
// ARTICLE BODY
// =============================================================================

/**
 * Pre-rendered HTML from a legacy WordPress import.
 *
 * Lexical articles return null and must be rendered by the editorial-blocks
 * <RichText> router instead — a string converter drops every block node.
 */
export function getLegacyHtml(post: PayloadPost): string | null {
  if (typeof post.html === "string" && post.html.trim()) return post.html;
  if (typeof post.contentHtml === "string" && post.contentHtml.trim())
    return post.contentHtml;
  if (typeof post.content === "string" && post.content.trim())
    return post.content;
  return null;
}

/** The Lexical tree, or null when the post carries no structured body. */
export function getLexicalContent(post: PayloadPost): { root: unknown } | null {
  const content = post.content;
  if (content && typeof content === "object" && "root" in content) {
    return content as { root: unknown };
  }
  return null;
}

export function estimateReadTime(post: PayloadPost): number {
  const wordsPerMinute = 200;
  let text = post.excerpt || "";

  if (typeof post.content === "string") {
    text += " " + post.content;
  } else if (post.content && typeof post.content === "object") {
    text += " " + JSON.stringify(post.content);
  }

  const wordCount = text
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

// =============================================================================
// BLOG POSTS — PUBLIC API
// =============================================================================

/**
 * Fetch published blog posts for the ImageCrafter site (site ID 7).
 */
export async function getBlogPosts(options: {
  page?: number;
  limit?: number;
  category?: string;
} = {}): Promise<PayloadPaginatedResponse<PayloadPost>> {
  const { page = 1, limit = 9, category } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: "-publishedAt",
    "where[status][equals]": "published",
    depth: "2",
  });

  if (SITE_ID > 0) params.set("where[site][equals]", String(SITE_ID));

  if (category) {
    params.set("where[categories.slug][equals]", category);
  }

  return payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/articles?${params.toString()}`
  );
}

/**
 * Fetch a single published post by slug.
 */
export async function getBlogPost(
  slug: string
): Promise<PayloadPost | null> {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    "where[status][equals]": "published",
    depth: "2",
    limit: "1",
  });

  if (SITE_ID > 0) params.set("where[site][equals]", String(SITE_ID));

  // Errors propagate: a CMS outage must surface as an error, never as a
  // 404 for a post that exists (fail-open audit, fix directive P1#3).
  const data = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/articles?${params.toString()}`
  );
  return data.docs[0] || null;
}

/**
 * Fetch a single author by slug.
 */
export async function getAuthorBySlug(
  slug: string
): Promise<PayloadAuthor | null> {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    depth: "1",
    limit: "1",
  });

  if (SITE_ID > 0) params.set("where[site][equals]", String(SITE_ID));

  const data = await payloadFetch<PayloadPaginatedResponse<PayloadAuthor>>(
    `/authors?${params.toString()}`
  );
  return data.docs[0] || null;
}

/**
 * Fetch published posts written by an author.
 */
export async function getPostsByAuthor(
  authorId: string,
  options: { page?: number; limit?: number } = {}
): Promise<PayloadPaginatedResponse<PayloadPost>> {
  const { page = 1, limit = 12 } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: "-publishedAt",
    "where[status][equals]": "published",
    "where[author][equals]": String(authorId),
    depth: "2",
  });

  if (SITE_ID > 0) params.set("where[site][equals]", String(SITE_ID));

  return payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/articles?${params.toString()}`
  );
}

/**
 * Fetch related posts by category IDs (excluding current slug).
 */
export async function getRelatedPosts({
  currentSlug,
  categoryIds,
  limit = 3,
}: {
  currentSlug: string;
  categoryIds: string[];
  limit?: number;
}): Promise<PayloadPost[]> {
  if (categoryIds.length === 0) return [];

  const categoryWhere = categoryIds
    .map(
      (id, idx) =>
        `where[or][${idx}][categories][contains]=${encodeURIComponent(id)}`
    )
    .join("&");

  const siteFilter =
    SITE_ID > 0 ? `&where[site][equals]=${SITE_ID}` : "";

  const url = `/articles?${categoryWhere}${siteFilter}&where[slug][not_equals]=${encodeURIComponent(currentSlug)}&where[status][equals]=published&depth=2&limit=${limit}`;

  const data =
    await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(url);
  return data.docs || [];
}

/**
 * Get all published post slugs for static path generation.
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const params = new URLSearchParams({
    "where[status][equals]": "published",
    limit: "1000",
    depth: "0",
  });

  if (SITE_ID > 0) params.set("where[site][equals]", String(SITE_ID));

  // Errors propagate: silently returning [] here made a dead CMS look like
  // "a blog with no posts" at build time.
  const data = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/articles?${params.toString()}`
  );
  return data.docs.map((p) => p.slug);
}

// =============================================================================
// CATEGORIES
// =============================================================================

export interface PayloadCategoryWithCount extends PayloadCategory {
  postCount?: number;
}

export async function getCategories(): Promise<PayloadCategory[]> {
  const data = await payloadFetch<
    PayloadPaginatedResponse<PayloadCategory>
  >("/categories?limit=100&depth=0");
  return data.docs || [];
}
