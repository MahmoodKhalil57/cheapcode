/**
 * M3.53 — Quota-aware routing demo (no LLM calls; routing-decision only).
 *
 * Demonstrates the substrate's quota-state driving fallback selection in
 * a simulated session: 200 dispatches against gpt-5.4-mini's documented
 * ChatGPT-Plus rate ceiling. Watch the router cross over to OpenRouter
 * mirror once estimated quota dips below the floor.
 *
 * Run: bun runs/m3-53-quota-aware-routing/run.ts
 */

import { route, type RouterOptions } from "../../src/router"
import { defaultQuotaState, trackDispatch, quotaRemaining } from "../../src/mizan-shim"

const opts: Omit<RouterOptions, "quotaState"> = {
  smartTarget: "openai/gpt-5.4-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  quotaFallbacks: { "openai/gpt-5.4-mini": "openrouter/openai/gpt-5.4-mini" },
  quotaFloor: 0.10,
}

const quotaState = defaultQuotaState()
const prompt = "Explain the difference between map and forEach"

console.log("=== M3.53 quota-aware routing (simulated 200 dispatches) ===\n")
console.log("Quota: ChatGPT-Plus default for gpt-5.4-mini = 200 calls / 3hr window")
console.log("Floor: 10% remaining → switch to OpenRouter mirror\n")

let crossoverAt = -1
let primaryDispatches = 0
let fallbackDispatches = 0

for (let i = 1; i <= 220; i++) {
  const decision = route(prompt, { ...opts, quotaState })
  const target = decision.target_model
  const remaining = quotaRemaining(quotaState, "openai", "gpt-5.4-mini")

  if (target === "openrouter/openai/gpt-5.4-mini" && crossoverAt === -1) {
    crossoverAt = i
    console.log(`*** CROSSOVER at dispatch #${i} (quota=${(remaining * 100).toFixed(1)}%) ***`)
    console.log(`    rule: ${decision.rule}\n`)
  }
  if (target === opts.smartTarget) {
    primaryDispatches++
    trackDispatch(quotaState, "openai", "gpt-5.4-mini")
  } else if (target === "openrouter/openai/gpt-5.4-mini") {
    fallbackDispatches++
    trackDispatch(quotaState, "openrouter", "openai/gpt-5.4-mini")
  }

  if (i % 20 === 0 || i === 1) {
    console.log(
      `  #${String(i).padStart(3)} target=${target?.padEnd(34)} quota_oai=${(remaining * 100).toFixed(0)}%`,
    )
  }
}

console.log(`\n=== RESULT ===`)
console.log(`  primary (openai/gpt-5.4-mini):       ${primaryDispatches}/220 dispatches`)
console.log(`  fallback (openrouter/openai/gpt-5.4-mini): ${fallbackDispatches}/220 dispatches`)
console.log(`  crossover at dispatch #${crossoverAt}`)
console.log(`  expected crossover: ~#180 (90% of 200-quota floor at 10%)`)

if (crossoverAt < 175 || crossoverAt > 185) {
  console.error(`\nFAIL: crossover at ${crossoverAt} outside expected ~#180 ± 5 range`)
  process.exit(1)
}
console.log(`\nM3.53 quota-aware routing VALIDATED.`)
