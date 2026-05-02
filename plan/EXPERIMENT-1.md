# EXPERIMENT-1 — 3-axis comprehensive-dominance experiment (revised 2026-05-03h)

**Status:** pre-registered. Kill-criteria written before the experiment runs.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), Khazīna atom 0010 (blinded-independent-witness pass — applied as cross-MODEL verifier), Khazīna atom 0016 (substrate-as-deterministic-verifier-head — the arm-split hypothesis), Mizaj rule 01 (falsifier-first), Mizaj rule 11/14 (substrate calibration axes used inside the verifier pass).

**Gates:** the 3-axis comprehensive-dominance claim in [`SPEC.md`](../SPEC.md) Revision 2026-05-02d, plus the substrate-marginal-lift claim in Revision 2026-05-03h. PASS-A on the 3-axis claim unlocks the wrapper. PASS-B (substrate adds ≥5pp marginal lift) unlocks substrate-verifier as a runtime head; PASS-A-only with FAIL-B keeps substrate as build-time discipline only.

---

## Question

Can `cheapcode-auto` (the wrapper using GPT-5.5 + Claude Opus + Gemini-pro internally via best-of-K + cross-model verification + plan-decompose + retry-with-feedback) achieve **all three** of the following on a pre-registered TB-medium/hard slice, vs raw GPT-5.5 single-call?

- **Cheaper:** wrapper cost ÷ raw cost ≤ 0.30 (3× cheaper or better)
- **Faster:** wrapper P50 latency ÷ raw P50 latency ≤ 0.70 (30% faster or better)
- **Smarter (multistep only):** wrapper completion rate ÷ raw completion rate ≥ 1.10 (10% higher or better) on **multistep hard reasoning tasks specifically**

All three simultaneously. If any axis misses, the comprehensive-dominance claim is falsified on that axis. Single-step tasks are explicitly out of scope (Revision 2026-05-02e); we don't claim smarter there.

## Why this specific shape

Per the operator's instruction (M1.2): if cheapcode is allowed to call frontier models internally, the wrapper is NOT bounded by single-model capability — best-of-K + cross-model ensemble + verification has well-documented lift on hard benchmarks (AlphaCode-2 beat raw Gemini; METR's verification-augmented Claude evals show consistent 5–15% lift). The wrapper captures that lift while routing routine work to cheap-tier so *average* cost + latency stay below raw frontier.

Per atom 0013 (calibration-as-credential): we don't claim "smarter than GPT-5.5" via cheap-base pretense (that's cheapllm-smart's failure). We claim "smarter than raw single-call GPT-5.5" via transparent ensemble methods. The disclosure of HOW is the credential.

## Procedure

1. **Pin baseline:** raw GPT-5.5 single-call on the multistep slice. Record completion rate, cost-per-task, P50 latency. Use cheapllm's existing TB harness; this is L1.
2. **Pin Arm A — wrapper without substrate verifier (MIN tier, ~350 LoC):**
   - Plan-decompose call (1× frontier-tier per task, GPT-5.5)
   - Execute leaves in parallel at cheap-tier (deepseek-v4-flash)
   - Best-of-K=3 synthesis at frontier-tier (3× GPT-5.5 samples)
   - Cross-model verifier (1× Claude Opus or Gemini-pro)
   - Retry once with explicit feedback if cross-model verifier disagrees
3. **Pin Arm B — Arm A + substrate verifier pass (≤100 additional LoC, cell #19):**
   - Same pipeline as Arm A through best-of-K synthesis
   - **Insert substrate verifier pass** between best-of-K and cross-model verifier:
     - `tools/audit-verify.sh` walks isnad chains in any cited receipt
     - `tools/joint-confidence.ts` recomputes per-step
     - atom-0015 transfer-overstated detector on extrapolation steps
     - GRADE 5-domain check on any L3+ source cited in synthesis
   - If substrate confidence < threshold: retry-with-substrate-feedback (1× max, before cross-model verifier runs)
   - Cross-model verifier and final retry as in Arm A
4. **Run baseline + Arm A + Arm B on same N=10 multistep slice.** Same prompts, same task order, same model versions. Record per-task completion + cost + latency for each arm.
5. **Compute four numbers:**
   - Three ratios for Arm A vs raw baseline (cost / latency / completion) — the comprehensive-dominance claim.
   - One delta for Arm B vs Arm A (completion-rate difference, in pp) — the substrate-marginal-lift claim.

## Pre-registered kill-criteria

### Arm A — comprehensive-dominance claim (Arm A vs raw baseline)

| Outcome | Definition | Action |
|---|---|---|
| **PASS-IDEAL** | All 3 ratios meet target on N=30, AND cross-model verification active | Ship `auto` with full wrapper. IDEAL LoC budget unlocked. Comprehensive-dominance claim is defensible. |
| **PASS-EXPECTED** | All 3 ratios meet target on N=30, but at MIN-tier wrapper (no cross-model, just best-of-K) | Ship `auto` with EXPECTED-tier wrapper. Investigate why cross-model didn't lift further. |
| **PASS-MIN** | All 3 ratios meet target on N=10 probe but margins narrow on N=30 | Ship `auto` at MIN tier. Disclose narrow margins in scorecard. |
| **PARTIAL** | 2 of 3 axes meet target | Re-frame claim to those 2 axes. Drop the missed-axis claim. |
| **FAIL** | ≤1 of 3 axes meets target, OR completion rate below baseline | Comprehensive-dominance claim is dead. Revert SPEC Revision 2026-05-02d; ship cheapcode at M1.0's narrower niche. |

### Arm B — substrate-marginal-lift claim (Arm B vs Arm A)

Per SPEC Revision 2026-05-03h. The substrate-as-runtime-verifier-head hypothesis is the one being tested here, separately from Arm A's comprehensive-dominance claim. The two are independent — Arm B can PASS while Arm A FAILs and vice versa.

| Outcome | Definition | Action |
|---|---|---|
| **PASS-B-CLEAR** | completion-rate(Arm B) − completion-rate(Arm A) ≥ 10pp on N=10 multistep slice; latency ratio Arm B / Arm A ≤ 1.30 (substrate adds ≤30% latency) | Ship `auto` with substrate verifier pass on by default. Atom 0016 admitted to khazīna with successful evidence. |
| **PASS-B-NARROW** | (B − A) ≥ 5pp AND latency ratio ≤ 1.30 | Ship `auto` with substrate verifier pass on by default; disclose narrow margin. |
| **PASS-B-LATENCY-COST** | (B − A) ≥ 5pp BUT latency ratio > 1.30 | Ship `auto` with substrate verifier off by default, on by config flag. Disclose the cost/quality trade in scorecard. |
| **FAIL-B** | (B − A) < 5pp regardless of latency | Substrate stays as build-time-only discipline. Revert SPEC Revision 2026-05-03h's runtime integration. Atom 0015 fires on the substrate-as-runtime-verifier hypothesis; atom 0016 records `failed_transformations` evidence. |

## Cost / time budget (revised 2026-05-03h per arm split)

- Wall-clock: ≤ 3 hours (run automated; 10 tasks × ~10 min × 3 arms ≈ 2.5h; plus analysis)
- Spend: ≤ **$5** (raw GPT-5.5 baseline ≈ $2; Arm A ≈ $2 for K=3 + cross-model; Arm B adds ≈ $0.50 — substrate ops are free, only the optional retry-with-substrate-feedback adds tokens; margin $0.50)
- Halt: if budget exceeds 1.5× without resolution, the wrapper is structurally too expensive — collapse to FAIL outcome on whichever arm overran.

**Scope narrowing per Revision 2026-05-02e:** N=10 multistep tasks (TB-medium / TB-hard with explicit multi-step structure). This discriminates the Arm A comprehensive-dominance claim with a 95% binomial CI of ±0.16 on completion rate — sufficient when the target is ≥1.10× baseline. For Arm B vs Arm A, paired-difference at N=10 has a tighter CI (each task is its own control), so the 5pp threshold is detectable.

## Why this is sufficient (atom 0010 cross-witness applies twice)

1. **Inside the wrapper:** the cross-MODEL verifier (different frontier model than synthesizer) is itself an atom 0010 application — second-pass blind to first.
2. **At the experiment level:** the experiment is cross-witness on cheapcode's own claim — does the ensemble-augmented wrapper beat raw single-call on all 3 axes, or does the wrapper consume the savings + speed it claims to produce?

If both passes converge (PASS criteria + internal cross-model consistently catches confident-wrong), the claim is robust.

## Artifacts

- `runs/experiment-1-attempt-1/baseline-raw-gpt55.jsonl` — per-task baseline metrics
- `runs/experiment-1-attempt-1/arm-a-no-substrate.jsonl` — per-task wrapper metrics WITHOUT substrate verifier pass
- `runs/experiment-1-attempt-1/arm-b-with-substrate.jsonl` — per-task wrapper metrics WITH substrate verifier pass
- `runs/experiment-1-attempt-1/3-axis-comparison.md` — Arm A vs baseline (cost / latency / completion ratios)
- `runs/experiment-1-attempt-1/substrate-marginal.md` — Arm B vs Arm A (paired completion-rate delta + latency overhead)
- `runs/experiment-1-attempt-1/verdict.md` — combined outcome (Arm A verdict + Arm B verdict) + kill-criterion citation, structured per Model Cards format (Mitchell et al. 2019; SPEC Revision 2026-05-02g adoption 1) sections "Quantitative analyses" + "Caveats and recommendations". Verdict feeds directly into Phase 4 README without restructuring. Atom 0016 evidence (successful or failed transformation) updated based on Arm B verdict.

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

Per Mizaj rule 01: if **Arm A** returns FAIL, the wrapper LoC investment (cells #14, #18 in SPEC) is unjustified. Revert SPEC Revision 2026-05-02d's wrapper provisions; ship cheapcode v1 with cheapllm v1's narrow niche framing only.

If **Arm A** returns PARTIAL, reframe claims to the 2 axes that passed. Don't ship a comprehensive-dominance README that 1 axis falsifies.

If **Arm B** returns FAIL, ship cheapcode without substrate-runtime-verifier integration. Revert SPEC Revision 2026-05-03h's runtime cell (#19); substrate stays as build-time discipline. Atom 0016 records `failed_transformations` evidence and atom 0015 fires on the substrate-as-runtime-verifier hypothesis — the project keeps its calibration-discipline credibility precisely BECAUSE the negative result is reported, not hidden.
