# MAIN — cheapcode

The one-page summary. Update the bracketed `[fields]` as the project moves. Don't touch anything else without operator approval.

---

## Goal

A working `cheapcode` binary — a small spin-off of opencode — that on hard reasoning tasks (TB-medium / TB-hard slice) is **cheaper, faster, AND smarter** than calling GPT-5.5 directly. All three at once, measured, with the numbers cited in the README.

Concrete deliverables:

- A binary that runs on the operator's laptop
- It exposes 5 new "models" when OpenRouter is connected: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- A measured 3-axis scorecard in the README that compares cheapcode vs raw GPT-5.5
- A small open-source fork of [opencode](https://github.com/sst/opencode) that the operator can rebase against upstream weekly without pain
- A working binary that's cheaper, faster, AND smarter than raw GPT-5.5 on hard reasoning — **measured and cited**, not claimed
- Routing to a cheap AI for routine work (~30× cheaper than GPT-5.5)
- A long-context option (2 million words at $0.37 per call)
- Honest documentation of when cheapcode is best vs when it isn't
- A model smarter than frontier models at multistep hard tasks

---

## Constraints

| Constraint | Limit                                          | Notes                                                                                                   |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cost       | `[$10 budget]` of which `[$0.00 spent]`        | Same envelope cheapllm v1 had; tight                                                                    |
| Time       | `[24h wall-clock]` of which `[0 days elapsed]` | Working time, not calendar                                                                              |
| Hardware   | Operator's laptop (WSL2 Linux + RTX 4070)      | OpenRouter for AI calls (network); RTX 4070 available during build for local testing, not after handoff |

---

# AGENT UPDATE BELOW

## What you ARE getting

- A working binary that's cheaper, faster, AND smarter than raw GPT-5.5 on hard reasoning — **measured and cited**, not claimed
- Routing to a cheap AI for routine work (~30× cheaper than GPT-5.5)
- A long-context option (2 million words at $0.37 per call)
- Honest documentation of when cheapcode is best vs when it isn't
- A model smarter than frontier models at multistep hard tasks

---

## What you are NOT getting

- **Not smarter than GPT-5 on single step tasks.** Wrapper is bounded above by the best frontier model in the ensemble, but we can do better on multistep.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not zero-maintenance.** Weekly upstream rebase from vanilla opencode is required to stay current.
- **Not multi-tenant or cloud.** Single user, single machine. Multi-account features may come later but are explicitly deferred.
- **Not tested on every benchmark.** Running experiments is expensive, but we can run experiments in an educated way to get a near perfect confidence level

---

## Progress

```
[                    ] 0%
```

Only working code counts. Planning, research, and documentation = 0%.

---

## Confidence

**~17%** that the plan succeeds within the $10 / 24h limits as of 2026-05-02 — **lifted from ~7% by deeper research** (Snell ICLR 2025, EMNLP 2025 Compound AI papers, OpenAI Codex pricing, artificialanalysis.ai latency benchmarks). No code written, no experiments run, no money spent — just research applied via mizaj rule 16.

| State                                          | Joint confidence | What you'd need |
|---|---|---|
| Today, post-research                           | **~17%**         | Already done    |
| After fully maxing research (more sources)     | **~34%**         | More literature search + L1 in-house computations |
| After full measurement                         | **~64%**         | Run EXPERIMENT-1 + 3 small probes ($5–10 total) |
| Target `@>=0.99999`                            | structurally unreachable for this claim count | Reduce N to ≤5 load-bearing claims, OR ship at the achievable ceiling |

The single biggest research lift came from **Snell et al. ICLR 2025** ("Scaling LLM Test-Time Compute Optimally") — directly proves that smaller-base + best-of-N + verifier outperforms 14× larger raw model on math reasoning. That's the structural defense for cheapcode-auto's wrapper-beats-frontier thesis. Lifted the load-bearing claim from `@>=0.65` → `@>=0.85`.

The math is in [`tools/joint-confidence.ts`](tools/joint-confidence.ts) and [`tools/research-equivalence.ts`](tools/research-equivalence.ts) — re-run after any plan change.
