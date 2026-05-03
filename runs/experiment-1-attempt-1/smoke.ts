/**
 * Smoke test: verify cheapcode provider connects to OpenRouter and
 * returns text. Single cheap-tier call, ~$0.0001 spend.
 *
 * Run: bun runs/experiment-1-attempt-1/smoke.ts
 */
import { generateText } from "ai"
import { createCheapcodeProvider } from "../../src/cheapcode-tiers"

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) {
  console.error("OPENROUTER_API_KEY not set")
  process.exit(1)
}

const cheapcode = createCheapcodeProvider({ apiKey, appName: "cheapcode-smoke" })

console.log("→ smoke: invoking cheap tier with one prompt")
const t0 = performance.now()
const result = await generateText({
  model: cheapcode("cheap"),
  prompt: "What is 2+2? Answer with just the number.",
})
const dtMs = (performance.now() - t0).toFixed(0)

console.log(`✓ response (${dtMs}ms): ${result.text.trim()}`)
console.log(`✓ usage: ${JSON.stringify(result.usage)}`)
console.log(`✓ finishReason: ${result.finishReason}`)
