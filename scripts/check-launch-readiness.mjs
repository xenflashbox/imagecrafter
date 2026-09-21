import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { fetchVaultSecrets } from './_infisical.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/xen/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.argv[2] || 'http://localhost:3100';
const id = 'eeadcfdf4e354582a2cdf50228ec5b02';
const secrets = await fetchVaultSecrets();
const prisma = new PrismaClient({ datasources: { db: { url: secrets.DATABASE_URL } } });
const b = await chromium.launch({ headless: true });
try {
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'imagecrafter' AND table_name = 'ic_Portrait'`;
  for (const name of ['id', 'sessionId']) assert.ok(columns.some(c => c.column_name === name));
  const portrait = await prisma.portrait.findUniqueOrThrow({ where: { id }, select: { sessionId: true } });
  for (const width of [320, 390, 768, 1440]) {
    const ctx = await b.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 } });
    if (portrait.sessionId) await ctx.addCookies([{ name: 'portrait_session_id', value: portrait.sessionId, url: base }]);
    const p = await ctx.newPage();
    for (const path of ['/', '/blog/custom-dog-paintings-from-your-photo', `/portraits/${id}/preview`, `/p/${id}`, '/portraits/create']) {
      const res = await p.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
      assert.equal(res.status(), 200, `${width} ${path}`);
      await p.waitForTimeout(1400);
      const dimensions = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scroll <= dimensions.width, `${width} ${path} overflows: ${JSON.stringify(dimensions)}`);
      assert.ok(await p.locator('footer').count(), `${path} missing footer`);
      if (path === '/' && width < 1024) {
        const menu = p.getByRole('button', { name: 'Open menu', exact: true });
        await menu.click();
        assert.ok(await p.getByRole('link', { name: 'My account', exact: true }).isVisible());
        await p.keyboard.press('Escape');
        assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      }
      if (path === '/' || path.startsWith('/blog/')) await p.screenshot({ path: `/tmp/ic-launch-${width}-${path === '/' ? 'home' : 'blog'}.png`, fullPage: path !== '/' });
      console.log('PASS', width, path);
    }
    const link = await ctx.request.post(`${base}/api/portraits/${id}/share-link`);
    assert.equal(link.status(), 200, await link.text());
    const { url } = await link.json();
    assert.ok(url.startsWith('https://go.imagecrafter.app/p-'));
    const twice = await ctx.request.post(`${base}/api/portraits/${id}/share-link`);
    assert.equal((await twice.json()).url, url);
    console.log('PASS stable branded link:', url);
    await ctx.close();
  }
  const guest = await b.newContext();
  assert.equal((await guest.request.post(`${base}/api/portraits/${id}/share-link`)).status(), 401);
  const sitemap = await guest.request.get(`${base}/sitemap.xml`);
  const xml = await sitemap.text();
  assert.equal(sitemap.status(), 200);
  assert.ok(xml.includes('/blog/custom-dog-paintings-from-your-photo'));
  assert.ok(xml.includes('/blog/author/jenna-hartley'));
  assert.ok(!xml.includes('/sign-in'));
  const saved = await guest.request.get(`${base}/api/portraits/${id}/share-image`);
  assert.equal(saved.status(), 200);
  writeFileSync('/tmp/ic-branded-preview.png', await saved.body());
  assert.equal((await guest.request.get(`${base}/api/print/products`)).status(), 503);
  console.log('PASS sitemap, guest authorization, branded image and print gate');
  await guest.close();
} finally { await b.close(); await prisma.$disconnect(); }
