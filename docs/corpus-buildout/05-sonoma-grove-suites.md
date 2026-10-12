# Corpus brief — Sonoma Grove Suites (`sgs`)  ·  PRIORITY 5

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Schema `sgs` exists, **0 chunks**.
Site `sonomagrovesuites.com`. 7 published articles.

## This one is different, and the schema already knows it

`sgs` has the richest `chunk_type` enum in the fleet — 28 values — and they are not
generic. They were designed for a specific property with a real place attached:

`lodging_amenity_detail`, `guest_perspective`, `host_recommendation`, `local_recommendation`,
`neighborhood_context`, `sonoma_lore`, `boyes_hot_springs_history`, `railroad_era`,
`sonoma_plaza_history`, `early_hospitality_history`, `historical_account`,
`family_stewardship_narrative`, `terroir_explainer`, `appellation_context`,
`winemaker_profile`, `vintage_tasting_note`, `cuisine_pairing`, `tasting_room_review`,
`comparative_review`, `editor_endorsement`, `price_intelligence`,
`longitudinal_user_perspective`, `partnership_context`, `official_specs`,
`marketing_copy`, `feature_callout`, `category_overview`

It also has a `citation_tier` value no other property has: **`historical-archive`**.

**Read that enum as the brief it is.** Someone designed this expecting local history and
place knowledge, not hotel-listicle filler. Build to it.

## Source manifest

**Tier `official` / `regional` — the place itself.**
1. **Sonoma Valley / Sonoma County** visitor and government sources: city of Sonoma,
   Sonoma County tourism, Sonoma Valley Visitors Bureau, state park pages for Jack London
   SHP and Sonoma SHP.
2. **Boyes Hot Springs** specifically — the property's own neighbourhood. This is the
   highest-value and thinnest-covered material on the entire site, and `sgs` has three
   chunk types dedicated to it.
3. **Appellation and AVA definitions** — Sonoma Valley, Carneros, Moon Mountain, Bennett
   Valley. TTB AVA filings are the authoritative source and are public.
4. Transport, access and practicalities: SMART rail, airport transfer, parking rules.

**Tier `historical-archive` — this is why the tier exists.**
5. **Sonoma County Library** local history collections, **Sonoma Valley Historical
   Society**, California Digital Newspaper Collection (`cdnc.ucr.edu`) for the railroad
   era and the hot-springs resort period. Digitised newspapers are ideal: dated, quotable,
   genuinely primary.
6. Historic hotel and resort records for the Boyes Springs area.

**Tier `niche-expert` / `regional` — wineries and dining.**
7. Winery sites for the ones actually within reach of the property: tasting notes,
   appellation claims, visiting practicalities. `winemaker_profile`, `terroir_explainer`.
8. Restaurant sites and menus for `cuisine_pairing`, dated.

**Do NOT ingest** OTA listings (Booking, Expedia, Airbnb), review-aggregator pages, or
competitor lodging marketing. `guest_perspective` means a real, attributable guest account,
not a scraped star rating.

## Tooling

Crawl4AI for tourism, winery, government and park sites. **Firecrawl budget: 400 credits**
— reserve most of it for the digitised newspaper archives, which are image-and-PDF heavy
and are the material that makes this corpus distinctive.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks.
10. ≥ 60 chunks tagged `citation_tier='historical-archive'` — if this is zero, the brief
    was not followed and the property has no differentiator.
11. ≥ 30 chunks under the Boyes Hot Springs / railroad-era / Sonoma Plaza history types.
12. ≥ 8 distinct `chunk_type` values in use. A corpus using three of twenty-eight is a
    generic corpus wearing this schema's clothes.
13. Relevance smoke test on three intended titles, at least one of them local-history.

## Hard rules

- **`guest_perspective` requires an attributable person.** Never a synthesised quote, never
  an aggregate rating restated as a voice. This property is a real business Xen owns and
  operates; an invented guest testimonial is a fabricated review.
- **Do not write first-person host narrative into the corpus.** Xen is the real host —
  his own account is supplied by him, not extracted by an agent.
- Date every historical chunk. An undated archive quote cannot be placed in its era.
