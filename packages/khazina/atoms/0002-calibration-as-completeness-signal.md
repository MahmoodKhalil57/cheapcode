---
id: 0002
slug: calibration-as-completeness-signal
title: Held-out blind-prediction calibration produces corpus-completeness signals as a side-channel
created_at: 2026-04-27
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-27 aapi Phase 9.0 Block 1 calibration

novel_move:
  seed: |
    When metadata-only blind prediction misses, the miss-pattern itself signals whether the framework is wrong about the entity, or the corpus is under-documenting it.
  class: constant
  anchor: aapi://phase-9-0-calibration-block1-report
  one_line: When you blind-predict the strand profile of a known entry from metadata only and find a "miss," the miss is differentiated — sometimes the framework is wrong about the figure, sometimes the corpus is under-documenting the figure. The mismatch pattern itself signals which.
  falsification: If a calibration run produces high-confidence "miss" cases that examination shows are genuinely framework-wrong (not corpus-incompleteness) AND the mismatch pattern doesn't differentiate the two — i.e., the side-channel claim is just chance — the atom is invalidated.

applicable_problem_shapes:
  - class: data-quality
    example: "Identify under-documented entries in a structured knowledge base (wiki, knowledge graph, ontology) without manual auditing every entry."
  - class: diagnostic-tool
    example: "Quality-audit any classification system whose categories should distribute across entries — categories absent from entries the framework predicts SHOULD have them are documentation-gap candidates."
  - class: methodology-publication
    example: "Frame a paper on 'Falsification-cycles produce data-quality side-channels.'"

transformation_work:
  cost_class: moderate
  description: |
    1. Catalog the structured knowledge base + the prediction framework that operates on it (any classifier, ontology mapper, or expert system).
    2. Sample held-out entries with metadata-only exposure.
    3. Generate predictions probabilistically (Murphy 1973 decomposition: reliability + resolution + uncertainty).
    4. Score against actuals; classify misses into (a) framework-wrong (the entry's actual data contradicts the prediction) vs (b) corpus-gap (the entry has no data on the predicted category).
    5. Output (a)-misses → framework-improvement work-list; (b)-misses → documentation-gap work-list.
    6. Both work-lists become actionable curator queues.
  skill_required:
    - probabilistic prediction methodology (Brier scores, Murphy decomposition)
    - the domain-specific classification framework being audited
    - data-quality-engineering competence (to translate misses into actionable queues)

output_forms:
  - value_class: data-quality-tool
    example: "SaaS that audits a knowledge graph by running blind-predict cycles and surfacing the (a)-vs-(b) miss split."
    monetization: subscription pricing per knowledge graph audited; per-engagement fees for one-off audits
  - value_class: audit-methodology
    example: "Consulting deliverable: data-quality audit of a corporate knowledge base + remediation roadmap."
    monetization: paid audit engagement (data-engineering consultancy, MLOps shop)
  - value_class: publication
    example: "Methodology paper in a data-quality / knowledge-engineering venue."
    monetization: academic credibility, conference invitations

evidence:
  successful_transformations:
    - "aapi 2026-04-27 Phase 9.0 Block 1: 3 corpus-gap misses identified (Turing, Buddha, Ixtlilxochitl missing continuing-inquiry rows) — 2 actioned same-day with new strand contributions added."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: constant-class
  cohort_origin: 2026-04-27 aapi Phase 9.0 Block 1 calibration discipline produced this finding as an unexpected side-effect
  audit_notes: |
    The atom was discovered, not designed. The Phase 9.0 calibration was
    designed as a halt-condition test on the framework. The corpus-completeness
    signal emerged as an unforeseen output. This is itself a finding worth
    flagging: the falsification-cycle apparatus has more uses than its
    designers initially intended. Generalize cautiously — the side-channel may
    not work for all classification systems; needs validation across multiple
    domains before product-claims.
---

# Atom 0002 — Calibration produces completeness signals

Phase 9.0 Block 1 of aapi's calibration was designed to test whether the strand-prediction framework could be applied to uncertain-attestation cases. The methodology: blind-predict 10 held-out entries from metadata only (tradition + era + field), score against actuals, run Murphy decomposition.

The expected output was a halt-or-continue assessment of the framework. The unexpected output was that **3 of the predictions missed not because the framework was wrong, but because the corpus had no row for the predicted strand on those entries**. Turing (Church-Turing-Kleene-Cook-Karp chain), Buddha (8-fold path with appamāda injunction via sangha), Ixtlilxochitl (post-conquest mestizo historiography) all should have continuing-inquiry strand contributions. The corpus had not yet ingested them.

The miss-pattern was *differentiated*: continuing-inquiry's reliability score went off-diagonal because the predictor was over-confident on a strand whose corpus rows were partial, not because the framework was wrong about which figures have continuing-inquiry programs. **The mismatch pattern's shape — high-confidence prediction + no-row-in-corpus — became a flag for "this entry is under-documented, not falsified."**

Two of the three were actioned same-day (Turing + Buddha continuing-inquiry rows added). The third (Ixtlilxochitl) was left as a flagged depth-mode candidate.

The atom generalizes: **any classification framework that supports probabilistic prediction can produce a documentation-gap side-channel by examining its high-confidence-but-mismatched outputs.** This is differentiated by mismatch shape: framework-wrong cases show the prediction confidently asserting a property the entry's actual data contradicts; corpus-gap cases show the prediction confidently asserting a property the entry's data is silent on.

Productizing requires a tool that:
1. Wraps a knowledge base + a classifier with a Brier-scoring harness
2. Runs blind-prediction cycles
3. Sorts misses by (data-contradicts-prediction) vs (data-silent-on-prediction)
4. Produces two queues: framework-improvement vs documentation-gap

For corporate knowledge bases (compliance ontologies, product catalogs, employee skill graphs), the documentation-gap signal is often the more valuable output — most enterprises don't know what they don't have catalogued.
