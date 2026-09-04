import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

(async () => {
  const p = new PrismaClient();
  const host = (process.env.DATABASE_URL || "").split("@")[1]?.split("/")[0];
  console.log("HOST:", host);

  const dir = path.resolve(__dirname, "output/catalog");
  const onDisk = new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("adult-face-") && f.endsWith(".png"))
      .map((f) => f.slice("adult-face-".length, -".png".length))
  );

  const vs = await p.styleVariant.findMany({
    select: {
      slug: true,
      isActive: true,
      sampleImageUrl: true,
      stylePack: { select: { slug: true } },
    },
  });

  const active = vs.filter((v) => v.isActive);
  const withImg = active.filter((v) => v.sampleImageUrl?.trim());
  console.log(
    `variants: ${vs.length} total, ${active.length} active, ${withImg.length} with image`
  );
  console.log(`catalog PNGs on disk: ${onDisk.size}`);

  const dbSlugs = new Set(vs.map((v) => v.slug));
  const noFile = active.filter((v) => !onDisk.has(v.slug)).map((v) => v.slug);
  const noVariant = [...onDisk].filter((s) => !dbSlugs.has(s));
  console.log(`active variants WITHOUT a catalog PNG (${noFile.length}): ${noFile.join(", ") || "none"}`);
  console.log(`catalog PNGs with NO matching variant (${noVariant.length}): ${noVariant.join(", ") || "none"}`);

  await p.$disconnect();
})();
