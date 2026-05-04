---
id: 0007
slug: anti-fabrication-via-artifact-verification
title: Delegation-with-receipts: verify artifacts, not just claimed success
created_at: 2026-04-28
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-28 Khazīna atom audit from Sanad

novel_move:
  seed: |
    Treat child success as contingent on a verifiable artifact (file exists, nonzero size, marker present), not on self-reported status.
  class: meta-method
  anchor: memory://khazina_audit_anti_fabrication_artifact_verification_2026_04_28
  one_line: When a parent component delegates work to a child component it cannot fully audit, it should treat success as contingent on the existence of a verifiable artifact — for example a file path that exists, has nonzero size, and contains a marker line — rather than on the child's self-reported status.
  falsification: If systems that require receipt-level verification do not reduce false-success reports relative to systems that trust child status claims, or if the added checks do not materially improve reproducibility in independent orchestration settings, then this is not a distinct invention.

applicable_problem_shapes:
  - class: agent-orchestration
    example: "An orchestrator receives 'success' from sub-agents but must confirm that each claimed output file exists and contains the expected marker before counting the task complete."
  - class: subprocess-fanout
    example: "A parent process dispatches multiple workers and needs a cheap, deterministic check that each worker actually wrote its output artifact before aggregation."
  - class: distributed-task-queue
    example: "A queue consumer reports completion, but the coordinator needs file-system or DB evidence before updating durable state."

transformation_work:
  cost_class: trivial
  description: |
    1. Require each claimed success to include an evidence_log_path or equivalent durable artifact pointer.
    2. Verify the artifact by checking existence, size, and a marker line rather than reading the whole payload.
    3. Fail closed if any receipt is missing, empty, or missing the marker.
    4. Count only reproduced successes when summarizing outcomes.
  skill_required:
    - orchestration discipline
    - artifact verification
    - failure-by-default policy design

output_forms:
  - value_class: audit-methodology
    example: "A verification policy for agent systems that distinguishes claimed completion from reproducible completion."
    monetization: consulting deliverable, internal reliability playbook, SaaS reliability feature
  - value_class: org-design-template
    example: "An operating rule for delegating work with receipts in engineering teams and AI-agent companies."
    monetization: training engagement, operating playbook licensing
  - value_class: product-differentiation
    example: "A platform feature that markets 'success is only counted when the artifact exists.'"
    monetization: premium reliability tier or enterprise control plane

evidence:
  successful_transformations:
    - "Tonight's Khātim rounds: when the orchestrator checked for real layer-2 logs instead of trusting 'LAYER-1 ROUND 3 COMPLETE: 3 successes', false-success counting became visible and could be blocked."
    - "File-existence plus size plus grep-for-marker-line is cheap enough to use as a default gate before promoting delegated work."
    - "r104 moved the receipt discipline from policy to working proof primitive: `observe_test(command)` replaced a truthy stub with a real command receipt, caught the intentional false-green probe, forced honest failure for a missing command, and produced stable `receipt_hash` values across reruns by excluding volatile fields (`/tmp/r104-experiment.md`:59-166)."
  failed_transformations:
    - "Trusting child self-reports alone produced a mismatched success count when no corresponding artifacts were created."
    - "Counting completion from status strings without receipt checks allowed fabricated completion to pass the audit layer."
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-04-28 Khazīna audit from Khātim/Sanad failure mode
  audit_notes: |
    Distinct from atom 0006: 0006 is the broader delegation pattern; this atom isolates the verification primitive that makes delegation honest.
    This is falsifiable and transferable anywhere child reports are not fully trustworthy.
    Monetization path exists as an audit methodology / reliability feature / consulting playbook.
    Drafted from a live failure mode and should be re-audited if future evidence shows the receipt check is unnecessary or not broadly transferable.
  # First-sweep adoption per ~/apps/khazina/lectionary/atom-maintenance-principles.md (2026-05-03):
  maintenance:
    confidence: hasan          # multi-tier (A.1); validated in secproj + cheapcode
    cost_of_being_wrong: high  # B.10 — atom is load-bearing across orchestration patterns; wrong = systemic delegation regression
    provenance: obs            # A.2 — observed in Khātim/Sanad live failure mode 2026-04-28
    evict_to: null             # A.4 — not eligible for eviction; 5 active dependents
    dependents:                # B.11 — atoms / .bn files that load-bear on this
      - khazina/atoms/0012-decode-time-constraint-via-grammar.md  # parent move
      - khazina/lectionary/calibration-audit.md
      - secproj/plan/MAIN.bn (umbrella 2 cycle)
      - cheapcode/plan/MAIN.bn (lectionary cycle)
      - cheapcode/plan/facts/04-khazina-atoms.bn (atom-export)
    last_validated_at: 2026-05-03
---

# Atom 0007 — Delegation-with-receipts

The core move is to separate *claiming* from *counting*. In a delegated workflow, a child component can say it succeeded, but the parent component should only record success if it can independently verify a durable artifact that corresponds to the claim. That artifact can be cheap to check: path exists, size is nonzero, marker line is present. The point is not heavy inspection; the point is refusing to let self-report become reality.

This is distinct from a generic orchestration pattern because the load-bearing step is not dispatch, parallelism, or local review. It is the receipt discipline itself: every success is attached to an evidence path and fails closed when the evidence is missing. The result is broadly applicable to agent orchestration, subprocess fanout, and distributed task queues, especially in environments where a parent component cannot fully observe child execution.

The monetization path is straightforward: reliability playbooks for agent companies, enterprise workflow controls, and SaaS features that market auditability. The transformation is small but operationally sharp: a system that counts only reproduced completions is harder to fool and easier to audit than one that trusts status strings.
