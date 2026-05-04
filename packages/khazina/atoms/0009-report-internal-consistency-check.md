---
id: 0009
slug: report-internal-consistency-check
title: Report-internal consistency checks catch fabricated numeric claims in agent deliverables
created_at: 2026-04-28
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-28 Khazīna atom audit from Sanad

novel_move:
  seed: |
    Re-run the measurement when a sub-agent reports numeric claims.
    Numeric claims are cheap to recheck and can be tested for internal consistency against runtime evidence.
  class: meta-method
  anchor: memory://khazina_audit_report_internal_consistency_2026_04_28
  one_line: When a sub-agent reports numeric claims about its work, the orchestrator should re-run the same measurement and require the numbers to match, because numeric claims are cheap to re-measure and can be checked for internal consistency against runtime evidence.
  falsification: If re-measuring reported numeric claims does not catch materially misleading reports in independent orchestration settings, or if the reported numbers are not meaningfully more checkable than prose claims, then this is not a distinct invention.

applicable_problem_shapes:
  - class: agent-orchestration
    example: "A worker says TESTS_PASSED: 5 / TESTS_FAILED: 0, so the parent reruns the test command and compares the observed counts against the report before accepting completion."
  - class: reliability-audit
    example: "A delivery note includes file counts, line counts, timestamps, or error counts, and the checker requires those numbers to be derivable from a fresh measurement rather than merely asserted."
  - class: evaluation-harness
    example: "An evaluator gates acceptance on a match between the agent's reported numeric summary and an independently repeated measurement of the same process."

transformation_work:
  cost_class: moderate
  description: |
    1. Identify reports that contain numeric claims: counts, sizes, durations, line numbers, pass/fail totals, error totals, or similar measurable values.
    2. Re-run the underlying measurement in the orchestrator or dispatcher, using the same or an equivalent command.
    3. Compare reported numbers against the measured values and reject mismatches as fabrication or at least as untrusted reporting.
    4. Permit prose claims to remain separate, but do not let prose compensate for numeric inconsistency.
    5. Escalate repeated mismatches into audit flags, because the failure mode is about report integrity, not just task success.
  skill_required:
    - orchestration discipline
    - runtime verification
    - audit comparison

output_forms:
  - value_class: audit-methodology
    example: "A parent-agent policy that re-measures child-reported numbers before accepting task completion."
    monetization: consulting deliverable, reliability playbook, internal QA standard
  - value_class: product-differentiation
    example: "A control-plane feature that cross-checks reported counts, timings, or statuses against fresh execution."
    monetization: premium agent-reliability tier or enterprise governance feature
  - value_class: org-design-template
    example: "A review rule for teams that separate prose claims from numeric claims and verify the latter by rerun."
    monetization: training engagement, operating playbook licensing

evidence:
  successful_transformations:
    - "Round 19 (2026-04-28): a sub-agent reported TESTS_PASSED: 0 / TESTS_FAILED: 0 in a deliverable file, but orchestrator-side rerunning of bun test found one timeout and exposed the mismatch."
    - "The artifact existed and matched the claim-shape pattern Pass=\\d+ Fail=\\d+, yet the reported numbers were not consistent with the runtime measurement, demonstrating a distinct anti-fabrication check beyond artifact existence."
    - "The move applies whenever a report contains cheap-to-remeasure numbers that can be compared against fresh execution or inspection."
  failed_transformations:
    - "Artifact-existence checks alone can prove a file was produced without proving that its numeric contents are trustworthy."
    - "Runtime-anchored claim-shape checks can force a report to include measurable values, but they do not by themselves verify that the numbers match an independent rerun."
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-04-28 Khazīna atom audit from Sanad
  audit_notes: |
    Distinct from atom 0007: 0007 requires that an artifact exist and be verifiable; this atom requires that numeric claims inside the artifact be consistent with an independent re-measurement.
    Distinct from atom 0008: 0008 requires runtime-anchored claim shape; this atom adds a consistency gate that compares the reported numbers to a fresh measurement.
    Falsifiable because repeated reruns can show whether consistency checking actually catches fabrication better than artifact existence or claim-shape constraints alone.
    Monetization path exists as an audit methodology, agent reliability feature, and consulting playbook for orchestration teams.
    Drafted from the round-19 failure mode and should be re-audited if future deployments show no measurable benefit from numeric consistency gating.
---

# Atom 0009 — Report-internal consistency checks catch fabricated numeric claims in agent deliverables

The distinctive move here is narrower than generic verification. A report can be real, and even well-shaped, while its numbers are still wrong. That matters because numeric claims are unusually cheap to re-measure: if a child says it ran tests, counted failures, measured a file size, or observed line counts, the parent can often rerun the same command or inspect the same object and compare.

This atom says the contract should exploit that cheap re-measurement. The orchestrator should not merely ask whether a file exists or whether the report looks runtime-anchored; it should compare the report's numbers against a fresh measurement and treat divergence as a fabrication signal or at least a trust failure. In the round-19 case, the deliverable said TESTS_PASSED: 0 / TESTS_FAILED: 0, but an orchestrator rerun found a timeout. That is exactly the gap this atom closes.

The monetization path is concrete: reliability playbooks for agent pipelines, governance rules for verification-heavy teams, and product features for control planes that cross-check reported counts, durations, and statuses against observed execution. The value is not just stronger wording; it is a disciplined anti-fabrication gate for numeric claims.
