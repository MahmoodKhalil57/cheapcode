import { classifyTaskShape, route, type RouterOptions } from "../../src/router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

const TASK = "Write a one-line TypeScript function that takes a string and returns it reversed. No explanation, just the code."

const cls = classifyTaskShape(TASK)
const dec = route(TASK, opts)

console.log("=== M3.46 — auto-tier real inference end-to-end ===")
console.log("Task: " + TASK)
console.log("Routed to shape: " + cls.shape)
console.log("Target model: " + dec.target_model)
console.log("Rule: " + dec.rule)
console.log()

const t0 = performance.now()
const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": "cheapcode-m3-46-auto-tier-real-inference",
  },
  body: JSON.stringify({
    model: dec.target_model,
    messages: [{ role: "user", content: TASK }],
    max_tokens: 200,
  }),
})
const j: any = await r.json()
const latency = performance.now() - t0

console.log("=== Response ===")
console.log(j.choices?.[0]?.message?.content)
console.log()
console.log("=== Receipt ===")
console.log("Latency: " + latency.toFixed(0) + "ms")
console.log("Cost: $" + (j.usage?.cost ?? "n/a"))
console.log("Tokens: prompt=" + (j.usage?.prompt_tokens ?? "?") + " completion=" + (j.usage?.completion_tokens ?? "?"))
console.log()
console.log("End-to-end: classifier → router → OpenRouter dispatch → response")
console.log("All decisions auditable per atom 0007 anti-fab + atom 0008 claim-shape-runtime-anchored.")
