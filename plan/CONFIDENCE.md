# CONFIDENCE — research-driven calibration of [`PLAN.bn`](PLAN.bn)

**Status:** template + research protocol. Populated as online research lands. Each section names the burhan claims it covers, the current confidence (from [`PLAN.bn`](PLAN.bn)), the research questions that would tighten or loosen each, and the recommended sources to consult.

**Substrate:** Khazīna atom 0015 (transfer overstated by default), Mizaj rule 01 (falsifier-first), Mizaj rule 05 (cite-the-illah — every analogy needs the structural reason it transfers).

**Top-level objective:** raise the floor of [`PLAN.bn`](PLAN.bn) section E + H claims from `@>=0.30`–`@>=0.50` to **`@>=0.95`** (operator-set per SPEC Revision 2026-05-02) via cited evidence and project-owned cheapbench measurements. Internet research is a source, not a substitute — be careful not to be gullible.

**Operator-confirmed decisions (2026-05-02):**

1. **Terminus identity:** doesn't matter. TB is not the goal. The smartness axis is measured by [`CHEAPBENCH.md`](CHEAPBENCH.md), not any single bench.
2. **Competitor scope:** full list — Codex, opencode, Claude Code, Aider, Goose, Terminus, Continue, Cursor, Devin.
3. **Headline benchmark:** portfolio. Primary = [`CHEAPBENCH.md`](CHEAPBENCH.md) (project-owned, public-data-only, $0 marginal). Triangulation = TB-easy + TB-18 (cheapllm receipts). Be smart about portfolio composition; do not optimize for one bench.
4. **Confidence floor for v1 ship:** `@>=0.95`. Good engineering + clean base knowledge carries the lift; research validates competitors and triangulates.

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

Discharge mechanism: a **competitive scorecard** populated from public sources, with capability cells primarily filled from project-owned [`CHEAPBENCH.md`](CHEAPBENCH.md) measurements + TB-easy/TB-18 triangulation. Cost and latency cells from vendor pricing/docs (with skepticism — see "Source-credibility ladder" below).

### Scorecard shape

Fill from credibility-laddered sources only (cite URL + access date inline; mark each cell with its credibility tier from L1–L5 below):

| Tool | License | Architecture | Per-task $ | P50 latency | cheapbench | TB-easy | TB-18 | Source (tier) |
|---|---|---|---|---|---|---|---|---|
| Codex (OpenAI) | proprietary | hosted | ? | ? | ? | ? | ? | ? |
| opencode (sst) | MIT | local server | backend-dep | backend-dep | run ourselves | run ourselves | run ourselves | upstream + own measurement |
| Claude Code (Anthropic) | proprietary | hosted | ? | ? | ? | ? | ? | ? |
| Aider | open | local | model-dep | model-dep | run ourselves | run ourselves | run ourselves | aider repo + own measurement |
| Goose (Block) | open | local | model-dep | model-dep | run ourselves | run ourselves | run ourselves | Block blog + own measurement |
| Terminus | ? | ? | ? | ? | ? | ? | ? | ? |
| Continue.dev | open | IDE-side | model-dep | model-dep | run ourselves | run ourselves | run ourselves | repo + own measurement |
| Cursor | proprietary | IDE | subscription | varies | ? | ? | ? | ? |
| Devin (Cognition) | proprietary | hosted | ? | ? | ? | ? | ? | ? |
| **cheapcode** | MIT (forked) | local server | own meas. | own meas. | own meas. | own meas. | own meas. | this repo |

**Capability cells: prefer "run ourselves" over published vendor numbers** wherever the tool is open-source enough to run locally with cheapllm. Vendor-published capability numbers are L4 (vendor blog) at best; running locally is L1 (own measurement).

### Source-credibility ladder (canonical: mizaj rule 11 — careful, not gullible)

The canonical ladder is now formalized at [`~/apps/mizaj/rules/11-tier-the-source-before-citing.md`](../../mizaj/rules/11-tier-the-source-before-citing.md) (mizaj M11). The cheapcode-specific application is reproduced below for self-contained reference. Every cited source must be tagged with its credibility tier. Lower tiers are not banned; they are bracketed.

**Companion rule (chain-integrity axis):** [`~/apps/mizaj/rules/14-authentication-grade-bounds-confidence.md`](../../mizaj/rules/14-authentication-grade-bounds-confidence.md) (mizaj M14) defines the parallel sahih/hasan/daif/mawdu authentication grading derived from `Ulum al-hadith`. Source-class (M11 — L1..L5) and chain-integrity (M14 — sahih..mawdu) bound confidence simultaneously; the lower ceiling wins. M14 governs the daftar↔burhan handoff once the daftar Sahih extension lands.

| Tier | What | Treatment |
|---|---|---|
| **L1 — Own measurement** | Numbers we generated against pre-registered tasks, on our hardware, with daftar receipts | Ground truth. `@>=0.90`+ achievable. |
| **L2 — Vendor pricing/docs** | Published rate cards, official API docs, system prompts shipped in product | Trustworthy on cost; treat capability claims as marketing-adjacent. `@>=0.80` for cost, `@>=0.50` for capability. |
| **L3 — Independent academic / 3rd-party benchmark** | Peer-reviewed papers, Hugging Face leaderboards, METR / arXiv replications | High confidence if the methodology is published + reproducible. `@>=0.85` if the paper transfers, less per atom 0015. |
| **L4 — Vendor blog / engineering post** | Vendor-authored marketing or announcement, with internal-bench numbers | Treat numbers as upper bound on what they can claim, not on what they routinely deliver. `@>=0.40` ceiling unless replicated. |
| **L5 — Tweets / forum claims / Hacker News comments** | Anecdote, often contradictory, sometimes adversarial | Citation only as a lead to chase down to L1–L3, never as evidence. `@>=0.10` ceiling. |

**Hard rule (mizaj 13 — no transmission without isnad):** every confidence-update PR must list source → tier → relevant quote/measurement. Confidence updates citing only L4–L5 are rejected; raise the source or HALT.

### Per-claim source plan

Each [`PLAN.bn`](PLAN.bn) Section E + H claim names exactly one comparison axis. Sources to start with:

- `cheapcode_beats_codex_on_cost` — L2 (OpenAI Codex pricing), then L1 (own per-task measurement)
- `cheapcode_beats_codex_on_latency` — L2 (OpenAI status / docs), then L1
- `cheapcode_beats_codex_on_capability` — L3 if published, else L1 via cheapbench (Codex is hosted; if not runnable locally, leave cell honest as "L4-only triangulation" with low confidence)
- `cheapcode_beats_vanilla_opencode_on_capability` — L1 (run vanilla opencode + cheapllm against cheapbench ourselves; this is the cheapest probe)
- `cheapcode_beats_claude_code_on_cost` — L2 (Anthropic pricing), then L1
- `cheapcode_beats_aider_on_cost` — L1 (open-source, run locally with cheapllm)
- `cheapcode_beats_terminus_on_cost` — operator-flagged as "doesn't matter"; deprioritize
- `cheapcode_beats_goose_on_cost` — L1 (open-source, run locally)
- `cheapcode_beats_continue_on_cost` — L1 (open-source)
- `cheapcode_beats_cursor_on_cost` — L2 (Cursor pricing); capability cell hard to populate honestly since IDE-bound; leave bracketed
- `cheapcode_beats_devin_on_cost` — L4 (vendor-only); confidence ceiling @0.65 unless L3 replication appears

- `cheapcode_smart_on_cheapbench` — L1 (own measurement, design in CHEAPBENCH.md)
- `cheapbench_uses_public_data_only` — L1 (auditable from CHEAPBENCH.md task list)
- `cheapbench_zero_marginal_cost` — L1 (auditable from cost-tracker output during cheapbench run)

### Halt condition for Section E + H

If any competitor matches or exceeds cheapcode on **all three** of (cost, latency, capability/cheapbench) at the time research lands, the headline thesis is materially weakened. Per atom 0011, HALT and reconsider before any source-of-record commit.

If `@>=0.95` cannot be reached for any single thesis claim despite L1 measurement (i.e., the gap is structural, not informational), HALT and downgrade target rather than ship a weaker claim under a stronger label (mizaj 04 — separate-stated-from-revealed).

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

### Revision 2026-05-02-mizaj-16 — research-as-experiment-substitute formula

Operator framing: build a system that lets us substitute experiments with internet-research synthesis where literature is mutawatir-equivalent. Substrate addition: **mizaj rule 16** ([`~/apps/mizaj/rules/16-synthesize-research-as-experiment-equivalent.md`](../../mizaj/rules/16-synthesize-research-as-experiment-equivalent.md)).

The formula:

```
research_equivalent_confidence(claim, sources) = min(
  per_source_ceiling,        // best tier among sources, per mizaj 11
  mutawatir_adjusted,        // -0.05 per missing independent group below 4
  1 - transfer_penalty       // (gap - illah) * 0.30, atom 0015 cap
)
```

Implemented at [`tools/research-equivalence.ts`](../tools/research-equivalence.ts). Applied to 5 PLAN.bn pending claims:

| Claim | Pre-synthesis | Post-synthesis | Sources |
|---|---|---|---|
| `best_of_k_3_lifts_completion_5_to_15pct` | 0.65 | **0.85** | Self-Consistency + ToT + AlphaCode-2 + Large Language Monkeys (4 indep groups, mutawatir-equivalent at L3) |
| `cross_model_verification_lifts_over_self_verify` | 0.65 | **0.80** | MIT debate + Tsinghua divergent + METR (3 groups, 1 L4) |
| `plan_decompose_amortizes_smart_calls` | 0.60 | **0.80** | Plan-and-Solve + ToT + ReAct (3 L3 groups) |
| `verifier_hook_catches_50pct_of_wrong_answers` | 0.65 | **0.94** | cheapllm v1 in-house (L1) + Self-Refine + Reflexion (3 groups; in-house lifts ceiling) |
| `parallel_leaf_execution_keeps_latency_below_raw` | 0.70 | **0.89** | opencode source-readable (L1) + Skeleton-of-Thought (L3) |

Joint confidence delta: 0.032 → **0.058** (current state, +81% from research synthesis alone).

### What research synthesis can and cannot do

**Can:** lift per-claim confidences to L3 ceiling (`@>=0.85`) when mutawatir-equivalent (4+ independent groups converging) on phenomena where the `'illah` for transfer is clear and at least L3-cited.

**Cannot:** lift the joint above ~0.19 ceiling for the current 11-group composition. Compositional dilution per atom 0015 still applies. Some claims (e.g., `cheapcode_auto_3_axis_dominance_over_raw_frontier`) require measurement because they're configuration-specific — no paper directly tests "best-of-K + plan-decompose + cross-model on TB-medium/hard with our exact tier choices."

**Gap analysis:**

- Research-synthesis-only ceiling: **0.194** joint (per `tools/joint-confidence.ts post_research_synthesis_only_state`)
- Full-L1-measurement ceiling: **0.291** joint
- Delta = **~0.10** — the experiment-value above what research alone provides

**Honest answer to the operator's question** ("can we hit @>=0.99999 via research alone?"): no, because compositional dilution over 11 groups caps joint below per-claim ceilings even when each per-claim is at the L3 mutawatir ceiling. Both research-only and research+measurement remain below `@>=0.30`.

The right reframe (per MAIN.md option 2) is to **reduce the claim count**. With ≤5 load-bearing claims at `@>=0.95` each, joint = `0.95^5 ≈ 0.77`. With 4 claims at `@>=0.95`, joint ≈ 0.81. The path to high joint is fewer + tighter claims, not more research.

### Revision 2026-05-02 — first L3 paper batch

Fetched arXiv abstracts for four target papers; transcribed to [`plan/facts/03-research-papers.bn`](facts/03-research-papers.bn) as L3 lemmas. Honest read of what the abstracts actually support (per mizaj rule 11 + atom 0015 transfer-overstatement caution):

| Paper | Tier | Direct support for cheapcode's claim? | Confidence delta |
|---|---|---|---|
| TruthfulQA — Lin et al. ACL 2022 ([arXiv:2109.07958](https://arxiv.org/abs/2109.07958)) | L3 peer-reviewed | **Weak.** Authors recommend training-time fine-tuning, not inference-time prompt shape. Validates the *benchmark*, not the *method* | `claim_shape_addon_lifts_truthfulness` `@>=0.50 → @>=0.55` (+0.05) |
| ReAct — Yao et al. ICLR 2023 ([arXiv:2210.03629](https://arxiv.org/abs/2210.03629)) | L3 peer-reviewed | **Moderate.** ALFWorld +34pp absolute, WebShop +10pp absolute — but on PaLM-540B; small-model transfer not validated in the abstract | `daftar_tools_lift_cross_session` `@>=0.55 → @>=0.65` (+0.10) |
| Toolformer — Schick et al. ([arXiv:2302.04761](https://arxiv.org/abs/2302.04761)) | L3 (preprint, widely cited) | **None for tool-spam claim.** Abstract has no tool-count ablation. 5-tool experiment is descriptive, not prescriptive | `minimal_tool_set_avoids_tool_spam` unchanged at `@>=0.70` |
| Constitutional AI — Bai et al. ([arXiv:2212.08073](https://arxiv.org/abs/2212.08073)) | **L4** (Anthropic technical report, not peer-reviewed) | **Weak + wrong tier.** Training-time RLAIF mechanism, not inference-time rule lookup | `mizaj_consult_tool_lifts_design_quality` unchanged at `@>=0.45` |

**Methodology note (mizaj rule 05 — cite-the-illah):** for each paper, the `'illah` (structural reason for transfer) is missing or weak. TruthfulQA uses training-time loss; cheapcode's claim-shape addon is inference-time. ReAct uses 540B model; cheapllm is much smaller. The methodologies do not share their load-bearing mechanism, so transfer is bounded by the gap.

**Conclusion:** the four foundational papers establish the *target benchmarks and shapes* but do not validate cheapcode's specific inference-time substrate-tools mechanism. The `@>=0.95` confidence target on Section C claims is structurally bounded above by `@>=0.70` until our own L1 measurement on cheapllm provides direct evidence.

**Next research batch:** look for 2024–2026 papers specifically on inference-time CoT / prompt-shape uplift on sub-7B models (Phi family, Llama-small, Mistral-small). Those would have higher-`'illah` transfer to cheapllm. Daftar receipt for each.
