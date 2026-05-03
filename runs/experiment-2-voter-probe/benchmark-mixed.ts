/**
 * EXPERIMENT-2 (M3.19) — N=5 MIXED benchmark for cross-witness voter.
 *
 * Tests two distinct claims simultaneously:
 *   A. cross_witness_convergence_predicts_correctness on POSITIVE answers
 *      (3 hard AIME 2024 tasks where baseline gpt-5 plausibly fails)
 *   B. cross_witness_convergence_predicts_correctness on NEGATION
 *      (2 known-impossible tasks where the gold is "no solution exists")
 *
 * Per operator pointer (M3.18c): "find agents that know when to stop
 * looking for something that doesn't exist cheaply, quickly, and in
 * least logical steps." The 2 negative tasks specifically test this.
 *
 * Per atom 0010: convergence on NEGATION is potentially STRONGER signal
 * than convergence on positive answer (LLMs hallucinate toward producing
 * positive answers when asked to find something).
 *
 * Smallest distinguishing experiment per atom 0011: bounded N=5,
 * estimated ≤\$0.20 spend, ≤30 min wall.
 */

export interface Task {
  id: string
  prompt: string
  gold: string
  alternates?: string[]
  expects_negation: boolean
  shape: string
  source: string
}

export const TASKS: Task[] = [
  // ========== POSITIVE TASKS (hard AIME 2024) ==========
  {
    id: "aime-2024-I-11",
    prompt:
      "Each vertex of a regular octagon is independently colored either red or blue with equal probability. The probability that the octagon can then be rotated so that all of the blue vertices end up at positions where there were originally red vertices is m/n, where m and n are relatively prime positive integers. What is m+n?\n\nAfter your reasoning, on the FINAL line output exactly: \"Answer: <integer>\".",
    gold: "371",
    expects_negation: false,
    shape: "combinatorics-symmetry",
    source: "AIME 2024 I #11 (HuggingFace Maxwell-Jia/AIME_2024); baseline gpt-5 answered 367 in M3.13 — plausibly hard",
  },
  {
    id: "aime-2024-I-14",
    prompt:
      "Let ABCD be a tetrahedron such that AB=CD=√41, AC=BD=√80, and BC=AD=√89. There exists a point I inside the tetrahedron such that the distances from I to each of the faces of the tetrahedron are all equal. This distance can be written in the form m√n/p, where m, n, and p are positive integers, m and p are relatively prime, and n is not divisible by the square of any prime. Find m+n+p.\n\nAfter your reasoning, on the FINAL line output exactly: \"Answer: <integer>\".",
    gold: "104",
    expects_negation: false,
    shape: "geometry-tetrahedron",
    source: "AIME 2024 I #14",
  },
  {
    id: "aime-2024-II-13",
    prompt:
      "Let ω ≠ 1 be a 13th root of unity. Find the remainder when the product over k from 0 to 12 of (2 - 2·ω^k + ω^(2k)) is divided by 1000.\n\nAfter your reasoning, on the FINAL line output exactly: \"Answer: <integer>\".",
    gold: "321",
    expects_negation: false,
    shape: "complex-roots-of-unity",
    source: "AIME 2024 II #13",
  },

  // ========== NEGATIVE TASKS (known-impossible; betterq-inspired M3.18c) ==========
  {
    id: "neg-fermat-quartic",
    prompt:
      "Find positive integers x, y, z such that x^4 + y^4 = z^4. If no such triple exists, your answer should explicitly state that no solution exists. After your reasoning, on the FINAL line output exactly one of: \"Answer: <x>, <y>, <z>\" if a solution exists, or \"Answer: no solution\" if no solution exists.",
    gold: "no solution",
    alternates: ["does not exist", "no such", "impossible", "fermat", "no positive integer solutions", "no solution exists"],
    expects_negation: true,
    shape: "negative-result-fermat-n=4",
    source: "Fermat's Last Theorem n=4 (proven by Fermat himself, infinite descent)",
  },
  {
    id: "neg-sqrt-2-rational",
    prompt:
      "Find positive integers a and b with gcd(a, b) = 1 such that a^2 = 2·b^2. If no such pair exists, your answer should explicitly state that no solution exists. After your reasoning, on the FINAL line output exactly one of: \"Answer: <a>, <b>\" if a solution exists, or \"Answer: no solution\" if no solution exists.",
    gold: "no solution",
    alternates: ["does not exist", "no such", "impossible", "irrational", "sqrt(2) is irrational", "no solution exists"],
    expects_negation: true,
    shape: "negative-result-sqrt-2-irrational",
    source: "√2 irrational (classical proof; Euclid's Elements)",
  },
]

/**
 * Score a response against the task's expected outcome.
 *
 * For positive tasks (expects_negation=false): exact integer match.
 * For negative tasks (expects_negation=true): response must contain
 *   one of the negation markers (alternates). PASS if it does;
 *   FAIL if it claims a positive numerical answer (hallucination).
 */
export function scoreResponse(task: Task, response: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[‐-―−]/g, "-") // unicode dashes → ASCII
      .replace(/[.,!?;:'"`]/g, "")
      .replace(/\s+/g, " ")
      .trim()

  const respNorm = norm(response)

  if (task.expects_negation) {
    // For negation tasks, look for explicit "no solution" or alternate markers
    const candidates = [task.gold, ...(task.alternates ?? [])]
    return candidates.some((c) => respNorm.includes(norm(c)))
  }

  // Positive: extract Answer: <integer> and exact match against gold
  const m = response.match(/answer\s*[:=]\s*(\d+)/i)
  if (m && m[1] === task.gold) return true
  // Fallback: trailing integer in last 200 chars
  const tail = response.slice(-200)
  const trailing = [...tail.matchAll(/\b(\d+)\b/g)]
  if (trailing.length > 0 && trailing[trailing.length - 1][1] === task.gold) return true
  return false
}
