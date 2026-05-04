---
id: 0015
slug: research-pipeline-overstates-base-model-specific-transfer
title: Base-model transfer overstated
created_at: 2026-05-02
created_by: gpt-5.4
created_in_session: 2026-05-02 r167 ship pivot

novel_move:
  seed: |
    Cited research transfers less than it claims. By default, lift in setting
    A does not survive setting B unless the load-bearing mechanism is shared
    and explicitly stated. Cap confidence per the gap between source and target.
  class: counter-instance
  anchor: file:///home/mk/apps/iai/results/r161_easy_probe_summary.md
  one_line: Settled mechanism claims can fail to transfer to a smaller local model because base capability dominates scaffolding gains.
  falsification: If the same pipeline configuration on a clearly stronger base model still fails to recover the predicted lift, then the missing factor was not base-model capability.

applicable_problem_shapes:
  - class: honest-framing
    example: "A team wants to apply frontier-model agent research to a cheaper local deployment without overstating lift."

transformation_work:
  cost_class: trivial
  description: |
    1. Separate the literature claim from the local transfer claim.
    2. Run the smallest direct probe on the target base model.
    3. If lift misses badly, blame base-model envelope first.
    4. Re-test on a stronger base model before blaming the literature.
  skill_required:
    - transfer calibration

output_forms:
  - value_class: consulting-deliverable
    example: "Transfer-correction kit for local-agent decisions."
    monetization: paid technical advisory or benchmark calibration engagement

evidence:
  successful_transformations:
    - "In iai, this counter-instance stopped the consult cascade and justified the 6-of-9 ship pivot after r161 and r165b."
  failed_transformations:
    - "r155 KB predicted +5 to +10pp, but r161 measured 0/5 and -71.6pp; r165b then measured 0/3 and -67.3pp."
  use_stories_refs: []

meta:
  novelty_class: counter-instance-class
  cohort_origin: iai r155-r167 calibration chain
  audit_notes: |
    Cross-reference: 0011 is the cure, 0010 the honesty discipline, 0008 the
    runtime-anchored format. Substrate paid: M01/M04/M06 plus Burhan separation
    between literature-valid and transfer-valid.
---

# Atom 0015 — Base-model transfer overstated

This is a negative atom: the literature was not wrong, but the engineering transfer was. `iai` predicted a modest lift from settled retrieval and external-memory mechanisms, then measured a large miss on a 7B-Q4 model. The monetizable move is a transfer-correction service: separate mechanism truth from deployment truth and run the cheapest direct probe on the exact base model before spending more architecture budget.
