/**
 * Probe: confirm baseline model resolves on OpenRouter before
 * running the full experiment. ~$0.001 spend.
 */
import { generateText } from "ai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

const apiKey = process.env.OPENROUTER_API_KEY!
const or = createOpenRouter({ apiKey })

const candidates = [
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "anthropic/claude-haiku-4.5",
  "deepseek/deepseek-v4-flash",
]

for (const model of candidates) {
  const t0 = performance.now()
  try {
    const r = await generateText({ model: or(model), prompt: "Say OK." })
    const dt = (performance.now() - t0).toFixed(0)
    const cost = (r.usage as any)?.raw?.cost ?? 0
    console.log(`✓ ${model.padEnd(40)} ${dt}ms $${cost.toFixed(6)} → ${r.text.trim().slice(0, 30)}`)
  } catch (e: any) {
    const dt = (performance.now() - t0).toFixed(0)
    console.log(`✗ ${model.padEnd(40)} ${dt}ms ERROR: ${e.message?.slice(0, 80)}`)
  }
}
