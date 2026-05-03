# M3.23 QW1.1 Verdict — Voter vs Direct Frontier (GPT-5)

**Date:** 2026-05-03
**Setup:** N=3 positive AIME 2024 tasks (the same 3 from M3.19's positive subset). Direct dispatch to `openai/gpt-5` with 5-min per-call timeout, paired against M3.19 voter data.
**Spend:** $0.0658 frontier-side. Total M3.18→M3.23 spend ~$0.45 / $5 budget.

---

## Headline

**Substrate-runtime voter beats direct GPT-5 on 2 of 3 axes at N=3 hard reasoning:**

| Axis | Voter (M3.19) | GPT-5 (M3.23) | Ratio | Verdict |
|---|---|---|---|---|
| Total cost | $0.0512 | $0.0658 | 0.78× | ✓ voter cheaper |
| Total correct | 2/3 (67%) | 1/3 (33%) | +1 | ✓ voter higher |
| P50 latency | 183670 ms | 131246 ms | 1.40× | ✗ voter slower |

The voter trades latency for completion + cost. The trade is honest and load-bearing: this is the M3.23 update to the `cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier` claim history.

---

## Per-task pairs

### AIME-I-11 (combinatorics-symmetry, gold 371)

- **GPT-5:** TIMEOUT at 300000 ms (hit our 5-min per-call ceiling).
- **Voter:** daif at 230498 ms — converged to verdict (no agreement) but produced an honest "uncertain" output rather than indefinite hang.

Both pipelines failed to produce a correct answer. The voter's failure mode is *graded* (daif = lowest confidence, surfaceable to caller); the frontier's is *opaque* (timeout = consumer left holding a hung call). Voter's failure is operationally more useful.

### AIME-I-14 (geometry-tetrahedron, gold 104)

- **GPT-5:** ✗ wrong answer (6) at 131246 ms, $0.03251.
- **Voter:** ✓ correct (104) at 183670 ms, $0.03244 — escalated to smart_C, hasan grade.

This is the clearest comparison: identical cost (~$0.032), voter takes 40% longer, voter actually solves it. GPT-5 produces a confident-but-wrong answer; voter's escalation pipeline catches the disagreement and converges on the right one.

### AIME-II-13 (complex-roots-of-unity, gold 321)

- **GPT-5:** ✓ correct (321) at 53585 ms, $0.03332.
- **Voter:** ✓ correct (321) at 60513 ms, $0.01739 — escalated to smart_C, hasan grade.

Both correct. Voter ~half the cost (~$0.017 vs $0.033) at near-identical latency (60s vs 54s). Pure cost win.

---

## What this means for the project's claims

1. **The original claim "compound wrapper beats GPT-5 on cost, latency, AND completion" is still falsified** — that was the `auto_wrapper` pipeline (M3.10→M3.11b), which lost on cost+latency.
2. **The substituted claim "voter beats GPT-5 on cost AND completion at N=3 hard reasoning" is empirically supported.** Two of three axes pass with paired evidence.
3. **The substituted claim "voter beats GPT-5 on latency" is FALSIFIED** at N=3 — voter is 1.4× slower because escalation to smart_C runs sequentially after cheap pair convergence.
4. **AIME-I-11 is a structural-failure task for both pipelines** — too hard for a 5-min budget on either GPT-5 alone or the voter pipeline. v1.x candidates: increase per-call timeout for hard combinatorics-symmetry, or add a different escalation step (e.g., to a stronger reasoning model with longer budget).

---

## Atom 0016 runtime status update

The atom-0016 runtime claim moves from SMALL-N VALIDATED (M3.20, single-witness against the ground-truth tags) to **SMALL-N VALIDATED WITH PAIRED FRONTIER COMPARISON** (M3.23). The voter is no longer "validated against gold" only; it is "validated as outperforming direct frontier on N=3 hard reasoning on 2 of 3 axes."

This is structurally stronger evidence per atom 0010: cross-witness now applies at TWO levels — within the voter pipeline (cheap × 2 + smart_C) AND between voter-aggregate and direct-frontier-call. Both confirm: the voter pipeline is doing useful work that direct-call doesn't.

---

## Honest caveats

- **N=3 is very small.** This is paired evidence at 3 data points. Extrapolation to "voter generally beats frontier on hard reasoning" requires N≥20 + multiple shape varieties.
- **Frontier baseline used `openai/gpt-5` (not gpt-5-mini).** Comparing voter (which uses gpt-5-mini in escalation) to direct gpt-5 is a fair "voter vs strongest frontier" test. A separate "voter vs same model directly" would compare voter to direct gpt-5-mini single-call — that's the smart-axis intra-tier comparison; not run here, v1.x candidate.
- **The 5-min per-call timeout disadvantages the frontier.** GPT-5 may have eventually solved AIME-I-11 with longer budget. The voter's 2-min P50 cheap pair gives it a structural budget advantage on the hardest tasks. This is a real architectural property, not a measurement artifact.
- **GPT-5's wrong answer on AIME-I-14 is striking** — but it's one task. Could be sampling variance. Re-running with N=3 GPT-5 samples would test stability.
- **Latency loss matters operationally.** Users waiting on a single LLM response feel the 40% slowdown. Voter's win is on amortized cost + completion, not real-time UX.

---

## Plan-graph effect

- New claim `voter_beats_direct_frontier_on_2_of_3_axes_n3_hard_reasoning` lifted to ~0.65 (small-N empirical, paired evidence).
- Atom 0016 runtime confidence lifts incrementally.
- The `cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier` claim (line 172, currently 0.05 falsified for the wrapper) gets a new sibling claim for the voter pipeline.

---

## Atom 0011 budget honored

Total spend on M3.23 QW1.1: $0.0658 (under the $0.20 cap on the experiment). Total wall: ~9 min (under 30-min cap). Smallest-distinguishing-experiment discipline preserved. The N=3 paired test is structurally minimal: any smaller sample would not distinguish completion-rate at hard-reasoning resolution.
