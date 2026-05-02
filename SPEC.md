# cheapcode — SPEC

**Status:** contract. Pre-registered before any source code or upstream fork. Refinements require a new dated `## Revision YYYY-MM-DD` section with a falsifier explaining why the change is load-bearing; do not edit in place.

**Substrate justification:** every cell below is anchored to either a Mizaj rule or a Khazīna atom. Substrate citations are inline.

**Daftar receipt:** to be added on M0 commit.

---

## The bar

cheapcode is the **smallest possible harness layer between vanilla opencode and the cheapllm model** such that:

1. Every upstream client surface (CLI, TUI, web, desktop) inherits cheapcode's added behavior automatically by consuming unchanged client APIs.
2. The maintained source-file count stays small enough that weekly upstream rebases remain cheap.
3. No new client surface is introduced beyond what vanilla opencode already ships.

If those three conditions hold, the project is the maintainable shape. If any breaks, the architecture is wrong and the project halts.

---

## Tier definitions (kill-criteria pre-registered, not negotiable)

| Tier | What it means | Kill-criterion |
|---|---|---|
| **MIN** | Below this, **we do not ship.** | Any single MIN cell fails its bound → halt. |
| **EXPECTED** | Realistic v0 target. | <80% of EXPECTED cells pass → ship as v0-rough; do not claim v1. |
| **IDEAL** | North star. | No kill-criterion; tracked as gap items. |

`MIN ⊆ EXPECTED ⊆ IDEAL`. (Mizaj rule 01 — falsifier-first.)

---

## Propagation hierarchy (load-bearing)

For any feature added to cheapcode, the propagation layer must be declared in the commit message. Lower-numbered = cheaper to maintain.

| Layer | What | When chosen |
|---|---|---|
| **1. Server / backend route** | Behavior added to the local opencode-compat server; all upstream clients pick it up by calling unchanged endpoints | default; first choice for every feature |
| **2. Shared client package** (`packages/shared`, `packages/sdk/js`) | One module imported by every client package | only if layer 1 is technically impossible |
| **3. Per-client overlay** | Modify a single client package's source | **blocked by default**; requires explicit waiver in PR |

Substrate: this hierarchy is the inversion of Khātim M7.1.2's failure mode. M7.1.2 added the credential-pool feature at layer 3 (mirrored across `packages/app/`) and accumulated 7 upstream-overlay diffs in client source — that is the maintenance pattern we are explicitly preventing.

---

## Constraint matrix

| # | Constraint | MIN | EXPECTED | IDEAL | Substrate |
|---|---|---|---|---|---|
| 1 | Source files cheapcode itself maintains (excl. upstream fork tree, node_modules, lockfiles) | ≤ 500 LoC | ≤ 1000 LoC | ≤ 2000 LoC | atom 0011 |
| 2 | New client surfaces beyond upstream | 0 | 0 | 0 | hard contract |
| 3 | Per-feature propagation layer | 1 or 2 only | layer 1 preferred | layer 1 mandatory | M02 generate-before-select |
| 4 | Per-feature client overlays (layer 3) | 0 | 0 | 0 | Khātim M7.1.2 negative-knowledge |
| 5 | Cross-repo wire protocols beyond upstream's | 0 | 0 | 0 | Khātim/Sanad M7.2 negative-knowledge |
| 6 | Multi-tenant database we add | none | none | none | Sanad negative-knowledge |
| 7 | Auth / credential pool / metering surface | none (BYOK only) | none | none | hard contract |
| 8 | Plan files | 1 (LATESTMILESTONE) | ≤ 3 | ≤ 5 | Khātim 12 + Sanad 25 negative-knowledge |
| 9 | Smoke regression coverage | CLI + TUI on cheapllm backend | + web + desktop | + matrix per upstream version | atom 0008 runtime-anchored claim-shape |
| 10 | Rebase cadence vs vanilla opencode | weekly cherry-pick or `git format-patch \| git am` | weekly | continuous (no divergence held) | atom 0011 |
| 11 | Env-var feature flags | 0 (one `cheapcode.toml`) | 0 | 0 | Khātim/Sanad SANAD_* flag accretion negative-knowledge |
| 12 | Per-user local state we add (in-session ledger, save-fact SQLite) | sqlite under user data dir | + indices | + explicit retention policy | atom 0008 |

---

## What is never in scope (any tier)

- **Not** a multi-tenant cloud service. No CF Workers, no Fly, no auth, no metering, no tenants table, no audit_log.
- **Not** a credential-pool / quota / cooldown router. BYOK; one credential at a time per backend.
- **Not** a custom callback-RPC tool protocol across repos. Tools execute via upstream's tool model.
- **Not** a new client surface. Whatever upstream ships is what cheapcode ships; we do not add a fifth client.
- **Not** a parallel `packages/app` or `packages/desktop` mirror with its own divergent UI subtree.
- **Not** a swarm orchestrator as its own product. If multi-account fan-out emerges as needed, it lives at layer 1 (server) or 2 (shared module), never as a new client.
- **Not** an LLM provider. We never train, fine-tune, or distill.

---

## Pre-registered falsifiers

Substrate: Mizaj rule 01 (falsifier-first). All three falsifiers must survive the smallest distinguishing experiment before any source-of-record commit.

### F1 — Propagation thesis

```
claim PROPAGATION_AT_LAYER_1: a cheapllm-tuned feature added at the server
  (or shared) layer is inherited by all four upstream client surfaces
  (CLI, TUI, web, desktop) without per-client source modification, on a
  contemporary upstream opencode tag. @>=0.70
falsified_when EXPERIMENT-0 reports any client requires a layer-3
  modification to observe the feature.
cheapest_probe: EXPERIMENT-0 itself (≤4h wall, ≤$1 spend).
```

### F2 — Maintenance budget

```
claim MAINT_BUDGET: source-file count cheapcode maintains stays
  ≤ 500 LoC (MIN) through 4 weeks of feature work after the first source
  commit. @>=0.70
falsified_when LoC > 500 within 4 weeks AND no MIN-tier cell breach
  was explicitly waived in a dated SPEC revision.
cheapest_probe: weekly `cloc src/` snapshot; halt at first breach.
```

### F3 — Client coverage

```
claim CLIENT_COVERAGE: every feature merge passes smoke regression
  against all upstream client surfaces shipping in the rebased upstream
  tag, with cheapllm as backend. @>=0.85
falsified_when any merge ships with one or more client surfaces uncovered
  by smoke and the gap is not justified in the merge note.
cheapest_probe: pre-commit hook running the four-client smoke; non-zero
  exit blocks the commit.
```

---

## Compat targets

Inherits exactly what vanilla opencode supports as backends. cheapllm is the **default** backend (per the "built for cheapllm" mandate) but cheapcode does NOT lose vanilla-opencode's other backend support, since that support comes from upstream and we don't subtract.

- cheapllm (default; `OPENAI_BASE_URL` pointed at the cheapllm server)
- any OpenAI-compatible endpoint (inherited from upstream)
- whatever else upstream supports at the rebased tag

---

## Decision rules baked in

1. **Propagation layer declared in every PR.** Layer 1 → no review concerns. Layer 2 → review the consumer list. Layer 3 → blocked by default.
2. **Tier downgrades, not feature deletes.** If a feature can't fit at the current tier's propagation discipline, downgrade the tier or defer the feature; do not delete the propagation rule.
3. **Each MIN cell that fails forces halt.** No exceptions.
4. **No new client surfaces.** If an idea requires its own client, it's a separate project.
5. **Weekly upstream rebase or no commit.** If the rebase backlog is more than one week, halt feature work until cleared.

---

## Revision 2026-05-02 — confidence target + cheapbench

Operator clarified v1 confidence target and smartness-measurement methodology. Three changes locked.

**1. Confidence target for v1 ship: `@>=0.95`.**

The discharge claim `cheapcode_v1_ships` in [`plan/PLAN.bn`](plan/PLAN.bn) was previously bounded by an implicit `@>=0.70` EXPECTED-tier floor. The operator-set target is **`@>=0.95`**, on the rationale that good engineering plus clean base knowledge (cheapllm receipts already at `@>=0.85`–`0.95` on three axes) carries most of the lift; internet research only validates competitors and triangulates. Internet research is a source but not a substitute — be careful not to be gullible (mizaj rule 04 separate-stated-from-revealed; mizaj rule 13 do-not-claim-transmission-without-isnad).

Falsifier on this revision itself: if `@>=0.95` is structurally unreachable for the smart axis (no engineering effort can bridge the gap), HALT and downgrade target rather than ship a weaker claim.

**2. Smartness measurement is cheapbench, not Terminal Bench.**

TB is a triangulation cell, not the goalpost. The smartness axis is measured via [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md): a project-owned benchmark using only publicly available data (no marginal LLM cost beyond cheapllm itself, no licensing). TB-easy and TB-18 remain in the scorecard as cross-witnesses; disagreement between cheapbench and TB is informative, not failure (atom 0010 cross-witness honesty).

Substrate: mizaj rule 07 (stack-default-is-not-neutral) — TB is the popular default; popularity does not imply alignment with cheapcode's goal of "smart general-agent harness." cheapcode's goal is making opencode smart, not winning a specific bench.

**3. New cell #13 — cheapbench coverage.**

| # | Constraint | MIN | EXPECTED | IDEAL |
|---|---|---|---|---|
| 13 | cheapbench coverage | ≥ 5 task shapes from ≥ 3 public sources, $0 marginal | ≥ 8 shapes from ≥ 4 sources | 12+ shapes from ≥ 5 sources, vendor-comparable cells where possible |

cheapbench MUST be pre-registered (atom 0011) before any cheapcode run, and gold answers MUST derive from the public data's own structure (not LLM-generated synthesis). See [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) for full design.

**4. Cell #8 clarification — `plan/` budget governs top-level only.**

Cell #8 (plan files: MIN 1 / EXPECTED ≤3 / IDEAL ≤5) governs **top-level architectural plan files** at `plan/*.{md,bn}`. Citation-fact files at `plan/facts/*.bn` are a separate concern: they hold L1 substrate + measurement receipts that PLAN.bn cites via burhan's `cite` mechanism, and they grow with research without inflating architectural-decision surface. Each fact file is scoped to one credibility tier or one source class (per mizaj rule 11).

**5. New substrate dependency: mizaj rule 11.**

This SPEC now depends on mizaj rule 11 (tier-the-source-before-citing) as the canonical credibility ladder. Confidence updates in [`plan/PLAN.bn`](plan/PLAN.bn) MUST cite a source tier per M11 before raising any `@>=0.XX` value. CONFIDENCE.md reproduces the ladder for self-containment but the canonical version is the mizaj rule.

**6. Multi-file burhan via [`tools/burhan-validate.sh`](tools/burhan-validate.sh).**

Burhan's CLI takes one file. The validation script concatenates `plan/facts/*.bn` (sorted) before `plan/PLAN.bn`, so lemmas in fact files are registered in the lemma store before PLAN.bn citations evaluate. Run `tools/burhan-validate.sh` instead of `python3 -m burhan.cli plan/PLAN.bn` directly.

---

## Revision 2026-05-02e — operator-tightened constraints + multistep-only smarter claim

Operator updated MAIN.md with three material changes that propagate upstream:

**1. Constraints tightened:**

| Constraint | Old | New |
|---|---|---|
| Cost | $50 | **$10** (same envelope as cheapllm v1) |
| Time | ~1 week | **24h wall-clock** |
| Hardware | laptop only | **laptop + RTX 4070 during build** (not after handoff) |

**Implications:**

- EXPERIMENT-1 budget cuts from ≤$50 to ≤$5 (one-fifth the previous). Smaller N (10 tasks instead of 30), tighter run.
- 24h envelope = MIN-tier wrapper or nothing. Cells #14 and #18 cap at MIN.
- RTX 4070 available during build means local model serving for testing is on the table — could reduce per-experiment OpenRouter cost via local cheap-tier baseline runs. Post-handoff, only OpenRouter (no local GPU dependency).

**2. Smarter claim is now MULTISTEP-only.**

The honest claim refines: cheapcode is smarter than raw GPT-5.5 on **multistep hard reasoning** specifically — not on single-step tasks. Single-step is bounded by the best frontier model in the ensemble (you can't make GPT-5 smarter than itself on a single call). Multistep is where decomposition + best-of-K + cross-model verification + retry leverage compounds.

This is a *tighter* claim with *higher* defensibility. Per atom 0013, the disclosure of single-step boundedness IS the credential — we don't pretend ensemble methods break the single-call ceiling.

**3. EXPERIMENT-1 scope narrows accordingly.**

Pre-registered task slice changes from "TB-medium / TB-hard generic" to "TB-medium / TB-hard MULTISTEP slice." Single-step TB tasks are excluded from the comprehensive-dominance claim. Falsifier on single-step axis is dropped (we don't claim it).

---

## Revision 2026-05-02b — architectural pivot: 5-model surgical add, no separate cheapllm process

Operator clarified: cheapllm is a thin wrapper around OpenRouter; the right cheapcode shape is **not** to plug an external cheapllm process into opencode, but to bake five tier-shaped synthetic models (`cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`) directly into opencode's provider registry, activated when an OpenRouter provider is detected. Knowledge transfer from cheapllm + iai is what makes these defaults defensible.

**Three load-bearing changes:**

**1. Architecture is one module + one provider-registry hook.**

Upstream `packages/opencode/src/provider/provider.ts` already special-cases OpenRouter (line 102 import, line 403 init, line 1343 model-specific check). The cheapcode change shape:

- New file: `packages/opencode/src/provider/cheapcode-tiers.ts` (~150 LoC) — exports `CHEAPCODE_TIERS` (5 model defs with target OR mapping + per-tier metadata) + `routeAuto(messages, opts)` (small heuristic for `auto`-mode).
- Modification: ~15 LoC inside `provider.ts` near the OpenRouter init block — when openrouter loads, register the 5 synthetic tier models alongside the upstream catalog.
- One config in `cheapcode.toml`: per-tier OR model overrides for operator customization.

**Honest 3-axis comprehensive-dominance claim (revised 2026-05-02d):**

`smart` and `smart-fast` tiers route directly to actual capable models — but the `auto` tier goes further: it is a **structured-reasoning wrapper that uses frontier models internally** (GPT-5.5 / Claude Opus / Gemini-pro / etc. via OpenRouter) and combines them with ensemble + verification techniques to beat **raw single-frontier-model calls on all three axes simultaneously**: cost, latency, and completion rate.

The structural reason this is achievable: when an agent is allowed to spend more compute on planning + verification + cross-model checking, well-documented results show 5–15% completion-rate lift on hard reasoning benchmarks vs single-call frontier (AlphaCode-2 vs raw Gemini, METR's verification-augmented Claude evals). The wrapper's task is to capture that lift while routing routine work to cheap-tier so that *average* cost stays below frontier.

Wrapper components:

1. **Task-type detection** — routine → cheap tier (most calls); long-context → grok-4-fast; hard-reasoning → ensemble loop
2. **Plan decomposition** — smart-tier produces the plan; cheap-tier executes leaves in parallel where possible
3. **Best-of-K sampling** — K=3 frontier samples on the synthesis step
4. **Cross-model verification** (Khazīna atom 0010) — verifier is a *different* frontier model than the synthesizer; disagreement triggers retry
5. **Retry-with-feedback** — verifier-flagged outputs get explicit feedback + re-execution (max 1 retry)
6. **Tool-augmented retrieval** — for context-heavy sub-tasks, grok-4-fast pulls relevant context

Honest claim: **cheapcode is alot cheaper, alot faster, AND smarter than raw GPT-5.5** on hard reasoning, all three axes simultaneously, on a pre-registered TB-medium/hard slice. Per atom 0013, disclosure of HOW (multi-model ensemble + verifier + plan-decompose, all transparent) is the credential.

Quantitative targets (pre-registered, see [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md)):

| Axis | Target ratio (wrapper ÷ raw GPT-5.5) | Honest framing |
|---|---|---|
| Cost per task | ≤ 0.30 | "3× cheaper or better" |
| Latency P50 | ≤ 0.70 | "30% faster or better" |
| Completion rate on TB-medium/hard | ≥ 1.10 | "10% higher or better" |

Falsifier: any axis missing its target = HARD-REASONING claim falsified on that axis. All three must hold for the comprehensive-dominance claim to ship.

Per-tier defaults (cheapllm v1 L1 receipts):

| Tier | Default OR model / strategy | Receipt source |
|---|---|---|
| `cheap` | `deepseek/deepseek-v4-flash` | cheapllm Phase 0 + F-E1; $0.0015–0.0032/task; 26–56× cheaper than GPT-5.5 |
| `cheap-fast` | race-K of `deepseek-v4-flash` + `*-flash-lite` (cheapllm-fast strategy) | cheapllm v1 race-K probe; 2.24s P50, no router |
| `smart` | `openai/gpt-5-mini` direct | cheapllm v1 F-E1; honest "user pays for capability"; no router-pretending |
| `smart-fast` | `anthropic/claude-haiku-4.5` or `openai/gpt-5-nano` | TBD — needs ≤2× latency benchmark vs `smart` |
| `auto` | **3-axis-dominance wrapper**: long-context → `grok-4-fast`; hard-reasoning → plan-decompose + parallel-execute-leaves at cheap-tier + best-of-K=3 frontier synthesis + cross-MODEL verification (different frontier model from synthesizer) + retry-with-feedback; default → `cheap`. Frontier models in the ensemble include GPT-5.5, Claude Opus, Gemini-pro — not bounded by single-model capability. | iai router design + cheapllm verifier hook + Khazīna atom 0010 + ensemble-method literature (AlphaCode-2, METR verification-augmented Claude) |

Long-context special case (per cheapllm H3B receipt): when input >128k tokens, route through `x-ai/grok-4-fast` regardless of cheap/smart selection. NIAH 2M PASS at $0.37/call.

**2. "Fast" sacrifices intelligence, not cost.**

`cheap-fast` and `smart-fast` are same cost-tier as their non-fast counterparts but with smaller context, lower latency. Pre-registered: latency improvement >2× vs non-fast on a 5-call latency probe (else demote the fast variant).

**3. Multi-account support deferred per Khātim/Sanad lessons.**

Khātim's M7.1.2 multi-account web UI was the highest-cost-of-divergence move it made (`packages/app/` mirroring + 7 upstream-overlay diffs). cheapcode v1 ships single-account-per-provider; multi-account is **deferred** as a SHARED-MODULE addition to be earned by demand, not authored speculatively. Per mizaj rule 07 (stack-default-not-neutral) — multi-account is a default we explicitly reject for v1.

**Cells #14–#18 — surgical-fork discipline (revised 2026-05-02d for 3-axis comprehensive-dominance wrapper):**

| # | Constraint | MIN | EXPECTED | IDEAL |
|---|---|---|---|---|
| 14 | Maintained code in cheapcode (excl. upstream tree) | ≤ 500 LoC | ≤ 900 LoC | ≤ 1400 LoC |
| 15 | Files modified in upstream tree | ≤ 1 | ≤ 2 | ≤ 2 |
| 16 | New top-level packages | 0 | 0 | 0 |
| 17 | Cross-process protocols | 0 | 0 | 0 |
| 18 | `auto` wrapper code (subset of #14) | ≤ 350 LoC (plan+verify+best-of-K) | ≤ 700 LoC (cross-model + retry + parallel exec) | ≤ 1000 LoC (adaptive K + tool-augmented retrieval) |

LoC budget bumped again (M1.1 → M1.2) to admit cross-model ensemble + best-of-K + parallel execution. Per atom 0011 (smallest-distinguishing-experiment-first), each tier of LoC is gated by a measurement that earns it:

- MIN tier (≤350 LoC wrapper): EXPERIMENT-1's basic kill-criteria must PASS — wrapper hits all 3 axis targets on a 10-task probe.
- EXPECTED tier (≤700 LoC wrapper): EXPECTED kill-criteria — wrapper hits 3-axis targets on a 30-task probe with cross-model verification active.
- IDEAL tier (≤1000 LoC wrapper): IDEAL kill-criteria — wrapper hits 3-axis targets on a 50-task probe across coding + reasoning + math sub-domains.

If MIN tier fails, no further LoC budgeted. If EXPECTED fails, ship at MIN. The LoC budget IS the falsifier-gated commitment per Khazīna atom 0011.

This is dramatically tighter than the prior cell #1 (≤500/1000/2000 LoC). The pivot earns it by collapsing the harness layer into a provider extension.

**Knowledge transfer sources locked:**

- **cheapllm** — model choices per tier (L1 receipts), 4-axis dominance discipline
- **iai** — router design (hardcoded mapping + apophatic fallback), refusal-over-fabrication discipline (~80 LoC router pattern)

Both are inherited as substrate-graded sahih segments (per mizaj 14); their receipts back the cheapcode model picks at L1 confidence.

---

## Revision 2026-05-02f — locked phase sequence with falsifier gates

Operator: "lock in the plan from the start, set falsifications along the way, any experiments count toward 24h wall-clock, supplement with research to avoid redundant experiments."

The plan is now LOCKED at 6 sequential phases. Each phase has explicit time + cost budget, a falsifier gate, and a pivot path if the gate triggers. **Any experiment in any phase counts toward the 24h envelope.** Each phase MUST consult research synthesis (mizaj rule 16) BEFORE running an experiment — if research can answer the question, no experiment runs.

### Phase budget table (locked)

| # | Phase | Wall | Cost | Cumulative wall | Cumulative cost |
|---|---|---|---|---|---|
| 0 | Final research synthesis | 2h | $0 | 2h | $0 |
| 1 | Fork + 5-tier registration (no wrapper) | 4h | $0 | 6h | $0 |
| 2 | Auto wrapper MIN + EXPERIMENT-1 | 6h | $5 | 12h | $5 |
| 3 | Smoke regression on 4 clients | 2h | $0 | 14h | $5 |
| 4 | Scorecard + README | 2h | $1 | 16h | $6 |
| 5 | Ship | 1h | $0 | 17h | $6 |
| | Buffer | 7h | $4 | 24h | $10 |

### Phase 0 — Final research synthesis

**Goal:** lock cheap-fast and smart-fast model picks; lock minimal-LoC implementation sketch; final mizaj-16 sweep on remaining open umbrellas.

**Process:** WebSearch + WebFetch on the 2-3 questions still open (specific OR-catalog models for cheap-fast race-K + smart-fast latency probe). NO experiments here.

**Falsifier gate (HALT condition):** if research surfaces evidence that any umbrella's confidence is materially below current values (e.g., a recent paper falsifies the test-time-compute thesis), HALT the project and re-evaluate. Operator-direction required to proceed.

**Output:** `runs/phase-0/decisions.md` with locked model picks + sketch.

### Phase 1 — Fork + 5-tier registration (no wrapper)

**Goal:** working cheapcode binary that exposes 5 tier models when OpenRouter is connected. NO auto-wrapper yet (deferred to Phase 2).

**Process:**
1. `git format-patch | git am`-friendly fork of `~/apps/opencode-upstream/` at pinned tag.
2. New module `packages/opencode/src/provider/cheapcode-tiers.ts` (~150 LoC).
3. Modification ~15 LoC in `packages/opencode/src/provider/provider.ts` to register the 5 tier models when OpenRouter loads.
4. CLI smoke: `opencode run --model cheap "say hello"` returns output.

**Falsifier gate (Phase 1 → Phase 2 transition):**

- If 5 tier models do NOT appear in `opencode --list-models` output → umbrella 3 actually falsified. **Pivot:** investigate plugin-only path (`opencode.json` pointer) as fallback; if also fails, halt and reconsider.
- If LoC for the change exceeds 350 (MIN cell #14) → architectural review required before continuing. The wrapper budget in Phase 2 is at risk.

**Output:** working cheapcode v0.1 binary (5 tiers, no wrapper).

### Phase 2 — Auto wrapper MIN + EXPERIMENT-1

**Goal:** auto tier with structured-reasoning wrapper (plan-decompose + best-of-K=3 + verifier; no cross-model yet — that's IDEAL tier per cell #18). Run EXPERIMENT-1 to test the 3-axis dominance claim.

**Process:**
1. Implement wrapper logic in `cheapcode-tiers.ts` (incremental ~150 LoC, total ~300 LoC).
2. Run EXPERIMENT-1 per [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md): N=10 multistep TB-medium/hard tasks, baseline raw GPT-5.5, wrapper at MIN tier, ≤$5 ≤3h.
3. **Pre-experiment research check (mizaj 16):** if a synthesizable result already exists for the exact axis being measured, skip the experiment for that axis.

**Falsifier gate (Phase 2 → Phase 3 transition):**

| EXPERIMENT-1 outcome | Action |
|---|---|
| **PASS-IDEAL** (3-axis hit, N=30 hypothetical) | Not reachable in MIN-tier; treat as PASS-EXPECTED |
| **PASS-EXPECTED** (3-axis hit, N=10) | **Continue to Phase 3 with full wrapper.** Joint approaches ~0.84 |
| **PASS-MIN** (narrow margins) | **Continue with disclosed narrow margins.** Joint ~0.74 |
| **PARTIAL** (2 of 3 axes pass) | **Reframe to 2-axis claim, continue to Phase 3 with reframed scope.** Joint ~0.70 |
| **FAIL** (≤1 axis passes OR cost overrun) | **Revert wrapper code; continue to Phase 3 with 5 tiers only and disclose narrower niche.** Joint ~0.59 |

**Output:** wrapper code + 3-axis EXPERIMENT-1 verdict + scorecard data.

### Phase 3 — Smoke regression on 4 clients

**Goal:** verify 5 tiers (and wrapper if Phase 2 PASS) inherit cleanly to CLI / TUI / web / desktop.

**Process:**
1. Bring up local opencode server.
2. Run smoke test from each client: invoke `cheap` tier, observe output.
3. Verify model list includes all 5 tiers in each client.
4. **Pre-test research check:** if opencode docs already prove inheritance for the client class, skip that client's smoke test.

**Falsifier gate:**
- Any client surface fails to see the 5 tiers → **umbrella 3 actually falsified** despite 0.97 research confidence. Halt; investigate; if not quickly fixable, ship CLI-only with disclosed gap.

**Output:** 4-client smoke matrix (4× green or honest gap disclosure).

### Phase 4 — Scorecard + README

**Goal:** measured 3-axis scorecard cited in README. Honest disclosure of what passed and what didn't.

**Process:**
1. Compute final cost/latency/completion ratios from EXPERIMENT-1 + Phase 3 data.
2. Write README with scorecard table + cited competitors (Codex pricing per fact 04).
3. Disclose narrow margins or failed axes per Phase 2 outcome.

**Falsifier gate:**
- If measured ratios in README contradict the SPEC's targets without explicit reframing → mizaj 04 (separate-stated-from-revealed) violation. Hold ship; honestly reframe before ship.

**Output:** README with 4-axis honest scorecard.

### Phase 5 — Ship

**Goal:** v1.0.0 tag + daftar receipt + handoff.

**Process:**
1. `git tag v1.0.0` on the cheapcode fork.
2. Daftar receipt: `bun ~/apps/daftar/bin/daftar add note --project="/home/mk/apps/cheapcode" --title="cheapcode v1.0.0 shipped"`.
3. Update MAIN.md progress to 100% with final joint confidence number.

**No falsifier gate** — Phase 5 is administrative wrap-up. If reached, the project shipped.

### Cross-phase research-first discipline (mizaj 16 enforced)

**Before any experiment in any phase**, the agent MUST:
1. Run a research synthesis check on the question being measured.
2. If a citation chain at L3 mutawatir or L1 already answers the question with sufficient confidence (≥0.85), **skip the experiment** and cite the synthesis instead.
3. If research is inconclusive AND the experiment would cost <2% of remaining wall-clock, run it.
4. If research is inconclusive AND experiment cost >2% remaining wall-clock, run an even smaller probe first (e.g., N=3 instead of N=10).

This is the operator's instruction: experiments count toward the 24h envelope; research is free; do research first.

### Project-level halt conditions

The whole project halts (not just a phase pivots) under any of:

- **Wall-clock at 22h+ with Phase 2 not started** — too aggressive a target; honestly admit and ship narrower.
- **Cumulative spend at $9+ before Phase 4** — budget breach; honestly disclose and ship.
- **Any umbrella's research-equivalent confidence drops materially during Phase 0** — research uncovered a structural problem; reconsider the plan's load-bearing assumptions.
- **opencode upstream changes provider extension architecture between fork-time and Phase 3** — rebase pain higher than budgeted; assess.

---

## Revision 2026-05-02g — adopt 3 battle-tested parallel standards

Operator: "see if there are well supported and tested parallel standards online that we can use to make our plan better."

Surveyed substrate suite parallels: W3C PROV, GRADE, Model Cards, Datasheets for Datasets, ADRs, Toulmin model, PRISMA. Adopted the three with highest leverage at lowest cost; deferred others with explicit rationale.

### Adoption 1 — Model Cards (Mitchell et al. 2019) for Phase 4 README

Phase 4's scorecard now structures the README per the [Model Cards format](https://arxiv.org/abs/1810.03993). Standard sections:

1. **Model details** — name, version, author, type, training algorithms / parameters, license
2. **Intended use** — primary use cases, primary users, out-of-scope use cases
3. **Factors** — relevant groups, instrumentation, environment
4. **Metrics** — model performance measures, decision thresholds, variation approaches
5. **Evaluation data** — datasets, motivation, preprocessing
6. **Training data** — (n/a for cheapcode wrapper; routes to upstream models)
7. **Quantitative analyses** — unitary results, intersectional results
8. **Ethical considerations** — data use, human life impact, mitigations, risks/harms, use cases sensitive
9. **Caveats and recommendations** — what we don't know, recommendations for use

Adoption rationale: Hugging Face + Meta + Google + OpenAI all use Model Cards. The format is immediately recognizable to ML researchers and aligns expectations. Zero plan-change cost (just a README template). Atom 0013 alignment: explicit caveats section IS the calibration credential.

### Adoption 2 — GRADE downgrade criteria checklist for research synthesis

[GRADE](https://www.cochrane.org/learn/courses-and-resources/cochrane-methodology/grade) (adopted by WHO, NICE, Cochrane, BMJ, 20+ orgs) has 5 explicit domains for downgrading evidence quality:

| Domain | What to check |
|---|---|
| Risk of bias | Study design + execution flaws |
| Inconsistency | Heterogeneity of effect estimates across studies |
| Indirectness | Different population / intervention / outcomes from claim |
| Imprecision | Wide confidence intervals / small N |
| Publication bias | Cherry-picked or vendor-published results |

**Application:** Augment [`tools/research-equivalence.ts`](tools/research-equivalence.ts)'s formula with a GRADE-checklist pre-flight: for each cited source at L3, run the 5-domain check; downgrade tier by 1 step if any domain triggers. Exposes over-statements like cheapllm-v1's 7× atom-0015 firings BEFORE they enter the joint.

This complements (does not replace) mizaj rule 11. Mizaj 11 = source-class axis (L1-L5). GRADE = evidence-quality axis (downgrades within tier). Both apply.

### Adoption 3 — ADR (Nygard format) for LATESTMILESTONE entries

[ADR (Architectural Decision Records)](https://adr.github.io/) format by Michael Nygard is a 5-section structure: Title / Status / Context / Decision / Consequences.

We're already approximating this in milestone entries. Locking the format going forward:

```markdown
## MN.X — <Title> (YYYY-MM-DD)

### What changed (Status: Accepted / Superseded / Deprecated)
### What was learned (Context)
### Decision (the locked move)
### Consequences (good + bad)
### Pointer for the next agent
```

Adoption rationale: ADR is an established software-engineering standard. Aligning makes our decision log readable to engineers outside this project without context.

### Deferred standards (with rationale)

| Standard | Why deferred |
|---|---|
| **W3C PROV** | Substantial substrate change to daftar Sahih's `isnad` schema; low current benefit (no PROV consumers in scope). Revisit if interop with research data tools becomes load-bearing. |
| **Toulmin model** (claim/warrant/backing) | Would inflate burhan parser; current concat-tool + claim/falsifier/cite is sufficient at this scale. Revisit if claim-shape complexity grows. |
| **PRISMA full** (27-item systematic-review checklist) | Overkill for cheapcode's ≤20-source synthesis scope; light pieces already in CONFIDENCE.md. Revisit if cheapcode publishes a meta-analysis-style scorecard. |

Per mizaj rule 02 (generate-before-select) + mizaj 07 (stack-default-not-neutral): these aren't "rejected forever" — they're triaged with explicit thresholds for revisit.

---

## Sign-off

This SPEC takes effect once committed. Refinements after that require a new dated section (`## Revision YYYY-MM-DD`) plus a falsifier explaining why the change is load-bearing. The original matrix stays; nothing edits in place.

Substrate: Khazīna atom 0008 (claim-shape with runtime anchoring) — the SPEC is a contract; runtime evidence (LoC counts, smoke coverage, rebase log, cheapbench scores) must back its tier claims at every milestone.
