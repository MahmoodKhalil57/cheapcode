---
id: 0008
slug: claim-shape-pattern-runtime-anchored
title: Claim-shape patterns force runtime-anchored diagnoses to commit to verifiable facts
created_at: 2026-04-28
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-28 Khazīna atom audit from Sanad

novel_move:
  seed: |
    Demand reports whose fill-in values must come from runtime observation,
    not static inference. The template forces commitment to a fact that
    independent re-execution could check, or an honest "undetermined".
  class: meta-method
  anchor: memory://khazina_audit_claim_shape_runtime_anchoring_2026_04_28
  one_line: When an orchestrator requires a child report to satisfy a claim-shaped template, the strongest anti-fabrication version is not merely a claim about a static artifact but a claim whose fill-in values must be derived from runtime observation, so the report commits to facts that can be independently checked.
  falsification: If runtime-anchored claim-shaped prompts do not reduce confidently wrong diagnoses relative to static-only claim-shaped prompts in independent orchestration settings, or if the distinction collapses once reports are audited, then this is not a distinct invention.

applicable_problem_shapes:
  - class: agent-orchestration
    example: "A parent agent asks a sub-agent to diagnose a failing test and insists the report include ITERATIONS_OBSERVED: <N> from actually rerunning the test, rather than a plausible-looking estimate."
  - class: distributed-task-queue
    example: "A coordinator accepts a worker's completion note only if it includes runtime-derived counts, timestamps, or observed state transitions, not just a descriptive summary."
  - class: ai-evaluation-harness
    example: "An evaluator requires claims to be filled with values extracted from observed execution, so the write-up cannot be satisfied by static reasoning alone."

transformation_work:
  cost_class: moderate
  description: |
    1. Start with a claim-shaped report template that forces commitment to a specific checkable value.
    2. Replace static fill-ins with runtime-anchored fields: observed counts, measured timings, rerun outcomes, or explicit 'undetermined' admissions when observation is impossible.
    3. Make the parent component reject templates that can be satisfied by plausible inference alone.
    4. Use the template to distinguish genuine diagnosis from confident reconstruction.
    5. Treat the report as a contract: missing runtime evidence is a failure, not a stylistic issue.
  skill_required:
    - orchestration discipline
    - runtime verification
    - prompt contract design

output_forms:
  - value_class: audit-methodology
    example: "A reporting policy that requires diagnosis templates to contain runtime-derived facts, not just artifacts or prose."
    monetization: consulting deliverable, reliability playbook, internal QA standard
  - value_class: product-differentiation
    example: "A platform feature that distinguishes static claim templates from runtime-anchored claim templates in agent workflows."
    monetization: premium agent reliability tier or enterprise control-plane feature
  - value_class: org-design-template
    example: "A review rule for teams that want sub-agent reports to be falsifiable by execution, not merely plausible on inspection."
    monetization: training engagement, operating playbook licensing

evidence:
  successful_transformations:
    - "Rounds 11-13 (2026-04-28): topic-shape patterns could be satisfied by hedged prose, but claim-shape patterns forced a specific verifiable statement in the report."
    - "The runtime-anchored variant improved the audit by requiring values like ITERATIONS_OBSERVED: <N> to come from rerunning the failing test, which produced either observed facts or honest 'undetermined' admissions."
    - "The pattern ladder itself was visible in practice: topic-shape -> claim-shape -> runtime-anchored claim-shape, with anti-fabrication strength increasing at each step."
  failed_transformations:
    - "Static-only claim-shape templates still admitted confidently wrong diagnoses that sounded plausible but were not derived from observation."
    - "Topic-shape templates allowed broad, hedged prose that did not force commitment to a verifiable runtime fact."
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-04-28 Khazīna atom audit from Sanad
  audit_notes: |
    Distinct from atom 0007: 0007 requires that the artifact exist and be verifiable; this atom requires that the artifact's content-shape encode commitment to runtime-verifiable claims.
    This is falsifiable and transferable anywhere a parent component cannot fully audit a child's reasoning trace but can require specific runtime-derived values.
    Monetization path exists as an audit methodology, agent reliability feature, and consulting playbook for evaluation harnesses.
    Drafted from rounds 11-13 evidence and should be re-audited if later deployments show that runtime anchoring does not outperform static claim-shaping.
  # First-sweep adoption per ~/apps/khazina/lectionary/atom-maintenance-principles.md (2026-05-03):
  maintenance:
    confidence: hasan          # validated in secproj quality_scorer + .bn shape across 3 projects
    cost_of_being_wrong: high  # B.10 — every .bn audit shape inherits from this; wrong = audit pipeline collapse
    provenance: obs            # A.2 — observed in Sanad rounds 11-13
    evict_to: null             # A.4 — load-bearing; 5 dependents
    dependents:
      - khazina/atoms/0012-decode-time-constraint-via-grammar.md  # uses 0008 step inside transformation_work
      - khazina/lectionary/calibration-audit.md
      - secproj/plan/MAIN.bn (umbrella 2 cycle)
      - cheapcode/plan/MAIN.bn
      - cheapcode/plan/facts/04-khazina-atoms.bn
    last_validated_at: 2026-05-03
---

# Atom 0008 — Claim-shape patterns force runtime-anchored diagnoses to commit to verifiable facts

The core move is not merely to demand a report, nor even to demand a report with a precise claim. The move is to require that the claim's fill-in values come from runtime observation, so the child component must actually run, observe, and then report. That changes the error mode: instead of hedged prose or plausible static inference, the system gets a value that either traces to execution or is explicitly marked undetermined.

This is a stronger anti-fabrication discipline than generic claim-shaping because the parent is no longer satisfied by a sentence that sounds testable in principle. The template itself becomes a contract for observation: the report must expose the runtime path that produced the value. In agent orchestration, distributed task queues, and evaluation harnesses, that means the parent can distinguish real diagnosis from confident reconstruction. The structural lesson is that patterns are contracts, and the strongest contracts are ones that force claims to bind to observable behavior.

The monetization path is practical: reliability playbooks for agent companies, QA standards for evaluation pipelines, and product features that market runtime-anchored reporting. The distinctive value is not just better prose; it is a report format that makes fabrication harder by requiring the answer to be born from execution.
