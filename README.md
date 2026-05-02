# cheapcode

A maintainable opencode-compatible harness, paired with the [cheapllm](../cheapllm/) model.

**Status:** scaffolded only. No source code, no upstream fork yet. Pre-experiment phase.

**Working name:** `cheapcode`. Provisional. The final name is intentionally deferred until the discriminating experiment in [plan/EXPERIMENT-0.md](plan/EXPERIMENT-0.md) resolves the wrapper-vs-thin-fork-vs-patch-series question, since the right answer changes which name fits.

---

## What this project is

A "better opencode fork built for cheapllm" that:

1. Preserves what makes vanilla opencode useful — the CLI, TUI, web UI, and desktop client surfaces it already ships.
2. Swaps in cheapllm-aware prompts, tools, and memory at the **single smallest propagation point** so every upstream client surface inherits the change without per-client overlays.
3. Avoids the maintenance cliff that retired Khātim and Sanad: 1,152 source files across 7 forked packages, 37 plan files across two repos, a 3-way compat matrix preserved by env-var flags, and cross-repo callback-RPC.

The load-bearing rule is **propagation-point-first design**: every feature lands at one layer (server endpoint, shared module, or last-resort per-client overlay) and the layer choice is justified before the code is written.

## What this project is NOT

- Not a multi-tenant cloud service. (Sanad's mainline; permanently retired.)
- Not a swarm orchestrator as a new client surface. (Khātim's M7.0 thesis; permanently retired.)
- Not a custom auth / credential pool / metering plane. BYOK only.
- Not a parallel reality with N clients to maintain by hand.
- Not a new client surface beyond what vanilla opencode already ships.

## Reading order

1. [`README.md`](README.md) (this file) — why
2. [`SPEC.md`](SPEC.md) — what (constraints, falsifiers, in/out of scope, propagation hierarchy)
3. [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — where we are now and what changes next
4. [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md) — the discriminating experiment that gates everything else

## Substrate

This project is paired with the operator's substrate suite (mizaj, burhan, khazina, daftar, aapi). Architecture decisions cite mizaj rules, structure claims in burhan shape, query and receipt the daftar shard, and grep khazina atoms before extending. Pre-registered falsifiers gate every architectural commitment.

## Naming alternatives (pick one before the first commit of source code)

- `cheapcode` — paired with cheapllm; risk: visually too close to "cheapllm"
- `oc-thin` / `oc-cheap` — describes posture explicitly; risk: less brandable
- a fresh non-Arabic word — operator preference, since the Khātim/Sanad/Bāb namespace is being retired

The README will be rewritten when the name is finalized.
