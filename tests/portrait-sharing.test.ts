import assert from "node:assert/strict";
import { test } from "node:test";
import { createPortraitShareLink, portraitShareDestination } from "../lib/services/portrait-sharing";

test("sharing accepts portrait IDs, never arbitrary destinations", () => {
  assert.throws(() => portraitShareDestination("https://outside.example/path"));
  const url = new URL(portraitShareDestination("portrait_test_123"));
  assert.equal(url.origin, "https://imagecrafter.app");
  assert.equal(url.pathname, "/p/portrait_test_123");
  assert.equal(url.searchParams.get("utm_source"), "portrait_share");
});

test("Shlink creates once, reuses stable link and rejects mismatched destinations", async t => {
  const original = { url: process.env.SHLINK_API_URL, key: process.env.SHLINK_API_KEY, domain: process.env.SHLINK_DOMAIN };
  t.after(() => {
    for (const [name, value] of Object.entries({ SHLINK_API_URL: original.url, SHLINK_API_KEY: original.key, SHLINK_DOMAIN: original.domain })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.SHLINK_API_URL = "https://shortener.example";
  process.env.SHLINK_API_KEY = "unit-test-only";
  process.env.SHLINK_DOMAIN = "go.imagecrafter.app";
  let saved: { longUrl: string; shortUrl: string } | undefined;
  let creates = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    if (options.method === "POST") {
      creates++;
      const body = JSON.parse(options.body as string);
      saved = { longUrl: body.longUrl, shortUrl: `https://${body.domain}/${body.customSlug}` };
    }
    return new Response(JSON.stringify(saved || {}), { status: saved ? 200 : 404 });
  });
  const first = await createPortraitShareLink("portrait_test_123");
  assert.equal(await createPortraitShareLink("portrait_test_123"), first);
  assert.equal(creates, 1);
  saved!.longUrl = "https://outside.example";
  await assert.rejects(createPortraitShareLink("portrait_test_123"), /unexpected destination/);
});
