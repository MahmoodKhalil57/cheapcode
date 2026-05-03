# Phase 2.2 — $0 retrospective: would substrate verifier have caught cheapllm v1's misses?

**Date:** 2026-05-03
**Method:** atom 0011 smallest-distinguishing-experiment-first applied as $0 sanity check before $5 EXPERIMENT-1 spend.
**Source:** [cheapllm/results/scorecard_v1_final_2026-05-03.md](file:///home/mk/apps/cheapllm/results/scorecard_v1_final_2026-05-03.md), [cheapllm/results/tb/h0c_8task_medium_hard_2026-05-02.json](file:///home/mk/apps/cheapllm/results/tb/h0c_8task_medium_hard_2026-05-02.json), `/tmp/cheapllm-final-scorecard/results.json`

---

## TL;DR

cheapllm v1's TB-3 was N=3, 2 misses. The two misses look **structurally mismatched** to substrate-verifier's failure-mode coverage:

- **Miss 1 (`find-official-code`):** `unknown_agent_error` — agent crashed without producing output. Nothing to verify; substrate can't help when there's no chain-of-reasoning to audit.
- **Miss 2 (`count-dataset-tokens`):** `test_command_output_content_example: failed` — agent produced a wrong number from tokenizer execution. Substrate verifies provenance / chain consistency, not numerical correctness from code execution.

**Substrate would have caught: 0/2 of cheapllm v1's misses** (best-case interpretation). This is a thin sample (N=2) but the **failure-mode shape** generalizes: TB-3-style benchmarks fail on code-correctness and system-success, not reasoning-with-citations consistency.

This is a meaningful negative signal for Arm B's expected lift on TB-3 multistep slice. **Surface to operator before $5 spend.**

## Detail per miss

### Miss 1 — `find-official-code` (TB-3, unresolved)

Task instruction: "Find official codebases for 10 papers, write to /app/result.jsonl with paper_id + official_code_url."

cheapllm v1 outcome:
- `is_resolved: false`
- `failure_mode: "unknown_agent_error"`
- `parser_results: { test_result_json_exists: failed, test_result_jsonl_content: failed }`

The agent crashed/errored before producing /app/result.jsonl. No output to audit.

**Substrate-verifier disposition:** N/A. The substrate operates on chain-of-reasoning that has been emitted; if the upstream agent crashes before emission, the substrate has nothing to grade. This is an upstream-orchestration / system-success failure mode that runtime-substrate cannot help with.

### Miss 2 — `count-dataset-tokens` (TB-3, unresolved)

Task instruction: "Count deepseek tokens in the science domain of `ryanmarten/OpenThoughts-1k-sample` HF dataset using Qwen2.5-1.5B-Instruct tokenizer. Write integer to /app/answer.txt."

cheapllm v1 outcome:
- `is_resolved: false`
- `failure_mode: "unset"` (agent completed, output produced, but test failed)
- `parser_results: { test_command_output_content_example: failed }`
- `total_input_tokens: 107772, total_output_tokens: 4865` (real execution; long context)

The agent produced /app/answer.txt with the wrong number. Failure is numerical-correctness — the tokenizer was run, produced a count, count was wrong (or the wrong dataset slice was tokenized).

**Substrate-verifier disposition:** would NOT have caught. Substrate verifies:
- mizaj 11 source-tier (was the source L1-L5? — N/A here, no source citation)
- atom 0015 transfer-overstated (did extrapolation cross tier boundaries? — N/A)
- isnad-chain consistency (did claims trace back to receipts? — N/A, no chain emitted)
- GRADE 5-domain (study-design flaws? — N/A)

The agent's failure was "ran tokenizer, got wrong number" — substrate has no ground truth to compare against and no chain to audit. This is a code-execution-correctness failure mode that runtime-substrate cannot help with.

## Generalization (with honest sample-size caveat)

N=2 is thin. But the **failure-mode shape** matters more than the sample size:

| TB-3 failure pattern | Substrate fits? |
|---|---|
| Agent crashes / system error | ❌ no chain to audit |
| Agent produces wrong code output | ❌ substrate doesn't run code |
| Agent produces wrong numerical answer | ❌ substrate has no ground truth |
| Agent produces wrong file structure | ❌ structural-correctness, not chain-consistency |
| Agent extrapolates from wrong source | ✅ atom 0015 fires |
| Agent claims L1 confidence on L4 source | ✅ mizaj 11 catches |
| Agent's reasoning chain doesn't trace to receipts | ✅ isnad audit catches |

TB-3 / Terminal-Bench's failure mix skews HEAVILY toward the top 4 rows (code/system-correctness). The substrate's strength is in the bottom 3 rows (reasoning-with-citations). **They're orthogonal.**

This isn't a bug in the substrate; it's a **benchmark/critic mismatch**. Substrate would likely lift on:
- Knowledge-intensive long-form reasoning (reasoning chains with citations, like research summarization with sources, legal-reasoning, medical-evidence synthesis)
- Multi-document synthesis where source-tier matters
- Tasks where "the LLM's claim is sourced wrong" is the dominant failure mode

It would NOT lift on:
- Code-execution benchmarks (TB, SWE-bench, HumanEval)
- Numerical-answer benchmarks (GSM8K, MATH)
- System-orchestration benchmarks (where agents-not-LLMs are evaluated)

## Implications for EXPERIMENT-1

The current EXPERIMENT-1 is on TB-medium/hard MULTISTEP slice (per SPEC Rev 2026-05-02e). The retrospective suggests:

**Arm A (3-axis comprehensive-dominance) — unaffected.** The wrapper itself (best-of-K + cross-model verifier) doesn't depend on substrate. Arm A's expected lift over raw GPT-5.5 still rides on Snell 2024 + LLM-Modulo + AlphaCode-2 evidence.

**Arm B (substrate marginal lift) — likely FAIL on TB slice.** If the dominant failure mode is code-correctness, substrate marginal lift is structurally bounded near zero. The pre-registered ≥5pp threshold is aggressive against this baseline.

## Three options to surface to operator

Each surfaces honestly; the choice is the operator's.

### Option 1 — Run EXPERIMENT-1 as specified, expect FAIL-B

Honest negative-result mode (atom 0013). Run Arm A + Arm B; Arm B almost certainly fails ≥5pp threshold; record `failed_transformations` on khazīna atom 0016; ship cheapcode without runtime substrate. Total cost: $5.

**Value:** the negative result is itself a calibration credential. We pre-registered a falsifier; we ran it; it falsified; we ship the honest disposition. This is exactly what atom 0013 says is the credential.

**Downside:** $5 spent confirming what this $0 retrospective already moderately suggests.

### Option 2 — Reframe Arm B to a benchmark where the failure-mode mix favors substrate

Replace TB-3 with (e.g.) a knowledge-intensive long-form reasoning benchmark where reasoning-chain-with-citations is the unit being evaluated. Examples:
- A subset of MMLU-Pro hard reasoning tasks (multi-hop)
- HotpotQA multi-document QA with attribution scoring
- A custom benchmark of "LLM produces a research-style answer with citations; gold is whether citations are tier-correct"

This delays Phase 2 by maybe 2h to construct or pick the benchmark, but tests the substrate's actual hypothesis cleanly. Cost: similar $5.

**Value:** falsifier lands on the right axis. If FAIL-B happens here, we're certain it's a substrate-runtime-verifier-doesn't-work claim, not a benchmark-mismatch claim.

**Downside:** scope creep against the locked SPEC. Operator already tightened scope per Rev 2026-05-02e. Adding a benchmark widens it.

### Option 3 — Defer Arm B entirely; ship cheapcode v1 without runtime substrate

Substrate stays as build-time discipline only (which IS validated — atom 0010 caught 0.7pp over-statement in cheapcode M1.9; cheapllm v1 logged 7× atom-0015 firings). Khazīna atom 0016's runtime claim stays `drafted-but-not-validated`; future work could test it on a fitter benchmark.

**Value:** $5 saved. SPEC stays clean. Atom 0016 stays in the catalog as a hypothesis ready for future test.

**Downside:** we don't get the bias-confirming or bias-falsifying signal. The operator's reframe ("substrate IS the tiny model") stays an interesting framing, not an empirical claim.

## Recommendation

**Option 2** — reframe Arm B to a knowledge-intensive reasoning benchmark where the failure-mode mix favors substrate. This is the only option that actually tests the hypothesis on the right axis. The 2h scope-creep is honest substrate-discipline, not feature-creep — we caught the benchmark/critic mismatch before spending $5 confusing the signal.

If operator prefers to stay strictly within SPEC scope, **Option 1** is the next-best (preserves the falsifier-discipline credential even at a likely-FAIL outcome).

Operator decision required before Phase 2.3 (wrapper Arm A skeleton) and Phase 2.4 (substrate glue) implementation begin.

## Limits of this retrospective

- **N=2.** Two misses is not a robust sample. The failure-mode shape generalization is stronger than the count.
- **Best-case substrate interpretation.** I assumed substrate verifier as currently designed. A re-engineered substrate that incorporates code-execution oracles (running the LLM's produced code in a sandbox, comparing to a reference) WOULD catch Miss 2. But that's a different artifact than what khazīna atom 0016 claims.
- **TB-3 is N=3 baseline.** EXPERIMENT-1 plans N=10 multistep slice; the broader slice may have a different failure-mode mix than the 3-task subset. But TB benchmark family overall is code/system-correctness-dominated.
- **Confound: cheapllm v1's outputs are NOT in burhan shape.** The substrate would operate on burhan-shape outputs from the cheapcode wrapper, which the LLM emits because it's prompted to. cheapllm v1 didn't prompt for burhan shape, so its outputs are free-form. The retrospective assumes "if cheapllm had emitted burhan, would substrate catch the miss?" — which is a counterfactual. Best-case interpretation: even WITH burhan-shape emission, the failure-mode shape doesn't fit substrate.
