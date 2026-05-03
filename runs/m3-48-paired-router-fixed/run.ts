import { classifyTaskShape, route, type RouterOptions } from "../../src/router"
import { runCrossWitnessVoter } from "../../src/cross-witness-voter"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const apiKey = process.env.OPENROUTER_API_KEY!
const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}
const openrouter = createOpenRouter({
  apiKey,
  headers: { "HTTP-Referer": "https://github.com/cheapcode", "X-Title": "cheapcode-m3-48-paired-fixed" },
})

interface S { l: string; p: string }
const TASKS: S[] = [
  { l: "T1-bounded-code", p: "Write a one-line TypeScript function that reverses a string. Just the code, no explanation." },
  { l: "T2-math-chain", p: "Compute the sum of digits of 2^31 - 1. Reply with exactly one number." },
  { l: "T3-phd-factual", p: "Explain Heisenberg uncertainty principle in 2 sentences for a graduate physics student. State Δx·Δp ≥ ℏ/2." },
  { l: "T4-multistep-general", p: "Plan a 3-day Tokyo trip under $1500. Provide a structured day-by-day itinerary." },
  { l: "T5-hard-reasoning", p: "On an island there are 13 purple, 15 yellow, 17 maroon chameleons. When two different-color chameleons meet, both change to the third color. Same color meeting changes nothing. Can all chameleons eventually become the same color? Reply yes or no, then briefly justify." },
]

async function dispatch(modelId: string, prompt: string) {
  const t0 = performance.now()
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }], max_tokens: 1500, reasoning: { effort: "low" } }),
  })
  const j: any = await r.json()
  return { model: modelId, latency_ms: Math.round(performance.now() - t0), cost: j.usage?.cost ?? 0, output: (j.choices?.[0]?.message?.content || "").slice(0, 200) }
}

const results: any[] = []
for (const t of TASKS) {
  const cls = classifyTaskShape(t.p)
  const dec = route(t.p, opts)
  let auto: any
  let auto_target = dec.target_model || "[voter]"
  if (dec.use_voter) {
    const cheapModel = openrouter("deepseek/deepseek-v4-flash")
    const smartModel = openrouter("openai/gpt-5-mini")
    const t0 = performance.now()
    try {
      const v = await runCrossWitnessVoter(t.p, { cheap: cheapModel, smart: smartModel, perCallTimeoutMs: 60000 })
      auto = { model: "voter", latency_ms: Math.round(performance.now() - t0), cost: -1, output: v.text.slice(0, 200) }
    } catch (e: any) {
      auto = { model: "voter-error", latency_ms: 0, cost: 0, output: e.message }
    }
  } else {
    auto = await dispatch(dec.target_model!, t.p)
  }
  const baseline = await dispatch("openai/gpt-5.5", t.p)
  const cost_ratio = auto.cost > 0 && baseline.cost > 0 ? +(auto.cost / baseline.cost).toFixed(3) : null
  console.log(`${t.l} [${cls.shape}] → ${auto_target}`)
  console.log(`  auto: $${auto.cost} ${auto.latency_ms}ms | baseline: $${baseline.cost} ${baseline.latency_ms}ms | ratio ${cost_ratio}×`)
  console.log(`  auto out:     ${auto.output.replace(/\n/g, " ⏎ ").slice(0, 100)}`)
  console.log(`  baseline out: ${baseline.output.replace(/\n/g, " ⏎ ").slice(0, 100)}`)
  console.log()
  results.push({ label: t.l, shape: cls.shape, auto_target, auto, baseline, cost_ratio })
}

const totals = results.reduce((a, r) => ({
  auto: a.auto + (r.auto.cost > 0 ? r.auto.cost : 0),
  baseline: a.baseline + r.baseline.cost,
  auto_lat: a.auto_lat + r.auto.latency_ms,
  baseline_lat: a.baseline_lat + r.baseline.latency_ms,
}), { auto: 0, baseline: 0, auto_lat: 0, baseline_lat: 0 })
console.log("=".repeat(60))
console.log(`AGGREGATE (5 tasks, post-router-fix)`)
console.log(`  cheapcode-auto: $${totals.auto.toFixed(6)}, ${totals.auto_lat}ms total`)
console.log(`  gpt-5.5 baseline: $${totals.baseline.toFixed(6)}, ${totals.baseline_lat}ms total`)
console.log(`  Cost ratio: ${(totals.auto/totals.baseline).toFixed(3)}×`)
console.log(`  Latency ratio: ${(totals.auto_lat/totals.baseline_lat).toFixed(2)}×`)
import { writeFileSync } from "node:fs"
writeFileSync("runs/m3-48-paired-router-fixed/summary.json", JSON.stringify({ results, totals }, null, 2))
