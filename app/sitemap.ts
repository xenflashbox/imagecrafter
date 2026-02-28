import type { MetadataRoute } from "next";

/**
 * Dynamic Sitemap Generator
 * 
 * This generates a sitemap.xml at /sitemap.xml
 * Add dynamic pages (blog posts, etc.) as they're created
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://imagecrafter.app";

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/sign-in`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  // TODO: Add dynamic blog posts from Payload CMS
  // const posts = await getPayloadPosts();
  // const blogPages = posts.map(post => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: new Date(post.updatedAt),
  //   changeFrequency: "weekly" as const,
  //   priority: 0.7,
  // }));

  return [...staticPages];
}
