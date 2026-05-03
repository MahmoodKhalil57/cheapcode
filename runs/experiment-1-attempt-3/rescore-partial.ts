/**
 * Score the partial AIME experiment-3 data (N=3 complete pairs + 1
 * baseline-only) and write a partial verdict. The experiment was
 * killed at task 4 wrapper after the bun process hung for 50+ min.
 *
 * Per M3.12 reframe: this experiment is supplementary (not load-bearing
 * for v1.0 ship). The data feeds facts/09 routing rule 7
 * (multistep-general → strongest frontier, no compound default).
 */

import { readFileSync, writeFileSync } from "node:fs"
import { TASKS, scoreResponse, type Task } from "./benchmark-aime"

interface Run {
  task_id: string
  shape: string
  arm: "baseline" | "wrapper"
  text: string
  correct: boolean
  cost_usd: number
  latency_ms: number
}

const lines = readFileSync("runs/experiment-1-attempt-3/results.jsonl", "utf-8")
  .trim()
  .split("\n")
  .filter(Boolean)

const taskById = new Map<string, Task>(TASKS.map((t) => [t.id, t]))
const rescored: Run[] = []
for (const line of lines) {
  const r: Run = JSON.parse(line)
  const t = taskById.get(r.task_id)
  if (!t) continue
  const correct = scoreResponse(t, r.text)
  rescored.push({ ...r, correct })
}

const baseline = rescored.filter((r) => r.arm === "baseline")
const wrapper = rescored.filter((r) => r.arm === "wrapper")

// Pair-up: only score axes on tasks where BOTH arms completed
const wrapperTasks = new Set(wrapper.map((r) => r.task_id))
const baselinePaired = baseline.filter((r) => wrapperTasks.has(r.task_id))
const wrapperPaired = wrapper

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}
const completionRate = (rs: Run[]) => rs.filter((r) => r.correct).length / Math.max(rs.length, 1)

const baselineCost = sum(baselinePaired.map((r) => r.cost_usd))
const wrapperCost = sum(wrapperPaired.map((r) => r.cost_usd))
const baselineP50 = median(baselinePaired.map((r) => r.latency_ms))
const wrapperP50 = median(wrapperPaired.map((r) => r.latency_ms))
const baselineCompletion = completionRate(baselinePaired)
const wrapperCompletion = completionRate(wrapperPaired)

const orphanBaselines = baseline.filter((r) => !wrapperTasks.has(r.task_id))

const summary = {
  attempt: "experiment-1-attempt-3-aime-partial",
  date: new Date().toISOString(),
  status: "killed-at-task-4-wrapper-hang",
  N_complete_pairs: wrapperPaired.length,
  N_orphan_baselines: orphanBaselines.length,
  paired_axes: {
    cost: { baseline_usd: baselineCost, wrapper_usd: wrapperCost, ratio: wrapperCost / baselineCost },
    latency: { baseline_p50_ms: baselineP50, wrapper_p50_ms: wrapperP50, ratio: wrapperP50 / baselineP50 },
    completion: { baseline_rate: baselineCompletion, wrapper_rate: wrapperCompletion, delta_pp: (wrapperCompletion - baselineCompletion) * 100 },
  },
  orphan_baselines: orphanBaselines.map((r) => ({ task: r.task_id, correct: r.correct, cost_usd: r.cost_usd })),
  per_task: rescored.map((r) => ({
    task: r.task_id,
    arm: r.arm,
    correct: r.correct,
    text_tail: r.text.slice(-100),
    cost_usd: r.cost_usd,
    latency_ms: Math.round(r.latency_ms),
  })),
}

writeFileSync("runs/experiment-1-attempt-3/3-axis-comparison-partial.json", JSON.stringify(summary, null, 2))

console.log(`PARTIAL N=${wrapperPaired.length} complete pairs (+ ${orphanBaselines.length} orphan baseline)`)
console.log(`Cost      : $${wrapperCost.toFixed(4)} / $${baselineCost.toFixed(4)} = ${(wrapperCost / baselineCost).toFixed(3)}× (target ≤0.30)`)
console.log(`Latency   : ${wrapperP50.toFixed(0)}ms / ${baselineP50.toFixed(0)}ms = ${(wrapperP50 / baselineP50).toFixed(3)}× (target ≤0.70)`)
console.log(`Completion: wrapper ${(wrapperCompletion * 100).toFixed(0)}% / baseline ${(baselineCompletion * 100).toFixed(0)}% = ${(wrapperCompletion / baselineCompletion || 0).toFixed(3)}× (target ≥1.10)`)
console.log()
console.log(`Orphan baselines (wrapper hung before running):`)
for (const b of orphanBaselines) {
  console.log(`  ${b.task}: ${b.correct ? "✓" : "✗"} $${b.cost_usd.toFixed(4)}`)
}
