/**
 * Preview gate evidence run.
 *
 * Run with: DATABASE_URL=<smoke branch> npx tsx scripts/smoke/preview-gate.ts
 *
 * Proves the four claims the gate exists to make:
 *   1. Preview #1 is ungated; #2 is refused for email — and the refusal lands
 *      BEFORE any provider call (asserted against the real route handler:
 *      generatePortrait() writes status="analyzing" before Claude Vision, so a
 *      portrait still "pending" after a POST proves nothing was spent).
 *   2. The free-preview anchor is server-side. Clearing cookies gives a fresh
 *      sessionId, and the visitor is STILL gated, because the IP matches.
 *   3. The daily cap is hard and applies to everyone, email or not.
 *   4. The captcha layer fires on the velocity signal, not on normal use.
 *
 * Costs nothing: every leg refuses or is counted before generation.
 */

import { loadEnv, fail } from "./_shared";

loadEnv();

import { prisma } from "@/lib/prisma";
import {
  checkPreviewGate,
  clientIp,
  DAILY_CAP,
  FREE_PREVIEWS,
  VELOCITY_COUNT,
} from "@/lib/services/preview-gate";

const RUN = `pgsmoke-${Date.now()}`;
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name} — ${detail}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} — ${detail}`);
  }
}

async function makePortrait(sessionId: string): Promise<string> {
  const p = await prisma.portrait.create({
    data: {
      sessionId,
      sourceImageUrl: `https://example.invalid/${RUN}.jpg`,
      sourceImageKey: `${RUN}.jpg`,
      stylePackSlug: "renaissance",
      styleVariantSlug: "renaissance-classic",
      subjectType: "person",
      subjectAnalysis: {},
      enhancedPrompt: "",
    },
  });
  return p.id;
}

/** One gate call against a fresh portrait, as the route makes it. */
async function attempt(
  sessionId: string,
  ip: string,
  opts: { email?: string; captchaToken?: string } = {}
) {
  const portraitId = await makePortrait(sessionId);
  const gate = await checkPreviewGate({
    sessionId,
    ip,
    portraitId,
    submittedEmail: opts.email ?? null,
    captchaToken: opts.captchaToken ?? null,
  });
  return { gate, portraitId };
}

async function main() {
  console.log(`\nPreview gate smoke — run ${RUN}`);
  console.log(
    `Config: free=${FREE_PREVIEWS}, dailyCap=${DAILY_CAP}, velocity=${VELOCITY_COUNT}\n`
  );

  // --- clientIp: the anchor the whole thing keys on -------------------------
  console.log("clientIp");
  check(
    "x-forwarded-for takes the first hop",
    clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 70.1.1.1" })) === "203.0.113.9",
    "client, not the proxy"
  );
  check(
    "missing headers collapse to one bucket",
    clientIp(new Headers()) === "unknown",
    'falls back to "unknown" rather than granting a fresh free preview'
  );

  // --- Layer 1: one free, then email ---------------------------------------
  console.log("\nLayer 1 — email gate");
  const ipA = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  const sessA = `${RUN}-sessA`;

  const first = await attempt(sessA, ipA);
  check(
    "preview #1 is ungated",
    first.gate.allowed === true,
    `allowed, no email asked (${first.gate.allowed ? "isFirst=" + first.gate.isFirstPreview : ""})`
  );

  const second = await attempt(sessA, ipA);
  check(
    "preview #2 is refused for an email",
    second.gate.allowed === false && second.gate.code === "email_required",
    second.gate.allowed ? "ALLOWED — gate is open" : `code=${second.gate.code}`
  );

  const withEmail = await attempt(sessA, ipA, { email: `${RUN}@example.invalid` });
  check(
    "preview #2 proceeds once the email is given",
    withEmail.gate.allowed === true,
    withEmail.gate.allowed ? "allowed" : `still refused: ${withEmail.gate.code}`
  );

  const returning = await attempt(sessA, ipA);
  check(
    "the address carries forward",
    returning.gate.allowed === true,
    "a returning visitor is not asked twice"
  );

  // --- Layer 1b: the anchor is server-side, not a cookie --------------------
  console.log("\nLayer 1 — server-side anchor");
  const sessCleared = `${RUN}-sessCleared`; // as if they cleared site data
  const cleared = await attempt(sessCleared, ipA);
  check(
    "clearing cookies does not reset the faucet",
    cleared.gate.allowed === true && cleared.gate.email !== null,
    cleared.gate.allowed
      ? "new sessionId, but the IP still carries the known email"
      : `refused: ${cleared.gate.code}`
  );

  const freshVisitor = `${RUN}-fresh`;
  const freshIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  const f1 = await attempt(freshVisitor, freshIp);
  const f2 = await attempt(freshVisitor, freshIp);
  check(
    "a genuinely new visitor still gets one free",
    f1.gate.allowed === true && f2.gate.allowed === false && f2.gate.code === "email_required",
    "first allowed, second gated — the anchor is per-identity, not global"
  );

  // --- Route-level: the refusal lands before any provider call -------------
  console.log("\nEnforcement point — refusal precedes spend");
  const { POST } = await import("@/app/api/portraits/generate/route");
  const routeSession = `${RUN}-route`;
  const routeIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  await attempt(routeSession, routeIp); // burn the free one

  const gatedPortraitId = await makePortrait(routeSession);
  const { NextRequest } = await import("next/server");
  const res = await POST(
    new NextRequest("https://imagecrafter.app/api/portraits/generate", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": routeIp },
      body: JSON.stringify({
        portraitId: gatedPortraitId,
        stylePackSlug: "renaissance",
        styleVariantSlug: "renaissance-classic",
        sessionId: routeSession,
      }),
    })
  );
  const body = await res.json();
  const after = await prisma.portrait.findUnique({
    where: { id: gatedPortraitId },
    select: { status: true },
  });

  check(
    "the route refuses an un-emailed second preview",
    res.status === 403 && body.code === "email_required",
    `HTTP ${res.status} code=${body.code}`
  );
  check(
    "nothing was spent",
    after?.status === "pending",
    `portrait.status="${after?.status}" — generatePortrait() writes "analyzing" before Claude Vision, so "pending" means it was never entered`
  );

  // --- Layer 2: the hard daily ceiling -------------------------------------
  //
  // Reaching the cap live is impossible: DAILY_CAP attempts in a test's worth of
  // seconds trips the velocity layer at VELOCITY_COUNT first, which is the whole
  // point of having both. So the day's history is seeded two hours back — inside
  // the 24h window, outside the 10-minute one — and then one live attempt is
  // made. That isolates Layer 2 from Layer 3 rather than conflating them.
  console.log("\nLayer 2 — daily cap");
  const capIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  const capEmail = `${RUN}-cap@example.invalid`;
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  await prisma.previewUsage.createMany({
    data: Array.from({ length: DAILY_CAP - 1 }, (_, i) => ({
      sessionId: `${RUN}-cap-${i}`,
      ip: capIp,
      email: capEmail,
      portraitId: `${RUN}-cap-${i}`,
      status: "allowed",
      createdAt: twoHoursAgo,
    })),
  });

  const atCap = await attempt(`${RUN}-cap-live`, capIp, { email: capEmail });
  check(
    `the ${DAILY_CAP}th preview of the day is still allowed`,
    atCap.gate.allowed === true,
    atCap.gate.allowed ? "allowed" : `refused early: ${atCap.gate.code}`
  );

  const overCap = await attempt(`${RUN}-cap-over`, capIp, { email: capEmail });
  check(
    `the ${DAILY_CAP + 1}th is refused`,
    overCap.gate.allowed === false && overCap.gate.code === "daily_limit",
    overCap.gate.allowed ? "ALLOWED — the cap is not a cap" : `code=${overCap.gate.code}`
  );
  check(
    "the refusal names the limit",
    !overCap.gate.allowed && overCap.gate.error.includes(String(DAILY_CAP)),
    !overCap.gate.allowed ? `"${overCap.gate.error}"` : "no refusal"
  );

  // The cap follows the person, not the browser: a brand-new session and a
  // brand-new IP still hit it, because the email is part of the identity.
  const capDodge = await attempt(`${RUN}-cap-dodge`, `203.0.113.${Math.floor(Math.random() * 250) + 1}`, {
    email: capEmail,
  });
  check(
    "rotating session and IP does not dodge the cap",
    capDodge.gate.allowed === false && capDodge.gate.code === "daily_limit",
    capDodge.gate.allowed ? "ALLOWED — the email is not part of the identity" : `code=${capDodge.gate.code}`
  );

  // --- Layer 3: velocity → captcha -----------------------------------------
  console.log("\nLayer 3 — velocity escalation");
  const velIp = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
  const velEmail = `${RUN}-vel@example.invalid`;
  let velRefusal: Awaited<ReturnType<typeof attempt>>["gate"] | null = null;
  let beforeTrip = 0;

  for (let i = 0; i < VELOCITY_COUNT + 2; i++) {
    const r = await attempt(`${RUN}-vel-${i}`, velIp, { email: velEmail });
    if (r.gate.allowed) beforeTrip++;
    else {
      velRefusal = r.gate;
      break;
    }
  }
  check(
    `normal use is not challenged (< ${VELOCITY_COUNT} in the window)`,
    beforeTrip >= VELOCITY_COUNT - 1,
    `${beforeTrip} attempts passed unchallenged`
  );
  check(
    "the velocity signal escalates",
    Boolean(
      velRefusal &&
        !velRefusal.allowed &&
        ["captcha_required", "rate_limited"].includes(velRefusal.code)
    ),
    velRefusal && !velRefusal.allowed
      ? `code=${velRefusal.code} (rate_limited = Turnstile keys not provisioned yet, so it refuses rather than passing)`
      : "never tripped"
  );

  // --- The ledger is the source of truth -----------------------------------
  console.log("\nLedger");
  const rows = await prisma.previewUsage.groupBy({
    by: ["status"],
    where: { sessionId: { startsWith: RUN } },
    _count: true,
  });
  check(
    "every attempt is recorded, allowed or blocked",
    rows.length === 2,
    rows.map((r) => `${r.status}=${r._count}`).join(", ")
  );

  // --- Cleanup --------------------------------------------------------------
  await prisma.previewUsage.deleteMany({ where: { sessionId: { startsWith: RUN } } });
  await prisma.portrait.deleteMany({ where: { sessionId: { startsWith: RUN } } });
  await prisma.mauticCapture.deleteMany({ where: { email: { startsWith: RUN } } });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) fail(`${failed} check(s) failed`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
