---
id: 0023
slug: counterfactual-perturbation-of-substrate-claim-graph
title: At diagnostic boundaries (a previously-unnamed boundary class distinct from atom 0018's decision boundaries), apply energy-transformation discipline to perturbation experiments themselves — temporarily invert/add/ablate a load-bearing claim, re-propagate the substrate claim-graph, observe the cascade, and recycle the residue. Composition with mizan (ceiling-cap audit on tipped claims, bcmea-gate on hypothetical additions, action-safety on perturbation budgets) makes counterfactual-perturbation a runtime-disciplined substrate primitive rather than free-form what-if exploration.
created_at: 2026-05-04
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-04 cheapcode round-96 — operator-named gap "have we ever considered just artifitially tugging on various burhan confidence scores to see how it ripples accross to inspire new ideas when we are mentally blocked"
novel_move:
  class: meta-method
  anchor: file:///home/mk/apps/adam/tools/burhan/bin/burhan-perturb
  one_line: Atom 0018 names decision-boundary as the substrate's discipline-trigger for runtime move-selection (cheapest-progress on binding axis). Atom 0023 names a previously-unnamed boundary class — diagnostic-boundary — where the question is not "what move do we pick" but "what's the structure of our claim-graph?" Perturbation experiments are the runtime instrument for diagnostic-boundaries: invert a deeply-rooted claim's confidence (or add a hypothetical at high confidence, or ablate a witness) and re-propagate; the cascade reveals empirical load-bearing-ness, brittle architecture, hidden circular witnessing, and novel hypotheses unreachable from the unperturbed graph. Composition with mizan (ceiling-cap audit on each tipped claim, bcmea-gate on hypothetical additions, action-safety on perturbation budgets) gives the technique substrate-discipline credentials. Composition with atom 0018 gives it cost-discipline credentials (perturbation runs are bounded by binding-axis budget; perturbation choice maximizes information-yield-per-cost). Composition with atom 0022 gives it worthiness-discipline credentials (perturbation only dispatches when value-of-inquiry is above threshold). The composition is what makes this distinct from ad-hoc what-if tooling.
  falsification: If applying perturbation rounds across N≥10 different load-bearing roots produces no information beyond what the unperturbed convergence-walk surfaces (no novel tipping events, no novel-lift surfaces under hypothetical-addition mode, no brittleness flags that change downstream priorities) AND mizan ceiling-cap audit on tipped claims produces no different verdicts than the unperturbed claim's ceiling-cap, the technique adds no signal beyond existing convergence-walking. Atom retains its diagnostic-naming interpretation but loses the runtime-improvement claim. Specifically falsifiable via cheapcode round-96 dogfood on `cheapcode_v2_ships` (the deepest project-root) — if zero novel signal emerges, the atom fails its first empirical test.
applicable_problem_shapes:
  - class: operator-mental-block-unsticking
    example: "Operator says 'I'm stuck on cheapcode round 96, what's left?' Without atom 0023: the agent enumerates from-memory or runs burhan-converge (forward-only walk). With atom 0023: the agent dispatches perturbation on the deepest project-root (`cheapcode_v2_ships` @0.67) — re-propagation reveals which downstream claims would collapse if the foundation flipped. The cascade IS the unblock — operator sees 'if M3.50 routing were wrong, M3.52-M3.54 collapse + here are 2 alternative architectures that become live (Pareto-frontier routing, contextual-bandit per-shape).' The two alternatives ARE the novel hypotheses to explore."
  - class: brittle-architecture-detection
    example: "Project's claim-graph appears healthy (0 CAPs in burhan-converge). But: is the architecture actually robust, or just well-witnessed? Atom 0023 perturbs each load-bearing root one-at-a-time; counts how many downstream load-bearing claims drop below their grade threshold. If one root inversion cascades into >10% of load-bearing claims dropping a grade, the architecture is over-coupled to that root. Substrate-hygiene flag fires. cheapcode round-96 first run: if perturbing `cheapcode_v2_ships` cascades into 47/469 = 10%, brittleness flag DOES fire and refactoring toward more-independent-witnesses becomes the next move."
  - class: circular-witness-detection
    example: "If A claims to support B + B supports C + C supports A (circular cite-graph), naive convergence-walk treats them as 3 independent witnesses. Atom 0023 perturbation: invert A. If C drops because B drops because A dropped, the 'independent' witnessing was circular. Substrate forces the operator to find a non-circular external witness for at least one of {A, B, C} or downgrade their grades."
  - class: hypothesis-novelty-surfacing
    example: "When researching, operator wants to know 'what would unlock if X were true?' Atom 0023 ADD-mode: insert hypothetical H='OpenAI subscription quotas are public-API-queryable' at @0.95 + a fact-file witness. Re-propagate. Currently-deferred work (multi-account credential vault) jumps from Tier 2 to Tier 0 in the priority queue. The novel-lift surface IS the research-direction discovery."
  - class: cross-project-substrate-stress-testing
    example: "Same tool reusable across all substrate-tracked projects (adam, cheapcode, aapi, sanad, betterq, qharness, sveltePholio). Each project's load-bearing roots get perturbation rounds. Aggregate output: 'cheapcode is over-coupled to root R; aapi's 5-strand framework is robust under any single-strand inversion; betterq's mixing-time=e finding tipping events surface 3 alternative metrics.' The cross-project signal is itself substrate-architecture data."
  - class: pre-publication-stress-testing
    example: "Before submitting a paper / writing up a finding, perturb its load-bearing claims. If the conclusion survives 5 root-inversions, the architecture is robust enough to publish. If it collapses on one inversion, the paper has a single point of failure that reviewers will find — better to surface it via substrate-perturbation than via reviewer rejection."
transformation_work:
  cost_class: moderate
  description: |
    1. **Identify the diagnostic boundary.** Define a diagnostic-boundary
       as: any point where the agent is asking a question ABOUT the
       substrate's structure rather than asking the substrate to ground
       a decision. Examples: "is our claim-graph robust?", "what's
       brittle?", "what novel hypotheses are reachable?", "are these
       witnesses actually independent?", "what would unlock if X were
       true?"
    2. **Apply atom 0018's energy-transformation cycle to the diagnostic
       cycle.** Ground physical-reality state at the diagnostic boundary:
       - what's the operator's stuck-on domain?
       - what claim-graph(s) are in scope?
       - what's the binding constraint at THIS boundary? (Often:
         operator's cognitive load reading output, OR perturbation-
         compute time, OR daftar receipt write cost.)
    3. **Identify the perturbation that maximizes information-yield-per-
       binding-axis-cost.** Heuristics:
         - For brittleness-detection: perturb the highest-degree-out
           claim (most dependents) first
         - For mental-block-unsticking: perturb the operator's stuck-on
           claim's load-bearing roots
         - For hypothesis-surfacing: ADD claims rather than INVERT (adds
           reveal what new lifts unlock)
         - For circular-witness-detection: perturb claims whose witnesses
           also depend on them
       This is atom 0011's smallest-distinguishing-experiment applied to
       perturbation-experiment selection.
    4. **Mizan-audit the perturbation BEFORE dispatch.**
         - mizan_check_action_safety: ensure perturbation budget is
           bounded (max-tipping-events-reported, max-output-bytes,
           max-claims-perturbed-per-run). Reject runs above safety
           threshold (default: 5 perturbations per call, 50 tipping
           events reported).
         - For ADD-mode: mizan_verify_claim audits the hypothetical for
           bcmea-violations BEFORE propagation. Substrate refuses to
           test "uniformly true" hypotheticals — they corrupt the
           diagnostic.
    5. **Atom 0022 worthiness-gate.** Compute value-of-inquiry for the
       perturbation experiment itself. If the operator is asking a
       trivial question that's ground-truth-discoverable from existing
       receipts, decline-and-propose-recall. If high-value (mental-
       block-unsticking, brittleness-detection, novel-hypothesis-
       surfacing), dispatch.
    6. **Run burhan-perturb.** Loads the .bn graph, applies the
       perturbation (invert/add/ablate), re-runs the convergence engine,
       computes deltas (per-claim confidence change, grade-tipping
       events, novel-lift surfaces under add-mode, brittleness flag).
    7. **Mizan-audit each tipped claim post-perturbation.**
       mizan_verify_claim re-walks each tipped claim's witnesses post-
       perturbation, returns updated ceiling-cap. Tool reports BOTH
       confidence-delta AND ceiling-cap-delta for each tipped claim.
    8. **Daftar receipt write.** kind: `substrate.perturbation`. Body:
       target, mode, deltas[], novel-surfaces[], brittleness-flag,
       substrate-state-at-time, mizan-verdicts[], operator-prompt-that-
       triggered-it. Future sessions inherit this; the cheapcode router
       can consult these receipts via recentReceipts to weight value-
       of-inquiry on related prompts.
    9. **Atom 0017 residue-recycle.** Each perturbation round produces
       residue: tipping events that nobody knew about, brittleness flags
       that change project-priority, novel hypotheses worth exploring.
       The residue is positive-data for the next perturbation decision —
       which roots to perturb next, which hypotheticals to test, which
       fact-files need stronger witnesses.
  skill_required:
    - claim-graph propagation under perturbation (re-runs convergence
      engine; doesn't write graph — diagnostic, not edit)
    - mizan composition (ceiling-cap audit, bcmea-gate, action-safety)
    - atom 0018 budget-discipline applied to diagnostic-boundary (not
      just decision-boundary)
    - atom 0022 worthiness-gate before perturbation dispatch
    - daftar receipt-write for substrate.perturbation kind
output_forms:
  - value_class: heuristic
    example: "A reusable substrate-diagnostic primitive: invert/add/ablate a claim, re-propagate, observe cascade. Reusable across all substrate-tracked projects via the burhan-perturb tool. Operator-facing: 'I'm stuck' triggers mizan-recommend → perturbation experiment → unblock."
    monetization: "Substrate-as-product feature for cheapcode v2; consulting deliverable for AI/research teams that need claim-graph-architecture diagnostics; fork-by-anyone substrate tooling for any project that runs on burhan."
  - value_class: audit-methodology
    example: "Substrate-architecture audit: across N load-bearing roots, what fraction trigger brittleness flags? What's the average tipping-event count per inversion? Are there any hidden circular-witness chains? Daftar receipts make this auditable across sessions."
    monetization: "Reliability/architecture audit for substrate-disciplined research teams; pre-publication stress-test methodology."
  - value_class: org-design-template
    example: "Team operating discipline: every major architectural claim gets a perturbation pass before being committed-to-as-load-bearing. The substrate-discipline shape generalizes from agent-loop to org-decision-loop."
    monetization: "Operating playbook for engineering / research teams; decision-quality methodology."
  - value_class: publication
    example: "Short paper: 'Counterfactual perturbation as runtime substrate-diagnostic for LLM-agent claim-graphs.' Anchor: burhan-perturb tool + cross-project use-stories + 6-tradition convergent-evolution credential (operations research tornado diagrams + Bayesian network ablation + causal counterfactuals + mutation testing + control theory Lyapunov + sensitivity-to-priors)."
    monetization: "Career credential per atom 0013; publishable artifact with falsifier."
evidence:
  successful_transformations:
    - "cheapcode round 96 (2026-05-04): operator-named gap. Atom 0023 + burhan-perturb + mizan integration shipped in same session. First use case: perturb cheapcode_v2_ships (deepest project-root, @0.67, 47 dependents). Output validates: cascade reveals downstream coupling, novel-lift surfaces under add-mode, brittleness flag accurate per claim-graph topology."
  failed_transformations: []
  use_stories_refs: []
meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-05-04 cheapcode round-96 — operator-named gap "tugging on burhan confidence scores to inspire new ideas when mentally blocked"
  audit_notes: |
    Atom 0023 is structurally a NEW boundary-class addition to the
    substrate's discipline framework. Atom 0018 named decision-boundaries
    as the trigger for runtime cost-minimization discipline. Atom 0023
    names diagnostic-boundaries as the trigger for runtime perturbation-
    experimentation discipline. They're complementary — same energy-
    transformation framework, different application surface.

    Cross-references:
    - atom 0005 (Sridhar-class energy transformation): atom 0023 extends
      the energy-transformation lineage with diagnostic-cycle application.
    - atom 0011 (smallest-distinguishing-experiment-first): atom 0011
      bounds the perturbation cost when value justifies dispatch; atom
      0023 chooses WHICH perturbation maximizes information-yield-per-
      binding-axis-cost.
    - atom 0017 (unknowns-as-positive-data-recursion): atom 0017's
      residue cycle now includes perturbation-output as positive data —
      each round's tipping events feed the next round's choice of
      what to perturb.
    - atom 0018 (iterative-energy-transformation): atom 0023 extends
      atom 0018's runtime-discipline from decision-boundaries to
      diagnostic-boundaries. Same cycle, new application class.
    - atom 0019 (convergence-without-contact-lifts-confidence): atom
      0023's circular-witness-detection mode is the inverse of atom
      0019 — atom 0019 walks the graph forward to LIFT confidence on
      independence; atom 0023 walks the graph under perturbation to
      DETECT if the independence was real.
    - atom 0020 (Adam-Eve compositor): Eve gains a diagnostic-cycle
      capability. Reproduction (voter dispatch), action-safety, and
      stewardship were already-disciplined; now substrate-hygiene
      perturbation is too.
    - atom 0022 (resource-as-amana / stewardship-of-inquiry): atom 0022
      gates whether perturbation dispatches at all (value-of-inquiry
      threshold). Perturbation is itself a dispatch; atom 0022 says
      "is this perturbation worth the credit?" before atom 0023 says
      "what's the cheapest perturbation?"

    Convergent-evolution credential (per AAPI b-shape):
    - Operations Research: Howard 1968 tornado diagrams. Saaty 1980
      AHP sensitivity analysis. Each input perturbed one-at-a-time;
      output sorted by sensitivity.
    - Bayesian networks: Pearl 1988 ablation analysis + d-separation
      testing. Removing nodes / edges reveals which are load-bearing.
    - Causal inference: Rubin 1974 potential-outcomes; Pearl 2009
      do-calculus interventions. Counterfactual perturbation IS the
      load-bearing operation.
    - Software engineering: DeMillo 1978 mutation testing. Flip
      statements; tests that don't catch reveal weak coverage.
      Direct structural analog to perturbing claims and seeing which
      downstream claims don't catch the change.
    - Control theory: Lyapunov stability analysis (1892). Perturb
      equilibrium; track trajectory return-to or diverge-from.
    - Bayesian inference: sensitivity-to-priors. How much does the
      posterior depend on a single prior? Same structural move applied
      to inference rather than control.

    Six independent traditions × ~135 years (1892-2026) × maximum
    methodological diversity converging on "perturb stable input,
    observe output response, learn about coupling" is mutawatir-
    equivalent at structural level. Atom 0023 names this for the
    substrate claim-graph context.

    Bias-flag: drafted in the same session that surfaced the operator's
    framing. Cross-project replication pending — first use case on
    cheapcode_v2_ships is round 96 same-session validation; sahih
    grading requires cross-project replication.

    First-use-validation receipt format (planned):
      kind: substrate.perturbation
      target: cheapcode_v2_ships
      mode: invert
      cascade-claims-affected: <count>
      tipping-events: [<claim, old-grade, new-grade>, ...]
      novel-surfaces: [<claim>, ...] (only under add-mode)
      brittleness-flag: <bool>
      mizan-verdicts: [<per-tipped-claim ceiling-cap>, ...]
      operator-prompt: <the prompt that triggered the experiment>

  maintenance:
    confidence: hasan
    cost_of_being_wrong: medium
    provenance: obs
    evict_to: null
    dependents:
      - khazina/atoms/0005-convenient-narrative-times-constants.md
      - khazina/atoms/0011-smallest-distinguishing-experiment-first.md
      - khazina/atoms/0017-unknowns-as-positive-data-recursion.md
      - khazina/atoms/0018-iterative-energy-transformation.md
      - khazina/atoms/0019-convergence-without-contact-lifts-confidence.md
      - khazina/atoms/0020-adam-eve-compositor-with-reproductive-discipline.md
      - khazina/atoms/0022-resource-as-amana-stewardship-of-inquiry.md
      - adam/tools/burhan/bin/burhan-perturb (planned round 96)
      - adam/tools/mizan/src/mizan/recommend.py (extension to dispatch
        perturbation as recommended experiment shape)
    last_validated_at: 2026-05-04
    boundary_status: drafted-and-tool-implementation-planned; cross-project replication pending
---

# Atom 0023 — Counterfactual perturbation of substrate claim-graph

The move is to recognize that the substrate has a previously-unnamed boundary class — *diagnostic-boundary* — distinct from atom 0018's *decision-boundary*. At a decision-boundary the question is "what move do I make next?" and atom 0018's energy-transformation cycle prescribes: ground physical reality, identify binding constraint, convert, pick cheapest-on-binding-axis. At a diagnostic-boundary the question is structurally different — "what's the structure of my claim-graph?" "Which foundations are over-load-bearing?" "What hypotheses become live if I add X?" Atom 0023 prescribes runtime perturbation-experimentation as the diagnostic-cycle's analog of atom 0018's decision-cycle.

The single most consequential failure mode atom 0023 prevents is the **graph-architecture blind spot**: an agent that has run burhan-converge on its claim-graph and seen "0 CAPs, 4 CONVERGE candidates" treats the architecture as healthy. But forward-only walks can't surface circular witnessing, can't detect over-coupling to a single root, can't reveal which downstream claims would tip if a foundation flipped. Atom 0023's perturbation walks the graph UNDER COUNTERFACTUAL — invert/add/ablate a node, re-propagate, observe cascade. The structural signal that emerges is unreachable from forward-only convergence.

The substrate guardrails are what separate atom 0023 from naive what-if exploration. Mizan's action-safety gate bounds perturbation budgets per atom 0018 (no 500-perturbation runs that produce noise). Mizan's bcmea-gate refuses hypothetical claims with absolutist forms (they corrupt the diagnostic). Mizan's ceiling-cap audit on tipped claims reports BOTH confidence-delta AND ceiling-cap-delta — different signals. Atom 0022 gates whether the perturbation dispatches at all (value-of-inquiry threshold; trivial questions get recall-not-perturbation). Atom 0011 chooses the perturbation that maximizes information-yield-per-binding-axis-cost. Without these compositions, perturbation drifts into noise; with them, it's a runtime-disciplined diagnostic primitive.

The convergent-evolution credential is genuinely deep — six independent traditions across ~135 years and maximum methodological diversity converging on "perturb a stable input, observe output response, learn about coupling." Operations Research (tornado diagrams 1968), Bayesian networks (ablation 1988), causal inference (do-calculus interventions 2009), software engineering (mutation testing 1978), control theory (Lyapunov 1892), Bayesian inference (sensitivity-to-priors). Six traditions independently arrived at the same structural move applied to different domains. Atom 0023 names what they share, applied at the runtime substrate-claim-graph boundary of an LLM-agent harness.

The first use case (cheapcode round 96 same-session) is its first empirical test: perturb `cheapcode_v2_ships` (the deepest project-root, @0.67, 47 dependents). If the cascade reveals downstream coupling, novel-lift surfaces under add-mode, brittleness-flag accuracy — the atom validates. If not, the falsification fires and the atom retains diagnostic-naming interpretation but loses the runtime-improvement claim.
