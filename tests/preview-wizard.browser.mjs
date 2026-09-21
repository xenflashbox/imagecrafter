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
  await page.route('**/api/portraits/generate', async route => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    await route.fulfill({ json: { success: true, previewImageUrl: 'https://images.imagecrafter.app/gallery/v4/after/d-dog-corgi--baroque.jpg' } });
  });
  await page.route('**/api/portraits/test_portrait_fixture/share-link', route => route.fulfill({ json: { url: 'https://go.imagecrafter.app/test-fixture' } }));
  await page.goto(`${base}/portraits/create`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const photo = await context.request.get('https://images.imagecrafter.app/gallery/v4/before/d-dog-corgi.jpg');
  await page.locator('input[type=file]').setInputFiles({ name: 'fixture.jpg', mimeType: 'image/jpeg', buffer: await photo.body() });
  await page.getByRole('button', { name: /Continue to Style Selection/ }).click();
  await page.getByRole('button', { name: 'Generate Portrait', exact: true }).click();
  await page.getByRole('heading', { name: 'Your portrait is ready' }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Copy link', exact: true }).waitFor();
  await page.waitForTimeout(1800);
  assert.equal(catalogCalls, 1, 'Query-string update must not reload the restore catalog');
  assert.ok(await page.getByRole('heading', { name: 'Your portrait is ready' }).isVisible());
  console.log('PASS: query update does not replay restoration; completed preview and sharing remain visible');
  console.log('Network fixtures only: no database rows, uploads, or paid generations created');
} finally { await browser.close(); }
