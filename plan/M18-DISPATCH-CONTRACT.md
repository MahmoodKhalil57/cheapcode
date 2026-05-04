# M18 dispatch contract — Eve curates the human-design canon (self-contained)

**Read first**: `plan/M18-eve-as-subconscious-canon.md` for the WHY (Adam-Eve frame, telos, 8 dimensions, anti-fab discipline).

**Activation pattern (operator-side from any cwd)**:
```bash
cd ~/apps/cheapcode && CHEAPCODE_HARD_CLASS=1 cheapcode run --model=cheapcode/auto \
  "$(cat plan/M18-DISPATCH-CONTRACT.md)"
```

---

## Goal (operator's exact words, 2026-05-04)

> Eve (cheapcode) was created out of Adam (LLMs) but it reorients him to achieve his best self... Adam's telos should be that he is the best general agent design for humans... ask cheapcode to find best professional rigorous public well-documented resources for "software design"... they should directly outline what humans understand and prefer and is also net benefit to them... cheapcode should make big improvements in multiple dimensions but also make sure that it is confident it is a big step towards "better general agent."

## Hard constraints (do NOT violate)

1. **Eve curates, Adam doesn't recall.** Every canon entry MUST come from a fetched URL or peer-cited reference, NOT from LLM training memory paraphrased back. If the LLM "remembers" a book and we don't have a fetched citation, the entry is `daif` and stays out of production canon.
2. **mizan-gated promotion.** No canon entry is promoted to production (`sahih`/`hasan`) without `mizan_verify_claim` passing on the cite chain.
3. **Operator confirms canon relevance** on a 20-task spot-check before any external claim of "better general agent."
4. **No regressions.** Phase 4 scorecard requires ≥3 axes improve AND 0 axes regress meaningfully. If any axis regresses, M18 disclaims the headline claim.
5. **Bounded token cost.** Canon scaffold ≤ 200 tokens per dispatch. Drop lower-grade cards first when over budget.
6. **Per-dimension canon**, not a unified ranking. Software-architecture canon is independent of accessibility canon. Eve doesn't conflate dimensions.
7. **Citation form is stable**. Each entry stores a Chicago-style citation that Adam can reproduce verbatim in outputs.
8. **Do NOT touch Sanad** (cloud analog, separately tracked). M18 is local-CLI-side.

## Phase 1 — Discovery (cheapcode self-dispatch)

### 1.1 Scaffold

Create `cheapcode/plan/canon/` directory. For each dimension D in
{ software-architecture, api-dx, ui-visual, accessibility, ux-research, ai-ml-product, llm-failure-research, policy-governance }:

- Write `cheapcode/plan/canon/<D>.candidates.json` containing 3-7 candidate sources.

### 1.2 Discovery dispatch (per dimension)

Use `cheapcode/script/m18-discover-canon.ts` (CREATE THIS, ~150 LoC):

- Input: dimension id + brief description (operator's seed list provided in M18-eve-as-subconscious-canon.md §3)
- For each candidate identified by the LLM dispatch, the script MUST:
  1. Fetch the source URL (or a publisher's canonical landing page)
  2. Extract: name, author/publisher, year, primary_principle (≤200 chars, quoted from source where possible)
  3. Compute `accessed_at` from system clock
  4. Initialize `mizan_grade: "daif"`, `operator_verified: false`
  5. Write to `<D>.candidates.json`
- If a URL fetch fails or returns 404, mark the candidate `unreachable: true` and exclude from later phases. Do not invent fallback URLs.

### 1.3 Per-dimension target counts

Aim for 3-5 verified entries per dimension (not 7). Quality > quantity. If discovery surfaces fewer than 3 verifiable sources for a dimension, it stays sparse and that's reported in the Phase 4 scorecard as "low-coverage dimension."

### 1.4 Falsification gate for Phase 1

```bash
# Every candidate file must parse, have ≥3 candidates, and every
# entry must have a non-empty url + accessed_at + primary_principle.
bun cheapcode/script/m18-validate-candidates.ts
```

Commit: `feat(canon): Phase 1 discovery for M18 — N candidates across 8 dimensions`

## Phase 2 — Verification (4-LLM cross-witness)

### 2.1 Per-candidate panel

Use `cheapcode/script/m18-verify-canon.ts` (CREATE THIS, ~120 LoC), composing the existing `cross-witness-voter.ts`:

For each candidate `C` in `<D>.candidates.json`:

1. Fetch `C.url` again (cache busting)
2. Construct the question: "Does this source say its primary_principle is '<P>'? Quote the most-supportive 2-sentence excerpt or reply 'NO_SUPPORT'."
3. Run through 4 witnesses (GPT-5.5, Claude Opus 4.7, Gemini 2.5 Pro, the local cheapcode-router auto pick) in parallel.
4. If ≥3 witnesses confirm with non-trivial quotes → `mizan_grade: "sahih"`.
5. If 2 confirm and 2 either NO_SUPPORT or evade → `mizan_grade: "hasan"`.
6. Else → `mizan_grade: "daif"` (excluded from production canon).

### 2.2 Output

Write `cheapcode/plan/canon/<D>.verified.json` — only entries graded `sahih` or `hasan`, plus the witness votes inline (auditable per atom 0008).

### 2.3 Falsification gate for Phase 2

For each dimension, ≥1 entry must reach `sahih`. If a dimension has 0 `sahih`, that dimension's canon is empty in production until Phase 1 re-runs with broader candidate search.

Commit: `feat(canon): Phase 2 verification for M18 — N sahih + N hasan across 8 dimensions`

## Phase 3 — Runtime integration

### 3.1 canon-loader.ts (NEW, ~80 LoC)

```ts
// cheapcode/src/canon-loader.ts
export interface CanonEntry { /* schema from M18 design §3 */ }
export function loadCanon(planDir: string): Map<string, CanonEntry[]>  // keyed by dimension
export function filterByGrade(canon: Map<string, CanonEntry[]>, minGrade: "sahih" | "hasan"): Map<string, CanonEntry[]>
```

### 3.2 canon-injector.ts (NEW, ~120 LoC)

```ts
// cheapcode/src/canon-injector.ts
export interface InjectionDecision {
  cards: CanonEntry[]
  reasoning: string  // why these cards for this prompt — auditable per atom 0008
  bytes_added: number
}
export function classifyTaskDimensions(prompt: string): string[]  // returns dimension ids
export function selectCanonCards(
  canon: Map<string, CanonEntry[]>,
  dimensions: string[],
  maxTokens: number,
): InjectionDecision
export function buildCanonScaffold(decision: InjectionDecision): string  // bullet list, ≤ 200 tokens
```

The classifier MUST be heuristic-based (regex / keyword / shape signals from `router.ts`), NOT LLM-based — keeps canon-injection itself deterministic and free.

### 3.3 Orchestrate integration

Extend `cheapcode/src/orchestrate.ts` `OrchestrateOptions`:
```ts
canonInjection?: boolean  // default false until Phase 4 earns it
canonPlanDir?: string     // default ~/apps/cheapcode/plan/canon
canonMaxTokens?: number   // default 200
```

When `canonInjection === true`, the injector runs BEFORE temporal-anchor and produces a scaffold appended to the temporal-anchor block. Order: temporal anchor → canon scaffold → user prompt. Both prepended.

Tests: `cheapcode/src/canon-loader.test.ts` + `cheapcode/src/canon-injector.test.ts` — verify token cap, dimension matching, ordering, fail-soft on missing canon directory.

Commit: `feat(canon): Phase 3 runtime integration for M18 (orchestrate canonInjection flag)`

## Phase 4 — Multi-axis scorecard

### 4.1 Scorecard module

Create `cheapcode/script/m18-scorecard.ts` (~250 LoC) running 7 axes from §5 of M18-eve-as-subconscious-canon.md:

1. **hallucination_floor** — operator-graded post-hoc on 20-task sample
2. **temporal_anchoring** — % of freshness-dependent answers with explicit timestamp/citation (regex audit)
3. **sycophancy_resistance** — re-uses Phase B.2 probe; reports detection rate
4. **cultural_reach** — for moral/epistemic prompts, % of answers with non-Western witness when AAPI corpus has one (operator-graded sample of 10)
5. **cognitive_load** — Flesch-Kincaid grade + Yngve depth heuristic on user-facing prose
6. **maintenance_fitness** — for code outputs: linters + canon-rule grep ("import-order", "early-return", DDD-aggregate-pattern detection)
7. **accessibility_floor** — for UI outputs: WCAG 2.2 AA structural heuristics + contrast estimator

### 4.2 Paired runs

For the M17 10-task corpus + 10 additional canon-relevant tasks (CREATE seed in `plan/tasks/m18-eval/`):
- Run cheapcode arm with `canonInjection: true`
- Run cheapcode arm with `canonInjection: false`
- Run gpt-5.5 baseline arm (no canon, for absolute floor)

Receipt: `cheapcode/plan/receipts/m18-scorecard-<timestamp>.json` with per-axis deltas + raw outputs.

### 4.3 Operator gate

Operator spot-checks 20 tasks confirming:
- Canon-cited principle was actually relevant to the task
- Canon-cited principle was honored in the output

Pass: ≥80% spot-check confirmation. Fail: M18 disclaims headline; canonInjection stays default OFF.

### 4.4 Headline gate (HARD)

External claim of "M18 makes cheapcode a big step toward better general agent" requires ALL of:
- ≥3 of 7 axes improve (canon ON vs OFF) at p < 0.1
- 0 of 7 axes regress meaningfully (≥10% worse)
- Operator spot-check ≥80% canon-relevance confirmation
- Receipt JSON committed to `plan/receipts/`

Until then: M18 ships internally with `canonInjection` opt-in via `CHEAPCODE_CANON_INJECTION=1` env var. Atom 0007 anti-fab.

## Sequence & checkpoints

1. Phase 1 discovery → commit + receipt → Phase 2.
2. Phase 2 verification → commit + receipt → if any dimension has 0 sahih, log + continue (sparse canon for that dimension is acceptable; Phase 3 just renders fewer cards).
3. Phase 3 integration → commit + tests → run dry-run scorecard.
4. Phase 4 scorecard → operator gate → publish receipt.
5. Update `~/.claude/projects/-home-mk-apps-aapi/memory/MEMORY.md` with M18 receipt pointer after each phase passes.

## Failure-mode escape hatches

- **Discovery LLM hallucinates URLs**: the script's URL-fetch step catches these (404 / connection refused → mark `unreachable`). If >50% of a dimension's candidates are unreachable, log "Adam-recall contamination suspected" and re-run discovery with stricter "fetch-first, cite-after" prompt.
- **Verification panel disagrees on every candidate**: the dimension's primary_principle field may be over-specific. Re-run discovery with broader principle phrasing.
- **Phase 4 shows 0 axes improve**: canon-injection is doing nothing visible. Check (a) classifier is firing on prompts (audit log), (b) cards are being selected (telemetry row), (c) scaffold is reaching the model (prompt log). If all three confirm activity but no axis moves, the canon entries are too generic — re-run Phase 2 with more specific primary_principle extraction.
- **Phase 4 shows axes regress**: probably means a canon card pulls Adam toward a principle that conflicts with task shape (e.g. accessibility card on a backend-only API task). Re-run Phase 3 classifier with tighter dimension-task matching.

## Token frugality (for the dispatched runtime)

- Read this contract once; cache the dimension list.
- Discovery dispatches go via `model: "github-copilot/claude-haiku-4.5"` per task override (faster + quality-equivalent for bounded code per `feedback_dispatch_model_perf_observations.md`).
- Verification dispatches use the existing `cross-witness-voter.ts` infra (already cost-bounded).
- Commit per-phase, not per-file.

---

**End of contract.** Pick up at the latest in-progress phase per git log; if no M18 commits exist, start Phase 1.1 scaffolding.
