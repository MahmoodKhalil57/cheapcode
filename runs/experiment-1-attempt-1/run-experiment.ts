/**
 * EXPERIMENT-1 Arm A runner — measures 3-axis dominance.
 *
 * For each task in benchmark.ts:
 *   1. Run baseline = single call to a strong frontier model (openai/gpt-5)
 *   2. Run wrapper = cheapcode auto tier (compound: plan + leaves + bestK + verify)
 *   3. Record cost (USD), latency (ms), completion (gold-contained boolean)
 *
 * Output: results.jsonl + verdict.md per Model Cards format.
 *
 * Pre-registered kill criteria (SPEC + plan/EXPERIMENT-1.md Arm A table):
 *   PASS-MIN  : cost ≤0.30× AND latency ≤0.70× AND completion ≥1.10× on N=10
 *   PARTIAL   : 2 of 3 axes hit
 *   FAIL      : ≤1 axis hit OR completion below baseline
 */

import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createCheapcodeProvider } from "../../src/cheapcode-tiers"
import { TASKS, scoreResponse, type Task } from "./benchmark"
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const ATTEMPT_DIR = "runs/experiment-1-attempt-1"
mkdirSync(ATTEMPT_DIR, { recursive: true })

const BASELINE_MODEL = "openai/gpt-5"

const openrouter = createOpenRouter({
  apiKey,
  headers: { "HTTP-Referer": "https://github.com/cheapcode", "X-Title": "cheapcode-experiment-1" },
})

const cheapcode = createCheapcodeProvider({
  apiKey,
  appName: "cheapcode-experiment-1",
  auto: {
    enabled: true,
    verifierTarget: "anthropic/claude-haiku-4.5",
    k: 3,
    maxRetries: 1,
  },
})

interface Run {
  task_id: string
  shape: string
  arm: "baseline" | "wrapper"
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
  trace?: unknown
}

function extractCost(usage: any): number {
  // OpenRouter exposes cost in usage.raw.cost (USD). When absent (e.g. wrapper
  // adapter doesn't aggregate), return 0 — we'll back-fill via per-call sum.
  return Number(usage?.raw?.cost ?? 0)
}

async function runBaseline(task: Task): Promise<Run> {
  const t0 = performance.now()
  const result = await generateText({
    model: openrouter(BASELINE_MODEL),
    prompt: task.prompt,
  })
  const latency_ms = performance.now() - t0
  const correct = scoreResponse(task, result.text)
  return {
    task_id: task.id,
    shape: task.shape,
    arm: "baseline",
    text: result.text.trim(),
    correct,
    cost_usd: extractCost(result.usage),
    latency_ms,
  }
}

// Per-call cost capture for the wrapper. Hooks are awkward without the
// adapter forwarding usage events; for MIN we instrument by re-implementing
// the wrapper inline here so we can sum costs across all sub-calls.

import { CHEAPCODE_TIERS } from "../../src/cheapcode-tiers"

async function runWrapperInstrumented(task: Task): Promise<Run> {
  const smart = openrouter(CHEAPCODE_TIERS.smart.target)
  const cheap = openrouter(CHEAPCODE_TIERS.cheap.target)
  const verifier = openrouter("anthropic/claude-haiku-4.5")

  let totalCost = 0
  const t0 = performance.now()

  // 1. Plan-decompose
  const plan = await generateText({
    model: smart,
    prompt:
      "Decompose the task into 2-5 numbered steps. Output ONLY the numbered list:\n\n" +
      task.prompt,
  })
  totalCost += extractCost(plan.usage)
  const steps = plan.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(\d+[.)]|[-*])\s+/.test(l))
    .map((l) => l.replace(/^(\d+[.)]|[-*])\s+/, ""))

  // 2. Parallel leaves at cheap tier
  const leafResults = await Promise.all(
    steps.map((step) =>
      generateText({ model: cheap, prompt: `Execute concisely:\n\n${step}` }).then((r) => {
        totalCost += extractCost(r.usage)
        return r.text.trim()
      }),
    ),
  )

  // 3. Best-of-K=3 synthesis at smart
  const synthPrompt = `Given the task and per-step results, give the FINAL ANSWER concisely.

Task:
${task.prompt}

Steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Results:
${leafResults.map((r, i) => `Step ${i + 1}: ${r}`).join("\n")}

Final answer:`

  const syntheses = await Promise.all(
    Array.from({ length: 3 }).map(() =>
      generateText({ model: smart, prompt: synthPrompt }).then((r) => {
        totalCost += extractCost(r.usage)
        return r.text.trim()
      }),
    ),
  )

  // Pick longest synthesis (MIN-tier heuristic; verifier-scored selection is EXPECTED tier)
  let candidateIdx = 0
  let bestLen = 0
  for (let i = 0; i < syntheses.length; i++) {
    if ((syntheses[i] ?? "").length > bestLen) {
      bestLen = syntheses[i].length
      candidateIdx = i
    }
  }
  let candidate = syntheses[candidateIdx]

  // 4. Cross-model verifier
  const verifyPrompt = `You are a strict verifier. Given a task and a candidate answer, decide if it correctly solves the task. Output exactly:
PASS — if correct
FAIL: <reason> — if wrong

Task:
${task.prompt}

Candidate:
${candidate}

Verdict:`

  let verifyResult = await generateText({ model: verifier, prompt: verifyPrompt })
  totalCost += extractCost(verifyResult.usage)
  let passed = /^PASS\b/i.test(verifyResult.text.trim())
  let retried = false

  // 5. Retry-with-feedback if failed
  if (!passed) {
    const feedback = verifyResult.text.trim().replace(/^FAIL[:\s-]*/i, "")
    const retryPrompt = `${synthPrompt}

Previous answer was rejected: ${feedback}

Improved final answer:`
    const retryResult = await generateText({ model: smart, prompt: retryPrompt })
    totalCost += extractCost(retryResult.usage)
    candidate = retryResult.text.trim()
    retried = true
    // re-verify
    const verify2 = await generateText({
      model: verifier,
      prompt: verifyPrompt.replace(candidate, candidate),
    })
    totalCost += extractCost(verify2.usage)
    passed = /^PASS\b/i.test(verify2.text.trim())
  }

  const latency_ms = performance.now() - t0
  const correct = scoreResponse(task, candidate)
  return {
    task_id: task.id,
    shape: task.shape,
    arm: "wrapper",
    text: candidate,
    correct,
    cost_usd: totalCost,
    latency_ms,
    trace: {
      plan_steps: steps.length,
      leaf_count: leafResults.length,
      k_samples: syntheses.length,
      verifier_passed: passed,
      retried,
    },
  }
}

// ============================================================
// Main
// ============================================================

const RESULTS_PATH = `${ATTEMPT_DIR}/results.jsonl`
writeFileSync(RESULTS_PATH, "")

console.log(`EXPERIMENT-1 Arm A — N=${TASKS.length} multistep tasks`)
console.log(`Baseline: ${BASELINE_MODEL}`)
console.log(`Wrapper:  smart=${CHEAPCODE_TIERS.smart.target} cheap=${CHEAPCODE_TIERS.cheap.target} verifier=anthropic/claude-haiku-4.5`)
console.log()

const allRuns: Run[] = []

for (const task of TASKS) {
  console.log(`→ ${task.id} [${task.shape}]`)
  // baseline
  try {
    const b = await runBaseline(task)
    appendFileSync(RESULTS_PATH, JSON.stringify(b) + "\n")
    allRuns.push(b)
    console.log(`   baseline: ${b.correct ? "✓" : "✗"} ${b.latency_ms.toFixed(0)}ms $${b.cost_usd.toFixed(5)} → ${b.text.slice(0, 60)}`)
  } catch (e: any) {
    console.error(`   baseline ERROR: ${e.message}`)
  }
  // wrapper
  try {
    const w = await runWrapperInstrumented(task)
    appendFileSync(RESULTS_PATH, JSON.stringify(w) + "\n")
    allRuns.push(w)
    console.log(`   wrapper:  ${w.correct ? "✓" : "✗"} ${w.latency_ms.toFixed(0)}ms $${w.cost_usd.toFixed(5)} → ${w.text.slice(0, 60)}`)
  } catch (e: any) {
    console.error(`   wrapper ERROR: ${e.message}`)
  }
}

// ============================================================
// Compute 3-axis ratios
// ============================================================

const baselineRuns = allRuns.filter((r) => r.arm === "baseline")
const wrapperRuns = allRuns.filter((r) => r.arm === "wrapper")

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}
const completionRate = (rs: Run[]) => rs.filter((r) => r.correct).length / Math.max(rs.length, 1)

const baselineCost = sum(baselineRuns.map((r) => r.cost_usd))
const wrapperCost = sum(wrapperRuns.map((r) => r.cost_usd))
const baselineP50 = median(baselineRuns.map((r) => r.latency_ms))
const wrapperP50 = median(wrapperRuns.map((r) => r.latency_ms))
const baselineCompletion = completionRate(baselineRuns)
const wrapperCompletion = completionRate(wrapperRuns)

const costRatio = baselineCost > 0 ? wrapperCost / baselineCost : Infinity
const latencyRatio = baselineP50 > 0 ? wrapperP50 / baselineP50 : Infinity
const completionRatio = baselineCompletion > 0 ? wrapperCompletion / baselineCompletion : Infinity

const COST_TARGET = 0.30 // wrapper ≤ 0.30× baseline
const LATENCY_TARGET = 0.70
const COMPLETION_TARGET = 1.10

const costPass = costRatio <= COST_TARGET
const latencyPass = latencyRatio <= LATENCY_TARGET
const completionPass = completionRatio >= COMPLETION_TARGET
const axesPass = (costPass ? 1 : 0) + (latencyPass ? 1 : 0) + (completionPass ? 1 : 0)

let outcome: "PASS-MIN" | "PARTIAL" | "FAIL"
if (axesPass === 3) outcome = "PASS-MIN"
else if (axesPass === 2 && wrapperCompletion >= baselineCompletion) outcome = "PARTIAL"
else outcome = "FAIL"

const summary = {
  attempt: "experiment-1-attempt-1",
  date: new Date().toISOString(),
  N: TASKS.length,
  baseline_model: BASELINE_MODEL,
  wrapper: {
    smart: CHEAPCODE_TIERS.smart.target,
    cheap: CHEAPCODE_TIERS.cheap.target,
    verifier: "anthropic/claude-haiku-4.5",
    k: 3,
    maxRetries: 1,
  },
  cost: { baseline_usd: baselineCost, wrapper_usd: wrapperCost, ratio: costRatio, target: COST_TARGET, pass: costPass },
  latency: { baseline_p50_ms: baselineP50, wrapper_p50_ms: wrapperP50, ratio: latencyRatio, target: LATENCY_TARGET, pass: latencyPass },
  completion: { baseline_rate: baselineCompletion, wrapper_rate: wrapperCompletion, ratio: completionRatio, target: COMPLETION_TARGET, pass: completionPass },
  axes_passing: axesPass,
  outcome,
}

writeFileSync(`${ATTEMPT_DIR}/3-axis-comparison.json`, JSON.stringify(summary, null, 2))

console.log()
console.log("======================================")
console.log("3-AXIS RESULTS")
console.log("======================================")
console.log(`Cost      : wrapper $${wrapperCost.toFixed(4)} / baseline $${baselineCost.toFixed(4)} = ${costRatio.toFixed(3)} (target ≤${COST_TARGET}) ${costPass ? "✓" : "✗"}`)
console.log(`Latency   : wrapper ${wrapperP50.toFixed(0)}ms / baseline ${baselineP50.toFixed(0)}ms = ${latencyRatio.toFixed(3)} (target ≤${LATENCY_TARGET}) ${latencyPass ? "✓" : "✗"}`)
console.log(`Completion: wrapper ${(wrapperCompletion * 100).toFixed(0)}% / baseline ${(baselineCompletion * 100).toFixed(0)}% = ${completionRatio.toFixed(3)} (target ≥${COMPLETION_TARGET}) ${completionPass ? "✓" : "✗"}`)
console.log()
console.log(`OUTCOME: ${outcome} (${axesPass}/3 axes)`)
