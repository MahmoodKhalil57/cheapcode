# MAIN — cheapcode

The one-page version. Plain language. Technical files: [LATESTMILESTONE.md](LATESTMILESTONE.md), [`plan/`](plan/).

---

## What we're building

A **surgical fork of opencode** that adds **5 new "models"** when you connect OpenRouter:

| Name | What it is | Honest pitch |
|---|---|---|
| `cheap` | Budget AI for routine work | 26–56× cheaper than GPT-5.5; great for chat + agent loops |
| `cheap-fast` | Budget + faster | About 2.2 seconds to reply (race-K of cheap models) |
| `smart` | Capable AI, full price | Routes directly to GPT-5-mini; pay-for-capability |
| `smart-fast` | Capable + faster | Lower latency, same price tier |
| `auto` | Smart router that wraps your task in a reasoning loop | This is where cheapcode's hard-reasoning claim lives |

**One small file (~300–400 lines) + ~15-line tweak to opencode's existing OpenRouter code.** No new processes, no plumbing.

---

## Two honest claims (both backed by measurement, with a falsifier)

**Claim 1: cheapcode is undeniably best at low-cost agent loops + long-context retrieval.**
Inherited from cheapllm v1's measured receipts:
- 26–56× cheaper than GPT-5.5 on routine tasks (proven, $0.0015–0.0032/task)
- 2.2-second response time on typical chat (proven, P50 latency)
- 2 million words of context at $0.37 per call (proven, NIAH 2M PASS on grok-4-fast)

**Claim 2: cheapcode is best at high-end multi-step reasoning per dollar (NEW — refactored 2026-05-02c).**
This is the previously-disclaimed territory. We're now claiming it, but **only on a cost-adjusted basis**, and **only after EXPERIMENT-1 passes**. The honest shape:

> cheapcode's `auto` tier achieves ≥90% of raw GPT-5.5's task completion at ≤80% of raw GPT-5.5's cost on hard reasoning benchmarks.

We're NOT claiming we're smarter than GPT-5.5 on raw quality (that's impossible — the wrapper is bounded by the smart-tier model it uses). We ARE claiming we're cheaper-per-correct-task by amortizing the smart model's expensive calls across plan-decomposition, cross-witness verification, and retry-with-feedback.

**This claim currently sits at 50% confidence** — meaning it's a load-bearing hypothesis that needs measurement before we can defend it publicly. EXPERIMENT-1 (~$20, ~4 hours) is the experiment that decides PASS / PARTIAL / MARGINAL / FAIL.

---

## What `auto` actually does (the structured-reasoning wrapper)

When you send a task to `auto`, it:

1. **Detects the task type.** Long context (>128k tokens) → routes to grok-4-fast and stops here. Routine task → routes to `cheap` and stops here. Hard reasoning → continues to step 2.
2. **Plans.** Calls smart-tier ONCE to decompose the task into sub-tasks.
3. **Executes the plan.** Each sub-task runs through `cheap` tier. (This is where the cost amortization comes from — most of the work happens at cheap-tier price.)
4. **Verifies.** Calls smart-tier ONCE to check the assembled answer. Verifier hook (cheapllm v1 just shipped this) catches confident-wrong outputs.
5. **Cross-witness.** Calls smart-tier ONCE more, blind to the first synthesis. If both passes converge, high confidence. If they disagree, retry once with explicit feedback.

Total smart-tier calls: ~3 per hard task. A direct GPT-5.5 call would be 1 call but at full price; the wrapper's 3 cheaper-mini calls + N cheap-tier executions can come out cheaper if N is moderate. EXPERIMENT-1 measures whether it actually does.

---

## How long do we have?

The wrapper code adds maintenance burden — about 300–400 lines of structured-reasoning logic on top of the basic 5-tier registration. Updated estimates:

- **Day-1 prototype:** 5-tier registration (no wrapper) → ~6 hours
- **Wrapper v1:** + structured-reasoning loop → +~12 hours after EXPERIMENT-1 PASS
- **Full v1:** + smoke regression on all 4 client surfaces → ~1 week total

Falsifier-gate: if EXPERIMENT-1 FAILs, the wrapper code never gets written. We ship the 5 tiers without the hard-reasoning claim.

---

## Limits

| Limit | Value | Status |
|---|---|---|
| Time | TBD | Need to decide |
| Hardware | Your laptop only | Fine |
| AI testing budget | TBD ($30–50 for full validation including EXPERIMENT-1) | Need to decide |

---

## Where we are now

```
[                    ] 0%
```

Code: 0% (planning + research only).

**Confidence the plan will work today: ~4.5%.** Lower than the previous ~14% from M1.0 because we've added the hard-reasoning claim as a load-bearing assumption *without measurement yet*. That's HONEST — the new claim costs confidence until EXPERIMENT-1 lifts it.

**Post-measurement ceiling: ~36%.** Lower than the previous ~45% because more claims = more compositional dilution.

**This is the right move.** Adding the hard-reasoning claim raises ambition; we honestly admit it costs confidence; EXPERIMENT-1 is the gate that earns it back.

---

## Why we still can't reach "99.999% sure"

Same structural cap as before. With 10 groups of things that all need to hold, even at 95% per group, joint = `0.95^10 ≈ 60%`. Reality is lower because some groups (auto-wrapper, hard-reasoning) have ceilings around 85% even with measurement.

The structural limit is **~36% combined confidence at full measurement** — about 8× higher than today, but still below the 99.999% literal target. Same three reframings as before:

1. Accept ~36% as the ship floor (no claim falsified)
2. Cut to fewer claims (e.g., drop the hard-reasoning claim and revert to ~45% on the narrower plan)
3. Track failures, not proofs

You picked option (3) earlier? Or this is still pending. Let me know.

---

## Progress milestones (only working code counts)

| % | Milestone |
|---|---|
| 0% | Where we are now (planning + research) |
| 25% | First prototype: 5 tiers registered; `cheap` tier works against OpenRouter; CLI smoke pass |
| 50% | EXPERIMENT-1 PASS; basic `auto` wrapper (plan-decompose + verify) shipped |
| 75% | Full wrapper (cross-witness + retry); all 4 client surfaces verified |
| 100% | Released; README has measured 4-axis scorecard with hard-reasoning cost-adjusted scores cited |

---

## What would move the needle most (research targets)

The bottleneck claims today (each at 50–55%):

| # | Claim | Cost to lift | Time |
|---|---|---|---|
| 1 | `cheap-fast` and `smart-fast` model picks | $1 | ~1 hour |
| 2 | Verifier hook catches ≥50% confident-wrong | $2 | ~2 hours |
| 3 | Cross-witness convergence on hard reasoning | $3 | ~2 hours |
| 4 | Plan-decompose amortizes smart calls | $5 | ~3 hours |
| 5 | **EXPERIMENT-1: cost-adjusted hard-reasoning** | $20 | ~4 hours |

EXPERIMENT-1 is the load-bearing one. The others lift small claims; EXPERIMENT-1 decides whether the entire hard-reasoning claim is alive or dead.

Total budget for full validation: ~$30, ~12 hours. After all measurements: joint hits ~36%.

---

## What I'd flag as uncertain

- **The hard-reasoning claim is unproven yet.** EXPERIMENT-1 may FAIL. Plan accepts that explicitly: FAIL → revert to narrower niche, no wrapper code written.
- The math is single-witness (atom 0010 cycle's blinded second pass on the joint-confidence calculation is still deferred).
- Wrapper LoC budget creeping toward IDEAL (≤900) if we add adaptive K + tool-augmented retrieval features. MIN-tier wrapper (≤200 LoC, just plan + verify) might suffice — we'll know after EXPERIMENT-1.

---

## What I need from you (3 quick decisions)

1. **How long do we have?** (~6h prototype-only? ~1 week with wrapper?)
2. **AI testing budget?** ($30–50 for full validation including EXPERIMENT-1.)
3. **Confidence reframe?** (Pick option 1, 2, or 3 from above.)

Or: **skip the hard-reasoning claim and ship narrower.** Reverts to M1.0's 45% ceiling and ~14% current confidence. Smaller ambition, simpler code, faster ship.

---

## Want the technical version?

- [SPEC.md](SPEC.md) Revision 2026-05-02c — formal contract for the structured-reasoning wrapper
- [plan/EXPERIMENT-1.md](plan/EXPERIMENT-1.md) — the cost-adjusted hard-reasoning experiment with kill-criteria
- [LATESTMILESTONE.md](LATESTMILESTONE.md) — full project history
- [plan/PLAN.bn](plan/PLAN.bn) — the 24 things in formal notation
- [tools/joint-confidence.ts](tools/joint-confidence.ts) — re-run the math yourself
