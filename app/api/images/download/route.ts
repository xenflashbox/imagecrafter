import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Image Download API
 * 
 * This endpoint proxies image downloads to handle CORS issues.
 * The browser can't download cross-origin images directly, so we
 * fetch the image server-side and return it.
 * 
 * GET /api/images/download?url=<imageUrl>&filename=<filename>
 */

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the image URL from query params
    const url = request.nextUrl.searchParams.get("url");
    const filename = request.nextUrl.searchParams.get("filename") || "imagecrafter-image.png";

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
    }

    // Validate URL (basic security check)
    const allowedDomains = [
      "image-gen.xencolabs.com",
      "storage.googleapis.com",
      "imagecrafter.app",
      "images.imagecrafter.app", // R2 custom domain
      "r2.cloudflarestorage.com", // R2 direct URLs
      "r2.dev", // R2.dev subdomain
      "picsum.photos", // For dev/testing
    ];

    const parsedUrl = new URL(url);
    const isAllowed = allowedDomains.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Domain not allowed for download" },
        { status: 403 }
      );
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("Content-Type") || "image/png";

    // Determine file extension
    let extension = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = "jpg";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    } else if (contentType.includes("gif")) {
      extension = "gif";
    }

    // Ensure filename has correct extension
    const finalFilename = filename.includes(".")
      ? filename
      : `${filename}.${extension}`;

    // Return the image with download headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Content-Length": imageBuffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
