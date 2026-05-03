#!/usr/bin/env bun
/**
 * tools/conversion-factors.ts — living, multi-dimensional estimator for
 * atom 0018's conversion-factor table (M3.34). Replaces the static
 * markdown table in cheapcode/CLAUDE.md with an append-only JSONL log +
 * robust descriptive statistics that converge on true values as
 * observations accumulate.
 *
 * Statistical lineage (per aapi/bubExplains/Statistics.md):
 * - Median + IQR over JSONL = same descriptive statistics Florence
 *   Nightingale 1854 used; robust to outliers (Statistics.md notes one
 *   billionaire shifts the mean dramatically; median is robust).
 * - Bernoulli's law of large numbers (1713) — sample-statistic
 *   converges on true population value as N grows.
 * - 2× drift detection — non-parametric equivalent of >2σ "rare"
 *   threshold; when 3+ recent observations are ≥2× cached median,
 *   atom 0015 fires (transfer-overstated on cost estimation).
 *
 * MULTI-DIMENSIONAL (operator M3.34): observations carry agent_id and
 * scope_tags. Estimates filter by (agent_id × scope_tags × category).
 * Optional broaden_on_no_data falls back to less-specific filters with a
 * `broadened_to` breadcrumb so the agent knows it's reading a less-
 * specific estimate.
 *
 * AGENT-INTUITIVE (operator M3.34): defaults to CHEAPCODE_AGENT_ID env
 * var or the constant DEFAULT_AGENT_ID. CLI subcommands list / record /
 * estimate are self-documenting and one-liner. Programmatic API takes
 * options-objects so call sites stay minimal.
 *
 * API:
 *   recordObservation({ category, time_ms, cost_usd, agent_id?, scope_tags?, metadata? }, logPath?)
 *   getEstimate(category, { agent_id?, scope_tags?, broaden_on_no_data?, logPath? } = {}) → Estimate
 *   getAllEstimates({ agent_id?, scope_tags?, broaden_on_no_data?, logPath? } = {}) → Record<Category, Estimate>
 *   quickEstimate(category) → Estimate  // agent-friendly one-liner with all defaults
 *
 * CLI:
 *   bun tools/conversion-factors.ts list
 *   bun tools/conversion-factors.ts list --agent gpt-5 --scope aime-math,geometry
 *   bun tools/conversion-factors.ts estimate research-query
 *   bun tools/conversion-factors.ts record small-experiment 5400000 0.13 --scope aime-math
 *   bun tools/conversion-factors.ts help
 */

import { appendFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const PROJECT_ROOT = resolve(import.meta.dir, "..")
const DEFAULT_LOG_PATH = resolve(PROJECT_ROOT, "runs/conversion-factors.jsonl")

/** Default agent id when none is provided. Override via env CHEAPCODE_AGENT_ID. */
export const DEFAULT_AGENT_ID = "claude-opus-4.7"

export const KNOWN_CATEGORIES = [
  "research-query",
  "small-experiment",
  "substrate-primitive-add",
  "large-dogfood",
] as const

export type Category = (typeof KNOWN_CATEGORIES)[number]

export interface Observation {
  timestamp_iso: string
  category: Category
  time_ms: number
  cost_usd: number
  agent_id?: string
  scope_tags?: string[]
  metadata?: Record<string, unknown>
}

export interface RecordInput {
  category: Category
  time_ms: number
  cost_usd: number
  agent_id?: string
  scope_tags?: string[]
  metadata?: Record<string, unknown>
}

export interface FilterOptions {
  agent_id?: string
  scope_tags?: string[]
  /** When true and the (agent×scope×category) filter has 0 observations,
   * progressively drop dimensions and retry; set broadened_to to record
   * which dimensions were dropped to find data. */
  broaden_on_no_data?: boolean
  logPath?: string
}

export interface Estimate {
  category: Category
  sample_size: number
  /** Always present: true when sample_size === 0. */
  no_data: boolean
  /** Always present: true when 0 < sample_size < 3 (atom 0011 honest small-N). */
  insufficient_data: boolean
  /** Always present: true when 3+ recent observations are ≥2× cached median. */
  drift_flagged: boolean
  /** Filter that produced this estimate. */
  filter: { agent_id?: string; scope_tags?: string[] }
  /** Set when broaden_on_no_data caused dimension(s) to be dropped. */
  broadened_to?: { from: FilterOptions; to: FilterOptions }
  median_time_ms: number | null
  p25_time_ms: number | null
  p75_time_ms: number | null
  median_cost_usd: number | null
  p25_cost_usd: number | null
  p75_cost_usd: number | null
  most_recent_iso: string | null
}

const RECENT_WINDOW = 3
const DRIFT_FACTOR = 2

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return NaN
  if (sortedAsc.length === 1) return sortedAsc[0]!
  const idx = q * (sortedAsc.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sortedAsc[lo]!
  const frac = idx - lo
  return sortedAsc[lo]! * (1 - frac) + sortedAsc[hi]! * frac
}

async function readObservations(logPath: string): Promise<Observation[]> {
  if (!existsSync(logPath)) return []
  let raw: string
  try {
    raw = await readFile(logPath, "utf-8")
  } catch {
    return []
  }
  const out: Observation[] = []
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof parsed.category === "string" &&
        typeof parsed.time_ms === "number" &&
        typeof parsed.cost_usd === "number" &&
        typeof parsed.timestamp_iso === "string"
      ) {
        out.push(parsed as Observation)
      }
    } catch {
      // Skip malformed lines per atom 0007.
    }
  }
  return out
}

function matchesFilter(obs: Observation, agent_id?: string, scope_tags?: string[]): boolean {
  if (agent_id !== undefined && obs.agent_id !== agent_id) return false
  if (scope_tags !== undefined && scope_tags.length > 0) {
    const obsTags = obs.scope_tags ?? []
    for (const requested of scope_tags) {
      if (!obsTags.includes(requested)) return false
    }
  }
  return true
}

export async function recordObservation(
  input: RecordInput,
  logPath: string = DEFAULT_LOG_PATH,
): Promise<Observation> {
  const obs: Observation = {
    timestamp_iso: new Date().toISOString(),
    category: input.category,
    time_ms: input.time_ms,
    cost_usd: input.cost_usd,
    ...(input.agent_id !== undefined ? { agent_id: input.agent_id } : {}),
    ...(input.scope_tags !== undefined ? { scope_tags: input.scope_tags } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
  }
  await appendFile(logPath, JSON.stringify(obs) + "\n", "utf-8")
  return obs
}

function computeEstimate(
  category: Category,
  obs: Observation[],
  filter: { agent_id?: string; scope_tags?: string[] },
): Estimate {
  const filtered = obs.filter(
    (o) => o.category === category && matchesFilter(o, filter.agent_id, filter.scope_tags),
  )
  const n = filtered.length
  const baseFilter = {
    ...(filter.agent_id !== undefined ? { agent_id: filter.agent_id } : {}),
    ...(filter.scope_tags !== undefined ? { scope_tags: filter.scope_tags } : {}),
  }

  if (n === 0) {
    return {
      category,
      sample_size: 0,
      no_data: true,
      insufficient_data: false,
      drift_flagged: false,
      filter: baseFilter,
      median_time_ms: null,
      p25_time_ms: null,
      p75_time_ms: null,
      median_cost_usd: null,
      p25_cost_usd: null,
      p75_cost_usd: null,
      most_recent_iso: null,
    }
  }

  const mostRecentIso = filtered.reduce<string>(
    (acc, o) => (o.timestamp_iso > acc ? o.timestamp_iso : acc),
    filtered[0]!.timestamp_iso,
  )

  if (n < 3) {
    return {
      category,
      sample_size: n,
      no_data: false,
      insufficient_data: true,
      drift_flagged: false,
      filter: baseFilter,
      median_time_ms: null,
      p25_time_ms: null,
      p75_time_ms: null,
      median_cost_usd: null,
      p25_cost_usd: null,
      p75_cost_usd: null,
      most_recent_iso: mostRecentIso,
    }
  }

  const times = filtered.map((o) => o.time_ms).sort((a, b) => a - b)
  const costs = filtered.map((o) => o.cost_usd).sort((a, b) => a - b)
  const medianTime = quantile(times, 0.5)
  const p25Time = quantile(times, 0.25)
  const p75Time = quantile(times, 0.75)
  const medianCost = quantile(costs, 0.5)
  const p25Cost = quantile(costs, 0.25)
  const p75Cost = quantile(costs, 0.75)

  // Drift detection — recent N observations all ≥ DRIFT_FACTOR× baseline
  // median (or ≤ 1/DRIFT_FACTOR×). Baseline EXCLUDES the recent window so
  // the drift doesn't pull the baseline up with it (otherwise drift always
  // shifts median, making detection self-defeating).
  const recent = filtered.slice(-RECENT_WINDOW)
  let driftFlagged = false
  if (filtered.length >= RECENT_WINDOW * 2) {
    const baseline = filtered.slice(0, -RECENT_WINDOW).map((o) => o.time_ms).sort((a, b) => a - b)
    const baselineMedian = quantile(baseline, 0.5)
    if (baselineMedian > 0) {
      const allHigh = recent.every((o) => o.time_ms >= DRIFT_FACTOR * baselineMedian)
      const allLow = recent.every((o) => o.time_ms <= baselineMedian / DRIFT_FACTOR)
      driftFlagged = allHigh || allLow
    }
  }

  return {
    category,
    sample_size: n,
    no_data: false,
    insufficient_data: false,
    drift_flagged: driftFlagged,
    filter: baseFilter,
    median_time_ms: medianTime,
    p25_time_ms: p25Time,
    p75_time_ms: p75Time,
    median_cost_usd: medianCost,
    p25_cost_usd: p25Cost,
    p75_cost_usd: p75Cost,
    most_recent_iso: mostRecentIso,
  }
}

export async function getEstimate(
  category: Category,
  opts: FilterOptions = {},
): Promise<Estimate> {
  const logPath = opts.logPath ?? DEFAULT_LOG_PATH
  const obs = await readObservations(logPath)
  const baseFilter = { agent_id: opts.agent_id, scope_tags: opts.scope_tags }
  const est = computeEstimate(category, obs, baseFilter)

  if (!opts.broaden_on_no_data || est.sample_size > 0) return est

  // Broaden in two steps: first drop scope_tags, then drop agent_id.
  if (opts.scope_tags !== undefined && opts.scope_tags.length > 0) {
    const broadened = computeEstimate(category, obs, { agent_id: opts.agent_id })
    if (broadened.sample_size > 0) {
      broadened.broadened_to = {
        from: { agent_id: opts.agent_id, scope_tags: opts.scope_tags },
        to: { agent_id: opts.agent_id },
      }
      return broadened
    }
  }
  if (opts.agent_id !== undefined) {
    const broadened = computeEstimate(category, obs, {})
    if (broadened.sample_size > 0) {
      broadened.broadened_to = {
        from: { agent_id: opts.agent_id, scope_tags: opts.scope_tags },
        to: {},
      }
      return broadened
    }
  }
  return est
}

export async function getAllEstimates(
  opts: FilterOptions = {},
): Promise<Record<Category, Estimate>> {
  const logPath = opts.logPath ?? DEFAULT_LOG_PATH
  const obs = await readObservations(logPath)
  const baseFilter = { agent_id: opts.agent_id, scope_tags: opts.scope_tags }
  const out = {} as Record<Category, Estimate>
  for (const cat of KNOWN_CATEGORIES) {
    out[cat] = computeEstimate(cat, obs, baseFilter)
  }
  return out
}

/** Agent-intuitive one-liner: get current estimate for category using
 * environment defaults. */
export async function quickEstimate(category: Category): Promise<Estimate> {
  const agent_id = process.env.CHEAPCODE_AGENT_ID ?? DEFAULT_AGENT_ID
  return getEstimate(category, { agent_id, broaden_on_no_data: true })
}

// ----------------------------------------------------------------
// CLI
// ----------------------------------------------------------------

function fmtTime(ms: number | null): string {
  if (ms === null) return "n/a"
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}s`
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`
  return `${(ms / 3_600_000).toFixed(1)}h`
}

function fmtCost(c: number | null): string {
  if (c === null) return "n/a"
  return `$${c.toFixed(4)}`
}

export function fmtEstimate(e: Estimate): string {
  let flag = ""
  if (e.no_data) flag = "no-data"
  else if (e.insufficient_data) flag = `insufficient (N=${e.sample_size})`
  else if (e.drift_flagged) flag = "DRIFT (atom 0015)"
  else flag = `ok (N=${e.sample_size})`
  if (e.broadened_to) flag += " [broadened]"
  const time = e.no_data || e.insufficient_data
    ? "n/a"
    : `${fmtTime(e.p25_time_ms)} / ${fmtTime(e.median_time_ms)} / ${fmtTime(e.p75_time_ms)}`
  const cost = e.no_data || e.insufficient_data
    ? "n/a"
    : `${fmtCost(e.p25_cost_usd)} / ${fmtCost(e.median_cost_usd)} / ${fmtCost(e.p75_cost_usd)}`
  return `${e.category.padEnd(28)} ${String(e.sample_size).padEnd(4)} ${time.padEnd(28)} ${cost.padEnd(34)} ${flag}`
}

export function fmtTable(all: Record<Category, Estimate>): string {
  const lines: string[] = []
  lines.push("=== conversion-factor estimator (cheapcode-fork, M3.34) ===")
  lines.push("(robust descriptive statistics: median + IQR; updated as observations accumulate)")
  lines.push("")
  lines.push(`${"category".padEnd(28)} ${"N".padEnd(4)} ${"time(p25/med/p75)".padEnd(28)} ${"cost(p25/med/p75)".padEnd(34)} ${"flag"}`)
  lines.push("-".repeat(110))
  for (const cat of KNOWN_CATEGORIES) {
    lines.push(fmtEstimate(all[cat]))
  }
  return lines.join("\n")
}

function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1 || idx + 1 >= args.length) return undefined
  return args[idx + 1]
}

function parseScopeTags(args: string[]): string[] | undefined {
  const v = parseFlag(args, "--scope")
  if (v === undefined) return undefined
  return v.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
}

const HELP = `tools/conversion-factors.ts — living conversion-factor estimator (M3.34)

Subcommands:
  list                                Show full table for all known categories
  estimate <category>                 Show single-category estimate
  record <cat> <time_ms> <cost_usd>   Append observation
  help                                Show this help

Common flags:
  --agent <id>     Filter by agent_id (default: env CHEAPCODE_AGENT_ID or "${DEFAULT_AGENT_ID}")
  --scope a,b,c    Filter by scope_tags (superset match)
  --broaden        Fall back to broader filter when current returns no_data

Categories: ${KNOWN_CATEGORIES.join(", ")}

Statistical method: median + IQR (Florence Nightingale 1854 robustness;
Bernoulli 1713 convergence). Drift detection per atom 0015 (2× threshold).
`

if (import.meta.main) {
  const args = process.argv.slice(2)
  const cmd = args[0] ?? "list"
  const agent_id = parseFlag(args, "--agent") ?? process.env.CHEAPCODE_AGENT_ID ?? DEFAULT_AGENT_ID
  const scope_tags = parseScopeTags(args)
  const broaden = args.includes("--broaden")

  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(HELP)
  } else if (cmd === "list") {
    const all = await getAllEstimates({ agent_id, scope_tags, broaden_on_no_data: broaden })
    console.log(fmtTable(all))
  } else if (cmd === "estimate") {
    const cat = args[1] as Category
    if (!KNOWN_CATEGORIES.includes(cat)) {
      console.error(`unknown category: ${cat}\nvalid: ${KNOWN_CATEGORIES.join(", ")}`)
      process.exit(1)
    }
    const est = await getEstimate(cat, { agent_id, scope_tags, broaden_on_no_data: broaden })
    console.log(JSON.stringify(est, null, 2))
  } else if (cmd === "record") {
    const cat = args[1] as Category
    const time = Number(args[2])
    const cost = Number(args[3])
    if (!KNOWN_CATEGORIES.includes(cat) || !Number.isFinite(time) || !Number.isFinite(cost)) {
      console.error(`usage: bun tools/conversion-factors.ts record <category> <time_ms> <cost_usd> [--scope tag1,tag2] [--agent <id>]`)
      console.error(`categories: ${KNOWN_CATEGORIES.join(", ")}`)
      process.exit(1)
    }
    const obs = await recordObservation({
      category: cat,
      time_ms: time,
      cost_usd: cost,
      agent_id,
      ...(scope_tags !== undefined ? { scope_tags } : {}),
    })
    console.log(`recorded: ${JSON.stringify(obs)}`)
  } else {
    console.error(`unknown command: ${cmd}`)
    console.error(HELP)
    process.exit(1)
  }
}
