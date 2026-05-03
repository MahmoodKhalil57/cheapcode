#!/usr/bin/env bun
/**
 * tools/reality-check.ts — physical-reality grounding for cheapcode-fork
 * agents (M3.33). Forces visibility of wall time, disk free, recent
 * commit/snapshot/daftar activity so claims about time, cost, and
 * frequency can be anchored to measurement instead of guessed from
 * memory.
 *
 * Statistical lineage (per bubExplains/Statistics.md): every successful
 * statistical practice in 3,800 years of history has started with
 * physical-reality grounding — Babylonian grain inventories on clay
 * tablets, Halley's Breslau mortality data 1693, Florence Nightingale's
 * Crimean hospital death counts 1854. LLM agents lacking this grounding
 * is an engineering bug, not a fundamental limit. This tool is the
 * mechanical fix.
 *
 * Substrate companions:
 * - mizaj 19 (ground-physical-reality-at-decision-boundaries)
 * - khazīna atom 0018 (iterative-energy-transformation, extends 0005)
 * - mizaj 11 (tier-the-source) — runtime-measured fields are L1; absent
 *   fields fall back to null rather than fabricated estimates
 *
 * Usage:
 *   bun tools/reality-check.ts                 # human-readable + JSON
 *   bun tools/reality-check.ts --json          # JSON only
 *
 * Programmatic:
 *   import { collectRealityCheck } from "./tools/reality-check"
 *   const reality = await collectRealityCheck()
 */

import { resolve } from "node:path"
import { statSync, readdirSync, existsSync } from "node:fs"

export interface RealityCheckOutput {
  /** ISO8601 timestamp at moment of probe. */
  timestamp_iso: string
  /** Milliseconds since epoch at moment of probe (Date.now() value). */
  wall_time_ms_since_epoch: number
  /** Absolute path to the project root the probe was run against. */
  project_root: string
  /** Bytes free on the filesystem holding project_root, or null if unavailable. */
  disk_free_bytes: number | null
  /** Number of commits in the last 24 hours; null if not a git repo or git fails. */
  recent_commits_count_24h: number | null
  /** Milliseconds since the most recent commit; null if no commits or repo. */
  ms_since_last_commit: number | null
  /** Milliseconds since the most recent burhan snapshot; null if no snapshots. */
  ms_since_last_snapshot: number | null
  /** Number of daftar entries for this project shard in the last 24 hours; null if daftar unavailable. */
  daftar_recent_entry_count: number | null
}

const PROJECT_ROOT = resolve(import.meta.dir, "..")

function safeNumber(s: string): number | null {
  const n = Number(s.trim())
  return Number.isFinite(n) ? n : null
}

export async function safeShell(cmd: string[]): Promise<string | null> {
  try {
    const proc = Bun.spawn(cmd, { stderr: "pipe", stdout: "pipe" })
    const exited = await proc.exited
    if (exited !== 0) return null
    const out = await new Response(proc.stdout).text()
    return out.trim()
  } catch {
    return null
  }
}

async function diskFreeBytes(path: string): Promise<number | null> {
  // df --output=avail -B1 <path>: outputs available bytes only.
  const out = await safeShell(["df", "--output=avail", "-B1", path])
  if (out == null) return null
  // First line is header "Avail", second is the number.
  const lines = out.split("\n").filter((l) => l.trim().length > 0)
  if (lines.length < 2) return null
  return safeNumber(lines[1]!)
}

async function recentCommitsCount24h(repoPath: string): Promise<number | null> {
  const out = await safeShell(["git", "-C", repoPath, "log", "--since=24 hours ago", "--oneline"])
  if (out == null) return null
  if (out.length === 0) return 0
  return out.split("\n").filter((l) => l.trim().length > 0).length
}

async function msSinceLastCommit(repoPath: string): Promise<number | null> {
  const out = await safeShell(["git", "-C", repoPath, "log", "-1", "--format=%ct"])
  if (out == null || out.length === 0) return null
  const seconds = safeNumber(out)
  if (seconds == null) return null
  const delta = Date.now() - seconds * 1000
  return delta < 0 ? 0 : delta
}

export function msSinceLastSnapshot(snapDir: string): number | null {
  if (!existsSync(snapDir)) return null
  let newestMs: number | null = null
  try {
    for (const entry of readdirSync(snapDir)) {
      if (!entry.endsWith(".json")) continue
      const full = `${snapDir}/${entry}`
      const stat = statSync(full)
      const ms = stat.mtimeMs
      if (newestMs === null || ms > newestMs) newestMs = ms
    }
  } catch {
    return null
  }
  if (newestMs == null) return null
  const delta = Date.now() - newestMs
  return delta < 0 ? 0 : delta
}

async function daftarRecentEntryCount(repoPath: string): Promise<number | null> {
  const daftarBin = `${process.env.HOME}/apps/daftar/bin/daftar`
  if (!existsSync(daftarBin)) return null
  const out = await safeShell(["bun", daftarBin, "list", `--project=${repoPath}`, "--limit=50"])
  if (out == null) return null
  // The daftar output is JSON-shaped; count entries with created_at in last 24h.
  // For simplicity (and to keep this tool robust to daftar output shape changes),
  // count occurrences of "created_at" within the last 24h ISO range.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const matches = out.match(/"created_at"\s*:\s*"([^"]+)"/g)
  if (!matches) return 0
  let count = 0
  for (const m of matches) {
    const tsMatch = m.match(/"([^"]+)"$/)
    if (!tsMatch) continue
    if (tsMatch[1]! >= cutoff) count++
  }
  return count
}

export async function collectRealityCheck(): Promise<RealityCheckOutput> {
  const wallTime = Date.now()
  const [disk, recent24h, sinceCommit, daftarCount] = await Promise.all([
    diskFreeBytes(PROJECT_ROOT),
    recentCommitsCount24h(PROJECT_ROOT),
    msSinceLastCommit(PROJECT_ROOT),
    daftarRecentEntryCount(PROJECT_ROOT),
  ])
  const sinceSnapshot = msSinceLastSnapshot(`${PROJECT_ROOT}/runs/snapshots`)
  return {
    timestamp_iso: new Date(wallTime).toISOString(),
    wall_time_ms_since_epoch: wallTime,
    project_root: PROJECT_ROOT,
    disk_free_bytes: disk,
    recent_commits_count_24h: recent24h,
    ms_since_last_commit: sinceCommit,
    ms_since_last_snapshot: sinceSnapshot,
    daftar_recent_entry_count: daftarCount,
  }
}

export function formatHuman(r: RealityCheckOutput): string {
  const fmt = (ms: number | null) =>
    ms === null ? "n/a" : ms < 60_000 ? `${(ms / 1000).toFixed(0)}s ago` : ms < 3_600_000 ? `${(ms / 60_000).toFixed(1)}m ago` : `${(ms / 3_600_000).toFixed(1)}h ago`
  const gib = (bytes: number | null) => (bytes === null ? "n/a" : `${(bytes / 1024 ** 3).toFixed(1)} GiB`)
  return [
    `=== reality-check (cheapcode-fork) ===`,
    `time:                ${r.timestamp_iso}`,
    `project_root:        ${r.project_root}`,
    `disk_free:           ${gib(r.disk_free_bytes)}`,
    `recent_commits_24h:  ${r.recent_commits_count_24h ?? "n/a"}`,
    `last_commit:         ${fmt(r.ms_since_last_commit)}`,
    `last_snapshot:       ${fmt(r.ms_since_last_snapshot)}`,
    `daftar_entries_24h:  ${r.daftar_recent_entry_count ?? "n/a"}`,
  ].join("\n")
}

if (import.meta.main) {
  const reality = await collectRealityCheck()
  const args = process.argv.slice(2)
  if (args.includes("--json")) {
    console.log(JSON.stringify(reality, null, 2))
  } else {
    console.log(formatHuman(reality))
    console.log()
    console.log("--- JSON ---")
    console.log(JSON.stringify(reality, null, 2))
  }
}
