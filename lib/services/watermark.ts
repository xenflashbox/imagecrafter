/**
 * Portrait Watermarking Service
 *
 * Applies a subtle text watermark to preview images using Sharp.
 * Preview images are capped at 1024px; purchased hi-res are full resolution.
 *
 * Runs server-side only. Never called from client code.
 */

const PREVIEW_MAX_PX = parseInt(process.env.PORTRAIT_PREVIEW_MAX_RESOLUTION || "1024");
const WATERMARK_OPACITY = parseFloat(process.env.PORTRAIT_WATERMARK_OPACITY || "0.15");

export interface WatermarkResult {
  success: boolean;
  buffer?: Buffer;
  error?: string;
}

/**
 * Apply a watermark to a portrait preview image.
 *
 * Strategy:
 * 1. Resize to max PREVIEW_MAX_PX (maintains aspect ratio)
 * 2. Overlay diagonal "ImageCrafter" text repeating across the image
 * 3. Return the processed buffer
 */
export async function applyWatermark(
  imageBuffer: Buffer
): Promise<WatermarkResult> {
  try {
    const sharp = (await import("sharp")).default;

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || PREVIEW_MAX_PX;
    const height = metadata.height || PREVIEW_MAX_PX;

    // Resize to preview resolution (downscale only)
    const resized = await sharp(imageBuffer)
      .resize(PREVIEW_MAX_PX, PREVIEW_MAX_PX, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    // Get resized dimensions
    const resizedMeta = await sharp(resized).metadata();
    const rw = resizedMeta.width || PREVIEW_MAX_PX;
    const rh = resizedMeta.height || PREVIEW_MAX_PX;

    // Build SVG watermark — diagonal repeating text
    const opacity = Math.round(WATERMARK_OPACITY * 255);
    const opacityHex = opacity.toString(16).padStart(2, "0");
    const fontSize = Math.round(rw / 12);
    const step = Math.round(rw / 3);

    // Create a grid of watermark text instances across the image
    const textInstances: string[] = [];
    for (let x = -step; x < rw + step; x += step) {
      for (let y = -step; y < rh + step; y += step) {
        textInstances.push(
          `<text x="${x}" y="${y}" transform="rotate(-35, ${x}, ${y})"
            font-family="Arial, Helvetica, sans-serif"
            font-size="${fontSize}"
            font-weight="bold"
            fill="white"
            fill-opacity="${WATERMARK_OPACITY}"
            letter-spacing="2"
          >ImageCrafter</text>`
        );
      }
    }

    const watermarkSvg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${rw}" height="${rh}">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
          </filter>
        </defs>
        <g filter="url(#shadow)">
          ${textInstances.join("\n")}
        </g>
      </svg>
    `);

    // Composite watermark over resized image
    const watermarked = await sharp(resized)
      .composite([
        {
          input: watermarkSvg,
          blend: "over",
        },
      ])
      .png({ quality: 90 })
      .toBuffer();

    return { success: true, buffer: watermarked };
  } catch (error) {
    console.error("[Watermark] Error applying watermark:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Watermark failed",
    };
  }
}

/**
 * Resize an image buffer to hi-res without watermark.
 * Used for purchased downloads.
 */
export async function prepareHiResImage(
  imageBuffer: Buffer,
  targetPx?: number
): Promise<WatermarkResult> {
  const maxPx = targetPx || parseInt(process.env.PORTRAIT_HIRES_RESOLUTION || "4096");

  try {
    const sharp = (await import("sharp")).default;

    const hiRes = await sharp(imageBuffer)
      .resize(maxPx, maxPx, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png({ quality: 95 })
      .toBuffer();

    return { success: true, buffer: hiRes };
  } catch (error) {
    console.error("[Watermark] Hi-res prep error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Hi-res preparation failed",
    };
  }
}
