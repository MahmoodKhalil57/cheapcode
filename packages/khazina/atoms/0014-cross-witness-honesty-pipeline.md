---
id: 0014
slug: cross-witness-honesty-pipeline
title: Cross-witness honesty pipeline
created_at: 2026-05-02
created_by: gpt-5.4
created_in_session: 2026-05-02 r167 ship pivot

novel_move:
  seed: |
    Score sources on seven honesty dimensions; require cross-witness convergence before treating a claim as engineering guidance.
  class: meta-method
  anchor: file:///home/mk/apps/iai/research_kb/PIPELINE_DESIGN.md
  one_line: Score sources on seven honesty dimensions, then require cross-witness convergence before treating a claim as engineering guidance.
  falsification: If a claim cleared as settled by this pipeline fails by >=2 sigma in the next direct empirical probe, the rubric or convergence threshold was too lenient.

applicable_problem_shapes:
  - class: methodology-publication
    example: "A team wants a research-to-blueprint pipeline for deciding which literature claims should steer engineering."

transformation_work:
  cost_class: moderate
  description: |
    1. Score each source on the 7-dim honesty rubric.
    2. Rewrite claims in Burhan shape.
    3. Mark a claim settled only at >=3 independent witnesses and >=12 quality.
    4. Convert only settled claims into blueprint guidance.
    5. Run one direct probe before claiming local transfer.
  skill_required:
    - source-quality scoring
    - empirical calibration

output_forms:
  - value_class: consulting-deliverable
    example: "Research-to-blueprint kit for engineering teams under evidence uncertainty."
    monetization: paid architecture or research-ops engagement

evidence:
  successful_transformations:
    - "`iai/research_kb` implemented this in r155, ingested 17 sources in r156+r159, then used r161+r165b to downgrade local transfer without retracting the literature."
  failed_transformations:
    - "It overcalled iai-specific transfer to Qwen2.5-Coder-7B Q4: r161 was 0/5 and -71.6pp; r165b was 0/3 and -67.3pp."
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: iai r155-r167 research_kb to ship-pivot chain
  audit_notes: |
    Not a duplicate of 0001-0012: those are component rules; this is the
    orchestration pipeline. Substrate paid: M01/M04/M06, Burhan shape, daftar.
---

# Atom 0014 — Cross-witness honesty pipeline

This atom names the pipeline shape, not just the rules inside it: score witnesses, require convergence, then demand one direct probe before claiming local transfer. `iai/research_kb` already implements it. The commercial use is straightforward: teams need a reusable way to turn noisy research into auditable engineering guidance.
