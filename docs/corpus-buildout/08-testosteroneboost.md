# Corpus brief — testosteroneboost.net (`tboost`)  ·  NEW SITE  ·  HIGHEST RISK IN THE FLEET

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Spec: `app/data/corpus_specs/tboost.json`.
Schema does not exist yet — the BlogCraft backend admin provisions it from that spec.

## Read this paragraph before anything else

This is a **YMYL medical property about a hormone therapy with documented harm**.
Testosterone therapy carries cardiovascular, fertility and haematological risk that appears
on the FDA label. The supplement half of the niche is, with a few exceptions, unevidenced
claims sold on affiliate margin. A reader acting on a wrong claim here does not get a bad
haircut — they suppress their own fertility, or they take a supplement instead of seeing a
doctor about a treatable cause.

**The domain name asserts a conclusion the evidence often does not support.** For most
marketed "testosterone boosters" the trials show no meaningful effect. The corpus must be
able to contradict the site's own name, and the briefs written from it must let the articles
do so. If that is uncomfortable, this is the wrong niche — it is not the wrong corpus.

Required source tier: **Tier 1** (`required_tier_for('health')` returns Tier 1
automatically once the niche resolves).

## Entities and what belongs in each

| entity | what it holds |
|---|---|
| `condition` | hypogonadism (primary / secondary), age-related decline, and the treatable causes that masquerade as low T: obesity, sleep apnoea, metabolic syndrome, opioid use |
| `intervention` | testosterone gel / injection / pellet, clomiphene, hCG, aromatase inhibitors, lifestyle intervention |
| `supplement` | ashwagandha, zinc, magnesium, vitamin D, tongkat ali, fenugreek, D-aspartic acid, tribulus, boron |
| `biomarker` | total T, free T, SHBG, LH, FSH, oestradiol, haematocrit, PSA |

`chunk_type` values are declared in the spec: `clinical_guideline`, `clinical_finding`,
`systematic_review`, `diagnostic_criterion`, `safety_warning`, `drug_label`,
`regulatory_action`, `supplement_evidence`, `lab_reference_range`, `myth_correction`.

## Source manifest — strict order

**Tier 1 — clinical guidelines. Get these first and get them complete.**
1. **Endocrine Society**, *Testosterone Therapy in Men With Hypogonadism* clinical practice
   guideline — diagnostic thresholds, who to treat, monitoring intervals, contraindications.
   This is the single most important document for the property.
2. **American Urological Association (AUA)**, *Testosterone Deficiency* guideline —
   `auanet.org`. Diagnostic criteria (two morning measurements), the fertility discussion.
3. **FDA**: the class labelling for testosterone products, the **2015 safety communication**
   on cardiovascular risk and on abuse/dependence, and any subsequent label change.
   `fda.gov` and `accessdata.fda.gov` (DailyMed for current labels: `dailymed.nlm.nih.gov`).
4. **NIH Office of Dietary Supplements** fact sheets for zinc, magnesium, vitamin D.
   `ods.od.nih.gov`.
5. **Cochrane** reviews touching testosterone therapy. `cochranelibrary.com`.
6. **PubMed / PMC** — systematic reviews and RCTs, prioritising meta-analyses. The
   **TRAVERSE** trial (cardiovascular safety, 2023) and the **T4DM** trial are landmarks and
   must be present. `pubmed.ncbi.nlm.nih.gov`, `pmc.ncbi.nlm.nih.gov`.
7. **Lab reference ranges** from a named laboratory or guideline, never from a blog. Record
   the assay and the units — a "normal" range is meaningless without them.

**Tier 2 — where a Tier 1 source does not exist.**
8. **Examine.com** on individual supplements: it states effect sizes and grades evidence,
   which is exactly what `supplement_evidence` needs.
9. **Mayo Clinic / Cleveland Clinic / Harvard Health** patient-facing summaries, for
   plain-language framing only — never as the sole support for an efficacy claim.

**Excluded, and log a sample in `research_exclusions`:**
supplement vendor pages, "TRT clinic" marketing, bodybuilding forums, YouTube transcripts,
any page whose citation is a mechanism story rather than an outcome. Use
`reason='vendor_efficacy_claim'` or `reason='mechanism_not_outcome'`.

## What a good `supplement_evidence` chunk looks like

It states the population, the dose, the duration, the measured change and the source. A
chunk saying "ashwagandha supports healthy testosterone levels" is marketing copy and must
not enter the corpus even if a Tier 1 domain hosted it. A chunk saying what a trial measured,
in whom, for how long, and by how much — including when the answer is "no significant
difference" — is the product.

**Null results are first-class content here.** A well-sourced "this does not work" chunk is
more valuable than ten hedged positives, because it is what the rest of the internet does
not have.

## Tooling

Crawl4AI for guidelines, FDA pages, ODS and DailyMed — all clean HTML. **Firecrawl budget:
600 credits**, reserved for guideline PDFs (Endocrine Society and AUA are PDF-primary) and
any JS-gated journal landing page.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks, of which ≥ **300** are `citation_tier='official'`.
10. **The four named documents are present and quotable**: the Endocrine Society guideline,
    the AUA guideline, the FDA class label, and the TRAVERSE trial.
11. Every `supplement_evidence` chunk names a population, a dose and a measured outcome.
    Spot-check 10 and paste them.
12. Each of the nine supplements in the spec has at least one chunk, **including the ones
    where the evidence is negative**. A corpus that only holds positives will produce
    articles that only say yes.
13. `safety_warning` chunks exist for: cardiovascular risk, fertility suppression /
    spermatogenesis, polycythaemia / haematocrit, and PSA monitoring.
14. Relevance smoke test on three intended titles, at least one of which should be answerable
    with a negative finding, e.g. *"Does tribulus raise testosterone?"*

## Hard rules

- **Never write medical advice into a chunk.** A chunk reports what a guideline or trial
  says. It does not tell a reader what to do.
- **Every efficacy claim needs Tier 1 or a systematic review.** No exceptions for a
  plausible mechanism.
- **Carry the FDA warnings.** If a chunk describes testosterone therapy's benefits and the
  corpus holds no safety chunk beside it, the corpus is worse than empty.
- **Never let the site's name shape the evidence.** Record what the trials found.
- Do not ingest anything selling a product.
