# EXPERIMENT-1 Arm A — Verdict

**Date:** 2026-05-03
**Status:** Pre-registered FAIL outcome (0 of 3 axes pass post-rescoring)
**Format:** Model Card (Mitchell et al. 2019; SPEC Revision 2026-05-02g adoption 1)
**Spend:** $0.0457 of $5 envelope (0.9% used; well within Phase 2 budget)
**Wall-clock:** ~6 min (one pass; no retries needed at experiment level)

---

## Model details

| | |
|---|---|
| Model | `cheapcode-auto v0.1` (M3.10 wrapper) |
| Architecture | Compound LLM: plan-decompose → parallel cheap-leaves → best-of-K=3 frontier-synthesis → cross-model verifier → retry-with-feedback (≤1×) |
| Smart-tier | `openai/gpt-5-mini` |
| Cheap-tier | `deepseek/deepseek-v4-flash` |
| Cross-model verifier | `anthropic/claude-haiku-4.5` |
| Best-of-K | K = 3 |
| Max retries | 1 |
| Wrapper LoC | 396 (cell #18 EXPECTED tier, ≤700) |

## Intended use

cheapcode's auto tier was hypothesized to provide 3-axis dominance over raw frontier (cheaper + faster + smarter on multistep reasoning) per SPEC Revision 2026-05-02d. Out-of-scope: single-step tasks (bounded above by best frontier in ensemble).

## Factors

10-task curated benchmark spanning: arithmetic chain, multi-hop trivia, deductive logic, string manipulation, counting, date arithmetic, unit conversion, percentage compounding, syllogism, set operations.

## Metrics

Three pre-registered ratios per SPEC Revision 2026-05-02d:

| Axis | Definition | Target |
|---|---|---|
| Cost | wrapper-total-USD / baseline-total-USD | ≤ 0.30 (3× cheaper) |
| Latency | wrapper-P50-ms / baseline-P50-ms | ≤ 0.70 (30% faster) |
| Completion | wrapper-correct/N / baseline-correct/N | ≥ 1.10 (10pp lift) |

## Evaluation data

10 multistep tasks (`runs/experiment-1-attempt-1/benchmark.ts`). Gold answers deterministic; scoring via case-insensitive containment with alternates. **One benchmark-author error caught and corrected post-hoc**: t05-counting's gold was "8" but the true vowel count of "cheapcode is awesome" is 9. Both arms answered 9 — i.e., both correct. Re-scored verdict reflects the correction.

## Training data

N/A — wrapper composes calls to OpenRouter-hosted frontier models; no training.

## Quantitative analyses

### Headline (rescored with corrected t05 gold)

| Axis | Baseline | Wrapper | Ratio | Target | Pass |
|---|---:|---:|---:|---:|:---:|
| Cost | $0.0160 | $0.0297 | **1.855×** | ≤0.30 | ✗ |
| Latency P50 | 5364 ms | 29449 ms | **5.490×** | ≤0.70 | ✗ |
| Completion | 100.0% | 100.0% | **1.000×** | ≥1.10 | ✗ |
| **Outcome** | | | | | **FAIL (0/3)** |

### Per-task breakdown

All 10 tasks succeeded under both arms after the t05 correction (both got `9` vowels).

| Task | Shape | Baseline | Wrapper | Cost ratio | Latency ratio |
|---|---|:---:|:---:|---:|---:|
| t01 | arith-chain | ✓ ($0.00108, 3560ms) | ✓ ($0.00392, 29449ms) | 3.6× | 8.3× |
| t02 | multi-hop-trivia | ✓ ($0.00213, 2519ms) | ✓ ($0.00240, 31514ms) | 1.1× | 12.5× |
| t03 | deductive-logic | ✓ ($0.00052, 5364ms) | ✓ ($0.00242, 20287ms) | 4.6× | 3.8× |
| t04 | string-manip | ✓ ($0.00102, 4895ms) | ✓ ($0.00243, 80247ms) | 2.4× | 16.4× |
| t05 | counting | ✓ ($0.00286, 7347ms) | ✓ ($0.00565, 53155ms) | 2.0× | 7.2× |
| t06 | date-arith | ✓ ($0.00084, 5773ms) | ✓ ($0.00199, 18798ms) | 2.4× | 3.3× |
| t07 | unit-convert | ✓ ($0.00383, 10240ms) | ✓ ($0.00408, 76237ms) | 1.1× | 7.4× |
| t08 | percent-compound | ✓ ($0.00232, 4597ms) | ✓ ($0.00246, 23639ms) | 1.1× | 5.1× |
| t09 | syllogism | ✓ ($0.00029, 6286ms) | ✓ ($0.00180, 14698ms) | 6.2× | 2.3× |
| t10 | set-ops | ✓ ($0.00111, 4970ms) | ✓ ($0.00255, 27185ms) | 2.3× | 5.5× |

Wrapper is cost-overhead AND latency-overhead on every single task. No exceptions.

### Axis-by-axis interpretation

**Cost axis: definitively FAIL.** The compound architecture issues 5+ sub-calls per task (1 plan + N≈3 leaves + 3 synthesis + 1 verifier ± 1 retry). Even though each sub-call is cheaper than the baseline frontier call, the aggregate cost is ~2× higher. This is structural to compound-LLM and won't change with harder benchmarks.

**Latency axis: definitively FAIL.** Five sequential pipeline stages (plan → leaves → synthesis → verify → optional retry) cannot beat a single frontier call. Parallel leaf execution helps within a stage, but cannot reduce the count of sequential stages. Wrapper P50 is ~5.5× slower than baseline P50.

**Completion axis: INCONCLUSIVE.** Both arms scored 100% on the 10-task benchmark. The benchmark exhibits a *ceiling effect* — tasks were chosen for closed-form deterministic answers and proved well within `gpt-5`'s single-call capability. Cannot distinguish wrapper from baseline at this benchmark difficulty. **No verdict on the smart-axis claim is supported by this data.** A harder benchmark (TB-medium / TB-hard system tasks like cheapllm v1's TB-3 where baseline scored 33%, GPQA-Diamond, BIG-Bench-Hard reasoning slice) would be needed to discriminate.

### Wrapper trace observations

- Plan-decompose averaged 3-5 steps per task
- Verifier (claude-haiku-4.5) approved most candidates without retry; retry rate low
- `selectBestSynthesis` heuristic (longest-output) is naive — verifier-scored selection would be EXPECTED-tier upgrade

## Ethical considerations

This experiment's design and disclosure protocol follow Khazīna atoms 0010 (cross-witness honesty) and 0013 (calibration-discipline-as-credential). The experiment was pre-registered with kill-criteria before any code ran (atom 0011: smallest distinguishing experiment first). The FAIL outcome is reported in full, with per-task data, and used to inform downstream scope decisions rather than hidden or reframed.

Atom 0015 (research-pipeline overstates base-model-specific transfer) **fires here**: the research-supported lift estimates that backed the wrapper claims (Snell ICLR 2025 +5-15pp on hard reasoning; Self-Consistency Wang 2022 +18pp on math; Adaptive-TTC 7-8.5pp on Level 3) **did not transfer** to the cheapcode-auto-vs-gpt-5 comparison on this benchmark — partly because the benchmark didn't exercise the regime those papers measured (hard ceiling effects), partly because compound-cost/latency overhead dominates at this difficulty.

## Caveats and recommendations

### Caveats

1. **Benchmark ceiling.** The N=10 closed-form curated benchmark is too easy to discriminate the smart-axis claim. Both arms saturate at 100%. Future Arm A iteration MUST use a harder benchmark.
2. **One benchmark-author error caught.** t05-counting's gold was wrong ("8" vs true "9"). Surfaced via re-scoring; both arms had answered the true value. Documents the importance of post-hoc gold-audit.
3. **Compound-cost/latency penalties are structural.** Even if a harder benchmark surfaced a smart-axis lift, cost ≤0.30× and latency ≤0.70× targets would remain hard to meet — the wrapper has 5+ sequential stages by construction.
4. **Wrapper used `gpt-5-mini` for smart-tier, not flagship.** The compound bet is that ensembling cheaper-than-frontier models beats raw frontier. With `gpt-5-mini` as the smart-tier (per Phase 0 model picks), the bet is steeper.
5. **Cross-model verifier is `claude-haiku-4.5`** — competent but cheaper than synthesis tier. Verifier may rubber-stamp wrong answers more than a stronger verifier would. Did not surface as an issue in this run (tasks were easy).

### Recommendations

Per SPEC Revision 2026-05-02f Phase 2 FAIL outcome ("Revert SPEC Revision 2026-05-02d's wrapper provisions; ship cheapcode at M1.0's narrower niche framing only"):

1. **Ship cheapcode v1.0 at narrower scope.** No 3-axis comprehensive-dominance claim. The 5-tier registration + zero-patch architecture is the v1.0 deliverable. The auto wrapper is preserved as experimental code (not default-on); v1.x can iterate on a harder benchmark.
2. **Reframe auto-tier description honestly.** Per atom 0013: "auto tier exists; comprehensive-dominance over raw frontier was tested and not supported by this experiment; the wrapper code is preserved for v1.x research."
3. **Update PLAN.bn:** set `obs_phase_2_experiment_1_fails_all_axes = True`. The cheapcode_v1_ships discharge is correctly falsified per the falsified_when chain → narrower discharge needed.
4. **Atom 0015 fires.** Record this as the canonical M3.x firing — research-grounded compound-LLM claims overstated when transferred to specific cost/latency comparison vs single-frontier baseline.
5. **Future work (v1.x):** if the smart-axis claim is to be revived, run on a harder benchmark where baseline doesn't saturate. Candidates: TB-medium/hard system tasks (cheapllm v1's harness available), GPQA-Diamond, BIG-Bench-Hard reasoning slice. Use a stronger smart-tier (e.g., `gpt-5` flagship as smart, `gpt-5-mini` as cheap) — but accept the cost penalty grows further.

## Pointer for next agent

This verdict triggers the SPEC Phase 2 FAIL action. Cascade in M3.12:
- SPEC Revision 2026-05-03k documenting the FAIL + scope narrowing
- MAIN.md restored to narrower v1.0 (similar to M3.8 but now experiment-grounded)
- PLAN.bn updates per `obs_phase_2_experiment_1_fails_all_axes = True`
- atom 0015 firing logged in daftar + (optionally) khazina cross-reference
