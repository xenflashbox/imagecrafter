/**
 * Payload CMS Integration
 * 
 * This file provides utilities for fetching blog content from your Payload CMS instance.
 * Update PAYLOAD_URL to point to your Payload CMS server.
 */

const PAYLOAD_URL = process.env.PAYLOAD_CMS_URL || "https://cms.xencolabs.com";
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;

// =============================================================================
// TYPES
// =============================================================================

export interface PayloadImage {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface PayloadAuthor {
  id: string;
  name: string;
  role?: string;
  avatar?: PayloadImage;
  bio?: string;
}

export interface PayloadCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PayloadPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any; // Rich text content from Payload
  featuredImage?: PayloadImage;
  author?: PayloadAuthor;
  categories?: PayloadCategory[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published";
  seo?: {
    title?: string;
    description?: string;
    image?: PayloadImage;
  };
}

export interface PayloadPaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
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
  const url = `${PAYLOAD_URL}/api${endpoint}`;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(PAYLOAD_API_KEY && { Authorization: `Bearer ${PAYLOAD_API_KEY}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    next: { revalidate: 60 }, // Revalidate every 60 seconds
  });

  if (!response.ok) {
    throw new Error(`Payload CMS error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// BLOG POSTS
// =============================================================================

/**
 * Get all published blog posts with pagination
 */
export async function getBlogPosts(options: {
  page?: number;
  limit?: number;
  category?: string;
} = {}): Promise<PayloadPaginatedResponse<PayloadPost>> {
  const { page = 1, limit = 10, category } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: "-publishedAt",
    "where[status][equals]": "published",
    depth: "2", // Include related documents
  });

  if (category) {
    params.append("where[categories.slug][equals]", category);
  }

  return payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/posts?${params.toString()}`
  );
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<PayloadPost | null> {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    "where[status][equals]": "published",
    depth: "2",
    limit: "1",
  });

  const response = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/posts?${params.toString()}`
  );

  return response.docs[0] || null;
}

/**
 * Get all post slugs for static generation
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const params = new URLSearchParams({
    "where[status][equals]": "published",
    limit: "1000",
    depth: "0",
  });

  const response = await payloadFetch<PayloadPaginatedResponse<PayloadPost>>(
    `/posts?${params.toString()}`
  );

  return response.docs.map((post) => post.slug);
}

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * Get all blog categories
 */
export async function getCategories(): Promise<PayloadCategory[]> {
  const response = await payloadFetch<PayloadPaginatedResponse<PayloadCategory>>(
    "/categories?limit=100"
  );

  return response.docs;
}

// =============================================================================
// AUTHORS
// =============================================================================

/**
 * Get author by ID
 */
export async function getAuthor(id: string): Promise<PayloadAuthor | null> {
  try {
    return await payloadFetch<PayloadAuthor>(`/authors/${id}`);
  } catch {
    return null;
  }
}

// =============================================================================
// RICH TEXT RENDERER
// =============================================================================

/**
 * Convert Payload rich text to HTML
 * Payload uses Slate for rich text, this converts it to renderable content
 */
export function renderRichText(content: any[]): string {
  if (!content || !Array.isArray(content)) return "";

  return content
    .map((node) => {
      if (node.type === "h1") {
        return `<h1 class="text-3xl font-bold mt-8 mb-4">${renderChildren(node.children)}</h1>`;
      }
      if (node.type === "h2") {
        return `<h2 class="text-2xl font-bold mt-6 mb-3">${renderChildren(node.children)}</h2>`;
      }
      if (node.type === "h3") {
        return `<h3 class="text-xl font-semibold mt-4 mb-2">${renderChildren(node.children)}</h3>`;
      }
      if (node.type === "paragraph" || node.type === "p") {
        return `<p class="mb-4 leading-relaxed">${renderChildren(node.children)}</p>`;
      }
      if (node.type === "ul") {
        return `<ul class="list-disc list-inside mb-4 space-y-1">${renderChildren(node.children)}</ul>`;
      }
      if (node.type === "ol") {
        return `<ol class="list-decimal list-inside mb-4 space-y-1">${renderChildren(node.children)}</ol>`;
      }
      if (node.type === "li") {
        return `<li>${renderChildren(node.children)}</li>`;
      }
      if (node.type === "blockquote") {
        return `<blockquote class="border-l-4 border-violet-500 pl-4 italic text-white/70 my-4">${renderChildren(node.children)}</blockquote>`;
      }
      if (node.type === "code") {
        return `<pre class="bg-white/5 rounded-lg p-4 overflow-x-auto my-4"><code>${renderChildren(node.children)}</code></pre>`;
      }
      if (node.type === "upload" && node.value) {
        return `<figure class="my-6"><img src="${node.value.url}" alt="${node.value.alt || ""}" class="rounded-lg w-full" />${node.value.caption ? `<figcaption class="text-sm text-white/50 mt-2 text-center">${node.value.caption}</figcaption>` : ""}</figure>`;
      }
      
      // Default: try to render children
      if (node.children) {
        return renderChildren(node.children);
      }
      
      return "";
    })
    .join("");
}

function renderChildren(children: any[]): string {
  if (!children || !Array.isArray(children)) return "";

  return children
    .map((child) => {
      if (typeof child === "string") return child;
      if (child.text !== undefined) {
        let text = child.text;
        if (child.bold) text = `<strong>${text}</strong>`;
        if (child.italic) text = `<em>${text}</em>`;
        if (child.underline) text = `<u>${text}</u>`;
        if (child.strikethrough) text = `<del>${text}</del>`;
        if (child.code) text = `<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm">${text}</code>`;
        return text;
      }
      if (child.type === "link") {
        return `<a href="${child.url}" class="text-violet-400 hover:text-violet-300 underline">${renderChildren(child.children)}</a>`;
      }
      if (child.children) {
        return renderChildren(child.children);
      }
      return "";
    })
    .join("");
}
