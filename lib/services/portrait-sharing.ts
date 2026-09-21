import { createHash } from "node:crypto";

export function portraitShareDestination(id: string) {
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(id)) throw new Error("Invalid portrait ID");
  const url = new URL(`/p/${id}`, "https://imagecrafter.app");
  url.searchParams.set("utm_source", "portrait_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "preview");
  return url.toString();
}

export async function createPortraitShareLink(id: string): Promise<string> {
  const longUrl = portraitShareDestination(id);
  const domain = process.env.SHLINK_DOMAIN;
  const api = process.env.SHLINK_API_URL;
  const key = process.env.SHLINK_API_KEY;
  if (!domain || !api || !key) throw new Error("Branded sharing is not configured");
  const slug = `p-${createHash("sha256").update(id).digest("hex").slice(0, 20)}`;
  const headers = { "X-Api-Key": key, "Content-Type": "application/json" };
  const endpoint = `${api.replace(/\/$/, "")}/rest/v3/short-urls`;
  const lookup = `${endpoint}/${slug}?domain=${encodeURIComponent(domain)}`;
  let response = await fetch(lookup, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (response.status === 404) {
    response = await fetch(endpoint, {
      method: "POST", headers, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ longUrl, domain, customSlug: slug, findIfExists: true, tags: ["imagecrafter", "portrait-preview"] }),
    });
    // Two tabs may request the same stable link at the same time.
    if (response.status === 409) response = await fetch(lookup, { headers, signal: AbortSignal.timeout(8000), cache: "no-store" });
  }
  if (!response.ok) throw new Error(`Shlink returned HTTP ${response.status}`);
  const result = await response.json();
  const expected = `https://${domain}/${slug}`;
  if (result.longUrl !== longUrl || result.shortUrl !== expected) throw new Error("Shlink returned an unexpected destination");
  return expected;
}
