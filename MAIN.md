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

| Constraint | Limit | Notes |
|---|---|---|
| Cost | `[$50 budget]` of which `[$0.00 spent]` | Includes EXPERIMENT-1 + measurements |
| Time | `[1 week wall-clock]` of which `[0 days elapsed]` | Working time, not calendar |
| Hardware | Operator's laptop (WSL2 Linux, no GPU) | OpenRouter for AI calls (network) |

---

## Progress

```
[                    ] 0%
```

Only working code counts toward this bar. Planning, research, and documentation = 0%.

| % | Milestone | Status |
|---|---|---|
| 25% | Five tier models registered; `cheap` works against OpenRouter; CLI smoke pass | `[ ]` |
| 50% | EXPERIMENT-1 PASS; basic `auto` wrapper shipped (plan + best-of-K + verify) | `[ ]` |
| 75% | Full wrapper (cross-model verify + retry + parallel exec); all 4 client surfaces verified | `[ ]` |
| 100% | Released; README has measured 3-axis scorecard | `[ ]` |

---

## What you ARE getting

- A working binary that's cheaper, faster, AND smarter than raw GPT-5.5 on hard reasoning — **measured and cited**, not claimed
- Routing to a cheap AI for routine work (~30× cheaper than GPT-5.5)
- A long-context option (2 million words at $0.37 per call)
- Honest documentation of when cheapcode is best vs when it isn't
- A small enough codebase that one person can maintain it (target ≤900 lines added)

---

## What you are NOT getting

- **Not smarter than GPT-5 (the tier above 5.5).** Wrapper is bounded above by the best frontier model in the ensemble.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not zero-maintenance.** Weekly upstream rebase from vanilla opencode is required to stay current.
- **Not multi-tenant or cloud.** Single user, single machine. Multi-account features may come later but are explicitly deferred.
- **Not tested on every benchmark.** EXPERIMENT-1 covers TB-medium / TB-hard reasoning slice. Not coding agent benchmarks, not math olympiad, not video. Future work.
- **Not 99.999% confident before shipping.** That's mathematically impossible for a multi-claim project; ship floor is "no falsifier triggered" (per current confidence math, ~30% joint at full measurement).

---

## How to update this file (high-school version)

- **`[$0.00 spent]`** — bump up as you spend money on tests/experiments
- **`[0 days elapsed]`** — bump as work happens
- **`[0%]` and the bar** — fill in `█` blocks as milestones complete (each milestone = 25%; 5 blocks per milestone)
- **`[ ]` boxes** — change to `[x]` when milestone completes

Don't change the goal, constraints, what-you-are-getting, or what-you-are-NOT-getting sections without operator approval. The plan + how lives in [`SPEC.md`](SPEC.md), [`plan/PLAN.bn`](plan/PLAN.bn), and [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — those change as evidence comes in.

---

## Where to dig deeper (technical reading)

- [SPEC.md](SPEC.md) — the formal contract
- [plan/PLAN.bn](plan/PLAN.bn) — every load-bearing claim with falsifiers
- [plan/EXPERIMENT-1.md](plan/EXPERIMENT-1.md) — the discriminating experiment that gates the wrapper
- [LATESTMILESTONE.md](LATESTMILESTONE.md) — full project history
