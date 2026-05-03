import { classifyTaskShape, route, type RouterOptions } from "../../src/router"

const apiKey = process.env.OPENROUTER_API_KEY!
const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

const TASKS = [
  { l: "T6-agentic-swe", p: "Fix the off-by-one bug in this Python: 'def avg(arr): return sum(arr[1:])/len(arr)'. Provide corrected one-liner." },
  { l: "T7-classification", p: "Classify the sentiment of this review (positive/negative/neutral, one word only): 'The food was decent but service was slow.'" },
  { l: "T8-closed-book", p: "Without using any external tools, what year was the Treaty of Westphalia signed? One number only." },
  { l: "T9-real-world-coding", p: "Convert this CSV row to JSON object: 'name,age,city\\nAlice,30,NYC'. Return ONLY the JSON, no explanation." },
  { l: "T10-multi-step-reasoning", p: "If train A leaves city X at 9am traveling 60 mph, and train B leaves city Y (300 miles east) at 9:30am traveling 40 mph westward, at what time do they meet? Brief reasoning + answer." },
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
  const auto_target = dec.target_model || "[voter]"
  const auto = dec.use_voter ? { model: "voter-skipped", latency_ms: 0, cost: 0, output: "(voter shape - skipped for cost)" } : await dispatch(dec.target_model!, t.p)
  const baseline = await dispatch("openai/gpt-5.5", t.p)
  const ratio = auto.cost > 0 && baseline.cost > 0 ? +(auto.cost / baseline.cost).toFixed(3) : null
  console.log(`${t.l} [${cls.shape}] → ${auto_target}`)
  console.log(`  auto: $${auto.cost} | baseline: $${baseline.cost} | ratio ${ratio}×`)
  console.log(`  auto out:     ${auto.output.replace(/\n/g, " ⏎ ").slice(0, 90)}`)
  console.log(`  baseline out: ${baseline.output.replace(/\n/g, " ⏎ ").slice(0, 90)}`)
  console.log()
  results.push({ label: t.l, shape: cls.shape, auto_target, auto, baseline, cost_ratio: ratio })
}

const totals = results.reduce((a, r) => ({
  auto: a.auto + (r.auto.cost > 0 ? r.auto.cost : 0),
  baseline: a.baseline + r.baseline.cost,
}), { auto: 0, baseline: 0 })
console.log("=".repeat(60))
console.log(`M3.49 AGGREGATE (5 new tasks, post-fix router)`)
console.log(`  cheapcode-auto: $${totals.auto.toFixed(6)}`)
console.log(`  gpt-5.5 baseline: $${totals.baseline.toFixed(6)}`)
console.log(`  Cost ratio: ${(totals.auto/totals.baseline).toFixed(3)}× ${totals.auto < totals.baseline ? "✓ CHEAPER" : "✗ MORE EXPENSIVE"}`)
console.log()
console.log(`COMBINED M3.47+M3.48+M3.49 paired N=15 cost ratio (rough):`)
console.log(`  Tracked auto cost: $${(0.005049+0.005135+totals.auto).toFixed(6)}`)
console.log(`  Tracked baseline:  $${(0.06151+0.060095+totals.baseline).toFixed(6)}`)
console.log(`  Aggregate:         ${((0.005049+0.005135+totals.auto)/(0.06151+0.060095+totals.baseline)).toFixed(3)}×`)
import { writeFileSync } from "node:fs"
writeFileSync("runs/m3-49-paired-new-shapes/summary.json", JSON.stringify({ results, totals, cumulative_n: 15 }, null, 2))
