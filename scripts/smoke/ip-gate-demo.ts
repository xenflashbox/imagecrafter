/**
 * Prove the comic-hero IP gate on BOTH legs.
 *
 * A gate that only ever says CLEAN is indistinguishable from a gate that is
 * inert — the 2026-07 gallery shipped on exactly that mistake. So this asserts
 * an expected verdict per image and fails loud when one is wrong.
 *
 * Usage: npx tsx scripts/smoke/ip-gate-demo.ts
 */
import { checkIpSafety } from "../../lib/services/portrait-analysis";
import { loadEnv, fail } from "./_shared";

const CASES: { label: string; url: string; expect: "clean" | "infringing" }[] = [
  {
    // Dog run: drew a pentagonal diamond shield with a bird inside — the
    // Superman silhouette the template explicitly bans.
    label: "REJECT leg — pentagonal shield emblem",
    url: "https://images.imagecrafter.app/portraits/previews/e2e17872557575952-v1-preview.png",
    expect: "infringing",
  },
  {
    // Child run 3: original bird emblem, "FALCON SQUAD #1" masthead, no shield.
    label: "ACCEPT leg — original falcon emblem",
    url: "https://images.imagecrafter.app/portraits/previews/e2e17872603977073-v1-preview.png",
    expect: "clean",
  },
];

async function main() {
  loadEnv();
  let wrong = 0;
  for (const c of CASES) {
    const verdict = await checkIpSafety(c.url);
    const ok = verdict === c.expect;
    if (!ok) wrong++;
    console.log(`${ok ? "✓" : "✗"} ${c.label}\n    expected=${c.expect} got=${verdict}\n    ${c.url}`);
  }
  if (wrong) fail(`${wrong}/${CASES.length} case(s) returned the wrong verdict`);
  console.log(`\n✓ IP gate correct on ${CASES.length}/${CASES.length} — it rejects as well as it accepts`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
