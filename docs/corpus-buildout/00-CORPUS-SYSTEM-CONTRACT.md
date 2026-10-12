# Corpus Buildout — the system contract

**Read this before any property brief. Every subagent works against this same contract.**
Verified against the live database 2026-09-26. If anything here disagrees with the
database, the database wins — say so rather than working around it.

## Why this exists

The corpus layer was built and then half-wired, and the cost was concrete: Compare ITAD
published an article citing **NIST SP 800-88 Rev. 1 as current** when Rev. 1 was withdrawn
on 2025-09-26 and superseded by Rev. 2. The corpus that knows this holds **273 chunks**.
Resume Coach's corpus holds **94,497** and was disconnected from its own site for weeks
because a rebrand changed the domain. Five properties are registered `active` with **zero
chunks**, which reads as a working corpus at every call site.

The goal is not "some documents in a database". It is: **a claim in a published article can
be traced to a source that a hostile reader would accept.**

## As-built ground truth

### Registry — `mcp.properties`

| column | meaning |
|---|---|
| `property` | the corpus key, e.g. `citad` — also the **schema name** |
| `schema_name` | the Postgres schema holding this corpus |
| `status` | must be `active` to be resolvable |
| `metadata->>'site'` | **the live domain.** Resolution matches this against `bc_sites.url` |

Site → corpus resolution (`app/services/router_research_service.py`):
1. the site profile's `research.corpus_property`, if set — **but a profile regeneration
   wipes it, so never rely on this as the durable setting**;
2. otherwise `metadata->>'site'` or `r2_public_domain` minus its `media.` prefix, matched
   against the site's domain;
3. otherwise `None` — the honest state, meaning legacy web research.

**A rebrand breaks resolution.** Update `mcp.properties.metadata.site` when a domain changes.

### The 500-chunk floor

`resolve_corpus_if_populated()` (`app/services/factual_repair_runner.py`) requires
**≥ 500 embedded chunks** before the repair loop will query a corpus. Below that the
property is treated as corpus-less on purpose, so the fallback to web search is visible
instead of an empty corpus call that looks successful. **A corpus is not "done" until it
clears 500, and 500 is a floor, not a target.**

### Current state, measured

| property | site | embedded chunks | verdict |
|---|---|---|---|
| `rc` | rexresume.com | 94,497 | deep |
| `hbs` | homebeautyspa.com | 22,644 | deep |
| `dc` | diabetescompass.com | 9,928 | solid |
| `fav` | findavibrator.com | 4,922 | solid (product-shaped) |
| `wcc` | winecountrycorner.com | 2,385 | usable |
| **`citad`** | compareitad.com | **273** | **below floor — compliance property** |
| **`launchcraft`** | launchcraft.me | **0** | empty |
| **`sc`** | scorecraft.io | **0** | empty |
| **`sgs`** | sonomagrovesuites.com | **0** | empty |
| `bc`, `fi` | — | 0 | out of scope for now |
| **EWP** | europeanwholesaleparts.com | **no schema at all** | must be created |

## The table contract

Two archetypes. Use the one that matches the property; do not invent a third.

### Knowledge corpus (citad, sc, launchcraft, sgs)

For every entity type the niche reasons about:

```
<schema>.canonical_<entity>            -- the thing itself
    id uuid PK, name text, slug text, publisher text,
    published_date date, methodology text, created_at, updated_at

<schema>.research_<entity>_chunks      -- the evidence about it
    id uuid PK,
    canonical_<entity>_id uuid  -> canonical_<entity>.id
    source_publication text,
    source_url        text,     -- MANDATORY. no url, no row.
    citation_tier     <schema>.citation_tier,
    source_author     text,
    source_publication_date date,
    chunk_text        text,     -- the quotable passage
    chunk_type        <schema>.chunk_type,
    chunk_index       integer,
    embedding         vector(1536),
    embedded_at, created_at, updated_at
```

Plus, once per schema:

```
<schema>.ingestion_log      -- source, source_url, file_hash, row_count,
                               status, detail, freshness_marker, ingested_at
<schema>.research_exclusions -- entity, external_id, reason, excluded_by, excluded_at
```

`ingestion_log.file_hash` is how a re-run becomes idempotent. **Log every fetch, including
failures** — a source that 404s must leave a record, or the next run silently re-fetches it.

### Product corpus (EWP — follow `fav`)

`canonical_products` (attributes as real typed columns, not a JSON blob) +
`research_product_chunks` in the same shape as above. For EWP the "product" is a
**part or a fluid specification**, and the attributes are the spec fields.

## `citation_tier` — shared vocabulary

`mainstream-pub | niche-expert | regional | platform | official | aggregator | unknown`
(`wcc` adds `association`; `sgs` adds `historical-archive`.)

**Use `official` for a standards body, regulator or manufacturer publishing its own spec.**
That is the tier that makes a compliance claim defensible.

⚠️ **Do not repeat the HBS mistake:** all 12,943 of its ingredient chunks are tagged
`mainstream-pub`, including primary literature. A tier field with one value in it is a
field that does not work. Tier each chunk by what it actually is.

## `chunk_type` — already defined per property, do not add values

- **citad**: `standard_clause`, `certification_requirement`, `audit_criterion`,
  `regulatory_guidance`, `legal_holding`, `enforcement_finding`, `vendor_disclosure`,
  `vendor_capability`, `official_specs`, `incident_account`, `market_analysis`,
  `category_overview`, `practitioner_guidance`
- **sc**: `ranking_signal`, `official_guideline`, `spec_clause`, `study_finding`,
  `engine_behavior`, `category_overview`, `practitioner_guidance`
- **launchcraft**: `official_specs`, `how_to_step`, `failure_account`, `pricing_fact`,
  `limitation`, `category_overview`, `practitioner_guidance`
- **sgs**: 28 values including `lodging_amenity_detail`, `guest_perspective`,
  `host_recommendation`, `boyes_hot_springs_history`, `railroad_era`,
  `sonoma_plaza_history`, `sonoma_lore`, `neighborhood_context`, `local_recommendation`
- **EWP**: none exist yet — propose the enum in the brief, do not create it unilaterally

If a passage does not fit an existing value, it is usually the wrong passage to ingest.

## Chunking rules

1. **One claim per chunk.** A chunk is what gets quoted back to support one statement.
   300–1,200 characters. A whole page is not a chunk.
2. **`source_url` must resolve to the passage**, deep-linked where the source supports it
   (`#section`, a PDF page anchor). "The standard says X" with a link to a homepage is
   not traceable.
3. **Keep the publication date.** A withdrawn standard is only detectable if the date and
   revision travel with the text.
4. **Quote, do not paraphrase.** `chunk_text` is evidence. If it has been reworded it is
   no longer quotable and the provenance is already broken.
5. **Never synthesise a chunk with an LLM.** An LLM may classify `chunk_type`, split
   passages, and normalise entity names. It may never write `chunk_text` or invent a
   `source_url`. That is the fabrication this whole system exists to prevent.
6. **Record exclusions.** A source you decided against goes in `research_exclusions` with a
   reason, so the next agent does not re-litigate it.

## Tooling

- **Crawl4AI** (self-hosted MCP, free) — the default. Use it for everything it can reach:
  standards pages, manufacturer spec pages, docs sites, HTML.
- **Firecrawl** (4 keys, ~4,000 credits) — reserve for what Crawl4AI cannot do: JS-heavy
  pages, PDF extraction, structured crawls needing a sitemap walk. **Budget it per
  property in the brief and report credits actually spent.**
- **Embeddings** — `vector(1536)`. Embed via the LiteLLM gateway at `ai.xenco.lan:4000`.
  The query side and the corpus side **must** use the same model or retrieval silently
  degrades. Batch 50, concurrency 4, always retry.

## Definition of done — per property

A property is finished when **all** of these are true, and each is a command someone can run:

1. `SELECT count(*) FROM <schema>.research_*_chunks WHERE embedding IS NOT NULL` ≥ **500**.
2. Every chunk has a non-empty `source_url`, and a sample of 20 all return 2xx.
3. `citation_tier` has **more than one distinct value**, and standards/regulator/manufacturer
   material is tagged `official`.
4. `mcp.properties.metadata->>'site'` equals the site's **current** live domain.
5. `resolve_property_for_site(site_id)` returns the property.
6. `resolve_corpus_if_populated(db, site_id)` returns the property (i.e. clears the floor).
7. A **relevance smoke test**: three real article titles from that property, queried through
   `search_research_router(title, property=<prop>)`, each return hits whose titles are
   visibly on-topic. **Read the titles. Do not accept a count as proof** — a loop wrote 18
   PubMed papers on haematology and dialysis to a live article about couples vibrators
   because its filter checked the domain and nobody read the titles.
8. `ingestion_log` has a row per source batch, with hashes, including failures.

## Hard rules

- **Never write `chunk_text` with an LLM.** Extract it.
- **Never invent a `source_url`.** No URL, no row.
- **Never add enum values** without saying so and why.
- **Never bulk-tag `citation_tier`.** One value across a corpus is a broken field.
- **Do not touch `bc_topics`, `bc_articles` or anything in `public.`** — corpus work is
  confined to its own schema plus one `mcp.properties` row.
- **Do not deploy anything.** Corpus work is data. Code and env changes come back to the
  BlogCraft backend admin.
- **Report credits spent** (Firecrawl) and rows written, per source.
