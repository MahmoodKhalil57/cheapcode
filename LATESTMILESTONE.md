# LATESTMILESTONE — cheapcode

**Read this BEFORE [`plan/`](plan/).** The plan is the working draft; this file is the authoritative record of what's been completed and what should change next.

---

## M0.2 — operator decisions locked + cheapbench design (2026-05-02)

### What was completed

- [`SPEC.md`](SPEC.md) Revision 2026-05-02 — confidence target `@>=0.95` (operator-set), smartness via cheapbench (not TB), new cell #13 for cheapbench coverage.
- [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) — design doc for project-owned smartness benchmark. 8 candidate task shapes (S1–S8) drawn from public data sources (Stack Overflow, Linux man pages, CPython, GitHub repos/PRs, Actions logs). Constraints: $0 marginal cost, gold answers derived from public-data structure (no LLM-generated synthesis), pre-registration mandatory.
- [`plan/PLAN.bn`](plan/PLAN.bn) — added Section H (cheapbench claims), 11 new observation claims (cheapbench + 3 new competitors: Continue, Cursor, Devin), updated `cheapcode_outperforms_named_alternatives` theorem to require cheapbench claims, added or-falsifier on discharge claim. Re-validated with burhan: `True`.
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — operator-confirmed decisions section (4 answers locked), source-credibility ladder L1–L5 (mizaj 04 + 13), per-claim source plan revised to prefer L1 own-measurement over vendor numbers, halt condition extended.

### Operator decisions locked

1. Terminus identity doesn't matter — TB is not the goal.
2. Competitor scope = full list (Codex, opencode, Claude Code, Aider, Goose, Terminus, Continue, Cursor, Devin).
3. Headline benchmark = portfolio (cheapbench primary + TB triangulation).
4. Confidence floor = `@>=0.95`. Internet research is a source not a substitute; "be careful not to be gullible."

### What was learned

The smartness-axis framing changed. cheapcode is not optimizing for any single bench; it's building a project-owned bench that costs $0 marginal and uses public data, with TB as triangulation. This decouples the project from external benchmark drift and makes per-feature impact measurable without budget gating. The L1–L5 source-credibility ladder is the operationalization of "don't be gullible" — every confidence update PR must surface tier + quote + access date.

The `@>=0.95` target raises the bar substantially. Most of the lift comes from L1 own-measurement, not from internet research. cheapbench design is therefore the load-bearing artifact for the smart axis; CONFIDENCE.md research is the load-bearing artifact for cost/latency competitive cells.

### Honest concerns

- **Plan-dir budget pressure.** Plan files now at 4 (EXPERIMENT-0, PLAN.bn, CONFIDENCE.md, CHEAPBENCH.md), within IDEAL `≤5` of SPEC cell 8 but above EXPECTED `≤3`. Any further plan file should fold into existing docs rather than spawn a 5th.
- **Cheapbench design floor heuristic** (≥60% MIN / ≥75% EXPECTED / ≥85% IDEAL) is currently a guess. Refine before first cheapbench run by piloting 1–2 task shapes against vanilla-opencode + cheapllm to calibrate the floor honestly (mizaj 01 — falsifier-first; setting the floor too low rewards mediocre engineering).
- **`@>=0.95` target may be unreachable for some Section E claims.** Specifically, hosted-only competitors (Codex, Claude Code, Devin, Cursor) can't be benchmarked at L1 against cheapbench. Their cells max at L2/L4 credibility. If those caps prevent `@>=0.95` on per-competitor claims, the discharge claim's confidence is bounded below — accept that honestly rather than overclaim.

### Plan changes implied

- After EXPERIMENT-0 PASS: pilot 2 cheapbench task shapes to calibrate the floor heuristic; update CHEAPBENCH.md and PLAN.bn observations.
- Before first cheapbench run: pre-register tasks per CHEAPBENCH.md template (manifest.json + git tag + daftar receipt).
- Research pass on Section E: start with L1 sources for open-source competitors (Aider, Goose, Continue), L2 for hosted (Codex, Claude Code, Cursor), bracket Devin and Terminus.

### Pointer for the next agent

Before any code lands:
1. Read [`SPEC.md`](SPEC.md) Revision 2026-05-02 for the confidence target + cheapbench split.
2. Read [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) for the smartness-measurement methodology.
3. Read [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) source-credibility ladder before consulting any external source.
4. Run EXPERIMENT-0 (gates the fork). After PASS, pilot cheapbench shapes to calibrate floor.
5. Begin Section E research only after the credibility ladder is internalized — no L4–L5-only confidence updates.

---

## M0.1 — burhan-shape plan + research-confidence template (2026-05-02)

### What was completed

- [`plan/PLAN.bn`](plan/PLAN.bn) — burhan-shape pre-registration of the cheapcode thesis. Encodes 22 named claims across 7 sections (A backend / B propagation / C substrate-tools / D maintenance / E competitive / F composed theorems / G discharge), each with explicit `falsified_when` clause and honest `@>=0.XX` confidence per khazina atom 0015 (transfer overstated by default).
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — research-driven calibration protocol. Per-section source list, competitive-scorecard shape, halt condition for Section E, mizaj rule 05 `'illah`-citation methodology, daftar receipt template, dated revision log.
- Top-level claim `cheapcode_v1_ships` is currently UNDISCHARGED at @>=0.30, bounded above by Section E competitor-comparison claims that need research to lift.

### What was learned

The plan-language separation (burhan claims vs research evidence) makes the discipline visible: the .bn file is the contract; CONFIDENCE.md is the receipt. This mirrors cheapllm's SPEC-then-memo pattern and is the inversion of Khātim/Sanad's "37 plan files of prose" failure mode — claims-with-falsifiers force commitment, prose accommodates drift.

The honest starting confidences (Section E at @>=0.30) make the research path explicit. Reaching `cheapcode_v1_ships` at @>=0.70 requires lifting Section E claims via cited public benchmarks for Codex / opencode / Claude Code / Aider / Goose / Terminus and naming the comparison benchmark we'll publish on.

### Honest concerns

- **Operator clarifications needed in CONFIDENCE.md Section E** — which Terminus, headline benchmark choice, acceptable confidence floor, scope of competitor list.
- **EXPERIMENT-0 still load-bearing.** PLAN.bn Section B's `layer_1_propagation_holds` @>=0.65 is gated on EXPERIMENT-0 PASS. No source-of-record commits before that resolves.
- **Burhan validation passed today.** `PYTHONPATH=/home/mk/apps/burhan/src python3 -m burhan.cli plan/PLAN.bn` parses + evaluates cleanly, returning `True` for `cheapcode_v1_ships`. As observations get flipped (research lands or experiments fail), the cite chain in `cheapcode_outperforms_named_alternatives` will surface the falsification loudly rather than silently.

### Plan changes implied

- After EXPERIMENT-0 PASS, draft `plan/EXPERIMENT-2.md` for the claim-shape uplift probe on cheapllm (Section C).
- After CONFIDENCE.md Section E research lands, lift the corresponding `@>=0.XX` values in PLAN.bn and add dated revision sections.

### Pointer for the next agent

Before any code lands:
1. Validate [`plan/PLAN.bn`](plan/PLAN.bn) parses with burhan; fix any syntax issues.
2. Confirm operator clarifications listed in [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) Section E.
3. Begin research per CONFIDENCE.md protocol — start with Section C (substrate-tools transferability) since that's the qls→cheapcode bridge.
4. Run EXPERIMENT-0 in parallel with research; both gate the fork.

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
