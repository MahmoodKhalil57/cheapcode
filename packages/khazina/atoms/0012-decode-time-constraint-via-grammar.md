---
id: 0012
slug: decode-time-constraint-via-grammar
title: Decode-time grammar constraint as anti-fabrication primitive (sub-variant of atom 0007)
created_at: 2026-04-30
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-30 r133+ plan-6 validation pass; surfaced from secproj/Finding-5 backfill into realized/0001 + conversions/0001

novel_move:
  seed: |
    When tempted to verify a child's structured output after the fact, instead constrain its decode space so invalid output cannot exist.
    Verification by construction beats verification by inspection.
  class: sub-variant
  anchor: secproj://FINDINGS.md#finding-5
  one_line: When a parent component would otherwise *verify* a child's structured output after the fact, a stronger move is to *constrain the child's generation space* at decode time so that invalid output cannot exist — making post-hoc verification redundant by construction.
  falsification: |
    If decode-time grammar constraint does NOT reduce typed-field fabrication
    relative to post-hoc artifact verification (atom 0007's documented technique)
    on a controlled comparison (same model, same gold set, schema-enforced vs
    free-form-with-validator), the sub-variant collapses into atom 0007 and the
    distinction is not load-bearing. Equivalently, if the constraint regresses
    throughput at scale (n>=20 representative product schemas) such that operators
    revert to post-hoc verification, the sub-variant is dominated and not transformable.

applicable_problem_shapes:
  - class: agent-orchestration
    example: An LLM agent's tool-call arguments must conform to a typed schema; constrain the JSON at decode time so the agent cannot emit malformed tool calls.
  - class: structured-output-product
    example: A product that ships LLM-generated structured artifacts (incident summaries, triage verdicts, MITRE attack mappings) makes hallucinated typed-field values impossible by registering the JSON Schema with the LLM runtime's grammar layer.
  - class: code-generation-with-types
    example: Type-aware code generation where the decoder is constrained to emit only well-typed expressions, avoiding the "generate then reject" loop that wastes tokens on invalid candidates.

transformation_work:
  cost_class: trivial
  description: |
    1. Lock the target output's JSON Schema (or equivalent grammar).
    2. Register the schema with the LLM runtime via the runtime's grammar/format
       parameter (Ollama `format: <schema>`, llama.cpp GBNF, vLLM guided JSON, etc).
    3. Pre-register the experiment hypothesis (model, schema, gold set, success criteria).
    4. Run eval; record schema-validity + fabrication-rate + throughput axes.
    5. Generalize the principle to every structured-output module in the same product.
    6. Document leakage paths: schema features outside the grammar translator's
       coverage (e.g. `const`, `additionalProperties: false`, complex enums, `oneOf`)
       silently degrade — explicit stress-test required before scale claims.
  skill_required:
    - LLM runtime configuration (llama.cpp / Ollama / vLLM grammar interfaces)
    - JSON Schema authorship with translator-coverage awareness
    - eval harness with pre-registered hypotheses (per atom 0011)
    - honesty discipline (per atom 0008)

output_forms:
  - value_class: product-feature
    example: A platform feature that markets "structured outputs are fabrication-impossible by construction, not just validated after."
    monetization: premium reliability tier, enterprise control plane, regulated-industry differentiator (finance, healthcare, government)
  - value_class: audit-methodology
    example: A reliability audit standard for AI-agent companies that distinguishes "outputs validated post-hoc" (atom 0007) from "outputs constrained at generation" (this atom).
    monetization: consulting deliverable, internal reliability playbook, SaaS reliability feature
  - value_class: heuristic
    example: Rule of thumb — if a structured output's invalid states are knowable, prefer constrain-at-generation over verify-after-generation. Only fall back to verification when the output cannot be schema-bounded.
    monetization: indirect via reduced fabrication-incident rate and faster decision cycles in agent orchestration

evidence:
  successful_transformations:
    - "secproj v0 binary (2026-04-18) — Phi-4-mini Q4_K_M with Ollama format=<TriageVerdict v1 JSON Schema>: 5/5 schema-valid, 0/5 hallucinated typed-fields, 64.6 tok/s median (vs 54.7 free-form). Pre-registered hypothesis at secproj/eval/hypotheses/HYPOTHESIS_phi4_mini_schema_enforced.md. Scorecard at secproj/eval/results/phi4-mini-q4km-schema-v1/scorecard.json. Finding 5 in secproj/FINDINGS.md."
    - "Same constraint principle generalized to Qwen 2.5 14B Q4 (Tier 2): 5/5 schema-valid, +10pp aggregate coverage at n=5 (magnitude unreliable until n>=20+). Scorecard at secproj/eval/results/qwen25-14b-q4km-schema-v1/scorecard.json."
    - "Bench-v4.1 regression suite: 7/7 hard passing across three cold-start runs through pilot rounds 1-4 prompt ratchet. The decode-time-constraint principle held while the prompt was iterated heavily — strong evidence the constraint is orthogonal to prompt design. Scorecards at secproj/eval/results/bench-v41-confirm-a/bench_scorecard.json + bench-v41-confirm-b."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: sub-variant
  cohort_origin: 2026-04-30 r133+ plan-6 validation pass; surfaced incidentally during the act of writing conversions/0001 (atom 0007 -> secproj Finding 5)
  audit_notes: |
    Refines atom 0007 (anti-fabrication-via-artifact-verification) by distinguishing
    *decode-time constraint* from *post-hoc verification*. Atom 0007 says "count only
    artifacts that exist with a marker." This atom says "shape generation so invalid
    artifacts cannot exist." Both serve anti-fabrication; the moves are structurally
    inverse (verify-after vs constrain-during).

    Audit-flag bias: this atom was extracted *during* a plan-6 schema-validation
    session. The act of writing conversions/0001 surfaced it organically — the
    conversion's "method" turned out to differ from atom 0007's documented technique.
    But this means the atom was extracted under threshold-clearance pressure (plan
    6's "did the conversion act feel generative" test). Re-audit this atom in a
    separate session, especially if it is asked to anchor a *second* conversion
    entry — a single deployment is not sufficient evidence of independent transferable
    structure (per khazina criterion 1: structurally distinct, not just an instance).

    Cross-references:
    - atom 0007: parent move, refined here
    - atom 0008: claim-shape-pattern-runtime-anchored — used inside the transformation_work
      step "tag VERIFIED/PLAUSIBLE/SPECULATIVE"
    - atom 0011: smallest-distinguishing-experiment-first — used inside the
      transformation_work step "pre-register the experiment hypothesis"

    A second deployment with a *different* technique-class (e.g. type-aware code
    generation, or constrained tool-call argument synthesis) is the strongest
    falsifier. If the constraint principle transfers cleanly to a non-LLM-JSON
    domain, this atom is real. If it doesn't, it collapses back into atom 0007's
    LLM-specific deployment shape.
  # First-sweep adoption per ~/apps/khazina/lectionary/atom-maintenance-principles.md (2026-05-03):
  maintenance:
    confidence: hasan          # validated in secproj 2026-04-18 pilot + fresh-machine reval 2026-05-03 (5 MITRE techniques anchored)
    cost_of_being_wrong: high  # B.10 — wrong = secproj umbrella 3 falsifies; cloud-incumbent narrative weakens
    provenance: obs            # A.2 — observed in secproj decoding pipeline live
    evict_to: null             # A.4 — load-bearing for secproj umbrella 3
    dependents:
      - khazina/atoms/0007-anti-fabrication-via-artifact-verification.md  # parent (refines 0007)
      - secproj/plan/MAIN.bn (umbrella 2 cycle)
      - cheapcode/plan/facts/04-khazina-atoms.bn
    last_validated_at: 2026-05-03
    boundary_status: still-needs-second-deployment-in-non-LLM-JSON-domain (per audit_notes; falsifier still unresolved)
---

# Atom 0012 — Decode-time grammar constraint as anti-fabrication primitive

This atom was surfaced on 2026-04-30 during the validation pass for plan 6's energy-form schema extension. The triggering event was writing `conversions/0001` (atom 0007 → secproj Finding 5). When the conversion's `method` was filled in, it became clear the technique deployed in secproj — register the JSON Schema with the LLM runtime's grammar layer so invalid JSON cannot be generated — is structurally distinct from atom 0007's documented post-hoc verification technique. The two moves serve the same goal (anti-fabrication) but invert the order of operations: 0007 says verify-what-was-claimed, 0012 says prevent-claims-that-can't-be-verified.

The structural distinction matters because the cost model is different. Post-hoc verification consumes verification work after generation and raises the question of what to do with bad outputs (reject, retry, repair, escalate). Decode-time constraint pushes the cost to schema authorship up front and makes invalid outputs structurally impossible at the cost of one runtime feature dependency (grammar-constrained decoding). For high-throughput products with bounded output schemas, decode-time constraint dominates. For products with unbounded or free-form outputs, post-hoc verification is the only available move.

The atom is filed as a `sub-variant` of atom 0007 rather than a peer, with explicit `meta.audit_notes: refines 0007` per Khazīna's discipline. It is also explicitly flagged as drafted under threshold-clearance pressure during plan 6's validation: a single deployment (secproj) is not yet sufficient evidence of independent transferable structure. The strongest falsifier is a second deployment in a non-LLM-JSON domain (constrained code generation, typed tool-call synthesis); if the constraint principle transfers cleanly outside the LLM-JSON shape, the atom is real. If it doesn't, the atom collapses back into atom 0007's LLM-specific deployment.
