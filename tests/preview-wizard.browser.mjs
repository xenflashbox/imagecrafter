import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/xen/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.argv[2] || 'http://localhost:3100';
const consentCase = process.argv.includes('--consent');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const catalog = await (await context.request.get(`${base}/api/portraits/style-packs`)).json();
  let catalogCalls = 0;
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.shareChecks = { copied: [], shared: [], intents: [] };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.shareChecks.copied.push(value); } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.shareChecks.shared.push({ url: data.url, text: data.text, files: data.files?.length }); } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    window.open = url => { window.shareChecks.intents.push(url); return null; };
  });
  if (process.env.DEBUG_BROWSER) page.on('pageerror', error => console.error(error.message));
  await page.route('**/api/portraits/style-packs', async route => {
    catalogCalls++;
    if (catalogCalls > 1) await new Promise(resolve => setTimeout(resolve, 1500));
    await route.fulfill({ json: catalog });
  });
  await page.route('**/api/portraits/upload-url', route => route.fulfill({ json: {
    success: true, portraitId: 'test_portrait_fixture', sessionId: 'test_session_fixture',
    key: 'test/upload.jpg', uploadUrl: `${base}/__test-upload`,
  } }));
  await page.route('**/__test-upload', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/portraits/upload-complete', route => route.fulfill({ json: {
    success: true, portraitId: 'test_portrait_fixture', sessionId: 'test_session_fixture',
  } }));
  let generationCalls = 0;
  await page.route('**/api/portraits/generate', async route => {
    generationCalls++;
    if (consentCase && generationCalls === 1) {
      assert.equal(route.request().postDataJSON().marketingConsent, false);
      return route.fulfill({ status: 403, json: { success: false, code: 'email_required', error: 'Enter your email to continue.' } });
    }
    if (consentCase) assert.equal(route.request().postDataJSON().marketingConsent, true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    await route.fulfill({ json: { success: true, previewImageUrl: 'https://images.imagecrafter.app/gallery/v4/after/d-dog-corgi--baroque.jpg' } });
  });
  let shortenerCalls = 0;
  await page.route('**/api/portraits/test_portrait_fixture/share-link', route => {
    shortenerCalls++;
    return route.fulfill({ status: 503, body: 'Shortener must not be called' });
  });
  await page.route('**/api/portraits/test_portrait_fixture/share-image?v=2', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGNcAAAAASUVORK5CYII=', 'base64') }));
  await page.goto(`${base}/portraits/create`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const input = document.querySelector('input[type=file]');
    return input && Object.keys(input).some(key => key.startsWith('__reactProps$') && typeof input[key]?.onChange === 'function');
  });
  const photo = await context.request.get('https://images.imagecrafter.app/gallery/v4/before/d-dog-corgi.jpg');
  await page.locator('input[type=file]').setInputFiles({ name: 'fixture.jpg', mimeType: 'image/jpeg', buffer: await photo.body() });
  if (process.env.DEBUG_BROWSER) {
    await page.waitForTimeout(3000);
    console.log('Photo response', photo.status(), photo.headers()['content-type']);
    console.log((await page.locator('body').innerText()).slice(0,1800));
  }
  await page.getByRole('button', { name: /Continue to Style Selection/ }).click();
  await page.getByRole('button', { name: 'Generate Portrait', exact: true }).click();
  if (consentCase) {
    const consent = page.getByRole('checkbox');
    await consent.waitFor();
    assert.equal(await consent.isChecked(), false);
    await page.locator('input[type=email]').fill('qa-consent@example.test');
    await consent.check();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/ic-consent-390.png' });
    await page.getByRole('button', { name: 'Keep Creating' }).click();
  }
  await page.getByRole('heading', { name: 'Your portrait is ready' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Copy link', exact: true }).waitFor();
  await page.waitForTimeout(1800);
  assert.equal(catalogCalls, 1, 'Query-string update must not reload the restore catalog');
  assert.ok(await page.getByRole('heading', { name: 'Your portrait is ready' }).isVisible());
  const direct = 'https://imagecrafter.app/p/test_portrait_fixture';
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByRole('button', { name: 'Share image', exact: true }).click();
  for (const name of ['Facebook', 'X', 'Pinterest']) await page.getByRole('button', { name, exact: true }).click();
  const checks = await page.evaluate(() => window.shareChecks);
  assert.deepEqual(checks.copied, [direct]);
  assert.equal(checks.shared[0].url, direct);
  assert(checks.shared[1].text.includes(direct));
  assert.equal(checks.shared[1].files, 1);
  assert.equal(checks.intents.length, 3);
  for (const intent of checks.intents) {
    const params = new URL(intent).searchParams;
    assert.equal(params.get('u') || params.get('url'), direct);
  }
  assert.equal(shortenerCalls, 0);
  console.log('PASS: clipboard, native sharing, image caption and all social buttons use direct HTTPS; no Shlink request');
  console.log('PASS: query update does not replay restoration; completed preview and sharing remain visible');
  console.log('Network fixtures only: no database rows, uploads, or paid generations created');
} finally { await browser.close(); }
