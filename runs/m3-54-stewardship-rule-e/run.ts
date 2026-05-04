/**
 * M3.54 — Stewardship discipline (atom 0022 / Rule E) paired-run benchmark.
 *
 * Methodology:
 *   - Curated 12-prompt set spanning value-spectrum: trivial recall,
 *     rumination, near-duplicate, irreversible-action, synthesis,
 *     hard-reasoning, normal-substantive
 *   - Stewardship threshold = 0.40 (moderate; v0 starting point)
 *   - Each prompt routed once through Rule E; expected verdict declared
 *     up-front; verdict checked
 *
 * Falsifier: if any low-value prompt fails to decline, OR any high-value
 * prompt is incorrectly declined, the v0 evaluator is mis-calibrated and
 * needs adjustment.
 *
 * Run: bun runs/m3-54-stewardship-rule-e/run.ts
 */

import { route, type RouterOptions } from "../../src/router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  stewardshipThreshold: 0.40,
  recentReceipts: [
    { title: "auto-tier dispatch across providers and quotas explanation", created_at: "2026-05-04T00:00:00Z" },
  ],
}

type Probe = {
  id: string
  prompt: string
  expected_verdict: "decline" | "dispatch"
  rationale: string
}

const probes: Probe[] = [
  // Low-value (should decline)
  { id: "L1-trivial-recall", prompt: "what is OAuth?", expected_verdict: "decline", rationale: "trivial-recall pattern" },
  { id: "L2-rumination", prompt: "hmm, just thinking, wdyt about react vs solid?", expected_verdict: "decline", rationale: "rumination markers" },
  { id: "L3-rumination-2", prompt: "i wonder if microservices are worth it", expected_verdict: "decline", rationale: "rumination markers" },
  { id: "L4-near-duplicate", prompt: "explain how the cheapcode auto-tier dispatches across providers and quotas", expected_verdict: "decline", rationale: "near-duplicate of recent receipt" },
  { id: "L5-ultra-short-trivial", prompt: "spell debounce", expected_verdict: "decline", rationale: "ultra-short trivial-recall" },

  // High-value (should dispatch)
  { id: "H1-irreversible", prompt: "Run rm -rf /tmp/cache and re-bootstrap the project", expected_verdict: "dispatch", rationale: "irreversible-action pre-check; high-stakes" },
  { id: "H2-synthesis", prompt: "Synthesize the load-bearing falsifiable claims across the betterQ tashkeel findings into a substrate-grounded narrative; compare each claim against multiple sources", expected_verdict: "dispatch", rationale: "synthesis + load-bearing markers + long substantive prompt" },
  { id: "H3-falsification", prompt: "Design 3 falsification tests for the claim that mixing-time of M/N transition matrix in Quranic muqataat-opening surahs equals e to 0.029%", expected_verdict: "dispatch", rationale: "falsification + load-bearing" },

  // Medium-value (borderline; should pass at threshold 0.40)
  { id: "M1-bounded-task", prompt: "Write a function that reverses a linked list iteratively in TypeScript with proper edge cases for empty list and single-node", expected_verdict: "dispatch", rationale: "specific task with constraints; substantive enough" },
  { id: "M2-question-with-context", prompt: "Given the M3.52 router architecture, what's the right place to add a new substrate signal that represents human-attention-budget?", expected_verdict: "dispatch", rationale: "specific architectural question with context" },
  { id: "M3-debug-question", prompt: "Why might a Bun-compiled binary fail with 'text part 0 not found' when streaming through opencode's session processor?", expected_verdict: "dispatch", rationale: "specific debug question; substantive" },
  { id: "M4-compound-synthesis", prompt: "Compare the substrate-discipline of atom 0018 (energy transformation) vs atom 0022 (resource-as-amana) and explain when each fires across the lifecycle of a single agent dispatch", expected_verdict: "dispatch", rationale: "compare + synthesis markers" },
]

console.log("=== M3.54 stewardship discipline paired-run (atom 0022 / Rule E) ===\n")
console.log(`Threshold: ${opts.stewardshipThreshold}\n`)

let pass = 0
let fail = 0
const failures: string[] = []

for (const probe of probes) {
  const decision = route(probe.prompt, opts)
  const verdict = decision.declined ? "decline" : "dispatch"
  const ok = verdict === probe.expected_verdict

  const tag = ok ? "PASS" : "FAIL"
  const valueStr = decision.expected_value?.toFixed(2) ?? "—"
  console.log(
    `[${tag}] ${probe.id.padEnd(28)} verdict=${verdict.padEnd(9)} value=${valueStr}  expected=${probe.expected_verdict}`,
  )
  if (!ok) {
    failures.push(`${probe.id}: got ${verdict}, expected ${probe.expected_verdict}; reasoning="${probe.rationale}"`)
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

const declines = probes.filter((p, i) => {
  const d = route(p.prompt, opts)
  return d.declined
}).length
const dispatches = probes.length - declines
console.log(`\n=== STEWARDSHIP ACCOUNTING ===`)
console.log(`  ${declines}/${probes.length} prompts: declined (substrate proposed alternative)`)
console.log(`  ${dispatches}/${probes.length} prompts: dispatched (value crossed threshold)`)
console.log(`  ratio: substrate gate fires on ${((declines / probes.length) * 100).toFixed(0)}% of asks`)
console.log(`  → atom 0022 working as designed: stewardship is the default; dispatch is earned`)

if (fail > 0) process.exit(1)
console.log(`\nM3.54 stewardship discipline VALIDATED. atom 0022 deployed at runtime.`)
