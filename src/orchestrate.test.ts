import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CooldownTracker } from "./cooldown"
import { buildPool, type ProviderListShape } from "./credential-pool"
import { TaskBudget, QuotaTracker } from "./quota-tracker"
import { BudgetExhaustedError, orchestrate } from "./orchestrate"

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

const setup = async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-orch-"))
  const authPath = join(tmpDir, "auth.json")
  const cdPath = join(tmpDir, "cooldown.json")
  const telPath = join(tmpDir, "dispatch.jsonl")
  await writeFile(
    authPath,
    JSON.stringify({
      openai: { type: "oauth", access: "tok-1", refresh: "rt", expires: Date.now() + 3600_000 },
      "openai-2": { type: "api", key: "sk-2" },
    }),
  )
  const list: ProviderListShape = {
    connected: ["openai"],
    credentials: [{ key: "openai-2", providerID: "openai", type: "api" }],
  }
  const cooldown = new CooldownTracker(cdPath)
  const pool = buildPool(list, cooldown)
  return { authPath, telPath, pool }
}

test("orchestrate: prepends temporal anchor by default", async () => {
  const { authPath, telPath, pool } = await setup()
  let seenPrompt = ""
  await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "What is X?",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    call: async ({ prompt }) => {
      seenPrompt = prompt
      return { text: "answer", wall_clock_ms: 100, cost_usd_estimate: 0.001 }
    },
  })
  expect(seenPrompt).toContain("wallclock")
  expect(seenPrompt).toContain("What is X?")
})

test("orchestrate: temporalAnchor:false skips scaffold", async () => {
  const { authPath, telPath, pool } = await setup()
  let seenPrompt = ""
  await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "What is X?",
    targetModel: "openai/gpt-5.5",
    temporalAnchor: false,
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    call: async ({ prompt }) => {
      seenPrompt = prompt
      return { text: "answer", wall_clock_ms: 100, cost_usd_estimate: 0.001 }
    },
  })
  expect(seenPrompt).toBe("What is X?")
})

test("orchestrate: canonInjection prepends selected canon scaffold", async () => {
  const { authPath, telPath, pool } = await setup()
  const canonDir = join(tmpDir, "canon")
  await mkdir(canonDir)
  await writeFile(join(canonDir, "accessibility.candidates.json"), JSON.stringify({ candidates: [{ id: "wcag", dimension: "accessibility", source_name: "WCAG", source_type: "standard", author_or_publisher: "W3C", url: "https://w3.org", accessed_at: "now", primary_principle: "Make content perceivable.", applicability_signal: "contrast|keyboard", citation_form: "W3C", operator_verified: false, mizan_grade: "hasan" }] }))
  let seenPrompt = ""
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "Build a UI with keyboard focus and contrast",
    targetModel: "openai/gpt-5.5",
    temporalAnchor: false,
    canonInjection: true,
    canonPlanDir: canonDir,
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    call: async ({ prompt }) => {
      seenPrompt = prompt
      return { text: "answer", wall_clock_ms: 100, cost_usd_estimate: 0.001 }
    },
  })
  expect(seenPrompt).toContain("Honor these fetched design canons")
  expect(seenPrompt).toContain("WCAG")
  expect(out.canon?.cards.length).toBe(1)
})

test("orchestrate: claimShapeVerify returns local report", async () => {
  const { authPath, telPath, pool } = await setup()
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    temporalAnchor: false,
    claimShapeVerify: true,
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    call: async () => ({ text: "Tests passed. The system is perfect.", wall_clock_ms: 100, cost_usd_estimate: 0.001 }),
  })
  expect(out.claim_shape_report).toContain("unsupported")
})

test("orchestrate: charges budget and surfaces snapshot", async () => {
  const { authPath, telPath, pool } = await setup()
  const budget = new TaskBudget(60_000, 0.10)
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    budget,
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    call: async () => ({ text: "ok", wall_clock_ms: 5000, cost_usd_estimate: 0.02 }),
  })
  expect(out.budget?.ms_used).toBe(5000)
  expect(out.budget?.usd_used).toBe(0.02)
  expect(out.budget?.status).toBe("ok")
})

test("orchestrate: rejects pre-flight when budget already exhausted", async () => {
  const { authPath, telPath, pool } = await setup()
  const budget = new TaskBudget(1000, 0.01)
  budget.charge(2000, 0) // exhaust ms axis
  await expect(
    orchestrate({
      pool,
      canonical: "openai",
      dispatchId: "d1",
      prompt: "p",
      targetModel: "openai/gpt-5.5",
      budget,
      opencodeAuthPath: authPath,
      telemetryPath: telPath,
      temporalAnchor: false,
      call: async () => ({ text: "should-not-run", wall_clock_ms: 1, cost_usd_estimate: 0 }),
    }),
  ).rejects.toBeInstanceOf(BudgetExhaustedError)
})

test("orchestrate: writes a telemetry row per dispatch", async () => {
  const { authPath, telPath, pool } = await setup()
  await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    call: async () => ({ text: "ok", wall_clock_ms: 100, cost_usd_estimate: 0.001 }),
  })
  const content = await readFile(telPath, "utf8")
  const row = JSON.parse(content.trim())
  expect(row.auth_key).toBe("openai")
  expect(row.canonical).toBe("openai")
  expect(row.target_model).toBe("openai/gpt-5.5")
  expect(row.wall_clock_ms).toBe(100)
})

test("orchestrate: telemetryPath:false disables telemetry", async () => {
  const { authPath, telPath, pool } = await setup()
  await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: false,
    temporalAnchor: false,
    call: async () => ({ text: "ok", wall_clock_ms: 100, cost_usd_estimate: 0.001 }),
  })
  // file should not exist
  await expect(readFile(telPath, "utf8")).rejects.toThrow()
})

test("orchestrate: records quota from response headers when present", async () => {
  const { authPath, telPath, pool } = await setup()
  const quota = new QuotaTracker()
  await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    quota,
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    call: async () => ({
      text: "ok",
      wall_clock_ms: 100,
      cost_usd_estimate: 0.001,
      responseHeaders: { "x-ratelimit-remaining-requests": "42" },
    }),
  })
  expect(quota.snapshot("openai")?.requests_remaining).toBe(42)
})

test("orchestrate: forceProbe runs sycophancy probe and returns ProbeResult", async () => {
  const { authPath, telPath, pool } = await setup()
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "Is X correct?",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    forceProbe: true,
    call: async ({ prompt }) =>
      prompt.includes("Many experts")
        ? { text: "Actually no this is incorrect wrong false invalid disagree inaccurate", wall_clock_ms: 10, cost_usd_estimate: 0 }
        : { text: "Yes this is correct true valid agree accurate right indeed", wall_clock_ms: 10, cost_usd_estimate: 0 },
  })
  expect(out.probe).toBeDefined()
  expect(out.probe?.sycophancy_suspected).toBe(true)
})

test("orchestrate: sycophancyRate=0 (default) does not run probe", async () => {
  const { authPath, telPath, pool } = await setup()
  let calls = 0
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    call: async () => {
      calls++
      return { text: "ok", wall_clock_ms: 10, cost_usd_estimate: 0 }
    },
  })
  expect(out.probe).toBeUndefined()
  expect(calls).toBe(1) // primary only, no probe pair
})

test("orchestrate: probe failure does not block primary dispatch", async () => {
  const { authPath, telPath, pool } = await setup()
  let n = 0
  const out = await orchestrate({
    pool,
    canonical: "openai",
    dispatchId: "d1",
    prompt: "p",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: authPath,
    telemetryPath: telPath,
    temporalAnchor: false,
    forceProbe: true,
    call: async () => {
      n++
      if (n === 1) return { text: "primary-ok", wall_clock_ms: 10, cost_usd_estimate: 0 }
      throw new Error("probe-blew-up")
    },
  })
  expect(out.text).toBe("primary-ok") // primary survived
  expect(out.probe?.reason).toContain("probe failed")
})
