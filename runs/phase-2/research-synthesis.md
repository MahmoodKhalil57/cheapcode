# Phase 2 research synthesis — mizaj-16 pre-experiment check

**Date:** 2026-05-03
**Per:** SPEC Phase 2 entry — "Pre-experiment research check (mizaj 16): if a synthesizable result already exists for the exact axis being measured, skip the experiment for that axis."

---

## Question being checked

Does prior published or open-source work measure whether inserting a **deterministic rule-based critic** (substrate: tier-ladder L1-L5 + isnad-style provenance + transfer-overstated detector + cross-witness consistency) **between best-of-K synthesis and a cross-model verifier** in a compound LLM wrapper produces ≥5pp completion-rate lift on multistep reasoning vs the same wrapper without the rule-based critic? (i.e., the **paired arm-split** that EXPERIMENT-1 Arm B is testing).

## Findings

**Direct match: NO.** No paper, blog post, or open-source project I found reports this exact ablation. Confidence the literature pre-answers: **~0.30** — well below mizaj-16's 0.85 threshold.

Three closest adjacents, all with at least one load-bearing variable shifted:

### (1) HERMES — arxiv 2511.18760 (Nov 2025)

WebFetch-verified abstract. Architecture: informal LLM reasoning + Lean-based formal prover module + memory buffer. Reports 67% accuracy improvement on AIME'25 with 80% fewer FLOPs vs reward-based baselines.

**Why non-substituting:** Lean is a learned-prover-+-formal-logic hybrid, not a deterministic rule grammar. Placement is interleaved during reasoning, not between synthesis and cross-model verifier.

### (2) LLM-Modulo (Kambhampati 2024) — arxiv 2402.01817

WebSearch-confirmed (not WebFetch-verified). Architecture: LLM generator + external guaranteed-correct verifier (planning-domain solver) in back-prompting loop. Travel-planning benchmark went from 0.6% to ~6× baseline with up to 10 back-prompt cycles.

**Why non-substituting (anti-pattern flag):** the verifier IS the critic — there's no separate cross-model verifier downstream, no best-of-K synthesis stage. This is "wrapper-with-verifier vs raw-LLM," which supports **Arm A** of cheapcode (the wrapper itself), NOT Arm B (substrate marginal lift over the wrapper). Conflating these is the exact failure mode.

### (3) LINC (Olausson et al. 2023) — arxiv 2310.15164

WebSearch-confirmed. Architecture: LLM as semantic parser → first-order-logic prover (Prover9) decides. Reports +10% StarCoder+15.5B vs GPT-4 CoT, +26% GPT-4+LINC vs GPT-4 CoT on ProofWriter.

**Why non-substituting:** rule-based-prover-replaces-LLM-judgment, not rule-based-critic-between-synthesis-and-cross-model-verifier. Different architectural slot. FOL provers are far heavier than substrate's tier-ladder/isnad heuristics.

## Robust adjacent findings (non-substituting but informative)

| Finding | Source | Implication for Arm B |
|---|---|---|
| Adding *some* verifier helps a generator (5–67pp) | LLM-Modulo, Math-Shepherd, Cobbe GSM8K, Snell 2024 | Supports Arm A. Says nothing about substrate marginal lift over an already-strong cross-model verifier. |
| Symbolic verifiers (Lean, FOL) outperform LLM-as-judge where the substrate captures the problem (10–38pp) | LINC, HERMES | Suggests **rule-based critics CAN add lift** in the right slot — but those are formal-logic substrates, not governance heuristics. |
| Rule-based vs learned verifier comparison exists in **RL training reward shaping** (CompassVerifier, DeepSeek-R1, RLVR, Logic-RL) | various 2024-2025 | Different problem entirely — training-time reward, not inference-time wrapper pass. |

## Anti-fabrication audit (atom 0010)

| Citation | Verification |
|---|---|
| HERMES arxiv 2511.18760 | ✅ WebFetch'd abstract, real |
| LLM-Modulo arxiv 2402.01817 | ⚠️ WebSearch only — not WebFetch'd. Slight downgrade. |
| LINC arxiv 2310.15164 | ✅ ACL Anthology + GitHub `benlipkin/linc` exists; not WebFetch'd full text |
| Snell arxiv 2408.03314 | ✅ Multiple sources confirm |
| CompassVerifier arxiv 2508.03686 | ⚠️ WebSearch result only |
| Cobbe GSM8K, Madaan Self-Refine, Wang Self-Consistency | ⚠️ Cited from training data — background only |

## mizaj-16 verdict

Confidence the literature answers Arm B's specific question: **~0.30**. Threshold for skip: ≥0.85. **Run the experiment.**

## Sharper-prior $0 sanity check (smallest-distinguishing-experiment, atom 0011)

The Explore agent surfaced a non-obvious move that costs $0 and could halt the $5 spend before it starts:

> "Pick 5 multistep problems by hand and check whether the substrate-critic flags errors the cross-model verifier missed in a dry run."

Translated to cheapcode's situation: cheapllm v1's TB-3 result archives contain 6 result files. Multistep cheapllm v1 missed 67% (33.3% pass on TB-3). Pick 5 of cheapllm v1's misses on multistep tasks. For each, retrospectively check:

1. Did substrate verifier (mizaj 11 tier-check + atom-0015 transfer-overstated detector + isnad-chain audit) **fire** on the failed step? Yes/No.
2. If yes, what did it surface?
3. If no, the substrate would have been redundant for that case.

If 0/5 substrate fires on cheapllm v1's misses → near-zero marginal lift expected; halt before $5 spend.
If 3+/5 substrate fires non-redundantly → strong prior for ≥5pp lift; run with confidence.
If 1-2/5 → run, tighten falsifier interpretation.

This is Phase 2.4 in the implementation plan. **Not yet run; pending implementation of substrate-verifier glue first.**

## Failure-mode priors (recorded for honesty)

The agent flagged two most-likely Arm B failure modes:

1. **Redundancy hypothesis:** substrate critic catches the same errors the cross-model verifier already catches → near-zero marginal lift. The cross-model verifier is already an atom-0010 cross-witness; substrate may be a third witness redundant with it.
2. **Semantic-shape hypothesis:** substrate's deterministic rules under-fire on hard multistep where errors are semantic ("the step's claim is factually wrong about Python's API") not provenance-shaped ("the step cites L4 source for L1 claim"). Cross-model verifier handles semantic-wrong; substrate handles provenance-wrong; on TB-3-style tasks, the failure mix matters.

Both failure modes are detectable in the Phase 2.4 dry-run.

## Decision

Proceed to Phase 2.2 (wrapper Arm A skeleton) → Phase 2.3 (substrate glue) → Phase 2.4 ($0 retrospective). Decide on $5 spend after 2.4.

## Sources

- [HERMES](https://arxiv.org/abs/2511.18760)
- [LLM-Modulo](https://arxiv.org/pdf/2402.01817)
- [LINC](https://arxiv.org/abs/2310.15164)
- [Snell scaling test-time compute](https://arxiv.org/abs/2408.03314)
- [CompassVerifier](https://arxiv.org/pdf/2508.03686)
- [Critic-CoT](https://arxiv.org/html/2408.16326)
- [CriticBench](https://arxiv.org/abs/2402.14809)
- [Logic-RL](https://arxiv.org/html/2502.14768v1)
- [BAIR compound AI systems](https://bair.berkeley.edu/blog/2024/02/18/compound-ai-systems/)
