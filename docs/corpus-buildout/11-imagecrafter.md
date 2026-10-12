# Corpus brief — ImageCrafter (`ic`)  ·  PRIORITY 2

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Schema `ic` is **provisioned and
registered `draft`** (2026-10-02): `canonical_art_style` / `research_art_style_chunks`,
`canonical_animal` / `research_animal_chunks`, `canonical_print_medium` /
`research_print_medium_chunks`, plus `ingestion_log` and `research_exclusions`. **0 chunks.**
Site `imagecrafter.app`. 34 published articles, every one written ungrounded — this property
had no corpus and no registry row at all until today.

Do not confuse the `imagecrafter` schema with this one. That schema is the **product
database** (`ic_BlogPost`, `ic_Order`, `ic_Image`) and nothing in it is research.

## The trap specific to this property

**It publishes two unlike kinds of claim under one byline, and only one of them looks
risky.**

The portrait-style half is art history. "Baroque lighting", "a Van Dyck pose", "Victorian
costume" are checkable statements about real paintings in real collections, and the site
sells a product that imitates them — so getting the period wrong is both an accuracy
failure and a product-description failure.

The other half is **animal cognition**: *"Do Dogs and Cats Know When They Are Loved"*,
*"Can Cats Watch TV"*, *"Do Pets Know They Are Loved"*. These are scientific claims about
the reader's own pet, and they were written with the site profile set to
`research.citation_required: false` and **"user testimonials" listed as a preferred source
type**. A testimonial is not evidence about feline vision. This is the half to source
first and hardest.

The honest answer to most "what does my pet feel" questions is that the research does not
settle it. That is why `animal` carries an explicit **`uncertainty_note`** chunk type: if
the corpus has nowhere to put the uncertainty, the article asserts a conclusion instead.
A `cognition_study` chunk that omits the study's limits is worse than no chunk.

## Source manifest

**Tier `museum_or_archive` — the paintings themselves.**
1. **The Met** collection API and catalogue entries (open access), **National Gallery**
   (London and Washington), **Rijksmuseum** API, **Getty** and **Tate** collection records.
   Each gives artist, date, medium, dimensions and curatorial description for a *named
   work* — which is what makes a style claim checkable.
2. **Getty Art & Architecture Thesaurus** for period and style definitions.
3. Museum glossaries for technique terms (chiaroscuro, impasto, glazing, grisaille).

**Tier `peer_reviewed` — animal cognition, and only this tier for it.**
4. *Animal Cognition*, *Applied Animal Behaviour Science*, *Journal of Veterinary
   Behavior*, *Animals* (MDPI), *PLOS ONE* animal-behaviour papers. PubMed and PMC Open
   Access are the route; the licence gate in `research-corpus-ingest` already handles
   CC BY/CC0 for PMC.
5. Specifically: feline and canine **vision** (flicker-fusion rate, dichromacy, acuity —
   this is what "can cats watch TV" actually turns on), attachment and secure-base
   studies, olfactory recognition, and domestic-animal emotion research.

**Tier `veterinary_body` — position statements.**
6. **AVMA**, **AAHA**, **AAFP** (feline), **ASPCA** and **RSPCA** guidance; **AVSAB**
   position statements on behaviour and welfare.
7. **Breed standards** from AKC / FCI / TICA for conformation and coat facts used in
   depiction — standards only, not breeder prose.

**Tier `manufacturer_spec` / `standards_body` — the physical product.**
8. **Prodigi** product documentation (the fulfilment partner), and the substrate makers'
   own spec sheets: Hahnemühle, Canson, Epson, Canvas Etc. Substrate weight, cotton
   content, OBA presence, ink set.
9. **Wilhelm Imaging Research** and **ISO 18902 / 18909** for archival and lightfastness
   ratings. "Archival" is a measured claim with a number behind it, not an adjective.
10. **ICC** colour-management documentation for gamut and soft-proofing statements.

## What to refuse

Put it in `research_exclusions` with a reason, so the next agent does not re-litigate:

- Any pet-behaviour claim whose only support is a blog, a testimonial, a forum or a
  listicle — `reason='no_primary_support'`.
- Marketing copy from print vendors making archival or quality claims without a number —
  `reason='unmeasured_product_claim'`.
- AI-art-generator vendor pages describing what a style "is" —
  `reason='style_claim_from_vendor_not_museum'`.
- **ImageCrafter's own 34 published articles.** Self-citation is not evidence, and these
  were written ungrounded, so ingesting them would launder unsourced claims into the
  corpus as if they were research. `reason='self_citation'`.

## Tooling

Crawl4AI handles the museum collection APIs, breed standards and spec sheets — all clean
HTML or JSON. **Firecrawl budget: 400 credits**, for PDFs (ISO summaries, Wilhelm reports,
AVSAB position statements) and any JS-gated collection viewer. PMC Open Access goes through
the existing `research-corpus-ingest` harvester with its licence gate, not Firecrawl.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks total, with a floor per entity: **≥ 150 `animal`**,
   **≥ 150 `art_style`**, **≥ 100 `print_medium`**. A corpus that hits 500 entirely on
   art history leaves the risky half ungrounded, which is the current state.
10. **Every `cognition_study` and `behaviour_finding` chunk states the method and the
    sample in `chunk_text`, and names the limit.** If you cannot state n, it is not a
    finding.
11. ≥ 10 `uncertainty_note` chunks. On this property, a documented "we do not know" is a
    deliverable, not a gap.
12. Every `art_style` chunk that asserts a convention cites a **named work or a museum
    catalogue entry** in `source_url` or `locator`.
13. Every `archival_rating` chunk carries the number and the standard it was measured
    against.
14. ≥ 20 rows in `research_exclusions`.
15. **Relevance smoke test printing SOURCE TITLES, not counts**, on three live titles:
    *"Can Cats Watch TV, and Do They Enjoy It"*, *"Baroque Pet Portraits: Drama, Depth and
    Old-Master Light"*, *"Photo to Canvas: Your Picture as Wall Art"*. If the cat-vision
    query returns art-history chunks, the entity split is not working.

## Hard rules

- **A pet-cognition claim needs `peer_reviewed` or `veterinary_body`. Never a testimonial,
  never a blog, never inference from another species.** Cat and dog vision are different;
  do not generalise one to the other.
- **No undated chunks on `animal`.** Cognition research moves; populate
  `source_publication_date` on every row.
- **An `art_style` claim is about a named work or it is not a claim.** "Baroque portraits
  often used dramatic side lighting" without a work behind it is the kind of plausible
  sentence this corpus exists to prevent.
- **"Archival" is a number.** No archival claim without a rating and its standard.
- Do not ingest ImageCrafter's own articles, and do not ingest competitor portrait shops.
- **Do not let an LLM write `chunk_text` or invent a `source_url`.** Extract, quote, cite.

## One thing outside this brief

The site profile has `research.citation_required: false` and lists "user testimonials"
under `preferred_source_types`. **That is the setting that allowed 34 ungrounded articles
and it will keep doing so after the corpus is full.** It needs flipping once the corpus
clears the bar — flag it to the BlogCraft backend admin rather than editing the profile
yourself, because `profile_json` is the config surface for the whole property and a
hand-edit there is how two sites lost their author binding.
