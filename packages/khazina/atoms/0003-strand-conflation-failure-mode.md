---
id: 0003
slug: strand-conflation-failure-mode
title: Adjacent-category conflation as a recurring classification failure mode (attestation-discipline ↔ apophatic-move)
created_at: 2026-04-27
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-27 aapi al-Karajī ship + same-session falsification correction

novel_move:
  seed: |
    Adjacent categories with shared surface signal get conflated under cohort or threshold pressure.
    The conflation pattern is itself a diagnostic tool.
  class: counter-instance
  anchor: aapi://entry/al-karaji + commit/291094b — the strand-conflation correction
  one_line: When two categories in a classification system are *structurally adjacent* (share surface-level signal but differ in load-bearing structure), curators systematically conflate them under cohort-pressure or threshold-clearance pressure. The conflation is a counter-instance to the discipline that prevents it; cataloging the conflation pattern produces a diagnostic tool.
  falsification: If across multiple curator-decision contexts the conflation does NOT recur in adjacent-category settings — i.e., curators cleanly separate adjacent categories without external prompting — the atom claims recurrence-as-failure-mode is wrong. The atom would also be invalidated if conflation occurs but never under the predicted contexts (cohort-pressure, threshold-pressure, same-day-momentum).

applicable_problem_shapes:
  - class: diagnostic-tool
    example: "Audit a curator's strand-classification decisions over a session for adjacent-category conflation patterns. Flag suspect classifications for re-review."
  - class: audit-methodology
    example: "Build an automated re-classification harness that asks: for each strand contribution that was made under threshold-clearance pressure, does the actual sub-variant fit the strand's core test (named-limit for apophatic; recursive-justification for attestation), or does it fit the adjacent strand's test?"
  - class: methodology-publication
    example: "Paper: 'Conflation under pressure — a recurring classification failure mode in cross-tradition cataloging.'"

transformation_work:
  cost_class: moderate
  description: |
    1. Identify adjacent categories in the target classification system. (For aapi: attestation-discipline ↔ apophatic-move; method-of-doubt ↔ continuing-inquiry; etc.)
    2. For each adjacent pair, name the *load-bearing-test* that distinguishes them — the operational question that produces a binary answer.
    3. Audit existing classifications: for each entry classified under category A, does it actually pass A's load-bearing test, or does it pass B's? Flag mismatches.
    4. Cross-reference flags with curator-context (was this added under cohort-closure pressure, threshold-clearance argument, etc.). Mismatches under pressure are higher-confidence.
    5. Surface flagged entries to curator for re-classification.
    6. Track outcomes: (a) confirmed-conflation rate, (b) confirmed-correct-classification rate, (c) ambiguous-cases.
  skill_required:
    - the target classification system's category structure
    - operational reading of load-bearing-tests (philosophy / domain expertise)
    - cataloging curation experience

output_forms:
  - value_class: audit-methodology
    example: "Audit consulting deliverable for a knowledge graph: 'Adjacent-category conflation report' with flagged entries + curator-context notes + recommended re-classifications."
    monetization: per-engagement fees (data-quality consultancies, library science consultancies)
  - value_class: data-quality-tool
    example: "Automated tool that takes a classification system + sample of decisions + decision-context-metadata, outputs ranked conflation candidates."
    monetization: subscription per knowledge graph; one-time audit fee
  - value_class: publication
    example: "Methodology paper for an information-science / knowledge-engineering venue."
    monetization: academic credibility

evidence:
  successful_transformations:
    - "aapi 2026-04-27: caught al-Karajī's proto-induction being incorrectly claimed to fill an apophatic-move sub-variant slot. The proto-induction is recursive-justification (attestation-discipline test = leaves concrete reproducible work that other inquirers can test) NOT named-limit (apophatic-move test = names the limit of grasp). Same-day correction landed in commit 291094b."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: counter-instance-class
  cohort_origin: 2026-04-27 aapi al-Karajī ship + same-session self-audit
  audit_notes: |
    The atom is itself a counter-instance — it documents the failure mode
    that the corpus's discipline is supposed to prevent. The fact that the
    discipline caught the error same-day (Phase 9.0 calibration triggered
    the audit, audit caught the conflation, correction landed) is itself
    evidence of the discipline's value. But the conflation occurred under
    threshold-clearance pressure (al-Karajī was shipped specifically to
    clear a deferred sub-variant family adoption) — pressure-context is
    the predicted-recurrence-trigger.
---

# Atom 0003 — Adjacent-category conflation under pressure

aapi's eight strands are designed to be structurally distinct. Each has an operational load-bearing test:

- **attestation-discipline**: leaves concrete reproducible work that other inquirers can test → recursive-justification structures (proofs, replicable specifications, induction patterns) qualify
- **apophatic-move**: names the limit of grasp → declarative limits, paradox-openings, method-bounded acknowledgments qualify

These categories *share surface-level signal*: both involve methodological reflexivity, both can occur in mathematical contexts, both can produce structured-looking sub-variants. They differ in load-bearing structure: attestation is about *what's left for others*; apophatic is about *what's named as ungraspable*.

When al-Karajī's proto-induction was shipped (2026-04-27), the entry's audit_notes claimed the proto-induction provided the missing non-Western anchor for the deferred `mathematical-method-bounded-apophatic` sub-variant family. **This was wrong on two counts**: (1) strand conflation — al-Karajī's proto-induction lives under attestation-discipline (recursive-justification structure that subsequent inquirers can verify and extend), NOT apophatic-move; (2) wrong threshold reading — bubExplains/review §A required ≥3 of 7 sub-variants, not 3 figures within one sub-variant.

The conflation occurred under specific pressure: al-Karajī was being shipped *to clear* a flagged bottleneck. Under that pressure, the curator (me) reasoned about which slot needed filling and conflated the adjacent strands. Phase 9.0 calibration (running the same day) triggered a self-audit; the audit caught the conflation; the correction landed in commit 291094b.

The atom proposes that **adjacent-category conflation under pressure is a recurring failure mode in cross-classification systems**, not a one-off error. The diagnostic value: any catalog with adjacent categories should expect this pattern under threshold-clearance and cohort-closure pressure. The transformation: build an audit harness that re-applies the load-bearing-test to each classification under pressure, surfaces mismatches.

For commercial application: corporate ontologies (skill-classification, product-taxonomy, compliance-categorization) have adjacent-category problems systematically — they're built under deadline pressure with fungible-feeling category boundaries. An audit-methodology that catches conflations is a genuine data-quality service.
