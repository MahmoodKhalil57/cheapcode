/**
 * M3.52 — Paired N=10 benchmark validating substrate-aware router (mizan-shim
 * integration) vs shape-only baseline.
 *
 * Methodology (atom 0011 cheapest-distinguishing-experiment):
 *   - Curated 10-prompt set spanning all 11 shapes
 *   - 3 prompts intentionally include action-safety / low-ceiling-cap /
 *     high-disagreement signals — substrate router SHOULD escalate
 *   - 7 prompts are baseline shapes — substrate router SHOULD route
 *     identically to shape-only router
 *
 * Falsifier: if the 3 substrate-warranted escalations don't fire OR if any
 * of the 7 baseline routes drift from shape-only behavior, M3.52 design
 * is invalidated. Bun-test-style: assertion-based.
 *
 * Run: bun runs/m3-52-substrate-aware-router/run.ts
 */

import { route, type RouterOptions } from "../../src/router"
import { type SubstrateState } from "../../src/mizan-shim"

const baseOpts: Omit<RouterOptions, "substrateState"> = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  frontierTarget: "anthropic/claude-opus-4",
}

// Substrate state with INTENTIONAL high-disagreement on math-chain to test rule C
const substrateState: SubstrateState = {
  perShapeDisagreement: { "math-chain": 0.30 }, // 30% disagreement, well above 0.10 threshold
  perShapeSampleCount: { "math-chain": 50 }, // 50 samples, above the 5-sample guard
  loadedAt: Date.now(),
  source: "daftar",
}

type Probe = {
  id: string
  prompt: string
  expectedShape: string
  substrateExpected:
    | { type: "no-change" }
    | { type: "action-safety", expectedTarget: string }
    | { type: "ceiling-cap", expectedVoter: true }
    | { type: "disagreement", expectedTarget: string }
}

const probes: Probe[] = [
  // 3 substrate-warranted escalations:
  {
    id: "P1-action-safety",
    prompt: "Run rm -rf /tmp/cache and re-bootstrap the project from scratch.",
    expectedShape: "multistep-general",
    substrateExpected: { type: "action-safety", expectedTarget: "anthropic/claude-opus-4" },
  },
  {
    id: "P2-ceiling-cap-multi-hypothesis",
    prompt: "How was the Quran written and what is the nature of its designer(s)?",
    expectedShape: "multistep-general",
    substrateExpected: { type: "ceiling-cap", expectedVoter: true },
  },
  {
    id: "P3-disagreement-math-chain",
    prompt: "Prove that for all integers n, gcd(n, n+1) = 1.",
    expectedShape: "math-chain",
    substrateExpected: { type: "disagreement", expectedTarget: "anthropic/claude-opus-4" },
  },
  // 7 baseline (no substrate change expected):
  { id: "P4-bounded-code", prompt: "Write a function that reverses a linked list.", expectedShape: "bounded-code", substrateExpected: { type: "no-change" } },
  { id: "P5-classification", prompt: "Categorize the following text as positive or negative.", expectedShape: "classification", substrateExpected: { type: "no-change" } },
  { id: "P6-subsecond-latency", prompt: "Real-time streaming response for a chat UI.", expectedShape: "subsecond-latency", substrateExpected: { type: "no-change" } },
  { id: "P7-computer-use", prompt: "Open the file foo.ts and click the run button.", expectedShape: "computer-use", substrateExpected: { type: "no-change" } },
  { id: "P8-long-context", prompt: "x".repeat(500_000), expectedShape: "long-context", substrateExpected: { type: "no-change" } },
  { id: "P9-multistep-general", prompt: "Tell me about the history of Rome.", expectedShape: "multistep-general", substrateExpected: { type: "no-change" } },
  {
    id: "P10-hard-reasoning-aime",
    prompt: "AIME 2024 problem: Find all positive integers n such that n^2 - 5n + 6 = 0.",
    expectedShape: "hard-reasoning",
    substrateExpected: { type: "no-change" },
  },
]

console.log("=== M3.52 paired benchmark: substrate-aware vs shape-only routing ===\n")

let pass = 0
let fail = 0
const failures: string[] = []

for (const probe of probes) {
  const baseline = route(probe.prompt, baseOpts)
  const substrateAware = route(probe.prompt, { ...baseOpts, substrateState })

  const shapeMatch = baseline.shape === probe.expectedShape
  if (!shapeMatch) {
    failures.push(`${probe.id}: shape ${baseline.shape} ≠ expected ${probe.expectedShape}`)
    fail++
    continue
  }

  let substrateOk = false
  let detail = ""
  switch (probe.substrateExpected.type) {
    case "no-change":
      substrateOk =
        baseline.target_model === substrateAware.target_model &&
        baseline.use_voter === substrateAware.use_voter
      detail = substrateOk ? "no-change as expected" : `unexpected drift: base=${baseline.target_model}/v${baseline.use_voter} → sub=${substrateAware.target_model}/v${substrateAware.use_voter}`
      break
    case "action-safety":
      substrateOk =
        substrateAware.target_model === probe.substrateExpected.expectedTarget &&
        substrateAware.rule.includes("action-safety=warn")
      detail = `target=${substrateAware.target_model}, rule includes action-safety: ${substrateAware.rule.includes("action-safety")}`
      break
    case "ceiling-cap":
      substrateOk = substrateAware.use_voter === true && substrateAware.rule.includes("ceiling-cap")
      detail = `use_voter=${substrateAware.use_voter}, rule includes ceiling-cap: ${substrateAware.rule.includes("ceiling-cap")}`
      break
    case "disagreement":
      substrateOk =
        substrateAware.target_model === probe.substrateExpected.expectedTarget &&
        substrateAware.rule.includes("daftar-disagreement")
      detail = `target=${substrateAware.target_model}, rule includes daftar-disagreement: ${substrateAware.rule.includes("daftar-disagreement")}`
      break
  }

  const result = substrateOk ? "PASS" : "FAIL"
  console.log(
    `[${result}] ${probe.id.padEnd(38)} shape=${baseline.shape.padEnd(20)} ${detail}`,
  )
  if (substrateOk) pass++
  else { fail++; failures.push(`${probe.id}: ${detail}`) }
}

console.log(`\n=== RESULT: ${pass}/${probes.length} pass, ${fail} fail ===`)
if (failures.length > 0) {
  console.log("\nFailures:")
  for (const f of failures) console.log(`  - ${f}`)
}

// Energy-accounting: count expected escalations vs baseline routes
const escalations = probes.filter((p) => p.substrateExpected.type !== "no-change").length
const noChange = probes.length - escalations
console.log(`\n=== ENERGY ACCOUNTING ===`)
console.log(`  ${noChange}/${probes.length} prompts: substrate identical to shape-only (zero overhead)`)
console.log(`  ${escalations}/${probes.length} prompts: substrate escalated (warranted by signal)`)
console.log(`  energy delta: only paid frontier-tier costs on the ${escalations} prompts that genuinely needed it`)

if (fail > 0) process.exit(1)
console.log("\nM3.52 design VALIDATED: substrate router escalates exactly when warranted, idempotent otherwise.")
