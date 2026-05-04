# M19 dispatch contract — research → plan → implement: best unbiased code/UI/UX agent for humans

**You are**: cheapcode itself, running via `cheapcode run --model=openai/gpt-5.5` (consumer-Plus OAuth → chatgpt.com/backend-api/codex/responses). You have shell tools (Bash, Read, Write, Edit, Grep, Glob, WebFetch, WebSearch) via the opencode tool harness.

**Read first** (in this order, before doing anything else):
1. `~/apps/cheapcode/SESSION-2026-05-04.md` — what's already built (M16+M17+M18 Phase 1)
2. `~/apps/cheapcode/plan/M18-eve-as-subconscious-canon.md` — Adam-Eve frame, 8 dimensions
3. `~/apps/cheapcode/plan/M18-DISPATCH-CONTRACT.md` — Eve-curates-not-Adam-recalls discipline
4. `~/.claude/CLAUDE.md` — substrate-suite + atom 0007 anti-fab + atom 0020 Adam-Eve

---

## Goal (operator's exact words, 2026-05-04)

> Go through human design principles from scratch and research more sources / papers / online experiments / blog posts etc. Experiment locally with cheapcode. Plan the perfect internal flow, skills, tools, mizan, and energy transformation in general, for "best unbiased code-quality / UI / UX agents for humans" — and then implement it.

You are going to spend the long-running budget on this end-to-end. The operator will validate AFTER you finish. Make the work surface as commits + receipts so they can review without asking you questions.

---

## Hard constraints (do NOT violate)

1. **Eve curates, Adam doesn't recall.** Every "this principle says X" claim must be backed by a fetched URL or in-tree artifact, not training memory. Per atom 0007 anti-fab.
2. **No headline marketing claim** until receipts earn it. The benchmark printer's anti-fab gate is sacred.
3. **Commit per phase, never amass uncommitted work.** Memory `feedback_commit_regularly`: uncommitted = ephemeral.
4. **Cheap dispatch where possible.** When a sub-task is bounded code, prefer `model: github-copilot/claude-haiku-4.5`. When the sub-task is "discover and synthesize," gpt-5.5 is the default.
5. **Run the M17 paired-benchmark after each substantive change** to confirm no regression. Receipts go to `plan/receipts/`.
6. **Do NOT touch Sanad** (cloud analog, separately tracked). M19 is local-CLI-side.
7. **Anti-sycophancy.** When you encounter a published claim that contradicts your prior, surface the contradiction; don't paper over.
8. **Keep the operator's seed list as a starting set**, not as the canon. Extend with at least 5 additional authoritative sources per dimension via WebSearch + WebFetch.

---

## Phase plan

### Phase 1 — Research-first canon expansion (~2-3 hours dispatch)

Goal: extend the M18 canon from 17 candidates to a robust ≥40 candidates spanning all 8 dimensions, all web-fetched.

For each dimension in `plan/canon/<D>.candidates.json`:

1. Read the current candidates.
2. WebSearch for 3-5 additional authoritative sources per dimension that the seed list doesn't include. Examples of search terms:
   - "Refactoring book Martin Fowler readability"
   - "ARIA authoring practices W3C"
   - "Crap detection NN/G heuristics"
   - "Don Norman emotional design"
   - "Stephen Wolfram on LLMs"
   - "Constitutional AI Anthropic"
   - "DPO RLHF papers"
3. WebFetch each candidate URL. Extract a primary_principle excerpt.
4. Before committing, run a sycophancy-resistance probe on yourself: ask "would I have chosen this source if the operator hadn't seeded the list?" If the answer is no, document why you're including it anyway.
5. Add to `plan/canon/<D>.candidates.json` with `mizan_grade: "daif"` + `discovered_via: "phase1-extension"`.

Falsification gate — Phase 1 done when:
- `bun script/m18-discover-canon.ts --validate` (write this validator if missing) confirms each candidates.json has ≥4 entries with non-empty `extracted_excerpt` per dimension.
- Total candidates ≥40 across all dimensions.

Commit: `feat(canon): M19 Phase 1 — research-first canon expansion (N candidates)`

### Phase 2 — Local experimentation: which countermeasures actually move the needle?

Goal: test each substrate countermeasure against a *measurable* failure mode, on cheapcode itself, with consumer-Plus OAuth as the dispatch budget.

For each of the 6 known LLM failure modes (sycophancy, temporal blindness, ToM/fact-belief, cultural homogenization, reversal curse, RLHF bias):

1. Design a 10-prompt synthetic adversarial benchmark (write to `plan/benchmarks/<failure-mode>.json`).
2. Run gpt-5.5-direct against the benchmark — record the failure rate.
3. Run gpt-5.5 + the corresponding cheapcode countermeasure (temporal-anchor, sycophancy-probe, etc.) — record the failure rate.
4. Receipt: `plan/receipts/m19-countermeasure-<mode>-<timestamp>.json` with raw outputs + delta + p-value if computable.

Decision rule per mode:
- ≥30% absolute reduction in failure rate → countermeasure earns "active by default"
- 10-30% reduction → "opt-in, documented benefit"
- <10% reduction → "opt-in only, document the null result"
- Regression → DO NOT ship that countermeasure; document why.

Commit: `feat(experiments): M19 Phase 2 — countermeasure-vs-baseline experiments (6 modes)`

### Phase 3 — Synthesis: design the canonical agent

Goal: based on Phase 2 evidence, write `plan/M19-AGENT-DESIGN.md` describing the perfect internal flow, skills, tools, mizan integration, energy transformation for the "best unbiased code/UI/UX agent for humans."

Required sections:

1. **Telos.** What "best unbiased code/UI/UX agent for humans" actually means in this design — give it operational definitions per axis (cognitive load, hallucination floor, sycophancy resistance, accessibility floor, etc.).
2. **Pipeline.** From user prompt arrival → final output. Show every substrate gate (action-safety, anti-sycophancy probe, temporal anchor, canon injection, voter dispatch, claim-shape verification, citation pass).
3. **Skill catalog.** Distinct agent skills (e.g. "code-review-with-canon", "ui-mockup-with-WCAG-floor", "ux-research-with-NN-G-witness"). For each skill: required canon dimensions, required substrate primitives, output format.
4. **Tool inventory.** What cheapcode adds to opencode's tool list, when each tool is invoked, what the budget is per invocation.
5. **Mizan integration.** Where mizan_check_action_safety / mizan_verify_claim / mizan_physical_reality_probe / mizan_recommend_next_experiment fire in the pipeline. Auditable per atom 0008.
6. **Energy transformation.** Adam-Eve metaphor — what specifically does Eve do that Adam alone can't, AT EACH PIPELINE STAGE. This is the differentiator narrative.
7. **Confidence accounting.** Per the headline gate (≥3/7 axes improve, 0 regress, ≥80% operator spot-check), specify how each phase contributes evidence and what each axis measures.
8. **Anti-claim section.** Things this design does NOT promise, with citations to the LLM-failure papers that constrain the promise envelope.

Commit: `plan: M19 Phase 3 — agent design synthesis (≥3000 word doc)`

### Phase 4 — Implementation

Goal: ship the design. Modules under `cheapcode/src/`:

1. `canon-loader.ts` (~80 LoC) — load + filter canon by dimension + grade. Tests in `canon-loader.test.ts`.
2. `canon-injector.ts` (~150 LoC) — heuristic classifier picks 1-3 cards per task; token-budget-bounded scaffold. Tests in `canon-injector.test.ts`.
3. `claim-shape.ts` (~120 LoC) — burhan-style fact-witnessed vs belief-attested vs recommendation tagging at output time. Tests.
4. Extend `orchestrate.ts` with `canonInjection` + `claimShapeVerify` opt-in flags.
5. Wire into `m17-live-dispatch.ts` so the benchmark exercises the full stack.
6. New scorecard script `script/m19-scorecard.ts` running 7 axes (hallucination_floor, temporal_anchoring, sycophancy_resistance, cultural_reach, cognitive_load, maintenance_fitness, accessibility_floor).

Each module: write tests first, then implementation. `bun test` must stay 100% green throughout.

Commit per module. Final commit: `feat(M19): full agent design implemented + scorecard`.

### Phase 5 — Headline gate

Run `bun script/m19-scorecard.ts --live --baseline` to produce the canon-OFF baseline.
Run `bun script/m19-scorecard.ts --live --canon-on` to produce the canon-ON receipt.
Diff the two; receipt to `plan/receipts/m19-scorecard-<timestamp>.json`.

If ≥3 of 7 axes improve AND 0 regress meaningfully (≥10% worse):
- Update `cheapcode/SESSION-2026-05-04.md` with the verified delta.
- Print the headline-claim threshold MET banner.
- Do NOT publish externally. Operator must spot-check 20 outputs at ≥80% canon-relevance before any external claim.

If <3 improve or any regress:
- Receipt explains why.
- canonInjection + claimShape stay opt-in via env flags.
- Update SESSION-2026-05-04.md with the null result, honestly.

---

## Operating rules

- **Use TodoWrite to track progress.** Each phase split into ~5-10 tasks. Mark complete as you go.
- **When you hit ambiguity, write the assumption to a file and continue.** Don't stop to ask; the operator will read the assumption later.
- **When you discover a flaw in the existing M16/M17/M18 work, file it as a follow-up in `plan/M19-FOLLOW-UPS.md` rather than fixing in scope.**
- **When tests fail, fix them or revert. Never `--no-verify`.**
- **Run `bun test` (full suite, all M17 modules) before each commit.**
- **Save partial state every ~30 minutes** by committing in-progress notes to `plan/M19-IN-PROGRESS.md`. The operator may interrupt; resumption from in-progress is part of the contract.
- **Anti-fab discipline self-check at end of every phase**: re-read the phase's commits, list every assertion, and grade each as "verified by fetched source", "verified by test", "verified by receipt", or "ASSUMPTION (unverified)". Append to `plan/M19-IN-PROGRESS.md`. Honest tally trumps tidy narrative.

---

## What "done" looks like

The next session opens `plan/M19-IN-PROGRESS.md` and sees:
- Phase 1: ≥40 candidates committed, validator passes
- Phase 2: 6 countermeasure receipts in `plan/receipts/`, decision per mode documented
- Phase 3: `plan/M19-AGENT-DESIGN.md` ≥3000 words, all 8 sections present
- Phase 4: 3 new modules + tests all green, orchestrate extended, m17-live-dispatch wired
- Phase 5: scorecard receipt with verdict (PASS or honest null)
- Anti-fab self-check tally per phase
- A list of follow-ups in `plan/M19-FOLLOW-UPS.md` for things you discovered but didn't fix

If you cannot complete a phase due to genuine blocker (rate-limit, network, etc.), commit what you have, write the blocker into `plan/M19-IN-PROGRESS.md`, and stop. Do not fake success.

---

**Begin.**
