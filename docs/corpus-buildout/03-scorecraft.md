# Corpus brief — ScoreCraft (`sc`)  ·  PRIORITY 3

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Schema `sc` exists, **0 chunks**.
Site `scorecraft.io`. 25 published articles, 16 with no sources.

## The trap specific to this property

ScoreCraft writes about SEO and GEO/AI-visibility — a field whose "best practices" are
mostly assertion. The corpus must therefore be biased hard toward **what the engines
themselves publish** and **measured studies**, not agency opinion. A blog post claiming
"AI Overviews prefer lists" is not evidence; Google's own documentation is.

Existing `chunk_type` enum: `ranking_signal`, `official_guideline`, `spec_clause`,
`study_finding`, `engine_behavior`, `category_overview`, `practitioner_guidance`.

`engine_behavior` is the valuable one and the hardest to source honestly. Use it **only**
for a documented, reproducible behaviour with a citation — never for a claim about how an
engine "probably" works.

## Source manifest

**Tier `official` — the engines' own words.**
1. **Google Search Central** — the full documentation set: ranking systems guidance,
   spam policies, structured-data reference, helpful-content guidance, AI Overviews and
   AI Mode documentation, `robots.txt` and crawler docs. `developers.google.com/search`.
2. **Google Search Central blog** — dated announcements, so change is traceable.
3. **Bing Webmaster** documentation + the **IndexNow** protocol spec (`indexnow.org`).
4. **Schema.org** vocabulary — type and property definitions as `spec_clause`.
5. **W3C / WHATWG** where markup semantics are the claim.
6. **OpenAI / Anthropic / Perplexity** published crawler and citation documentation —
   `GPTBot`, `ClaudeBot`, `PerplexityBot` docs, and any published guidance on how their
   answers select sources. This is the GEO half of the property and it is thin on purpose:
   ingest what they actually publish and nothing more.
7. **Core Web Vitals** thresholds — `web.dev`, and the Chrome UX Report documentation.

**Tier `niche-expert` — measured studies only.**
8. Studies with a stated method and sample size: Ahrefs, Semrush, Moz, Backlinko research
   posts **where the method is disclosed**. The disclosure is the qualifying test — if you
   cannot state n and the method, it is opinion and belongs in `research_exclusions`.
9. Conference talks and papers with reproducible findings.

**Excluded on principle:** agency "ultimate guide" posts, LinkedIn takes, anything whose
evidence is "in our experience". Log a handful in `research_exclusions` with reason
`opinion_no_method` so the next agent does not re-litigate.

## Tooling

Crawl4AI handles nearly all of this — Google Search Central, Schema.org and web.dev are
clean HTML and well-structured. **Firecrawl budget: 300 credits**, for PDFs and any
JS-gated study.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks; ≥ 250 tagged `citation_tier='official'`.
10. Google Search Central coverage is **complete enough that a spam-policy or
    structured-data question resolves from the corpus**, not the web.
11. Every `study_finding` chunk carries a method and sample size in `chunk_text`, or it is
    not a `study_finding`.
12. ≥ 20 rows in `research_exclusions` — on this property, what you refused is as much
    of the product as what you kept.
13. Relevance smoke test on three live titles, e.g. *"Generative Engine Optimization (GEO):
    The Complete Guide"*, *"AI Visibility Tools: How to Choose"*, *"ChatGPT SEO"*.

## Hard rules

- **`engine_behavior` requires a citation to the engine.** Never an inference.
- **No undated chunks.** This field changes quarterly; a claim without
  `source_publication_date` is unusable. Populate it on every row.
- Do not ingest ScoreCraft's own published articles. Self-citation is not evidence.
