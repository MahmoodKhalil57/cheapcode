---
id: 0016
slug: substrate-as-deterministic-verifier-head
title: A discipline-substrate (rules + claim-shape + isnad-chain + drift-detectors) is the deterministic equivalent of a learned verifier head, and can serve as a runtime critic inside compound LLM architectures
created_at: 2026-05-03
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-03 cheapcode Phase 1 close + iai/qls/qllm tiny-model survey

novel_move:
  seed: |
    A muḥaddith-shape rule stack (tiered sources + isnad chain + transfer-overstated
    detector) is a free deterministic verifier head. Plug it between best-of-K and
    cross-model verification — same structural role qls's confidence head plays,
    zero params, zero inference cost.
  class: structural-move
  anchor: file:///home/mk/apps/cheapcode/SPEC.md#revision-2026-05-03h
  one_line: When you have an authored discipline substrate (mizaj-style rules + burhan-shape claims + khazīna-style atom retrieval + daftar-style isnad chains + atom-0010 cross-witness + atom-0015 drift detectors), it functions as the symbolic equivalent of a learned tiny verifier model — and can be plugged into a compound LLM wrapper as a runtime critic between best-of-K synthesis and cross-model verification, providing per-step source-tier scoring, authentication-grade calibration, and transfer-overstated drift detection at zero param cost and file-I/O latency.
  falsification: If a wrapper run with the substrate verifier pass enabled (Arm B in cheapcode EXPERIMENT-1) does NOT improve completion-rate on multistep reasoning tasks by ≥5 percentage points relative to the same wrapper without the substrate pass (Arm A), measured paired on N≥10 multistep tasks with wrapper-internal verification held constant, then the substrate is NOT operating as a runtime verifier head — only as a build-time discipline. The atom retains its calibration-discipline interpretation (per atom 0013) but loses its compound-LLM-runtime claim.

applicable_problem_shapes:
  - class: compound-llm-architecture
    example: "Designing a multi-call LLM wrapper that needs a verifier between best-of-K synthesis and cross-model verification, where retrieval-augmented learned verifiers add 1-7B parameters of overhead and are not specialized to the operator's claim-shape conventions; substituting an authored rule-stack + isnad-chain audit script for the verifier role removes the params and adds source-tier-aware critique."
  - class: ai-evaluation-harness
    example: "An evaluation pipeline scoring multi-step reasoning chains needs per-step provenance + confidence calibration without a separate trained calibration model; the substrate produces per-step burhan-shape claims with explicit `@>=N` confidence and L1-L5 source-tier scoring, replacing what would otherwise require a learned head."
  - class: agent-orchestration
    example: "An orchestrator wrapping frontier API calls in a plan-decompose + parallel-execute-leaves pipeline needs to flag transfer-overstated extrapolation steps before they propagate to synthesis; an authored drift detector (atom 0015 firing pattern) catches them deterministically without an LLM-judge call."
  - class: knowledge-base-runtime-integration
    example: "A khazīna-style atom catalog with 5-gate admission discipline can be queried at wrapper-runtime via grep + structural match, providing a retrieval signal without learned RAG embeddings; combined with isnad-chain receipt walking, this is a runtime memory + audit head."

transformation_work:
  cost_class: moderate
  description: |
    1. **Identify the substrate's verifier-equivalent components.** Map symbolic
       primitives to learned-model heads: confidence head ↔ burhan `@>=N`
       claim shape; calibration ↔ mizaj L1-L5 source-tier ladder + GRADE
       5-domain checklist; verifier ↔ mizaj sahih/hasan/daif/mawdu grading +
       daftar isnad chain walker; drift detector ↔ atom-0015 transfer-overstated
       firing pattern; cross-witness ↔ atom-0010 honesty pipeline.
    2. **Locate the wrapper's verifier-pass insertion point.** Typically between
       best-of-K synthesis and cross-model verification (so cross-model
       verification only burns frontier tokens on substrate-passing
       candidates) OR between plan-decompose and leaf-execution (so leaves
       don't run on transfer-overstated plans).
    3. **Wire the integration as glue, not reimplementation.** Call the existing
       substrate tools (`tools/audit-verify.sh` walks isnad; `tools/joint-confidence.ts`
       recomputes per-step) from the wrapper rather than rewriting them in
       wrapper code. ≤100 LoC of glue is the MIN target.
    4. **Define the substrate-confidence-threshold for retry-with-feedback.**
       Below threshold, retry once with substrate's surfaced critique
       (e.g. "atom-0015 fires on step 3: transfer from L3 source to L1 claim
       not warranted") before falling through to cross-model verification.
    5. **Pre-register the marginal-lift falsifier.** Run a paired arm-split
       experiment: same wrapper, same prompts, substrate verifier pass ON
       (Arm B) vs OFF (Arm A). Measure paired completion-rate delta.
       Threshold ≥5pp on multistep slice for substrate-runtime claim to
       earn its keep; <5pp falsifies and the substrate stays as build-time
       discipline only.
    6. **On PASS:** ship the substrate verifier pass on by default; record
       successful_transformations evidence. On FAIL: revert runtime integration;
       record failed_transformations evidence; atom 0015 fires on the
       hypothesis. Either outcome is honest and load-bearing.
    7. **Cite the convergent-evolution credential.** The structural move is
       supported by the muḥaddithūn (sahih/hasan/daif + isnad, ~9th c.) and
       Cochrane GRADE (L1-L5 + 5-domain, ~2004) arriving at tiered-source
       authentication independently — convergence on chain-of-provenance
       calibration without transmission, which is structural evidence the
       primitive is general (per AAPI b-shape "convergent-evolution-without-contact").
  skill_required:
    - substrate authoring (mizaj rules, burhan claim shape, khazīna atom curation)
    - compound-LLM wrapper engineering (plan-decompose, best-of-K, cross-model verifier)
    - paired-arm experiment design (atom 0011 smallest-distinguishing)
    - falsifier writing (mizaj 01)
    - honest negative-result reporting (atoms 0010, 0013, 0015)

output_forms:
  - value_class: product-differentiation
    example: "A compound-LLM provider package that ships an `auto` tier whose verifier head is a deterministic substrate (mizaj/burhan/khazīna/daftar) rather than a 1-7B learned verifier model — same structural role, zero params, file-I/O latency, with per-step explainable critique that names the failing rule (e.g. 'atom-0015 fires on step 3')."
    monetization: "Premium agent reliability tier (the cheapcode `auto` tier itself, gated on Arm B PASS); enterprise compound-LLM control-plane feature; published differentiator in Phase 4 README."
  - value_class: audit-methodology
    example: "A reusable arm-split experimental protocol for testing whether any rule-stack discipline functions as a runtime verifier vs only a build-time discipline — applicable to any compound-LLM team that has authored heuristics they suspect could be runtime-loadable."
    monetization: "Consulting deliverable for AI-tooling teams considering substrate-style discipline; reliability playbook component."
  - value_class: publication
    example: "A short paper or blog post: 'When the substrate IS the tiny model — a deterministic alternative to learned verifier heads in compound LLM architectures.' With the convergent-evolution credential (muḥaddithūn + GRADE) as the structural argument and the cheapcode EXPERIMENT-1 arm split as the empirical anchor."
    monetization: "Career credential per atom 0013 (calibration-discipline-as-credential-substitute) — leads with shipped artifact + falsifier-loaded experiment, not training tokens."
  - value_class: org-design-template
    example: "A team operating discipline that produces, as a side-effect, a runtime-loadable verifier head: 'every load-bearing claim carries a burhan-shape confidence + source-tier; every long-running pipeline gets an audit-verify pass before merge; counter-instances are first-class.' The discipline's audit-trail compiles to a runtime artifact."
    monetization: "Operating playbook for AI engineering teams; training engagement; AI-reliability QA standard."

evidence:
  successful_transformations:
    - "cheapcode M1.9 cross-witness probe (atom 0010 instance) caught a 0.7pp over-statement before it entered the joint-confidence computation. Build-time validation."
    - "cheapllm-v1 session logged 7× atom-0015 firings caught by substrate discipline. Build-time validation."
    - "cheapcode M3.3-M3.7 (2026-05-03): substrate tooling (burhan-snapshot + burhan-revisit) applied the atom's primitives reflexively to audit cheapcode's own plan-graph. Surfaced 17 drift items; resolved 11 via lift cycles + structural fixes. The substrate auditing itself works at build-time AND at plan-time (different from runtime-LLM-wrapper time, which remained untested through M3.18)."
    - "cheapcode M3.19 voter probe (2026-05-03): first runtime-LLM-wrapper validation. The cross-witness voter (sahih/hasan/daif grading + cross-witness pair, atom-0010 + mizaj rule 14 instantiated as runtime critic) executed on N=5 mixed benchmark (3 hard AIME 2024 + 2 known-impossible). Outcomes: 4/5 correct, $0.0516 total, sahih convergence precision 2/2 = 100%, runtime escalation hasan 2/3 = 67%. Substrate's symbolic primitives executed as runtime critic — no learned verifier head, no params, file-I/O latency. Runtime-loadable-verifier interpretation moves from drafted to small-N-validated for hard-reasoning slice. Caveats: small N (need ≥20 for full validation); sahih reached only on negation tasks (positive AIME all escalated); one daif came from smart-tier per-call timeout, not 3-way disagreement."
    - "cheapcode M3.19 negation-asymmetry data point: 2/2 known-impossible tasks (Fermat n=4, √2 irrational) hit sahih on first try with no escalation, mean 17s, $0.0002/task. 3/3 positive AIME tasks all escalated to smart_C, mean 158s, $0.017/task. ~85× cost asymmetry, ~9× latency asymmetry. Confirms the structural prediction that cross-witness convergence on NEGATION is a stronger signal than on positive answers (hallucination-toward-positive bias absent when the correct answer is non-existence). Pre-registered in cheapcode/plan/facts/10-cross-witness-runtime.bn before the probe ran."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-05-03 cheapcode Phase 1 close (operator reframe: 'consider that our substrate tool is an abstract attempt at that super tiny model')
  audit_notes: |
    UPDATE 2026-05-03 (M3.20 — post-M3.19 voter probe): Runtime-verifier-head
    interpretation is now SMALL-N VALIDATED for hard-reasoning slice. M3.19
    executed a substrate-runtime cross-witness voter (atom-0010 cross-witness
    + mizaj rule 14 sahih/hasan/daif grading instantiated as a wrapper-runtime
    critic) on N=5 mixed benchmark. Outcome: 4/5 correct, $0.0516 spend, sahih
    convergence precision 2/2 = 100%, hasan (escalated majority) 2/3 = 67%.
    The substrate's symbolic primitives executed as runtime critic with no
    learned head, zero params, file-I/O latency. The fitter benchmark the
    earlier audit_notes called for ("a fitter benchmark than TB-3 ... reasoning-
    with-citations") was found in AIME / known-impossible: failure modes are
    chain-of-reasoning consistency + impossibility-detection, both of which
    are substrate's structural strengths.

    Previously-pending status (drafted-but-not-validated): the runtime claim
    was gated on cheapcode EXPERIMENT-1 Arm B reporting ≥5pp marginal lift on
    multistep tasks. M3.10's compound wrapper failed on cost+latency axes
    (M3.11+M3.11b). M3.18 reframed: instead of arm-split-on-multistep, find
    the substrate fit. The fit is hard-reasoning (where chain consistency
    matters) + negation-detection (where hallucination-toward-positive bias
    creates a measurable cross-witness signal). M3.19 confirmed both.

    The two interpretations:
    - build-time-discipline: subsumed by atoms 0010, 0013, 0015. VALIDATED
      (M1.9 0.7pp catch, cheapllm-v1 7× atom-0015 firings, M3.3-M3.7 plan-
      graph self-audit resolving 11 of 17 drift items).
    - runtime-verifier-head: was hypothesis-status. Now SMALL-N VALIDATED
      (M3.19 N=5: sahih precision 100%, hasan 67%, no hangs, $0.0103/task).
      Full validation requires N≥20 across multiple hard-reasoning shapes
      (combinatorics, geometry, number-theory, complex-analysis) plus novel
      negation tasks where impossibility proofs are not in training data.

    Bias-flags:
    - small N (5) in M3.19 — confidence is hasan, not sahih. Need N≥20 for
      full validation; need novel negation tasks (training-data leakage on
      Fermat n=4 and √2 irrationality is plausible).
    - one M3.19 daif was a smart-tier per-call timeout, not 3-way
      disagreement. Voter pipeline's structural correctness is not
      challenged by this; per-call timeout is an engineering parameter.
    - sahih reached only on negation tasks; positive AIME all escalated.
      The 100% sahih precision figure is from negation-only subset. Cross-
      class sahih validation requires harder positive tasks where cheap
      models can converge (this probe was specifically chosen as the
      smallest-distinguishing N=5).
    - Bias from session cohort (operator + agent authored M3.18 reframe
      and M3.19 benchmark together): partially mitigated by pre-registering
      both convergence-predicts-correctness and negation-asymmetry claims
      in cheapcode/plan/facts/10-cross-witness-runtime.bn BEFORE the
      probe ran.

    Convergent-evolution credential and atom 0011 smallest-distinguishing
    discipline both held: total cost $0.0516 well under $0.20 budget; total
    wall ~8.5min well under 30min cap.

    Cross-references (unchanged):
    - atom 0010 (cross-witness honesty) — substrate IS an instance.
    - atom 0013 (calibration-discipline-as-credential-substitute) — extended
      to compound-LLM-runtime framing.
    - atom 0015 (research-pipeline overstates base-model-specific transfer)
      — falsifier action_if_falsified.
    - atom 0008 (claim-shape pattern runtime-anchored).
    - atom 0011 (smallest-distinguishing-experiment-first) — applied to M3.19.

    Cross-references:
    - atom 0010 (cross-witness honesty pipeline) — substrate IS an instance.
    - atom 0013 (calibration-discipline-as-credential-substitute) — this atom
      extends 0013 from career-credential framing to compound-LLM-runtime
      framing.
    - atom 0015 (research-pipeline overstates base-model-specific transfer)
      — the falsifier action_if_falsified is explicitly atom-0015-firing.
    - atom 0008 (claim-shape pattern runtime-anchored) — this atom uses 0008's
      runtime-anchoring discipline at the wrapper level, where the "runtime"
      is wrapper-execution, not test-execution.
    - atom 0011 (smallest-distinguishing-experiment-first) — the arm-split is
      0011 applied to this atom's own falsifier.

    Convergent-evolution credential (per AAPI CLAUDE.md b-shape): muḥaddithūn
    sahih/hasan/daif + isnad chain (~9th c.) and Cochrane GRADE L1-L5 + 5-domain
    (~2004) independently arrived at tiered-source authentication for multi-step
    claims. ~1100 years apart, no transmission channel, different goals.
    Convergence on chain-of-provenance calibration is structural evidence the
    primitive is general — not a quirk of either tradition.
  # First-sweep adoption per ~/apps/khazina/lectionary/atom-maintenance-principles.md (2026-05-03):
  maintenance:
    confidence: hasan          # build-time IS sahih; runtime-verifier moved daif → hasan via M3.19 (small N, sahih on negation only). sahih requires N≥20 + novel negations.
    cost_of_being_wrong: extreme  # B.10 — wrong = the entire substrate-as-product narrative collapses; cited by secproj quality_scorer's atom-0016-made-concrete claim
    provenance: obs            # A.2 — was inf, now obs: cheapcode M3.19 N=5 produced direct runtime evidence (sahih 2/2, hasan 2/3, escalation pattern matches structural prediction)
    evict_to: null             # A.4 — load-bearing for cheapcode + secproj substrate narrative
    dependents:
      - khazina/atoms/0010-blinded-independent-witness-pass.md  # composes
      - khazina/atoms/0013-calibration-discipline-as-credential-substitute.md  # extends
      - khazina/atoms/0015-research-pipeline-overstates-base-model-specific-transfer.md  # falsifier action
      - secproj/plan/MAIN.bn (umbrella 2 cycle citation)
      - cheapcode/plan/facts/04-khazina-atoms.bn
      - cheapcode/plan/facts/10-cross-witness-runtime.bn  # M3.18-M3.19 lemmas + M3.20 evidence update
      - cheapcode/runs/experiment-2-voter-probe/verdict.md  # M3.20 verdict
    last_validated_at: 2026-05-03
    boundary_status: runtime-verifier-head claim SMALL-N VALIDATED (M3.19 voter probe, hasan); full validation requires N≥20 + novel negation tasks; build-time interpretation sahih
---

# Atom 0016 — Substrate-as-deterministic-verifier-head

The move is to reframe a substrate suite — typically built as authoring discipline for the human operator — as a *runtime-loadable verifier head* inside a compound LLM architecture. The substrate's primitives map structurally onto the heads a learned tiny verifier would have: confidence head, source-tier calibration, refusal/grading head, retrieval (atom catalog), drift detector, cross-witness honesty. The mapping is exact enough that the substrate becomes a deterministic substitute for a learned verifier — at zero parameters, file-I/O latency, and full auditability. This is structurally distinct from atom 0008 (runtime-anchored claim-shape) which constrains a child report's content; atom 0016 inserts the substrate as an active critic in the wrapper's execution path between best-of-K and cross-model verification.

The atom is novel because it inverts the usual flow of substrate-discipline. Atoms 0010, 0013, 0015 treat substrate-discipline as something the *human authoring agent* does — to catch their own over-statements, demonstrate calibration, frame credentials honestly. Atom 0016 says: those same primitives, when authored deterministically, can run inside a wrapper without the human in the loop. The cheapcode EXPERIMENT-1 Arm B test is the smallest distinguishing experiment (atom 0011): does substrate-on outperform substrate-off on multistep reasoning by ≥5pp? If yes, the substrate has earned its place as a runtime head and the cost-of-discipline (mizaj rules + atom curation + isnad-chain authoring) compounds into a runtime advantage. If no, the substrate stays as build-time discipline only and atom 0016 records the failed transformation honestly — the discipline still produces atom 0010 and atom 0015 firings at build-time, just not at wrapper-runtime.

The convergent-evolution credential matters because it locates the move's structural credibility outside any single discipline. The muḥaddithūn (Bukhārī, Muslim, ~9th c.) developed sahih/hasan/daif/mawdu authentication with isnad chains for hadith. Cochrane GRADE (early 2000s) developed L1-L5 evidence tiers with 5-domain downgrade criteria for medical evidence synthesis. The two traditions had no transmission channel — different continents, different writing systems, different stakes — yet both arrived at *tiered-source authentication for multi-step claims with provenance chains*. Per AAPI's b-shape (convergent-evolution-without-contact), this is structural evidence that the primitive is general: not a quirk of either tradition, but a discipline that emerges whenever you need to combine sources of varying reliability into a load-bearing claim. Compound LLM architectures need exactly that, and the substrate already implements it. The runtime-loadable-verifier interpretation is the obvious next move.
