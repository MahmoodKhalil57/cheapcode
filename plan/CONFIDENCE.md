# CONFIDENCE — research-driven calibration of [`PLAN.bn`](PLAN.bn)

**Status:** template + research protocol. Populated as online research lands. Each section names the burhan claims it covers, the current confidence (from [`PLAN.bn`](PLAN.bn)), the research questions that would tighten or loosen each, and the recommended sources to consult.

**Substrate:** Khazīna atom 0015 (transfer overstated by default), Mizaj rule 01 (falsifier-first), Mizaj rule 05 (cite-the-illah — every analogy needs the structural reason it transfers).

**Top-level objective:** raise the floor of [`PLAN.bn`](PLAN.bn) section E claims from `@>=0.30` to `@>=0.70` via cited evidence, so `cheapcode_v1_ships` can be discharged at a confidence we can defend in public.

---

## Confidence-update protocol

Every research session must:

1. **Cite specific sources** — URL + access date + relevant quote/measurement.
2. **Map the source to a named [`PLAN.bn`](PLAN.bn) claim.**
3. **Update the corresponding `@>=0.XX` value in [`PLAN.bn`](PLAN.bn).** Edit the value, do not delete the claim.
4. **Add a dated `## Revision YYYY-MM-DD` section** below summarizing the delta and why.
5. **Daftar receipt:**
   ```
   bun ~/apps/daftar/bin/daftar add note \
     --project="/home/mk/apps/cheapcode" \
     --title="CONFIDENCE update — <claim>" \
     --body="<source citations + before/after confidence + reasoning>"
   ```

**Halt condition (mizaj rule 01 + atom 0011):** if research surfaces evidence materially weakening the cheapcode thesis (an existing tool already does this; the qls→cheapcode transfer doesn't replicate at sub-7B; cheapllm's smart-axis fails on TB-18), HALT and reconsider before any source-of-record commit.

---

## Section A — backend axis (cheapllm v1 inheritance)

| Claim | Current | Discharge |
|---|---|---|
| `cheapllm_cheaper_proven` | @>=0.95 | receipt `note-…` in cheapllm daftar; F-E1 measured |
| `cheapllm_faster_proven` | @>=0.95 | F-E3 P50 2.24s receipt |
| `cheapllm_more_context_proven` | @>=0.85 | F-E4 NIAH 2M PASS, `note-b407ce2c9a` |
| `cheapllm_smart_axis_pending` | @>=0.50 | F-H3 K=1 in flight; resolves on cheapllm v1 ship |

**Research priority:** LOW. Receipts already exist. No external research needed unless we want third-party validation.

---

## Section B — harness propagation thesis

| Claim | Current | Discharge |
|---|---|---|
| `layer_1_propagation_holds` | @>=0.65 | EXPERIMENT-0 (not online research) |
| `layer_2_propagation_acceptable_fallback` | @>=0.80 | upstream's `packages/shared` design conventions |
| `layer_3_propagation_unmaintainable` | @>=0.90 | Khātim M7.1.2 receipt — already-known negative |

**Research priority:** LOW. Layer-1 resolution is via experiment, not literature.

---

## Section C — substrate tools as inference-time calibration (HIGH research priority)

This is where the qls→cheapcode bridge claim is load-bearing. Each claim's current confidence is honestly low (@>=0.45–0.70). Research must lift or kill them.

### `claim_shape_addon_lifts_truthfulness` @>=0.50

- **Tighten upward** by:
  - Inference-time chain-of-thought truthfulness uplift on small (<7B) models
  - Structured-output / JSON-schema decoding effects on factuality
  - Benchmarks where prompt-engineering closes the gap with larger models
  - Replications of qls's TruthfulQA result on independently trained small models
- **Tighten downward** by:
  - Findings that small models gain little from prompt structure (capability-bounded)
  - Evidence that claim-shape prompts hurt latency more than they lift accuracy
  - Counterexamples where structured prompts degrade capability on simple tasks
- **Sources to consult:**
  - TruthfulQA paper (Lin et al. 2022) + 2024-2026 follow-ups and replications
  - Faithfulness-vs-plausibility CoT literature (Anthropic alignment work)
  - System cards from Anthropic / OpenAI / DeepSeek / Mistral on prompt-engineered uplift
  - qls's own published numbers in [~/apps/qls/README.md](../../qls/README.md) and `MIZAN_TECHNICAL_COMPANION.md`
  - 2024-2026 papers on inference-time calibration for sub-7B models (Hugging Face, arXiv cs.CL)

### `daftar_tools_lift_cross_session` @>=0.55

- **Tighten upward** by RAG / memory-augmented small-model literature.
- **Sources:**
  - ReAct (Yao et al. 2022)
  - Toolformer (Schick et al. 2023)
  - LongMem / MemGPT
  - SWE-bench & SWE-Lancer agent results with vs without retrieval

### `mizaj_consult_tool_lifts_design_quality` @>=0.45

- **Tighten upward** by expert-rule injection / constitutional-AI literature.
- **Sources:**
  - Constitutional AI (Bai et al. 2022, Anthropic)
  - Structured-rule-injection findings in agentic CLI tools

### `minimal_tool_set_avoids_tool_spam` @>=0.70

- **Sources:**
  - Toolformer ablations on tool-count effects
  - cheapllm Phase 0 RED HALT receipt (already in-house)
  - any small-model tool-confusion benchmarks

---

## Section D — maintenance discipline

| Claim | Current | Discharge |
|---|---|---|
| `source_file_budget_holds` | @>=0.75 | weekly `cloc src/` snapshot |
| `plan_dir_budget_holds` | @>=0.85 | git tracking |
| `weekly_rebase_cadence_holds` | @>=0.65 | rebase log |

**Research priority:** LOW. Self-discipline + git, not literature.

---

## Section E — competitive comparison (HIGHEST research priority)

The section that gates `cheapcode_v1_ships` confidence above @>=0.30. The discharge mechanism is a **competitive scorecard** populated from public sources.

### Recommended scorecard shape

For each tool, fill the following row from public sources (cite URL + access date inline):

| Tool | License | Architecture | Per-task $ | P50 latency | TB / SWE-bench | Source |
|---|---|---|---|---|---|---|
| Codex (OpenAI) | proprietary | ? | ? | ? | ? | ? |
| opencode (sst) | MIT | server+clients | depends on backend | depends | depends | upstream |
| Claude Code (Anthropic) | proprietary | ? | ? | ? | ? | ? |
| Aider | open | local | model-dep | model-dep | ? | aider repo |
| Goose (Block) | open | ? | ? | ? | ? | ? |
| Terminus | ? | ? | ? | ? | ? | ? |
| Continue.dev | open | IDE-side | model-dep | model-dep | ? | repo |
| Cursor | proprietary | IDE | sub | varies | ? | docs |
| Devin (Cognition) | proprietary | ? | ? | ? | ? | ? |

### Per-claim source list

Each [`PLAN.bn`](PLAN.bn) Section E claim names exactly one comparison axis × one competitor. Update sources as research lands.

- `cheapcode_beats_codex_on_cost` @>=0.30 — sources: OpenAI Codex pricing, third-party benchmarks, OpenAI evals
- `cheapcode_beats_codex_on_latency` @>=0.30 — sources: same
- `cheapcode_beats_codex_on_capability` @>=0.30 — sources: SWE-bench / TerminalBench leaderboards
- `cheapcode_beats_vanilla_opencode_on_capability` @>=0.40 — sources: opencode README, community benchmarks, run vanilla-on-cheapllm ourselves as cheap probe
- `cheapcode_beats_claude_code_on_cost` @>=0.55 — sources: Anthropic pricing, claude.ai/code docs
- `cheapcode_beats_aider_on_cost` @>=0.45 — sources: aider docs, community benchmarks
- `cheapcode_beats_terminus_on_cost` @>=0.30 — sources: clarify which Terminus (terminus.so vs others); vendor docs
- `cheapcode_beats_goose_on_cost` @>=0.40 — sources: Goose / Block engineering blog

### Operator clarifications needed

Before research begins, please confirm:

1. **Which Terminus?** (terminus.so / terminusdb / a different tool)
2. **Should we add agents not listed?** — current list is Codex, opencode, Claude Code, Aider, Goose, Terminus, Continue, Cursor, Devin
3. **Headline benchmark for capability comparison** — TerminalBench? SWE-bench? a custom slice? cheapllm's own TB-18 measurable?
4. **Acceptable confidence floor before declaring v1** — @>=0.70 default; raise to @>=0.85 for stronger claim?

### Halt condition for Section E

If any competitor matches or exceeds cheapcode on **all three** of (cost, latency, capability) at the time research lands, the project's headline thesis is materially weakened. Per atom 0011, halt + reconsider whether cheapcode is justified at all.

---

## Section F — composed theorems

The theorem `cheapcode_outperforms_named_alternatives` is bounded above by the lowest-confidence assumption it depends on. With Section E claims at @>=0.30, the theorem's confidence is currently ≤ 0.30. Research must lift Section E to @>=0.70 before the theorem is shippable.

The theorem `harness_uplift_visible_in_all_clients` is bounded by Section B (EXPERIMENT-0 dependent) and Section C (EXPERIMENT-2 dependent + literature). Currently bounded ≤ 0.50.

The theorem `cheapcode_maintainable_long_term` is bounded by Section D and resolves through self-discipline; not research-dependent.

---

## Methodology notes (mizaj rule 05 — cite-the-illah)

When citing a paper or benchmark, name the **structural reason** the result transfers to cheapcode's setting:

- **Source domain** (model size, training corpus, evaluation setup)
- **Target domain** (cheapllm at OpenRouter, cheapcode harness)
- **Shared mechanism** (the `'illah` — what structural property makes the transfer hold)
- **One non-shared feature** that could break the analogy

Without that articulation, the citation is rhetoric, not evidence (per mizaj rule 05's anti-pattern). The confidence update in [`PLAN.bn`](PLAN.bn) must include the `'illah` in the daftar receipt body.

---

## Revision log

(Empty. Add `## Revision YYYY-MM-DD` sections below as research lands.)
