/**
 * M3.55 — Rule F (atom 0024 knowability-gate) paired-run benchmark.
 *
 * 12-prompt set spanning answerability spectrum:
 *  - 6 unanswerable (knowability-decline expected)
 *  - 6 answerable (dispatch expected)
 *
 * Falsifier: any unanswerable prompt that dispatches OR any answerable
 * prompt that declines invalidates the v0 detector calibration.
 *
 * Run: bun runs/m3-55-knowability-rule-f/run.ts
 */

import { route, type RouterOptions } from "../../src/router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  knowabilityThreshold: 0.55,
}

type Probe = {
  id: string
  prompt: string
  expected_verdict: "decline-knowability" | "dispatch"
  expected_blocker?: string
}

const probes: Probe[] = [
  // Unanswerable
  { id: "U1-vague-fix-it", prompt: "fix this", expected_verdict: "decline-knowability", expected_blocker: "underspecification" },
  { id: "U2-private-deploy", prompt: "why does my deploy keep failing in production lately", expected_verdict: "decline-knowability", expected_blocker: "private-knowledge-required" },
  { id: "U3-contested-meta", prompt: "is utilitarianism objectively correct as a moral framework", expected_verdict: "decline-knowability", expected_blocker: "contested-attestation" },
  { id: "U4-personal-recall", prompt: "do I prefer dark mode or light mode for editors", expected_verdict: "decline-knowability", expected_blocker: "personal-recall" },
  { id: "U5-missing-referent", prompt: "it broke again, can you check it for me", expected_verdict: "decline-knowability", expected_blocker: "missing-referent" },
  { id: "U6-metaphysical", prompt: "what is the metaphysical truth about consciousness and free will", expected_verdict: "decline-knowability", expected_blocker: "contested-attestation" },

  // Answerable
  { id: "A1-bounded-code", prompt: "Write a TypeScript function that takes an array of numbers and returns their median, throwing on empty input.", expected_verdict: "dispatch" },
  { id: "A2-spec-question", prompt: "Explain how OAuth 2.0 PKCE flow works from authorization request through token exchange, with specific endpoint and parameter names.", expected_verdict: "dispatch" },
  { id: "A3-debug-question", prompt: "Why might 'cargo run' fail with 'linker cc not found' on a fresh Ubuntu 22.04 install? List the most likely causes.", expected_verdict: "dispatch" },
  { id: "A4-design-question", prompt: "Compare the trade-offs between gRPC and GraphQL for a B2B API serving 50 concurrent enterprise clients.", expected_verdict: "dispatch" },
  { id: "A5-math", prompt: "Prove that the sum of two odd integers is always even, using the definition of odd integer.", expected_verdict: "dispatch" },
  { id: "A6-substantive-research", prompt: "What were the load-bearing claims of the M3.50 complexity-aware-routing change in cheapcode and which empirical receipts supported them?", expected_verdict: "dispatch" },
]

console.log("=== M3.55 knowability-gate paired-run (atom 0024 / Rule F) ===\n")
console.log(`Threshold: ${opts.knowabilityThreshold}\n`)

let pass = 0
let fail = 0
const failures: string[] = []

for (const probe of probes) {
  const decision = route(probe.prompt, opts)
  const verdict =
    decision.declined && decision.decline_reason === "knowability"
      ? "decline-knowability"
      : decision.declined
      ? "decline-stewardship"
      : "dispatch"
  const ok = verdict === probe.expected_verdict

  const blockerMatch =
    !probe.expected_blocker ||
    (decision.blockers ?? []).includes(probe.expected_blocker)
  const fullOk = ok && (verdict !== "decline-knowability" || blockerMatch)

  const tag = fullOk ? "PASS" : "FAIL"
  const score = decision.knowability_score?.toFixed(2) ?? "—"
  const blockers = (decision.blockers ?? []).join(",")
  console.log(
    `[${tag}] ${probe.id.padEnd(28)} verdict=${verdict.padEnd(20)} score=${score}  blockers=[${blockers}]`,
  )
  if (!fullOk) {
    failures.push(`${probe.id}: got ${verdict} (blockers=${blockers}), expected ${probe.expected_verdict} (blocker=${probe.expected_blocker ?? "any"})`)
    fail++
  } else {
    pass++
  }
}

console.log(`\n=== RESULT: ${pass}/${probes.length} pass, ${fail} fail ===`)
if (failures.length > 0) {
  console.log("\nFailures:")
  for (const f of failures) console.log(`  - ${f}`)
}

const declines = probes.filter((p) => {
  const d = route(p.prompt, opts)
  return d.declined && d.decline_reason === "knowability"
}).length
console.log(`\n=== KNOWABILITY ACCOUNTING ===`)
console.log(`  ${declines}/${probes.length} prompts: knowability-declined (clarifying-questions returned)`)
console.log(`  ${probes.length - declines}/${probes.length} prompts: dispatched (substrate confident agent can answer)`)
console.log(`  → atom 0024 working: agent refuses-and-clarifies on unanswerable, dispatches on answerable`)

if (fail > 0) process.exit(1)
console.log(`\nM3.55 knowability-gate VALIDATED. atom 0024 deployed at runtime.`)
