# MAIN — cheapcode

The one-page summary. Update the bracketed `[fields]` as the project moves. Don't touch anything else without operator approval.

---

## Goal (M3.12 reframe — "general agent that routes optimally")

A working `cheapcode` binary — a small spin-off of opencode — that operates as a **general agent which routes each task to the documented value-optimum frontier model** based on per-model failure envelopes (speed limits, intelligence limits, cost-per-task). Cheaper, faster, AND smarter than calling any single frontier model alone — across the *full mix* of tasks an agent encounters, not by beating one model at one slice.

The original framing ("compound wrapper that beats raw GPT-5.5 on multistep") was tested in M3.11 + M3.11b and definitively failed cost+latency axes — compound architecture has structural overhead. Smart-axis was untestable due to benchmark saturation. **The reframe replaces the compound-wrapper bet with a routing-intelligence bet** grounded in research on each frontier model's documented failure modes (facts/08 + facts/09).

Concrete v1.0 deliverables:

- A small npm package `@cheapcode/ai-sdk-provider` that opencode loads via `provider.cheapcode.npm` in opencode.json
- 5 tier IDs registered as price points: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- `auto` tier = **failure-mode-aware router** that classifies task shape and dispatches to the value-optimum model per facts/09 routing matrix:
  - long-context >128k → DeepSeek V4 Pro (L1 own-measurement: 2/2 NIAH @ 2M tokens) or Opus 4.7 (frontier+long)
  - agentic SWE loop → Opus 4.7 (MCP-Atlas 77.3% leads frontier)
  - bounded code → Haiku 4.5 (SWE-bench Verified 73.3% at $0.80/M)
  - math chain → DeepSeek V3.2-Speciale or V4 (AIME 96% at <$0.50/M output)
  - PhD factual → Gemini 3 Flash (GPQA 90.4% at $1.13/M blended)
  - computer-use → GPT-5.4 mini (OSWorld 72.1% leads tier-2)
  - sub-2s latency → Gemini 3 Flash (1.06s P50) or Llama 4 Scout (0.81s)
  - closed-book without tools → AVOID GPT-5.5 (86% hallucination per overconfidence benchmark)
  - general multistep → strongest frontier WITHOUT compound wrapper (M3.11 evidence: compound costs more and slower with no completion lift on saturated tasks)
- Compound wrapping invoked ONLY when task signature suggests baseline failure (e.g., novel multi-domain reasoning where single-frontier scoring is sub-50%)
- Operator override via `cheapcode.toml`
- Model Card scorecard in the README disclosing routing rules + their evidence tier (mostly L4 vendor-blog-attested as of M3.12; aspires to lift to L1 in v1.x via own measurement)
- **Standalone `cheapcode` binary** (round 96, 2026-05-03 pivot) shipped via branding-only patches in `patches/` against pinned opencode-upstream `v1.14.33`. Build with `bash tools/build-cheapcode.sh`. Acknowledges opencode as fork-base; rebrand surfaces are name + logo + display strings only — semantic behavior stays in `@cheapcode/ai-sdk-provider` so weekly upstream rebases stay trivial.

**v1.0 value-prop: cheapcode is the routing intelligence layer that knows where each frontier model fails.** No wrapper, no compound architecture by default — just the right model for the right task signature, with the load-bearing routing rules documented in PLAN.bn SECTION X.

Per atom 0013 (calibration-as-credential): the routing rules' evidence tiers and falsifiers ARE the credential — they're auditable and replaceable as new model evidence accumulates.

---

## Constraints

| Constraint | Limit                                          | Notes                                                                                                   |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cost       | `[$10 budget]` of which `[$0.00 spent]`        | Same envelope cheapllm v1 had; tight                                                                    |
| Time       | `[24h wall-clock]` of which `[0 days elapsed]` | Working time, not calendar                                                                              |
| Hardware   | Operator's laptop (WSL2 Linux + RTX 4070)      | OpenRouter for AI calls (network); RTX 4070 available during build for local testing, not after handoff |

---

# AGENT UPDATE BELOW

## What you ARE getting (v1.0, post-M3.12 reframe)

- A general-agent **routing-intelligence layer** that knows the cost/speed/intelligence envelope of every top frontier model
- 5 tier-IDs in opencode: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- The `auto` tier dispatches each task to its *value-optimum* model per documented failure modes (10 routing rules in facts/09)
- Routing decisions cited to source — operators can audit *why* the router picked model X for shape Y
- Cheaper *across the mix* than calling any single frontier model alone — because routine work routes cheap, agentic SWE routes Opus, math routes DeepSeek, etc.
- Faster *per task* than compound wrappers (M3.11 evidence: compound is structurally 5× slower)
- Long-context handling via DeepSeek V4 Pro (L1 own-measurement: 2/2 NIAH @ 2M tokens, p50 4.08s, $0.75/run)
- Operator-side override via `cheapcode.toml`
- Zero patches to opencode upstream — weekly rebase trivial by construction
- Model Card README scorecard listing routing rules + evidence tier per rule

---

## What you are NOT getting (v1.0 honest disclosure)

- **Not a compound wrapper that beats single frontier on every axis.** M3.11 + M3.11b confirmed compound architecture costs ~1.3-1.9× more and runs ~5× slower than raw frontier, with no completion lift on benchmarks where baseline saturates. The reframe drops this claim.
- **Not L1-measured on every routing rule.** Most routing evidence as of v1.0 is L4 (vendor blog + leaderboard). Lifting to L1 own-measurement is v1.x work.
- **Not smarter than the best frontier model on a single task slice.** When a task fits gpt-5.5's strength, gpt-5.5 wins — and cheapcode routes to it. Cheapcode's value is *across the task mix*, not on any single benchmark.
- **No substrate-as-runtime-verifier (atom 0016 runtime claim).** Deferred to v1.x — TB-3's failure-mode mix is orthogonal to substrate's strength per M3.2 retrospective.
- **Smart-fast latency is research-grounded, not measured.** Pick claude-haiku-4.5 pending TTFT verification.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not multi-tenant or cloud.** Single user, single machine.

---

## Progress

```
[████████            ] 40%  (Phase 0+1 shipped; Phase 2 Arm A coming next; Phase 3+4+5 ahead)
```

### Phase plan (RESTORED M3.9 per SPEC Revision 2026-05-03j)

| Phase | Goal | Wall | $ | Status |
|---|---|---|---|---|
| 0 | Final research synthesis | 2h | $0 | `[x]` ✅ M2.0 |
| 1 | Fork + 5-tier registration | 4h | $0 | `[x]` ✅ M3.0 (zero-patch) |
| 2 | Auto wrapper MIN + EXPERIMENT-1 **Arm A** | 6h | $5 | `[ ]` next — wrapper ~250 LoC + experiment |
| 3 | 4-client smoke regression | 2h | $0-1 | `[ ]` |
| 4 | Scorecard + README (Model Card) | 2h | $1 | `[ ]` |
| 5 | Ship (v1.0.0 tag + daftar) | 1h | $0 | `[ ]` |

**Arm B deferred** to v1.x per M3.2 retrospective — substrate-runtime-verifier test mismatched to TB-3 failure-mode mix (code-execution vs reasoning-with-citations). Arm A (3-axis dominance test on TB-multistep slice) IS the smart-axis credential per atom 0013.

**Substrate-tooling sub-stream (M3.3-M3.7):** added `tools/burhan-snapshot.sh` + `tools/burhan-revisit.sh` — auto-propagation of confidence + 5-action heuristic scanner + MAIN.md drift detection. Surfaced and resolved 11 of 17 plan-graph drift items via lift cycles (M3.4-M3.7), then surfaced the M3.8 over-narrowing (REMOVE flag on phase_2 fired) which led to this M3.9 correction.

**Phase 0 decisions** locked in [`runs/phase-0/decisions.md`](runs/phase-0/decisions.md). **Phase 1 shipped** per [`runs/phase-1/result.md`](runs/phase-1/result.md). **Phase 2 Arm A** in progress per [SPEC](SPEC.md) Revision 2026-05-03j.

**Mizaj 16 discipline:** research-synthesis check before any experiment. M3.5-M3.7 exhausted the $0 research-lift pool; Arm A is the L1 measurement that lifts beyond research ceiling.

---

## Confidence

**~65% v1.0 ship within remaining envelope** as of 2026-05-03 post-M3.9. Phase 0 ✅ + Phase 1 ✅ shipped. Phase 2 Arm A next (~6h, ~$5), then Phase 3 + 4 + 5 (~5h, ≤$1). Total remaining ~11h, $5-6.

The 65% reflects the original ambitious v1 (5 tiers + auto-wrapper + measured 3-axis dominance). M3.5-M3.7 lift cycles validated the research-supported confidences; Arm A measurement determines whether the wrapper actually delivers the smart-axis claim. PASS-EXPECTED on Arm A lifts the joint to ~74% per SPEC Revision 2026-05-02f's pivot table.

| State                                              | Joint confidence | What you'd need                                         |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------- |
| Today, post-refactor + max research + Phase 0 lock | **~65%**         | Already done                                            |
| After Phase 2 EXPERIMENT-1 PASS                    | **~74%**         | Phase 2 runs ($5, 3h, fits envelope)                    |
| After full measurement on 5 umbrellas              | **~84%**         | EXPERIMENT-1 + 3 small probes                           |
| Target `@>=0.99999`                                | unreachable      | Structural cap (compositional dilution per atom 0015)   |

### The 5 load-bearing umbrellas

Each has **direct** evidence at its tier ceiling — not derived from sub-claim composition. Joint = 0.95 × 0.85 × 0.97 × 0.88 × 0.94 ≈ **0.648**.

1. **cheapllm capability inherited** — L1 in-house (cheapllm v1 daftar). `@>=0.95`
2. **auto-wrapper beats raw frontier on multistep** — L3 mutawatir: Snell ICLR 2025 + 3 EMNLP 2025 CAI papers + AlphaCode-2 + SWE-bench Verified leaderboard + METR + Optimal Self-Consistency 2025 + Adaptive Test-Time Compute + Forest-of-Thought + Self-Consistency 2022 + Difficulty-Adaptive 2025. **9+ independent groups at L3 ceiling.** Plus production deployment: Anthropic Claude Code orchestrator+sub-agents, Cognition Devin explicitly compound, NVIDIA NeMo Agent Toolkit. `@>=0.85`
3. **provider-registry propagation** — Multi-source L1: opencode source + docs + 6.5M monthly users + 150K GitHub stars + extension ecosystem. v1.14.30 added DeepSeek compatibility upstream — strengthens directly. `@>=0.97`
4. **surgical maintainability** — L1 multi-source: Khātim/Sanad post-mortem (negative-knowledge) + cpkt9762/opencode-vscode-ide thin-fork *pattern* (verified by cheap honesty probe — pattern documented; operational long-term success NOT verified). `@>=0.88`
5. **cost ratio vs competitors** — L1+L2: OpenAI Codex pricing + cheapllm-v1 in-house receipts, direct arithmetic. `@>=0.94`

### Substrate-discipline standards adopted (M2.1)

Three battle-tested parallel standards locked in [SPEC](SPEC.md) Revision 2026-05-02g:

- **[Model Cards](https://arxiv.org/abs/1810.03993)** (Mitchell et al. 2019) — Phase 4 README format. Standard structure used by HuggingFace + Meta + Google + OpenAI.
- **[GRADE](https://www.cochrane.org/learn/courses-and-resources/cochrane-methodology/grade)** (Cochrane / WHO / NICE) — 5-domain downgrade checklist (risk-of-bias / inconsistency / indirectness / imprecision / publication-bias) applied as research-synthesis pre-flight. **This catches the failure mode cheapllm-v1 hit 7× in their session — research-supported claims that don't replicate.**
- **[ADR Nygard format](https://adr.github.io/)** — milestone entries: Title / Status / Context / Decision / Consequences / Pointer.

### Honest research finding (validates M1.0 architecture)

opencode's plugin/provider-extension docs explicitly DO NOT support custom compound logic (best-of-K + cross-model wrapping via opencode.json is pointer-only). **There is no config-only shortcut** — cheapcode's wrapper code MUST live in a fork. M1.0's fork architecture is structurally correct.

Math: [`tools/joint-confidence.ts`](tools/joint-confidence.ts). Per-source citations: [`tools/research-equivalence.ts`](tools/research-equivalence.ts).
