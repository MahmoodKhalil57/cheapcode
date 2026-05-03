/**
 * EXPERIMENT-2 (M3.19) runner — exercises cross-witness voter on
 * mixed N=5 benchmark (3 hard AIME + 2 known-impossible).
 *
 * Key claims tested:
 *   A. cross_witness_convergence_predicts_correctness on POSITIVE answers
 *   B. cross_witness_convergence_predicts_correctness on NEGATION
 *   C. voter_cost_ratio_at_most_0_20x_compound (vs M3.10 wrapper)
 *   D. voter_latency_ratio_at_most_0_30x_compound
 *
 * Per atom 0010: convergence on NEGATION potentially stronger than
 * on positive. This run produces direct paired evidence for that claim.
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { runCrossWitnessVoter } from "../../src/cross-witness-voter"
import { CHEAPCODE_TIERS } from "../../src/cheapcode-tiers"
import { TASKS, scoreResponse, type Task } from "./benchmark-mixed"
import { writeFileSync, appendFileSync, mkdirSync } from "node:fs"
import { generateText } from "ai"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const ATTEMPT_DIR = "runs/experiment-2-voter-probe"
mkdirSync(ATTEMPT_DIR, { recursive: true })

const openrouter = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": "cheapcode-experiment-2-voter-probe",
  },
})

interface Run {
  task_id: string
  shape: string
  expects_negation: boolean
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
  convergence: "sahih" | "hasan" | "daif" | "none"
  agreed_answer: string | null
  escalated: boolean
  witnesses: { source: string; answer: string | null }[]
}

const RESULTS_PATH = `${ATTEMPT_DIR}/results.jsonl`
writeFileSync(RESULTS_PATH, "")

const cheap = openrouter(CHEAPCODE_TIERS.cheap.target) // deepseek-v4-flash
const smart = openrouter(CHEAPCODE_TIERS.smart.target) // gpt-5-mini

// Wrap models to track per-call cost — generateText returns usage.raw.cost
// inside the LanguageModelV3 response, but the voter doesn't expose it.
// Simplest: instrument by tracking total OpenRouter spend via a separate
// gauge. We just sum result.usage.raw.cost from each generateText call
// that the voter dispatches internally. Since the voter wraps generateText
// directly, we need to monkey-patch or use a wrapping model. Cleanest:
// re-implement voter inline here for cost tracking, mirroring run-experiment-3.ts.

let runningCost = 0
function instrumentedModel(real: any) {
  return {
    ...real,
    async doGenerate(opts: any) {
      const r = await real.doGenerate(opts)
      const cost = Number((r as any).usage?.raw?.cost ?? 0)
      runningCost += cost
      return r
    },
  }
}

const cheapInst = instrumentedModel(cheap)
const smartInst = instrumentedModel(smart)

console.log(`EXPERIMENT-2 voter probe — N=${TASKS.length} mixed (positive AIME + negative known-impossible)`)
console.log(`Voter: cheap=${CHEAPCODE_TIERS.cheap.target} smart=${CHEAPCODE_TIERS.smart.target}`)
console.log()

const allRuns: Run[] = []

for (const task of TASKS) {
  console.log(`→ ${task.id} [${task.shape}] expects_negation=${task.expects_negation} gold="${task.gold}"`)
  const costBefore = runningCost
  const t0 = performance.now()
  try {
    const result = await runCrossWitnessVoter(task.prompt, {
      cheap: cheapInst,
      smart: smartInst,
      perCallTimeoutMs: 120_000, // 2 min per call (deepseek can be slow on hard tasks)
    })
    const latency_ms = performance.now() - t0
    const cost_usd = runningCost - costBefore
    const correct = scoreResponse(task, result.text)
    const run: Run = {
      task_id: task.id,
      shape: task.shape,
      expects_negation: task.expects_negation,
      text: result.text,
      correct,
      cost_usd,
      latency_ms,
      convergence: result.trace.convergence,
      agreed_answer: result.trace.agreed_answer,
      escalated: result.trace.escalated,
      witnesses: result.trace.witnesses.map((w) => ({ source: w.source, answer: w.answer })),
    }
    appendFileSync(RESULTS_PATH, JSON.stringify(run) + "\n")
    allRuns.push(run)
    const tail = result.text.slice(-100).replace(/\n/g, " ⏎ ")
    console.log(
      `   ${correct ? "✓" : "✗"} ${latency_ms.toFixed(0)}ms $${cost_usd.toFixed(5)} ` +
        `convergence=${result.trace.convergence} escalated=${result.trace.escalated} agreed=${result.trace.agreed_answer ?? "null"}`,
    )
    console.log(`   text-tail: …${tail}`)
  } catch (e: any) {
    console.error(`   ERROR: ${e.message}`)
  }
}

// ============================================================
// Per-class analysis
// ============================================================

const positives = allRuns.filter((r) => !r.expects_negation)
const negatives = allRuns.filter((r) => r.expects_negation)

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

const positiveCorrect = positives.filter((r) => r.correct).length
const negativeCorrect = negatives.filter((r) => r.correct).length
const totalCorrect = positiveCorrect + negativeCorrect

const totalCost = sum(allRuns.map((r) => r.cost_usd))
const p50Latency = median(allRuns.map((r) => r.latency_ms))

const convergedCorrect = allRuns.filter((r) => r.convergence === "sahih" && r.correct).length
const convergedTotal = allRuns.filter((r) => r.convergence === "sahih").length
const convergencePrecision =
  convergedTotal > 0 ? convergedCorrect / convergedTotal : Number.NaN

const convergedNegationCorrect = negatives.filter((r) => r.convergence === "sahih" && r.correct).length
const convergedNegationTotal = negatives.filter((r) => r.convergence === "sahih").length
const negationConvergencePrecision =
  convergedNegationTotal > 0 ? convergedNegationCorrect / convergedNegationTotal : Number.NaN

const convergedPositiveCorrect = positives.filter((r) => r.convergence === "sahih" && r.correct).length
const convergedPositiveTotal = positives.filter((r) => r.convergence === "sahih").length
const positiveConvergencePrecision =
  convergedPositiveTotal > 0 ? convergedPositiveCorrect / convergedPositiveTotal : Number.NaN

const summary = {
  attempt: "experiment-2-voter-probe-m3-19",
  date: new Date().toISOString(),
  N: TASKS.length,
  N_positive: positives.length,
  N_negative: negatives.length,
  total_cost_usd: totalCost,
  p50_latency_ms: p50Latency,
  total_correct: totalCorrect,
  positive_correct: positiveCorrect,
  negative_correct: negativeCorrect,
  positive_correct_rate: positives.length > 0 ? positiveCorrect / positives.length : Number.NaN,
  negative_correct_rate: negatives.length > 0 ? negativeCorrect / negatives.length : Number.NaN,
  // Convergence-predicts-correctness rate
  sahih_convergence_count: convergedTotal,
  sahih_correctness_rate: convergencePrecision,
  // Per-class convergence precision (atom 0010 hypothesis test)
  sahih_on_positive_rate: positiveConvergencePrecision,
  sahih_on_negation_rate: negationConvergencePrecision,
  per_task: allRuns.map((r) => ({
    task: r.task_id,
    shape: r.shape,
    expects_negation: r.expects_negation,
    correct: r.correct,
    convergence: r.convergence,
    agreed_answer: r.agreed_answer,
    cost_usd: r.cost_usd,
    latency_ms: Math.round(r.latency_ms),
  })),
}

writeFileSync(`${ATTEMPT_DIR}/voter-probe-summary.json`, JSON.stringify(summary, null, 2))

console.log()
console.log("===========================================")
console.log("M3.19 voter probe — summary")
console.log("===========================================")
console.log(`Total: ${totalCorrect}/${TASKS.length} correct, $${totalCost.toFixed(4)} total, ${p50Latency.toFixed(0)}ms P50 latency`)
console.log(`  Positive (AIME):  ${positiveCorrect}/${positives.length}  (rate ${(summary.positive_correct_rate * 100).toFixed(0)}%)`)
console.log(`  Negative (no-sol): ${negativeCorrect}/${negatives.length}  (rate ${(summary.negative_correct_rate * 100).toFixed(0)}%)`)
console.log()
console.log(`Convergence-predicts-correctness:`)
console.log(`  All sahih: ${convergedCorrect}/${convergedTotal} correct = ${isFinite(convergencePrecision) ? (convergencePrecision * 100).toFixed(0) + "%" : "n/a (no sahih)"}`)
console.log(`  Sahih on positive: ${convergedPositiveCorrect}/${convergedPositiveTotal} correct = ${isFinite(positiveConvergencePrecision) ? (positiveConvergencePrecision * 100).toFixed(0) + "%" : "n/a"}`)
console.log(`  Sahih on negation: ${convergedNegationCorrect}/${convergedNegationTotal} correct = ${isFinite(negationConvergencePrecision) ? (negationConvergencePrecision * 100).toFixed(0) + "%" : "n/a"}`)
