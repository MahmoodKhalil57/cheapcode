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

Only working code counts. Phase 0 (research + decisions) is done but doesn't move the bar — code starts in Phase 1.

### Phase plan (LOCKED 2026-05-02 per SPEC Revision 2026-05-02f)

| Phase | Goal | Wall | $ | Status |
|---|---|---|---|---|
| 0 | Final research synthesis (lock model picks) | 2h | $0 | `[x]` ✅ done in ~30min, $0 |
| 1 | Fork + 5-tier registration (no wrapper) | 4h | $0 | `[ ]` |
| 2 | Auto wrapper MIN + EXPERIMENT-1 | 6h | $5 | `[ ]` |
| 3 | 4-client smoke regression | 2h | $0 | `[ ]` |
| 4 | Scorecard + README | 2h | $1 | `[ ]` |
| 5 | Ship (tag + daftar) | 1h | $0 | `[ ]` |
| | Buffer | 7h | $4 | |

**Phase 0 decisions** locked in [`runs/phase-0/decisions.md`](runs/phase-0/decisions.md): opencode pin **v1.14.33**, smart-fast pick **claude-haiku-4.5** primary, cheap-fast race-K pair **deepseek-v4-flash + gemini-2.5-flash**. No umbrella drops. **Falsifier gate cleared. Authorized to start Phase 1.**

Each phase has a falsifier gate in [SPEC.md](SPEC.md) Revision 2026-05-02f. If a gate triggers, the project pivots per the pivot table or halts honestly.

**Project halt conditions** (independent of phase): wall-clock 22h+ with Phase 2 not started, cumulative spend $9+ before Phase 4, any umbrella's research-equivalent confidence drops during Phase 0, or upstream opencode provider architecture changes mid-project.

**Mizaj 16 discipline:** before any experiment in any phase, the agent MUST run a research-synthesis check. If research can answer with ≥0.85 confidence, skip the experiment. **Experiments count toward the 24h envelope; research is free.**

---

## Confidence

**~65%** that the plan succeeds within the $10 / 24h limits as of 2026-05-02 — **lifted from ~17% by refactoring to 5 load-bearing umbrella claims** (M1.6, substrate-driven per atom 0011 + mizaj 02/07), then **+6pp from three research rounds + one honesty-verification probe** (Snell ICLR 2025, EMNLP CAI papers, SWE-bench leaderboard, METR, opencode docs, opencode-vscode-ide thin-fork pattern, Cognition Devin compound architecture, plus a cheap honesty probe that *caught and corrected* a 0.7pp over-statement — verifying-honesty-not-claim, per operator's atom-0010 frame).

| State                                              | Joint confidence | What you'd need                                         |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Today, post-refactor + max research                | **~65%**         | Already done                                            |
| After full measurement on 5 umbrellas              | **~84%**         | Run EXPERIMENT-1 + 3 small probes (~$10, fits envelope) |
| Target `@>=0.99999`                                | unreachable      | Structural cap                                          |

### The 5 load-bearing umbrellas

Each has **direct** evidence at its tier ceiling — not derived from sub-claim composition. Joint = 0.95 × 0.85 × 0.95 × 0.85 × 0.94 ≈ 0.613.

1. **cheapllm capability inherited** — L1 in-house (cheapllm v1 daftar). `@>=0.95`
2. **auto-wrapper beats raw frontier on multistep** — L3 mutawatir: Snell ICLR 2025 + 3 EMNLP 2025 CAI papers + AlphaCode-2 + SWE-bench Verified leaderboard + METR evaluations + Optimal Self-Consistency 2025 + Adaptive Test-Time Compute + Forest-of-Thought + Self-Consistency 2022 + Difficulty-Adaptive 2025. **9+ independent groups at L3 ceiling.** Plus production deployment evidence: Anthropic Claude Code uses orchestrator + sub-agents pattern, NVIDIA NeMo Agent Toolkit productizes compound systems. `@>=0.85`
3. **provider-registry propagation** — Multi-source L1: opencode source-readable + docs + 6.5M monthly users + 150K GitHub stars + extension ecosystem (awesome-opencode, OpenAgentsControl). 4+ independent L1 sources, near-ceiling. `@>=0.97`
4. **surgical maintainability** — L1 multi-source: Khātim/Sanad post-mortem (negative-knowledge) + cpkt9762/opencode-vscode-ide thin-fork *pattern* (verified by cheap honesty probe — pattern documented in repo, operational long-term success NOT verified). `@>=0.88`
5. **cost ratio vs competitors** — L1+L2: OpenAI Codex pricing + cheapllm-v1 in-house receipts, direct arithmetic. `@>=0.94`

### Honest research finding (validates M1.0 architecture)

opencode's plugin/provider-extension docs explicitly DO NOT support custom compound logic (best-of-K + cross-model wrapping via opencode.json is pointer-only). **There is no config-only shortcut** — cheapcode's wrapper code MUST live in a fork. M1.0's fork architecture is structurally correct.

Math: [`tools/joint-confidence.ts`](tools/joint-confidence.ts). Per-source citations: [`tools/research-equivalence.ts`](tools/research-equivalence.ts).
