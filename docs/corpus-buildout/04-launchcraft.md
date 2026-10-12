# Corpus brief — LaunchCraft (`launchcraft`)  ·  PRIORITY 4

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Schema `launchcraft` exists, **0 chunks**.
Site `launchcraft.me`. 41 published articles, 34 with no sources.

## What this property actually needs

LaunchCraft is about planning and shipping apps as a non-engineer — vibe-coding tools,
PRDs, MVP scoping. The claims that need evidence are almost all of one of three kinds:

- **what a tool does and costs** → `official_specs`, `pricing_fact`, `limitation`
- **how to do a thing** → `how_to_step`
- **what went wrong for someone** → `failure_account`

Existing enum: `official_specs`, `how_to_step`, `failure_account`, `pricing_fact`,
`limitation`, `category_overview`, `practitioner_guidance`.

**`pricing_fact` and `limitation` decay fastest and matter most.** Half the value of this
corpus is being right about what a tool costs *today* and what it cannot do — the two
things every comparison article gets wrong within a quarter.

## Source manifest

**Tier `official` — vendor documentation and pricing pages.**
1. The tools the site actually writes about: **Lovable, Cursor, Bolt, v0, Replit,
   Claude Code, GitHub Copilot, Windsurf, Figma Make, Base44** — docs, pricing, and the
   published limits pages for each. Pricing page → `pricing_fact` with the date.
2. Platform docs where deployment claims are made: **Vercel, Netlify, Supabase, Neon,
   Railway, Cloudflare** — free-tier limits especially, since those are what a first
   project hits.
3. **Stripe**, **Clerk**, **Auth0** docs for the "add payments/auth" articles.
4. Changelogs and release notes — they date a `limitation` so it can expire cleanly.

**Tier `niche-expert` — failure accounts, which are the property's real differentiator.**
5. Post-mortems and "what I learned shipping X" write-ups **with specifics**: what broke,
   at what scale, what it cost. A named author and a concrete outcome are the qualifying
   test.
6. Well-documented incident reports from indie founders. Substance over reach.

**Excluded:** "10 best AI coding tools" listicles, affiliate roundups, anything whose
pricing is undated. These are the majority of what a search returns — log a sample in
`research_exclusions` with `reason='undated_or_affiliate_listicle'`.

## Tooling

Crawl4AI for docs sites (they are well-structured and it handles them well).
**Firecrawl budget: 500 credits** — several vendor pricing pages are JS-rendered, and
pricing is the thing you cannot afford to get wrong.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks.
10. **Every `pricing_fact` carries `source_publication_date`.** An undated price is a
    liability, not a source. Verify: `SELECT count(*) FROM launchcraft.research_*_chunks
    WHERE chunk_type='pricing_fact' AND source_publication_date IS NULL` returns **0**.
11. ≥ 10 distinct tools have both an `official_specs` and a `limitation` chunk — a
    comparison article needs both halves or it becomes marketing.
12. ≥ 15 `failure_account` chunks from named sources.
13. Relevance smoke test on three live titles, e.g. *"What Is a PRD?"*,
    *"Best Vibe Coding Tools in 2026 (Compared)"*, *"Do I Need a Developer for My App?"*.

## Hard rules

- **Never write a price without its observation date.**
- **A vendor is authoritative about its own product and nothing else.** A Lovable page is
  `official` for Lovable and `unknown` for its competitors.
- Do not ingest LaunchCraft's own articles.
