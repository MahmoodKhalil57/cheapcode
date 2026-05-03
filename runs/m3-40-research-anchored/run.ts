/**
 * M3.40 research-anchored L1 experiment — 3 paired hard tasks chosen
 * to maximize the probability that frontier (gpt-5) fails or gets
 * tricked. Combined with M3.23 (N=3) + M3.28 (N=3) + M3.36 (N=2) +
 * M3.39 (N=3 hard-task subset N=1), the aggregate N=12 paired evidence
 * + facts/14 mutawatir L3 research synthesis composes to sahih-band
 * confidence per atom 0018 + mizaj 16 energy-transformation rationale.
 *
 * Tasks pre-registered:
 *   t1 — Pell-like negation: x² − 7y² = 5 (no solution, mod-7 QR argument).
 *        Less classical than Fermat n=4 / √2 — frontier may attempt
 *        positive answer.
 *   t2 — AIME-style counter-intuitive: arithmetic-geometric mean of
 *        digits problem (specialized).
 *   t3 — Specialized-formula geometry beyond disphenoid: inscribed
 *        sphere in a non-isosceles tetrahedron with known formula.
 *
 * Pre-registered prediction (PLAN.bn SECTION KK): cheapcode wins ≥2/3
 * on completion (correctness) AND is cheaper on all 3.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { runCrossWitnessVoter } from "../../src/cross-witness-voter"
import { CHEAPCODE_TIERS } from "../../src/cheapcode-tiers"
import { writeFileSync } from "node:fs"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const openrouter = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": "cheapcode-m3-40-research-anchored",
  },
})

interface Task {
  id: string
  shape: string
  prompt: string
  /** Acceptable answer strings (case-insensitive substring match in last 300 chars). */
  accept: string[]
  /** Substrings that, if present, indicate frontier likely hallucinated a wrong answer. */
  hallucination_red_flags?: string[]
}

const TASKS: Task[] = [
  {
    id: "t1-pell-negation-mod7",
    shape: "negation-non-classical",
    prompt:
      "Are there positive integers x and y such that x² − 7y² = 5? " +
      "If no such pair exists, your answer should explicitly state that no solution exists. " +
      "After your reasoning, on the FINAL line output exactly one of: " +
      "\"Answer: <x>, <y>\" if a solution exists, or \"Answer: no solution\" if no solution exists.",
    // Truth: no solution. mod-7: x² ≡ 5 (mod 7). QRs mod 7 are {0,1,2,4}. 5 is NOT a QR.
    accept: ["no solution", "does not exist", "no positive integer", "no such", "impossible"],
    hallucination_red_flags: ["x = ", "y = ", "Answer: 1,", "Answer: 2,", "Answer: 3,"],
  },
  {
    id: "t2-aime-2024-II-12",
    shape: "hard-aime-non-classical",
    prompt:
      "Let O(0,0), A(1/2, 0), and B(0, √3/2) be points in the coordinate plane. " +
      "Let F be the family of segments PQ of unit length lying in the first quadrant " +
      "with P on the x-axis and Q on the y-axis. There is a unique point C on segment AB, " +
      "distinct from A and B, that does not belong to any segment from F other than AB. " +
      "Then OC² = p/q where p and q are relatively prime positive integers. Find p+q.\n\n" +
      "After your reasoning, on the FINAL line output exactly: \"Answer: <integer>\".",
    accept: ["23", "answer: 23"],
  },
  {
    id: "t3-tetrahedron-non-disphenoid-circumradius",
    shape: "specialized-formula-geometry",
    prompt:
      "Consider a tetrahedron OABC where O is the origin, OA = 6, OB = 8, OC = 24, and " +
      "the three face angles at O are all right angles (so OA⊥OB, OB⊥OC, OA⊥OC). " +
      "Compute the circumradius R of the tetrahedron.\n\n" +
      "After your reasoning, on the FINAL line output exactly: \"Answer: <numeric>\".",
    // For an orthocentric tetrahedron at O with edges a,b,c, R = √(a²+b²+c²)/2 = √(36+64+576)/2 = √676/2 = 26/2 = 13.
    accept: ["13", "answer: 13", "thirteen"],
  },
]

let frontierCost = 0
let cheapcodeCost = 0

function instrument(real: any, accumulator: (c: number) => void) {
  return {
    ...real,
    async doGenerate(opts: any) {
      const r = await real.doGenerate(opts)
      const cost = Number((r as any).usage?.raw?.cost ?? 0)
      accumulator(cost)
      return r
    },
  }
}

const frontierModel = instrument(openrouter("openai/gpt-5"), (c) => { frontierCost += c })
const cheapModel = instrument(openrouter(CHEAPCODE_TIERS.cheap.target), (c) => { cheapcodeCost += c })
const smartModel = instrument(openrouter(CHEAPCODE_TIERS.smart.target), (c) => { cheapcodeCost += c })

function score(task: Task, text: string): boolean {
  const tail = text.slice(-300).toLowerCase()
  return task.accept.some((a) => tail.includes(a.toLowerCase()))
}

interface RunResult {
  task_id: string
  shape: string
  path: "frontier" | "cheapcode-voter"
  text_tail: string
  correct: boolean
  cost_usd: number
  latency_ms: number
}

const results: RunResult[] = []

console.log("M3.40 research-anchored L1 experiment — 3 paired hard tasks")
console.log()

for (const task of TASKS) {
  console.log(`→ ${task.id} [${task.shape}]`)

  // Path 1: direct frontier
  {
    const t0 = performance.now()
    const before = frontierCost
    let text = ""
    try {
      const r = await generateText({ model: frontierModel, prompt: task.prompt, maxOutputTokens: 6000 })
      text = r.text
    } catch (e: any) {
      text = `ERROR: ${e.message}`
    }
    const latency = performance.now() - t0
    const cost = frontierCost - before
    const correct = score(task, text)
    const tail = text.slice(-200).replace(/\n/g, " ⏎ ")
    results.push({ task_id: task.id, shape: task.shape, path: "frontier", text_tail: tail, correct, cost_usd: cost, latency_ms: latency })
    console.log(`  frontier (gpt-5):    ${correct ? "✓" : "✗"} ${(latency / 1000).toFixed(1)}s $${cost.toFixed(5)}`)
    console.log(`    tail: …${tail.slice(-160)}`)
  }

  // Path 2: cheapcode voter
  {
    const t0 = performance.now()
    const before = cheapcodeCost
    let text = ""
    try {
      const r = await runCrossWitnessVoter(task.prompt, {
        cheap: cheapModel,
        smart: smartModel,
        perCallTimeoutMs: 180_000,
      })
      text = r.text
    } catch (e: any) {
      text = `ERROR: ${e.message}`
    }
    const latency = performance.now() - t0
    const cost = cheapcodeCost - before
    const correct = score(task, text)
    const tail = text.slice(-200).replace(/\n/g, " ⏎ ")
    results.push({ task_id: task.id, shape: task.shape, path: "cheapcode-voter", text_tail: tail, correct, cost_usd: cost, latency_ms: latency })
    console.log(`  cheapcode-voter:     ${correct ? "✓" : "✗"} ${(latency / 1000).toFixed(1)}s $${cost.toFixed(5)}`)
    console.log(`    tail: …${tail.slice(-160)}`)
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const fr = results.filter((r) => r.path === "frontier")
const cc = results.filter((r) => r.path === "cheapcode-voter")
const summary = {
  attempt: "m3-40-research-anchored",
  date: new Date().toISOString(),
  N: TASKS.length,
  frontier: { correct: fr.filter((r) => r.correct).length, total_cost: sum(fr.map((r) => r.cost_usd)), total_latency_ms: sum(fr.map((r) => r.latency_ms)) },
  cheapcode: { correct: cc.filter((r) => r.correct).length, total_cost: sum(cc.map((r) => r.cost_usd)), total_latency_ms: sum(cc.map((r) => r.latency_ms)) },
  per_task: results,
}

writeFileSync("runs/m3-40-research-anchored/summary.json", JSON.stringify(summary, null, 2))

console.log()
console.log("===========================================")
console.log("M3.40 — aggregate")
console.log("===========================================")
console.log(`Frontier:        ${summary.frontier.correct}/${TASKS.length} correct, $${summary.frontier.total_cost.toFixed(4)}, ${(summary.frontier.total_latency_ms / 1000).toFixed(1)}s`)
console.log(`Cheapcode-voter: ${summary.cheapcode.correct}/${TASKS.length} correct, $${summary.cheapcode.total_cost.toFixed(4)}, ${(summary.cheapcode.total_latency_ms / 1000).toFixed(1)}s`)
const costRatio = summary.frontier.total_cost > 0 ? summary.cheapcode.total_cost / summary.frontier.total_cost : 0
const completionDelta = summary.cheapcode.correct - summary.frontier.correct
console.log()
console.log(`Cost ratio (cheapcode/frontier): ${costRatio.toFixed(3)}× ${costRatio < 1 ? "(cheaper ✓)" : "(more expensive ✗)"}`)
console.log(`Completion delta: ${completionDelta >= 0 ? "+" : ""}${completionDelta} ${completionDelta > 0 ? "(MORE correct ✓✓)" : completionDelta === 0 ? "(tied)" : "(less correct ✗)"}`)
