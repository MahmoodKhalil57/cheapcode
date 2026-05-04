import { afterEach, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  QuotaTracker,
  TaskBudget,
  TELEMETRY_ROTATE_BYTES,
  appendDispatchTelemetry,
  parseRateLimitHeaders,
} from "./quota-tracker"

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

// ---- parseRateLimitHeaders -----------------------------------------

test("parseRateLimitHeaders handles OpenAI-style headers", () => {
  const h = new Headers({
    "x-ratelimit-remaining-requests": "42",
    "x-ratelimit-remaining-tokens": "12000",
    "x-ratelimit-reset-requests": "30s",
  })
  const snap = parseRateLimitHeaders(h)
  expect(snap?.requests_remaining).toBe(42)
  expect(snap?.tokens_remaining).toBe(12000)
  expect(snap?.reset_in_ms).toBe(30_000)
  expect(snap?.source).toBe("header")
})

test("parseRateLimitHeaders handles Anthropic-style headers", () => {
  const h = {
    "anthropic-ratelimit-requests-remaining": "100",
    "anthropic-ratelimit-tokens-remaining": "50000",
  }
  const snap = parseRateLimitHeaders(h)
  expect(snap?.requests_remaining).toBe(100)
  expect(snap?.tokens_remaining).toBe(50000)
})

test("parseRateLimitHeaders parses ms / s / m units in reset", () => {
  expect(parseRateLimitHeaders({ "x-ratelimit-remaining-requests": "1", "x-ratelimit-reset": "500ms" })?.reset_in_ms).toBe(500)
  expect(parseRateLimitHeaders({ "x-ratelimit-remaining-requests": "1", "x-ratelimit-reset": "5s" })?.reset_in_ms).toBe(5000)
  expect(parseRateLimitHeaders({ "x-ratelimit-remaining-requests": "1", "x-ratelimit-reset": "2m" })?.reset_in_ms).toBe(120_000)
})

test("parseRateLimitHeaders returns undefined when no ratelimit fields present", () => {
  expect(parseRateLimitHeaders({ "content-type": "application/json" })).toBeUndefined()
  expect(parseRateLimitHeaders(undefined)).toBeUndefined()
})

// ---- QuotaTracker ---------------------------------------------------

test("QuotaTracker records header snapshot when available", () => {
  const t = new QuotaTracker()
  t.record("openai", new Headers({ "x-ratelimit-remaining-requests": "10" }))
  expect(t.snapshot("openai")?.requests_remaining).toBe(10)
  expect(t.snapshot("openai")?.source).toBe("header")
})

test("QuotaTracker falls back to counter when no headers", () => {
  const t = new QuotaTracker()
  t.record("openai")
  t.record("openai")
  expect(t.snapshot("openai")?.source).toBe("counter")
  expect(t.recentRequests("openai")).toBe(2)
})

test("QuotaTracker recentRequests respects window", () => {
  const t = new QuotaTracker()
  const now = Date.now()
  t.record("k")
  t.record("k")
  expect(t.recentRequests("k", 1, now + 5000)).toBe(0)
  expect(t.recentRequests("k", 60_000, now)).toBe(2)
})

test("QuotaTracker keeps independent state per authKey", () => {
  const t = new QuotaTracker()
  t.record("openai-2", new Headers({ "x-ratelimit-remaining-requests": "5" }))
  t.record("openai", new Headers({ "x-ratelimit-remaining-requests": "50" }))
  expect(t.snapshot("openai")?.requests_remaining).toBe(50)
  expect(t.snapshot("openai-2")?.requests_remaining).toBe(5)
})

// ---- TaskBudget -----------------------------------------------------

test("TaskBudget status: ok when under threshold", () => {
  const b = new TaskBudget(60_000, 0.10)
  b.charge(1000, 0.001)
  const s = b.status()
  expect(s.status).toBe("ok")
  expect(s.fraction_used).toBeGreaterThan(0)
  expect(s.fraction_used).toBeLessThan(0.7)
})

test("TaskBudget status: escalate-down at >=70%", () => {
  const b = new TaskBudget(1000, 1.0)
  b.charge(700, 0)
  expect(b.status().status).toBe("escalate-down")
})

test("TaskBudget status: reject at >=100%", () => {
  const b = new TaskBudget(1000, 1.0)
  b.charge(1500, 0)
  expect(b.status().status).toBe("reject")
})

test("TaskBudget: status driven by max(ms, usd) fraction", () => {
  const b = new TaskBudget(10_000, 1.0)
  // ms used: 10% — usd used: 80% → escalate-down
  b.charge(1000, 0.80)
  expect(b.status().status).toBe("escalate-down")
})

test("TaskBudget: zero-budget axis is ignored", () => {
  const b = new TaskBudget(0, 1.0) // no ms cap
  b.charge(99999999, 0.5)
  expect(b.status().status).toBe("ok") // only usd at 50% counts
})

test("TaskBudget custom escalate-down threshold", () => {
  const b = new TaskBudget(1000, 1.0, 0.5)
  b.charge(600, 0)
  expect(b.status().status).toBe("escalate-down")
})

// ---- appendDispatchTelemetry ----------------------------------------

test("appendDispatchTelemetry writes JSONL row, creates dirs", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-tele-"))
  const path = join(tmpDir, "subdir", "dispatch.jsonl")
  await appendDispatchTelemetry(path, {
    ts: "2026-05-04T20:00:00Z",
    auth_key: "openai",
    canonical: "openai",
    target_model: "openai/gpt-5.5",
    wall_clock_ms: 1234,
    cost_usd_estimate: 0.001,
    status: "ok",
  })
  const content = await readFile(path, "utf8")
  expect(content).toMatch(/"auth_key":"openai"/)
  expect(content.endsWith("\n")).toBe(true)
})

test("appendDispatchTelemetry rotates when file exceeds threshold", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-rot-"))
  const path = join(tmpDir, "dispatch.jsonl")
  // pre-fill at the rotate boundary
  await writeFile(path, "x".repeat(100))
  await appendDispatchTelemetry(
    path,
    {
      ts: "now",
      auth_key: "k",
      canonical: "c",
      target_model: "m",
      wall_clock_ms: 1,
      cost_usd_estimate: 0,
      status: "ok",
    },
    50, // tiny rotate threshold for test
  )
  const main = await readFile(path, "utf8")
  const backup = await readFile(`${path}.1`, "utf8")
  expect(backup.length).toBe(100)
  expect(main).toContain('"auth_key":"k"')
  expect(main.length).toBeLessThan(200) // only the new row, pre-existing got rotated
})

test("TELEMETRY_ROTATE_BYTES default is 10 MB", () => {
  expect(TELEMETRY_ROTATE_BYTES).toBe(10 * 1024 * 1024)
})
