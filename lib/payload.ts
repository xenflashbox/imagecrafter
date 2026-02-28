/**
 * Payload CMS Integration — ImageCrafter
 *
 * Fetches blog content from the shared Xenco Labs Payload CMS instance.
 * Site: ImageCrafter (site ID = 7, slug = "imagecrafter")
 * API Base: https://cms.xencolabs.com/api
 * Admin: https://cms.xencolabs.com/admin
 *
 * Articles are filtered by site ID so this app only sees its own content.
 * Lexical rich-text is rendered server-side to HTML (never sent raw JSON to client).
 */

const PAYLOAD_PUBLIC =
  process.env.NEXT_PUBLIC_PAYLOAD_URL ||
  process.env.PAYLOAD_CMS_URL ||
  "https://cms.xencolabs.com";

const PAYLOAD_API = `${PAYLOAD_PUBLIC}/api`;
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;

/** ImageCrafter site ID in the shared CMS */
const SITE_ID = Number(process.env.PAYLOAD_SITE_ID || 7);

export const DEFAULT_BLOG_PLACEHOLDER = "/placeholder-blog.jpg";

// =============================================================================
// TYPES
// =============================================================================

export interface PayloadMedia {
  id?: string | number;
  url?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PayloadAuthor {
  id: string;
  name: string;
  bio?: string;
  avatar?: PayloadMedia;
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
    next: { revalidate: 60 },
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
// LEXICAL RICH TEXT → HTML RENDERER
// =============================================================================

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function renderLexicalText(node: Record<string, unknown>): string {
  let text = (node.text as string) || "";
  if (!text) return "";

  const format = (node.format as number) || 0;
  if (format & 1) text = `<strong>${text}</strong>`;
  if (format & 2) text = `<em>${text}</em>`;
  if (format & 4) text = `<s>${text}</s>`;
  if (format & 8) text = `<u>${text}</u>`;
  if (format & 16) text = `<code class="inline-code">${text}</code>`;
  if (format & 32) text = `<sub>${text}</sub>`;
  if (format & 64) text = `<sup>${text}</sup>`;

  return text;
}

function renderLexicalChildren(
  children: unknown[] | undefined
): string {
  if (!children || !Array.isArray(children)) return "";
  return children
    .map((child) => renderLexicalNode(child as Record<string, unknown>))
    .join("");
}

function renderLexicalNode(node: Record<string, unknown>): string {
  const type = node.type as string;
  const children = node.children as unknown[] | undefined;
  const innerHtml = renderLexicalChildren(children);

  switch (type) {
    case "text":
      return renderLexicalText(node);

    case "paragraph":
      return innerHtml
        ? `<p>${innerHtml}</p>`
        : `<p>&nbsp;</p>`;

    case "heading": {
      const tag = (node.tag as string) || "h2";
      const text = children
        ? (children as Record<string, unknown>[])
            .map((c) => (c.text as string) || "")
            .join("")
        : "";
      const id = slugifyHeading(text);
      return `<${tag} id="${id}">${innerHtml}</${tag}>`;
    }

    case "list": {
      const listType = node.listType as string;
      const tag = listType === "number" ? "ol" : "ul";
      return `<${tag}>${innerHtml}</${tag}>`;
    }

    case "listitem":
      return `<li>${innerHtml}</li>`;

    case "quote":
    case "blockquote":
      return `<blockquote class="article-blockquote">${innerHtml}</blockquote>`;

    case "horizontalrule":
      return `<hr class="article-divider" />`;

    case "link": {
      const fields = isObject(node.fields) ? node.fields : {};
      const url = (fields.url as string) || "#";
      const newTab = fields.newTab as boolean;
      const isExternal =
        newTab || url.startsWith("http") || url.startsWith("//");
      const rel = isExternal ? ' rel="noopener noreferrer"' : "";
      const target = isExternal ? ' target="_blank"' : "";
      return `<a href="${url}"${target}${rel}>${innerHtml}</a>`;
    }

    case "upload": {
      const value = isObject(node.value) ? node.value : {};
      const fields = isObject(node.fields) ? node.fields : {};
      const imgUrl = getMediaUrl(value as PayloadMedia);
      const alt =
        (value.alt as string) ||
        (fields.caption as string) ||
        "";
      const caption = fields.caption as string | undefined;
      const width = value.width as number | undefined;
      const height = value.height as number | undefined;
      return `<figure class="article-image">
  <img
    src="${imgUrl}"
    alt="${alt}"
    ${width ? `width="${width}"` : ""}
    ${height ? `height="${height}"` : ""}
    loading="lazy"
    decoding="async"
  />
  ${caption ? `<figcaption>${caption}</figcaption>` : ""}
</figure>`;
    }

    case "checklist": {
      const checked = node.checked as boolean;
      return `<li class="checklist-item ${checked ? "checked" : ""}">
  <input type="checkbox" disabled ${checked ? "checked" : ""} />
  <span>${innerHtml}</span>
</li>`;
    }

    default:
      return innerHtml || "";
  }
}

/**
 * Render a Payload Lexical JSON tree to HTML.
 * Accepts the full `content` field value (the root node or the content object).
 */
export function renderLexicalToHtml(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  let root: Record<string, unknown> | null = null;

  if (isObject(content)) {
    if (content.root && isObject(content.root)) {
      root = content.root as Record<string, unknown>;
    } else if (content.type === "root") {
      root = content as Record<string, unknown>;
    }
  }

  if (!root) return "";

  const children = root.children as unknown[] | undefined;
  if (!children) return "";

  return children
    .map((node) => renderLexicalNode(node as Record<string, unknown>))
    .join("\n");
}

/**
 * Get the best renderable HTML from a post.
 * Falls back to excerpt if no content available.
 */
export function getPostHtml(post: PayloadPost): string {
  if (typeof post.html === "string" && post.html.trim()) return post.html;
  if (typeof post.contentHtml === "string" && post.contentHtml.trim())
    return post.contentHtml;
  if (typeof post.content === "string" && post.content.trim())
    return post.content;
  if (post.content && typeof post.content === "object") {
    const html = renderLexicalToHtml(post.content);
    if (html.trim()) return html;
  }
  return `<p>${post.excerpt || ""}</p>`;
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

  try {
    const data = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
      `/articles?${params.toString()}`
    );
    return data.docs[0] || null;
  } catch {
    return null;
  }
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

  try {
    const data =
      await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(url);
    return data.docs || [];
  } catch {
    return [];
  }
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

  try {
    const data = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
      `/articles?${params.toString()}`
    );
    return data.docs.map((p) => p.slug);
  } catch {
    return [];
  }
}

// =============================================================================
// CATEGORIES
// =============================================================================

export interface PayloadCategoryWithCount extends PayloadCategory {
  postCount?: number;
}

export async function getCategories(): Promise<PayloadCategory[]> {
  try {
    const data = await payloadFetch<
      PayloadPaginatedResponse<PayloadCategory>
    >("/categories?limit=100&depth=0");
    return data.docs || [];
  } catch {
    return [];
  }
}
