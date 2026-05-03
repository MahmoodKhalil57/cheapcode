/**
 * EXPERIMENT-3 (M3.23 QW1.1) — paired GPT-5 baseline on M3.19's 3 positive
 * AIME tasks. Combined with M3.19 voter data, gives the missing paired
 * comparison for the claim "voter beats GPT-5 on cost, latency, AND
 * completion on hard-reasoning."
 *
 * Per atom 0011 (smallest distinguishing experiment): N=3, expected ~$0.30
 * spend, ≤15 min wall. Pre-registered claim:
 *   voter_beats_gpt5_on_cost_latency_completion_hard_reasoning_n3
 * Falsifier: voter loses on any of cost/latency/completion vs GPT-5
 * paired comparison.
 *
 * Models: openai/gpt-5 (top frontier reasoning model on OpenRouter).
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { TASKS, scoreResponse, type Task } from "../experiment-2-voter-probe/benchmark-mixed"
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const ATTEMPT_DIR = "runs/experiment-3-voter-vs-frontier"
mkdirSync(ATTEMPT_DIR, { recursive: true })

const openrouter = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": "cheapcode-experiment-3-voter-vs-frontier",
  },
})

const FRONTIER_MODEL_ID = "openai/gpt-5"
const PER_CALL_TIMEOUT_MS = 300_000 // 5 min per call (reasoning models)

const POSITIVE_TASKS: Task[] = TASKS.filter((t) => !t.expects_negation)

interface Run {
  task_id: string
  shape: string
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
}

const RESULTS_PATH = `${ATTEMPT_DIR}/results.jsonl`
writeFileSync(RESULTS_PATH, "")

const frontier = openrouter(FRONTIER_MODEL_ID)

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms),
    ),
  ])
}

console.log(`EXPERIMENT-3 baseline — N=${POSITIVE_TASKS.length} positive AIME against ${FRONTIER_MODEL_ID}`)
console.log()

const allRuns: Run[] = []
let totalCost = 0

for (const task of POSITIVE_TASKS) {
  console.log(`→ ${task.id} [${task.shape}] gold="${task.gold}"`)
  const t0 = performance.now()
  try {
    const result = await withTimeout(
      generateText({ model: frontier, prompt: task.prompt }),
      PER_CALL_TIMEOUT_MS,
      `${task.id}-frontier`,
    )
    const latency_ms = performance.now() - t0
    const cost_usd = Number((result as any).usage?.raw?.cost ?? 0)
    totalCost += cost_usd
    const correct = scoreResponse(task, result.text)
    const run: Run = {
      task_id: task.id,
      shape: task.shape,
      text: result.text,
      correct,
      cost_usd,
      latency_ms,
    }
    appendFileSync(RESULTS_PATH, JSON.stringify(run) + "\n")
    allRuns.push(run)
    const tail = result.text.slice(-100).replace(/\n/g, " ⏎ ")
    console.log(
      `   ${correct ? "✓" : "✗"} ${latency_ms.toFixed(0)}ms $${cost_usd.toFixed(5)}`,
    )
    console.log(`   text-tail: …${tail}`)
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}`)
    appendFileSync(
      RESULTS_PATH,
      JSON.stringify({
        task_id: task.id,
        shape: task.shape,
        text: `ERROR: ${e.message}`,
        correct: false,
        cost_usd: 0,
        latency_ms: performance.now() - t0,
      }) + "\n",
    )
  }
}

// ============================================================
// Paired comparison vs M3.19 voter data
// ============================================================

const VOTER_DATA: Record<string, { correct: boolean; cost_usd: number; latency_ms: number }> = {
  "aime-2024-I-11": { correct: false, cost_usd: 0.00137, latency_ms: 230498 },
  "aime-2024-I-14": { correct: true, cost_usd: 0.03244, latency_ms: 183670 },
  "aime-2024-II-13": { correct: true, cost_usd: 0.01739, latency_ms: 60513 },
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

const frontier_correct = allRuns.filter((r) => r.correct).length
const voter_correct = Object.values(VOTER_DATA).filter((v) => v.correct).length

const frontier_cost = sum(allRuns.map((r) => r.cost_usd))
const voter_cost = sum(Object.values(VOTER_DATA).map((v) => v.cost_usd))

const frontier_p50 = median(allRuns.map((r) => r.latency_ms))
const voter_p50 = median(Object.values(VOTER_DATA).map((v) => v.latency_ms))

const summary = {
  attempt: "experiment-3-voter-vs-frontier-m3-23",
  date: new Date().toISOString(),
  N: POSITIVE_TASKS.length,
  frontier_model: FRONTIER_MODEL_ID,
  frontier: {
    correct: frontier_correct,
    correct_rate: frontier_correct / POSITIVE_TASKS.length,
    total_cost_usd: frontier_cost,
    p50_latency_ms: frontier_p50,
  },
  voter_m3_19: {
    correct: voter_correct,
    correct_rate: voter_correct / 3,
    total_cost_usd: voter_cost,
    p50_latency_ms: voter_p50,
  },
  ratios_voter_vs_frontier: {
    cost_ratio: frontier_cost > 0 ? voter_cost / frontier_cost : NaN,
    latency_ratio: frontier_p50 > 0 ? voter_p50 / frontier_p50 : NaN,
    completion_delta: voter_correct - frontier_correct,
  },
  per_task: POSITIVE_TASKS.map((task) => {
    const f = allRuns.find((r) => r.task_id === task.id)
    const v = VOTER_DATA[task.id]
    return {
      task: task.id,
      shape: task.shape,
      gold: task.gold,
      frontier_correct: f?.correct ?? null,
      frontier_cost: f?.cost_usd ?? null,
      frontier_latency_ms: f ? Math.round(f.latency_ms) : null,
      voter_correct: v?.correct ?? null,
      voter_cost: v?.cost_usd ?? null,
      voter_latency_ms: v ? Math.round(v.latency_ms) : null,
    }
  }),
}

writeFileSync(`${ATTEMPT_DIR}/baseline-summary.json`, JSON.stringify(summary, null, 2))

console.log()
console.log("===========================================")
console.log("M3.23 QW1.1 voter-vs-frontier paired comparison")
console.log("===========================================")
console.log(`Frontier (${FRONTIER_MODEL_ID}): ${frontier_correct}/${POSITIVE_TASKS.length} correct, $${frontier_cost.toFixed(4)} total, ${frontier_p50.toFixed(0)}ms P50`)
console.log(`Voter (M3.19):                    ${voter_correct}/3 correct, $${voter_cost.toFixed(4)} total, ${voter_p50.toFixed(0)}ms P50`)
console.log()
console.log(`Voter / frontier ratios:`)
console.log(`  cost:       ${summary.ratios_voter_vs_frontier.cost_ratio.toFixed(3)}× ${summary.ratios_voter_vs_frontier.cost_ratio < 1 ? "(voter cheaper ✓)" : "(voter more expensive ✗)"}`)
console.log(`  latency:    ${summary.ratios_voter_vs_frontier.latency_ratio.toFixed(3)}× ${summary.ratios_voter_vs_frontier.latency_ratio < 1 ? "(voter faster ✓)" : "(voter slower ✗)"}`)
console.log(`  completion: ${summary.ratios_voter_vs_frontier.completion_delta >= 0 ? "+" : ""}${summary.ratios_voter_vs_frontier.completion_delta} ${summary.ratios_voter_vs_frontier.completion_delta >= 0 ? "(voter ≥ frontier ✓)" : "(voter < frontier ✗)"}`)
