import type { MetadataRoute } from "next";
import { LEGAL_LINKS } from "@/lib/legal";
import { getBlogPosts } from "@/lib/payload";

/**
 * Dynamic Sitemap Generator
 * 
 * This generates a sitemap.xml at /sitemap.xml
 * Add dynamic pages (blog posts, etc.) as they're created
 */

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://imagecrafter.app";

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/memorial`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    { url: `${baseUrl}/blog` },
    ...LEGAL_LINKS.map((l) => ({
      url: `${baseUrl}${l.href}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const entries: MetadataRoute.Sitemap = [...staticPages];
  const authors = new Set<string>();
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getBlogPosts({ page, limit: 100 });
    totalPages = result.totalPages;
    for (const post of result.docs) {
      const url = `${baseUrl}/blog/${encodeURIComponent(post.slug)}`;
      if (post.noIndex || (post.canonicalUrl && post.canonicalUrl.replace(/\/$/, "") !== url)) continue;
      const modified = post.updatedAt || post.publishedAt || post.publishedDate;
      entries.push({ url, ...(modified && Number.isFinite(Date.parse(modified)) ? { lastModified: modified } : {}) });
      if (post.author && typeof post.author !== "string" && post.author.slug) authors.add(post.author.slug);
    }
    page++;
  } while (page <= totalPages);
  for (const slug of authors) entries.push({ url: `${baseUrl}/blog/author/${encodeURIComponent(slug)}` });
  return entries;
}
