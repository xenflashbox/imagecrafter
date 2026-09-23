import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fetchVaultSecrets } from '../scripts/_infisical.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/xen/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.argv[2] || 'http://localhost:3101';
const secrets = await fetchVaultSecrets();
const url = new URL('/api/articles', secrets.NEXT_PUBLIC_PAYLOAD_URL || secrets.PAYLOAD_CMS_URL || 'https://cms.imagecrafter.app');
url.search = new URLSearchParams({ 'where[site][equals]': '7', 'where[status][equals]': 'published', depth: '2', limit: '100' });
const response = await fetch(url, { headers: { Authorization: `users API-Key ${secrets.PAYLOAD_API_KEY}` } });
assert(response.ok);
const data = await response.json();
assert(!data.hasNextPage, 'Expand pagination before auditing more than 100 posts');
assert(data.docs.length > 0);
const browser = await chromium.launch();
function blocks(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (node.type === 'block') found.push(node.fields);
  for (const child of Object.values(node)) if (typeof child === 'object') blocks(child, found);
  return found;
}
function text(node) {
  if (!node || typeof node !== 'object') return '';
  return node.text || Object.values(node).filter(v => typeof v === 'object').map(text).join('');
}
try {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  for (const post of data.docs) {
    const res = await fetch(`${base}/blog/${post.slug}?cb=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    assert.equal(res.status, 200, post.slug);
    await page.setContent(await res.text(), { waitUntil: 'domcontentloaded' });
    const hero = page.locator('[data-article-hero] img');
    assert.equal(await hero.count(), 1);
    assert.equal(await hero.getAttribute('loading'), 'eager');
    assert.equal(await hero.getAttribute('fetchpriority'), 'high');
    assert(Number(await hero.getAttribute('width')) > 0);
    assert(Number(await hero.getAttribute('height')) > 0);
    assert(await hero.evaluate(img => Boolean(img.closest('header').querySelector('h1').compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING)));
    const source = blocks(post.content);
    const steps = source.filter(b => b.blockType === 'step-card');
    assert.equal(await page.locator('.article-body .xb-step').count(), steps.length, `${post.slug} step count`);
    for (const step of steps) {
      const rendered = page.locator('.article-body .xb-step').filter({ has: page.getByRole('heading', { name: step.title, exact: true }) });
      assert((await rendered.innerText()).includes(text(step.body)), `${post.slug} missing step body`);
    }
    const images = source.filter(b => b.blockType === 'image-with-caption');
    for (const image of images) {
      const rendered = page.locator('.article-body .xb-figure img');
      const matching = await rendered.evaluateAll((nodes, expected) => nodes.filter(n => n.getAttribute('src') === expected.src && n.getAttribute('alt') === expected.alt && Number(n.getAttribute('width')) === expected.width && Number(n.getAttribute('height')) === expected.height && n.loading === 'lazy').length, image);
      assert.equal(matching, 1, `${post.slug} image attributes: ${image.alt}`);
      if (image.caption) assert((await page.locator('.article-body').innerText()).includes(image.caption));
    }
    assert.equal(await page.locator('.article-body .xb-figure img').count(), images.length);
    if (post.author?.bio) {
      const bio = page.getByRole('region', { name: 'About the author' });
      assert.equal(await bio.count(), 1);
      assert((await bio.innerText()).includes(post.author.bio));
    }
    console.log(`PASS served HTML ${post.slug}: ${steps.length} steps, ${images.length} captioned images, eager hero, author bio`);
  }
  await context.close();
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 } });
    const p = await ctx.newPage();
    await p.goto(`${base}/blog/rainbow-bridge-what-it-means-and-how-pet-owners-find-comfort`, { waitUntil: 'domcontentloaded' });
    const hero = p.locator('[data-article-hero] img');
    await hero.evaluate(img => img.decode());
    const box = await hero.boundingBox();
    const title = await p.locator('h1').boundingBox();
    assert(Math.abs(box.width - title.width) < 2);
    assert(box.y >= title.y + title.height);
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.screenshot({ path: `/tmp/ic-blog-editorial-${width}.png` });
    console.log(`PASS ${width}px hero full content width, loaded image, no overflow`);
    await ctx.close();
  }
} finally { await browser.close(); }
