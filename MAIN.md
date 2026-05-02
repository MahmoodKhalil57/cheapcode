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

---

## Constraints

| Constraint | Limit                                          | Notes                                                                                                  |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cost       | `[$10 budget]` of which `[$0.00 spent]`        | Same envelope cheapllm v1 had; tight                                                                   |
| Time       | `[24h wall-clock]` of which `[0 days elapsed]` | Working time, not calendar                                                                             |
| Hardware   | Operator's laptop (WSL2 Linux + RTX 4070)      | OpenRouter for AI calls (network); RTX 4070 available during build for local testing, not after handoff |

---

## What you ARE getting

- A working binary that's cheaper, faster, AND smarter than raw GPT-5.5 on hard reasoning — **measured and cited**, not claimed
- Routing to a cheap AI for routine work (~30× cheaper than GPT-5.5)
- A long-context option (2 million words at $0.37 per call)
- Honest documentation of when cheapcode is best vs when it isn't
- A small enough codebase that one person can maintain it (target ≤900 lines added)
- A model smarter than frontier models at multistep hard tasks

---

## What you are NOT getting

- **Not smarter than GPT-5 on single step tasks.** Wrapper is bounded above by the best frontier model in the ensemble, but we can do better on multistep.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not zero-maintenance.** Weekly upstream rebase from vanilla opencode is required to stay current.
- **Not multi-tenant or cloud.** Single user, single machine. Multi-account features may come later but are explicitly deferred.
- **Not tested on every benchmark.** Running experiments is expensive, but we can run experiments in an educated way to get a near perfect confidence level

---

## How to update this file (high-school version)

- **`[$0.00 spent]`** — bump up as you spend money on tests/experiments
- **`[0 days elapsed]`** — bump as work happens
- **`[0%]` and the bar** — fill in `█` blocks as milestones complete (each milestone = 25%; 5 blocks per milestone)

Don't change the goal, constraints, what-you-are-getting, or what-you-are-NOT-getting sections without operator approval. The plan + how lives in [`SPEC.md`](SPEC.md), [`plan/PLAN.bn`](plan/PLAN.bn), and [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — those change as evidence comes in.

---

## Progress

```
[                    ] 0%
```

Only working code counts. Planning, research, and documentation = 0%.

---

## Confidence

**~7%** that the plan succeeds within the $10 / 24h limits as of 2026-05-02 (post operator-tightened constraints + multistep-scoped smarter claim).

This is the joint confidence across 27 load-bearing claims in [`plan/PLAN.bn`](plan/PLAN.bn). It is intentionally low pre-experiment; running EXPERIMENT-1 (~$5, ~3h) + a few small measurements lifts it toward the structural ceiling.

| State | Joint confidence |
|---|---|
| Now | **~7%** |
| After research synthesis only (no experiments) | ~19% |
| After full measurement | ~29% |
| Target `@>=0.99999` | structurally unreachable for this claim count |

To raise this number further: pick fewer load-bearing claims (e.g., 5 instead of 27, joint can hit ~80%), or run the measurements, or both. See [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) Revision 2026-05-02-mizaj-16 for the structural cap explanation.
