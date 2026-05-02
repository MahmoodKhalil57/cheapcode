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

## Sign-off

This SPEC takes effect once committed. Refinements after that require a new dated section (`## Revision YYYY-MM-DD`) plus a falsifier explaining why the change is load-bearing. The original matrix stays; nothing edits in place.

Substrate: Khazīna atom 0008 (claim-shape with runtime anchoring) — the SPEC is a contract; runtime evidence (LoC counts, smoke coverage, rebase log) must back its tier claims at every milestone.
