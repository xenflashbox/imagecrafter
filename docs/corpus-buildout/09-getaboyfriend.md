# Corpus brief — getaboyfriend.net (`gab`)  ·  NEW SITE

**Read `00-CORPUS-SYSTEM-CONTRACT.md` first.** Spec: `app/data/corpus_specs/gab.json`.
Schema does not exist yet — the BlogCraft backend admin provisions it from that spec.

## The two failure modes this niche has

**1. The invented statistic.** "83% of men prefer…", "it takes an average of 7 dates to…".
These numbers are everywhere in dating content and almost none of them have a source. They
are the single most common fabrication in the niche and they are trivially catchable: a
number with no citation does not enter the corpus.

**2. Manipulation presented as advice.** Large parts of this space teach tactics —
withholding replies, manufactured scarcity, tests. That is not what this property publishes,
and the corpus is how the distinction gets enforced: if guidance cannot be traced to
relationship research or a named practitioner, it is opinion and belongs in
`research_exclusions`.

Required source tier: **Tier 2** (this is not a YMYL medical property), but statistics need
a real source regardless of tier.

## Entities

| entity | what it holds |
|---|---|
| `topic` | attachment styles, first dates, communication, commitment, conflict, breakups, online dating |
| `platform` | Hinge, Bumble, Tinder, Match — features, matching mechanics, policies and safety tooling, **from the platform's own published documentation** |
| `study` | a named paper, longitudinal survey or meta-analysis |

`chunk_type`: `research_finding`, `survey_statistic`, `expert_guidance`, `myth_correction`,
`safety_guidance`, `platform_mechanic`.

## Source manifest

**Tier 1/2 — relationship science.**
1. **Peer-reviewed relationship research** via PubMed/PMC and PsycNET: attachment theory
   (Hazan & Shaver and successors), Gottman's longitudinal work, speed-dating studies
   (Finkel, Eastwick), the online-dating literature.
2. **Stanford's *How Couples Meet and Stay Together* (HCMST)** — the best public dataset on
   how relationships actually begin, including the shift to online meeting.
3. **Pew Research Center** on online dating, relationships and gender attitudes.
   `pewresearch.org`. This is where a real statistic comes from.
4. **APA** guidance and consumer-facing summaries. `apa.org`.
5. **National surveys**: General Social Survey, ONS/Census family formation data where
   relevant.

**Tier 2 — platform mechanics, from the platforms.**
6. **Hinge, Bumble, Tinder, Match** help centres, safety centres, published transparency or
   dating reports, and any documented statement about how matching works. A claim about "the
   algorithm" that the platform has not published is not a `platform_mechanic` — it is
   speculation, and it dates badly.

**Tier 1/2 — safety, which must be right.**
7. **FTC** on romance scams — `consumer.ftc.gov`, plus the FTC's annual fraud data for real
   loss figures. **Never** an invented scam statistic.
8. **RAINN** and equivalent on meeting strangers safely; platform safety centres.

**Excluded:** pickup / "red pill" / "female dating strategy" material, coaching-funnel
blogs, anything whose evidence is "in my experience as a coach", and every uncited
percentage. Log at least 20 in `research_exclusions` with
`reason='uncited_statistic'` or `reason='manipulation_tactic'`.

## Definition of done

Contract items 1–8, plus:

9. ≥ **500** embedded chunks.
10. **Every `survey_statistic` chunk carries the survey name, the year and the sample.** A
    percentage without those three is the exact defect this corpus exists to prevent.
    Verify: no `survey_statistic` row may lack `source_publication_date`.
11. ≥ 15 `myth_correction` chunks. On this property, what is *not* true is most of the value
    — it is how an article distinguishes itself from the rest of the niche.
12. ≥ 20 rows in `research_exclusions`.
13. `safety_guidance` chunks exist for romance scams (with FTC loss figures) and for meeting
    someone in person for the first time.
14. Relevance smoke test on three intended titles.

## Hard rules

- **No uncited percentages, ever.** If the source cannot be named, the number does not exist.
- **A platform claim comes from the platform.** No inferred algorithm behaviour.
- **No manipulation tactics**, however widely repeated.
- **Never write a first-person dating account into the corpus.** The byline for this property
  will be a persona; a fabricated personal anecdote is the failure that has already cost this
  network real cleanup on another property.
