import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "/home/xen/.npm/_npx/705bc6b22212b352/node_modules/playwright");
const base = process.argv[2] || "http://localhost:3100";
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route("**/api/analytics/events", (route) => route.fulfill({ json: { success: true } }));
  await page.route("https://www.tiktok.com/embed.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "",
  }));

  await page.goto(`${base}/gallery`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Portraits in motion." }).waitFor();

  const profileLink = page.getByRole("link", { name: /Watch on TikTok/ });
  assert.equal(await profileLink.getAttribute("href"), "https://www.tiktok.com/@imagecrafter.app");
  assert.equal(await profileLink.getAttribute("target"), "_blank");

  const embed = page.getByTestId("tiktok-profile-embed").locator("blockquote");
  assert.equal(await embed.getAttribute("data-embed-type"), "creator");
  assert.equal(await embed.getAttribute("data-unique-id"), "imagecrafter.app");
  assert.ok(await page.locator("article").first().isVisible(), "The live portrait gallery must still render");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  await page.getByRole("heading", { name: "Portraits in motion." }).locator("xpath=ancestor::section[1]").screenshot({
    path: "/tmp/ic-gallery-social-mobile.png",
  });
  console.log("PASS: gallery renders live portraits and the responsive TikTok creator embed with a direct profile fallback");
} finally {
  await browser.close();
}
