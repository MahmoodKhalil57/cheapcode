/**
 * EXPERIMENT-1 Arm A attempt-2 — N=10 HARD multistep reasoning tasks.
 *
 * Attempt-1 (M3.11) found the simple-multistep benchmark exhibited a ceiling
 * effect: both baseline and wrapper saturated at 100%. To actually exercise
 * the smart-axis claim, we need a benchmark where baseline (raw gpt-5) does
 * NOT saturate.
 *
 * Each task in this benchmark requires ≥3 chained reasoning steps where a
 * single error compounds. Gold answers are hand-verified by me (the agent
 * who curated this) and re-checked. After M3.11's t05 miss-count error,
 * the verification discipline is stricter — each gold has a written
 * derivation in comments.
 *
 * Score: case-insensitive containment with curated alternates.
 *
 * Per atom 0011 (smallest distinguishing experiment): the benchmark must
 * actually distinguish wrapper from baseline. If both still saturate, the
 * benchmark is still too easy and we have no signal.
 */

export interface Task {
  id: string
  prompt: string
  gold: string
  alternates?: string[]
  shape: string
  derivation: string
}

export const TASKS: Task[] = [
  {
    id: "h01-compound-percent",
    prompt:
      "A stock goes up 20% in January, down 25% in February, up 30% in March, down 15% in April. What is the cumulative percentage change over these four months? Express as a percentage rounded to one decimal place (e.g., 5.3% or -5.3%).",
    gold: "-0.5%",
    alternates: ["-0.55%", "-0.55", "-0.5", "approximately -0.5%", "approximately -0.6%", "-0.6%"],
    shape: "compound-percent-multiplicative",
    derivation:
      "1.20 * 0.75 * 1.30 * 0.85 = 0.99450. So change = -0.55%, rounded to one decimal = -0.5% or -0.6%. The trap: additive 20-25+30-15 = 10% is wrong.",
  },
  {
    id: "h02-flight-schedule",
    prompt:
      "An airline flies from city A to city B. Flights depart every 2 hours, starting at 6:00 AM, with the last departure at 10:00 PM. Each flight takes 90 minutes. If I arrive at city B at 7:30 PM local time (same timezone), what time did my flight depart from city A?",
    gold: "6:00 PM",
    alternates: ["6 PM", "18:00", "1800", "6pm", "06:00 PM"],
    shape: "schedule-arithmetic",
    derivation:
      "Arrival 19:30 - 90min flight = departure 18:00 = 6 PM. Verify: 6 PM is on the every-2h-from-6AM schedule (6,8,10,12,14,16,18,20,22). ✓",
  },
  {
    id: "h03-deductive-chain",
    prompt:
      "Consider these statements: (1) If A is true then B is false. (2) If B is false then C is true. (3) If C is true and D is false then E is true. (4) If E is true then F is true. Given that A is true and D is false, what is the truth value of F? Answer 'True' or 'False'.",
    gold: "True",
    shape: "modus-ponens-chain",
    derivation:
      "A=T → B=F (by 1). B=F → C=T (by 2). C=T ∧ D=F → E=T (by 3). E=T → F=T (by 4). Gold: True.",
  },
  {
    id: "h04-light-time",
    prompt:
      "Light takes about 8 minutes 20 seconds to travel from the Sun to Earth (1 AU). Mars orbits at an average distance of 1.524 AU from the Sun. How long does it take for light to travel from the Sun to Mars on average? Express in minutes, rounded to one decimal place.",
    gold: "12.7",
    alternates: ["12.7 minutes", "12.7 min", "12.7m", "approximately 12.7"],
    shape: "unit-proportional-arithmetic",
    derivation:
      "1 AU = 500 seconds = 8.333... minutes. 1.524 AU = 1.524 * 500 = 762 seconds = 12.7 minutes. ✓",
  },
  {
    id: "h05-combinatorics",
    prompt:
      "Four boys and four girls sit in a row of 8 seats. How many seating arrangements are there such that no two boys are adjacent? Treat all individuals as distinguishable.",
    gold: "2880",
    alternates: ["2,880"],
    shape: "combinatorial-with-constraint",
    derivation:
      "Place 4 girls first in 4! = 24 ways. This creates 5 gaps (G_G_G_G_G). Choose 4 of 5 gaps and assign 4 distinguishable boys: P(5,4) = 5*4*3*2 = 120. Total = 24 * 120 = 2880. ✓",
  },
  {
    id: "h06-conditional-prob",
    prompt:
      "Two fair six-sided dice are rolled. Given that the sum of the two dice is even, what is the probability that the sum is at least 8? Express as a simplified common fraction (e.g., 3/4).",
    gold: "1/2",
    alternates: ["one half", "0.5"],
    shape: "conditional-probability",
    derivation:
      "Even sums (count of (d1,d2) pairs): sum 2:1, 4:3, 6:5, 8:5, 10:3, 12:1. Total even outcomes = 18. Even sums ≥ 8: 8(5)+10(3)+12(1) = 9. P = 9/18 = 1/2. ✓",
  },
  {
    id: "h07-inscribed-radius",
    prompt:
      "A right triangle has legs of length 5 and 12. Find the radius of its inscribed circle (the largest circle that fits entirely inside the triangle, tangent to all three sides).",
    gold: "2",
    shape: "geometry-inradius",
    derivation:
      "Hypotenuse = 13 (5-12-13 right triangle). Area = (1/2)(5)(12) = 30. Semi-perimeter s = (5+12+13)/2 = 15. Inradius r = Area/s = 30/15 = 2. ✓",
  },
  {
    id: "h08-leap-year-day",
    prompt:
      "If June 1, 2024 is a Saturday, what day of the week is March 1, 2025? Note that 2024 is a leap year and 2025 is not.",
    gold: "Saturday",
    shape: "calendar-with-leap",
    derivation:
      "From June 1, 2024 to June 1, 2025 = 365 days (Feb 29, 2024 not in this interval; Feb 29, 2025 doesn't exist). Then back from June 1, 2025 to March 1, 2025 = 92 days (Mar 31 + Apr 30 + May 31 = 92). So March 1, 2025 = June 1, 2024 + (365 - 92) = +273 days. 273 mod 7 = 0, so same day-of-week as Sat → Saturday. ✓",
  },
  {
    id: "h09-balls-prob",
    prompt:
      "A bag contains 5 red balls, 4 blue balls, and 3 green balls (12 total). Two balls are drawn at random without replacement. What is the probability that at least one drawn ball is red? Express as a simplified common fraction.",
    gold: "15/22",
    shape: "complement-probability",
    derivation:
      "P(no red) = (7/12)(6/11) = 42/132 = 7/22. P(at least one red) = 1 - 7/22 = 15/22. ✓ (lowest terms; gcd(15,22)=1)",
  },
  {
    id: "h10-quadratic-positive",
    prompt:
      "Find all positive integers n satisfying n² - 5n + 6 = 0. Express your answer as a comma-separated list of the values of n in ascending order.",
    gold: "2, 3",
    alternates: ["2,3", "n=2 and n=3", "n = 2, 3", "{2, 3}", "2 and 3"],
    shape: "quadratic-roots",
    derivation:
      "n² - 5n + 6 = (n-2)(n-3) = 0 → n=2 or n=3. Both positive integers. Gold: 2 and 3 in ascending order. ✓",
  },
]

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
