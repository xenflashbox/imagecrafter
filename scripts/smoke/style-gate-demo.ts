/**
 * STYLE GATE demonstration.
 *
 * The gate exists to catch ONE defect (portrait-analysis.ts): the face-swap
 * step sometimes discards the artistic scene and returns a plain photograph.
 * The original prompt asked a compound question ("stylized IN THE STYLE OF x")
 * and so rejected legitimately-styled elven output as "photoreal" — a false
 * reject that blocked a shippable image twice on 2026-08-17.
 *
 * This runs the PRODUCTION gate against known inputs:
 *
 *  1. The real source photograph            → expect PHOTOREAL (the reject leg;
 *                                              if this flips, the gate is inert)
 *  2. The elven swap the gate false-rejected → expect STYLED
 *  3. Shipped renaissance output             → expect STYLED (control)
 *  4. Shipped starry-night output            → expect STYLED (control)
 *
 * Local files are served over 127.0.0.1 (start `python3 -m http.server 8777`
 * from the repo root first). Requires IMAGECRAFTER_ANTHROPIC_API_KEY in env.
 */
import { checkStylePresence } from "../../lib/services/portrait-analysis";

const BASE = "http://127.0.0.1:8777";

const CASES: { label: string; url: string; style: string; want: string }[] = [
  {
    label: "real source photograph (reject leg)",
    url: `${BASE}/scripts/faceswap-timebox/input/adult-face.png`,
    style: "Elven Court — ethereal fantasy portrait in an enchanted forest",
    want: "photoreal",
  },
  {
    label: "elven swap the old prompt false-rejected",
    url: `${BASE}/scripts/smoke/output/gallery/adult-face-elven-candidate.png`,
    style: "Elven Court — ethereal fantasy portrait in an enchanted forest",
    want: "styled",
  },
  {
    label: "shipped renaissance (control)",
    url: `${BASE}/scripts/smoke/output/gallery/adult-face-renaissance.png`,
    style: "Renaissance Royalty — classical oil portrait of nobility",
    want: "styled",
  },
  {
    label: "shipped starry-night (control)",
    url: `${BASE}/scripts/smoke/output/gallery/adult-face-starry-night.png`,
    style: "Starry Night — post-impressionist swirling brushwork",
    want: "styled",
  },
];

async function main() {
  if (!process.env.IMAGECRAFTER_ANTHROPIC_API_KEY) {
    console.error("IMAGECRAFTER_ANTHROPIC_API_KEY not in env — pass from vault");
    process.exit(1);
  }

  let failures = 0;
  for (const c of CASES) {
    const got = await checkStylePresence(c.url, c.style);
    const ok = got === c.want;
    if (!ok) failures++;
    console.log(`${ok ? "✅" : "❌"} ${c.label}: got "${got}" (expected "${c.want}")`);
  }

  console.log(
    failures === 0
      ? "\nSTYLE GATE OK — still rejects a plain photograph, no longer false-rejects styled output."
      : `\n${failures} case(s) did not behave as expected.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
