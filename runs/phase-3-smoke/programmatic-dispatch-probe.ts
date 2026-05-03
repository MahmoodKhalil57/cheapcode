import { createCheapcodeProvider } from "@cheapcode/ai-sdk-provider"
import { generateText } from "ai"

const provider = createCheapcodeProvider({ apiKey: process.env.OPENROUTER_API_KEY!, appName: "cheapcode-probe" })
const m = provider.languageModel("cheap")
console.log("Calling generateText directly with our cheap-tier model...")
const r = await generateText({ model: m as any, prompt: "Reply with just: hello" })
console.log("✅ Direct call succeeded")
console.log("text:", r.text)
console.log("usage:", JSON.stringify(r.usage))
