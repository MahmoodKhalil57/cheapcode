/**
 * conversion-factors.test.ts — M18-discipline tests written BEFORE
 * tools/conversion-factors.ts. Each test discriminates a load-bearing
 * burhan claim from PLAN.bn SECTION HH.
 *
 * Statistical lineage (per Statistics.md):
 * - Median + IQR over JSONL = same descriptive statistics Florence
 *   Nightingale used in 1854; robust to outliers, unlike mean
 * - Bernoulli law of large numbers (1713) — sample mean converges on
 *   true mean as N grows; tests verify convergence direction
 * - 2× drift threshold = robust outlier detection (Statistics.md notes
 *   that >2σ from mean is "genuinely rare" under normal distribution;
 *   here we use 2× median as a non-parametric equivalent)
 */

import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  recordObservation,
  getEstimate,
  getAllEstimates,
  KNOWN_CATEGORIES,
  type Category,
} from "./conversion-factors"

let tempDir: string
let tempLog: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "conv-factors-test-"))
  tempLog = join(tempDir, "conversion-factors.jsonl")
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

// ============================================================
// Claim 1: recordObservation writes structured JSONL
// ============================================================

test("recordObservation appends a JSONL line with required fields (claim 1)", async () => {
  await recordObservation(
    {
      category: "research-query",
      time_ms: 240_000,
      cost_usd: 0,
      metadata: { milestone: "M3.34" },
    },
    tempLog,
  )
  const text = readFileSync(tempLog, "utf-8").trim()
  const parsed = JSON.parse(text)
  expect(parsed).toHaveProperty("timestamp_iso")
  expect(parsed).toHaveProperty("category")
  expect(parsed).toHaveProperty("time_ms")
  expect(parsed).toHaveProperty("cost_usd")
  expect(parsed.category).toBe("research-query")
  expect(parsed.time_ms).toBe(240_000)
  expect(parsed.cost_usd).toBe(0)
  expect(typeof parsed.timestamp_iso).toBe("string")
  expect(parsed.metadata.milestone).toBe("M3.34")
})

test("recordObservation appends multiple lines without overwriting", async () => {
  await recordObservation({ category: "research-query", time_ms: 100, cost_usd: 0 }, tempLog)
  await recordObservation({ category: "research-query", time_ms: 200, cost_usd: 0 }, tempLog)
  const lines = readFileSync(tempLog, "utf-8").trim().split("\n")
  expect(lines.length).toBe(2)
  expect(JSON.parse(lines[0]!).time_ms).toBe(100)
  expect(JSON.parse(lines[1]!).time_ms).toBe(200)
})

// ============================================================
// Claim 2: getEstimate median + IQR + insufficient_data
// ============================================================

test("getEstimate returns insufficient_data:true when sample_size < 3 (claim 2)", async () => {
  await recordObservation({ category: "small-experiment", time_ms: 1000, cost_usd: 0.05 }, tempLog)
  await recordObservation({ category: "small-experiment", time_ms: 1500, cost_usd: 0.07 }, tempLog)
  const est = await getEstimate("small-experiment", { logPath: tempLog })
  expect(est.sample_size).toBe(2)
  expect(est.insufficient_data).toBe(true)
  expect(est.median_time_ms).toBeNull()
  expect(est.median_cost_usd).toBeNull()
})

test("getEstimate returns median + IQR when sample_size ≥ 3 (claim 2)", async () => {
  // 5 observations: time_ms 100,200,300,400,500 → median 300, p25 200, p75 400
  for (const t of [100, 200, 300, 400, 500]) {
    await recordObservation({ category: "research-query", time_ms: t, cost_usd: 0 }, tempLog)
  }
  const est = await getEstimate("research-query", { logPath: tempLog })
  expect(est.sample_size).toBe(5)
  expect(est.insufficient_data).toBe(false)
  expect(est.median_time_ms).toBe(300)
  expect(est.p25_time_ms).toBe(200)
  expect(est.p75_time_ms).toBe(400)
})

test("getEstimate handles cost statistics independently from time (claim 2)", async () => {
  for (const c of [0.01, 0.02, 0.03, 0.04, 0.05]) {
    await recordObservation({ category: "small-experiment", time_ms: 1000, cost_usd: c }, tempLog)
  }
  const est = await getEstimate("small-experiment", { logPath: tempLog })
  expect(est.median_cost_usd).toBeCloseTo(0.03, 5)
  expect(est.p25_cost_usd).toBeCloseTo(0.02, 5)
  expect(est.p75_cost_usd).toBeCloseTo(0.04, 5)
})

test("getEstimate returns median resilient to outliers (Statistics.md robustness check)", async () => {
  // 5 observations with one outlier: 100, 200, 300, 400, 99999
  // mean would be ~20200 (skewed); median is 300 (robust)
  for (const t of [100, 200, 300, 400, 99_999]) {
    await recordObservation({ category: "research-query", time_ms: t, cost_usd: 0 }, tempLog)
  }
  const est = await getEstimate("research-query", { logPath: tempLog })
  expect(est.median_time_ms).toBe(300) // robust to outlier
})

// ============================================================
// Claim 3: drift detection
// ============================================================

test("drift detection flags when 3+ recent observations are ≥2× cached median (claim 3)", async () => {
  // Initial cluster: median ~100ms
  for (const t of [80, 100, 120]) {
    await recordObservation({ category: "research-query", time_ms: t, cost_usd: 0 }, tempLog)
  }
  // 3 recent observations all ≥2× the cluster
  for (const t of [300, 400, 500]) {
    await recordObservation({ category: "research-query", time_ms: t, cost_usd: 0 }, tempLog)
  }
  const est = await getEstimate("research-query", { logPath: tempLog })
  expect(est.drift_flagged).toBe(true)
})

test("drift detection does NOT flag when only 1 recent outlier (claim 3 counter-test)", async () => {
  for (const t of [80, 100, 120, 90, 110, 105, 99, 102]) {
    await recordObservation({ category: "research-query", time_ms: t, cost_usd: 0 }, tempLog)
  }
  // 1 outlier
  await recordObservation({ category: "research-query", time_ms: 600, cost_usd: 0 }, tempLog)
  const est = await getEstimate("research-query", { logPath: tempLog })
  expect(est.drift_flagged).toBe(false)
})

// ============================================================
// Claim 4: getAllEstimates returns complete table
// ============================================================

test("getAllEstimates includes every known category with no_data flag for empty (claim 4)", async () => {
  await recordObservation({ category: "research-query", time_ms: 100, cost_usd: 0 }, tempLog)
  const all = await getAllEstimates({ logPath: tempLog })
  expect(Object.keys(all).sort()).toEqual([...KNOWN_CATEGORIES].sort())
  expect(all["research-query"].sample_size).toBe(1)
  expect(all["small-experiment"].sample_size).toBe(0)
  expect(all["small-experiment"].no_data).toBe(true)
})

// ============================================================
// Resilience
// ============================================================

test("getEstimate handles non-existent log file gracefully (returns no_data)", async () => {
  const est = await getEstimate("research-query", join(tempDir, "nonexistent.jsonl"))
  expect(est.sample_size).toBe(0)
  expect(est.no_data).toBe(true)
})

test("getEstimate skips malformed JSONL lines without throwing", async () => {
  writeFileSync(tempLog, [
    `{"timestamp_iso":"2026-05-03T12:00:00.000Z","category":"research-query","time_ms":100,"cost_usd":0}`,
    `not valid json at all`,
    `{"timestamp_iso":"2026-05-03T12:01:00.000Z","category":"research-query","time_ms":200,"cost_usd":0}`,
    `{"timestamp_iso":"2026-05-03T12:02:00.000Z","category":"research-query","time_ms":150,"cost_usd":0}`,
    ``,
  ].join("\n"))
  const est = await getEstimate("research-query", { logPath: tempLog })
  expect(est.sample_size).toBe(3)
  expect(est.median_time_ms).toBe(150)
})

test("recordObservation rejects unknown category via type system (compile-time guarantee)", () => {
  // This is a compile-time check: KNOWN_CATEGORIES is the type union;
  // an invalid category would fail TypeScript. We sanity-check the
  // export shape so future-agent edits don't drop the discipline.
  expect(KNOWN_CATEGORIES.length).toBeGreaterThan(0)
  expect(KNOWN_CATEGORIES).toContain("research-query")
  expect(KNOWN_CATEGORIES).toContain("small-experiment")
  expect(KNOWN_CATEGORIES).toContain("substrate-primitive-add")
  expect(KNOWN_CATEGORIES).toContain("large-dogfood")
})

// ============================================================
// Multi-dimensional filtering (M3.34 operator-named requirement)
//
// "the conversion factor table should also be multi dimensional, as you
// are usually claude opus 4.7 (until they release a newer version or
// i downgrade) so generally it should be constantish, while within
// scopes it is more complicated as specific research can take more time
// than specific experiments depending on the dimention you are looking at"
//
// Dimensions: agent_id (e.g. "claude-opus-4.7") × scope_tags (e.g. ["aime-math"])
// × category. Filter resolves to most-specific match available; falls
// back to broader categories with a 'broadened_to' breadcrumb.
// ============================================================

test("recordObservation persists agent_id and scope_tags fields (multi-dim claim)", async () => {
  await recordObservation(
    {
      category: "research-query",
      time_ms: 300_000,
      cost_usd: 0,
      agent_id: "claude-opus-4.7",
      scope_tags: ["aime-math", "single-question"],
    },
    tempLog,
  )
  const text = readFileSync(tempLog, "utf-8").trim()
  const parsed = JSON.parse(text)
  expect(parsed.agent_id).toBe("claude-opus-4.7")
  expect(parsed.scope_tags).toEqual(["aime-math", "single-question"])
})

test("getEstimate filters by agent_id (multi-dim claim)", async () => {
  // Mixed agents: 4 observations from claude-opus-4.7, 4 from gpt-5
  for (const t of [100, 200, 300, 400]) {
    await recordObservation(
      { category: "research-query", time_ms: t, cost_usd: 0, agent_id: "claude-opus-4.7" },
      tempLog,
    )
  }
  for (const t of [1000, 2000, 3000, 4000]) {
    await recordObservation(
      { category: "research-query", time_ms: t, cost_usd: 0, agent_id: "gpt-5" },
      tempLog,
    )
  }
  const claudeEst = await getEstimate("research-query", {
    agent_id: "claude-opus-4.7",
    logPath: tempLog,
  })
  const gpt5Est = await getEstimate("research-query", {
    agent_id: "gpt-5",
    logPath: tempLog,
  })
  expect(claudeEst.sample_size).toBe(4)
  expect(claudeEst.median_time_ms).toBe(250)
  expect(gpt5Est.sample_size).toBe(4)
  expect(gpt5Est.median_time_ms).toBe(2500)
})

test("getEstimate filters by scope_tags as superset-match (multi-dim claim)", async () => {
  // 3 observations tagged ["aime-math"], 3 tagged ["consumer-feedback"]
  for (const t of [100, 200, 300]) {
    await recordObservation(
      { category: "research-query", time_ms: t, cost_usd: 0, scope_tags: ["aime-math"] },
      tempLog,
    )
  }
  for (const t of [1000, 2000, 3000]) {
    await recordObservation(
      { category: "research-query", time_ms: t, cost_usd: 0, scope_tags: ["consumer-feedback"] },
      tempLog,
    )
  }
  const aimeEst = await getEstimate("research-query", {
    scope_tags: ["aime-math"],
    logPath: tempLog,
  })
  expect(aimeEst.sample_size).toBe(3)
  expect(aimeEst.median_time_ms).toBe(200)
})

test("getEstimate scope_tags filter is superset-match (additional tags OK)", async () => {
  // Observation with extra tags should still match a less-specific filter
  await recordObservation(
    {
      category: "research-query",
      time_ms: 100,
      cost_usd: 0,
      scope_tags: ["aime-math", "single-question", "geometry"],
    },
    tempLog,
  )
  await recordObservation(
    {
      category: "research-query",
      time_ms: 200,
      cost_usd: 0,
      scope_tags: ["aime-math", "geometry"],
    },
    tempLog,
  )
  await recordObservation(
    { category: "research-query", time_ms: 300, cost_usd: 0, scope_tags: ["aime-math"] },
    tempLog,
  )
  const est = await getEstimate("research-query", {
    scope_tags: ["aime-math"],
    logPath: tempLog,
  })
  expect(est.sample_size).toBe(3) // all 3 have aime-math superset-match
})

test("getEstimate falls back to broader filter with breadcrumb when narrow filter has no_data", async () => {
  // Only observations exist for a different agent
  await recordObservation(
    {
      category: "research-query",
      time_ms: 100,
      cost_usd: 0,
      agent_id: "claude-opus-4.7",
    },
    tempLog,
  )
  // Asking for gpt-5 with broaden:true should fall back to all observations
  const est = await getEstimate("research-query", {
    agent_id: "gpt-5",
    broaden_on_no_data: true,
    logPath: tempLog,
  })
  expect(est.sample_size).toBe(1)
  expect(est.broadened_to).toBeDefined()
})

test("getEstimate without broaden_on_no_data returns no_data when narrow filter is empty", async () => {
  await recordObservation(
    {
      category: "research-query",
      time_ms: 100,
      cost_usd: 0,
      agent_id: "claude-opus-4.7",
    },
    tempLog,
  )
  const est = await getEstimate("research-query", {
    agent_id: "gpt-5",
    logPath: tempLog,
  })
  expect(est.sample_size).toBe(0)
  expect(est.no_data).toBe(true)
})

test("getEstimate broaden falls back through scope_tags first then agent_id", async () => {
  // Only data tagged ["aime-math"] exists with agent claude-opus-4.7.
  for (const t of [100, 200, 300]) {
    await recordObservation(
      {
        category: "research-query",
        time_ms: t,
        cost_usd: 0,
        agent_id: "claude-opus-4.7",
        scope_tags: ["aime-math"],
      },
      tempLog,
    )
  }
  // Asking for claude-opus-4.7 + scope ["combinatorics"] with broaden:
  // first drop scope_tags → finds the 3 observations under same agent.
  const est = await getEstimate("research-query", {
    agent_id: "claude-opus-4.7",
    scope_tags: ["combinatorics"],
    broaden_on_no_data: true,
    logPath: tempLog,
  })
  expect(est.sample_size).toBe(3)
  expect(est.broadened_to).toBeDefined()
  expect(est.broadened_to!.to.agent_id).toBe("claude-opus-4.7")
  expect(est.broadened_to!.to.scope_tags).toBeUndefined()
})

// ============================================================
// Formatters + agent-intuitive helpers
// ============================================================

import { fmtEstimate, fmtTable, quickEstimate, DEFAULT_AGENT_ID } from "./conversion-factors"

test("fmtEstimate returns a one-liner with category + flag + sample size", () => {
  const e = {
    category: "research-query" as const,
    sample_size: 5,
    no_data: false,
    insufficient_data: false,
    drift_flagged: false,
    filter: {},
    median_time_ms: 250_000,
    p25_time_ms: 200_000,
    p75_time_ms: 300_000,
    median_cost_usd: 0.04,
    p25_cost_usd: 0.02,
    p75_cost_usd: 0.06,
    most_recent_iso: "2026-05-03T12:00:00.000Z",
  }
  const text = fmtEstimate(e)
  expect(text).toContain("research-query")
  expect(text).toContain("ok (N=5)")
  expect(text).toContain("4.2m") // ~250s = 4.2m
  expect(text).toContain("$0.04")
})

test("fmtEstimate marks drift state explicitly", () => {
  const e = {
    category: "research-query" as const,
    sample_size: 6,
    no_data: false,
    insufficient_data: false,
    drift_flagged: true,
    filter: {},
    median_time_ms: 100_000,
    p25_time_ms: 80_000,
    p75_time_ms: 120_000,
    median_cost_usd: 0,
    p25_cost_usd: 0,
    p75_cost_usd: 0,
    most_recent_iso: "2026-05-03T12:00:00.000Z",
  }
  expect(fmtEstimate(e)).toContain("DRIFT (atom 0015)")
})

test("fmtEstimate marks broadened state for fallback estimates", () => {
  const e = {
    category: "research-query" as const,
    sample_size: 3,
    no_data: false,
    insufficient_data: false,
    drift_flagged: false,
    filter: {},
    broadened_to: { from: { agent_id: "gpt-5" }, to: {} },
    median_time_ms: 1_500_000,
    p25_time_ms: 1_200_000,
    p75_time_ms: 1_800_000,
    median_cost_usd: 0,
    p25_cost_usd: 0,
    p75_cost_usd: 0,
    most_recent_iso: "2026-05-03T12:00:00.000Z",
  }
  expect(fmtEstimate(e)).toContain("[broadened]")
})

test("fmtEstimate handles 'h ago' time bucket (>1 hour)", () => {
  const e = {
    category: "large-dogfood" as const,
    sample_size: 3,
    no_data: false,
    insufficient_data: false,
    drift_flagged: false,
    filter: {},
    median_time_ms: 5 * 3_600_000,
    p25_time_ms: 4 * 3_600_000,
    p75_time_ms: 6 * 3_600_000,
    median_cost_usd: 1.5,
    p25_cost_usd: 1.0,
    p75_cost_usd: 2.0,
    most_recent_iso: "2026-05-03T12:00:00.000Z",
  }
  expect(fmtEstimate(e)).toContain("h")
})

test("fmtTable renders a header and one row per known category", async () => {
  await recordObservation({ category: "research-query", time_ms: 100, cost_usd: 0 }, tempLog)
  const all = await getAllEstimates({ logPath: tempLog })
  const text = fmtTable(all)
  expect(text).toContain("conversion-factor estimator")
  for (const cat of KNOWN_CATEGORIES) {
    expect(text).toContain(cat)
  }
})

test("DEFAULT_AGENT_ID is the current claude opus identifier", () => {
  expect(DEFAULT_AGENT_ID).toContain("claude-opus")
})

test("quickEstimate uses defaults when called with no args (agent-intuitive helper)", async () => {
  // Note: quickEstimate uses the real DEFAULT_LOG_PATH; we just verify it
  // returns an Estimate-shaped object without throwing. Cannot validate
  // against tempLog without exposing more knobs.
  const est = await quickEstimate("research-query")
  expect(est).toHaveProperty("category")
  expect(est).toHaveProperty("sample_size")
  expect(est).toHaveProperty("no_data")
  expect(typeof est.no_data).toBe("boolean")
})
