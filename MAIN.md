# MAIN — cheapcode

The one-page summary. Update the bracketed `[fields]` as the project moves. Don't touch anything else without operator approval.

---

## Goal (restored M3.9 per substrate signal — see SPEC Revision 2026-05-03j)

A working `cheapcode` binary — a small spin-off of opencode — that on hard reasoning tasks (TB-medium / TB-hard multistep slice) is **cheaper, faster, AND smarter** than calling GPT-5.5 directly. All three at once, measured, with the numbers cited in the README.

Concrete v1.0 deliverables:

- A small npm package `@cheapcode/ai-sdk-provider` that opencode loads via `provider.cheapcode.npm` in opencode.json
- 5 tier IDs registered: `cheap` → deepseek-v4-flash, `cheap-fast` → deepseek-v4-flash (race-K), `smart` → gpt-5-mini, `smart-fast` → claude-haiku-4.5, `auto` → **structured-reasoning wrapper** (plan-decompose → parallel cheap-leaves → best-of-K=3 frontier → cross-model verifier → retry-with-feedback)
- Long-context override > 128k → grok-4-fast (cheap/auto only)
- Operator override via `cheapcode.toml` (zero env-var feature flags per cell #11)
- A measured Model Card scorecard in the README ([Model Cards](https://arxiv.org/abs/1810.03993)) showing 3-axis dominance ratios on TB-multistep
- Zero patches to opencode upstream (cell #15 = 0; weekly rebase is `git fetch && git rebase`)

**v1.0 ships only on EXPERIMENT-1 Arm A PASS** — the smart-axis claim is exercised, not hand-waved. Per atom 0013, the measurement IS the credential.

---

## Constraints

| Constraint | Limit                                          | Notes                                                                                                   |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cost       | `[$10 budget]` of which `[$0.00 spent]`        | Same envelope cheapllm v1 had; tight                                                                    |
| Time       | `[24h wall-clock]` of which `[0 days elapsed]` | Working time, not calendar                                                                              |
| Hardware   | Operator's laptop (WSL2 Linux + RTX 4070)      | OpenRouter for AI calls (network); RTX 4070 available during build for local testing, not after handoff |

---

# AGENT UPDATE BELOW

## What you ARE getting (v1.0, post-M3.9 restoration)

- A working binary that's cheaper, faster, AND smarter than raw GPT-5.5 on hard multistep reasoning — **measured and cited**, not claimed
- 5 tier-IDs in opencode: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- Routing to cheap AIs for routine work (~30× cheaper than GPT-5.5 per cheapllm v1 receipts)
- Long-context option > 128k tokens via grok-4-fast (NIAH 2M PASS at $0.37/call per cheapllm v1)
- `auto` tier with structured-reasoning wrapper: plan-decompose + best-of-K=3 + cross-model verifier + retry
- Operator-side override via `cheapcode.toml`
- Zero patches to opencode upstream — weekly rebase trivial by construction
- Model Card README scorecard with 3-axis dominance ratios

---

## What you are NOT getting (v1.0 honest disclosure)

- **Not smarter than GPT-5 on single-step tasks.** Wrapper is bounded above by best frontier model in the ensemble; multistep is where we win.
- **No substrate-as-runtime-verifier (atom 0016 runtime claim).** Deferred to v1.x or follow-on project. Per M3.2 retrospective, TB-3's failure-mode mix (code-execution, system-success) is orthogonal to substrate's strength (reasoning-with-citations consistency). The build-time interpretation IS validated.
- **Smart-fast latency is research-grounded, not measured.** Pick claude-haiku-4.5 pending TTFT verification.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not multi-tenant or cloud.** Single user, single machine. Multi-account features deferred.

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
