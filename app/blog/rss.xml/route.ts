/**
 * RSS Feed — /blog/rss.xml
 *
 * Returns an RSS 2.0 feed of the 20 most recent published blog posts.
 * Data sourced from Payload CMS (cms.xencolabs.com), site ID 7.
 * Public endpoint, no authentication required.
 */

import { NextResponse } from "next/server";
import {
  getBlogPosts,
  getMediaUrl,
  getCategoryTitle,
  getTagLabel,
  getPostPublishedDate,
} from "@/lib/payload";

export const dynamic = "force-dynamic";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://imagecrafter.app";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // No catch-and-render-empty: a dead CMS must return 503, never a valid
  // empty feed that readers cache (fail-open audit, fix directive P1#3).
  let posts: Awaited<ReturnType<typeof getBlogPosts>>["docs"];

  try {
    const data = await getBlogPosts({ page: 1, limit: 20 });
    posts = data.docs || [];
  } catch (err) {
    console.error("RSS feed: Payload CMS fetch failed:", err);
    return new NextResponse("RSS feed temporarily unavailable", {
      status: 503,
      headers: { "Retry-After": "3600" },
    });
  }

  const items = posts
    .map((post) => {
      const url = `${APP_URL}/blog/${post.slug}`;
      const pubDateStr = getPostPublishedDate(post);
      const pubDate = pubDateStr
        ? new Date(pubDateStr).toUTCString()
        : new Date().toUTCString();
      const imageUrl = getMediaUrl(post.featuredImage);
      const firstCategory = post.categories?.[0];
      const tags = post.tags || [];

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt || post.title)}</description>
      <pubDate>${pubDate}</pubDate>
      ${firstCategory ? `<category>${escapeXml(getCategoryTitle(firstCategory))}</category>` : ""}
      ${tags
        .map((t) => {
          const label = getTagLabel(t);
          return label ? `<category>${escapeXml(label)}</category>` : "";
        })
        .join("\n      ")}
      ${imageUrl !== "/placeholder-blog.jpg" ? `<enclosure url="${imageUrl}" type="image/jpeg" />` : ""}
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ImageCrafter Blog</title>
    <link>${APP_URL}/blog</link>
    <description>Tips, tutorials, and best practices for AI image generation and portrait art</description>
    <language>en-US</language>
    <image>
      <url>${APP_URL}/logo.png</url>
      <title>ImageCrafter Blog</title>
      <link>${APP_URL}/blog</link>
    </image>
    <atom:link href="${APP_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
