# M17 paired-benchmark task corpus

10 representative tasks per `M17-DISPATCH-CONTRACT.md` §"Smarter/faster/cheaper measurement contract":

| ID | Shape | Difficulty hint |
|---|---|---|
| bc-1, bc-2, bc-3 | bounded-code | Single-file refactor / bug-fix / one-function-extract |
| lc-1, lc-2, lc-3 | long-context | Multi-file synthesis / cross-doc reasoning |
| pf-1, pf-2 | phd-factual | Specialist-knowledge recall + synthesis |
| hr-1, hr-2 | hard-reasoning | Multi-step deduction / counterfactual / planning |

Each task is a JSON file with:

- `id` — string, matches filename
- `shape` — TaskShape enum (must match router's classifier output)
- `prompt` — full prompt text given to BOTH arms verbatim
- `correctness_check` — automated heuristic (regex / substring / keyword set / etc) OR `"operator-graded"`
- `expected_keywords` — optional list of substrings the answer should contain (lenient)
- `forbidden_keywords` — optional list of substrings that mark a fail
- `notes` — provenance / why this task is representative

The benchmark script (`script/m17-benchmark.ts`) runs each task through:

1. **arm A**: cheapcode router → tier resolution → credential pool dispatch
2. **arm B**: gpt-5.5 direct (operator's baseline)

Both arms get identical prompts. Receipts include wall_clock_ms, tokens, cost estimate, output excerpt, and pass/fail per `correctness_check`.

**Hard rule**: NO "smarter/faster/cheaper than gpt-5.5" claim outside this repo until ≥7/10 receipts pass on the cheaper-OR-equal-OR-better axis. Per atom 0007 anti-fab.
