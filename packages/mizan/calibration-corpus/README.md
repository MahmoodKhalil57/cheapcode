# mizan/calibration-corpus — atomic LLM-blindspot tasks for per-LLM dampening

Per cheapcode session 2026-05-03 (operator: Mahmood). Calibration ground-
truth corpus for mizan's per-LLM dampening profile (deferred Tier-2
upgrade from facts/27).

Framework:
  - Each task is ATOMIC (<2 min for a human to answer)
  - Each task targets ONE blindspot category (per arxiv 2507.07313 +
    Strawberry-class historical record)
  - Each task is REPRODUCIBLE across N≥3 trials with same prompt
  - 3-tier sourcing:
    Tier 1 (internet, $0): mined from public LLM-blindspot benchmarks
    Tier 2 (Mahmood validates, ~30s/task): I propose, he confirms
    Tier 3 (Mahmood originates, ~1-2 min/task): operator-specific tasks

Categories per the 5-criterion rubric:
  C1 self-state ("which model are you running")
  C2 operator-preference recall (CLAUDE.md content)
  C3 character/counting (with sufficient context length to break tokenizer)
  C4 temporal arithmetic with anchor
  C5 constraint-satisfaction with absolute bounds
  C6 self-contradiction detection
  C7 perception (image/screenshot when applicable)
  C8 calibration ("are you sure?" downgrade behavior)

Plus from arxiv 2507.07313 (Frontier LLMs Still Struggle with Simple
Reasoning):
  C9 unpuzzles (trivialized versions of famous puzzles — memorization-
     vs-reasoning diagnostic)
  C10 distractor-laden simple arithmetic
  C11 logical-negation at depth ≥12
  C12 multi-step arithmetic with k irrelevant entities

Storage:
  atomic-tasks.jsonl — one line per task, schema:
    {
      "id": "T0001",
      "category": "C9",
      "prompt": "...",
      "expected_human_answer": "...",
      "expected_llm_failure_mode": "memorization-of-original-puzzle",
      "source": "arxiv-2507.07313" | "internet:<url>" | "mahmood",
      "status": "proposed" | "validated_by_mahmood" | "measured",
      "trial_results": [
        {"model": "claude-opus-4-7", "answer": "...", "correct": false, "ts": "..."}
      ]
    }

Workflow:
  1. I draft tasks, mark status="proposed"
  2. Mahmood validates in batches (~30s each) — confirms human-trivial
     + reproducible failure across LLMs
  3. Validated tasks run against opus-4-7 + gpt-5-5 via cheapcode-witness
     + recorded in trial_results
  4. mizan.calibration consumes trial_results to fit per-LLM dampening
     hyperparameters (atom 0013 calibration-as-credential per LLM)

Atom basis:
  - 0011 (smallest-distinguishing-experiment): each task is the smallest
    distinguishing experiment for its blindspot category
  - 0013 (calibration-as-credential): the corpus is the substrate's own
    track-record
  - 0017 (unknowns-as-positive-data): LLM blindspots are positive data
  - 0018 (energy-transformation): trade my wallclock seconds (research)
    for Mahmood's minutes (validation)
