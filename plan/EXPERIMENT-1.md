# EXPERIMENT-1 — cost-adjusted hard-reasoning discriminating experiment

**Status:** pre-registered. Kill-criteria written before the experiment runs.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), Mizaj rule 01 (falsifier-first), Khazīna atom 0010 (blinded-independent-witness pass — applied as the cross-witness pattern inside the wrapper).

**Gates:** the hard-reasoning honest claim in [`SPEC.md`](../SPEC.md) Revision 2026-05-02c. PASS unlocks the structured-reasoning wrapper as a load-bearing tier; FAIL collapses cheapcode back to cheapllm v1's narrower niche framing.

---

## Question

Can `cheapcode-auto` (the structured-reasoning wrapper: plan-decompose + execute-leaves + verify + cross-witness + retry-with-feedback) achieve **≥90% of raw GPT-5.5's task completion rate at ≤80% of raw GPT-5.5's cost** on a TB-medium/hard slice?

- **YES** → cost-adjusted dominance on high-end multi-step reasoning is a defensible claim; ship the wrapper as part of `auto`.
- **NO** → fall back to cheapllm v1's niche framing; remove the hard-reasoning claim from MAIN.md and SPEC.

## Why this specific shape

The honest move per atom 0013 (calibration-as-credential) and atom 0015 (transfer overstated by default) is to claim cost-adjusted dominance, not raw-quality dominance. Quality is bounded by the smart-tier base model — no wrapper makes it smarter than it is. The wrapper's contribution is *amortizing smart-tier calls across decomposition + cross-witness*, so we spend less per task at near-frontier quality.

cheapllm v1 already proved the cost+speed+context axes work at frontier-level; the unproven piece is whether the wrapper's amortization pattern holds for hard reasoning. cheapllm-smart's K=1+router got 11.1% — the wrapper's structured loop is structurally different (decomposes the task instead of routing the whole task to one model).

## Procedure

1. **Pin baseline:** raw GPT-5.5 (not via wrapper) on N=20 TB-medium + N=10 TB-hard tasks. Record completion rate, cost-per-task, time-per-task. Use cheapllm's existing TB harness; this is an L1-receipt baseline.
2. **Pin wrapper version:** minimal `cheapcode-auto` wrapper (~300 LoC) with:
   - Plan-decompose call (1× smart-tier per task)
   - Execute leaves (cheap-tier per leaf)
   - Verify call (1× smart-tier per task)
   - Cross-witness call (1× smart-tier blind, second pass)
   - Retry once on verifier disagreement (max 1 retry)
3. **Run wrapper on the same N=30 task slice.** Record same metrics.
4. **Compute:** completion-rate ratio (wrapper ÷ baseline) and cost ratio.

## Pre-registered kill-criteria

| Outcome | Definition | Action |
|---|---|---|
| **PASS** | wrapper completion ≥0.90 × baseline AND wrapper cost ≤0.80 × baseline | Hard-reasoning claim is defensible. Ship `auto` with wrapper. |
| **PARTIAL** | wrapper completion ≥0.85 × baseline AND wrapper cost ≤0.85 × baseline | Cost-adjusted niche is real but tighter than claimed. Update SPEC's quantitative claims and ship. |
| **MARGINAL** | wrapper completion ≥0.80 × baseline AND wrapper cost ≤0.95 × baseline | Wrapper barely justifies LoC; ship only if `cheap` + `smart` tiers fully validated. |
| **FAIL** | wrapper completion <0.80 × baseline OR wrapper cost ≥baseline | Hard-reasoning claim is dead. Remove from SPEC + MAIN.md; revert to cheapllm v1's narrow niche framing. |

## Cost / time budget

- Wall-clock: ≤ 4 hours (run is automated; 30 tasks × ~5min each = 2.5h, plus analysis)
- Spend: ≤ $20 (raw GPT-5.5 on 30 TB tasks ≈ $5–10; wrapper ≈ $3–6; analysis margin $5)
- Halt: if budget exceeds 1.5× without resolution, the wrapper is too expensive even if it works on capability — collapse to FAIL outcome.

## Why this experiment is sufficient (atom 0010 cross-witness)

Cross-witness applies twice in this experiment:

1. **Inside the wrapper:** the wrapper's verify+cross-witness pass is itself an atom 0010 application — second smart-tier sample blind to the first.
2. **At the experiment level:** the experiment is a cross-witness on cheapcode's own claim — does the structured-reasoning approach actually beat raw frontier on cost-adjusted, or does the wrapper just consume the savings it claims to produce?

If both passes converge (wrapper survives PASS criteria AND its internal cross-witness consistently catches confident-wrong), the claim is robust. If only one passes, partial. If neither, fail.

## Artifacts

- `runs/experiment-1-attempt-1/baseline-raw-gpt55.jsonl` — per-task baseline metrics
- `runs/experiment-1-attempt-1/wrapper-cheapcode-auto.jsonl` — per-task wrapper metrics
- `runs/experiment-1-attempt-1/cost-adjusted-comparison.md` — the headline ratio computation
- `runs/experiment-1-attempt-1/verdict.md` — PASS / PARTIAL / MARGINAL / FAIL with kill-criterion citation

## Daftar receipt

```
bun ~/apps/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="EXPERIMENT-1 verdict: <PASS|PARTIAL|MARGINAL|FAIL>" \
  --body="<one-paragraph summary citing wrapper-vs-baseline ratios + artifact paths>"
```

## Out of scope

- Beating raw GPT-5.5 on raw quality (impossible — wrapper is bounded above by base model).
- Beating GPT-5 (not GPT-5.5) — escalation tier; if needed, run a follow-up.
- Long-context tasks — already handled by the long-context special-case routing through grok-4-fast (separate measurement).
- TB-easy — too easy to discriminate; cheap-tier handles it.

## Halt condition for the larger plan

Per Mizaj rule 01, if EXPERIMENT-1 returns FAIL, the wrapper LoC investment (cell #18 in SPEC) is unjustified. Revert SPEC Revision 2026-05-02c's wrapper provisions; ship cheapcode v1 with cheapllm v1's narrower niche framing (`smart` tier routes directly, no wrapper claim).
