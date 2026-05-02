# LATESTMILESTONE — cheapcode

**Read this BEFORE [`plan/`](plan/).** The plan is the working draft; this file is the authoritative record of what's been completed and what should change next.

---

## M0 — scaffolded docs (2026-05-02)

### What was completed

- Created repo at `~/apps/cheapcode/` with three root docs and one plan file:
  - [`README.md`](README.md) — project purpose and reading order
  - [`SPEC.md`](SPEC.md) — pre-registered constraints (cells 1–12), propagation hierarchy, falsifiers F1–F3, scope boundaries
  - [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — this file
  - [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md) — the discriminating experiment that decides wrapper-vs-thin-fork-vs-patch-series
- No source code, no upstream fork, no `package.json`. Intentional.
- Working name `cheapcode` flagged as provisional in [`README.md`](README.md).
- Daftar receipt for the M0 scaffold to be added in the same commit.

### What was learned

The Khātim/Sanad post-mortem earlier in this session made the failure mode legible:

- Khātim: 1,152 ts/tsx files across 7 forked packages, 12 plan files including 4 duplicate-numbered `04-*.md`, web UI mirrored from Bāb with 7 upstream-overlay diffs in `packages/app/`, cross-repo callback-RPC tool host across two repos.
- Sanad: 25 plan files, multi-tenant control plane, three credential-shape paths, bootstrap-shape drift requiring a dedicated `bootstrapInstanceShape` factoring.
- Both: plans accreted faster than discriminating experiments.

The root cause was **layer-3 propagation** (per-client overlays) instead of **layer-1** (server-side single source of truth). cheapcode's discipline is the exact inversion: every feature declares its propagation layer, layer 3 is blocked by default, and the smoke regression must cover every upstream client surface on every merge.

### Honest concerns

- **Working name.** `cheapcode` is provisional; final name should be picked before the first source commit. A bad final name is hard to undo once `package.json` and the binary are published.
- **Upstream version pin.** SPEC says "weekly rebase against upstream" but no upstream tag is pinned yet. EXPERIMENT-0 must record the upstream commit / tag it ran against, since propagation surfaces shift across upstream versions.
- **F1 generality.** The discriminating experiment uses one feature (a system-prompt addon). If F1 passes for that feature but a later feature class (e.g. tool replacement, in-session memory, output-format constraints) fails layer 1, the architecture's "load-bearing" property only held for the easy case. EXPERIMENT-0's verdict must therefore propose at least one harder feature class to re-test before the architecture is considered fully validated.

### Plan changes implied

None yet — plan dir contains only EXPERIMENT-0 and that is the next step. After EXPERIMENT-0 resolves, [`plan/`](plan/) gains at most one of:
- `plan/01-fork-mechanics.md` (if EXPERIMENT-0 PASS): which upstream packages to fork, rebase posture, version pin
- `plan/01-halt-rationale.md` (if EXPERIMENT-0 FAIL): why the architecture is dead and what the operator should consider instead

### Pointer for the next agent

Run [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md). Do **not** fork opencode, do **not** write `package.json`, do **not** pick a final name until EXPERIMENT-0's kill-criteria resolve.

If the operator asks for design exploration before EXPERIMENT-0 runs, restrict it to **doc edits only**. No source code lands until F1 passes (or partial-passes with a documented layer-2 escalation).
