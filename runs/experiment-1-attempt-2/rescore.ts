/**
 * Re-score attempt-2 runs with Unicode-normalization fix.
 *
 * Atom 0009 firing: original scoring used ASCII-only minus matching;
 * gpt-5-mini wrapper output used Unicode minus (U+2212). This tightens
 * the normalization to map Unicode dashes (− – —) to ASCII hyphen.
 *
 * h01-compound-percent: wrapper actually answered "−0.6%" (correct;
 * matches alternate "-0.6%" once normalized). Original scoring marked
 * incorrect — author error, not model error.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { TASKS, type Task } from "./benchmark-hard"

interface Run {
  task_id: string
  shape: string
  arm: "baseline" | "wrapper"
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
}

function scoreResponseFixed(task: Task, response: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      // Unicode dashes / minus → ASCII hyphen
      .replace(/[‐-―−­]/g, "-")
      .replace(/[.,!?;:'"`]/g, "")
      .replace(/\s+/g, " ")
      .trim()

  const candidates = [task.gold, ...(task.alternates ?? [])]
  const respNorm = norm(response)
  return candidates.some((c) => respNorm.includes(norm(c)))
}

const lines = readFileSync("runs/experiment-1-attempt-2/results.jsonl", "utf-8")
  .trim()
  .split("\n")
  .filter(Boolean)

const taskById = new Map<string, Task>(TASKS.map((t) => [t.id, t]))
const rescored: Run[] = []
for (const line of lines) {
  const r: Run = JSON.parse(line)
  const t = taskById.get(r.task_id)
  if (!t) continue
  const correct = scoreResponseFixed(t, r.text)
  rescored.push({ ...r, correct })
}

const baseline = rescored.filter((r) => r.arm === "baseline")
const wrapper = rescored.filter((r) => r.arm === "wrapper")

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

const costRatio = wrapperCost / baselineCost
const latencyRatio = wrapperP50 / baselineP50
const completionRatio = wrapperCompletion / baselineCompletion
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
  attempt: "experiment-1-attempt-2-rescored",
  date: new Date().toISOString(),
  N: TASKS.length,
  scoring_correction:
    "Unicode dash/minus characters (−–—\\u00ad) normalized to ASCII hyphen. h01-compound-percent wrapper answered correctly (−0.6%) but original ASCII-only matcher marked it wrong.",
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
  per_task: rescored.map((r) => ({
    task: r.task_id,
    arm: r.arm,
    correct: r.correct,
    text: r.text.slice(0, 100),
  })),
}

writeFileSync("runs/experiment-1-attempt-2/3-axis-comparison-rescored.json", JSON.stringify(summary, null, 2))

console.log(`Cost      : $${wrapperCost.toFixed(4)} / $${baselineCost.toFixed(4)} = ${costRatio.toFixed(3)}× (target ≤${COST_TARGET}) ${costPass ? "✓" : "✗"}`)
console.log(`Latency   : ${wrapperP50.toFixed(0)}ms / ${baselineP50.toFixed(0)}ms = ${latencyRatio.toFixed(3)}× (target ≤${LATENCY_TARGET}) ${latencyPass ? "✓" : "✗"}`)
console.log(`Completion: ${(wrapperCompletion * 100).toFixed(0)}% / ${(baselineCompletion * 100).toFixed(0)}% = ${completionRatio.toFixed(3)}× (delta ${completionDeltaPP > 0 ? "+" : ""}${completionDeltaPP.toFixed(0)}pp) ${completionPass ? "✓" : "✗"}`)
console.log(`OUTCOME: ${outcome} (${axesPass}/3 axes)`)
