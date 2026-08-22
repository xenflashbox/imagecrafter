/**
 * Measure how long a PINNED stand-in job actually takes.
 *
 * generatePinnedScene() gives up at ASYNC_POLL_TIMEOUT_MS (300s) and reports
 * "timed out" — which tells us the job exceeded the ceiling, never by how much.
 * comic-hero sits right on that ceiling, so the product decision (raise it, and
 * to what) has no number behind it. This polls the same async endpoint with a
 * deliberately generous ceiling and records time-to-completed.
 *
 * This measures SERVICE LATENCY ONLY. It renders a stand-in and stops — it is
 * not an identity or quality result and must never be quoted as one.
 *
 * Usage: npx tsx scripts/smoke/standin-latency.ts <pack> <variant> <runs>
 */
import { PrismaClient } from "@prisma/client";
import { postToService, getFromService, serviceErrorMessage } from "../../lib/services/image-generation";
import { buildStandInScenePrompt, buildStandInDescriptor, STYLE_ENGINE } from "../../lib/services/portrait-generation";
import { loadEnv, fail } from "./_shared";
import type { PortraitSubjectAnalysis } from "../../lib/services/portrait-analysis";

const POLL_INTERVAL_MS = 3_000;
const PROBE_CEILING_MS = 900_000;

async function runOnce(prompt: string, engine: { provider: string; model?: string }) {
  const started = Date.now();
  const res = await postToService("/api/v1/async/generate", {
    prompt,
    aspect_ratio: "3:4",
    source_app: "imagecrafter",
    provider: engine.provider,
    ...(engine.model ? { model: engine.model } : {}),
  });
  const jobId = res.ok && res.json ? (res.json.job_id as string | undefined) : undefined;
  if (!jobId) return { outcome: "submit-failed", detail: serviceErrorMessage(res, "submit"), seconds: 0 };

  const deadline = started + PROBE_CEILING_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const poll = await getFromService(`/api/v1/async/jobs/${jobId}`);
    if (!poll.ok || !poll.json) {
      return { outcome: "poll-failed", detail: serviceErrorMessage(poll, "poll"), seconds: (Date.now() - started) / 1000 };
    }
    const status = poll.json.status as string | undefined;
    const seconds = (Date.now() - started) / 1000;
    if (status === "completed") {
      const result = poll.json.result as Record<string, unknown> | null | undefined;
      return { outcome: "completed", detail: `${result?.provider}/${result?.model}`, seconds };
    }
    if (status === "failed" || status === "cancelled") {
      return { outcome: status, detail: (poll.json.error as string) || "no detail", seconds };
    }
  }
  return { outcome: "over-ceiling", detail: `still running past ${PROBE_CEILING_MS / 1000}s`, seconds: PROBE_CEILING_MS / 1000 };
}

async function main() {
  loadEnv();
  const [packSlug, variantSlug, runsArg] = process.argv.slice(2);
  if (!packSlug || !variantSlug) fail("usage: standin-latency.ts <pack> <variant> [runs]");
  const runs = Number(runsArg ?? 3);

  const prisma = new PrismaClient();
  const pack = await prisma.stylePack.findUnique({
    where: { slug: packSlug },
    include: { variants: { where: { slug: variantSlug } } },
  });
  const variant = pack?.variants[0];
  if (!variant) fail(`no active variant ${packSlug}/${variantSlug}`);

  // The descriptor drives prompt length, which is what we are timing. Use a
  // real analysis shape rather than a stub so the prompt is representative.
  const analysis = {
    subjectType: "person",
    subjectCount: 1,
    primarySubject: {
      apparentGender: "female",
      apparentAge: "3",
      build: "slight",
      skinTone: "Fitzpatrick II (light)",
      hairColor: "medium brown",
      hairStyle: "chin-length bob with a fringe",
      eyeColor: "brown",
      faceShape: "round",
      distinguishingFeatures: "a fabric hair bow above the left ear",
    },
  } as unknown as PortraitSubjectAnalysis;

  const engine = STYLE_ENGINE[variantSlug];
  if (!engine) fail(`${variantSlug} has no pinned engine — nothing to time`);

  const prompt = buildStandInScenePrompt(
    variant.promptTemplate,
    buildStandInDescriptor(analysis, 0),
    variant.styleModifiers as Record<string, string>,
    analysis,
    undefined,
    variantSlug
  );

  console.log(`stand-in latency probe: ${packSlug}/${variantSlug} on ${engine.provider}/${engine.model ?? "default"}`);
  console.log(`prompt is ${prompt.length} characters; ceiling ${PROBE_CEILING_MS / 1000}s\n`);

  const seconds: number[] = [];
  for (let i = 1; i <= runs; i++) {
    const r = await runOnce(prompt, engine);
    console.log(`run ${i}/${runs}: ${r.outcome} in ${r.seconds.toFixed(1)}s — ${r.detail}`);
    if (r.outcome === "completed") seconds.push(r.seconds);
  }

  if (seconds.length) {
    const sorted = [...seconds].sort((a, b) => a - b);
    console.log(
      `\ncompleted ${seconds.length}/${runs} — min ${sorted[0].toFixed(1)}s, max ${sorted[sorted.length - 1].toFixed(1)}s`
    );
    console.log(`over the current 300s product ceiling: ${seconds.filter((s) => s > 300).length}/${seconds.length}`);
  } else {
    console.log("\nno run completed — nothing to report as a latency number");
  }
  await prisma.$disconnect();
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
