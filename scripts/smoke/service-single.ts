/**
 * Smoke test: SINGLE (Free) flow.
 *
 * npx tsx scripts/smoke/service-single.ts
 *
 * Makes ONE real call to POST /api/v1/generate through the app's service
 * layer and verifies the full persistence path: 1 GenerationRequest row +
 * 1 Image row + real image URL. Prints DB ids for the lead to verify.
 */

import { loadEnv, fail, healthPreflight, dbPreflight, ensureSmokeUser } from "./_shared";

async function main() {
  loadEnv();

  await healthPreflight();
  await dbPreflight();

  const userId = await ensureSmokeUser("FREE");

  const { generateImage } = await import("../../lib/services/image-generation");
  const { prisma } = await import("../../lib/prisma");

  console.log("→ Calling generateImage() (SINGLE, 1K, 1:1) — real service call");
  const started = Date.now();
  const result = await generateImage({
    userId,
    prompt:
      "Smoke test: a single red apple on a white table, soft studio lighting",
    resolution: "1K",
    aspectRatio: "1:1",
  });
  console.log(`  Service round-trip: ${((Date.now() - started) / 1000).toFixed(1)}s`);

  if (!result.success) {
    // The request row still exists (FAILED + refunded) — print it for triage.
    console.error(`  Request id: ${result.requestId ?? "(not created)"}`);
    fail(`single generation failed honestly: ${result.error}`);
  }

  if (result.images.length !== 1) {
    fail(`expected exactly 1 image, got ${result.images.length}`);
  }

  const image = result.images[0];

  // Verify persistence from the DB side, not just the return value
  const request = await prisma.generationRequest.findUnique({
    where: { id: result.requestId! },
    include: { images: true },
  });
  if (!request) fail("GenerationRequest row not found after success");
  if (request.status !== "COMPLETED") fail(`request status is ${request.status}, expected COMPLETED`);
  if (request.images.length !== 1) fail(`request has ${request.images.length} Image children, expected 1`);
  if (request.selectedImageId !== image.id) fail("single request did not auto-select its image");

  console.log("\n✓ SINGLE SMOKE PASSED");
  console.log(`  GenerationRequest id : ${request.id}`);
  console.log(`  Image row id         : ${image.id}`);
  console.log(`  Provider             : ${image.provider}`);
  console.log(`  Model                : ${image.model}`);
  console.log(`  Image URL            : ${image.imageUrl}`);
  console.log(`  Credits charged      : ${result.creditsCharged}`);
  console.log(`  Credits remaining    : ${result.creditsRemaining}`);
  process.exit(0);
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
