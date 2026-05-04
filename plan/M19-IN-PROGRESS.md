# M19 in progress

## Phase 1 — Research-first canon expansion

Status: completed locally.

- Expanded `script/m18-discover-canon.ts` with M19 extension seeds across all eight dimensions and added `--validate` for the M19 falsification gate.
- Regenerated `plan/canon/*.candidates.json` by fetching source URLs directly.
- Validation: `bun script/m18-discover-canon.ts --validate` passed with 52 candidates across 8 dimensions; every dimension has at least 4 candidates with non-empty `extracted_excerpt`.
- Anti-sycophancy probe: `inclusivedesignprinciples.org` fetched gambling spam content. I removed it from the seed set and replaced it with IBM Equal Access Toolkit instead of retaining the operator-seeded inclusive-design idea uncritically.
- Contradiction surfaced: the previous TicToc seed `arxiv:2503.02391` pointed to a pseudo-concave optimization paper. I fetched the arXiv search result for "temporally blind" and corrected the seed to `arxiv:2510.23853`.
- Assumption: Firecrawl web search was unavailable due insufficient credits, so Phase 1 used direct URL fetches plus an arXiv web-fetch search for the known bad TicToc seed. The candidate entries remain `mizan_grade: "daif"` until Phase 2 receipts grade them.

### Phase 1 anti-fab self-check

- "52 candidates across 8 dimensions" — verified by `bun script/m18-discover-canon.ts --validate`.
- "Every dimension has at least 4 entries with non-empty `extracted_excerpt`" — verified by validator.
- "TicToc prior seed was wrong" — verified by fetched arXiv abstract for `2503.02391` in the prior candidate file and the arXiv search fetch for "temporally blind".
- "Inclusive Design Principles URL was poisoned" — verified by fetched excerpt in the first M19 run output, then removed from committed candidates.
- "Authoritativeness of new candidates" — ASSUMPTION (unverified beyond URL fetch and publisher/source identity); Phase 2 must verify source-principle support.

## Phase 2 — Countermeasure-vs-baseline experiments

Status: completed locally with both synthetic rehearsal receipts and live ChatGPT OAuth receipts.

- Added `script/m19-countermeasure-benchmark.ts`, which writes six 10-prompt benchmark files to `plan/benchmarks/` and records per-mode receipts under `plan/receipts/`.
- Ran synthetic-local rehearsal first; receipts are explicitly labeled `synthetic-local` and their decision field says live confirmation is required before activation.
- Ran live mode with `bun script/m19-countermeasure-benchmark.ts --live` against ChatGPT OAuth (`chatgpt-oauth:gpt-5.5`).
- Live decisions:
  - sycophancy: baseline 10/10 failures, countermeasure 10/10 failures, delta 0.00 → opt-in only / null result.
  - temporal-blindness: baseline 10/10 failures, countermeasure 3/10 failures, delta 0.70 → active by default.
  - tom-fact-belief: baseline 10/10 failures, countermeasure 0/10 failures, delta 1.00 → active by default.
  - cultural-homogenization: baseline 8/10 failures, countermeasure 2/10 failures, delta 0.60 → active by default.
  - reversal-curse: baseline 10/10 failures, countermeasure 10/10 failures, delta 0.00 → opt-in only / null result.
  - rlhf-bias: baseline 10/10 failures, countermeasure 10/10 failures, delta 0.00 → opt-in only / null result.
- Assumption: marker-based scoring is a cheap adversarial metric, not a semantic judge. Receipts include raw outputs for operator review; no headline claim is made from this phase alone.

### Phase 2 anti-fab self-check

- "Six benchmark files exist with 10 prompts each" — verified by script output and committed files under `plan/benchmarks/`.
- "Live ChatGPT OAuth ran" — verified by live receipts whose `run_mode` is `live` and model labels are `chatgpt-oauth:gpt-5.5`.
- "Temporal, ToM, and cultural countermeasures reduced marker-scored failures" — verified by live receipt deltas.
- "Sycophancy, reversal, and RLHF-bias did not improve under this scoring" — verified by live receipt deltas of 0.00.
- "Countermeasures should become active by default" — ASSUMPTION for the three positive modes; Phase 4 scorecard and operator spot-check remain required before runtime defaults change.

## Phase 3 — Agent design synthesis

Status: completed locally.

- Wrote `plan/M19-AGENT-DESIGN.md` with the required eight sections: Telos, Pipeline, Skill catalog, Tool inventory, Mizan integration, Energy transformation, Confidence accounting, and Anti-claim section.
- Word count: 3267 words by `wc -w plan/M19-AGENT-DESIGN.md`.
- The design preserves Phase 2 null results: sycophancy, reversal-curse, and RLHF-bias scaffolds did not earn active-default status in the current live benchmark.
- The design treats Phase 1 canon entries as provisional `daif` candidates, not production proof.

### Phase 3 anti-fab self-check

- "Design doc has all 8 required sections" — verified by reading the document structure.
- "Design doc is >=3000 words" — verified by `wc -w` returning 3267.
- "Phase 2 null results are reflected" — verified by the Anti-claim section and Confidence accounting section.
- "Phase 1 canon is provisional" — verified by document statements and candidate `mizan_grade: "daif"` files.
- "This is the perfect internal flow" — ASSUMPTION / design recommendation, pending Phase 4 implementation and Phase 5 scorecard.

## Phase 4 — Implementation

Status: completed locally before commits.

- Added `src/canon-loader.ts` and `src/canon-loader.test.ts` for fail-soft canon shard loading and grade filtering.
- Added `src/canon-injector.ts` and `src/canon-injector.test.ts` for deterministic dimension classification, 1-3 card selection, and scaffold rendering.
- Added `src/claim-shape.ts` and `src/claim-shape.test.ts` for local claim-shape tagging and summary reporting.
- Extended `src/orchestrate.ts` with `canonInjection`, `canonPlanDir`, `canonMaxTokens`, and `claimShapeVerify` flags. Defaults remain off for canon and claim-shape verification.
- Wired `script/m17-live-dispatch.ts` to exercise the full stack via `CHEAPCODE_CANON_INJECTION=1` and `CHEAPCODE_CLAIM_SHAPE_VERIFY=1`.
- Added `script/m19-scorecard.ts` for baseline and canon-on seven-axis receipts.
- Verification: `bun test` passed 388 tests; `bun script/m17-benchmark.ts --dry-run` wrote a receipt and preserved the anti-fab no-headline gate; `bun script/m19-scorecard.ts --baseline` and `--canon-on` both wrote receipts.

### Phase 4 anti-fab self-check

- "New modules exist with tests" — verified by `bun test` running 31 files and 388 passing tests.
- "Orchestrate flags default off" — verified by `OrchestrateOptions` defaults and existing tests that skip canon/probe unless enabled.
- "m17-live-dispatch can exercise full stack" — verified by env flag wiring; live exercise itself remains Phase 5/scorecard territory.
- "Scorecard runs seven axes" — verified by `script/m19-scorecard.ts` output containing all seven axis keys.
- "Full implementation improves the real agent" — ASSUMPTION until Phase 5 scorecard receipt is evaluated and operator spot-checks canon relevance.

## Phase 5 — Headline gate

Status: completed locally.

- Ran `bun script/m19-scorecard.ts --live --baseline`, writing `plan/receipts/m19-scorecard-baseline-2026-05-04T21-30-57-968Z.json`.
- Ran `bun script/m19-scorecard.ts --live --canon-on`, writing `plan/receipts/m19-scorecard-canon-on-2026-05-04T21-30-57-978Z.json`.
- Wrote final diff receipt: `plan/receipts/m19-scorecard-final-2026-05-04T21-30-57Z.json`.
- Local-scorecard verdict: PASS_INTERNAL_THRESHOLD with 3/7 axes improved (`hallucination_floor`, `sycophancy_resistance`, `cognitive_load`) and 0 meaningful regressions.
- Updated `SESSION-2026-05-04.md` with the verified local delta and the remaining anti-fab gate.
- External headline remains blocked until the operator spot-checks 20 outputs at >=80% canon relevance. The scorecard run mode is `live-requested-local-scorer`, not a semantic live-model judge.

### Phase 5 anti-fab self-check

- "Phase 5 baseline and canon-on commands ran" — verified by two scorecard receipts at `21-30-57`.
- "3/7 axes improved, 0 regressed" — verified by `m19-scorecard-final-2026-05-04T21-30-57Z.json`.
- "Internal threshold met" — verified by final receipt verdict.
- "External headline claim earned" — ASSUMPTION FALSE / explicitly blocked pending operator spot-check.
- "Scorecard is live semantic evidence" — ASSUMPTION FALSE; receipt labels it `live-requested-local-scorer`.
