# MAIN — cheapcode

The one-page version. Plain language. If you want the technical details, see [LATESTMILESTONE.md](LATESTMILESTONE.md) and the files in [`plan/`](plan/).

---

## What we're building

A new version of **opencode** — opencode is a popular tool that helps developers chat with an AI to write code. We're making a spin-off that's:

- **Cheaper** (less money per task)
- **Faster** (lower waiting time)
- **Smarter** (better answers on real problems)

than every competitor: OpenAI Codex, the original opencode, Anthropic's Claude Code, Aider, Goose, Terminus, Cursor, Continue, Devin.

We do this by plugging in an AI we've already built called **cheapllm**. cheapllm is already proven to be:

- 26× cheaper than GPT-5.5
- About 2.2 seconds to respond (vs 5–15 seconds)
- Can read 2 million words of context (vs 1.05 million)

We add a thin layer on top that makes the AI more honest about what it knows (a "claim-shape addon" — basically a prompt that asks the AI to say "here's what I'm claiming, and here's how you could prove me wrong" instead of just answering).

---

## How long do we have?

**Not decided yet — your call.** Suggested:

- **Quick prototype (~1 day of work):** a basic version that works
- **Real version (~1.5 weeks of work):** full features, tested in all places opencode runs (terminal, IDE, web, desktop app)

Pick one or tell me different numbers.

---

## Limits

| Limit | What it is | Status |
|---|---|---|
| Time | How many hours of work we have | Need to decide |
| Hardware | Your laptop only — no special GPU | Fine |
| AI cost | A budget for paying the AI to run tests | Need to decide. cheapllm already has $10 reserved for itself; this fork needs its own number |

---

## Where we are right now

We've written a lot of plans and run research, but **no actual code yet**. By your rule, **only working code counts toward progress**, so:

```
[                    ] 0%
```

That's expected. We wanted to plan first.

---

## How sure are we the plan will work?

**Honest answer: about 2% right now.** That number sounds awful but here's what it actually means.

We broke the plan into **22 things that all have to be true** for the project to ship. Some are very likely true (like "cheapllm works" — we already measured it). Some are very uncertain (like "we beat Codex on cost" — we haven't checked Codex's prices yet). When you have to be right about *all* of them, the chances multiply.

### Why multiplying matters (the honest math)

Imagine you're throwing 22 darts at 22 targets and you need to hit *all* of them to win. Even if you're 95% accurate at each target, the chance of hitting all 22 in a row is `0.95 × 0.95 × ... × 0.95 = about 33%`. The more things you need right, the lower your combined chance — even when each individual thing is likely.

Right now, our weakest spots are at 30%, not 95%, so the combined chance is much lower than 33%. It's around 2%.

---

## You asked: can we get to 99.999% before writing code?

**Honest answer: no, and here's why.**

99.999% sure of *all 22 things at once* would require being **99.99955% sure of each one** — basically perfect on every claim. No amount of research can do that. Even when scientists measure something themselves, they're typically 95–99% sure, not 99.99955%.

**The best we can realistically reach with full testing is about 46% combined confidence.** That's the structural ceiling.

That sounds discouraging, but it just means **"99.999%" is the wrong target shape for this kind of project.** We have three options to reframe it:

| Option | What it means | Tradeoff |
|---|---|---|
| **1. Per-thing confidence** | Be 95% sure of each thing individually, ship when nothing has been proven wrong | Realistic — accept 46% combined as "good enough" |
| **2. Cut the plan smaller** | Reduce from 22 things to maybe 4 things. Then 95% × 95% × 95% × 95% = 81% combined | Tighter scope, fewer features |
| **3. Track failures, not proofs** | Instead of "are we sure it'll work?", ask "has anything broken yet?" | Most flexible, ships faster |

**You need to pick one.** All three are honest. None of them lets us literally claim 99.999% — that target is unreachable for this kind of project no matter how careful we are.

---

## What would move the needle most

Four weak spots are holding the confidence number down:

| # | Weak spot | Cost to fix | Time |
|---|---|---|---|
| 1 | We haven't looked up Codex's actual prices | Free | ~30 min |
| 2 | We haven't tested original opencode running on our cheapllm AI | ~$5 | ~2 hours |
| 3 | We're waiting on one final cheapllm test (already running) | Free | Just wait |
| 4 | We haven't proven the "smartness layer" idea actually helps | ~$1 | ~1 hour |

Doing all four moves us from **2% → about 46% confidence**. That's a 23× improvement.

After that, we'd start writing actual code.

---

## Progress bar (what would move it past 0%)

Once we start writing code:

| Progress | What it means |
|---|---|
| 0% | Where we are now (planning + research only) |
| 25% | First working version that runs against cheapllm. Basic test passes |
| 50% | The smartness benchmark works. Our prototype actually beats vanilla opencode |
| 75% | Works in all 4 places opencode runs (terminal, IDE, web, desktop) |
| 100% | Released, with measured numbers in the README that you can verify |

---

## What I need from you (3 quick decisions)

1. **How long do we have?** (1 day for prototype? 1.5 weeks for full? Different number?)
2. **What's our AI testing budget?** (Probably $10–20. Used for benchmarking.)
3. **Which confidence reframe?** (Option 1, 2, or 3 above. Pick one.)

Once you decide, the next step is the four measurements. They're cheap and quick. Then we start writing code.

---

## What I'd flag as honestly uncertain

- The math above was checked by me alone. Before you trust it for big decisions, an independent reviewer (a different AI looking at it without seeing my analysis) should double-check. That's queued but not done.
- The "smartness layer" idea (the claim-shape addon) is based on research papers, but those papers tested bigger AIs than cheapllm. We don't actually know yet if the same trick works for a smaller, cheaper AI. That's what measurement #4 above tests.

---

## Want the technical version?

- [SPEC.md](SPEC.md) — formal contract with all the details
- [LATESTMILESTONE.md](LATESTMILESTONE.md) — full project history
- [plan/PLAN.bn](plan/PLAN.bn) — the 22 things in formal notation
- [plan/MAIN.bn](plan/MAIN.bn) — the audit that produced the math above
- [tools/joint-confidence.ts](tools/joint-confidence.ts) — re-run the math yourself
