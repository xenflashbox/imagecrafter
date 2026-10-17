import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/xen/.npm/_npx/705bc6b22212b352/node_modules/playwright');
const base = process.argv[2] || 'http://localhost:3100';
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
  await page.route('**/api/analytics/events', route => route.fulfill({ json: { success: true } }));
  await page.route('**/api/portraits/upload-url', route => route.fulfill({ json: {
    success: true, portraitId: 'test_portrait_fixture', sessionId: 'test_session_fixture',
    key: 'test/upload.jpg', uploadUrl: `${base}/__test-upload`,
  } }));
  await page.route('**/__test-upload', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/portraits/upload-complete', route => route.fulfill({ json: {
    success: true, portraitId: 'test_portrait_fixture', sessionId: 'test_session_fixture',
    sourceImageUrl: 'https://images.imagecrafter.app/gallery/v4/before/d-dog-corgi.jpg',
  } }));
  await page.route('**/api/portraits/generate', route => route.fulfill({ status: 202, json: {
    success: true, accepted: true, portraitId: 'test_portrait_fixture', status: 'queued',
  } }));
  let statusCalls = 0;
  await page.route('**/api/portraits/test_portrait_fixture', route => {
    statusCalls++;
    const ready = statusCalls >= 3;
    return route.fulfill({ json: { success: true, portrait: {
      id: 'test_portrait_fixture',
      status: ready ? 'preview' : 'generating',
      previewImageUrl: ready ? 'https://images.imagecrafter.app/gallery/v4/after/d-dog-corgi--baroque.jpg' : null,
      sourceImageUrl: 'https://images.imagecrafter.app/gallery/v4/before/d-dog-corgi.jpg',
      stylePackSlug: catalog.stylePacks[0].slug,
      styleVariantSlug: catalog.stylePacks[0].variants[0].slug,
      errorMessage: null,
    } } });
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
  await page.getByText('Protect this portrait before it starts', { exact: true }).waitFor();
  assert(await page.getByRole('link', { name: 'Sign in and protect it', exact: true }).isVisible());
  await page.getByRole('button', { name: 'Generate Portrait', exact: true }).click();
  await page.getByText(/lock your phone/i).waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Your portrait is ready' }).waitFor({ timeout: 15000 });
  await page.getByRole('heading', { name: 'Share or save your preview' }).waitFor();
  await page.getByRole('heading', { name: "Don't lose this portrait" }).waitFor();
  assert(await page.getByRole('button', { name: 'Sign in and save it', exact: true }).isVisible());
  await page.getByRole('button', { name: 'Copy link', exact: true }).waitFor();
  await page.waitForTimeout(1800);
  const shareY = (await page.getByRole('heading', { name: 'Share or save your preview' }).boundingBox())?.y;
  const saveY = (await page.getByRole('button', { name: 'Sign in and save it', exact: true }).boundingBox())?.y;
  const regenerateY = (await page.getByRole('button', { name: 'Regenerate', exact: true }).boundingBox())?.y;
  assert.ok(shareY !== undefined && regenerateY !== undefined && shareY < regenerateY, 'Sharing must appear before regeneration');
  assert.ok(saveY !== undefined && regenerateY !== undefined && saveY < regenerateY, 'Account protection must appear before regeneration');
  await page.screenshot({ path: '/tmp/ic-preview-result-mobile.png', fullPage: true });
  assert.equal(catalogCalls, 2, 'Only the deliberate full-page reload may reload the catalog');
  assert.ok(await page.getByRole('heading', { name: 'Your portrait is ready' }).isVisible());
  assert.match(
    await page.getByRole('link', { name: 'Save image', exact: true }).getAttribute('href'),
    /[?&]intent=download(?:&|$)/,
  );
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
  console.log('PASS: query update does not replay restoration; the deliberate reload restores the completed preview');
  console.log('PASS: an accepted background job survives a mobile-sized page reload and restores from server status');
  console.log('PASS: mobile result prioritizes sharing and account protection before regeneration controls');
  console.log('Network fixtures only: no database rows, uploads, or paid generations created');
} finally { await browser.close(); }
