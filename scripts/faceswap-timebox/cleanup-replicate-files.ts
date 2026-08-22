/**
 * Face-swap timebox — PRIVACY CLEANUP.
 *
 * Usage: npx tsx scripts/faceswap-timebox/cleanup-replicate-files.ts
 *
 * Deletes every source photo uploaded to Replicate's Files API during the
 * timebox (IDs tracked in output/replicate-uploads.json). Run this at the end
 * of the session — the inputs are real faces including children and must not
 * linger in third-party storage beyond the test itself.
 */

import fs from "node:fs";
import { loadEnv, UPLOADS_JSON, writeJson } from "./lib";

async function main() {
  await loadEnv();
  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

  let uploads: Array<{ subject: string; fileId: string }> = [];
  try {
    uploads = JSON.parse(fs.readFileSync(UPLOADS_JSON, "utf8"));
  } catch {
    console.log("No replicate-uploads.json — nothing to clean.");
    return;
  }

  const remaining: typeof uploads = [];
  for (const u of uploads) {
    try {
      await replicate.files.delete(u.fileId);
      console.log(`deleted: ${u.subject} (${u.fileId})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404")) {
        console.log(`already gone: ${u.subject} (${u.fileId})`);
      } else {
        console.error(`FAILED to delete ${u.subject} (${u.fileId}): ${msg}`);
        remaining.push(u);
      }
    }
  }
  writeJson(UPLOADS_JSON, remaining);
  console.log(
    remaining.length === 0
      ? "All uploaded source photos deleted from Replicate."
      : `WARNING: ${remaining.length} uploads still present — re-run.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
