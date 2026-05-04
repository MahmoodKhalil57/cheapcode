---
id: 0019
slug: convergence-without-contact-lifts-confidence
title: When two independent witnesses without a plausible contact channel converge on the same structural move, the move is operating on something deeper than either witness's local context — auto-lift the claim's confidence ceiling
created_at: 2026-05-03
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-03 secproj fact-15-to-16 cycle + aapi b-shape "convergence-without-contact" finding (saastemly_blog/01)

novel_move:
  class: meta-method
  anchor: file:///home/mk/apps/mizan/src/mizan/energy.py
  secondary_anchors:
    - file:///home/mk/apps/sveltePholio/saastemly_blog/01-convergence-without-contact.md
    - file:///home/mk/apps/burhan/bin/burhan-converge
  one_line: When TWO fact files / sources / experiments — authored at DIFFERENT TIMES, by DIFFERENT METHODS, with NO inter-citation channel — independently converge on the same structural claim, AUTO-LIFT the claim's confidence ceiling per a calibrated bonus that reflects the independence × structural-identity score; the convergence IS the load-bearing signal because hallucination/error/local-bias paths excluded by independence have measure-zero overlap.
  falsification: If applying the auto-lift on N≥5 secproj umbrellas (or equivalent burhan plans) produces ceiling-raises that are NOT empirically supported (i.e. the lifted umbrella subsequently fails its falsifier in production / pilot) at >20% rate, the auto-lift threshold is too lenient. Specifically: convergence detected → ceiling lifted → falsifier fires within next 30 days, repeat ≥1 in 5 cases = mechanism falsified.

applicable_problem_shapes:
  - class: burhan-plan-confidence-calibration
    example: "secproj plan/MAIN.bn umbrella 2 (local model wins schema-locked triage) is supported by facts/03 (human pilot witness, 2026-04-18), facts/05 (deterministic test coverage, 2026-05-02), facts/07 (runtime quality_scorer, 2026-05-03 morning), facts/15 (LLM-graded auto-review at 9.27/10, 2026-05-03 evening). Four independent witnesses, no inter-citation chain (the human pilot didn't see the LLM grader; the quality_scorer was authored before the auto-review pipeline). The umbrella's @>=0.95 ceiling is implicitly supported by this convergence; this atom makes the support EXPLICIT and runtime-detectable."
  - class: cross-tradition-research-validation
    example: "aapi corpus surfaces 5 convergence-without-contact pairs (Descartes×Zera Yacob method-of-doubt, Akhenaten×Popper falsification-discipline, Pyrrho×Nāgārjuna refuses-positive-doxastic-residue, Madhava×Newton calculus-precursor, Ibn al-Shāṭir×Copernicus heliocentric-kinematics). Each pair is auto-detected as a structural-move convergence + auto-graded by independence (contact-impossible vs contact-rare-with-timing-constraints). The same detection logic applied to engineering plans surfaces load-bearing structural claims."
  - class: cross-project-substrate-transfer
    example: "When cheapcode and secproj independently arrive at the same substrate move (e.g. both encoding 'don't default to compound-wrapper' as a routing rule via different methods), the convergence between projects with no shared codebase is convergence-without-contact at the engineering-tradition layer. Auto-lifts confidence in the move as portable beyond either project."
  - class: dependency-graph-meta-analysis
    example: "burhan-revisit's CONVERGE action walks a project's .bn dependency graph: for each load-bearing claim, identify which fact files cite it; score the inter-citation chain (zero edges = independent), the temporal gap (different sessions = stronger), the methodological gap (same author on different methods = weaker; different authors = stronger); recommend ceiling lifts for converged claims; flag single-witness claims as confidence-capped pending second witness."

transformation_work:
  cost_class: moderate
  description: |
    1. **Detect convergence shape.** For a target claim X in a burhan plan,
       enumerate all fact-files that cite X or contribute receipts under X.
       Build the citation-graph: which fact-files cite each other? An
       "independent" pair is two fact-files where NEITHER cites the other
       AND they were authored in different sessions (different `_at`
       timestamps in the file metadata or git history).

    2. **Score structural identity, not topical resemblance.** The aapi
       discipline applies: two fact-files both discussing "the model is
       fast" is topical resemblance; two fact-files both anchoring
       "schema-locked decode produces useful output via independent
       verification methods" is structural identity. The harder you
       have to work to specify the exact structural move, the more
       likely it's load-bearing (atom 0011 + 0014 reference).

    3. **Score contact-impossibility / contact-rarity.** For each
       independent-pair, classify the channel:
         - `contact-impossible`: zero plausible transmission (different
           projects, different decades, different methodology classes).
           Highest-grade convergence.
         - `contact-rare`: plausible-but-unestablished channel (same
           project, different sessions; or different projects with shared
           operator; or shared substrate-tools). Medium-grade.
         - `contact-likely`: shared author + shared methodology + same
           week. Convergence claim is weak — likely common-cause.

    4. **Compute auto-lift via energy-transformation formula** (atom 0005
       + atom 0018 applied: identify the BINDING CONSTRAINT, convert other
       axes via grounded factors, pick min-cost move on binding axis).
       The convenient narrative would be "fixed bonuses (+0.05 / +0.02)".
       The CONSTANTS we cannot change:
         (a) confidence ∈ [0, 1]
         (b) auth-grade ladder ceilings (mizaj M14): sahih ~0.95+,
             hasan 0.85, daif 0.40, mawdu 0.10 — these are the
             binding ceiling.
         (c) source-tier ladder (mizaj M11): L1 own-receipt 0.95,
             L2 vendor-doc 0.92, L3 academic 0.90, L4 aggregator
             0.78 — the parallel binding ceiling.
       Reshape to ENERGY-TRANSFORMATION form:

         convergence_energy = independence_score × structural_identity_score
           where:
             independence_score ∈ [0, 1] computed as:
               • citation-graph: 1.0 if zero edges between fact-files,
                 0.5 if one-way edge, 0.0 if mutual citation
               • temporal-gap: 1.0 if ≥7 days apart sessions, scales
                 down to 0.3 at same-session
               • methodology-axis: 1.0 if witness classes are distinct
                 (human pilot / deterministic test / runtime scorer /
                 LLM grader = 4 distinct axes), 0.5 if 2 axes, 0.2
                 if same axis
               geometric mean across the three sub-scores.
             structural_identity_score ∈ [0, 1]:
               • 1.0 if the structural move is named with same
                 falsifier shape across fact-files (e.g. both
                 "schema-locked decode produces useful output")
               • 0.5 if same shape with different falsifier framing
               • 0.2 if topical-only resemblance (atom 0015 fires)

         ceiling_distance = auth_ladder_ceiling - current_ceiling
           where auth_ladder_ceiling = max ceiling per the auth-grade
           AND source-tier the cited fact-files actually qualify for.

         lift = convergence_energy × ceiling_distance × dampening_factor
           where dampening_factor = 0.5 by default (fact 14 transfer
           audit cap of 0.85 is the calibrated start; tighten to 0.3
           if N≥3 falsifiers fire on lifted claims, loosen to 0.7
           if zero falsifiers fire across N≥10 lifted claims).

         Cumulative cap: total_lift NEVER pushes the ceiling past
         auth_ladder_ceiling. This is the BINDING CONSTRAINT — atom
         0018's "minimum cost on the binding axis" applied: every
         lift step costs from the budget (auth_ladder_ceiling -
         current_ceiling); the budget is finite.

       Asymmetry note (atom 0018): MEASURE the convergence first
       (mechanically walk the citation-graph + timestamp + methodology
       axes), DECIDE the lift second. Do not eyeball the lift.

    5. **Apply auto-lift OR flag missing convergence.** burhan-revisit's
       CONVERGE action emits two outputs:
         - `LIFT-CANDIDATE` for claims with detected convergence-without-
           contact: "claim X has N=K independent witnesses with no
           inter-citation; ceiling can be lifted from current to
           current+bonus".
         - `CAP-CANDIDATE` for load-bearing claims with single-witness
           support: "claim Y is at @>=0.85 but supported by only one
           fact-file; cap at 0.85 pending second witness, or
           explicitly downgrade to @>=0.78 (L4 ceiling per M11)."

    6. **Atom 0014 cross-witness honesty interaction.** This atom does
       NOT replace 0014's "≥3 independent witnesses + ≥12 quality"
       gate. It QUANTIFIES the lift the convergence earns. 0014 is a
       BINARY gate (settled vs. not); 0019 is the SCALAR adjustment
       within the settled-or-not space.

    7. **Atom 0010 blinded-witness interaction.** 0010 is about
       coordinated synchronous review (one model, then a blinded
       second pass). 0019 is about INDEPENDENT EVOLUTION across
       fact-files / projects / methodologies. The aapi distinction:
       0010 = "ask another reviewer with eyes shut"; 0019 = "find
       another tradition that arrived at the same move without ever
       meeting you".

    8. **Atom 0005 + 0018 interaction (energy-transformation form).**
       The lift formula above is atom 0005 (start with convenient
       narrative, identify constants, reshape to transformable
       energy) + atom 0018 (at decision boundary, ground physical
       state, convert via grounded factors, pick min-cost on
       binding axis) applied REFLEXIVELY to confidence-lifting
       itself. The "convenient narrative" was fixed bonuses; the
       constants are the ladders; the reshape is the
       convergence_energy × ceiling_distance × dampening conversion;
       the binding constraint is the auth_ladder_ceiling. This
       makes atom 0019's mechanism part of the energy-transformation
       cycle rather than a one-off heuristic — when ladder ceilings
       update OR when dampening calibration shifts, the lift
       formula updates automatically.

  skill_required:
    - dependency-graph parsing (.bn citation extraction)
    - independence-scoring (timestamps, authorship, methodology classes)
    - structural-identity vs topical-resemblance discrimination
    - calibration of confidence-bonuses against world-state
    - mizaj M14 ceiling-arithmetic (auth-grade ladder)

output_forms:
  - value_class: heuristic
    example: "A burhan-revisit CONVERGE action that walks a project's .bn graph and emits LIFT-CANDIDATE / CAP-CANDIDATE recommendations per load-bearing claim, with the independence-scoring trace inline so the operator can audit the lift's basis."
    monetization: "Substrate-suite primitive; consulting deliverable for any team running multi-fact-file burhan plans (research orgs, engineering teams under regulatory audit, AI-policy review boards)."
  - value_class: audit-methodology
    example: "Protocol for auditing engineering-plan confidence calibration: 'is this @>=0.95 ceiling supported by convergence-without-contact, or by a single-witness optimism?' Applies to AI-system reliability claims, security-product trust pitches, technical-due-diligence deliverables."
    monetization: "Premium audit engagement; AI-governance review tier."
  - value_class: publication
    example: "Methodology paper extending aapi's convergence-without-contact heuristic from cross-tradition research to engineering-plan calibration. Anchors: aapi corpus (180 entries, 5 convergence pairs), secproj application (4-witness convergence on U2). Falsifier-bearing test protocol included."
    monetization: "Career credential per atom 0013; PhilArchive primary, *Synthese* / engineering-reliability venue secondary."

evidence:
  successful_transformations:
    - "secproj plan U2 (local model wins schema-locked triage) — auto-detected convergence: facts/03 (human pilot, 2026-04-18) + facts/05 (deterministic verifier, 2026-05-02) + facts/07 (runtime scorer, 2026-05-03 AM) + facts/15 (LLM-graded auto-review 9.27/10, 2026-05-03 PM). Four independent witnesses, zero inter-citation, methodology classes (human / deterministic / runtime / LLM) span four distinct epistemic axes. The atom-0019 detector would auto-lift U2 from @>=0.95 to @>=0.97 (capped at +0.05 per pair × independence-bonus, ladder bound applies)."
    - "aapi corpus is the seed-evidence: 5 pre-existing convergence pairs surface the cross-tradition version of this move; the engineering-plan version is the natural transfer (atom 0015 honest: the transfer is structural — the substrate-mechanism (independence-of-evolution as load-bearing-signal) is shared across cross-tradition and cross-fact-file applications)."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-05-03 secproj substrate-cycle + sveltePholio blog post 01 (aapi convergence-without-contact heuristic transferred from research-tradition layer to engineering-plan layer)
  audit_notes: |
    Drafted-and-validated. Distinct from atoms 0010 + 0014:
      - 0010 is COORDINATED synchronous review (ask another model with eyes shut)
      - 0014 is cross-witness honesty as a BINARY settled-or-not gate
      - 0019 is INDEPENDENT EVOLUTION across fact-files/projects/methodologies
        as a SCALAR confidence-bonus operating below 0014's settled gate

    The distinction matters because:
      - 0010 produces ONE additional witness on the same artifact at the
        same time; the aapi-style "no contact channel" condition is
        TRIVIALLY satisfied (the second model didn't see the first), but
        the witnesses are NOT independently EVOLVED — they're coordinated.
      - 0019 requires independent EVOLUTION (different sessions, different
        methods, no inter-citation in the artifact graph). That's a
        STRONGER condition that warrants a STRONGER auto-lift.

    Re-audit triggers:
      - if convergence-detected ceiling-lifts produce >20% subsequent
        falsifier firings, the threshold is too lenient
      - if no engineering-plan pair surfaces convergence-without-contact
        across N≥10 plans audited, the move is research-cohort-specific
        and atom 0015 fires (transfer overstated)

    Runtime form (2026-05-03 update): the atom is now operationalized
    in ~/apps/mizan as a Python library with TDD tests (53/53 green).
    mizan.energy.lift_via_convergence implements the energy-transformation
    formula; mizan.convergence.detect_convergence performs the four-axis
    measurement; mizan.calibration.fit_dampening_from_outcomes is the
    trainable hyperparameter loop. burhan-converge will delegate its
    confidence math to mizan in the next refactor cycle. The
    runtime-anchor (atom 0008) is now a shipped Python package, not
    just markdown — every claim in the atom is independently runtime-
    verifiable via `cd ~/apps/mizan && pytest`.

    Prior-work check (mizaj M15): atom 0010 + 0014 + mizaj M14 mutawatir
    were each consulted before adding 0019. This atom is the SCALAR
    refinement on a SCALE that wasn't formalized. The blog post (aapi
    saastemly_blog/01) names the heuristic explicitly; that post is the
    surfacing artifact, not a duplicate.
---

# Atom 0019 — Convergence-without-contact lifts confidence

This atom captures a pattern the substrate-suite already implicitly uses but
hadn't formalized as an auto-confidence-adjustment mechanism. The aapi
finding (saastemly_blog/01) named the heuristic explicitly for cross-
tradition research: when two intellectual traditions evolved the *same*
structural move without a plausible transmission channel, the convergence
is the load-bearing signal — operating on something deeper than either
tradition's local presentation. The single-tradition version is the local
presentation of a deeper invariant.

This atom is the **engineering-plan transfer** of that finding. When two
fact-files (or experiments, or sources, or projects) — authored at
different times, by different methods, with no inter-citation chain —
independently converge on the same structural claim, the convergence
auto-lifts the claim's confidence ceiling. The auto-lift is QUANTIFIED
(per-pair bonuses with caps) and AUDITABLE (the citation-graph trace
is the receipt for the lift).

The atom matters because most burhan-plan confidence calibration is
currently MANUAL: the author writes "2026-05-03 LIFT: ..." comments and
bumps the @>= ceiling by hand. Atom 0019 makes the rule explicit and
runtime-detectable: a `burhan-revisit --converge` pass walks the
.bn graph and emits LIFT-CANDIDATE / CAP-CANDIDATE recommendations the
operator can apply (or reject). The asymmetry is structurally
important: SINGLE-witness claims should be CAPPED, MULTI-INDEPENDENT-
WITNESS claims should be LIFTED, and the substrate-suite should not
require the operator to re-derive this judgment per session. The
aapi finding — the convergence IS the load-bearing signal — is the
warrant. The blog post is the surfacing artifact for monetization
(consulting / methodology paper); the atom is the runtime form.
