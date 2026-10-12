# Corpus buildout — runbook

## Order

| # | property | schema | why this order |
|---|---|---|---|
| 1 | Compare ITAD | `citad` (273 → 500+) | compliance property already shipping wrong standard citations |
| 2 | European Wholesale Parts | `ewp` (**create**) | 51 articles, 0 authoritative sources, spec errors reach a reader's car |
| 3 | ScoreCraft | `sc` (0) | 16 sourceless articles; sources are clean HTML and cheap to get |
| 4 | LaunchCraft | `launchcraft` (0) | 34 sourceless; pricing decay is the live risk |
| 5 | Sonoma Grove Suites | `sgs` (43) | seeded 2026-09-26 from the owner's Historical Society report; richest schema, real business |
| NEW | **testosteroneboost.net** | `tboost` (**create**) | YMYL medical, hormone therapy — highest risk in the fleet, brief `08` |
| NEW | **getaboyfriend.net** | `gab` (**create**) | brief `09`; the niche's failure mode is the invented statistic |

The two NEW sites come first if the goal is to test the system end to end: they are the only
properties where the corpus is built BEFORE any article is published, which is the workflow
every future site and every client will use.

1 and 2 can run in parallel — different schemas, no shared tables. 3, 4 and 5 are
independent of everything.

## Firecrawl budget

| property | credits | rationale |
|---|---|---|
| EWP | 1,200 | OEM approval portals are JS/PDF and are the whole point |
| Compare ITAD | 800 | standards are PDF-primary |
| LaunchCraft | 500 | vendor pricing pages are JS-rendered |
| SGS | 400 | digitised newspaper archives |
| ScoreCraft | 300 | mostly clean HTML, Crawl4AI covers it |
| **testosteroneboost** | 600 | Endocrine Society and AUA guidelines are PDF-primary |
| **getaboyfriend** | 250 | Pew and platform help centres are clean HTML |
| **total** | **4,050** | at the ceiling — sequence the two new sites first if credits are tight |

**Crawl4AI is the default for everything it can reach.** Firecrawl is for PDFs, JS-gated
pages and sitemap walks. Report credits actually spent per property.

## What comes back to the backend admin

A subagent finishing a property reports:

1. Chunk counts per table, and the `embedding IS NOT NULL` count.
2. `citation_tier` distribution — **if it is one value, the property is not done.**
3. `chunk_type` distribution.
4. Firecrawl credits spent; Crawl4AI pages fetched.
5. `ingestion_log` summary including failures.
6. `research_exclusions` count and the reasons used.
7. **The relevance smoke test output, with the source titles printed.** Not counts —
   titles. A loop wrote 18 haematology and dialysis papers onto an article about couples
   vibrators, and then six papers about West Nile virus and arthropod pests onto two more,
   because every check looked at domains and counts and nobody read the titles.
8. For EWP: the proposed `chunk_type` enum, for sign-off before creation.

Then the backend admin verifies resolution (`resolve_property_for_site`,
`resolve_corpus_if_populated`) and runs the factual repair loop against that property's
live articles.

## The one rule that matters most

**Never let an LLM write `chunk_text` or invent a `source_url`.** Extract, quote, cite.
Every failure this system exists to prevent — the withdrawn NIST citation, the fabricated
twelve-week trial, the padded product roster — was something plausible written where
something true was required.
