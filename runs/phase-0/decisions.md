# Phase 0 — locked decisions (2026-05-02)

Final research synthesis per SPEC Revision 2026-05-02f. NO experiments — all answers from research synthesis (mizaj rule 16).

**Status:** complete. Falsifier gate CLEARED — no umbrella materially drops. Authorized to proceed to Phase 1.

**Wall:** ~30 min (well under 2h budget). **Spend:** $0.

---

## Locked decisions

### 1. Upstream opencode version pin: **v1.14.33**

- Released 2026-05-02 (today's date — matches cheapllm v1's ship window)
- Source: [github.com/sst/opencode/releases](https://github.com/sst/opencode/releases)
- 8 patch versions past Khātim's old fork pin (v1.14.25)
- Provider-relevant changes since v1.14.25 we inherit:
  - **v1.14.30**: "DeepSeek compatibility with providers that vary model naming" — directly relevant to our cheap-tier (deepseek-v4-flash) integration
  - **v1.14.29**: "DeepSeek OpenAI-compatible setups now keep `reasoning_content` interleaved by default" — relevant for verifier hook
  - **v1.14.32**: image fallback + Bedrock reasoning fixes — neutral
  - **v1.14.25**: "GPT-5.5 with OpenAI OAuth now uses the correct context limits" — neutral
- **Implication:** upstream is *actively maintained* and the changes are *additive to cheap-tier compatibility*. Strengthens umbrella 3 (propagation) qualitatively (no numerical lift past 0.97 ceiling).

### 2. cheap-tier model: **deepseek/deepseek-v4-flash**

- Source: cheapllm v1 L1 in-house receipts ($0.0015–0.0032/task on TB-easy)
- Confidence: @>=0.95 (already locked at umbrella 1)
- No change from earlier plan.

### 3. cheap-fast tier strategy: **race-K of deepseek-v4-flash + gemini-2.5-flash**

- **Primary:** `deepseek/deepseek-v4-flash` (cheapllm-v1 receipt)
- **Race-partner:** `google/gemini-2.5-flash` — 1.1s median response time, $0.003/38-test run, 97.1% quality (cheapest paid production option per L3 leaderboard data)
- Secondary fallback: `mistralai/mistral-medium-3.5` (added to opencode in v1.14.30 — "with reasoning support")
- **Pattern:** cheapllm-v1's `cheapllm-fast` race-K strategy (P50 2.24s achieved with similar pair). Inherits the same architecture.
- Confidence: @>=0.90 (umbrella 1 group, race-K strategy is L1 cheapllm-v1-receipted)

### 4. smart tier: **openai/gpt-5-mini direct**

- No router-pretending on cheap base (per cheapllm v1's Q2 finding — router on cheap-base for hard reasoning UNDER-PERFORMS K=1 alone)
- Direct route to actual capable model. User pays for capability when they need it.
- Confidence: @>=0.92 (umbrella 1, no change)

### 5. smart-fast tier: **anthropic/claude-haiku-4.5** (primary), with fallback to **openai/gpt-5-nano**

- Both available on OpenRouter
- Tie-breaker if available: **google/gemini-2.5-flash** for latency-priority workflows (1.1s median, $0.003 per run)
- Confidence: @>=0.75 (artificialanalysis.ai L3 + Vellum LLM leaderboard L3, 2 indep groups so -0.10 mutawatir penalty against L3 ceiling 0.85)
- **Honest note:** specific TTFT numbers for Haiku 4.5 vs nano not extracted from artificialanalysis.ai webpage (page uses interactive charts). Picks justified by L3 leaderboard categorization, not by specific latency receipts. Operator may want to revisit if smart-fast latency becomes the load-bearing axis.

### 6. auto tier: **structured-reasoning wrapper** (deferred to Phase 2)

- Architecture: plan-decompose (smart-tier, GPT-5.5 frontier) → execute leaves at cheap-tier in parallel → best-of-K=3 frontier synthesis → verifier hook (cheapllm-v1 d616876 inheritance) → optional cross-model verification
- Phase 2 EXPERIMENT-1 measures this directly
- Confidence: @>=0.85 (umbrella 2, at L3 mutawatir ceiling pending Phase 2)

### 7. Long-context override: **x-ai/grok-4-fast** when input >128k tokens

- Source: cheapllm-v1 H3B receipt — NIAH 2M PASS, 2/2 needles, $0.37/call, 4.1s
- Confidence: @>=0.95 (umbrella 1)
- No change from earlier plan.

---

## Umbrella re-audit per cheapllm-v1's atom-0015-7-firing warning

| # | Umbrella | Before Phase 0 | After re-audit | Status |
|---|---|---|---|---|
| 1 | cheapllm capability inherited | 0.95 | 0.95 | ✅ no change — cheapllm-v1's actual ship framing matches our wording exactly (3 axes proven, smart honestly disclosed) |
| 2 | auto-wrapper multistep dominance | 0.85 | 0.85 | ✅ at L3 mutawatir ceiling; Phase 2 EXPERIMENT-1 is the load-bearing test; cheapllm-v1's K=1+router finding does NOT directly refute (different architecture) but reinforces conservative ceiling |
| 3 | provider-registry propagation | 0.97 | 0.97 | ✅ opencode v1.14.33 adds DeepSeek compatibility upstream — strengthens qualitatively |
| 4 | surgical maintainability | 0.88 | 0.88 | ✅ already honesty-corrected M1.9; cpkt9762 thin-fork pattern verified, operational long-term success not |
| 5 | cost ratio vs competitors | 0.94 | 0.94 | ✅ DeepSeek V3.2 67.8% SWE-bench at 1/50× GPT-5.4 cost confirms direction |

**Joint confidence unchanged: 0.648 (~65%).** No falsifier triggered. Phase 0 → Phase 1 cleared.

---

## Implementation sketch for Phase 1

### Files to add (cheapcode fork)

- `packages/opencode/src/provider/cheapcode-tiers.ts` — new module, ~150 LoC
  - `CHEAPCODE_TIERS` constant: 5 tier model definitions
  - Per-tier metadata: name, OR target, cost-tier flag, fast-flag, wrapper-flag
  - `routeAuto(messages, opts)` — STUB for Phase 1 (just route to `cheap`); full wrapper in Phase 2
- `packages/opencode/src/provider/cheapcode-tiers.test.ts` — minimal smoke test (~40 LoC)

### Files to modify (cheapcode fork)

- `packages/opencode/src/provider/provider.ts` — ~15 LoC modification near OpenRouter init (line ~403). Add tier registration after upstream OpenRouter loads. Comment with `// CHEAPCODE-FORK` marker for clean rebase.

### Files to add at root

- `cheapcode.toml` — config file (per SPEC cell #11; zero env-vars). Per-tier OR model overrides for operator customization.
- `README.md` — initial draft, link to MAIN.md and SPEC.md

### Phase 1 success criteria (smoke)

- `bun run packages/opencode/src/index.ts run --model cheap "say hello"` → produces output via deepseek-v4-flash on OpenRouter
- `bun run packages/opencode/src/index.ts --list-models` → all 5 tiers appear under OpenRouter section
- LoC delta from upstream: ≤ 350 (MIN cell #14)
- Tests pass: smoke test green

### Phase 1 falsifier gate

If 5 tiers don't appear in `--list-models` OR LoC exceeds 350, halt and architectural-review per SPEC Revision 2026-05-02f Phase 1 falsifier table.

---

## Honest gaps acknowledged

1. **smart-fast latency benchmark numbers**: artificialanalysis.ai page extraction failed (interactive charts not captured). Pick is by L3-leaderboard-categorization, not specific TTFT. If smart-fast becomes load-bearing in Phase 2, may need to revisit.
2. **Cheap-fast race-K specific timing**: cheapllm-v1's race-K achieved 2.24s P50 with deepseek-v4-flash + flash-lite. We're substituting gemini-2.5-flash (1.1s median per L3) — should be at least as fast, but exact P50 unmeasured.
3. **Wrapper architecture details for Phase 2**: cross-model verification model not yet locked. Defer to Phase 2 prep.

These are L3-or-better confidence on the picks but L1 measurement would close the residual ~0.10 confidence gap. Tradeoff accepted given operator's research-first instruction.

---

## Daftar receipt

```
bun ~/apps/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="Phase 0 complete — locked decisions, falsifier cleared" \
  --body="..."
```
