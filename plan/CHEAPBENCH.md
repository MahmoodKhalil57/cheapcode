# CHEAPBENCH — cheapcode's project-owned smartness benchmark

**Status:** design doc. Pre-registered shape. Implementation gated on EXPERIMENT-0 PASS.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), Mizaj rule 07 (stack-default-is-not-neutral — TB is the popular default; popularity ≠ alignment with cheapcode's goal), Mizaj rule 01 (falsifier-first).

**Goal:** measure whether cheapcode + cheapllm is "smart at general agent tasks" — at $0 marginal cost (no LLM calls beyond cheapllm itself), using only publicly available data (no licensing, no scraping disputes), with gold answers derived from the data's own structure (not LLM-generated).

---

## Why we own this

[`plan/PLAN.bn`](PLAN.bn) Section H thesis `cheapcode_smart_on_cheapbench` cannot be discharged by Terminal Bench alone, for three reasons:

1. **TB is one slice of agent capability.** TB tasks are shell-heavy and Linux-bound. cheapcode's product thesis is general-agent-smartness across coding, doc-comprehension, planning, and recovery — TB measures part of that, not all.
2. **TB runs cost money.** Each TB task is a multi-turn LLM call. Repeated runs across cheapcode versions amortize, but the marginal cost is non-zero and grows linearly with iteration speed. cheapbench is designed to be **$0 marginal** so we can iterate without budget gating.
3. **TB is the popular default** (mizaj rule 07). Optimizing for it without independent measurement risks goodharting the bench instead of the goal. cheapbench is the independent witness.

TB-easy and TB-18 stay in the scorecard as **triangulation cells** — disagreement between cheapbench and TB is informative, not failure. Convergence raises confidence in the smart-axis claim.

---

## Constraints (pre-registered, hard contract)

| # | Constraint | MIN | EXPECTED | IDEAL |
|---|---|---|---|---|
| 1 | Marginal cost per task | ≤ $0.001 (cheapllm only) | $0 (no extra calls) | $0 |
| 2 | Data licensing | public domain or permissive only | + cited per task | + archived locally for reproducibility |
| 3 | Gold-answer derivation | from public data's structure | + sanity-checked on N=10 sample | + automated extraction script |
| 4 | Task shapes | ≥ 5 from ≥ 3 sources | ≥ 8 from ≥ 4 sources | 12+ from ≥ 5 sources |
| 5 | Pre-registration | task list pinned before any cheapcode run | + frozen by git tag | + cryptographic hash in daftar receipt |
| 6 | Comparison baseline | vanilla opencode + cheapllm same tasks | + 1 vendor comparison cell | + full vendor matrix |

**No tier-creep:** if a task shape requires LLM-generated gold (e.g. "what would a senior engineer say?"), it does not belong in cheapbench — that's a different bench (cost > $0 marginal, gold not derivable from public structure).

---

## Candidate task shapes (pre-registered, drawn from public sources only)

Each shape names: source / gold-derivation rule / what capability it tests.

### S1 — Stack Overflow accepted-answer alignment
- **Source:** Stack Overflow public Q&A dump (CC-BY-SA, archive.org)
- **Gold derivation:** `accepted_answer_id` field on the question
- **Task:** given the question body, identify the accepted-answer's high-level approach (top-1 of a 4-choice multi-select extracted from top 4 answers by score)
- **Capability tested:** matching question intent to the canonical solution shape

### S2 — Linux man-page command synthesis
- **Source:** Linux man pages (`man-pages` package, GPL — usable for benchmarking, attribute)
- **Gold derivation:** synopsis lines + `EXAMPLES` section already provide invocation patterns
- **Task:** given a man page + a natural-language goal, produce the invocation that matches the EXAMPLES section's pattern
- **Capability tested:** docs comprehension + instruction-following + flag selection

### S3 — Python stdlib signature recall
- **Source:** CPython repo (Python License — public)
- **Gold derivation:** `inspect.signature(func)` programmatically — exact ground truth
- **Task:** given a stdlib function name + one-line description, produce the signature
- **Capability tested:** internal-knowledge recall (this is where small models hallucinate most)

### S4 — Conventional-commit-style file-change prediction
- **Source:** any large public repo (e.g. cpython, linux, react) — git log
- **Gold derivation:** the actual file paths in `git show <sha> --name-only`
- **Task:** given a commit message, predict which file paths were changed (top-3 multi-choice from candidates extracted from the repo)
- **Capability tested:** repo navigation + intent-to-structure mapping

### S5 — Failing-test diagnosis from CI log
- **Source:** GitHub Actions public logs (specific repo's archived runs, Actions API public for public repos)
- **Gold derivation:** the test name in the CI failure section of the log
- **Task:** given a CI log excerpt, identify the failing test name
- **Capability tested:** unstructured-log comprehension + needle-in-haystack

### S6 — README → CLI flag lookup
- **Source:** any popular CLI tool's README on GitHub (MIT/Apache/etc. — permissive)
- **Gold derivation:** README's own `--help`-style sections
- **Task:** given a README + a feature description, produce the flag that enables it
- **Capability tested:** scoped-doc retrieval + flag synthesis

### S7 — Bug-fix-PR commit attribution
- **Source:** GitHub PR archive for any large open project (PRs with linked issues)
- **Gold derivation:** the PR's merge-commit hash + the issue number it closes (`Closes #N` linkage)
- **Task:** given an issue description + a candidate diff, decide if the diff fixes the issue (binary)
- **Capability tested:** code-change-to-issue alignment

### S8 — Stack-trace-to-source-line localization
- **Source:** any public Python/JS project with archived issue stack traces
- **Gold derivation:** the file:line in the topmost frame of the stack
- **Task:** given a stack trace + the relevant source file, identify the offending line
- **Capability tested:** stack-frame parsing + source navigation

**Pick 5–8 of S1..S8 for MIN tier; defer the rest to EXPECTED.**

---

## Comparison protocol

Each task shape is run in three configurations:

1. **vanilla opencode + cheapllm backend** (baseline; the "no-harness-uplift" control)
2. **cheapcode + cheapllm backend, MIN tier** (claim-shape addon + daftar/mizaj tools)
3. **cheapcode + cheapllm backend, EXPECTED tier** (full substrate-tools matrix once available)

Falsifier: if (2) and (3) both score within ±2pp of (1), the harness uplift thesis is dead and Section C of [`plan/PLAN.bn`](PLAN.bn) is falsified.

Vendor cells (where available without payment): include published numbers from public docs / blog posts as triangulation, **never as ground truth** (vendors goodhart their own claims). Source-credibility ladder in [`plan/CONFIDENCE.md`](CONFIDENCE.md).

---

## Pre-registration template

Before any cheapcode run, freeze cheapbench by:

1. Pinning task list in `runs/cheapbench-vN/manifest.json` with hashes of source data
2. Tagging git: `git tag cheapbench-vN`
3. Daftar receipt: `bun ~/apps/daftar/bin/daftar add note --project="/home/mk/apps/cheapcode" --title="cheapbench vN frozen" --body="<task list + source hashes + tag>"`

After the run, update [`plan/PLAN.bn`](PLAN.bn) Section H observation `obs_cheapbench_score_lt_design_floor` based on measured score against the pre-registered floor.

**Design-floor heuristic** (refine before first run): cheapbench MIN = ≥ 60% across 8 task shapes, with no single shape below 35%. EXPECTED = ≥ 75% with no single shape below 50%. IDEAL = ≥ 85% with no single shape below 70%.

---

## What cheapbench is NOT

- **Not a public leaderboard.** We publish results in our scorecard but do not host a competitive bench. Vendors are welcome to run their tools against our pre-registered tasks; we will not run theirs.
- **Not a replacement for TB.** TB-easy and TB-18 remain in the scorecard. cheapbench complements; it does not subtract.
- **Not LLM-judged.** All gold answers derive from public data's own structure. No "GPT-as-judge" semantic-similarity scoring — that re-introduces vendor bias.
- **Not closed-source.** Task shapes, gold-derivation rules, and source pointers are committed to this repo. Reproducible by anyone with the same public sources.

---

## Out of scope for this design doc

- Implementation. Gated on EXPERIMENT-0 PASS.
- Source data download / archival. Done at run time after EXPERIMENT-0 PASS.
- Vendor comparison cells. Filled per [`plan/CONFIDENCE.md`](CONFIDENCE.md) protocol when research lands.
