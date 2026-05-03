/**
 * EXPERIMENT-1 Arm A benchmark — N=10 multistep reasoning tasks.
 *
 * Each task has a deterministic gold answer scoreable by string-contains
 * (after lowercase + strip punctuation). All tasks require ≥2 reasoning
 * steps so a single-pass / no-CoT model could plausibly miss them.
 *
 * Curated to span: arithmetic chain, multi-hop trivia, deductive logic,
 * date/time reasoning, unit conversion, set ops, language manipulation,
 * conditional logic, percentage compounding, dimensional counting.
 *
 * Per SPEC Revision 2026-05-03j Phase 2 + EXPERIMENT-1.md kill-criteria,
 * N=10 is MIN-tier coverage. PASS-MIN = all 3 ratios meet target on N=10.
 */

export interface Task {
  id: string
  prompt: string
  gold: string
  alternates?: string[]
  shape: string
}

export const TASKS: Task[] = [
  {
    id: "t01-arith-chain",
    prompt:
      "I buy 3 apples for $0.75 each, 2 oranges for $0.50 each, and pay with a $10 bill. How much change do I get back? Answer with just a dollar amount.",
    gold: "$6.75",
    alternates: ["6.75", "$6.75", "6.75 dollars", "six dollars and seventy-five cents"],
    shape: "arith-chain",
  },
  {
    id: "t02-multihop-trivia",
    prompt:
      "What is the capital city of the country whose currency is the yen? Answer with just the city name.",
    gold: "Tokyo",
    shape: "multi-hop-trivia",
  },
  {
    id: "t03-deductive-logic",
    prompt:
      "Alice is taller than Bob. Bob is taller than Charlie. Charlie is taller than Dave. Who is the shortest? Answer with just the name.",
    gold: "Dave",
    shape: "deductive-logic",
  },
  {
    id: "t04-string-manip",
    prompt:
      "Take the third word of the phrase 'the quick brown fox jumps over' and reverse its letters. Answer with just the reversed word, lowercase.",
    gold: "nworb",
    shape: "string-manipulation",
  },
  {
    id: "t05-counting",
    prompt:
      "How many vowels (a, e, i, o, u) are in the lowercase string 'cheapcode is awesome'? Answer with just the count as a number.",
    // CORRECTED 2026-05-03 post-experiment: cheapcode = 4 (e,a,o,e),
    // is = 1 (i), awesome = 4 (a,e,o,e), total = 9. Original gold "8"
    // was a benchmark-author miscount — both baseline and wrapper
    // correctly answered 9. The score is RECOMPUTED below.
    gold: "9",
    shape: "counting",
  },
  {
    id: "t06-date-arith",
    prompt:
      "If today is Tuesday, what day of the week will it be exactly 100 days from today? Answer with just the day name.",
    gold: "Thursday",
    shape: "date-arithmetic",
  },
  {
    id: "t07-unit-convert",
    prompt:
      "Convert 5 kilometers to feet and round to the nearest hundred. Use 1 km = 3280.84 feet. Answer with just the rounded number.",
    gold: "16400",
    shape: "unit-conversion",
  },
  {
    id: "t08-percent-compound",
    prompt:
      "An investment of $1000 grows by 5% in year 1 and then by 10% in year 2. What is the final value? Answer with just a dollar amount.",
    gold: "$1155",
    alternates: ["$1,155", "1155", "1,155", "1155.00", "$1155.00"],
    shape: "percentage-compound",
  },
  {
    id: "t09-syllogism",
    prompt:
      "All cats are mammals. All mammals are warm-blooded. Are cats warm-blooded? Answer Yes or No.",
    gold: "Yes",
    shape: "syllogism",
  },
  {
    id: "t10-set-ops",
    prompt:
      "Given two sets A = {1, 2, 3, 4} and B = {3, 4, 5, 6, 7}, what is the size of the symmetric difference A △ B (elements in either A or B but not both)? Answer with just the count.",
    gold: "5",
    shape: "set-operations",
  },
]

/**
 * Score a model's response against the task's gold answer.
 * Returns true if the response contains the gold (case-insensitive,
 * stripped of common punctuation) OR any alternate.
 */
export function scoreResponse(task: Task, response: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,!?;:'"`]/g, "")
      .replace(/\s+/g, " ")
      .trim()

  const candidates = [task.gold, ...(task.alternates ?? [])]
  const respNorm = norm(response)
  return candidates.some((c) => respNorm.includes(norm(c)))
}
