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

## Revision 2026-05-02b — architectural pivot: 5-model surgical add, no separate cheapllm process

Operator clarified: cheapllm is a thin wrapper around OpenRouter; the right cheapcode shape is **not** to plug an external cheapllm process into opencode, but to bake five tier-shaped synthetic models (`cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`) directly into opencode's provider registry, activated when an OpenRouter provider is detected. Knowledge transfer from cheapllm + iai is what makes these defaults defensible.

**Three load-bearing changes:**

**1. Architecture is one module + one provider-registry hook.**

Upstream `packages/opencode/src/provider/provider.ts` already special-cases OpenRouter (line 102 import, line 403 init, line 1343 model-specific check). The cheapcode change shape:

- New file: `packages/opencode/src/provider/cheapcode-tiers.ts` (~150 LoC) — exports `CHEAPCODE_TIERS` (5 model defs with target OR mapping + per-tier metadata) + `routeAuto(messages, opts)` (small heuristic for `auto`-mode).
- Modification: ~15 LoC inside `provider.ts` near the OpenRouter init block — when openrouter loads, register the 5 synthetic tier models alongside the upstream catalog.
- One config in `cheapcode.toml`: per-tier OR model overrides for operator customization.

**Honest niche framing (per cheapllm v1 H6 Q3-A and atom 0013 — disclosure IS the credential):**

`smart` and `smart-fast` tiers route directly to actual capable models. We do NOT replicate cheapllm-smart's router-based lift on cheap base, because cheapllm's own measurement (F-J2 11.1% on TB-medium/hard) shows the router-on-cheap-base under-performs for high-end multi-step reasoning.

But cheapcode goes one step further than cheapllm v1: `auto` tier is a **structured-reasoning wrapper** that targets cost-adjusted dominance on high-end multi-step reasoning. The wrapper combines:

1. **Plan decomposition** — smart-tier produces the plan; cheap-tier executes leaves
2. **Verifier hook** (cheapllm v1 just shipped this; we inherit) — catches confident-wrong outputs
3. **Cross-witness convergence** (Khazīna atom 0010) — second smart-tier pass that did not see the first synthesis; convergence is the high-trust signal
4. **Retry-with-feedback** — verifier-flagged outputs get explicit feedback + re-execution
5. **Long-context retrieval** — when input >128k, route through grok-4-fast for context-bound steps

The honest claim becomes: **cost-adjusted dominance on high-end multi-step reasoning** — cheapcode-auto produces ≥90% of raw frontier completion rate at ≤80% of raw frontier cost. Quality is bounded by the smart-tier base model (we cannot make it smarter than it is); the wrapper's contribution is *amortizing smart-tier calls across decomposition + cross-witness*, which lets us spend less per task at near-frontier quality.

Pre-registered falsifier: see [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md). If cheapcode-auto on TB-medium/hard cannot beat raw GPT-5.5 on cost-adjusted task completion, the hard-reasoning claim is dead and we revert to cheapllm v1's narrower niche framing.

Per-tier defaults (cheapllm v1 L1 receipts):

| Tier | Default OR model / strategy | Receipt source |
|---|---|---|
| `cheap` | `deepseek/deepseek-v4-flash` | cheapllm Phase 0 + F-E1; $0.0015–0.0032/task; 26–56× cheaper than GPT-5.5 |
| `cheap-fast` | race-K of `deepseek-v4-flash` + `*-flash-lite` (cheapllm-fast strategy) | cheapllm v1 race-K probe; 2.24s P50, no router |
| `smart` | `openai/gpt-5-mini` direct | cheapllm v1 F-E1; honest "user pays for capability"; no router-pretending |
| `smart-fast` | `anthropic/claude-haiku-4.5` or `openai/gpt-5-nano` | TBD — needs ≤2× latency benchmark vs `smart` |
| `auto` | **structured-reasoning wrapper**: long-context → `grok-4-fast`; hard-reasoning → plan-decompose (`smart`) + execute-leaves (`cheap`) + verify (`smart`) + cross-witness (`smart` blind) + retry-with-feedback; default → `cheap` | iai router design + cheapllm verifier hook + Khazīna atom 0010 cross-witness pattern |

Long-context special case (per cheapllm H3B receipt): when input >128k tokens, route through `x-ai/grok-4-fast` regardless of cheap/smart selection. NIAH 2M PASS at $0.37/call.

**2. "Fast" sacrifices intelligence, not cost.**

`cheap-fast` and `smart-fast` are same cost-tier as their non-fast counterparts but with smaller context, lower latency. Pre-registered: latency improvement >2× vs non-fast on a 5-call latency probe (else demote the fast variant).

**3. Multi-account support deferred per Khātim/Sanad lessons.**

Khātim's M7.1.2 multi-account web UI was the highest-cost-of-divergence move it made (`packages/app/` mirroring + 7 upstream-overlay diffs). cheapcode v1 ships single-account-per-provider; multi-account is **deferred** as a SHARED-MODULE addition to be earned by demand, not authored speculatively. Per mizaj rule 07 (stack-default-not-neutral) — multi-account is a default we explicitly reject for v1.

**Cells #14–#18 — surgical-fork discipline (revised 2026-05-02c for structured-reasoning wrapper):**

| # | Constraint | MIN | EXPECTED | IDEAL |
|---|---|---|---|---|
| 14 | Maintained code in cheapcode (excl. upstream tree) | ≤ 350 LoC | ≤ 600 LoC | ≤ 900 LoC |
| 15 | Files modified in upstream tree | ≤ 1 | ≤ 2 | ≤ 2 |
| 16 | New top-level packages | 0 | 0 | 0 |
| 17 | Cross-process protocols | 0 | 0 | 0 |
| 18 | `auto` wrapper code (subset of #14) | ≤ 200 LoC (basic plan+verify) | ≤ 400 LoC (full loop with retry+cross-witness) | ≤ 600 LoC (with adaptive K + tool-augmented retrieval) |

LoC budget ~doubled from Revision 2026-05-02b to admit the structured-reasoning wrapper. The wrapper is what earns the hard-reasoning claim; without it, we'd be back to cheapllm v1's narrower niche. Per atom 0011, the LoC bump is justified by a discriminating experiment (EXPERIMENT-1) that gates the larger LoC commitment — if the experiment fails on a minimal version, IDEAL-tier wrapper code is never written.

This is dramatically tighter than the prior cell #1 (≤500/1000/2000 LoC). The pivot earns it by collapsing the harness layer into a provider extension.

**Knowledge transfer sources locked:**

- **cheapllm** — model choices per tier (L1 receipts), 4-axis dominance discipline
- **iai** — router design (hardcoded mapping + apophatic fallback), refusal-over-fabrication discipline (~80 LoC router pattern)

Both are inherited as substrate-graded sahih segments (per mizaj 14); their receipts back the cheapcode model picks at L1 confidence.

---

## Sign-off

This SPEC takes effect once committed. Refinements after that require a new dated section (`## Revision YYYY-MM-DD`) plus a falsifier explaining why the change is load-bearing. The original matrix stays; nothing edits in place.

Substrate: Khazīna atom 0008 (claim-shape with runtime anchoring) — the SPEC is a contract; runtime evidence (LoC counts, smoke coverage, rebase log, cheapbench scores) must back its tier claims at every milestone.
