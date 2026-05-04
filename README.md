# cheapcode

> A general-agent **routing intelligence layer** for opencode. Knows where each top frontier model fails (speed limits, intelligence limits, cost per task) and dispatches each task to its documented value-optimum model.

**Status:** v1.0 (M3.22). Phase 1 + Phase 2 (substrate-runtime voter, small-N validated M3.20) + Phase 3 (5-tier registration L3) + Phase 4 (Model Card README) shipped. M3.15 opencode-CLI dispatch ProviderInitError documented as upstream-issue / v1.x follow-up. ([LATESTMILESTONE.md](LATESTMILESTONE.md))

---

This document is structured as a **Model Card** ([Mitchell et al. 2019](https://arxiv.org/abs/1810.03993)) — the format used by HuggingFace, Meta, Google, and OpenAI. It documents what cheapcode IS, what it IS NOT, the evidence tier behind every routing rule, and the experiments that ran (including the FAILed ones, per atom 0013 — calibration-discipline-as-credential).

## 1. Model details

- **Name:** `@cheapcode/ai-sdk-provider`
- **Version:** `1.0.0` (v1.0)
- **Author:** [Mahmood Khalil](https://github.com/saastemly) (operator) + Claude Opus 4.7 (1M context) (agent)
- **Type:** [Vercel AI SDK](https://sdk.vercel.ai/) provider package — opencode loads via `provider.cheapcode.npm` in opencode.json
- **Architecture:** zero patches to opencode upstream. cheapcode is a separate npm package consumed by upstream-vanilla opencode.
- **License:** MIT
- **Pinned upstream:** [opencode v1.14.33](https://github.com/sst/opencode)

## 2. Intended use

### Primary use cases

- General-purpose agent dispatch: each task routed to the value-optimum frontier model based on documented per-model failure envelopes
- 5 tier-IDs registered: `cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`
- The `auto` tier is the failure-mode-aware router (see §7 routing rules table)
- Operator override via `cheapcode.toml` for per-tier and per-shape model picks

### Primary users

Solo developers + small teams using opencode who want **routing intelligence** without committing to a single frontier provider. Cost-sensitive multi-task workloads where the right model for the task differs.

### Out-of-scope use cases

- **Not a compound wrapper that beats single frontier on cost+latency.** Tested twice (M3.11, M3.11b), definitively failed cost+latency per atom 0015 transfer-overstatement evidence. Compound code preserved but invoked only when operator opts in via `forceCompoundOnMultistep`.
- **Not multi-tenant or cloud.** Single user, single machine. BYOK OpenRouter key.
- **Not a swarm orchestrator** or new client surface — purely an opencode-compat provider.
- **Not for tasks where saturated single-frontier is clearly best** — for those, just call the frontier directly.

## 3. Factors

### Task shapes the router classifies

| Shape | Trigger signature | Default route |
|---|---|---|
| `long-context` | input > 100k tokens | `x-ai/grok-4-fast` (or DeepSeek long-ctx) |
| `agentic-swe` | "fix bug", "create PR", SWE-bench keywords | `anthropic/claude-opus-4` |
| `bounded-code` | "implement function", "refactor" + < 4k tokens | `anthropic/claude-haiku-4.5` |
| `math-chain` | math symbols (∫∑∏√) OR keywords (prove, AIME, gcd, modular) | DeepSeek (cheap-tier target) |
| `phd-factual` | quantum/physics/biology/PhD/GPQA + < 8k tokens | `google/gemini-2.5-flash` |
| `computer-use` | click, navigate, OSWorld keywords | `openai/gpt-5-mini` |
| `classification` | "categorize", "extract entity", "label" + < 2k tokens | `meta-llama/llama-4-scout` |
| `subsecond-latency` | "real-time", "streaming", "low-latency" | `google/gemini-2.5-flash` |
| `closed-book` | "without tools", "memorized fact" | `anthropic/claude-opus-4` (avoid GPT-5 — see §9) |
| `multistep-general` | (default fallthrough) | smart-tier target, **no compound by default** |

Classification is heuristic regex on the prompt — zero LLM calls in the classifier. ([src/router.ts:68-100](src/router.ts#L68-L100))

### Tier model picks (Phase 0 locked)

| Tier | Default OpenRouter model |
|---|---|
| `cheap` | `deepseek/deepseek-v4-flash` |
| `cheap-fast` | `deepseek/deepseek-v4-flash` (race-K stub for v1.x) |
| `smart` | `openai/gpt-5-mini` |
| `smart-fast` | `anthropic/claude-haiku-4.5` |
| `auto` | (router; see §7) |

Long-context override > 128k tokens → `x-ai/grok-4-fast` regardless of tier.

## 4. Metrics

### How v1.0 measures itself

cheapcode does NOT advertise a single benchmark score. Instead, every routing rule has an **evidence tier** ([mizaj rule 11](../mizaj/rules/11-tier-the-source-before-citing.md) source-class ladder):

- **L1** — own-measurement (we ran the test ourselves with receipts)
- **L2** — vendor docs / pricing pages
- **L3** — peer-reviewed academic / leaderboard (rare for current frontier)
- **L4** — vendor blog / leaderboard (most common; ceiling 0.40)
- **L5** — anonymous / forums (ceiling 0.10)

Per atom 0013 (calibration-discipline-as-credential), the evidence-tier-per-rule format IS the credential. Operators can audit the source-trail and replace a rule when better evidence arrives.

### Decision thresholds

| Threshold | Value | Source |
|---|---|---|
| long-context cutoff | input > 100k tokens | [router.ts:39](src/router.ts#L39) |
| compound default | OFF | M3.11+M3.11b L1 (see §7) |
| route override path | per-shape via `cheapcode.toml` | [router.ts:140](src/router.ts#L140) |

## 5. Evaluation data

### Benchmarks run

| Benchmark | Tasks | Purpose | Verdict |
|---|---|---|---|
| Curated simple multistep | N=10 | M3.11 attempt-1 (compound wrapper Arm A) | FAIL on cost (1.86×) + latency (5.49×); completion ceiling at 100% both arms |
| Hand-curated harder multistep | N=10 | M3.11b attempt-2 (compound wrapper) | FAIL on cost (1.33×) + latency (5.13×); completion ceiling at 100% both arms |
| AIME 2024 (subset) | N=3 | M3.13 attempt-3 (compound wrapper) | PARTIAL — task 4 hung 50min (M3.17 timeouts fix); 1/3 correct on completed |
| AIME 2024 + known-impossible | N=5 | M3.19 voter probe | PASS small-N — 4/5 correct, $0.0516 spend, sahih precision 2/2 = 100% |

Full data: [runs/experiment-1-attempt-1/verdict.md](runs/experiment-1-attempt-1/verdict.md), [runs/experiment-1-attempt-2/verdict.md](runs/experiment-1-attempt-2/verdict.md), [runs/experiment-1-attempt-3/](runs/experiment-1-attempt-3/), [runs/experiment-2-voter-probe/verdict.md](runs/experiment-2-voter-probe/verdict.md).

## 6. Training data

N/A — cheapcode is a router/wrapper around frontier APIs hosted on OpenRouter. No training, no fine-tuning. Each frontier model has its own training data documented by its vendor.

## 7. Quantitative analyses

### Routing rules — load-bearing claims

Each rule cites [`plan/facts/09-task-shape-routing-matrix.bn`](plan/facts/09-task-shape-routing-matrix.bn). Confidences are per-rule per [mizaj rule 11](../mizaj/rules/11-tier-the-source-before-citing.md).

| # | Rule | Target | Evidence tier | Confidence |
|---|---|---|---|---:|
| 1 | long-context >128k | DeepSeek V4 / grok-4-fast | **L1** own (NIAH 2M PASS) + L4 | 0.85 |
| 2 | agentic-swe | claude-opus-4 (MCP-Atlas 77.3%) | L4 | 0.55 |
| 3 | bounded-code | claude-haiku-4.5 (SWE-V 73.3% at $0.80/M) | L4 + operator-L1 | 0.65 |
| 4 | math-chain | DeepSeek (AIME 2026 96%) | L4 | 0.55 |
| 5 | phd-factual | gemini-2.5-flash (GPQA 90.4% at $1.13/M) | L4 | 0.40 |
| 6 | computer-use | gpt-5-mini (OSWorld 72.1%) | L4 | 0.40 |
| 7 | multistep-general → **NO compound default** | smart-tier direct | **L1 own (M3.11+M3.11b)** | 0.92 |
| 8 | classification | llama-4-scout (sub-1s P50) | L4 | 0.40 |
| 9 | subsecond-latency | gemini-2.5-flash (1.06s P50) | L4 | 0.55 |
| 10 | closed-book | claude-opus-4 (avoid GPT-5; 86% halluc) | L4 | 0.40 |

Joint confidence in `cheapcode_general_agent_routes_optimally`: **@>=0.40** ([PLAN.bn SECTION X](plan/PLAN.bn)). Bounded by weakest L4 rule. Lift path: own-measurement on individual rules per atom 0011.

### M3.11 + M3.11b L1 measurement summary

The compound-wrapper bet was tested twice and falsified on cost+latency:

| Attempt | Benchmark | Cost ratio | Latency ratio | Completion ratio | Outcome |
|---|---|---:|---:|---:|---|
| M3.11 | curated simple N=10 | 1.855× | 5.490× | 1.000× | FAIL |
| M3.11b | hand-hard N=10 | 1.332× | 5.126× | 1.000× | FAIL |

Compound architecture ships with structural cost+latency overhead. Routing rule 7 enshrines this finding: **multistep-general dispatches direct to smart-tier; compound is operator-opt-in only.**

### Falsifiers (load-bearing for v1.0 ship)

cheapcode v1.0 ships when:
- All Phase 0..5 milestones complete ([SPEC Revision 2026-05-03k](SPEC.md))
- 4-client smoke regression passes
- Routing rule evidence is documented and replaceable

cheapcode v1.0 ship is falsified by any of:
- `obs_route_long_context_falsified` — independent NIAH/RULER shows flagship retention parity
- `obs_route_agentic_swe_falsified` — GPT-5 SWE-bench-Pro overtakes Opus
- `obs_route_math_chain_falsified` — independent re-run shows ≥10pt deepseek regression
- `obs_route_phd_factual_falsified` — independent re-run shows ≥10pt gemini-flash regression
- (etc., per [PLAN.bn SECTION X](plan/PLAN.bn))

## 8. Ethical considerations

- **Routing transparency:** every dispatch returns `providerMetadata.cheapcode.route` with the rule + evidence tier that triggered. Operators can audit, debug, and replace rules.
- **No data exfiltration beyond OpenRouter.** cheapcode dispatches via OpenRouter's API; no analytics or telemetry sent to cheapcode authors.
- **BYOK only.** Operator's API key, operator's spend. cheapcode adds no metering plane.
- **Vendor lock-in resistance:** routing rules are model-id strings, not provider-specific bindings. If a vendor changes pricing or breaks SLAs, operators swap one string in the routing table.
- **Honest disclosure:** when a rule's evidence is L4-only, the README says so. Atom 0015 (transfer overstated by default) is honored by capping confidence per source tier per [mizaj rule 11](../mizaj/rules/11-tier-the-source-before-citing.md).

## 9. Caveats and recommendations

### Caveats

1. **Most rules are L4-evidence (vendor blog + leaderboard).** Confidence ceiling 0.40 per mizaj 11. Lift path: own-measurement per atom 0011 — v1.x roadmap.

2. **Heuristic regex classifier.** ~10 task shapes detected by surface signature. False classifications fall through to `multistep-general` → smart-tier direct (safe default). When an operator notices a misclassification, file an issue with the prompt — adding a regex pattern is one line in [router.ts](src/router.ts).

3. **Compound wrapper preserved but default-off.** Cell #18 budget kept the code in the repo; SPEC Revision 2026-05-03k says compound fires only when operator sets `forceCompoundOnMultistep: true`. If you have evidence the wrapper helps on your slice, opt in and tell us — the rule can be updated.

4. **Avoid `closed-book` use of GPT-5 family** — vendor-derived L4 evidence shows 86% hallucination rate when the model can't tool-call ([source](https://findskill.ai/blog/gpt-5-5-hallucination-rate-how-to-use)). Routing rule 10 prefers Opus 4 for closed-book; operators can override per shape.

5. **Smart-fast latency is research-grounded, not measured.** claude-haiku-4.5 picked pending TTFT verification.

6. **Substrate-as-runtime-verifier (atom 0016 runtime claim) deferred.** TB-3 retrospective (M3.2) found substrate's strength is reasoning-with-citations consistency; TB-3-style benchmarks are code/system-correctness dominated. Build-time interpretation IS validated (M3.3 substrate tooling). Runtime test deferred to a follow-on project with fitter benchmark.

### Recommendations

- **Use the `auto` tier** for opencode work where you don't know the task shape upfront. The router picks. If wrong, add the misclassification's prompt pattern as a new regex case.
- **Set `forceCompoundOnMultistep: true` ONLY** if you have task-specific evidence the wrapper helps. Default-off is the M3.11/M3.11b L1 finding.
- **Override per-shape** via `cheapcode.toml`'s `[auto.routeOverrides]` section when you have a strong opinion about a specific shape's preferred model.
- **Audit the `cheapcode.route` trace** in opencode's verbose log to see why each request got its dispatch.
- **Lift L4 → L1** by running your own per-rule probe (atom 0011 — smallest distinguishing experiment first) and contributing the receipt back upstream.

---

## Quick start

```bash
# 1. Install
bun add @cheapcode/ai-sdk-provider

# 2. Configure opencode.json
cat > opencode.json <<EOF
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "cheapcode": {
      "npm": "@cheapcode/ai-sdk-provider",
      "name": "cheapcode tiers",
      "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
      "models": {
        "cheap":      { "name": "cheap (deepseek-v4-flash)", "tools": true },
        "cheap-fast": { "name": "cheap-fast (race-K)",        "tools": true },
        "smart":      { "name": "smart (gpt-5-mini)",         "tools": true },
        "smart-fast": { "name": "smart-fast (haiku-4.5)",     "tools": true },
        "auto":       { "name": "auto (router)",              "tools": true }
      }
    }
  }
}
EOF

# 3. Set OpenRouter API key
export OPENROUTER_API_KEY=sk-or-v1-...

# 4. Use opencode
opencode --model cheapcode/auto "Implement a function that sorts an array"
# → router classifies as "bounded-code" → dispatches to claude-haiku-4.5
```

## Reading order for contributors

1. [`README.md`](README.md) (this file) — what / why
2. [`SPEC.md`](SPEC.md) — constraints, falsifiers, in/out of scope, propagation hierarchy
3. [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — current state + what changes next
4. [`plan/PLAN.bn`](plan/PLAN.bn) — burhan-shape claim graph
5. [`plan/facts/`](plan/facts/) — citation chains for every routing rule

## Substrate

Paired with the operator's substrate suite (mizaj/burhan/khazina/daftar/mizan). Architecture decisions cite mizaj rules; load-bearing claims structured in burhan; routing-rule novelty cross-referenced against khazina atoms; daftar receipts at every milestone. The [substrate tooling](tools/) (`burhan-snapshot.sh`, `burhan-revisit.sh`) auto-audits the plan-graph before every commit.

## v2 — substrate-disciplined deployment (shipped 2026-05-03)

Per atom 0020 (adam-eve-compositor-with-reproductive-discipline) + cheapcode session 2026-05-03, v2 ships the bounded-form value-prop:

> **cheapcode v2 is substrate-disciplined deployment of frontier LLMs that prevents catastrophic-action-class failures (Cursor/Replit-style) via mandatory `mizan_check_action_safety` pre-gate, at parity correctness on tested classes, at lower aggregate cost via voter-only-on-uncertain routing.**

NOT "smarter than gpt-5.5 across all tasks" — that framing was empirically falsified session 2026-05-03 ($0.082 calibration, 30+ tests, 4-LLM cross-witness convergence on T0015 demonstrated frontier LLMs alone are at ~p>=0.99 on logical/code/clearly-phrased classes).

INSTEAD: cheapcode-with-mizan IS theoretically-grounded smarter on **5 specific axes** ([docs/theoretical-grounds.md](docs/theoretical-grounds.md)):

1. **Action-safety prevention** — `mizan_check_action_safety` pre-gate (sahih-validated empirically session 2026-05-03)
2. **Self-correction via cross-witness** — `mizan_verify_claim` + cross-LLM convergence detection (caught my own atom-over-application this session)
3. **Calibration discipline** — `mizan_verify_claim` ceiling-cap + bcmea-violation flagging
4. **Cross-session continuity** — daftar receipts + burhan claim accumulation + khazina atom inheritance
5. **Reproductive resource-discipline** — voter-only-on-uncertain routing rule (PLAN.bn SECTION UU) reserving expensive multi-witness for warranted cases

Each axis is real, theoretically grounded across 5+ traditions (Kahneman system-1/2 + Plato nous/logos + Augustine fallen-mortal-mind + formal-verification reasoner/checker + this engineering substrate; per atom 0019 convergence-without-contact).

### How to use cheapcode v2

1. **Register mizan-MCP-server** (one-time, user-scope):
   ```bash
   claude mcp add --scope user mizan -- $HOME/apps/adam/tools/mizan/bin/mizan-mcp-server
   ```
   Verify: `claude mcp list` shows `mizan: ... ✓ Connected`.

2. **Configure cheapcode auto-tier** in opencode/claude-code via `opencode.json`:
   ```json
   {
     "provider": {
       "cheapcode": {
         "npm": "@cheapcode/ai-sdk-provider",
         "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
         "models": { "auto": { "name": "auto", "tools": true } }
       }
     }
   }
   ```

3. **Operate**: Adam (your Claude Code session) invokes mizan tools at decision boundaries per global `~/.claude/CLAUDE.md` guidance:
   - `mcp__mizan__mizan_check_action_safety` before irreversible operations
   - `mcp__mizan__mizan_verify_claim` before high-confidence assertions
   - `mcp__mizan__mizan_physical_reality_probe` at consequential decision boundaries
   - `mcp__mizan__mizan_recommend_next_experiment` when unsure what to do next

4. **Verify deployment**: run [runs/m3-44-mizan-action-safety-smoke/run.sh](runs/m3-44-mizan-action-safety-smoke/run.sh) — should exit 0 with "PASS: action correctly blocked."

See [docs/mizan-integration.md](docs/mizan-integration.md) for the full operator deployment guide.

## v3 — standalone `cheapcode` binary (round 96, 2026-05-03)

Round 96 pivots cheapcode from "provider-package against vanilla opencode" to **a true fork of opencode that ships its own binary**. Acknowledges opencode as the fork-base; doesn't try to erase it.

```bash
# Build the standalone cheapcode binary for your platform.
# Requires: bun, ~/apps/opencode-upstream cloned at v1.14.33.
bash tools/build-cheapcode.sh
```

The harness:
1. Verifies `~/apps/opencode-upstream` is on tag `v1.14.33` with a clean tree.
2. Applies `patches/0001-cheapcode-branding.patch` (branding-only — name in display strings, ASCII logo, binary outfile).
3. Runs opencode's existing `script/build.ts` (which uses `bun build --compile`).
4. Copies artifacts to `dist/` and smoke-tests `cheapcode --version`.
5. Restores upstream to the clean tag on exit (always — even on failure).

The patches stay narrow: rebrand surfaces only. Anything semantic (routing logic, mizan integration, tier IDs) lives in `@cheapcode/ai-sdk-provider` so weekly upstream rebases stay trivial. The internal package name remains `opencode` so workspace dependencies inside the upstream monorepo still resolve.

To install the produced binary system-wide, copy `dist/cheapcode-<platform>-<arch>/bin/cheapcode` to a directory on your `PATH` (e.g., `~/.local/bin/cheapcode`).

## License

MIT.
