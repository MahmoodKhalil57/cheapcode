---
id: 0018
slug: iterative-energy-transformation
title: At each decision boundary, ground physical-reality state, identify the binding constraint, convert other constraints to that axis using grounded conversion factors, and pick the move that progresses toward the goal at minimum cost on the binding axis (extends atom 0005 from one-shot to iterative-runtime)
created_at: 2026-05-03
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-03 cheapcode M3.33 — operator-set goal "physical-reality grounding + energy-transformation runtime form" + Statistics.md historical lineage
novel_move:
  class: meta-method
  anchor: file:///home/mk/apps/cheapcode/tools/reality-check.ts
  one_line: Atom 0005 (Sridhar-class energy transformation) prescribes a one-shot move — start with the convenient narrative, identify the constants, recursively reshape until the narrative lands on transformable energy. Atom 0018 prescribes the runtime-iterative form: at every decision boundary (every milestone, every method choice, every research-vs-experiment fork), invoke a physical-reality probe (mechanical, not from memory) producing a structured measurement of current state (wall time, spend, disk, recent activity); identify the BINDING constraint (the axis closest to its budget cap); use grounded conversion factors (e.g., "research minutes are ~10-100× cheaper than experiment-dollars+wall-time") to convert other constraints to the binding axis; pick the move that progresses toward the goal at minimum cost on that axis. The asymmetry — measure first, decide second — is what separates this from naive narrative-reshape.
  falsification: If applying the cycle on N≥3 decision-boundaries fails to produce strictly better next-move-selection than naive default (no budget-awareness, no constraint conversion), AND the physical-reality probe step did NOT surface any measurement that changed the next-move decision, then the move is wrong on those decision shapes. Atom retains its discipline interpretation but loses the runtime-improvement claim. Specifically falsifiable: the reality-check probe output goes unused (claim still made from memory) OR the conversion factors used do not reflect grounded reality (e.g., agent claims "research takes 5 min" without checking actual wall time after).
applicable_problem_shapes:
  - class: agentic-loop-decision-boundaries
    example: "An LLM agent inside an opencode-like harness reaches a decision point: should I run an experiment or do research first? Atom 0018 prescribes: invoke reality-check (current wall time, recent commits, recent spend); compute conversion factors (research minutes vs experiment dollars+time); the cheaper-axis move wins. cheapcode M3.33 implementation: tools/reality-check.ts emits structured JSON; agent grounds the choice in the measurement, not in memory. Operator's specific framing: 'internet research is astronomically cheaper than running complicated tests especially when you have a strong grasp over time'."
  - class: research-vs-experiment-tradeoff
    example: "When the substrate prescribes a 'smallest distinguishing experiment' (atom 0011), atom 0018 prescribes checking first whether the question is research-answerable (mizaj 16 research-as-experiment-equivalent applies). With grounded time-awareness from a reality-check probe, the conversion factor becomes explicit: targeted research query = ~3-5 min wall, ~\$0 spend; small experiment = ~30-90 min wall, \$0.05-0.50 spend. The 10-100× cost asymmetry only becomes load-bearing when the agent KNOWS the wall time it has left, not just guesses."
  - class: project-management-budget-conversion
    example: "Agile estimation, CPM/PERT critical-path methods (DuPont 1957), simulated-annealing budget-decay heuristics, RL discount-factor tuning. All are atom 0018 in different domains: at each decision, ground physical state (time/budget remaining), identify the binding constraint, convert others to it, optimize. Statistical lineage: same shape as Halley's life-table for insurance pricing 1693 — observed mortality data → conversion factor (life expectancy → fair annuity premium) → decision support."
  - class: scientific-experimental-budgeting
    example: "Fisher's randomized-controlled-experiment design (Rothamstead 1920s) per Statistics.md: the discipline of extracting maximum information per limited experimental plot. Atom 0018 generalizes: maximum information per limited budget on whichever axis is binding (plots, dollars, wall time, compute hours). The binding-axis identification is the structural move."
transformation_work:
  cost_class: moderate
  description: |
    1. **Detect decision boundary.** Define a decision boundary as: any
       point where the agent must choose between materially different
       next-moves (research vs experiment, ship vs iterate, dispatch model
       A vs B, accept claim at confidence X vs require N≥k more evidence).
    2. **Invoke physical-reality probe.** Mechanical, not from memory.
       For cheapcode-fork: `bun tools/reality-check.ts --json`. Output:
       structured JSON with wall time, ms-since-last-commit, ms-since-
       last-snapshot, recent commits 24h, daftar entries 24h, disk free.
       For other projects: equivalent probe that returns measurable state.
    3. **Identify the binding constraint.** Compute remaining budget per
       axis (wall-time-cap, $-spend-cap, token-emission-cap, attention-
       cap-of-operator). The axis closest to its cap (in % terms) is the
       binding constraint.
    4. **Convert other constraints to binding-axis units.** Use grounded
       conversion factors — empirically observed from prior cycles, not
       guessed. Query the LIVING estimator (cheapcode/tools/conversion-
       factors.ts, M3.34) which computes median + IQR over an append-
       only JSONL log of observations. Multi-dimensional filtering:
       (agent_id × scope_tags × category) → estimate. The estimator
       converges on true values as observations accumulate (Bernoulli's
       law of large numbers, 1713) and surfaces drift via atom 0015
       firing when 3+ recent observations are ≥2× cached median.
       Initial seed (cheapcode M3.x bootstrap; subject to convergence):
         - 1 targeted research query = ~3-5 min wall, ~\$0 spend
         - 1 small experiment = ~5-10 min wall, ~\$0.04-0.08 spend
           (post-bootstrap median 7.3m, p25-p75 5.8-8.6m, cost \$0.046-0.083)
         - 1 substrate primitive add (M18-disciplined) = ~1.5h wall,
           \$0 spend (post-bootstrap median 1.5h, IQR 1.4-1.5h)
         - 1 large dogfood probe (N≥10) = ~1-3 hours wall, \$0.50-3.00
       The conversion factor IS the energy-transformation step from atom
       0005 — converting "convenient narrative" energy to "transformable
       runtime budget." Multi-dim is required because agent identity
       (claude-opus-4.7 vs gpt-5 vs newer model) gives different cost
       profiles AND scope (aime-math vs knowledge-synthesis) further
       differentiates within agent.
    5. **Pick the move minimizing binding-axis cost.** Subject to
       progress-toward-goal constraint (otherwise trivially-cheap = do
       nothing). The discipline asymmetry: prefer research over
       experiment when binding axis is wall-time or $-spend (10-100×
       cheaper); prefer experiment over research only when the question
       is genuinely not research-answerable (mizaj 16 cap).
    6. **Update conversion factors after the move.** Each cycle produces
       new empirical data on actual cost vs predicted cost — the agent's
       internal conversion table improves over time. Atom 0017 byproduct-
       recursion applied to the conversion-factor table itself.
    7. **Substrate guardrails.** Mizaj 19 (ground physical reality) is the
       trigger; atom 0011 bounds experiment cost when the binding axis
       supports an experiment; atom 0015 fires when conversion factors
       drift from grounded reality (transfer-overstated on cost
       estimation).
  skill_required:
    - mechanical-physical-reality-probing (no memory-based estimates)
    - constraint-budget tracking with %-of-cap arithmetic
    - empirical conversion factors derived from prior cycles
    - mizaj 19 + atom 0017 + atom 0011 composition
output_forms:
  - value_class: heuristic
    example: "A reusable decision-boundary primitive for any LLM agent loop: invoke physical-reality probe, identify binding constraint, convert others, pick cheapest-on-binding-axis move. cheapcode-fork implementation: tools/reality-check.ts + mizaj 19 binding rule. Generalizable to any agent harness."
    monetization: "Substrate-as-product feature for cheapcode v1.x; consulting deliverable for AI-engineering teams running long agent-loop sessions; substrate-discipline component in any tool that needs to operate under multi-axis constraints (deadline + budget + compute)."
  - value_class: audit-methodology
    example: "Decision-boundary audit: did the agent invoke reality-check before this decision? Did it identify the binding constraint? Did the chosen move minimize cost on that axis? Outputs: 'reality-grounded YES' or 'reality-grounded NO + claim-from-memory' or 'reality-grounded YES but conversion-factor stale (atom 0015 fires).'"
    monetization: "Reliability QA for AI-deployment teams; post-mortem methodology for decision failures."
  - value_class: org-design-template
    example: "Team operating discipline: every 'should we run an experiment or research?' decision gets a reality-check probe + binding-constraint identification + conversion-factor lookup. Compiles to runtime artifact (the probe outputs become an audit trail of all decision-boundary states + chosen moves)."
    monetization: "Operating playbook for engineering teams; decision-quality methodology."
  - value_class: publication
    example: "Short paper: 'Iterative energy transformation as runtime discipline for bounded-search LLM agents.' Anchor with cheapcode M3.33 dogfood + the Statistics.md historical lineage (Babylonian grain inventory → Halley life table → Fisher RCT → modern agent harnesses, all instances of physical-reality-grounding-before-inference)."
    monetization: "Career credential per atom 0013 (calibration-as-credential); publishable artifact with falsifier."
evidence:
  successful_transformations:
    - "cheapcode M3.33 (2026-05-03): operator identified the gap — substrate had no physical-reality grounding, LLMs are bad with time. Built tools/reality-check.ts under M18 discipline (5 burhan claims, 12 tests, 100% func coverage). The tool mechanically forces physical-reality visibility at decision boundaries. First implementation of the runtime-iterative form of atom 0005."
    - "cheapcode M3.34 (2026-05-03): operator identified that the static conversion-factor table in CLAUDE.md cannot converge on true values; needs to be a living, multi-dimensional estimator. Built tools/conversion-factors.ts under M18 discipline (8 burhan claims, 26 tests, 93% func coverage). Multi-dim filter: agent_id × scope_tags × category. Bootstrap seeded with M3.x grounded observations. Statistical method: median + IQR (Florence Nightingale 1854 robustness). Drift detection per atom 0015 (2× threshold over 3+ recent observations). Bernoulli's law of large numbers (1713) gives the convergence-as-N-grows guarantee. Agent-intuitive API: quickEstimate(category) one-liner with env defaults; CLI subcommands list/estimate/record/help self-document. This commit is the conversion-factor-table portion of atom 0018 made fully runtime, not just documentation."
    - "Statistics.md historical anchor (read 2026-05-03): every successful statistical practice in 3,800 years has started with physical-reality grounding before inference. Babylonian grain inventories on clay tablets ~3800 BCE; Roman census every 5 years; John Graunt's life tables in London coffee houses 1662; Halley's Breslau mortality data 1693; Florence Nightingale's Crimean hospital death counts 1854; Fisher's Rothamstead crop-yield-per-plot 1920s. Atom 0018 names the discipline these instances share: ground reality, identify binding constraint, convert, decide. The convergent-evolution credential is 3,800 years of human practice across statesmanship, insurance, agriculture, public health, and experimental science."
  failed_transformations: []
  use_stories_refs: []
meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-05-03 cheapcode M3.33 — operator-named gap "substrate has no way to assess physical reality of things, llms in general are terrible with time"
  audit_notes: |
    Drafted-and-implementation-validated within one session × one project.
    Successful_transformations are 2 instances (cheapcode M3.33 + 3,800-year
    statistical lineage as historical-empirical anchor). The runtime claim
    that "agents using this cycle pick strictly better next-moves than
    naive default" is not yet falsified — needs cross-project replication.

    The atom is structurally distinct from but COMPLEMENTARY TO atoms it
    composes:
    - atom 0005 (Sridhar-class energy transformation): atom 0005 is the
      one-shot discovery move. Atom 0018 is the runtime-iterative form.
    - atom 0011 (smallest-distinguishing-experiment-first): atom 0011
      bounds the experiment cost when the binding axis supports an
      experiment. Atom 0018 chooses between experiment and research at
      the binding-axis level.
    - atom 0015 (transfer-overstated): atom 0015 fires when conversion
      factors drift from grounded reality (e.g., agent claims "research
      takes 5 min" without checking).
    - atom 0017 (unknowns-as-positive-data-recursion): atom 0017 cycles
      residue from method failures. Atom 0018 cycles residue from
      conversion-factor mispredictions (each decision-boundary outcome
      updates the table).
    - atom 0022 (resource-as-amana / stewardship-of-inquiry): atom 0022
      fires BEFORE atom 0018 at every dispatch boundary, asking "is this
      use worth the credit?" prior to atom 0018's "what's the cheapest
      way to do it?" Without atom 0022, atom 0018's cost-minimization
      is necessary-but-not-sufficient — an agent could cost-minimally
      dispatch on every trivial inquiry, exhausting credit on noise.
      Atom 0022 introduces the prior worthiness-gate. Round 96
      (2026-05-04) added this layer per operator's framing of
      resource-as-life-credit / Islamic amana.

    Convergent-evolution credential (per AAPI b-shape):
    - Statistical lineage: Babylonian grain inventory ~3800 BCE; Egyptian
      land resurvey post-Nile-flood; Roman census every 5y; Chinese 2000y
      ago counted 57.7M people in 12.4M households; John Graunt 1662
      mortality samples → life tables → insurance pricing; Pascal-Fermat
      1654 problem-of-points (probabilistic budget allocation under
      constraint); Halley 1693 Breslau life table; Bernoulli 1713 law of
      large numbers; Fisher RCT design 1920s (information-per-plot
      maximization).
    - Engineering lineage: DuPont CPM 1957; Lockheed PERT 1957; Kalman
      filter 1960 (state estimation under uncertainty); simulated
      annealing 1983 (budget-decay heuristics); RL discount-factor
      tuning; ML training-time vs inference-time budget tradeoffs.
    - All three lineages independently arrived at "ground physical state,
      identify binding constraint, convert others, decide" across
      statesmanship, insurance, science, and engineering. Mutawatir-
      equivalent at structural level.

    Bias-flag: drafted by the same agent in the same session that
    surfaced the operator's framing; cross-project replication pending
    for sahih grading.

    Cross-references:
    - atom 0005 (extends to runtime-iterative form)
    - atom 0011, 0015, 0017 (composition)
    - mizaj 19 (proposed companion: ground-physical-reality-at-decision-boundaries)
    - mizaj 16 (research-as-experiment-equivalent — provides the
      research-vs-experiment cap)
    - cheapcode/tools/reality-check.ts (instance)
    - cheapcode/plan/PLAN.bn SECTION GG (claims)
  maintenance:
    confidence: hasan
    cost_of_being_wrong: high
    provenance: obs
    evict_to: null
    dependents:
      - khazina/atoms/0005-convenient-narrative-times-constants.md
      - khazina/atoms/0011-smallest-distinguishing-experiment-first.md
      - khazina/atoms/0015-research-pipeline-overstates-base-model-specific-transfer.md
      - khazina/atoms/0017-unknowns-as-positive-data-recursion.md
      - cheapcode/tools/reality-check.ts
    last_validated_at: 2026-05-03
    boundary_status: drafted-and-cheapcode-validated; cross-project replication pending
---

# Atom 0018 — Iterative-energy-transformation

The move is to take atom 0005 (Sridhar-class energy transformation: convenient-narrative × constants → transformable energy) and apply it iteratively at every agent-decision boundary, with a mechanical physical-reality probe forcing measurement-before-decision. The single most consequential failure mode the atom prevents is the LLM-temporal-amnesia failure: agents making time/cost/frequency claims from memory when they have no internal clock. The mechanical probe (cheapcode/tools/reality-check.ts) outputs structured JSON; the agent's claim is then grounded in measurement rather than guess.

The substrate guardrails are what separate atom 0018 from naive "be aware of constraints." Atom 0011 bounds the experiment cost. Mizaj 19 enforces the trigger (probe BEFORE claim). Atom 0015 fires when conversion factors drift from observed reality. Without these, the cycle drifts into hand-waving "let me think about resources" without actually measuring or grounding. With them, the cycle is auditable: every decision-boundary has a probe-output + chosen-move + post-hoc cost + delta-from-prediction recorded.

The convergent-evolution credential is genuinely massive. Statistics.md traces 3,800 years of humans converging on this same pattern — Babylonian grain counts on clay 1800 BCE, Halley's life tables 1693, Florence Nightingale's hospital death counts 1854, Fisher's Rothamstead crop-yield-per-plot 1920s. Each instance is the same structural move applied to a different domain (statesmanship, insurance, public health, experimental science). The engineering lineage adds CPM/PERT (1957), Kalman filtering (1960), simulated annealing (1983), modern ML budget tradeoffs. Three independent traditions converging on "ground physical state, identify binding constraint, convert, decide" is mutawatir-equivalent at the structural level. Atom 0018 names what they all share, applied at the runtime decision-boundary of an LLM agent loop.
