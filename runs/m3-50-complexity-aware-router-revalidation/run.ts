import { classifyTaskShape, route, type RouterOptions } from "../../src/router"

const apiKey = process.env.OPENROUTER_API_KEY!
const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

// Re-run M3.49 cost-loss tasks (T6, T8) + M3.47 T1 with M3.50 complexity-aware routing
const TASKS = [
  { l: "T6 simple SWE", p: "Fix the off-by-one bug in this Python: 'def avg(arr): return sum(arr[1:])/len(arr)'. Provide corrected one-liner." },
  { l: "T8 simple closed-book", p: "Without using any external tools, what year was the Treaty of Westphalia signed? One number only." },
  { l: "T1 simple bounded-code", p: "Write a one-line TypeScript function that reverses a string. Just the code, no explanation." },
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
  const auto = await dispatch(dec.target_model!, t.p)
  const baseline = await dispatch("openai/gpt-5.5", t.p)
  const ratio = auto.cost > 0 && baseline.cost > 0 ? +(auto.cost / baseline.cost).toFixed(3) : null
  console.log(`${t.l} [${cls.shape} complexity=${cls.complexity}] → ${dec.target_model}`)
  console.log(`  auto:     $${auto.cost} ${auto.latency_ms}ms`)
  console.log(`  baseline: $${baseline.cost} ${baseline.latency_ms}ms`)
  console.log(`  cost ratio: ${ratio}× ${auto.cost < baseline.cost ? "✓ NOW CHEAPER" : "✗ still loses"}`)
  console.log(`  outputs match: ${(auto.output.trim() === baseline.output.trim() ? "exact" : "different (manual check)")}`)
  console.log()
  results.push({ label: t.l, shape: cls.shape, complexity: cls.complexity, target: dec.target_model, auto, baseline, cost_ratio: ratio })
}

const totals = results.reduce((a, r) => ({ auto: a.auto + r.auto.cost, baseline: a.baseline + r.baseline.cost }), { auto: 0, baseline: 0 })
console.log("=".repeat(60))
console.log(`M3.50 AGGREGATE (3 cost-loss shapes from M3.49 re-run)`)
console.log(`  auto:     $${totals.auto.toFixed(6)} (was $0.022 in M3.49)`)
console.log(`  baseline: $${totals.baseline.toFixed(6)} (was $0.0027 in M3.49)`)
console.log(`  Cost ratio: ${(totals.auto/totals.baseline).toFixed(3)}× ${totals.auto < totals.baseline ? "✓ NOW CHEAPER" : "✗ still loses"}`)
console.log()
console.log(`M3.49 was 1.839× MORE EXPENSIVE on these 3 shapes`)
console.log(`M3.50 expectation: ≤1.0× (at parity or cheaper)`)
import { writeFileSync } from "node:fs"
writeFileSync("runs/m3-50-complexity-aware-router-revalidation/summary.json", JSON.stringify({ results, totals }, null, 2))
