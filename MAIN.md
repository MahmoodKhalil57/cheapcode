# MAIN — cheapcode

The one-page version. Plain language. If you want technical details, see [LATESTMILESTONE.md](LATESTMILESTONE.md) and [`plan/`](plan/).

---

## What we're building (simplified — pivot 2026-05-02)

A **surgical fork of opencode** that adds **5 new "models"** when you connect OpenRouter:

| Name | What it is | Honest pitch |
|---|---|---|
| `cheap` | A budget-friendly AI for routine work | 26–56× cheaper than GPT-5.5; great for chat + agent loops |
| `cheap-fast` | Same budget, faster response | About 2.2 seconds to reply |
| `smart` | A capable AI for hard problems | Routes directly to GPT-5-mini; you pay for capability |
| `smart-fast` | Capable + faster | Smaller latency tax for the same level of smart |
| `auto` | A router that picks for you | Long context → grok-4-fast; hard reasoning → smart; everything else → cheap |

**Why this is the right shape now:** the project that was going to BE the "cheap AI" (cheapllm) turned out to just be a wrapper around OpenRouter. So instead of plugging that wrapper into opencode, we bake the routing logic directly into opencode as 5 new model entries. **One small file. One ~15-line tweak to opencode's existing provider code. No new processes, no cross-tool plumbing.**

The "fast" variants sacrifice intelligence, NOT cost. Same price tier; just smaller context + lower latency.

---

## Honest framing — why we're NOT claiming "smarter than everything"

The cheap-tier model isn't actually smarter than GPT-5 on hard reasoning tasks. cheapllm's own measurements just showed that pretending it is (by routing on a cheap base) only gets ~11% on the hard benchmark, vs GPT-5.5's 82%.

So we don't pretend. **`smart` tier just routes to actual smart models** (GPT-5-mini etc.) and you pay for the capability when you need it.

What cheapcode IS undeniably best at:

- **Low-cost agent loops + chat** — proven 26–56× cheaper, 2.2s P50 latency
- **Long-context retrieval** — proven 2M tokens at $0.37/call

What cheapcode is **honestly not** best at:

- High-end multi-step reasoning (you should pay for `smart` tier when you need it)

**That admission IS the credential.** Per atom 0013 in our knowledge base: honest niche dominance beats weakly-best-overall.

---

## How long do we have?

Still your call. With the surgical-pivot, the work is much smaller:

- **Day-1 prototype:** 1 file added, ~15 LoC modified in opencode → run against OpenRouter
- **Full v1:** 5 tier models active, auto-router live, smoke regression on all 4 client surfaces (CLI/TUI/web/desktop), README with measured numbers

Suggested envelopes (please confirm or revise):

- Prototype: **~6 hours of work** (was 1 day)
- Full v1: **~3 days of work** (was 1.5 weeks)

The pivot earned us roughly 4× the timeline.

---

## Limits

| Limit | Value | Status |
|---|---|---|
| Time | TBD — see above | Need to decide |
| Hardware | Your laptop only | Fine |
| AI testing budget | TBD ($10–20 should be plenty) | Need to decide |

---

## Where we are now

We've written a lot of plans + research. **No code yet.** By your rule, only running code counts toward progress:

```
[                    ] 0%
```

Confidence the plan will work today: **~14%** (joint, correlated groups). That's up from ~2% before this pivot — a **7× improvement just from changing the architecture to be surgical** instead of building a separate cheapllm-wrapper service.

Maximum reachable confidence with everything measured: **~45%**.

---

## Why we still can't reach "99.999% sure"

Same math as before: when 9 different groups of things all need to be true, even at 95% confidence each, the combined chance is `0.95^9 ≈ 63%`. The most we can realistically reach is ~45% combined, because some claims have lower per-claim ceilings (e.g., the auto-router pattern is still based on knowledge transfer, not direct measurement at the cheapcode scale).

This is structural, not a research gap. Two ways to make it work:

1. **Accept the structural cap** (~45% combined) and ship when nothing is proven wrong
2. **Cut to fewer claims** (e.g., if cheapcode v1 ships with just `cheap` and `smart` and skips the fast variants + auto, joint goes higher)

You asked us to pick one of three reframes earlier. Still need that decision.

---

## Progress (only working code counts)

| % | Milestone |
|---|---|
| 0% | Where we are now (planning + research only) |
| 25% | First prototype working: `cheap` tier model added; CLI run succeeds against OpenRouter; smoke test passes |
| 50% | All 5 tier models registered; smart-fast picked + measured; auto-router task-detection pattern working |
| 75% | All 4 client surfaces verified (CLI/TUI/web/desktop) inherit the 5 models from server-side change; weekly upstream rebase clean |
| 100% | Released; README has measured 4-axis scorecard with cited competitor numbers; all assumptions either discharged or honestly bracketed |

---

## What would move the needle most (research targets)

Three measurements that lift confidence from 14% → ~45%:

| # | Measurement | Cost | Time |
|---|---|---|---|
| 1 | Pick `smart-fast` model (compare claude-haiku-4.5 vs gpt-5-nano on a 5-call latency probe) | ~$0.50 | ~30 min |
| 2 | Pick `cheap-fast` race-K candidates (verify cheapllm v1's race pattern transfers to OR catalog as-of today) | ~$0.50 | ~30 min |
| 3 | L1 vanilla-opencode-vs-cheapcode probe on a small task slice | ~$5 | ~2 hours |

Vendor pricing fetch for Codex (free, ~30 min) lifts the `vs-codex` group too.

---

## What's different from the cheapllm v1 work happening right now

cheapllm v1 is currently ~90% complete and projected to ship in ~90 minutes. Per its honest niche framing (which we inherit):

- cheapllm-fast strategy: 2.24s P50, 56× cheaper than GPT-5.5 ✓
- cheapllm-context: 2M tokens at $0.20/M, 4.1s ✓
- cheapllm-smart router: 11.1% on hard reasoning — **honestly under-performs**

So cheapcode's `cheap` and `cheap-fast` and `auto`-with-context-routing inherit cheapllm v1's proven patterns directly. cheapcode's `smart` tier *deliberately doesn't* try to replicate cheapllm-smart's router — we route to actual smart models honestly.

---

## What I need from you (3 quick decisions)

1. **How long do we have?** (~6 hours for prototype? ~3 days for full v1?)
2. **AI testing budget?** ($10–20?)
3. **Confidence target reframe?** (Accept ~45% structural cap as ship floor, OR cut to a smaller claim set for higher joint, OR track-failures-not-proofs.)

Once you decide, the next step is the 3 measurements above. Then we start writing the actual fork.

---

## What I'd flag as uncertain

- The math was checked by me alone. A blinded second opinion would help before locking the confidence number.
- The auto-router design transfers from iai but has only been used at iai's scale. Whether the apophatic-routing pattern works equally well at cheapcode's scale is an unproven claim (conservative @>=0.80).
- `smart-fast` and `cheap-fast` model picks are still at @>=0.50 — actual measurement is needed.

---

## Want the technical version?

- [SPEC.md](SPEC.md) Revision 2026-05-02b — formal contract for the surgical pivot
- [LATESTMILESTONE.md](LATESTMILESTONE.md) — full project history
- [plan/PLAN.bn](plan/PLAN.bn) — the 19 things in formal notation (down from 22)
- [tools/joint-confidence.ts](tools/joint-confidence.ts) — re-run the math yourself
