import { classifyTaskShape, route, type RouterOptions } from "../../src/router"
import { runCrossWitnessVoter } from "../../src/cross-witness-voter"
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

const openrouter = createOpenRouter({
  apiKey,
  headers: { "HTTP-Referer": "https://github.com/cheapcode", "X-Title": "cheapcode-m3-47-paired" },
})

interface Sample { label: string; prompt: string }

const TASKS: Sample[] = [
  { label: "T1-bounded-code", prompt: "Write a one-line TypeScript function that reverses a string. Just the code, no explanation." },
  { label: "T2-math-chain",   prompt: "Compute the sum of digits of 2^31 - 1. Reply with exactly one number." },
  { label: "T3-phd-factual",  prompt: "Explain Heisenberg's uncertainty principle in 2 sentences for a graduate physics student. State Δx·Δp ≥ ℏ/2." },
  { label: "T4-multistep-general", prompt: "Plan a 3-day Tokyo trip under $1500. Provide a structured day-by-day itinerary." },
  { label: "T5-hard-reasoning", prompt: "On an island there are 13 purple, 15 yellow, 17 maroon chameleons. When two different-color chameleons meet, both change to the third color. Same color meeting changes nothing. Can all chameleons eventually become the same color? Reply yes or no, then briefly justify." },
]

async function dispatch(modelId: string, prompt: string, label: string) {
  const t0 = performance.now()
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }], max_tokens: 1500, reasoning: { effort: "low" } }),
  })
  const j: any = await r.json()
  const lat = performance.now() - t0
  return { model: modelId, latency_ms: Math.round(lat), cost: j.usage?.cost ?? 0, output: (j.choices?.[0]?.message?.content || "").slice(0, 250) }
}

const results: any[] = []
for (const t of TASKS) {
  const cls = classifyTaskShape(t.prompt)
  const dec = route(t.prompt, opts)
  
  // CHEAPCODE-AUTO dispatch
  let auto_target = dec.target_model || "[voter]"
  let auto_result: any
  if (dec.use_voter) {
    // Hard-reasoning shape: invoke cross-witness voter
    const cheapModel = openrouter("deepseek/deepseek-v4-flash")
    const smartModel = openrouter("openai/gpt-5-mini")
    const t0 = performance.now()
    try {
      const v = await runCrossWitnessVoter(t.prompt, { cheap: cheapModel, smart: smartModel, perCallTimeoutMs: 60000 })
      auto_result = { model: "voter(cheap×2+smart_c)", latency_ms: Math.round(performance.now() - t0), cost: -1, output: v.text.slice(0, 250) }
    } catch (e: any) {
      auto_result = { model: "voter-error", latency_ms: 0, cost: 0, output: e.message.slice(0, 200) }
    }
  } else {
    auto_result = await dispatch(dec.target_model!, t.prompt, t.label)
  }
  
  // BASELINE: gpt-5.5 direct
  const baseline = await dispatch("openai/gpt-5.5", t.prompt, t.label)
  
  const r = {
    label: t.label,
    shape: cls.shape,
    auto_target,
    auto: auto_result,
    baseline,
    cost_ratio: auto_result.cost > 0 && baseline.cost > 0 ? +(auto_result.cost / baseline.cost).toFixed(3) : null,
    latency_ratio: auto_result.latency_ms > 0 && baseline.latency_ms > 0 ? +(auto_result.latency_ms / baseline.latency_ms).toFixed(2) : null,
  }
  results.push(r)
  console.log(`${t.label} [${cls.shape}]`)
  console.log(`  auto (${auto_target}): $${auto_result.cost} ${auto_result.latency_ms}ms`)
  console.log(`    out: ${auto_result.output.replace(/\n/g, " ⏎ ").slice(0, 120)}`)
  console.log(`  baseline (gpt-5.5):   $${baseline.cost} ${baseline.latency_ms}ms`)
  console.log(`    out: ${baseline.output.replace(/\n/g, " ⏎ ").slice(0, 120)}`)
  console.log(`  cost ratio: ${r.cost_ratio}× | latency ratio: ${r.latency_ratio}×`)
  console.log()
}

const totals = results.reduce((acc, r) => ({
  auto: acc.auto + (r.auto.cost > 0 ? r.auto.cost : 0),
  baseline: acc.baseline + r.baseline.cost,
  auto_lat: acc.auto_lat + r.auto.latency_ms,
  baseline_lat: acc.baseline_lat + r.baseline.latency_ms,
}), { auto: 0, baseline: 0, auto_lat: 0, baseline_lat: 0 })

console.log("=".repeat(60))
console.log(`AGGREGATE (5 tasks)`)
console.log(`  cheapcode-auto: $${totals.auto.toFixed(6)}, ${totals.auto_lat}ms total`)
console.log(`  gpt-5.5 baseline: $${totals.baseline.toFixed(6)}, ${totals.baseline_lat}ms total`)
console.log(`  Cost ratio: ${(totals.auto/totals.baseline).toFixed(3)}× ${totals.auto < totals.baseline ? "(cheapcode CHEAPER ✓)" : "(cheapcode more expensive ✗)"}`)
console.log(`  Latency ratio: ${(totals.auto_lat/totals.baseline_lat).toFixed(2)}× ${totals.auto_lat < totals.baseline_lat ? "(cheapcode FASTER ✓)" : "(cheapcode slower ✗)"}`)

import { writeFileSync } from "node:fs"
writeFileSync("runs/m3-47-paired-auto-vs-baseline/summary.json", JSON.stringify({ results, totals }, null, 2))
