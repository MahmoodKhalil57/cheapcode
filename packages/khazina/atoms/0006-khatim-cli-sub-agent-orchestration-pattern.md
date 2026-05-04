---
id: 0006
slug: khatim-cli-sub-agent-orchestration-pattern
title: Operator-orchestrator plus cheap sub-agents as bounded implementation workers
created_at: 2026-04-28
created_by: claude-opus-4-7-1m
created_in_session: 2026-04-28 Khazīna atom survey across Sanad/Khātim/Bāb/AAPI

novel_move:
  seed: |
    Keep judgment, review, and verification local to the orchestrator.
    Dispatch bounded mechanical work to cheap sub-agents under a written design contract.
    Verify with real tests, not self-reports.
  class: meta-method
  anchor: memory://feedback_khatim_subagent_orchestration_pattern.md
  one_line: Keep the load-bearing judgment, review, and verification local to the orchestrator, while dispatching bounded mechanical implementation work to cheap sub-agents under a written design contract. The pattern works only if the orchestrator plans first, caps parallelism, accepts silent-fail modes, and verifies with the real test suite rather than the agent's self-report.
  falsification: If the same delegation pattern repeatedly succeeds without a written contract, without local review, or without the orchestrator verifying with actual tests — and the documented failure modes do not recur — then this is not a distinct operational pattern but just ordinary outsourcing.

applicable_problem_shapes:
  - class: delegation-workflow
    example: "A multi-file software change where design judgment is concentrated in one lead, but file-level edits and test additions can be offloaded to helpers."
  - class: swarm-operations
    example: "Coordinate multiple cheap workers on a bounded contract while preserving a single reviewer-of-record and a single verification step."

transformation_work:
  cost_class: moderate
  description: |
    1. Write a design contract that pins file targets, interfaces, test cases, and explicit out-of-scope items.
    2. Dispatch only bounded mechanical work to sub-agents; keep hot-path coordination and async orchestration local.
    3. Cap concurrency at two parallel sub-agents per account pair, and finish file edits before long-running dispatches when SSE disruption is likely.
    4. Treat silent failure as a first-class mode: retry narrowly, or escalate the specific task to a stronger model, instead of blanket-retrying the swarm.
    5. Verify by running the real test suite or smoke test yourself.
    6. Promote the result only when the implementation and verification both survive local review.
  skill_required:
    - design-contract writing
    - review discipline
    - orchestration judgment

output_forms:
  - value_class: org-design-template
    example: "An internal operating playbook for routing work between a lead engineer and cheap implementation assistants."
    monetization: training engagements, operating-playbook licensing, consulting retainer
  - value_class: consulting-deliverable
    example: "A delivery process for teams that need more throughput without surrendering design control."
    monetization: paid implementation engagement
  - value_class: heuristic
    example: "A rule of thumb: delegate the edit, not the judgment; verify the artifact, not the promise."
    monetization: indirect productivity gain

evidence:
  successful_transformations:
    - "Sanad M7.2 and the surrounding M3.12-M3.15 sequence: the orchestrator delegated bounded mechanical work to Khātim sub-agents and then verified locally."
    - "The feedback note itself: the pattern was validated end-to-end across multiple milestones and explicitly called out the failure modes."
    - "The r99-r106 substrate work kept the load-bearing notebook design local and simple enough to ship in r106, with project-sharded SQLite and hard-capped recall instead of prematurely complicating the hot path; that matches the atom's 'keep judgment local, cap complexity, verify the real slice' discipline (`/tmp/r106-daftar-r1.txt`:31-48, 105-120)."
  failed_transformations:
    - "Parallel dispatch beyond the documented limit produced silent failures instead of reliable throughput."
    - "Open-ended cross-repo investigations often failed silently unless the prompt was chunked narrowly."
    - "The r107 session summary records a substrate-round failure mode in the same family: a parallel-dispatch concurrency hypothesis around SQLite/WAL did not survive contact with the actual notebook problem, and the shipping path in r106 was simpler sequential/project-sharded execution instead (`/tmp/r107-khazina-update.txt`:4-10, `/tmp/r106-daftar-r1.txt`:43-47)."
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-04-27/2026-04-28 Khātim-Sanad swarm validation and feedback capture
  audit_notes: |
    This is project-local but not project-bound: the structural lesson is
    reusable anywhere an orchestrator can separate judgment from mechanical
    implementation. The monetization path is plausible as an operating
    playbook / consulting workflow, so it clears the Khazīna scope gate.
    Re-audit if future work shows the pattern is only useful for the
    Khātim/Sanad stack rather than broadly transferable.
---

# Atom 0006 — Operator-orchestrator plus cheap sub-agents

The load-bearing move is not “use sub-agents” in the abstract. It is the division of labor: one competent orchestrator keeps the design contract, the review standard, and the verification step local, while the cheaper agents do the bounded edits that can be described in advance. That is why the feedback note is valuable: it doesn’t just celebrate throughput, it names the conditions under which throughput remains honest.

The failure modes are part of the atom. If concurrency rises too high, or if the prompt is too open-ended, the swarm silently fails instead of producing a clean error. If the file-edit reloads cut the SSE stream, the right response is not “retry forever,” but “tighten scope, slow down, or move the load-bearing edit back to the orchestrator.” The pattern therefore includes negative knowledge: the delegation layer is only safe when the lead still owns the judgment and the final test.

This is distinct from ordinary outsourcing or generic “divide and conquer.” The novelty is the explicit orchestration contract: plan first, dispatch mechanically, cap parallelism, accept silent-fail as a diagnostic signal, and verify with the real suite. That makes the move reusable as an operating playbook for other teams that want more throughput without turning the lead into a rubber stamp.
