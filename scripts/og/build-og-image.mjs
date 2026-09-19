/**
 * Builds public/og-image.png — the card that renders on every shared link.
 *
 * Run with the brand fonts (Fraunces, Manrope) installed to fontconfig, or the
 * text falls back to a system serif and the card goes off-brand:
 *   ~/.local/share/fonts/brand/{Fraunces,Manrope}.ttf && fc-cache -f
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const W = 1200;
const H = 630;
const ART_W = 472; // 0.75 aspect at full height — matches the 900x1200 source exactly
const ART_X = W - ART_W;
const PAD = 72;

const CANVAS = "#faf7f2";
const INK = "#1c1714";
const INK_MUTED = "rgba(28, 23, 20, 0.78)";
const ACCENT = "#a4442a";
const ACCENT_RIM = "rgba(164, 68, 42, 0.38)";

const SOURCE =
  process.env.OG_SOURCE ||
  "https://images.imagecrafter.app/gallery/v4/after/d-dog-corgi--baroque.jpg";
const OUT = process.env.OG_OUT || "og-image";
const HEADLINE = (process.env.OG_HEADLINE || "Your dog,|painted like|royalty.").split("|");
const SUBHEAD = (
  process.env.OG_SUBHEAD ||
  "One photo in. A museum-quality|portrait out — pets and people."
).split("|");

const art = await fetch(SOURCE).then(async (r) => {
  if (!r.ok) throw new Error(`source image ${r.status} ${SOURCE}`);
  return Buffer.from(await r.arrayBuffer());
});

const artPanel = await sharp(art)
  .resize(ART_W, H, { fit: "cover", position: "top" })
  .toBuffer();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${CANVAS}"/>
  <text x="${PAD}" y="150" font-family="Manrope" font-weight="700" font-size="19"
        letter-spacing="5.5" fill="${ACCENT}">IMAGECRAFTER</text>
  <g font-family="Fraunces" font-weight="700" font-size="63" fill="${INK}">
    ${HEADLINE.map((l, i) => `<text x="${PAD}" y="${252 + i * 73}">${l}</text>`).join("\n    ")}
  </g>
  <line x1="${PAD}" y1="440" x2="${PAD + 64}" y2="440" stroke="${ACCENT}" stroke-width="3"/>
  <g font-family="Manrope" font-weight="500" font-size="23" fill="${INK_MUTED}">
    ${SUBHEAD.map((l, i) => `<text x="${PAD}" y="${489 + i * 33}">${l}</text>`).join("\n    ")}
  </g>
  <line x1="${ART_X}" y1="0" x2="${ART_X}" y2="${H}" stroke="${ACCENT_RIM}" stroke-width="2"/>
</svg>`;

await mkdir("public", { recursive: true });
await sharp(Buffer.from(svg))
  .composite([{ input: artPanel, left: ART_X, top: 0 }])
  .png({ quality: 92 })
  .toFile(`public/${OUT}.png`);

console.log(`wrote public/${OUT}.png`);
