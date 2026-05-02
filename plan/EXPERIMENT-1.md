# EXPERIMENT-1 — 3-axis comprehensive-dominance experiment (revised 2026-05-02d)

**Status:** pre-registered. Kill-criteria written before the experiment runs.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), Mizaj rule 01 (falsifier-first), Khazīna atom 0010 (blinded-independent-witness pass — applied as cross-MODEL verifier inside the wrapper).

**Gates:** the 3-axis comprehensive-dominance claim in [`SPEC.md`](../SPEC.md) Revision 2026-05-02d. PASS unlocks the structured-reasoning wrapper as a load-bearing tier; FAIL collapses cheapcode to cheapllm v1's narrower niche framing.

---

## Question

Can `cheapcode-auto` (the wrapper using GPT-5.5 + Claude Opus + Gemini-pro internally via best-of-K + cross-model verification + plan-decompose + retry-with-feedback) achieve **all three** of the following on a pre-registered TB-medium/hard slice, vs raw GPT-5.5 single-call?

- **Cheaper:** wrapper cost ÷ raw cost ≤ 0.30 (3× cheaper or better)
- **Faster:** wrapper P50 latency ÷ raw P50 latency ≤ 0.70 (30% faster or better)
- **Smarter:** wrapper completion rate ÷ raw completion rate ≥ 1.10 (10% higher or better)

All three simultaneously. If any axis misses, the comprehensive-dominance claim is falsified on that axis.

## Why this specific shape

Per the operator's instruction (M1.2): if cheapcode is allowed to call frontier models internally, the wrapper is NOT bounded by single-model capability — best-of-K + cross-model ensemble + verification has well-documented lift on hard benchmarks (AlphaCode-2 beat raw Gemini; METR's verification-augmented Claude evals show consistent 5–15% lift). The wrapper captures that lift while routing routine work to cheap-tier so *average* cost + latency stay below raw frontier.

Per atom 0013 (calibration-as-credential): we don't claim "smarter than GPT-5.5" via cheap-base pretense (that's cheapllm-smart's failure). We claim "smarter than raw single-call GPT-5.5" via transparent ensemble methods. The disclosure of HOW is the credential.

## Procedure

1. **Pin baseline:** raw GPT-5.5 single-call on N=20 TB-medium + N=10 TB-hard tasks. Record completion rate, cost-per-task, P50 latency. Use cheapllm's existing TB harness; this is L1.
2. **Pin wrapper version (MIN tier, ~350 LoC):**
   - Plan-decompose call (1× frontier-tier per task, GPT-5.5)
   - Execute leaves in parallel at cheap-tier (deepseek-v4-flash)
   - Best-of-K=3 synthesis at frontier-tier (3× GPT-5.5 samples)
   - Cross-model verifier (1× Claude Opus or Gemini-pro)
   - Retry once with explicit feedback if verifier disagrees
3. **Run wrapper on same N=30 task slice.** Record same metrics.
4. **Compute three ratios.** All three must clear targets for PASS.

## Pre-registered kill-criteria

| Outcome | Definition | Action |
|---|---|---|
| **PASS-IDEAL** | All 3 ratios meet target on N=30, AND cross-model verification active | Ship `auto` with full wrapper. IDEAL LoC budget unlocked. Comprehensive-dominance claim is defensible. |
| **PASS-EXPECTED** | All 3 ratios meet target on N=30, but at MIN-tier wrapper (no cross-model, just best-of-K) | Ship `auto` with EXPECTED-tier wrapper. Investigate why cross-model didn't lift further. |
| **PASS-MIN** | All 3 ratios meet target on N=10 probe but margins narrow on N=30 | Ship `auto` at MIN tier. Disclose narrow margins in scorecard. |
| **PARTIAL** | 2 of 3 axes meet target | Re-frame claim to those 2 axes. Drop the missed-axis claim. |
| **FAIL** | ≤1 of 3 axes meets target, OR completion rate below baseline | Comprehensive-dominance claim is dead. Revert SPEC Revision 2026-05-02d; ship cheapcode at M1.0's narrower niche. |

## Cost / time budget

- Wall-clock: ≤ 6 hours (run automated; 30 tasks × ~7 min = 3.5h, plus analysis + retry on flaky)
- Spend: ≤ $50 (raw GPT-5.5 baseline ≈ $5–10; wrapper ≈ $15–25 for K=3 + cross-model on 30 tasks; analysis margin $15)
- Halt: if budget exceeds 1.5× without resolution, the wrapper is structurally too expensive — collapse to FAIL outcome.

## Why this is sufficient (atom 0010 cross-witness applies twice)

1. **Inside the wrapper:** the cross-MODEL verifier (different frontier model than synthesizer) is itself an atom 0010 application — second-pass blind to first.
2. **At the experiment level:** the experiment is cross-witness on cheapcode's own claim — does the ensemble-augmented wrapper beat raw single-call on all 3 axes, or does the wrapper consume the savings + speed it claims to produce?

If both passes converge (PASS criteria + internal cross-model consistently catches confident-wrong), the claim is robust.

## Artifacts

- `runs/experiment-1-attempt-1/baseline-raw-gpt55.jsonl` — per-task baseline metrics
- `runs/experiment-1-attempt-1/wrapper-cheapcode-auto.jsonl` — per-task wrapper metrics
- `runs/experiment-1-attempt-1/3-axis-comparison.md` — the headline ratios (cost / latency / completion)
- `runs/experiment-1-attempt-1/verdict.md` — outcome + kill-criterion citation

## Daftar receipt

```
bun ~/apps/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="EXPERIMENT-1 verdict: <PASS-IDEAL|PASS-EXPECTED|PASS-MIN|PARTIAL|FAIL>" \
  --body="<3-axis ratios + artifact paths + outcome reasoning>"
```

## Out of scope

- Beating GPT-5 (a tier above 5.5) — escalation tier not under test.
- TB-easy — too easy to discriminate.
- Long-context tasks — handled by separate routing through grok-4-fast (separate measurement).

## Halt condition for the larger plan

Per Mizaj rule 01: if EXPERIMENT-1 returns FAIL, the wrapper LoC investment (cells #14, #18 in SPEC) is unjustified. Revert SPEC Revision 2026-05-02d's wrapper provisions; ship cheapcode v1 with cheapllm v1's narrow niche framing only.

If EXPERIMENT-1 returns PARTIAL, reframe claims to the 2 axes that passed. Don't ship a comprehensive-dominance README that 1 axis falsifies.
