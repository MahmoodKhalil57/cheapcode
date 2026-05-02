# MAIN — cheapcode

The one-page operator's view: goal, limits, where we are, and what it would honestly take to reach the target confidence.

---

## What we are building (in plain words)

**A fork of opencode that's smarter, cheaper, and faster than every shipping competitor**, by running [cheapllm](../cheapllm/) under the hood and adding a thin discipline layer (claim-shape prompt addon, daftar/mizaj/khazina substrate tools at session level) that carries qls-style truthfulness uplift to inference time.

**Why this is plausible:**

- cheapllm v1 already has 4-axis dominance receipts vs GPT-5.5: 26× cheaper, 2.24s P50 latency, 2M context vs 1.05M, smart-axis pending F-H3 K=1.
- Khātim/Sanad failed by sprawl (1,152 ts/tsx files, 37 plan files, multi-tenant cloud, cross-repo callback-RPC). cheapcode's whole posture is the inversion: one fork or wrapper, one config file, no auth surface, every feature lands at one propagation point that all upstream client surfaces inherit for free.

**Competitors named in scope:** Codex, vanilla opencode, Claude Code, Aider, Goose, Terminus, Continue, Cursor, Devin.

---

## Time target

**Operator-confirmation needed.** Proposed (loose) envelopes:

- **MIN tier (wrapper-mode v0):** ~24h wall-clock — same envelope cheapllm targets — to ship a working `cheapcode` binary that propagates a claim-shape addon through CLI/TUI/web/desktop and passes a smoke regression on cheapllm.
- **EXPECTED tier:** ~80h wall-clock — full feature set, cheapbench v1 measured, four upstream client surfaces verified, scorecard generated.
- **IDEAL tier:** continuous-rebase posture against vanilla opencode + lectionary cycles wired as session tools.

These are working numbers. Confirm or revise before we lock.

---

## Limits

| Limit | Value | Notes |
|---|---|---|
| Time | TBD (see above) | Wall-clock before goalposts move |
| Hardware | WSL2 Linux on operator's machine; no GPU | cheapllm runs via OpenRouter (network) |
| Token cost | TBD; cheapllm v1's $10 envelope is for cheapllm only | cheapcode hot path is mostly free; meaningful spend is bench measurement + EXPERIMENT-0/2 |
| Network | Operator's connection | Audit-verify URL checks deferred |

---

## Current confidence

**Joint confidence the plan succeeds within limits today: ~2%** (correlated groups) or **~0.15%** (independence assumption).

That number is real and computed from [`plan/PLAN.bn`](plan/PLAN.bn)'s 22 top-theorem assumptions via [`tools/joint-confidence.ts`](tools/joint-confidence.ts). It is not a typo.

The math (8 correlated groups, lower bound per group):

| Group | Min claim confidence today | Why low |
|---|---|---|
| `vs-codex` (cost / latency / capability) | **0.30** | No L1 measurement; vendor docs + benchmarks not yet cited |
| `vs-vanilla-opencode` (capability) | **0.40** | Could be L1-measured cheaply (run vanilla + cheapllm against cheapbench) |
| `cheapllm-smart-axis` | **0.50** | F-H3 K=1 baseline pending in cheapllm v1 |
| `cheapcode-harness` (smart-on-cheapbench) | **0.50** | EXPERIMENT-2 pending; cheapbench not yet run |
| `cheapbench-design` | 0.85 | Designed but unmeasured |
| `cheapllm-perf` (cost / latency / context) | 0.85 | Receipts solid; min is context-axis |
| `substrate-l1` (mizaj / khazina / Khātim post-mortem) | 0.99 | Own-files-of-record |
| `atom-anchors` (cite specific khazīna atoms) | 0.99 | Own-files-of-record |

**Joint product = 0.85 × 0.50 × 0.50 × 0.85 × 0.30 × 0.40 × 0.99 × 0.99 ≈ 0.021**

---

## On the `@>=0.99999` target — honest constraint

Per Khazīna atom 0015 (research-pipeline-overstates-base-model-specific-transfer) and Mizaj rule 11 (tier-the-source-before-citing), per-claim confidence has structural ceilings:

| Source tier | Per-claim ceiling |
|---|---|
| L1 own measurement | `@>=0.95+` |
| L3 academic peer-reviewed | `@>=0.85` (transfer-bounded) |
| L4 vendor blog | `@>=0.40` |

**A composition over N>1 claims dilutes joint confidence below the per-claim ceiling.** The math:

- Reaching `@>=0.99999` over 22 independent claims requires each at `@>=0.99999955` — six nines per claim.
- Reaching `@>=0.99999` over 8 correlated groups requires each at `@>=0.99999875` — six nines per group.
- L1 own-measurement caps at `@>=0.95-0.99`. **No single research source provides six nines.**

**Best achievable joint via full L1 measurement:** ~0.46 (computed: 0.95 × 0.85 × 0.85 × 0.95 × 0.85 × 0.85 × 0.99 × 0.99 = 0.461736).

**Honest conclusion:** the literal `@>=0.99999` target is structurally unreachable for a multi-claim composition over research+measurement at the current claim shape. The structural cap is **~0.46 joint** even with everything measured.

**That's not failure — it's calibration.** Three reframings keep the spirit of the target without overclaiming:

1. **Per-claim `@>=0.95`** (achievable with L1 measurement on each bottleneck) plus **"no falsifier triggered"** = practical ship criterion. We can defend each individual claim at five nines with measurement; we cannot defend the conjunction at five nines.
2. **Reduce N.** If the SPEC is restated with fewer load-bearing claims (say 4 instead of 22), joint at `@>=0.95` per claim gives `0.95^4 ≈ 0.81` — much higher.
3. **Sequential discharge.** Instead of asking "is the whole plan true at 99.999%?", ask "have any assumptions been falsified?" — and accept the plan as not-falsified rather than proven.

This is exactly mizaj rule 04 (separate-stated-from-revealed): the stated target is `@>=0.99999`; what's actually reachable reveals the cap.

---

## Progress

```
[                    ] 0%   <-- you are here (planning + research + docs only)
```

**Per operator instruction, planning + research + documentation count as 0% toward shippable.** Only code-that-runs counts. Milestones:

| % | Milestone |
|---|---|
| 0% | All current state (plan + research + substrate work) |
| 25% | EXPERIMENT-0 PASS + first wrapper script working against vanilla opencode + cheapllm; smoke regression covering CLI |
| 50% | cheapbench v1 task pre-registered + run; claim-shape addon propagates to CLI + TUI; substrate tools wired |
| 75% | Web + desktop client surfaces verified; full smoke matrix passing on cheapllm backend; scorecard generator working |
| 100% | Shipped binary; README with measured 4-axis scorecard + cited competitor numbers; all `cheapcode_v1_ships` assumptions either discharged or honestly bracketed |

---

## What carries the most lift (next research / measurement priorities)

The 4 bottleneck groups dominate. Lifting them via L1 measurement:

| Group | Current | After measurement | Cost |
|---|---|---|---|
| `vs-codex` | 0.30 | ~0.85 | Vendor pricing fetch (~30min, $0); capability cell stays L4 since hosted (cap @>=0.85) |
| `vs-vanilla-opencode` | 0.40 | ~0.85 | Run vanilla + cheapllm against cheapbench (~2h, $5) |
| `cheapllm-smart-axis` | 0.50 | ~0.85 | Wait for cheapllm F-H3 K=1 (in flight) |
| `cheapcode-harness` | 0.50 | ~0.85 | EXPERIMENT-0 PASS + EXPERIMENT-2 (claim-shape uplift probe on cheapllm) |

After all four lift, joint goes from **~0.02 to ~0.46** — a 23× increase. That's the right ambition shape.

---

## Reading order (for the operator)

1. **`MAIN.md`** (this file) — the one-page summary
2. [`SPEC.md`](SPEC.md) — the contract (cells, falsifiers, scope)
3. [`plan/PLAN.bn`](plan/PLAN.bn) — the claim chain (22 claims, validated by burhan)
4. [`plan/MAIN.bn`](plan/MAIN.bn) — the calibration audit applied to this MAIN.md
5. [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) — the smartness-measurement design
6. [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — the research protocol (mizaj-11 source-credibility ladder)
7. [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md) — the propagation thesis discriminating experiment

---

## What I'd ask you to confirm

1. **Time target.** Pick MIN/EXPECTED/IDEAL envelopes or reject the proposed numbers.
2. **Token-cost budget for cheapcode.** Separate from cheapllm's $10. Realistic working budget?
3. **Confidence target reframe.** Accept the structural cap (~0.46 joint at full measurement) and reframe the goal as per-claim `@>=0.95` + no-falsifier-triggered, OR pick option 2 (reduce the SPEC's claim count to make `@>=0.99999` reachable on a smaller composition).

Once those are locked, the next step is mechanical: run EXPERIMENT-0 to lift `cheapcode-harness`, vendor-doc fetch to lift `vs-codex`, and L1 vanilla-opencode benchmark to lift `vs-vanilla`. Three measurements take joint from 2% to ~30%. Cheapbench measurement and F-H3 K=1 land us at ~46%.
