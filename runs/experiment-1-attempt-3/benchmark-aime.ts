/**
 * EXPERIMENT-1 Arm A attempt-3 — N=10 AIME 2024 problems.
 *
 * Public benchmark from huggingface.co/datasets/Maxwell-Jia/AIME_2024.
 * AIME = American Invitational Mathematics Examination — 30 problems,
 * integer answers 0-999. Per published gpt-5 leaderboard scores
 * (~70-85% on AIME), baseline gpt-5 should NOT saturate at 100% on
 * this benchmark — providing room for the wrapper to demonstrate any
 * smart-axis lift.
 *
 * Picked 5 from AIME I + 5 from AIME II, spread across problem
 * numbers (#2, #5, #8, #11, #14 / #1, #4, #7, #10, #13) to span
 * easy / medium / hard difficulty within each contest.
 *
 * Per atom 0011 (smallest distinguishing experiment): if baseline still
 * saturates THIS benchmark, the smart-axis claim is structurally
 * un-exercisable in our envelope and the answer becomes
 * "untested-after-3-attempts; ship narrower per atom 0013."
 */

export interface Task {
  id: string
  prompt: string
  gold: string
  shape: string
}

const SUFFIX =
  "\n\nThis is an AIME problem. The answer is an integer between 0 and 999. Provide your reasoning briefly, then on a final line output exactly: 'Answer: <integer>'."

function aimeTask(id: string, problem: string, answer: number, shape: string): Task {
  return {
    id,
    prompt: problem + SUFFIX,
    gold: String(answer),
    shape,
  }
}

export const TASKS: Task[] = [
  aimeTask(
    "2024-I-2",
    "There exist real numbers $x$ and $y$, both greater than 1, such that $\\log_x\\left(y^x\\right)=\\log_y\\left(x^{4y}\\right)=10$. Find $xy$.",
    25,
    "logarithms",
  ),
  aimeTask(
    "2024-I-5",
    "Rectangles $ABCD$ and $EFGH$ are drawn such that $D,E,C,F$ are collinear. Also, $A,D,H,G$ all lie on a circle. If $BC=16$, $AB=107$, $FG=17$, and $EF=184$, what is the length of $CE$?",
    104,
    "geometry-rect-circle",
  ),
  aimeTask(
    "2024-I-8",
    "Eight circles of radius $34$ are sequentially tangent, and two of the circles are tangent to $AB$ and $BC$ of triangle $ABC$, respectively. $2024$ circles of radius $1$ can be arranged in the same manner. The inradius of triangle $ABC$ can be expressed as $\\frac{m}{n}$, where $m$ and $n$ are relatively prime positive integers. Find $m+n$.",
    197,
    "geometry-tangent-circles",
  ),
  aimeTask(
    "2024-I-11",
    "Each vertex of a regular octagon is independently colored either red or blue with equal probability. The probability that the octagon can then be rotated so that all of the blue vertices end up at positions where there were originally red vertices is $\\tfrac{m}{n}$, where $m$ and $n$ are relatively prime positive integers. What is $m+n$?",
    371,
    "combinatorics-symmetry",
  ),
  aimeTask(
    "2024-I-14",
    "Let $ABCD$ be a tetrahedron such that $AB=CD= \\sqrt{41}$, $AC=BD= \\sqrt{80}$, and $BC=AD= \\sqrt{89}$. There exists a point $I$ inside the tetrahedron such that the distances from $I$ to each of the faces of the tetrahedron are all equal. This distance can be written in the form $\\frac{m \\sqrt n}{p}$, where $m$, $n$, and $p$ are positive integers, $m$ and $p$ are relatively prime, and $n$ is not divisible by the square of any prime. Find $m+n+p$.",
    104,
    "geometry-tetrahedron",
  ),
  aimeTask(
    "2024-II-1",
    "Among the 900 residents of Aimeville, there are 195 who own a diamond ring, 367 who own a set of golf clubs, and 562 who own a garden spade. In addition, each of the 900 residents owns a bag of candy hearts. There are 437 residents who own exactly two of these things, and 234 residents who own exactly three of these things. Find the number of residents of Aimeville who own all four of these things.",
    73,
    "set-inclusion-exclusion",
  ),
  aimeTask(
    "2024-II-4",
    "Let $x,y$ and $z$ be positive real numbers that satisfy the following system of equations: $\\log_2(x/(yz)) = 1/2$, $\\log_2(y/(xz)) = 1/3$, $\\log_2(z/(xy)) = 1/4$. Then the value of $|\\log_2(x^4 y^3 z^2)|$ is $m/n$ where $m$ and $n$ are relatively prime positive integers. Find $m+n$.",
    33,
    "logarithm-systems",
  ),
  aimeTask(
    "2024-II-7",
    "Let $N$ be the greatest four-digit positive integer with the property that whenever one of its digits is changed to $1$, the resulting number is divisible by $7$. Let $Q$ and $R$ be the quotient and remainder, respectively, when $N$ is divided by $1000$. Find $Q+R$.",
    699,
    "number-theory-divisibility",
  ),
  aimeTask(
    "2024-II-10",
    "Let $\\triangle ABC$ have circumcenter $O$ and incenter $I$ with $\\overline{IA}\\perp\\overline{OI}$, circumradius $13$, and inradius $6$. Find $AB\\cdot AC$.",
    468,
    "geometry-incenter-circumcenter",
  ),
  aimeTask(
    "2024-II-13",
    "Let $\\omega \\neq 1$ be a 13th root of unity. Find the remainder when $\\prod_{k=0}^{12}(2 - 2\\omega^k + \\omega^{2k})$ is divided by 1000.",
    321,
    "complex-roots-of-unity",
  ),
]

/**
 * Score: extract the answer (integer) from the response, then exact-match
 * against gold. AIME prompts ask for "Answer: <integer>" on a final line;
 * we also accept any standalone integer that matches the gold.
 */
export function scoreResponse(task: Task, response: string): boolean {
  const gold = task.gold.trim()
  // Look for "Answer: N" pattern
  const m = response.match(/answer\s*[:=]\s*(\d+)/i)
  if (m && m[1] === gold) return true
  // Also accept boxed{N} or just final standalone N matching gold
  const boxed = response.match(/\\?boxed\s*\{?\s*(\d+)\s*\}?/i)
  if (boxed && boxed[1] === gold) return true
  // Last-resort: trailing integer in last 200 chars matches gold
  const tail = response.slice(-200)
  const trailing = [...tail.matchAll(/\b(\d+)\b/g)]
  if (trailing.length > 0 && trailing[trailing.length - 1][1] === gold) return true
  return false
}
