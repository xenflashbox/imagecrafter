# Owner-supplied source intake

**For material crawling cannot reach.** You offered: a complete Sonoma Valley Historical
Society document, historical photographs, and local knowledge of where Sonoma history
actually lives. That is the highest-value material in the entire buildout, because it is
the only part no competitor can crawl. This is how to hand it over so it becomes citable
rather than a folder nobody indexed.

## Drop location

```
/home/xen/docs/blogcraft/corpus-intake/<property>/
    manifest.md          <- you write this, one entry per item
    docs/                <- PDFs, scans, .docx, .txt
    images/              <- photographs
    links.txt            <- one URL per line, for things you found by targeted search
```

`<property>` is the corpus key: `sgs`, `citad`, `ewp`, `sc`, `launchcraft`.

## What each item needs — the manifest

A source we cannot attribute is a source we cannot cite, and an unattributable chunk is
worse than no chunk: it looks like evidence. For **every** item:

| field | why |
|---|---|
| **What it is** | one line, e.g. "Sonoma Valley Historical Society, Boyes Hot Springs resort era monograph" |
| **Who published it, and when** | becomes `source_publication` + `source_publication_date`. A historical claim without a date cannot be placed in its era. |
| **Where it can be seen** | a URL if one exists, otherwise a physical citation — "SVHS archive, box 14" — which goes in `source_url` as a stable reference. **No item may have neither.** |
| **Rights** | yours / public domain / used-by-permission / unknown. Anything `unknown` will be ingested but NOT used in published output until resolved. |
| **Why it matters** | which articles it supports, in your words. This is what tells the agent which `chunk_type` applies. |

For **photographs** additionally: subject, approximate date, photographer or collection,
and whether it may be published. A photo is not a corpus chunk — it lands in the property's
R2 bucket with its metadata, and a chunk can then reference it.

## What we need from you, per property, in priority order

### Sonoma Grove Suites (`sgs`) — where you have the most to give

The schema was designed for exactly this: it has `boyes_hot_springs_history`,
`railroad_era`, `sonoma_plaza_history`, `early_hospitality_history`, `sonoma_lore`,
`family_stewardship_narrative`, `historical_account`, `neighborhood_context` — and a
citation tier no other property has, `historical-archive`.

1. **The Historical Society document.** Highest value. If it is a single long document, we
   chunk it by section with page anchors; you do not need to split it.
2. **Anything on Boyes Hot Springs specifically** — the resort era, the bathhouse, the
   fire, the rebuild. This is the property's own neighbourhood and is the thinnest material
   online.
3. **Railroad era** — the line into Sonoma, the depot, timetables if you have them.
4. **Historical photographs** with dates and collection, as above.
5. **Where to look next**, in your words: which archive, which family, which local
   publication. Name them in `manifest.md` and we will pursue them — a pointer from you
   beats a week of crawling.
6. **Your own account as host** — but supplied by you in writing, quoted verbatim, never
   generated. It becomes `host_recommendation` / `family_stewardship_narrative`.

### Compare ITAD (`citad`)
Standards PDFs behind a login or a purchase — R2v3 appendices, i-SIGMA material, any ISO
text you legitimately hold. Also any enforcement correspondence or audit report you may
lawfully share. **Do not upload anything under NDA.**

### European Wholesale Parts (`ewp`)
Manufacturer approval sheets and workshop documents you hold — TIS/ETK extracts, BeVo
printouts, supplier technical bulletins. These are the exact documents web search cannot
reach and they are the property's whole authority.

### ScoreCraft (`sc`) / LaunchCraft (`launchcraft`)
Little to supply; these are public-documentation properties. If you have **your own
measured results** — a before/after on a real site, with dates and numbers — that is a
legitimate `study_finding` and nobody else has it.

## What happens to it

1. Logged in `<property>.ingestion_log` with a `file_hash`, so a re-run is a no-op.
2. Extracted and chunked — **quoted, never paraphrased**, one claim per chunk, 300–1,200 chars.
3. Tagged `citation_tier` (`historical-archive` for archive material, `official` for a
   manufacturer or standards body) and the property's own `chunk_type`.
4. Embedded (1536-dim) and indexed.
5. Anything rejected goes in `research_exclusions` with a reason, so it is not re-litigated.

## The two rules

- **Nothing gets ingested without an attributable source.** If you cannot say where an item
  came from, say so in the manifest and we will park it rather than quietly cite it.
- **Rights `unknown` means ingest-but-not-publish** until you resolve it. That applies
  especially to photographs.
