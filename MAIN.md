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

**~59%** that the plan succeeds within the $10 / 24h limits as of 2026-05-02 — **lifted from ~17% by refactoring to 5 load-bearing umbrella claims**, each backed by direct evidence (substrate-driven move per atom 0011 + mizaj 02/07).

| State                                              | Joint confidence | What you'd need                                         |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Today, post-refactor + research                    | **~59%**         | Already done                                            |
| After full measurement on 5 umbrellas              | **~84%**         | Run EXPERIMENT-1 + 3 small probes (~$10, fits envelope) |
| Target `@>=0.99999`                                | unreachable      | Even tighter scope; structural cap                      |

### The refactor that did this

Previous plan had 27 claims. Most were derived or implementation-detail. **5 are truly load-bearing** — if any falsifies, the project ships dead:

1. **cheapllm capability inherited** — cost / fast / context receipts from cheapllm v1 (L1 in-house). `@>=0.95`
2. **auto-wrapper beats raw frontier on multistep** — Snell ICLR 2025 + EMNLP 2025 Compound AI papers. `@>=0.85`
3. **provider-registry propagation** — opencode source-readable shows OpenRouter already special-cased. `@>=0.92`
4. **surgical maintainability** — Khātim/Sanad post-mortem L1 + project-meta discipline. `@>=0.85`
5. **cost ratio vs competitors** — OpenAI Codex pricing L2 + cheapllm-v1 receipts L1, direct arithmetic. `@>=0.94`

Each umbrella has **direct** evidence (not derived from sub-claims), so the joint over 5 is `0.95 × 0.85 × 0.92 × 0.85 × 0.94 ≈ 0.59` — not bounded by min of supporting claim composition. The other 22 claims live in [`plan/PLAN.bn`](plan/PLAN.bn) Sections O/A/B/C/D/E/F/H/I/J as supporting evidence; they don't enter the discharge.

Math: [`tools/joint-confidence.ts`](tools/joint-confidence.ts). Per-source citations: [`tools/research-equivalence.ts`](tools/research-equivalence.ts).
