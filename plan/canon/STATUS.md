# M18 canon status

## Phase 1 (web-fetch grounded discovery)

Run `bun script/m18-discover-canon.ts` to regenerate. Discovery is fetch-only
(no LLM dispatch) so the candidate is grounded in HTTP GET, not training-recall.
Each candidate ships with `mizan_grade: "daif"` until Phase 2 verifies.

### Latest run summary

| Dimension | Reachable / Total | Excerpts extracted |
|---|---|---|
| software-architecture | 3/3 | 3/3 |
| api-dx | 2/2 | 2/2 |
| ui-visual | 3/3 | 2/3 |
| accessibility | 1/1 | 1/1 |
| ux-research | 1/2 | 1/2 |
| ai-ml-product | 3/3 | 2/3 |
| policy-governance | 2/2 | 1/2 |
| llm-failure-research | 2/3 | 2/3 |
| **total** | **17/19** | **14/19** |

## Known anomalies (Phase 2 must resolve)

1. **TicToc seed (arxiv 2503.02391) returns the wrong paper** — the
   fetched abstract is about pseudo-concave optimization, not temporal
   awareness. Provisional `primary_principle` does not match the source.
   Action: Phase 2 verification with the 4-LLM panel will fail; reseed
   with the correct TicToc arxiv id (likely 2406.xxxxx range — verify
   manually before re-running discovery).

2. **NN/G articles index timed out** — the publisher's main URL is
   not directly fetchable in 8s. Reseed with a more specific stable
   article URL or use https://www.nngroup.com/topic/.

3. **Nature 2025 clinical hallucination paper unreachable** — likely
   paywall / 403. Reseed with the open-access preprint URL.

4. **Three excerpts came back empty** (material-design-3, openai-model-spec,
   nist-ai-rmf) — the page renders client-side, so HTML scraping misses
   the og:description block. The seed's provisional `primary_principle`
   stands; Phase 2 verification should compensate by hitting alternate
   published-text mirrors.

## Phase 2 (cross-witness verification) — not yet run

Phase 2 requires LLM dispatch budget. The operator's openrouter balance is
$0 as of 2026-05-04 20:08; --live benchmark surfaces "insufficient credits"
cleanly through the M17 stack. Once funded, run:

    bun script/m18-verify-canon.ts

(Script not yet written — see plan/M18-DISPATCH-CONTRACT.md §2.)

## Phase 3 + 4 — gated on Phase 2 outputs

