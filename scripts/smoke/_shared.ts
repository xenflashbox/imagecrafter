/**
 * Shared preflight + fixtures for the service smoke tests.
 *
 * Run with: npx tsx scripts/smoke/service-single.ts
 *           npx tsx scripts/smoke/service-dual.ts
 *
 * Env comes from .env (loaded here, never overriding already-set vars).
 * Required: DATABASE_URL, IMAGE_GEN_API_URL, IMAGE_GEN_API_KEY.
 * Optional: SMOKE_USER_ID — use an existing user instead of the deterministic
 * smoke user.
 *
 * These scripts make ONE real service call each — real spend, real rows.
 */

import { readFileSync } from "node:fs";

export function loadEnv(): void {
  try {
    // Node >= 20.12 — does not override vars already set in the environment.
    process.loadEnvFile(".env");
  } catch {
    // No .env (e.g. CI with real env vars) — fine, requireEnv will fail loud
    // if something is actually missing.
  }
  assertDatabaseIsNotProduction();
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Refuse to run a smoke test against the production database.
 *
 * `.env` holds the production credential, and `loadEnvFile` above fills in
 * DATABASE_URL from it whenever the caller did not supply one — so the default
 * path silently targets production. In 2026-08 that wrote 147 test rows,
 * including Vision descriptions of real children, into the live database.
 * Comparing the resolved host against `.env`'s is the check that would have
 * caught it; a filename claiming to be a smoke DB is not evidence.
 */
function assertDatabaseIsNotProduction(): void {
  const active = process.env.DATABASE_URL;
  if (!active) fail("DATABASE_URL is not set");

  let prodLine: string | undefined;
  try {
    prodLine = readFileSync(".env", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
  } catch {
    // fall through to the missing-baseline failure below
  }
  if (!prodLine) {
    fail(
      "Cannot read DATABASE_URL from .env, so the production host is unknown " +
        "and this run cannot be proven safe. Run from the repo root."
    );
  }

  const prodHost = hostOf(prodLine.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, ""));
  const activeHost = hostOf(active);
  if (!prodHost || !activeHost) fail("DATABASE_URL is not a parseable URL");

  if (prodHost === activeHost) {
    fail(
      `DATABASE_URL points at PRODUCTION (${activeHost}).\n` +
        "  Smoke tests write real rows. Pass an isolated Neon branch instead:\n" +
        "  DATABASE_URL=$(cat /path/to/branch-credential) npx tsx scripts/smoke/<script>.ts"
    );
  }
  console.log(`→ Preflight: database host ${activeHost} is not production`);
}

export function fail(message: string): never {
  console.error(`\n✗ SMOKE FAILED: ${message}`);
  process.exit(1);
}

/**
 * Public health preflight (GET /health needs no auth).
 * A degraded service is a WARNING, not an abort — the point of the smoke test
 * is to record exactly what the service really does.
 */
export async function healthPreflight(): Promise<void> {
  const apiUrl = process.env.IMAGE_GEN_API_URL;
  if (!apiUrl) fail("IMAGE_GEN_API_URL is not set");

  console.log(`→ Preflight: GET ${apiUrl}/health`);
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/health`);
  } catch (err) {
    fail(`health endpoint unreachable: ${err instanceof Error ? err.message : err}`);
  }

  const body = await res.text();
  console.log(`  HTTP ${res.status}: ${body.slice(0, 300)}`);
  if (!res.ok) {
    fail(`health endpoint returned HTTP ${res.status}`);
  }
  try {
    const json = JSON.parse(body) as { status?: string };
    if (json.status && json.status !== "healthy" && json.status !== "ok") {
      console.warn(
        `  ⚠ Service reports status="${json.status}" — proceeding; the smoke result records real behavior.`
      );
    }
  } catch {
    console.warn("  ⚠ health body was not JSON — proceeding");
  }
}

/**
 * Abort clearly if the GenerationRequest migration has not been applied to
 * the target database (the migration is file-only until the lead applies it).
 */
export async function dbPreflight(): Promise<void> {
  const { prisma } = await import("../../lib/prisma");
  const rows = await prisma.$queryRaw<{ reg: string | null }[]>`
    SELECT to_regclass('"ic_GenerationRequest"')::text AS reg
  `;
  if (!rows[0]?.reg) {
    fail(
      'Table "ic_GenerationRequest" does not exist in the target database.\n' +
        "  Apply the migration first:\n" +
        "  npx prisma db execute --file prisma/migrations/20260705_generation_request_dual_engine_tier_collapse.sql --schema prisma/schema.prisma"
    );
  }
  console.log("→ Preflight: ic_GenerationRequest table present");
}

/**
 * Resolve the user the smoke test runs as. SMOKE_USER_ID wins; otherwise a
 * deterministic smoke user is upserted (id is stable so re-runs are clean).
 */
export async function ensureSmokeUser(plan: "FREE" | "PRO"): Promise<string> {
  const { prisma } = await import("../../lib/prisma");

  const userId = process.env.SMOKE_USER_ID || "smoke_user_imagecrafter";

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@smoke.imagecrafter.internal`,
      firstName: "Smoke",
      lastName: "Test",
    },
  });

  const planConfig =
    plan === "PRO"
      ? {
          plan: "PRO" as const,
          creditsLimit: 400,
          maxResolution: "4K",
          hasWatermark: false,
          hasProjects: true,
          hasPriorityQueue: true,
        }
      : {
          plan: "FREE" as const,
          creditsLimit: 10,
          maxResolution: "1K",
          hasWatermark: true,
          hasProjects: false,
          hasPriorityQueue: false,
        };

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      ...planConfig,
      creditsUsed: 0,
      creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId,
      stripeSubscriptionId: `smoke_${userId}`,
      stripePriceId: "smoke",
      stripeStatus: "ACTIVE",
      ...planConfig,
      creditsUsed: 0,
      creditsResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`→ Smoke user ready: ${userId} (${plan})`);
  return userId;
}
