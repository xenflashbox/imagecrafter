/**
 * Generate the synthetic "before" photos for the landing-page before/afters.
 *
 * The site needs uploads that look like what a real customer sends, without
 * using anyone's family or a stock asset. Faces are specified for the traits
 * the swap leg preserves — glasses, freckles, beards, age lines, strong bone
 * structure. A regular, idealised face is exactly what the swap regularises
 * toward, which is what produced the "cousin in a crowd" failures.
 *
 * Writes into the harness input dir so pet-catalog.ts picks the subjects up by
 * name with no further wiring.
 */

import fs from "fs";
import path from "path";
import Replicate from "replicate";
import { loadEnv } from "./_shared";

loadEnv();

const MODEL = "google/nano-banana";
const OUT_DIR = path.join(process.cwd(), "scripts/faceswap-timebox/input");

const CANDID =
  "Candid smartphone photo, natural available light, slightly imperfect amateur snapshot, " +
  "head and shoulders, face fully visible and facing the camera, sharp focus on the eyes, " +
  "plain everyday indoor background, no studio lighting, no professional retouching.";

const SUBJECTS: Record<string, string> = {
  "d-woman-40s-freckles":
    "A white woman in her late 30s with dense freckles across her nose and cheeks, curly auburn shoulder-length hair, green eyes, a wide open laughing smile showing a small gap between her front teeth, and crow's feet at the corners of her eyes.",
  "d-man-50s-beard":
    "A Black man in his early 50s with a full salt-and-pepper beard, close-cropped greying hair, thick black rectangular glasses, deep smile lines, and a warm closed-mouth smile.",
  "d-woman-60s-silver":
    "An East Asian woman in her 60s with a silver-grey chin-length bob, high prominent cheekbones, fine lines around her mouth and eyes, small gold stud earrings, and a calm warm smile.",
  "d-man-30s-aquiline":
    "A Latino man in his mid 30s with a prominent aquiline nose, heavy dark eyebrows, dark stubble, a strong square jaw, a small scar through one eyebrow, and a slight amused half-smile.",
  "d-woman-20s-braids":
    "A Black woman in her mid 20s with long box braids pulled back, a small gold nose stud, deep dimples, full cheeks, and a broad open smile.",
  "d-man-70s-glasses":
    "A white man in his 70s, bald on top with a fringe of white hair, bushy white eyebrows, deep-set blue eyes behind round wire-rimmed glasses, heavy jowls and deep forehead lines, smiling gently.",
  "d-cat-orange":
    "A large orange tabby cat with a broad face, bright copper eyes, a white chin and chest bib, and distinct dark orange striping over the forehead, looking straight at the camera.",
  "d-dog-corgi":
    "A Pembroke Welsh corgi with a red-and-white coat, large upright ears, a white blaze down the centre of its face, dark brown eyes, and its mouth open in a panting grin.",
  "d-dog-terrier-scruffy":
    "A scruffy grey-and-white wire-haired terrier mix with a shaggy beard and eyebrows, dark round eyes half hidden by fur, and one ear folded over, looking at the camera.",
};

async function main(): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is required");
  const replicate = new Replicate({ auth: token });

  const only = process.argv[2]?.split(",").filter(Boolean);
  const names = only?.length ? only : Object.keys(SUBJECTS);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`=== DEMO SUBJECTS — ${names.length} to generate ===\n`);

  let made = 0;
  for (const name of names) {
    const subject = SUBJECTS[name];
    if (!subject) {
      console.warn(`  ⚠ unknown subject "${name}" — skipping`);
      continue;
    }
    const start = Date.now();
    try {
      const output = await replicate.run(MODEL, {
        input: {
          prompt: `${subject} ${CANDID}`,
          aspect_ratio: "3:4",
          output_format: "png",
        },
      });

      const url =
        typeof output === "string"
          ? output
          : output && typeof (output as { url?: unknown }).url === "function"
            ? String((output as { url: () => unknown }).url())
            : Array.isArray(output)
              ? String(output[0])
              : undefined;
      if (!url) throw new Error(`no output URL: ${JSON.stringify(output)}`);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), buf);

      made++;
      console.log(
        `  ✓ ${name} — ${(buf.length / 1e6).toFixed(2)}MB (${((Date.now() - start) / 1000).toFixed(1)}s)`
      );
    } catch (err) {
      console.error(
        `  ✗ ${name} — ${err instanceof Error ? err.message : String(err)} (${((Date.now() - start) / 1000).toFixed(1)}s)`
      );
    }
  }

  console.log(`\n=== ${made}/${names.length} generated ===`);
  console.log(`  ${OUT_DIR}`);
  if (made < names.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
