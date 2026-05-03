# EXPERIMENT-1 Arm A attempt-2 — Verdict (HARD benchmark)

**Date:** 2026-05-03
**Status:** Pre-registered FAIL outcome (0 of 3 axes pass post-rescoring)
**Format:** Model Card (Mitchell et al. 2019)
**Spend:** $0.117 (cumulative experiment-1: $0.163 of $5 envelope; 3.3% used)
**Wall:** ~10 min (parallel-friendly)

---

## Why a second attempt

Attempt-1 (M3.11) found both arms saturated at 100% on the simple-multistep benchmark (ceiling effect — couldn't discriminate). Attempt-2 retried on a hand-curated harder benchmark (10 problems requiring 3+ reasoning steps each, hand-verified gold with derivations).

## Quantitative analyses

| Axis | Baseline (gpt-5) | Wrapper | Ratio | Target | Pass |
|---|---:|---:|---:|---:|:---:|
| Cost | $0.0500 | $0.0666 | **1.332×** | ≤0.30 | ✗ |
| Latency P50 | 7.3s | 37.3s | **5.126×** | ≤0.70 | ✗ |
| Completion | 100.0% | 100.0% | **1.000×** | ≥1.10 | ✗ |
| **Outcome** | | | | | **FAIL (0/3)** |

After post-hoc Unicode-minus normalization fix (atom 0009 firing — see "Caveats"), both arms got 10/10 correct. Same ceiling effect as attempt-1.

## Per-task breakdown (after Unicode-fix rescoring)

| Task | Shape | Baseline | Wrapper |
|---|---|:---:|:---:|
| h01 | compound-percent | ✓ -0.6% | ✓ −0.6% |
| h02 | flight-schedule | ✓ 6:00 PM | ✓ 6:00 PM |
| h03 | deductive-chain | ✓ True | ✓ True |
| h04 | light-time | ✓ 12.7 min | ✓ 12.7 min |
| h05 | combinatorics | ✓ 2880 | ✓ 2880 |
| h06 | conditional-prob | ✓ 1/2 | ✓ 1/2 |
| h07 | inscribed-radius | ✓ 2 | ✓ 2 |
| h08 | leap-year-day | ✓ Saturday | ✓ Saturday |
| h09 | balls-prob | ✓ 15/22 | ✓ 15/22 |
| h10 | quadratic-positive | ✓ 2, 3 | ✓ 2, 3 |

10/10 both arms. **gpt-5 also saturates this benchmark.** It's not actually hard for gpt-5.

## Caveats and recommendations

### Caveats

1. **Atom 0009 firing again** — original scoring used ASCII-only normalization; gpt-5-mini wrapper output `−0.6%` (Unicode minus U+2212) for h01, which the matcher missed. Wrapper actually answered correctly. After Unicode-normalization fix, completion goes 90→100%. **This is the second benchmark-author error in two attempts** — strong signal that benchmark scoring should round-trip through both arms' actual outputs before publishing the headline.

2. **Hard-benchmark hypothesis falsified.** I assumed gpt-5 would miss ~30-50% on these hand-curated multistep problems. Empirically, gpt-5 hits 100% on math/logic problems with deterministic answers across the difficulty range I could construct. To get baseline below saturation, would need either a public benchmark (GPQA-Diamond, AIME 2024, BBH-hard reasoning slice) or domain-specific hard problems requiring out-of-training-distribution reasoning.

3. **Cost gap narrowed but still failing.** Hard tasks made baseline reasoning more expensive (1.332× wrapper-vs-baseline vs attempt-1's 1.855×). The structural cost overhead of compound architecture is partially compensated when baseline reasoning grows, but not enough to clear the ≤0.30 target. On problems where baseline reasoning blew up (h08 leap-year baseline at $0.017), wrapper was even MORE expensive ($0.028) due to its own reasoning amplification.

4. **Latency penalty unchanged.** ~5× slower regardless of difficulty. Sequential pipeline stages dominate.

5. **Completion: STILL inconclusive after two attempts.** The smart-axis claim is the operator's load-bearing concern, and across two benchmark designs (simple curated, hard curated) baseline gpt-5 has saturated and the wrapper has not had room to demonstrate lift. **The claim remains untested empirically**, not falsified.

### Recommendations

Substrate signal (atoms 0011 + 0015 + mizaj 16) prescribes:

- **Cost + latency claims**: definitively falsified by the cumulative $0.16 of measurements across 20 task-runs. The "cheaper + faster than raw frontier" framing of cheapcode auto-tier is wrong. **Drop these claims from cheapcode v1.0.**
- **Smart-axis claim**: not yet exercised. Two paths:
  - **(a) Accept untested + ship narrower** — cheapcode v1.0 = 5-tier registration only; auto wrapper preserved as experimental code; honest "smart-axis untested due to benchmark saturation in our $0.16 measurement window" disclosure. ~M3.8 + experiment-data-justified narrowing.
  - **(b) Run attempt-3 on a benchmark where gpt-5 doesn't saturate** — public download (GPQA-Diamond ~50-70% baseline, AIME 2024 ~60-80% baseline, BBH-hard reasoning slice ~70%) or harder hand-curated. Estimated +$1-3 spend, +1-2h wall.

Per atom 0011, the experiment must actually discriminate to count. After two attempts that don't discriminate, the discipline is to **stop iterating my-own-curation** and either move to a public hard benchmark (path b) OR accept the smart-axis as untested-pending-future-work (path a).

## Pointer for next agent

Surface to operator the cumulative evidence + path fork:

> Cost + latency: definitively FAIL (structural; falsified across 20 task-runs).
> Smart-axis: untested due to benchmark saturation across both attempts.
>
> Two paths:
> (a) Accept smart-axis as untested, ship cheapcode v1.0 narrower (5-tier registration; wrapper experimental). Atom 0013 honest disclosure.
> (b) Run attempt-3 on a public discriminating benchmark (GPQA-Diamond / AIME / BBH-hard). +$1-3, +1-2h.
>
> Operator decision needed before any narrowing or further spend.
