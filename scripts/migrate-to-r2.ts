/**
 * One-time migration script: Migrate existing Gemini URLs to R2
 *
 * This script fetches all images currently stored with Gemini URLs
 * and uploads them to Cloudflare R2 for permanent storage.
 *
 * Run with: npx tsx scripts/migrate-to-r2.ts
 *
 * Options:
 *   --dry-run    Preview what would be migrated without making changes
 *   --limit=N    Limit to N images (default: all)
 *   --user=ID    Only migrate images for a specific user
 */

import { PrismaClient } from "@prisma/client";
import {
  uploadToR2,
  generateImageKey,
  fetchImageBuffer,
  generateThumbnail,
  isR2Available,
} from "../lib/r2";

const prisma = new PrismaClient();

interface MigrationOptions {
  dryRun: boolean;
  limit: number | null;
  userId: string | null;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: false,
    limit: null,
    userId: null,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--limit=")) {
      options.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--user=")) {
      options.userId = arg.split("=")[1];
    }
  }

  return options;
}

async function migrateImagesToR2(options: MigrationOptions) {
  console.log("========================================");
  console.log("R2 Migration Script");
  console.log("========================================");
  console.log(`Mode: ${options.dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`Limit: ${options.limit || "None"}`);
  console.log(`User Filter: ${options.userId || "All users"}`);
  console.log("========================================\n");

  // Check if R2 is configured
  if (!isR2Available()) {
    console.error("ERROR: R2 is not configured. Please set R2 environment variables.");
    process.exit(1);
  }

  // Build query conditions
  const whereConditions: Record<string, unknown> = {
    imageUrl: {
      contains: "image-gen.xencolabs.com",
    },
    status: "COMPLETED",
  };

  if (options.userId) {
    whereConditions.userId = options.userId;
  }

  // Fetch images with Gemini URLs
  const images = await prisma.image.findMany({
    where: whereConditions,
    orderBy: {
      createdAt: "desc",
    },
    take: options.limit || undefined,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  console.log(`Found ${images.length} images to migrate\n`);

  if (images.length === 0) {
    console.log("No images to migrate. All images are already on R2 or no Gemini URLs found.");
    return;
  }

  if (options.dryRun) {
    console.log("DRY RUN - Would migrate the following images:\n");
    for (const image of images.slice(0, 20)) {
      console.log(`  - ${image.id} (${image.user?.email || image.userId})`);
      console.log(`    URL: ${image.imageUrl.slice(0, 60)}...`);
      console.log(`    Created: ${image.createdAt}`);
      console.log("");
    }
    if (images.length > 20) {
      console.log(`  ... and ${images.length - 20} more images`);
    }
    console.log("\nRun without --dry-run to perform the migration.");
    return;
  }

  let migrated = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  const startTime = Date.now();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const progress = `[${i + 1}/${images.length}]`;

    try {
      console.log(`${progress} Migrating image ${image.id}...`);

      // Fetch image from Gemini
      const imageData = await fetchImageBuffer(image.imageUrl);
      if (!imageData) {
        throw new Error("Failed to fetch image from Gemini");
      }

      // Upload to R2
      const imageKey = generateImageKey(image.userId, image.id, "png");
      const uploadResult = await uploadToR2({
        buffer: imageData.buffer,
        key: imageKey,
        contentType: imageData.contentType,
        metadata: {
          userId: image.userId,
          migratedFrom: "gemini",
          migratedAt: new Date().toISOString(),
        },
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Generate thumbnail if enabled
      let thumbnailUrl = image.thumbnailUrl;
      const shouldGenerateThumbnail =
        process.env.R2_GENERATE_THUMBNAILS !== "false";

      if (shouldGenerateThumbnail) {
        try {
          const thumbBuffer = await generateThumbnail(imageData.buffer);
          const thumbKey = generateImageKey(
            image.userId,
            `${image.id}-thumb`,
            "jpg"
          );
          const thumbResult = await uploadToR2({
            buffer: thumbBuffer,
            key: thumbKey,
            contentType: "image/jpeg",
          });

          if (thumbResult.success) {
            thumbnailUrl = thumbResult.url!;
          }
        } catch (thumbError) {
          console.warn(`  Warning: Thumbnail generation failed for ${image.id}`);
        }
      }

      // Update database with R2 URLs
      await prisma.image.update({
        where: { id: image.id },
        data: {
          imageUrl: uploadResult.url!,
          thumbnailUrl,
        },
      });

      migrated++;
      console.log(`${progress} ✓ Migrated to ${uploadResult.url}`);

      // Rate limit: sleep 100ms between uploads to avoid overwhelming R2
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`${progress} ✗ Failed: ${errorMessage}`);
      errors.push({ id: image.id, error: errorMessage });
      failed++;
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log("\n========================================");
  console.log("Migration Complete");
  console.log("========================================");
  console.log(`Total Images: ${images.length}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration} seconds`);
  console.log("========================================");

  if (errors.length > 0) {
    console.log("\nFailed Images:");
    for (const { id, error } of errors.slice(0, 10)) {
      console.log(`  - ${id}: ${error}`);
    }
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more failures`);
    }
  }
}

// Run the migration
migrateImagesToR2(parseArgs())
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
