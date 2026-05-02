# MAIN — cheapcode

The one-page version. Plain language. Technical files: [LATESTMILESTONE.md](LATESTMILESTONE.md), [`plan/`](plan/).

---

## What we're building

A **surgical fork of opencode** that adds **5 new "models"** when you connect OpenRouter:

| Name | What it is | Honest pitch |
|---|---|---|
| `cheap` | Budget AI for routine work | 26–56× cheaper than GPT-5.5 |
| `cheap-fast` | Budget + faster | ~2.2 second responses |
| `smart` | Capable AI, full price | Routes directly to GPT-5-mini etc. |
| `smart-fast` | Capable + faster | Lower latency, same price |
| `auto` | The smart wrapper | The 3-axis-dominance route |

**`auto` is where the bold claim lives.**

---

## The bold claim — 3-axis dominance over raw GPT-5.5

**cheapcode-auto is a lot cheaper, a lot faster, AND smarter than calling GPT-5.5 directly** — on hard reasoning tasks.

Why this is even structurally possible: cheapcode-auto is *allowed to call GPT-5.5 (and Claude Opus, and Gemini-pro) internally*. So it isn't bounded by any single model's quality. The wrapper combines them with ensemble methods that consistently lift hard-benchmark scores by 5–15% (well-documented: AlphaCode-2 beat raw Gemini, METR's verification-augmented Claude evals).

**Pre-registered targets** (cheapcode-auto vs raw single-call GPT-5.5 on hard reasoning):

| Axis | Target ratio | What it means |
|---|---|---|
| Cost per task | ≤ 0.30× | At least 3× cheaper |
| Latency P50 | ≤ 0.70× | At least 30% faster |
| Completion rate | ≥ 1.10× | At least 10% better |

**All three must hit. Any one missing = claim falsified on that axis.**

---

## How `auto` actually pulls this off

Routine tasks → `cheap` tier (most of your queries; ~30× cheaper, faster). Long-context → `grok-4-fast` (cheap on the long-context slice).

**Hard reasoning → the wrapper:**

1. **Plan-decompose.** GPT-5.5 makes ONE call to break the task into sub-tasks.
2. **Execute leaves in parallel.** Sub-tasks run on `cheap` tier (deepseek-flash). This is where the cost drops — most of the work is done at 1/30th the price.
3. **Synthesize, best-of-3.** Three independent GPT-5.5 samples produce candidate answers.
4. **Cross-model verify.** A *different* frontier model (Claude Opus, e.g.) checks the answer. Different models catch different errors — that's the ensemble lift.
5. **Retry with feedback.** If verifier disagrees, one more attempt with explicit error feedback.

So a hard task uses ~5 frontier calls (1 plan + 3 best-of + 1 verify) instead of 1 raw call — but most of the actual work runs at cheap-tier price, and the parallel execution keeps latency under raw single-call. The MATH works out cheaper because cheap-tier is so much cheaper.

---

## Why we can claim "smarter" honestly

Single-call GPT-5.5 at 82% on hard reasoning is one data point. Best-of-3 GPT-5.5 + cross-model Claude verifier + retry should hit 87–92% (literature consistent with this lift). That's the "smarter" claim — not smarter than the *underlying models*, smarter than calling any one of them once.

Per atom 0013 in our knowledge base: disclosing how we do this (transparent ensemble, no proprietary trick) IS the credential. We're not pretending cheap-base is secretly smart; we're being honest about using ensemble methods.

---

## How long do we have?

The wrapper now budgets ~500–1000 lines of code (up from ~300 in the previous plan). Updated estimates:

- **Day-1 prototype:** 5 tiers registered, no wrapper → ~6 hours
- **Wrapper MIN tier:** plan + best-of-K + verify → +~1 day after EXPERIMENT-1 PASS-MIN
- **Wrapper EXPECTED tier:** + cross-model + retry + parallel exec → +~2 days after PASS-EXPECTED
- **Wrapper IDEAL tier:** + adaptive K + tool-augmented retrieval → +~3 days after PASS-IDEAL

LoC budget gates the build: each tier of code is unlocked by a measurement. If MIN tier kill-criteria FAIL, no further code written.

Total worst-case: ~1 week of work, gated by EXPERIMENT-1 outcomes at each tier.

---

## Limits

| Limit | Value | Status |
|---|---|---|
| Time | TBD | Need to decide |
| Hardware | Your laptop only | Fine |
| AI testing budget | TBD ($50 for full EXPERIMENT-1 + 4 axis lifts) | Need to decide |

---

## Where we are now

```
[                    ] 0%
```

Code: 0%.

**Confidence the plan will work today: ~3.2%.** Lower than the previous ~4.5% because the bigger ambition adds more load-bearing claims; each unmeasured claim multiplies down.

**Post-measurement ceiling: ~29%.** Lower than M1.1's ~36% — the 3-axis comprehensive-dominance claim has 3 independent failure modes (cost / latency / completion) and adding ensemble-method claims lengthens the chain.

**This is honest.** Bigger ambition = lower joint confidence until measured. EXPERIMENT-1 (~$50, ~6 hours) is the gate that earns it back if the ensemble method actually beats raw frontier on all 3 axes.

---

## Why we still can't reach "99.999% sure"

Even less reachable now. With 11 correlated groups at ~85% per group, joint = `0.85^11 ≈ 16.7%` post-measurement. The structural cap on this composition is **~29%**.

Three reframings still stand:

1. Accept ~29% as ship floor (no claim falsified)
2. Cut to fewer claims (drop best-of-K or cross-model to reduce N)
3. Track failures, not proofs

Or: **build the system as ambitiously as the operator just specified, run EXPERIMENT-1, and let the measurement decide how much of the comprehensive-dominance claim survives.** That's the discipline path.

---

## Progress milestones

| % | Milestone |
|---|---|
| 0% | Where we are now (planning + research) |
| 25% | 5 tiers registered; `cheap` tier works against OpenRouter; CLI smoke pass |
| 50% | EXPERIMENT-1 PASS-MIN; basic wrapper (plan + best-of-K + verify) shipped |
| 75% | EXPERIMENT-1 PASS-EXPECTED; cross-model + retry + parallel exec; all 4 client surfaces verified |
| 100% | Released; README has measured 3-axis scorecard cited against raw GPT-5.5 |

---

## What would move the needle most

| # | Claim | Cost | Time |
|---|---|---|---|
| 1 | EXPERIMENT-1 (the comprehensive 3-axis test) | $30–50 | ~6 hours |
| 2 | `cheap-fast` and `smart-fast` model picks | $1 | ~1 hour |
| 3 | Codex / vendor pricing fetch | free | ~30 min |
| 4 | L1 vanilla-opencode-vs-cheapcode probe | $5 | ~2 hours |

EXPERIMENT-1 is THE load-bearing measurement. It decides the comprehensive-dominance claim alive vs dead. If FAIL, we revert to a narrower v1 and skip the wrapper entirely.

After all four: joint hits ~0.29 (the structural ceiling).

---

## Three honest concerns

1. **The 3-axis claim is bold.** Hitting all three of cheaper-by-3× AND faster-by-30% AND smarter-by-10% simultaneously is demanding. EXPERIMENT-1 may return PARTIAL (hits 2 of 3), in which case we reframe to those 2 axes.
2. **The ensemble lift is research-transferred, not yet measured at cheapcode's scale.** Per atom 0015 (transfer overstated), the literature's 5–15% lift might land at the low end (5%) for our slice.
3. **LoC budget tripled from M1.0** (≤200 → ≤900 EXPECTED). Khātim/Sanad warned us about LoC creep. We accept it because the big claim requires the wrapper code; falsifier-gated tiers cap the damage if measurement fails.

---

## What I need from you (3 quick decisions)

1. **How long do we have?** (~1 week worst-case for full v1?)
2. **AI testing budget?** ($50 for EXPERIMENT-1 + the smaller measurements?)
3. **Confidence reframe?** (Accept ~29% ship floor / cut claims to raise joint / track failures.)

Or: **skip EXPERIMENT-1 and revert to M1.0's narrower niche.** Cheaper code, simpler claims, but back to the "no hard-reasoning claim" framing.

---

## Want the technical version?

- [SPEC.md](SPEC.md) Revision 2026-05-02d — formal contract for the 3-axis-dominance wrapper
- [plan/EXPERIMENT-1.md](plan/EXPERIMENT-1.md) — the discriminating experiment with PASS-IDEAL / PASS-EXPECTED / PASS-MIN / PARTIAL / FAIL outcomes
- [LATESTMILESTONE.md](LATESTMILESTONE.md) — full project history
- [plan/PLAN.bn](plan/PLAN.bn) — 27 things in formal notation
- [tools/joint-confidence.ts](tools/joint-confidence.ts) — re-run the math
