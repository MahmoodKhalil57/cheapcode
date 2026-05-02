# EXPERIMENT-0 — propagation-point discriminating experiment

**Status:** pre-registered. Kill-criteria written before the experiment runs.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), Mizaj rule 01 (falsifier-first), Mizaj rule 02 (generate-before-select). Daftar receipt to be added on completion.

**Gates:** falsifier F1 from [`../SPEC.md`](../SPEC.md). PASS unlocks the fork; FAIL halts the project.

---

## Question

Can a cheapllm-tuned feature land at a single propagation point in vanilla opencode such that all four upstream client surfaces (CLI, TUI, web, desktop) inherit it without per-client overlays?

- **YES** → architecture is justified; proceed to fork per layer-1-or-2 discipline.
- **NO** → the load-bearing assumption of cheapcode is dead; halt before any source-of-record commit.

## Feature under test

A cheapllm-tuned **system-prompt addon**. Concrete, easy to verify visually in each client, smallest possible layer-1 candidate (server-side prompt registry / config endpoint).

The addon's content is irrelevant to this experiment — what matters is whether all four clients pick up a single change made at the server / shared layer. A trivial marker string (e.g. `[cheapcode-addon-active]`) is sufficient.

## Procedure

1. **Pin upstream.** Clone or check out `~/apps/opencode-upstream/` at a specific tag; record the tag and commit hash in the verdict artifact.
2. **Stand up vanilla opencode locally.** Confirm CLI, TUI, web (`opencode web`), and desktop (`bun --filter @opencode-ai/desktop dev` or packaged binary) all run unmodified against the local server.
3. **Generate ≥ 2 propagation-point candidates** (Mizaj rule 02 — generate-before-select):
   - Candidate A: server-side prompt registry / config endpoint (layer 1)
   - Candidate B: shared package consumed by every client (layer 2)
   - Candidate C: per-client modification (layer 3) — only as the falsification reference, not a target
4. **Pick the highest-layer candidate that is technically possible** (prefer A). Record the choice and the reasoning in `runs/experiment-0-attempt-1/notes.md`.
5. **Apply the smallest possible change** at that layer to install the addon marker.
6. **Exercise the addon through each upstream client surface, with NO source changes to that client:**
   - CLI: `opencode run "say hello"` against local server, capture stdout, look for marker
   - TUI: `opencode` (default TUI), submit one prompt, capture transcript or screenshot
   - Web: `opencode web`, browser-confirm marker visible in conversation
   - Desktop: launch desktop client, confirm marker visible in conversation
7. **Record artifacts** for every client (transcript or screenshot).
8. **Write verdict** with kill-criterion citation.

## Pre-registered kill-criteria

| Outcome | Definition | Action |
|---|---|---|
| **PASS** | All four clients see the addon with **layer-1-only** changes. No client source touched. | Architecture justified at strongest tier. Proceed to fork per SPEC. |
| **PARTIAL** | All four clients see the addon, but 1–2 clients required a **layer-2** (`packages/shared` or `packages/sdk/js`) module addition. | Architecture viable but layer-1-only is too tight. Open dated SPEC revision relaxing cell 3 MIN to "layer 1 or 2." Then proceed to fork. |
| **FAIL** | Any client requires a **layer-3** modification (per-client source change) to observe the addon. | Architecture's load-bearing assumption is broken. **HALT.** Do not fork. Open `plan/01-halt-rationale.md` documenting why and what the operator should reconsider. |

## Cost / time budget

- Wall-clock: ≤ 4 hours
- Spend: ≤ $1 (no LLM calls strictly required; this is a propagation test, not a quality test). If the cheapllm endpoint is exercised at all, use the cheapest-tier model.
- If budget is exceeded with no resolution, the propagation-point hypothesis was wrong; log the lesson and either pick a different layer-1 candidate or HALT.

## Generality follow-up (M0 honest concern)

EXPERIMENT-0 tests one feature class (system-prompt addon). If it passes, the architecture is validated only for that class. Before treating cheapcode as fully justified, queue at least one harder follow-up experiment EXPERIMENT-1 covering a different feature class:

- Tool replacement: swap one upstream tool implementation at layer 1; verify all clients dispatch the new implementation
- In-session memory: install the compaction-ledger at layer 1; verify all clients see compacted context
- Output-format constraint: install a response_format default at layer 1; verify all clients honor it

The follow-up matters because Khazīna atom 0015 explicitly warns against generalizing from a single transfer measurement.

## Artifacts

- `runs/experiment-0-attempt-1/notes.md` — propagation point chosen, alternatives considered, layer chosen and why
- `runs/experiment-0-attempt-1/upstream-pin.txt` — upstream tag + commit hash
- `runs/experiment-0-attempt-1/cli.txt` — CLI session transcript showing addon active
- `runs/experiment-0-attempt-1/tui.txt` — TUI session transcript or screenshot
- `runs/experiment-0-attempt-1/web.png` — web UI screenshot
- `runs/experiment-0-attempt-1/desktop.png` — desktop screenshot
- `runs/experiment-0-attempt-1/verdict.md` — PASS / PARTIAL / FAIL with kill-criterion citation and artifact pointers

## Daftar receipt template

On completion:

```
bun ~/apps/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="EXPERIMENT-0 verdict: <PASS|PARTIAL|FAIL>" \
  --body="<one-paragraph summary citing kill-criterion + artifact paths>"
```

## Out of scope for EXPERIMENT-0

- Quality measurement (TB scores, latency, cost). EXPERIMENT-0 measures **propagation only**, not capability.
- Naming the project. The verdict informs the name; the name is picked **after** the verdict.
- Writing `package.json`, `tsconfig.json`, source files, or any code that survives past the experiment artifacts. Throwaway scratch under `runs/experiment-0-attempt-1/` is fine.
