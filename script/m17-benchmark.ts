#!/usr/bin/env bun
/**
 * m17-benchmark.ts — paired-benchmark harness (M17 Phase A.5).
 *
 * Runs each task in plan/tasks/m17-eval/ through TWO arms:
 *   - cheapcode: router-with-auto via dispatchWithPool
 *   - gpt55:     direct gpt-5.5 baseline
 *
 * Receipts written to plan/receipts/m17-paired-benchmark-<ISO>.json with
 * per-task metrics. Summary table to stdout.
 *
 * Per M17-DISPATCH-CONTRACT.md "Smarter/faster/cheaper measurement contract":
 * NO marketing claim of 'smarter/faster/cheaper' until cheapcode wins on
 * ≥7/10 tasks on the cheaper-OR-equal-OR-better axis. Atom 0007 anti-fab.
 *
 * Modes:
 *   --dry-run   — exercise harness without LLM calls; uses synthetic responses
 *                 so the pipeline can be tested without burning credits.
 *   --live      — call real LLMs (requires operator-supplied dispatch fns;
 *                 fail-loud if the dispatch fns aren't wired).
 *   --task=ID   — run only the matching task (e.g. --task=bc-1).
 *   --arm=cheapcode|gpt55  — run only one arm.
 *
 * Default: --dry-run (safe).
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, dirname } from "node:path"

interface Task {
  id: string
  shape: string
  prompt: string
  correctness_check: "automated" | "operator-graded"
  expected_keywords?: string[]
  forbidden_keywords?: string[]
  notes?: string
}

interface DispatchResult {
  output: string
  wall_clock_ms: number
  tokens_in: number
  tokens_out: number
  cost_usd_estimate: number
  model_used: string
  // for cheapcode arm: which credential was picked + which were cooled
  attribution?: { auth_key?: string; canonical_provider?: string; cooldown_skipped?: string[] }
  error?: string
}

interface Receipt {
  task_id: string
  shape: string
  arm: "cheapcode" | "gpt55"
  passed: boolean | "operator-graded"
  reason: string
  metrics: DispatchResult
}

const REPO = join(import.meta.dir, "..")
const TASK_DIR = join(REPO, "plan", "tasks", "m17-eval")
const RECEIPT_DIR = join(REPO, "plan", "receipts")

// ---- arg parsing -----------------------------------------------------

interface Args {
  dryRun: boolean
  live: boolean
  taskFilter?: string
  armFilter?: "cheapcode" | "gpt55"
}
function parseArgs(): Args {
  const args: Args = { dryRun: false, live: false }
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true
    else if (a === "--live") args.live = true
    else if (a.startsWith("--task=")) args.taskFilter = a.slice(7)
    else if (a === "--arm=cheapcode" || a === "--arm=gpt55") args.armFilter = a.slice(6) as "cheapcode" | "gpt55"
  }
  if (!args.dryRun && !args.live) args.dryRun = true // default safe
  return args
}

// ---- dispatch arms ---------------------------------------------------

async function dispatchCheapcode(task: Task, dryRun: boolean): Promise<DispatchResult> {
  if (dryRun) return synthDispatch(task, "cheapcode/auto")
  const { liveDispatchCheapcode } = await import("./m17-live-dispatch")
  return await liveDispatchCheapcode(task.prompt)
}

async function dispatchGpt55(task: Task, dryRun: boolean): Promise<DispatchResult> {
  if (dryRun) return synthDispatch(task, "gpt-5.5")
  const { liveDispatchGpt55 } = await import("./m17-live-dispatch")
  return await liveDispatchGpt55(task.prompt)
}

// Synthetic dispatch: deterministic fake response so the harness can be
// validated without LLM calls. Includes expected_keywords with 70%
// probability per task-id-hash so the pass/fail logic gets exercised.
function synthDispatch(task: Task, model: string): DispatchResult {
  const start = performance.now()
  const seed = task.id.charCodeAt(0) + task.id.charCodeAt(task.id.length - 1) + model.charCodeAt(0)
  const includeAll = seed % 10 < 7 // ~70% pass rate in dry-run
  const kws = task.expected_keywords ?? []
  const padding = "synthetic dry-run response. " + (task.notes ?? "")
  const output = includeAll
    ? padding + " " + kws.join(" ") + " — answer body."
    : padding + " — answer body without all required keywords."
  const wall = (performance.now() - start) + (model === "cheapcode/auto" ? 50 : 80)
  return {
    output,
    wall_clock_ms: Math.round(wall),
    tokens_in: task.prompt.length / 4,
    tokens_out: output.length / 4,
    cost_usd_estimate: model === "cheapcode/auto" ? 0.0008 : 0.0015,
    model_used: model,
    attribution:
      model === "cheapcode/auto"
        ? { auth_key: "openai", canonical_provider: "openai", cooldown_skipped: [] }
        : undefined,
  }
}

// ---- correctness check -----------------------------------------------

function check(task: Task, result: DispatchResult): { passed: boolean | "operator-graded"; reason: string } {
  if (result.error) return { passed: false, reason: `dispatch error: ${result.error}` }
  if (task.correctness_check === "operator-graded") {
    return { passed: "operator-graded", reason: "requires manual review" }
  }
  const out = result.output.toLowerCase()
  for (const fb of task.forbidden_keywords ?? []) {
    if (out.includes(fb.toLowerCase())) return { passed: false, reason: `forbidden keyword present: "${fb}"` }
  }
  for (const kw of task.expected_keywords ?? []) {
    if (!out.includes(kw.toLowerCase())) return { passed: false, reason: `missing expected keyword: "${kw}"` }
  }
  return { passed: true, reason: "all keyword checks passed" }
}

// ---- main ------------------------------------------------------------

async function loadTasks(filter?: string): Promise<Task[]> {
  const files = (await readdir(TASK_DIR)).filter((f) => f.endsWith(".json"))
  const tasks: Task[] = []
  for (const f of files) {
    const t = JSON.parse(await readFile(join(TASK_DIR, f), "utf8")) as Task
    if (filter && t.id !== filter) continue
    tasks.push(t)
  }
  tasks.sort((a, b) => a.id.localeCompare(b.id))
  return tasks
}

async function main() {
  const args = parseArgs()
  const tasks = await loadTasks(args.taskFilter)
  if (tasks.length === 0) {
    console.error(`no tasks loaded${args.taskFilter ? ` matching "${args.taskFilter}"` : ""}`)
    process.exit(2)
  }
  console.error(`m17-benchmark: ${tasks.length} task(s), mode=${args.dryRun ? "dry-run" : "live"}${args.armFilter ? `, arm=${args.armFilter}` : ""}`)

  const receipts: Receipt[] = []
  for (const task of tasks) {
    for (const arm of (args.armFilter ? [args.armFilter] : ["cheapcode", "gpt55"]) as ("cheapcode" | "gpt55")[]) {
      const dispatch = arm === "cheapcode" ? dispatchCheapcode : dispatchGpt55
      let metrics: DispatchResult
      try {
        metrics = await dispatch(task, args.dryRun)
      } catch (err) {
        metrics = {
          output: "",
          wall_clock_ms: 0,
          tokens_in: 0,
          tokens_out: 0,
          cost_usd_estimate: 0,
          model_used: arm,
          error: (err as Error).message,
        }
      }
      const { passed, reason } = check(task, metrics)
      receipts.push({ task_id: task.id, shape: task.shape, arm, passed, reason, metrics })
      const passLabel = passed === true ? "PASS" : passed === false ? "FAIL" : "GRADE"
      console.error(
        `  ${task.id.padEnd(6)} ${arm.padEnd(10)} ${passLabel.padEnd(5)} ${metrics.wall_clock_ms}ms $${metrics.cost_usd_estimate.toFixed(4)}`,
      )
    }
  }

  // ---- summary table ----
  const byArm = (a: "cheapcode" | "gpt55") => receipts.filter((r) => r.arm === a)
  const cheapPasses = byArm("cheapcode").filter((r) => r.passed === true).length
  const gptPasses = byArm("gpt55").filter((r) => r.passed === true).length
  const cheapTotal = byArm("cheapcode").length
  const gptTotal = byArm("gpt55").length
  const cheapMs = sumBy(byArm("cheapcode"), (r) => r.metrics.wall_clock_ms)
  const gptMs = sumBy(byArm("gpt55"), (r) => r.metrics.wall_clock_ms)
  const cheapUsd = sumBy(byArm("cheapcode"), (r) => r.metrics.cost_usd_estimate)
  const gptUsd = sumBy(byArm("gpt55"), (r) => r.metrics.cost_usd_estimate)
  const winsBetterOrEqual = countWins(receipts)

  console.log("")
  console.log("=== M17 paired-benchmark summary ===")
  console.log(`tasks: ${cheapTotal} cheapcode arm, ${gptTotal} gpt55 arm`)
  console.log(`automated pass rate: cheapcode ${cheapPasses}/${cheapTotal} | gpt55 ${gptPasses}/${gptTotal}`)
  console.log(`total wall-clock:    cheapcode ${cheapMs}ms | gpt55 ${gptMs}ms`)
  console.log(`total cost estimate: cheapcode $${cheapUsd.toFixed(4)} | gpt55 $${gptUsd.toFixed(4)}`)
  console.log(`headline gate (cheapcode ≥ gpt55 cheaper-OR-equal-OR-better): ${winsBetterOrEqual}/${cheapTotal}`)
  if (winsBetterOrEqual >= 7) {
    console.log("→ headline-claim threshold MET (≥7/10). Atom 0007: still requires operator confirmation before external publishing.")
  } else {
    console.log(`→ headline-claim threshold NOT met (need ≥7/10, got ${winsBetterOrEqual}/${cheapTotal}). NO 'smarter/faster/cheaper' claim.`)
  }

  // ---- write receipt ----
  await mkdir(RECEIPT_DIR, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, "-")
  const path = join(RECEIPT_DIR, `m17-paired-benchmark-${ts}.json`)
  await writeFile(
    path,
    JSON.stringify(
      {
        version: 1,
        generated_at: new Date().toISOString(),
        mode: args.dryRun ? "dry-run" : "live",
        cheapcode_pass_rate: `${cheapPasses}/${cheapTotal}`,
        gpt55_pass_rate: `${gptPasses}/${gptTotal}`,
        wall_clock_ms_total: { cheapcode: cheapMs, gpt55: gptMs },
        cost_usd_total: { cheapcode: cheapUsd, gpt55: gptUsd },
        headline_threshold: { numerator: winsBetterOrEqual, denominator: cheapTotal, met: winsBetterOrEqual >= 7 },
        receipts,
      },
      null,
      2,
    ),
  )
  console.log(`receipt: ${path}`)
}

function sumBy<T>(arr: T[], fn: (x: T) => number): number {
  let s = 0
  for (const x of arr) s += fn(x)
  return Math.round(s * 10000) / 10000
}

// "Win" = cheapcode is at least as cheap AND at least as accurate as gpt55 on
// the same task. "operator-graded" tasks are excluded from auto-tally.
function countWins(receipts: Receipt[]): number {
  const byTask = new Map<string, { cheap?: Receipt; gpt?: Receipt }>()
  for (const r of receipts) {
    const slot = byTask.get(r.task_id) ?? {}
    if (r.arm === "cheapcode") slot.cheap = r
    else slot.gpt = r
    byTask.set(r.task_id, slot)
  }
  let wins = 0
  for (const { cheap, gpt } of byTask.values()) {
    if (!cheap || !gpt) continue
    if (cheap.passed === "operator-graded" || gpt.passed === "operator-graded") continue
    const accuracyOk = cheap.passed === true && (gpt.passed === false || gpt.passed === true)
    const cheaperOrEqual = cheap.metrics.cost_usd_estimate <= gpt.metrics.cost_usd_estimate * 1.05
    // win if cheapcode passed AND cost <= 1.05× gpt55. Strict gpt55-fail-cheap-pass is also a win.
    if (cheap.passed === true && (gpt.passed === false || cheaperOrEqual)) wins++
  }
  return wins
}

await main()
