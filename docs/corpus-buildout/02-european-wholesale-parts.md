# Corpus brief — European Wholesale Parts (`ewp`)  ·  PRIORITY 2  ·  NEW SCHEMA

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Site `europeanwholesaleparts.com`.
**No schema and no registry row exist.** You create both.

## Why

51 published articles, **zero** with an authoritative source. Today's research on
manufacturer-spec questions returned `automotoflux.com`, `carsymp.com` and
`daveandkeithsservicecenterllc.com`. For a parts site the spec *is* the product: "which
coolant does an E90 take" has one correct answer published by BMW, and a content farm
guessing at it is the worst possible outcome — a reader puts the wrong fluid in their car.

## Archetype — PRODUCT corpus, follow `fav`

The "product" is a **part or a fluid specification**. Model on `fav.canonical_products`:
real typed columns, not a JSON blob.

```
ewp.canonical_spec           -- e.g. "BMW LL-01", "VW 502 00", "MB 229.5", "G12evo"
    id, spec_code text, issuer text, superseded_by text, status text,
    published_date date, applies_to text[], notes text, timestamps
ewp.canonical_part           -- a filter, a rotor, a pad set
    id, part_type, oem_number, brands text[], fitment jsonb, timestamps
ewp.research_spec_chunks     -- contract shape, chunk_type + citation_tier + source_url
ewp.research_part_chunks     -- same
ewp.ingestion_log, ewp.research_exclusions
```

**Propose the `chunk_type` enum in your report before creating it.** Suggested:
`spec_clause`, `approval_listing`, `oem_bulletin`, `fitment_fact`, `interval_fact`,
`supersession_notice`, `official_specs`, `category_overview`, `practitioner_guidance`.

`supersession_notice` matters: G12 → G12+ → G12++ → G13 → G12evo is exactly the trap NIST
r1/r2 was, and several EWP articles already turn on it.

## Source manifest

**Tier `official` — the manufacturers and their approval lists.**
1. **BMW** LL-01/LL-04, N 600 69.0 coolant, brake fluid specs — BMW technical/aftermarket.
2. **VW/Audi** 502 00, 504 00, 507 00, 508 00, G12/G12+/G12++/G13/G12evo, DSG fluid (G 052 182).
3. **Mercedes-Benz** MB 229.5/229.51/229.52, MB 325.0/326.x — the **BeVo** approval portal
   (`bevo.mercedes-benz.com`) is the authoritative list and is machine-readable.
4. **Porsche** A40, C20/C30, PDK fluid.
5. **Volvo** VCC specs, coolant and brake fluid.
6. **Fluid makers' approval sheets** — ZF (`aftermarket.zf.com`), ATE (`ate-brakes.com`),
   Liqui Moly, Motul, Ravenol, Castrol, Fuchs. These publish which OEM approvals a product
   actually carries: that is `approval_listing` and it is the single most useful chunk type
   on this property.
7. **NHTSA** recalls and TSBs where a fluid or part is implicated. `nhtsa.gov`.
8. **SAE** J-standards (abstracts only, do not paywall-scrape). `sae.org`.

**Tier `niche-expert` — acceptable for fitment, never for a spec.**
9. FCP Euro, ECS Tuning, Turner Motorsport, Pelican Parts technical articles. These are
   good on *fitment* and genuinely expert, but an OEM approval claim must come from the
   OEM or the fluid maker's approval sheet.

## Tooling

Crawl4AI for manufacturer technical sites and retailer technical articles.
**Firecrawl budget: 1,200 credits** — the largest allocation. BeVo and most OEM approval
lists are JS-driven or PDF, and they are the highest-value sources here.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks, of which ≥ 200 are `citation_tier='official'`.
10. **The supersession test** — every one of G12, G12+, G12++, G13, G12evo has a chunk
    stating its status and what replaced it, if anything.
11. Spot-check 5 existing live EWP articles: for each, the corpus can supply an `official`
    chunk for the central spec claim. If it cannot, the manifest is incomplete.
12. `mcp.properties` row created: `property='ewp'`, `schema_name='ewp'`, `status='active'`,
    `metadata->>'site' = 'europeanwholesaleparts.com'`. **Create this row LAST**, after the
    500 floor is cleared — an empty registered corpus is worse than none.

## Hard rules

- **An OEM approval claim needs an OEM or fluid-maker source.** Never a retailer blog.
- **Never infer a supersession.** If you cannot find the manufacturer saying G12++ is
  superseded, do not write that it is.
- Report the proposed `chunk_type` enum for sign-off before creating the type.
