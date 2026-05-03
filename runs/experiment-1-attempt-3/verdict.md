# EXPERIMENT-1 Arm A attempt-3 (AIME 2024) — Partial Verdict

**Date:** 2026-05-03
**Status:** PARTIAL — experiment killed at task 4 wrapper after 50+ min hang on 2024-I-11
**N_complete_pairs:** 3 of 10 planned
**N_orphan_baselines:** 1 (2024-I-11 baseline completed; wrapper hung)
**Spend:** $0.23 cumulative on attempt-3 (cumulative experiment-1 across 3 attempts: $0.39 of $5 envelope; 7.8% used)

---

## Why partial

The wrapper for 2024-I-11 (combinatorics-symmetry, regular-octagon vertex coloring, gold=371) hung for ~50 min after baseline gpt-5 took ~227s and answered incorrectly (got 367, gold 371). Bun process held a socket (sleeping state) without producing output beyond the baseline write.

Hypothesis: one of the parallel sub-calls in the wrapper pipeline (3-leaf parallel + 3-synthesis parallel) hung at the OpenRouter API level — likely a rate-limit retry loop or a long-tail reasoning request with no timeout. The compound architecture's sequential pipeline combined with parallel within-stage means a single hung sub-call blocks the whole task.

Process killed manually after 50+ min. N=3 complete pairs salvaged.

## Quantitative analyses (N=3 paired tasks)

| Axis | Baseline (gpt-5) | Wrapper | Ratio | Target | Pass |
|---|---:|---:|---:|---:|:---:|
| Cost | $0.1478 | $0.0807 | **0.546×** | ≤0.30 | ✗ (but BEST attempt yet — narrows from 1.85× / 1.33×) |
| Latency P50 | 83,503 ms | 418,887 ms | **5.016×** | ≤0.70 | ✗ (structural; consistent across all 3 attempts) |
| Completion | 100.0% | 100.0% | **1.000×** | ≥1.10 | ✗ (ceiling on N=3; both arms 3/3 on logarithms / rect-circle / tangent-circles) |

### Per-task breakdown (N=3 complete + 1 orphan)

| Task | Baseline | Wrapper |
|---|:---:|:---:|
| 2024-I-2 logarithms (gold=25) | ✓ ($0.0092, 12s) | ✓ ($0.0112, 59s) |
| 2024-I-5 geometry-rect-circle (gold=104) | ✓ ($0.0708, 210s) | ✓ ($0.0233, 419s) |
| 2024-I-8 geometry-tangent-circles (gold=197) | ✓ ($0.0677, 84s) | ✓ ($0.0462, 833s) |
| 2024-I-11 combinatorics-symmetry (gold=371) | **✗** ($0.1575, 227s) — answered 367 | (hung; killed) |

## Key finding: cost ratio narrowed when baseline reasoning grew

Across the 3 paired tasks, wrapper was cheaper-per-task than baseline on tasks 5 and 8 (the ones where gpt-5 spent ~$0.07 each on extensive reasoning). The wrapper's cheap-tier leaves don't run gpt-5-class reasoning, so they keep the wrapper's per-task cost down even when the syntheses use gpt-5-mini.

This is a softening of the "compound architecture costs more" finding — on **hard** tasks where baseline reasoning blows up, compound can actually be cheaper. Still doesn't clear the 0.30× target, but the trend is toward operator-friendly cost on real workloads.

## What we WOULD have learned if wrapper completed task 4

2024-I-11 was the **first task in this 3-attempt experiment series where baseline failed**. Baseline gpt-5 spent $0.16 + 227s and answered 367 (off by exactly 4 from gold 371). If wrapper had run and gotten 371 right via best-of-K=3 + verifier, that would have been the **first L1 own-measurement evidence for the smart-axis claim**.

We don't have it. The wrapper hung. This is a methodological lesson: the wrapper needs per-call timeouts to prevent indefinite hangs.

## Caveats

1. **N=3 is too small to make load-bearing claims.** The 0.546× cost ratio is from 3 tasks; high variance.
2. **Wrapper hang is a real bug.** Production-quality wrapper needs per-call timeouts (Promise.race with a deadline) + structured retry logic.
3. **Smart-axis still untested.** All 3 paired tasks were baseline-success cases. Task 4 was the discriminating opportunity and we lost it to the hang.
4. **Atom 0009 + 0015 firings:** the wrapper hang itself is a transfer-overstated firing (atom 0015) — research-grounded compound architectures don't necessarily ship with production-grade reliability when implemented in 396 LoC of MIN-tier code.
5. **Cumulative total across attempts 1+2+3:** N=2 of 23 task-runs measured baseline failure (1 in attempt-1 vowel-count from a benchmark-author error since corrected; 1 in attempt-3 here). Net N=1 baseline failure where wrapper might have helped — and we didn't get the wrapper data.

## Implications for v1.0 ship

Per M3.12 reframe (SPEC Revision 2026-05-03k), this experiment was **supplementary, not load-bearing**. The cheapcode v1.0 discharge claim is `cheapcode_general_agent_routes_optimally` — failure-mode-aware routing — not `cheapcode_auto_3_axis_dominance` (the old compound-wrapper bet which M3.11+M3.11b already falsified).

This partial verdict feeds **routing rule 7** (multistep-general → strongest frontier, NO compound default):
- Cost evidence: wrapper narrows on hard tasks but doesn't clear 0.30× on N=3
- Latency evidence: wrapper structurally 5× slower (consistent finding across 3 attempts)
- Smart-axis evidence: untested due to wrapper hang on the discriminating task
- **Routing rule 7 holds** — the experimental data continues to support no-compound-default for general multistep, until we have evidence to flip it on a specific task signature

## Recommendations

1. **Rule 7 stays "no compound default."** Three attempts; cost+latency definitively fail; smart-axis still untested; production-quality issues (hang) emerged.
2. **v1.x: implement per-call timeouts in the wrapper.** Promise.race with deadline at each stage. Without this, compound is unsuitable for production.
3. **v1.x: re-run AIME slice on a wrapper with timeouts.** The 2024-I-11 datapoint (baseline ✗) is the kind of evidence we need; recover it.
4. **Phase 5 ship can proceed.** v1.0 doesn't depend on this experiment passing — the load-bearing claim is the routing intelligence per M3.12.

## Pointer for next agent

- Files: `benchmark-aime.ts`, `run-experiment-3.ts`, `rescore-partial.ts`, `results.jsonl` (7 lines), `console.log`, `3-axis-comparison-partial.json`, this verdict.
- Killed bun PID 65358 manually after 50+ min hang.
- M3.13 commit closes this attempt with the partial verdict; M3.13 doesn't change v1.0's load-bearing claims.
- Phase 5 ship-tag can proceed once Phase 3 dispatch smoke (M3.15) passes — independent of this experiment.
