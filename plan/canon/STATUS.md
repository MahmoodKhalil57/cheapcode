# M18 canon status

## Phase 1 (web-fetch grounded discovery)

Run `bun script/m18-discover-canon.ts` to regenerate. Discovery is fetch-only
(no LLM dispatch) so the candidate is grounded in HTTP GET, not training-recall.
Each candidate ships with `mizan_grade: "daif"` until Phase 2 verifies.

### Latest run summary

| Dimension | Reachable / Total | Excerpts extracted |
|---|---|---|
| software-architecture | 6/8 | 6/8 |
| api-dx | 6/7 | 5/7 |
| ui-visual | 8/8 | 7/8 |
| accessibility | 6/6 | 5/6 |
| ux-research | 7/7 | 7/7 |
| ai-ml-product | 6/8 | 5/8 |
| policy-governance | 6/7 | 5/7 |
| llm-failure-research | 7/8 | 7/8 |
| **total** | **52/59** | **47/59** |

## Known anomalies (Phase 2 must resolve)

1. ~~**TicToc seed (arxiv 2503.02391) returns the wrong paper**~~ — corrected
   during M19 Phase 1 to arXiv `2510.23853`, "Your LLM Agents are Temporally
   Blind: The Misalignment Between Tool Use Decisions and Human Time
   Perception." The arXiv search result was fetched before reseeding.

2. **Several authoritative pages are reachable without an excerpt** — RFC
   9110, Material Design 3, OpenAI Model Spec, IBM Equal Access Toolkit, and
   NIST AI RMF returned fetch-success with sparse or script-rendered HTML.
   The candidates stay `daif`; Phase 2 must verify against page text or an
   alternate official mirror before promotion.

3. **Nature 2025 clinical hallucination paper unreachable** — likely
   paywall / 403. Reseed with the open-access preprint URL.

4. **M19 anti-sycophancy probe caught a poisoned source** —
   `inclusivedesignprinciples.org` fetched gambling spam content during the
   first M19 run. It was removed from the seed set and replaced with IBM Equal
   Access Toolkit rather than papered over as an accessibility source.

## Phase 2 (cross-witness verification) — not yet run

Phase 2 requires LLM dispatch budget. The operator's openrouter balance is
$0 as of 2026-05-04 20:08; --live benchmark surfaces "insufficient credits"
cleanly through the M17 stack. Once funded, run:

    bun script/m18-verify-canon.ts

(Script not yet written — see plan/M18-DISPATCH-CONTRACT.md §2.)

## Phase 3 + 4 — gated on Phase 2 outputs
