import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { analyzePortraitPhoto } from "../../lib/services/portrait-analysis";
import {
  buildStandInDescriptor,
  buildStandInScenePrompt,
} from "../../lib/services/portrait-generation";

const p = new PrismaClient();
const SUBJECT = process.argv[2] || "d-man-50s-beard";
const SLUG = process.argv[3] || "baroque";

(async () => {
  const buf = readFileSync(`scripts/faceswap-timebox/input/${SUBJECT}.png`);
  const live = await analyzePortraitPhoto(
    `data:image/png;base64,${buf.toString("base64")}`
  );
  if (!live.success || !live.analysis) throw new Error(live.error);
  const analysis = live.analysis;
  const v = await p.styleVariant.findFirst({ where: { slug: SLUG } });
  if (!v) throw new Error("no variant");

  console.log(`template chars: ${v.promptTemplate.length}`);
  for (const level of [0, 1, 2]) {
    console.log(`\n--- descriptor level ${level} (${buildStandInDescriptor(analysis, level).length} chars) ---`);
    console.log(buildStandInDescriptor(analysis, level));
  }
  const prompt = buildStandInScenePrompt(
    v.promptTemplate,
    buildStandInDescriptor(analysis, 0),
    v.styleModifiers as Record<string, string>,
    analysis,
    undefined,
    SLUG
  );
  console.log(`\n=== FINAL PROMPT ${prompt.length} chars (limit 2400) ===`);
  console.log(prompt);
  await p.$disconnect();
})();
