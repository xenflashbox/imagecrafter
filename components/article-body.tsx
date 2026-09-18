"use client";

import { RichText, configureMedia } from "@xenco/editorial-blocks";
import "@xenco/editorial-blocks/styles";

const CMS_URL =
  process.env.NEXT_PUBLIC_PAYLOAD_URL || "https://cms.xencolabs.com";

// The reformat pipeline stores mediaId as a plain number, so depth-population
// never fills in a URL — image blocks stay blank without this.
configureMedia({ cmsUrl: CMS_URL });

export function ArticleBody({ content }: { content: { root: unknown } }) {
  return (
    <RichText
      content={content as Parameters<typeof RichText>[0]["content"]}
      className="article-body"
    />
  );
}
