/**
 * M3.39 dominance test — paired comparison of (a) direct frontier
 * (gpt-5) vs (b) cheapcode-routed dispatch on a 3-task mixed shape:
 *
 *   Task 1: Simple Q&A (cheap-tier should be sufficient)
 *   Task 2: Medium reasoning (math-chain shape; smart-tier or voter)
 *   Task 3: Hard math (AIME-style; voter via cross-witness)
 *
 * Goal: demonstrate cheapcode is cheaper AND smarter AND faster across
 * the mix (operator's "hearsay impossible" all-axis dominance claim).
 *
 * Per atom 0011 (smallest distinguishing): N=3, expected ≤$0.50 spend,
 * ≤15 min wall.
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
    "X-Title": "cheapcode-m3-39-dominance",
  },
})

interface Task {
  id: string
  shape: string
  prompt: string
  gold: string
  // routing decision: cheap | smart | voter
  cheapcodeRoute: "cheap" | "smart" | "voter"
}

const TASKS: Task[] = [
  {
    id: "t1-simple-qa",
    shape: "simple-factual",
    prompt: "What is the capital of France? Answer in one word.",
    gold: "Paris",
    cheapcodeRoute: "cheap", // routine factual → cheap-tier sufficient
  },
  {
    id: "t2-medium-math",
    shape: "math-chain",
    prompt:
      "What is the smallest positive integer n such that n² + 1 is divisible by 17? " +
      "Show your reasoning then output exactly: \"Answer: <integer>\".",
    gold: "4", // n=4: 16+1=17, divisible by 17
    cheapcodeRoute: "smart", // math-chain shape → smart tier (gpt-5-mini)
  },
  {
    id: "t3-hard-aime",
    shape: "hard-reasoning",
    prompt:
      "Let ω ≠ 1 be a 13th root of unity. Find the remainder when the product " +
      "over k from 0 to 12 of (2 - 2·ω^k + ω^(2k)) is divided by 1000. " +
      "After your reasoning, on the FINAL line output exactly: \"Answer: <integer>\".",
    gold: "321", // M3.19 known answer
    cheapcodeRoute: "voter", // hard-reasoning → cross-witness voter
  },
]

let frontierCost = 0
let cheapcodeCost = 0

function instrument(real: any, accumulator: () => void) {
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

const frontierModel = instrument(
  openrouter("openai/gpt-5"),
  (c: number) => { frontierCost += c },
)
const cheapModel = instrument(
  openrouter(CHEAPCODE_TIERS.cheap.target),
  (c: number) => { cheapcodeCost += c },
)
const smartModel = instrument(
  openrouter(CHEAPCODE_TIERS.smart.target),
  (c: number) => { cheapcodeCost += c },
)

function extractAnswer(text: string, gold: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:'"]/g, "").trim()
  const text_l = norm(text)
  const gold_l = norm(gold)
  // Direct match anywhere in last 200 chars
  const tail = norm(text.slice(-200))
  if (tail.includes(gold_l)) return true
  // Try Answer: X format
  const m = text.match(/answer\s*[:=]\s*(\S+)/i)
  if (m && norm(m[1]!) === gold_l) return true
  return false
}

interface RunResult {
  task_id: string
  shape: string
  path: "frontier" | "cheapcode"
  cheapcode_route?: "cheap" | "smart" | "voter"
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
}

const results: RunResult[] = []

console.log("M3.39 dominance test — paired N=3 mixed shapes")
console.log()

for (const task of TASKS) {
  console.log(`→ ${task.id} [${task.shape}] gold="${task.gold}"`)

  // Path 1: direct frontier (gpt-5)
  {
    const t0 = performance.now()
    const before = frontierCost
    let text = ""
    try {
      const r = await generateText({ model: frontierModel, prompt: task.prompt, maxOutputTokens: 4000 })
      text = r.text
    } catch (e: any) {
      text = `ERROR: ${e.message}`
    }
    const latency = performance.now() - t0
    const cost = frontierCost - before
    const correct = extractAnswer(text, task.gold)
    results.push({
      task_id: task.id,
      shape: task.shape,
      path: "frontier",
      text: text.slice(0, 800),
      correct,
      cost_usd: cost,
      latency_ms: latency,
    })
    console.log(`  frontier (gpt-5):  ${correct ? "✓" : "✗"} ${(latency/1000).toFixed(1)}s $${cost.toFixed(5)}`)
  }

  // Path 2: cheapcode (route per task.cheapcodeRoute)
  {
    const t0 = performance.now()
    const before = cheapcodeCost
    let text = ""
    try {
      if (task.cheapcodeRoute === "cheap") {
        const r = await generateText({ model: cheapModel, prompt: task.prompt, maxOutputTokens: 1000 })
        text = r.text
      } else if (task.cheapcodeRoute === "smart") {
        const r = await generateText({ model: smartModel, prompt: task.prompt, maxOutputTokens: 4000 })
        text = r.text
      } else {
        // voter
        const result = await runCrossWitnessVoter(task.prompt, {
          cheap: cheapModel,
          smart: smartModel,
          perCallTimeoutMs: 180_000,
        })
        text = result.text
      }
    } catch (e: any) {
      text = `ERROR: ${e.message}`
    }
    const latency = performance.now() - t0
    const cost = cheapcodeCost - before
    const correct = extractAnswer(text, task.gold)
    results.push({
      task_id: task.id,
      shape: task.shape,
      path: "cheapcode",
      cheapcode_route: task.cheapcodeRoute,
      text: text.slice(0, 800),
      correct,
      cost_usd: cost,
      latency_ms: latency,
    })
    console.log(`  cheapcode (${task.cheapcodeRoute}):  ${correct ? "✓" : "✗"} ${(latency/1000).toFixed(1)}s $${cost.toFixed(5)}`)
  }
}

const frontierResults = results.filter((r) => r.path === "frontier")
const cheapcodeResults = results.filter((r) => r.path === "cheapcode")

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const totalCorrectFrontier = frontierResults.filter((r) => r.correct).length
const totalCorrectCheapcode = cheapcodeResults.filter((r) => r.correct).length
const totalCostFrontier = sum(frontierResults.map((r) => r.cost_usd))
const totalCostCheapcode = sum(cheapcodeResults.map((r) => r.cost_usd))
const totalLatencyFrontier = sum(frontierResults.map((r) => r.latency_ms))
const totalLatencyCheapcode = sum(cheapcodeResults.map((r) => r.latency_ms))

const summary = {
  attempt: "m3-39-dominance",
  date: new Date().toISOString(),
  N: TASKS.length,
  frontier: {
    correct: totalCorrectFrontier,
    correct_rate: totalCorrectFrontier / TASKS.length,
    total_cost_usd: totalCostFrontier,
    total_latency_ms: totalLatencyFrontier,
  },
  cheapcode: {
    correct: totalCorrectCheapcode,
    correct_rate: totalCorrectCheapcode / TASKS.length,
    total_cost_usd: totalCostCheapcode,
    total_latency_ms: totalLatencyCheapcode,
  },
  ratios_cheapcode_vs_frontier: {
    cost_ratio: totalCostFrontier > 0 ? totalCostCheapcode / totalCostFrontier : NaN,
    latency_ratio: totalLatencyFrontier > 0 ? totalLatencyCheapcode / totalLatencyFrontier : NaN,
    completion_delta: totalCorrectCheapcode - totalCorrectFrontier,
  },
  per_task: results,
}

writeFileSync("runs/m3-39-dominance/summary.json", JSON.stringify(summary, null, 2))

console.log()
console.log("===========================================")
console.log("M3.39 DOMINANCE — aggregate")
console.log("===========================================")
console.log(`Frontier (gpt-5):  ${totalCorrectFrontier}/${TASKS.length} correct, $${totalCostFrontier.toFixed(4)} total, ${(totalLatencyFrontier/1000).toFixed(1)}s total`)
console.log(`Cheapcode:         ${totalCorrectCheapcode}/${TASKS.length} correct, $${totalCostCheapcode.toFixed(4)} total, ${(totalLatencyCheapcode/1000).toFixed(1)}s total`)
console.log()
console.log(`Ratios (cheapcode / frontier):`)
console.log(`  cost:       ${summary.ratios_cheapcode_vs_frontier.cost_ratio.toFixed(3)}× ${summary.ratios_cheapcode_vs_frontier.cost_ratio < 1 ? "(cheaper ✓)" : "(more expensive ✗)"}`)
console.log(`  latency:    ${summary.ratios_cheapcode_vs_frontier.latency_ratio.toFixed(3)}× ${summary.ratios_cheapcode_vs_frontier.latency_ratio < 1 ? "(faster ✓)" : "(slower ✗)"}`)
console.log(`  completion: ${summary.ratios_cheapcode_vs_frontier.completion_delta >= 0 ? "+" : ""}${summary.ratios_cheapcode_vs_frontier.completion_delta} ${summary.ratios_cheapcode_vs_frontier.completion_delta >= 0 ? "(at least as smart ✓)" : "(less smart ✗)"}`)
