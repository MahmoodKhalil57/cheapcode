/**
 * reality-check.test.ts — M18-discipline tests written BEFORE
 * tools/reality-check.ts. Each test discriminates a load-bearing burhan
 * claim from PLAN.bn SECTION GG.
 *
 * Atom 0011 smallest-distinguishing applied: 6 tests cover the 4 structural
 * claims with no redundancy.
 *
 * Statistical lineage (per bubExplains/Statistics.md): physical-reality
 * grounding has always preceded statistical inference. Babylonian grain
 * counts on clay tablets, Halley's Breslau mortality data 1693,
 * Florence Nightingale's hospital death counts. This test validates that
 * the runtime equivalent for LLM agents — measure-before-you-claim — is
 * structurally enforced.
 */

import { test, expect } from "bun:test"
import { collectRealityCheck, type RealityCheckOutput } from "./reality-check"

// ============================================================
// Claim 1: required physical-state fields with correct types
// ============================================================

test("collectRealityCheck returns object with all required fields (claim 1)", async () => {
  const out = await collectRealityCheck()
  expect(out).toHaveProperty("timestamp_iso")
  expect(out).toHaveProperty("wall_time_ms_since_epoch")
  expect(out).toHaveProperty("project_root")
  expect(out).toHaveProperty("disk_free_bytes")
  expect(out).toHaveProperty("recent_commits_count_24h")
  expect(out).toHaveProperty("ms_since_last_commit")
  expect(out).toHaveProperty("ms_since_last_snapshot")
  expect(out).toHaveProperty("daftar_recent_entry_count")
})

test("collectRealityCheck output has correct field types (claim 1)", async () => {
  const out = await collectRealityCheck()
  expect(typeof out.timestamp_iso).toBe("string")
  expect(typeof out.wall_time_ms_since_epoch).toBe("number")
  expect(typeof out.project_root).toBe("string")
  expect(typeof out.disk_free_bytes === "number" || out.disk_free_bytes === null).toBe(true)
  expect(typeof out.recent_commits_count_24h === "number" || out.recent_commits_count_24h === null).toBe(true)
  // ms_since fields can be null when no commit/snapshot exists, otherwise number
  expect(out.ms_since_last_commit === null || typeof out.ms_since_last_commit === "number").toBe(true)
  expect(out.ms_since_last_snapshot === null || typeof out.ms_since_last_snapshot === "number").toBe(true)
  expect(typeof out.daftar_recent_entry_count === "number" || out.daftar_recent_entry_count === null).toBe(true)
})

// ============================================================
// Claim 2: timestamp within 2s tolerance of Date.now()
// ============================================================

test("collectRealityCheck timestamp is within 2s of system clock (claim 2)", async () => {
  const before = Date.now()
  const out = await collectRealityCheck()
  const after = Date.now()
  expect(out.wall_time_ms_since_epoch).toBeGreaterThanOrEqual(before)
  expect(out.wall_time_ms_since_epoch).toBeLessThanOrEqual(after + 100)
  // ISO timestamp parses cleanly
  const parsed = new Date(out.timestamp_iso).getTime()
  expect(parsed).toBeGreaterThan(0)
  expect(Math.abs(parsed - out.wall_time_ms_since_epoch)).toBeLessThanOrEqual(1500)
})

// ============================================================
// Claim 3: time-deltas are non-negative or null
// ============================================================

test("collectRealityCheck time deltas are non-negative or null (claim 3)", async () => {
  const out = await collectRealityCheck()
  if (out.ms_since_last_commit !== null) {
    expect(out.ms_since_last_commit).toBeGreaterThanOrEqual(0)
  }
  if (out.ms_since_last_snapshot !== null) {
    expect(out.ms_since_last_snapshot).toBeGreaterThanOrEqual(0)
  }
})

test("collectRealityCheck recent_commits_count_24h is non-negative or null", async () => {
  const out = await collectRealityCheck()
  if (out.recent_commits_count_24h !== null) {
    expect(out.recent_commits_count_24h).toBeGreaterThanOrEqual(0)
  }
})

// ============================================================
// Resilience: handles missing project gracefully
// ============================================================

test("collectRealityCheck does not throw when invoked from inside a git repo with snapshots", async () => {
  // Just verify it returns an artifact rather than throwing.
  // The cheapcode repo has both git history and snapshot history at this
  // point in the project, so all observable fields should resolve.
  const out: RealityCheckOutput = await collectRealityCheck()
  expect(out.project_root.length).toBeGreaterThan(0)
  expect(out.timestamp_iso.length).toBeGreaterThan(0)
})

// ============================================================
// formatHuman + CLI entry
// ============================================================

import { formatHuman, safeShell, msSinceLastSnapshot } from "./reality-check"

test("formatHuman renders a string with all expected fields", () => {
  const sample: RealityCheckOutput = {
    timestamp_iso: "2026-05-03T12:00:00.000Z",
    wall_time_ms_since_epoch: 1746273600000,
    project_root: "/tmp/test",
    disk_free_bytes: 10 * 1024 ** 3, // 10 GiB
    recent_commits_count_24h: 7,
    ms_since_last_commit: 3500_000, // ~58 min
    ms_since_last_snapshot: 30_000, // 30s
    daftar_recent_entry_count: 4,
  }
  const text = formatHuman(sample)
  expect(text).toContain("reality-check")
  expect(text).toContain("/tmp/test")
  expect(text).toContain("10.0 GiB")
  expect(text).toContain("recent_commits_24h:  7")
  expect(text).toContain("daftar_entries_24h:  4")
  // h-ago vs m-ago vs s-ago formatting branches
  expect(text).toContain("m ago") // for ms_since_last_commit
  expect(text).toContain("s ago") // for ms_since_last_snapshot
})

test("formatHuman handles all-null fields gracefully", () => {
  const sample: RealityCheckOutput = {
    timestamp_iso: "2026-05-03T12:00:00.000Z",
    wall_time_ms_since_epoch: 1746273600000,
    project_root: "/tmp/empty",
    disk_free_bytes: null,
    recent_commits_count_24h: null,
    ms_since_last_commit: null,
    ms_since_last_snapshot: null,
    daftar_recent_entry_count: null,
  }
  const text = formatHuman(sample)
  expect(text).toContain("n/a")
  expect(text).not.toContain("undefined")
  expect(text).not.toContain("null")
})

test("formatHuman h-branch fires for >1h delta", () => {
  const sample: RealityCheckOutput = {
    timestamp_iso: "2026-05-03T12:00:00.000Z",
    wall_time_ms_since_epoch: 1746273600000,
    project_root: "/tmp/old",
    disk_free_bytes: 1024 ** 3,
    recent_commits_count_24h: 0,
    ms_since_last_commit: 5 * 3_600_000, // 5 hours
    ms_since_last_snapshot: null,
    daftar_recent_entry_count: 0,
  }
  const text = formatHuman(sample)
  expect(text).toContain("h ago")
})

test("safeShell returns null when the command is bogus (error-path)", async () => {
  const result = await safeShell(["this-is-not-a-real-command", "--fake-flag"])
  expect(result).toBeNull()
})

test("msSinceLastSnapshot returns null for nonexistent dir (error-path)", () => {
  const result = msSinceLastSnapshot("/this/dir/does/not/exist/anywhere")
  expect(result).toBeNull()
})

test("msSinceLastSnapshot returns null when path exists but is not a dir (readdirSync throw)", () => {
  // Pass a regular file as the snap dir; readdirSync will throw → catch returns null.
  const result = msSinceLastSnapshot("/etc/hostname")
  expect(result).toBeNull()
})
