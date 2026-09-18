#!/usr/bin/env node
/**
 * Asserts an article page renders editorial blocks rather than dropping them.
 *
 *   node scripts/check-blog-frontend.mjs <slug> [--base http://127.0.0.1:3000]
 *
 * A string-based Lexical converter silently emits "" for block nodes (they
 * carry their payload in `fields` and have no `children`), so the page still
 * returns 200 with prose intact while every callout, step card and table is
 * gone. Counting rendered block roots is the only check that catches that.
 */

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const baseIdx = args.indexOf("--base");
const base =
  baseIdx !== -1 ? args[baseIdx + 1] : "https://www.imagecrafter.app";

if (!slug) {
  console.error("usage: check-blog-frontend.mjs <slug> [--base <origin>]");
  process.exit(2);
}

const url = `${base.replace(/\/$/, "")}/blog/${slug}`;
const res = await fetch(url, { redirect: "follow" });
const html = await res.text();

const count = (re) => (html.match(re) || []).length;
const blockRoots = count(/class="xb-block[ "]/g);
const richtextRoots = count(/class="xb-richtext/g);

const checks = [
  ["HTTP 200", res.status === 200, res.status],
  ["<RichText> root present", richtextRoots === 1, richtextRoots],
  ["editorial blocks rendered", blockRoots > 0, blockRoots],
  [
    "no unrendered block placeholders",
    !/\[object Object\]/.test(html),
    /\[object Object\]/.test(html) ? "found" : "none",
  ],
  ["body text present", html.length > 5000, `${html.length}b`],
];

let failed = 0;
for (const [name, ok, detail] of checks) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} (${detail})`);
}

const byType = {};
for (const m of html.matchAll(/class="xb-block xb-([a-z0-9-]+)/g)) {
  const t = m[1].split(" ")[0];
  byType[t] = (byType[t] || 0) + 1;
}
console.log(`\n${url}\nblocks: ${JSON.stringify(byType)}`);

process.exit(failed === 0 ? 0 : 1);
