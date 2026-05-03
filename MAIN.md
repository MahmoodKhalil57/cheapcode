# MAIN — cheapcode

The one-page summary. Update the bracketed `[fields]` as the project moves. Don't touch anything else without operator approval.

---

## Goal — v1.0 narrowed (per Option 3, M3.8)

A working `cheapcode` binary — a small spin-off of opencode — that exposes **5 routing tiers** (`cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`) over OpenRouter. Operator can rebase against upstream weekly without pain because cheapcode ships zero patches to opencode.

The 3-axis comprehensive-dominance claim (cheaper + faster + smarter than GPT-5.5 on multistep) is **deferred to v1.x** — needs Phase 2 wrapper + EXPERIMENT-1, both gated on a fitter benchmark than TB-3 (M3.2 retrospective surfaced the failure-mode mismatch).

Concrete v1.0 deliverables:

- A small npm package `@cheapcode/ai-sdk-provider` that opencode loads via `provider.cheapcode.npm` in opencode.json
- 5 tier IDs registered: `cheap` → deepseek-v4-flash, `cheap-fast` → deepseek-v4-flash (race-K stub), `smart` → gpt-5-mini, `smart-fast` → claude-haiku-4.5, `auto` → STUB to cheap (Phase 2 wrapper deferred)
- Long-context override > 128k → grok-4-fast (cheap/auto only)
- Operator override via `cheapcode.toml` (zero env-var feature flags per cell #11)
- A measured Model Card scorecard in the README ([Model Cards](https://arxiv.org/abs/1810.03993)) honestly disclosing what's in scope, what's deferred, and why
- A small open-source fork of [opencode](https://github.com/sst/opencode) (pinned at v1.14.33) — actually zero-patch, so "fork" is a misnomer; cheapcode is a separate npm package consumed by upstream-vanilla opencode

---

## Constraints

| Constraint | Limit                                          | Notes                                                                                                   |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cost       | `[$10 budget]` of which `[$0.00 spent]`        | Same envelope cheapllm v1 had; tight                                                                    |
| Time       | `[24h wall-clock]` of which `[0 days elapsed]` | Working time, not calendar                                                                              |
| Hardware   | Operator's laptop (WSL2 Linux + RTX 4070)      | OpenRouter for AI calls (network); RTX 4070 available during build for local testing, not after handoff |

---

# AGENT UPDATE BELOW

## What you ARE getting (v1.0)

- 5 tier-IDs in opencode's model picker: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- Routing to a cheap AI for routine work (~30× cheaper than GPT-5.5 per cheapllm v1's L1 receipts)
- A long-context option > 128k tokens via grok-4-fast (cheapllm v1's NIAH 2M PASS at $0.37/call)
- Operator-side override via `cheapcode.toml`
- Zero patches to opencode upstream — weekly rebase is `git fetch && git rebase` with no conflicts possible by construction (M3.5 lifted weekly_rebase_holds to @0.97 on this self-evidence)
- A Model Card README that honestly discloses scope + deferrals + why

---

## What you are NOT getting (v1.0 honest disclosure)

- **Not smarter than GPT-5.5 on multistep.** v1.0 is a routing harness, not a reasoning amplifier. The compound-LLM auto wrapper is deferred to v1.x — Option 3 picked at M3.7 specifically because the M3.2 retrospective surfaced that EXPERIMENT-1's TB-3 slice has a failure-mode mismatch with substrate-style verifiers.
- **Auto tier is a STUB to cheap.** The `auto` model name is honest in surface but doesn't yet do plan-decompose + best-of-K + verify. v1.x replaces this.
- **No 3-axis dominance claim.** That claim survives in PLAN.bn at @0.45-0.85 confidence as a v1.x target, not a v1.0 ship target.
- **Smart-fast latency is unmeasured.** We picked claude-haiku-4.5 pending TTFT verification. v1.x runs the latency probe.
- **Not a free service.** You need an OpenRouter API key + pay per usage.
- **Not multi-tenant or cloud.** Single user, single machine. Multi-account features may come later but are explicitly deferred.

---

## Progress

```
[██████████          ] 50%  (Phase 0+1 shipped; Phase 2 deferred per Option 3; Phase 3+4+5 ahead)
```

### Phase plan (UPDATED 2026-05-03 per SPEC Revision 2026-05-03i)

| Phase | Goal | Wall | $ | Status |
|---|---|---|---|---|
| 0 | Final research synthesis | 2h | $0 | `[x]` ✅ M2.0 |
| 1 | Fork + 5-tier registration | 4h | $0 | `[x]` ✅ M3.0 (zero-patch ship) |
| 2 | Auto wrapper MIN + EXPERIMENT-1 | 6h | $5 | `[~]` 🟡 **DEFERRED to v1.x** per Option 3 (M3.8) |
| 3 | 4-client smoke regression | 2h | $0-1 | `[ ]` next — needs operator BYOK |
| 4 | Scorecard + README (Model Card) | 2h | $1 | `[ ]` |
| 5 | Ship (v1.0.0 tag + daftar) | 1h | $0 | `[ ]` |
| | Buffer (Phase 2 cost reclaimed) | 13h | $9 | comfortable headroom |

**Substrate-tooling sub-stream (M3.3-M3.7):** added `tools/burhan-snapshot.sh` + `tools/burhan-revisit.sh` — auto-propagation of confidence + 5-action heuristic scanner (explore/move/dissect/merge/remove) + MAIN.md drift detection. Built outside the original phase plan; surfaced and resolved 11 of 17 plan-graph drift items via successive lift cycles (M3.4-M3.7).

**Phase 0 decisions** locked in [`runs/phase-0/decisions.md`](runs/phase-0/decisions.md). **Phase 1 shipped** per [`runs/phase-1/result.md`](runs/phase-1/result.md). **Phase 2 deferred** per [SPEC](SPEC.md) Revision 2026-05-03i.

**Mizaj 16 discipline:** before any experiment in any phase, run research-synthesis check first. **Experiments count toward the 24h envelope; research is free.**

---

## Confidence

**~80% v1.0 ship within remaining envelope** as of 2026-05-03 post Option 3 (M3.8). Phase 0 ✅ + Phase 1 ✅ shipped. Phase 3 + 4 + 5 ahead, ~5h wall, ≤$1. Phase 2 deferred per Option 3.

The original 65% v1 confidence applied to a v1 that included compound-LLM auto-wrapper. After Option 3 narrowing, v1.0 is structurally simpler (routing harness only) so confidence in shipping THIS v1.0 is higher — ~80% — at the cost of accepting that 3-axis dominance claims are deferred to v1.x.

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
