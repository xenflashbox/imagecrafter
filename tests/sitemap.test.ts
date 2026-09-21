import assert from "node:assert/strict";
import { test } from "node:test";
import sitemap from "../app/sitemap";

test("sitemap paginates and excludes private, noindex and noncanonical pages", async t => {
  const pages: number[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    const page = Number(url.searchParams.get("page"));
    assert.equal(url.searchParams.get("where[status][equals]"), "published");
    pages.push(page);
    return new Response(JSON.stringify({ totalPages: 2, docs: page === 1 ? [
      { slug: "visible", updatedAt: "2026-09-21T00:00:00Z", author: { slug: "writer" } },
      { slug: "hidden", noIndex: true },
      { slug: "syndicated", canonicalUrl: "https://outside.example/article" },
    ] : [{ slug: "second-page" }] }));
  });
  const result = await sitemap();
  const urls = result.map(entry => entry.url);
  assert.deepEqual(pages, [1, 2]);
  assert.ok(urls.includes("https://imagecrafter.app/blog/visible"));
  assert.ok(urls.includes("https://imagecrafter.app/blog/second-page"));
  assert.ok(urls.includes("https://imagecrafter.app/blog/author/writer"));
  assert.ok(!urls.some(url => /sign-in|sign-up|hidden|syndicated/.test(url)));
  assert.equal(result.find(entry => entry.url === "https://imagecrafter.app")?.lastModified, undefined);
});
