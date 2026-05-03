/**
 * EXPERIMENT-1 Arm A attempt-3 — runs AIME 2024 N=10 benchmark.
 *
 * Same wrapper logic as attempts 1+2; new benchmark. AIME problems
 * have integer answers 0-999, deterministic scoring, public.
 *
 * gpt-5 baseline expected ~70-85% per published leaderboards (2024-2025).
 * If wrapper matches or beats, that's the smart-axis claim test.
 *
 * Cost estimate: AIME problems require longer reasoning chains
 * (~5-15K reasoning tokens for gpt-5). Per-task baseline ~$0.05-0.20.
 * 10 tasks → baseline ~$1.00. Wrapper sub-calls cheaper-per-call but
 * more numerous → ~$0.50-1.50.
 * Total: ~$2-3 (within $4.84 remaining budget).
 *
 * Reusing instrumented compound logic from run-experiment-2.ts.
 */

import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { TASKS, scoreResponse, type Task } from "./benchmark-aime"
import { CHEAPCODE_TIERS } from "../../src/cheapcode-tiers"
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const ATTEMPT_DIR = "runs/experiment-1-attempt-3"
mkdirSync(ATTEMPT_DIR, { recursive: true })

const BASELINE_MODEL = "openai/gpt-5"
const openrouter = createOpenRouter({
  apiKey,
  headers: { "HTTP-Referer": "https://github.com/cheapcode", "X-Title": "cheapcode-experiment-1-attempt-3" },
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

const extractCost = (usage: any): number => Number(usage?.raw?.cost ?? 0)

async function runBaseline(task: Task): Promise<Run> {
  const t0 = performance.now()
  const result = await generateText({ model: openrouter(BASELINE_MODEL), prompt: task.prompt })
  const latency_ms = performance.now() - t0
  return {
    task_id: task.id,
    shape: task.shape,
    arm: "baseline",
    text: result.text.trim(),
    correct: scoreResponse(task, result.text),
    cost_usd: extractCost(result.usage),
    latency_ms,
  }
}

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
      "Decompose this AIME math problem into 2-5 numbered execution steps. Output ONLY the numbered list. Each step should be a sub-problem that contributes to the final answer:\n\n" +
      task.prompt,
  })
  totalCost += extractCost(plan.usage)
  const steps = plan.text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(\d+[.)]|[-*])\s+/.test(l))
    .map((l) => l.replace(/^(\d+[.)]|[-*])\s+/, ""))

  // 2. Parallel leaves at cheap-tier (with full task context)
  const leafResults = await Promise.all(
    steps.map((step) =>
      generateText({
        model: cheap,
        prompt: `Original AIME problem:\n${task.prompt}\n\nExecute this sub-step concisely, showing arithmetic / reasoning:\n${step}`,
      }).then((r) => {
        totalCost += extractCost(r.usage)
        return r.text.trim()
      }),
    ),
  )

  // 3. Best-of-K=3 synthesis at smart
  const synthPrompt = `Given the AIME problem and per-step results, give the FINAL ANSWER. Show concise reasoning, then on a final line output exactly: 'Answer: <integer>'.

Problem:
${task.prompt}

Steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Per-step results:
${leafResults.map((r, i) => `Step ${i + 1}: ${r}`).join("\n")}

Final synthesis:`

  const syntheses = await Promise.all(
    Array.from({ length: 3 }).map(() =>
      generateText({ model: smart, prompt: synthPrompt }).then((r) => {
        totalCost += extractCost(r.usage)
        return r.text.trim()
      }),
    ),
  )

  // Pick by majority-vote on extracted answer (atom 0010 cross-witness:
  // multiple syntheses agreeing is stronger signal than longest-output)
  const answers = syntheses.map((s) => {
    const m = s.match(/answer\s*[:=]\s*(\d+)/i)
    return m ? m[1] : null
  })
  const counts = new Map<string, number>()
  for (const a of answers) {
    if (a !== null) counts.set(a, (counts.get(a) ?? 0) + 1)
  }
  let bestAnswer: string | null = null
  let bestCount = 0
  for (const [a, c] of counts.entries()) {
    if (c > bestCount) {
      bestCount = c
      bestAnswer = a
    }
  }
  // Pick synthesis that contains the majority answer; fallback to longest
  let candidateIdx = 0
  if (bestAnswer !== null) {
    candidateIdx = answers.findIndex((a) => a === bestAnswer)
    if (candidateIdx < 0) candidateIdx = 0
  } else {
    let bestLen = 0
    for (let i = 0; i < syntheses.length; i++) {
      if ((syntheses[i] ?? "").length > bestLen) {
        bestLen = syntheses[i].length
        candidateIdx = i
      }
    }
  }
  let candidate = syntheses[candidateIdx]

  // 4. Cross-model verifier
  const verifyPrompt = `You are a strict math-problem verifier. Given an AIME problem and a candidate answer, decide if the candidate's final integer answer is correct. Output exactly:
PASS — if the final integer is correct
FAIL: <one-sentence reason> — if the final integer is wrong

Problem:
${task.prompt}

Candidate answer:
${candidate}

Verdict:`

  const verifyResult = await generateText({ model: verifier, prompt: verifyPrompt })
  totalCost += extractCost(verifyResult.usage)
  const verdict = verifyResult.text.trim()
  let passed = /^PASS\b/i.test(verdict)
  let retried = false

  // 5. Retry-with-feedback if FAIL
  if (!passed) {
    const feedback = verdict.replace(/^FAIL[:\s-]*/i, "")
    const retryPrompt = `${synthPrompt}

Previous answer was rejected: ${feedback}

Provide an improved final answer (still ending with 'Answer: <integer>'):`
    const retryResult = await generateText({ model: smart, prompt: retryPrompt })
    totalCost += extractCost(retryResult.usage)
    candidate = retryResult.text.trim()
    retried = true
  }

  const latency_ms = performance.now() - t0
  return {
    task_id: task.id,
    shape: task.shape,
    arm: "wrapper",
    text: candidate,
    correct: scoreResponse(task, candidate),
    cost_usd: totalCost,
    latency_ms,
    trace: {
      plan_steps: steps.length,
      leaf_count: leafResults.length,
      k_samples: syntheses.length,
      majority_answer: bestAnswer,
      majority_count: bestCount,
      verifier_passed: passed,
      retried,
    },
  }
}

const RESULTS_PATH = `${ATTEMPT_DIR}/results.jsonl`
writeFileSync(RESULTS_PATH, "")

console.log(`EXPERIMENT-1 Arm A attempt-3 — N=${TASKS.length} AIME 2024 problems`)
console.log(`Baseline: ${BASELINE_MODEL}`)
console.log(`Wrapper:  smart=${CHEAPCODE_TIERS.smart.target} cheap=${CHEAPCODE_TIERS.cheap.target} verifier=anthropic/claude-haiku-4.5 (majority-vote on K=3)`)
console.log()

const allRuns: Run[] = []

for (const task of TASKS) {
  console.log(`→ ${task.id} [${task.shape}] gold=${task.gold}`)
  try {
    const b = await runBaseline(task)
    appendFileSync(RESULTS_PATH, JSON.stringify(b) + "\n")
    allRuns.push(b)
    const tail = b.text.slice(-100).replace(/\n/g, " ⏎ ")
    console.log(`   baseline: ${b.correct ? "✓" : "✗"} ${b.latency_ms.toFixed(0)}ms $${b.cost_usd.toFixed(4)} → …${tail}`)
  } catch (e: any) {
    console.error(`   baseline ERROR: ${e.message}`)
  }
  try {
    const w = await runWrapperInstrumented(task)
    appendFileSync(RESULTS_PATH, JSON.stringify(w) + "\n")
    allRuns.push(w)
    const tail = w.text.slice(-100).replace(/\n/g, " ⏎ ")
    console.log(`   wrapper:  ${w.correct ? "✓" : "✗"} ${w.latency_ms.toFixed(0)}ms $${w.cost_usd.toFixed(4)} (maj=${(w.trace as any)?.majority_answer ?? "?"}) → …${tail}`)
  } catch (e: any) {
    console.error(`   wrapper ERROR: ${e.message}`)
  }
}

const baseline = allRuns.filter((r) => r.arm === "baseline")
const wrapper = allRuns.filter((r) => r.arm === "wrapper")
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}
const completionRate = (rs: Run[]) => rs.filter((r) => r.correct).length / Math.max(rs.length, 1)

const baselineCost = sum(baseline.map((r) => r.cost_usd))
const wrapperCost = sum(wrapper.map((r) => r.cost_usd))
const baselineP50 = median(baseline.map((r) => r.latency_ms))
const wrapperP50 = median(wrapper.map((r) => r.latency_ms))
const baselineCompletion = completionRate(baseline)
const wrapperCompletion = completionRate(wrapper)

const costRatio = baselineCost > 0 ? wrapperCost / baselineCost : Infinity
const latencyRatio = baselineP50 > 0 ? wrapperP50 / baselineP50 : Infinity
const completionRatio = baselineCompletion > 0 ? wrapperCompletion / baselineCompletion : Infinity
const completionDeltaPP = (wrapperCompletion - baselineCompletion) * 100

const COST_TARGET = 0.30
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
  attempt: "experiment-1-attempt-3-aime",
  date: new Date().toISOString(),
  N: TASKS.length,
  benchmark: "AIME 2024 (subset of 10; from huggingface.co/datasets/Maxwell-Jia/AIME_2024)",
  baseline_model: BASELINE_MODEL,
  wrapper: {
    smart: CHEAPCODE_TIERS.smart.target,
    cheap: CHEAPCODE_TIERS.cheap.target,
    verifier: "anthropic/claude-haiku-4.5",
    k: 3,
    selection: "majority-vote-then-longest-fallback",
    maxRetries: 1,
  },
  cost: { baseline_usd: baselineCost, wrapper_usd: wrapperCost, ratio: costRatio, target: COST_TARGET, pass: costPass },
  latency: { baseline_p50_ms: baselineP50, wrapper_p50_ms: wrapperP50, ratio: latencyRatio, target: LATENCY_TARGET, pass: latencyPass },
  completion: {
    baseline_rate: baselineCompletion,
    wrapper_rate: wrapperCompletion,
    ratio: completionRatio,
    delta_pp: completionDeltaPP,
    target_ratio: COMPLETION_TARGET,
    pass_ratio: completionPass,
  },
  axes_passing: axesPass,
  outcome,
}

writeFileSync(`${ATTEMPT_DIR}/3-axis-comparison.json`, JSON.stringify(summary, null, 2))

console.log()
console.log("===========================================")
console.log("3-AXIS RESULTS (AIME 2024 N=10)")
console.log("===========================================")
console.log(`Cost      : $${wrapperCost.toFixed(4)} / $${baselineCost.toFixed(4)} = ${costRatio.toFixed(3)}× (target ≤${COST_TARGET}) ${costPass ? "✓" : "✗"}`)
console.log(`Latency   : ${wrapperP50.toFixed(0)}ms / ${baselineP50.toFixed(0)}ms = ${latencyRatio.toFixed(3)}× (target ≤${LATENCY_TARGET}) ${latencyPass ? "✓" : "✗"}`)
console.log(`Completion: wrapper ${(wrapperCompletion * 100).toFixed(0)}% / baseline ${(baselineCompletion * 100).toFixed(0)}% = ${completionRatio.toFixed(3)}× (delta ${completionDeltaPP > 0 ? "+" : ""}${completionDeltaPP.toFixed(0)}pp; target ≥${COMPLETION_TARGET}) ${completionPass ? "✓" : "✗"}`)
console.log()
console.log(`OUTCOME: ${outcome} (${axesPass}/3 axes)`)
