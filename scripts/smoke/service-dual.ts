/**
 * Smoke test: DUAL (Pro) flow + winner selection.
 *
 * npx tsx scripts/smoke/service-dual.ts
 *
 * Makes ONE real call to POST /api/v1/dual/generate through the app's service
 * layer. Expected on a healthy service: 2 real images from 2 named providers
 * under ONE GenerationRequest, then a select call sets selectedImageId.
 *
 * A PARTIAL result (one provider down) is reported as partial — the script
 * verifies honest accounting (refund for the missing image) and still
 * exercises selection against what actually exists. Total failure fails the
 * smoke with the service's real error.
 */

import { loadEnv, fail, healthPreflight, dbPreflight, ensureSmokeUser } from "./_shared";

async function main() {
  loadEnv();

  await healthPreflight();
  await dbPreflight();

  const userId = await ensureSmokeUser("PRO");

  const { generateDual, selectWinnerImage } = await import(
    "../../lib/services/image-generation"
  );
  const { prisma } = await import("../../lib/prisma");

  console.log("→ Calling generateDual() (DUAL, 1K, 1:1) — real service call");
  const started = Date.now();
  const result = await generateDual({
    userId,
    prompt:
      "Smoke test: a lighthouse on a rocky coast at golden hour, dramatic sky",
    aspectRatio: "1:1",
  });
  console.log(`  Service round-trip: ${((Date.now() - started) / 1000).toFixed(1)}s`);

  if (!result.success) {
    console.error(`  Request id: ${result.requestId ?? "(not created)"}`);
    if (result.failedProviders) {
      for (const f of result.failedProviders) {
        console.error(`  Provider ${f.provider}: ${f.error}`);
      }
    }
    fail(`dual generation failed honestly (credits refunded): ${result.error}`);
  }

  console.log(`  Status: ${result.status} — ${result.images.length} image(s) returned`);
  for (const img of result.images) {
    console.log(`   • ${img.provider} (${img.model ?? "model n/a"}) → ${img.imageUrl}`);
  }
  if (result.failedProviders) {
    for (const f of result.failedProviders) {
      console.warn(`  ⚠ Provider failed (refunded): ${f.provider}: ${f.error}`);
    }
  }

  // DB-side verification
  const request = await prisma.generationRequest.findUnique({
    where: { id: result.requestId! },
    include: { images: true },
  });
  if (!request) fail("GenerationRequest row not found after success");
  if (request.mode !== "DUAL") fail(`request mode is ${request.mode}, expected DUAL`);
  if (request.images.length !== result.images.length) {
    fail(`DB has ${request.images.length} Image children but service layer reported ${result.images.length}`);
  }
  if (request.creditsCharged !== result.images.length) {
    fail(`creditsCharged=${request.creditsCharged}, expected ${result.images.length} (1 per returned 1K image)`);
  }

  // Selection: pick the first returned image (deterministic)
  const winner = result.images[0];
  console.log(`→ Selecting winner: ${winner.id} (${winner.provider})`);
  const select = await selectWinnerImage(userId, request.id, winner.id);
  if (!select.success) fail(`selectWinnerImage failed: ${select.error}`);

  const after = await prisma.generationRequest.findUnique({
    where: { id: request.id },
  });
  if (after?.selectedImageId !== winner.id) {
    fail(`selectedImageId=${after?.selectedImageId}, expected ${winner.id}`);
  }

  const verdict = result.status === "COMPLETED" ? "PASSED" : "PASSED (PARTIAL — one provider down)";
  console.log(`\n✓ DUAL SMOKE ${verdict}`);
  console.log(`  GenerationRequest id : ${request.id}`);
  for (const img of result.images) {
    console.log(`  Image row id         : ${img.id} (${img.provider})`);
  }
  console.log(`  selectedImageId      : ${after?.selectedImageId}`);
  console.log(`  Credits charged      : ${result.creditsCharged}`);
  console.log(`  Credits remaining    : ${result.creditsRemaining}`);
  if (result.status !== "COMPLETED") {
    console.log(
      "  NOTE: 2 providers did not both return — see provider errors above. " +
        "This is the service's real state, recorded honestly."
    );
  }
  process.exit(0);
}

main().catch((err) => {
  fail(err instanceof Error ? err.stack || err.message : String(err));
});
