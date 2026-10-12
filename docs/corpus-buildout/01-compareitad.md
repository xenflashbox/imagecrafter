# Corpus brief — Compare ITAD (`citad`)  ·  PRIORITY 1

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Schema `citad`. Site `compareitad.com`.

## Why this is first

An article published under this property cited **NIST SP 800-88 Rev. 1 as current**. Rev. 1
was withdrawn 2025-09-26 and superseded by Rev. 2. The corpus that should have known holds
**273 chunks across 40 tables**, below the 500 floor, so the property is treated as
corpus-less and every article falls to web research. This is a compliance directory: a
wrong standard citation is the product failing, not a typo.

## As-built — what already exists, do not rebuild

| table | rows | meaning |
|---|---|---|
| `canonical_standard` | 5 | the standards themselves |
| `canonical_certification` | 9 | R2v3, e-Stewards, NAID AAA, RIOS… |
| `canonical_enforcement` | 4 | enforcement actions |
| `research_standard_chunks` | 182 | evidence, embedded |
| `research_certification_chunks` | 28 | evidence, embedded |
| `research_enforcement_chunks` | 63 | evidence, embedded |
| `vendors` / `vendor_facilities` / `certified_facilities` | 711 / 854 / 1001 | the registry — **leave alone** |

The registry (vendors, facilities, certifications) is a separate workstream owned by the
CITAD registry admin. **Do not touch it.** Your job is the research corpus only.

## Source manifest — in priority order

**Tier `official` — standards and regulators. This is the backbone.**
1. **NIST SP 800-88 Rev. 2** (current) — full text, clause by clause. Also ingest Rev. 1
   **explicitly marked withdrawn** with its withdrawal date, so the corpus can answer
   "is r1 current?" with a no. `csrc.nist.gov`.
2. **SERI R2v3** — standard + appendices A–G, core requirements, process requirements.
3. **e-Stewards v4.1** — standard + performance requirements. `e-stewards.org`.
4. **NAID AAA** / i-SIGMA certification requirements. `isigmaonline.org`, `naidonline.org`.
5. **RIOS** integrated standard.
6. **EPA** — CRT rule, universal waste, export rules. `epa.gov`.
7. **State e-waste statutes** — start with CA, NY, IL, TX, WA (highest search demand).
8. **ISO 14001 / 45001 / 27001** clauses where ITAD vendors claim them. `iso.org` (abstracts
   are public; do not paywall-scrape).
9. **IEEE 2883** (sanitization) — `standards.ieee.org`.
10. **HIPAA** §164.310(d)(2), **FACTA** disposal rule, **GLBA** safeguards — the three most
    cited in ITAD sales conversations. `ecfr.gov`, `ftc.gov`.

**Tier `official`/`niche-expert` — enforcement, which is what makes it real.**
11. **FTC** and **HHS OCR** enforcement actions involving improper disposal. Named case,
    date, penalty, finding. `ftc.gov`, `hhs.gov/ocr`.
12. **SEC** orders touching data disposal (the Morgan Stanley matter is the canonical one).

## chunk_type mapping — use these, they already exist

`standard_clause` (a numbered clause), `certification_requirement`, `audit_criterion`,
`regulatory_guidance`, `legal_holding`, `enforcement_finding`, `official_specs`,
`incident_account`, `market_analysis`, `category_overview`, `practitioner_guidance`

**A clause is one chunk.** "NIST 800-88 §4.7.2 Purge" is a chunk. The whole PDF is not.
Carry the clause number in `chunk_text` so a citation can point at it.

## Tooling

Crawl4AI for all HTML standards pages and regulator sites. **Firecrawl budget: 800 credits**
— reserve for PDFs (NIST, R2v3, e-Stewards are PDF-primary) and any JS-gated page.

## Definition of done

Contract items 1–8, plus these property-specific gates:

9. `SELECT count(*) FROM citad.research_standard_chunks` ≥ **300** on its own.
10. **The withdrawal test.** This query must return a row:
    ```sql
    SELECT chunk_text FROM citad.research_standard_chunks
    WHERE chunk_text ILIKE '%800-88%' AND chunk_text ILIKE '%withdraw%';
    ```
11. `citation_tier = 'official'` on every NIST / SERI / e-Stewards / EPA / eCFR chunk.
12. Relevance smoke test against three live article titles, e.g.
    *"Media Sanitization Under NIST 800-88: Methods and When to Use Them"*,
    *"How to Get R2 Certified: The Audit Path"*,
    *"Certificate of Destruction: What It Proves and What It Doesn't"*.

## Hard rules

- **Never paraphrase a standard clause.** Quote it. A paraphrased clause is unusable as a
  compliance citation and that is the entire point of this property.
- Ingest superseded revisions **only** with an explicit withdrawal marker in the text.
- Do not touch `citad.vendors*`, `citad.certified_facilities`, `citad.deals*`, `citad.rfps*`.
