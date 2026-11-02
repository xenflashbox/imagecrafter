#!/usr/bin/env node
// Post-deploy check for a BlogCraft property's article pages.
//
// WHY THIS EXISTS. Eight of seventeen blog frontends had no CI at all, so a
// deploy that broke every article route reached production and stayed there
// until somebody read the blog. The backend cannot see this: it hands a correct
// article to Make, Make posts it to Payload, and the frontend decides whether a
// reader ever sees it. Every failure in that last hop returns HTTP 200
// somewhere and looks plausible.
//
// It reads the SITEMAP rather than a /blog index, for three reasons: the
// sitemap is what Google crawls, so a stale or wrong one is itself the defect;
// article paths differ per property (/blog, /analysis, and the root on
// Diabetes Compass), and a prefix-specific index check silently passes on a
// site whose prefix it guessed wrong; and an index page that renders zero links
// is indistinguishable from a site with no articles.
//
// Usage: node scripts/check-blog-pages.mjs [baseUrl] [--prefix=/blog] [--sample=12]
//
// Exit 0 = pass, 1 = fail. No dependencies; Node 18+.

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith("--")) || process.env.SITE_URL || "")
  .replace(/\/+$/, "");
if (!base) {
  console.error("usage: check-blog-pages.mjs <baseUrl> [--prefix=/blog] [--sample=12]");
  process.exit(2);
}
const opt = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
// An empty prefix is legitimate: Diabetes Compass serves articles at the root.
const prefix = opt("prefix", process.env.ARTICLE_PATH_PREFIX ?? "/blog");
const sample = Number(opt("sample", "12"));
// Static routes that live alongside articles. Required for a property with an
// EMPTY prefix (Diabetes Compass serves articles at the root), where otherwise
// /about, /search and /terms are indistinguishable from articles and the check
// reports a false failure on a page that was never an article.
const exclude = (opt("exclude", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const bust = `cb=${Date.now()}`;
const failures = [];
const ua = "xenco-blog-check/1 (+frontend CI)";

async function get(url) {
  const u = url + (url.includes("?") ? "&" : "?") + bust;
  try {
    const res = await fetch(u, { redirect: "follow", headers: { "user-agent": ua } });
    return { status: res.status, body: await res.text(), url: u };
  } catch (e) {
    return { status: 0, body: String(e), url: u };
  }
}

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

// --- the sitemap ------------------------------------------------------------

const smUrl = `${base}/sitemap.xml`;
const sm = await get(smUrl);
if (sm.status !== 200) {
  console.error(`FAIL sitemap ${sm.status} ${smUrl}`);
  console.error("\nA missing sitemap is not cosmetic: it is how Google finds "
    + "every article on a site with few inbound links.");
  process.exit(1);
}

let urls = [];
if (/<sitemapindex/i.test(sm.body)) {
  // A sitemap index points at child sitemaps. Following them is required, not
  // optional — treating an index as a urlset reads as "zero pages".
  const children = locs(sm.body);
  console.log(`sitemap index with ${children.length} child sitemap(s)`);
  for (const child of children.slice(0, 10)) {
    const c = await get(child);
    if (c.status === 200) urls.push(...locs(c.body));
    else console.log(`warn child sitemap ${c.status} ${child}`);
  }
} else {
  urls = locs(sm.body);
}
console.log(`sitemap: ${urls.length} URL(s)`);
if (urls.length === 0) failures.push("sitemap parsed to zero URLs");

// --- pick the article pages -------------------------------------------------

const origin = new URL(base).origin;
const articles = urls
  .filter((u) => u.startsWith(origin))
  .map((u) => new URL(u).pathname)
  .filter((p) => (prefix ? p.startsWith(prefix) && p !== prefix : p.split("/").length === 2 && p !== "/"))
  .filter((p) => !exclude.some((x) => p === x || p.startsWith(`${x}/`)))
  .filter((p, i, a) => a.indexOf(p) === i);

console.log(`${articles.length} article path(s) under ${prefix || "/ (root)"}`);
if (articles.length === 0) {
  failures.push(`no article paths under ${prefix || "root"} — either the prefix `
    + `is wrong for this property or the sitemap lists no articles`);
}

// --- check a sample ---------------------------------------------------------
//
// A property with an empty prefix serves articles at the root, where no path
// rule can tell an article from /about or /editorial-standards. For those,
// classify by the signal Google itself uses: Article / BlogPosting JSON-LD. A
// page without it is not treated as an article rather than failed — but the
// COUNT of such pages is reported, because a site whose articles carry no
// Article schema at all is the crawler-invisible defect, not a clean result.
const ARTICLE_SCHEMA = /"@type"\s*:\s*"(Article|BlogPosting|NewsArticle|TechArticle)"/i;
const classifyBySchema = !prefix;

const chosen = articles.slice(0, classifyBySchema ? sample * 4 : sample);
let checked = 0;
let notArticles = 0;
for (const path of chosen) {
  if (checked >= sample) break;
  const page = await get(`${base}${path}`);
  if (classifyBySchema && page.status === 200 && !ARTICLE_SCHEMA.test(page.body)) {
    notArticles += 1;
    continue;
  }
  checked += 1;
  const h2 = (page.body.match(/<h2[\s>]/g) || []).length;
  // Scripts and styles must come out BEFORE the tag strip, or a Next.js RSC
  // payload counts as prose: three Xenco Labs articles measured 20,000+ "words"
  // on the first run, which is a measurement artefact, not a long article.
  const words = page.body
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/).filter(Boolean).length;
  // A byline is part of the contract: an article with no visible author is the
  // defect that put nine articles under a real person's name with no author at
  // all on three properties.
  const byline = /rel="author"|itemprop="author"|class="[^"]*author|"@type"\s*:\s*"Person"/i
    .test(page.body);
  const ok = page.status === 200 && h2 > 0 && words > 300;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${page.status} ${path} `
    + `(${words} words, ${h2} h2, byline ${byline ? "yes" : "NO"})`);
  if (!ok) {
    failures.push(`${path} returned ${page.status} with ${h2} <h2> and ${words} words`);
  } else if (!byline) {
    // Reported, not fatal: it is a real defect but not a broken page, and a
    // check that fails on everything gets switched off.
    console.log(`     warn no byline markup on ${path}`);
  }
}

if (classifyBySchema) {
  console.log(`\n${checked} article(s) checked by Article schema; `
    + `${notArticles} sitemap page(s) carried none (static pages, or articles `
    + `whose structured data never reaches the served HTML)`);
  if (checked === 0) {
    failures.push("no page in the sitemap carried Article/BlogPosting JSON-LD — "
      + "either this property has no articles, or its structured data is "
      + "injected client-side where crawlers never see it");
  }
}

// --- an unknown slug must 404 ----------------------------------------------

const unknownPath = `${prefix || ""}/this-article-does-not-exist-ci-check`;
const missing = await get(`${base}${unknownPath}`);
const soft404 = missing.status === 200;
console.log(`${missing.status === 404 ? "ok  " : "FAIL"} ${missing.status} ${unknownPath}`);
if (soft404) {
  failures.push(`unknown slug returned 200 (soft 404) — Google indexes these as `
    + `duplicates of each other and drops the real articles`);
} else if (missing.status !== 404) {
  failures.push(`unknown slug returned ${missing.status}, expected 404`);
}

if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nblog page check passed");
