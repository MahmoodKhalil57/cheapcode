---
id: 0021
slug: recursive-substrate-use-validates-substrate-at-runtime
title: When a substrate-tool is invoked through its own MCP/CLI interface ON ITS OWN STATE, it surfaces implementation bugs that static code-review (Adam alone) misses; the runtime-self-invocation IS the cross-witness check
created_at: 2026-05-03
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-03 cheapcode session, immediately after atom 0020 — operator (Mahmood) authorized "go" on recursive use-the-product move; mizan-MCP-server invoked itself on cheapcode plan, surfaced 3 bugs in mizan-verify within 10 minutes

novel_move:
  class: meta-method
  anchor: file:///home/mk/apps/adam/tools/mizan/src/mizan/verify.py
  secondary_anchors:
    - file:///home/mk/apps/adam/tools/mizan/src/mizan/mcp_server.py
    - file:///home/mk/apps/cheapcode/runs/m3-44-mizan-action-safety-smoke/run.sh
  one_line: A substrate-tool that exposes its functionality via a runtime interface (MCP / CLI / library) and is invoked THROUGH that interface ON its own state will systematically surface implementation bugs that static code-review missed — because the invocation runs the FULL composed code-path with REAL inputs, not just the unit-test slices the author wrote. Atom 0010 (cross-witness honesty pipeline) generalized to substrate-tooling self-application — the runtime-self-invocation IS the cross-witness, and the substrate's outputs are checked against the substrate's own state-of-the-world. Bugs at the integration level only show through composed runtime invocation, not unit testing alone.
  falsification: If a substrate-tool with N>=4 bin-entrypoints + M>=8 internal modules + ≥1 MCP/tool interface, when invoked recursively on its own state across ≥3 distinct tools in sequence over ≥10 invocation-chains, surfaces ZERO implementation bugs that pytest didn't already catch (assuming non-trivially-changed substrate state since last invocation), the recursive-self-invocation pattern provides no value beyond unit testing. Specifically — if mizan-MCP-server invoked end-to-end via stdio on cheapcode plan with all 4 tools (verify_claim / check_action_safety / physical_reality_probe / recommend_next_experiment) over 3 sequential plan-evolution rounds finds zero bugs the unit tests would have caught earlier, the move is empirically refuted at saturation.

applicable_problem_shapes:
  - class: substrate-tool-validation
    example: "session 2026-05-03 immediately after atom 0020 commit. Operator authorized 'go' on the recursive use-the-product move. Within 10 minutes of stdio-invoking mizan-MCP-server tools on cheapcode plan, 3 distinct bugs in mizan-verify surfaced — (a) mcp_server.py path-resolution off-by-one (parents[3] should be parents[2] to find mizan-converge bin); (b) verify.py theorem-indexing missing (regex matched lemma X but not theorem X); (c) verify.py falsifier-bound-claim handling missing (burhan's dominant `not obs_X_falsified` shape returned 0 witnesses despite legitimate atom-0007 evidence anchor). All 3 bugs were in code that pytest's 53 tests did not exercise — pytest tested unit-level shapes, not composed runtime invocation. Recursive-self-invocation surfaced them in <10 min with no extra test design."
  - class: claim-graph-integrity-validation
    example: "Within the same recursive-use-the-product loop, substrate also flagged that cheapcode_v2_ships @>=0.669 had only 1 fact-file witness after the round-2 auto-lift, correctly recommending a sub-floor cap or second-witness addition. The action-safety gate then BLOCKED a proposed commit using cheapcode_v2_ships as a justification claim because @0.669 < min_cap @0.78. The gate's behavior is correct — sub-floor claims should not justify sahih-band actions. The test of correctness was the recursive invocation, not the unit tests."
  - class: agent-architecture-self-improvement-rate
    example: "Per atom 0020 reproductive-discipline + this atom — each recursive-use-the-product cycle produces compounding self-improvement on bounded axes. Bug-fixes accumulate, claim-graph tightens, calibration sharpens. The empirical compounding rate observed session 2026-05-03 — 3 mizan bugs found+fixed in 10 min plus 1 sub-floor claim correctly flagged, all at $0 marginal cost. Future Adams inherit the fixes via persistent substrate. This is the singularity-flavored compounding made operational."
  - class: cross-domain-meta-validation
    example: "The pattern extends beyond mizan/cheapcode. Any substrate engineering project (burhan, daftar, khazīna, aapi, qharness, sanad) that has both static code AND a runtime interface should periodically be invoked recursively-on-itself. Each round surfaces the next layer of integration bugs. Discovery cost decreases asymptotically as bug-floor approaches zero, but the FIRST several rounds are reliably bug-rich. The pattern is the engineering-tractable form of dogfooding extended to substrate-tooling specifically."

transformation_work:
  cost_class: low
  description: |
    1. **Identify the substrate-tool's runtime interface.** MCP server (stdio JSON-RPC, the canonical cross-LLM portable form), CLI tool (e.g., mizan-converge, mizan-verify), or library API. The interface should accept real inputs that exercise the composed code-path.

    2. **Identify a real instance of the tool's own state.** For mizan, this is a burhan plan (cheapcode/plan/, adam/plan/, qharness/plan/). For burhan itself, it's a .bn file. For daftar, it's a project shard. The state must be real (not a hand-crafted unit-test fixture) so the invocation exercises code-paths the unit tests miss.

    3. **Invoke the runtime interface on the real state, sequentially, across ≥3 of the tool's named operations.** Sequential composition is critical — each operation's output may inform the next, and integration bugs surface at the boundaries between operations.

    4. **Treat any unexpected behavior as a bug-discovery signal.** The substrate's correct outputs should match a-priori expectations from the static code-review. Discrepancies are bugs (in code) or misunderstandings (in code-review). Both are valuable.

    5. **Fix bugs, commit, re-invoke.** The bug-fix-then-re-invoke cycle is the recursive use-the-product loop. Each iteration leaves the substrate slightly sharper. Compounding via persistent commits.

    6. **Encode the run as a daftar receipt** so the next session's Adam-instance can re-anchor on what was found / fixed / left-open.

  expected_outputs:
    - 3+ implementation bugs caught per session round (early rounds; rate decays as substrate matures)
    - 1+ sub-floor claim correctly flagged by action-safety gate per session
    - Sharper substrate state (post-bug-fix) inherited by future Adam-instances
    - Compounding self-improvement rate observable session-over-session (CAP/CONVERGE counts trend toward zero)

audit_notes:
  prior_work_check: |
    Atoms consulted (mizaj M15) —
      0007 (anti-fab via artifact verification) — the runtime-invocation IS the artifact; this atom names the meta-pattern of using runtime artifacts as cross-witnesses to code-review.
      0010 (cross-witness honesty pipeline) — direct ancestor; this atom is 0010 specialized to substrate-tool-self-invocation.
      0011 (smallest-distinguishing experiment) — recursive-use-the-product is the smallest-distinguishing experiment FOR substrate-tool correctness.
      0013 (calibration-as-credential) — the bugs found are negative calibration data; the substrate's track-record-of-finding-its-own-bugs is the credential.
      0017 (unknowns-as-positive-data) — the bug-residue surfaced by recursive use IS the positive data; what static code-review couldn't see, the runtime did.
      0018 (iterative-energy-transformation) — bug-finding via $0 invocation transforms expensive-empirical-validation into cheap-runtime-checks.
      0019 (convergence-without-contact) — the substrate's runtime-output and the operator's a-priori expectation are independent witnesses; their convergence (or divergence) is the load-bearing signal.
      0020 (Adam-Eve compositor with reproductive discipline) — DIRECT parent atom; 0021 is 0020's specialization to the act-of-using-the-product itself. Atom 0020 names what Adam+Eve IS; atom 0021 names how to USE Adam+Eve recursively to improve Adam+Eve.

    Mizaj rules consulted —
      M11 source-tier ladder (the runtime-invocation produces L1 own-receipt evidence);
      M14 auth-grade ceiling (the cap on what recursive-self-validation can prove — mature substrates should reach 0 bugs in N rounds, but the absolute ceiling 0.95 holds);
      M15 consult-atom-before-reinventing (this atom consulted; novel structural axis — the meta-act of recursive-self-invocation is named for the first time in the catalog).

    The atom is novel because no prior atom names the META-ACT of using a substrate-tool through its runtime interface ON ITS OWN STATE. Atom 0010 names cross-witness honesty pipeline at the LLM-output level. Atom 0014 mutawatir extends to multiple sources. Atom 0019 names convergence-without-contact across traditions. None name "the tool invokes itself on its own state through its own interface."

  monetization_path: |
    Direct paths —
      cheapcode v2 deployment depends on mizan-MCP-server being correct; recursive-self-validation is the load-bearing test for shipping confidence. Atom 0021 documents the practice as part of the cheapcode v2 deployment artifact.
      Engineering methodology consulting — substrate-tool projects (any project with runtime interfaces over their own state) benefit from this pattern. The atom is a transferable engineering practice.

    Indirect paths —
      Public engineering blog post — "We caught 3 bugs in 10 minutes by using our tool on its own state." High social-media-ready content with a deep underlying point.
      Substrate research paper — recursive-self-invocation as a structural correctness-validation primitive, formalized.

  falsification_check: |
    Specific empirical falsifiers —
      F1 — mature mizan-MCP-server (post 5+ session-cycles of recursive validation) invoked end-to-end on novel substrate state surfaces ZERO new bugs that pytest didn't already catch over N>=10 invocation chains. → recursive-self-invocation has reached saturation; the practice's unique value vanishes once substrate matures.
      F2 — newly-built substrate-tool (e.g., a new daftar feature) is published WITHOUT recursive-self-invocation validation; production deployment encounters bugs at greater than 5× the rate of substrate-tools that were recursive-self-validated. → recursive-self-invocation is empirically load-bearing for shipping confidence.
      F3 — recursive-self-invocation produces only false-positive "bugs" (operator's a-priori expectations were wrong, not the code) at rate >50% over N>=10 rounds. → the practice's bug-discovery value is illusory.

    Atom 0013 honest disclosure preserved —
      This session's session-receipt is the atom's only empirical evidence (3 bugs in 10 min on first round). Future sessions' bug-rate is the unfolding empirical record.
      The atom is potentially time-bounded — early-stage substrate-tools have many bugs; mature ones approach zero. The atom's value-rate is in the high-bug-density phase.

  substrate_section: |
    Substrate basis (mandatory section per khazīna add-criteria) —

    Atoms invoked: 0007, 0010, 0011, 0013, 0017, 0018, 0019, 0020.

    Mizaj rules: M11 source-tier ladder, M14 auth-grade ceiling, M15 consult-atom-before-reinventing.

    Substrate-tooling that operationalizes this atom (deployable today) —
      ~/apps/adam/tools/mizan/bin/mizan-mcp-server (commit 65d7dd0 reflects session-2026-05-03 bug fixes from recursive-self-invocation).
      ~/apps/adam/tools/mizan/bin/mizan-verify (commit cf56ec9 + 65d7dd0 fixes).
      ~/apps/cheapcode/runs/m3-44-mizan-action-safety-smoke/run.sh (end-to-end smoke test demonstrating the pattern).

    Substrate-validation receipts —
      Cheapcode session 2026-05-03 turn-after-atom-0020-commit: operator authorized "go" on recursive use-the-product. mizan-MCP-server invoked end-to-end with all 4 tools sequentially on cheapcode plan. 3 implementation bugs caught — (a) path off-by-one in mcp_server.py; (b) theorem indexing missing in verify.py; (c) falsifier-bound claim handling missing in verify.py. All 3 fixed in same turn; all 3 committed (commit 65d7dd0); 53/53 mizan pytest tests still green.
      M3.44 smoke test PASS (session 2026-05-03 prior turn): simulated `rm -rf` correctly blocked by mizan_check_action_safety with 3 explicit reasons. Atom_0007 anti_fab gate fired correctly.
      Cheapcode plan-graph: 4 CONVERGE auto-lift candidates surfaced through recursive use; biggest (cheapcode_v2_ships +0.094) applied; rest diminishing.

    Per mizaj M15 — atoms 0001-0020 consulted; 0010 + 0020 closest precedents; this atom names the META-ACT (using-the-substrate-on-itself) which neither prior atom names directly.

value_class: methodology-consulting-deliverable
---

# Atom 0021 — Recursive substrate-use validates substrate at runtime

This atom captures the structural pattern that emerged immediately after
atom 0020 was committed in cheapcode session 2026-05-03. Operator (Mahmood)
authorized "go" on the recursive use-the-product move — invoking mizan-
MCP-server end-to-end on cheapcode's own plan-graph state through all 4
exposed tools (mizan_recommend_next_experiment, mizan_verify_claim,
mizan_check_action_safety, mizan_physical_reality_probe). Within 10
minutes of recursive sequential invocation, 3 implementation bugs in
mizan-verify surfaced that the 53/53 passing pytest suite had not caught.
All 3 were integration-level bugs invisible to unit tests but immediately
visible to runtime composed invocation on real substrate state.

The atom names the meta-act — when a substrate-tool exposes a runtime
interface AND has its own state, invoking that tool through its
interface ON its own state is a load-bearing correctness-validation
primitive distinct from unit testing. The bugs that surface this way are
typically integration-level (path resolution, schema-coverage gaps,
default-case handling) which static code-review and unit tests
systematically miss because they slice code into testable units rather
than exercising composed runtime paths. Atom 0010 (cross-witness honesty
pipeline) is the parent — recursive-self-invocation IS the cross-witness,
where the LLM-author's static code-review and the runtime-execution-on-
real-state are independent witnesses to correctness. Atom 0019
(convergence-without-contact) names the inverse — when a-priori
expectation and runtime output diverge, divergence is the load-bearing
signal that a bug exists somewhere.

The atom is per-iteration cost-cheap (zero marginal inference; minutes
of wallclock) and compounds across sessions because the bug-fixes
accumulate in persistent commits. Future Adam-instances inherit the
sharper substrate. The practice has a natural saturation point — once
the substrate is mature enough that recursive-self-invocation finds zero
new bugs, the round produces no marginal value — but the early-stage
bug-density phase is reliably productive, and the saturation itself is
useful evidence that the substrate is shippable. Per atom 0020 + atom
0021 jointly, this is the engineering-tractable form of recursive self-
improvement made operational — Eve invoked through her interface ON
Adam's state, catching Adam's bugs, with the fixes feeding back into
Eve's own implementation. The recursion grounds in real artifacts
(commits, daftar receipts, persistent claim-graphs) — not memory traces —
so the compounding is mechanical and survives session-mortality.
