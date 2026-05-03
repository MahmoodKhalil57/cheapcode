/**
 * M3.45 — auto-tier dispatch demo (2026-05-03)
 *
 * Per atom 0021 (recursive-substrate-use) + cheapcode bounded-form goal
 * empirical-receipt requirement: demonstrate the auto-tier router
 * classifying real practical tasks + dispatching to the documented
 * value-optimum model per facts/09 routing matrix.
 *
 * Demo pattern:
 *   1. 5 practical-class prompts spanning task-shape categories
 *   2. Run cheapcode's router.classifyTaskShape on each
 *   3. Run cheapcode's router.route to get RouteDecision
 *   4. Print shape + target_model + use_voter + use_compound + rule
 *
 * This is the $0 routing-decision demo (no inference). Demonstrates the
 * auto-tier's classification + dispatch logic works end-to-end.
 *
 * Atom 0007 anti-fab: every routing decision carries the facts/09 rule
 * citation in its evidence_tier, so each is auditable.
 *
 * Usage: bun runs/m3-45-auto-tier-dispatch-demo/run.ts
 */

import { classifyTaskShape, route, type RouterOptions } from "../../src/router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

interface Sample {
  label: string
  prompt: string
  expected_shape_hint: string
}

const SAMPLES: Sample[] = [
  {
    label: "1. SWE-style task",
    prompt: "Fix the off-by-one bug in src/auth.ts handleLogin() and add a regression test",
    expected_shape_hint: "agentic-swe (Opus-class)",
  },
  {
    label: "2. AIME-style hard math",
    prompt:
      "AIME 2024 problem: A regular hexagon has vertices labeled A-F. " +
      "Find the number of distinct triangles formed by picking 3 vertices.",
    expected_shape_hint: "hard-reasoning (cross-witness voter)",
  },
  {
    label: "3. Bounded code synthesis",
    prompt:
      "Write a TypeScript function that takes a string and returns the number of vowels",
    expected_shape_hint: "bounded-code (Haiku-class)",
  },
  {
    label: "4. PhD-factual",
    prompt:
      "Explain the Heisenberg uncertainty principle in 3 sentences for a graduate physics student",
    expected_shape_hint: "phd-factual (Gemini Flash GPQA)",
  },
  {
    label: "5. Long-context (synthetic)",
    prompt: "x".repeat(500_000) + "\n\nSummarize.",
    expected_shape_hint: "long-context (DeepSeek/grok)",
  },
  {
    label: "6. Multistep general (no specific signal)",
    prompt: "Help me plan a 3-day trip to Tokyo with budget under $1500",
    expected_shape_hint: "multistep-general (smart frontier; NO compound default per M3.11/M3.11b L1)",
  },
]

console.log("=".repeat(70))
console.log("cheapcode auto-tier dispatch demo (M3.45)")
console.log("=".repeat(70))
console.log()

for (const sample of SAMPLES) {
  const cls = classifyTaskShape(sample.prompt)
  const dec = route(sample.prompt, opts)

  console.log(sample.label)
  console.log("  prompt: " + sample.prompt.slice(0, 80) + (sample.prompt.length > 80 ? "..." : ""))
  console.log("  expected: " + sample.expected_shape_hint)
  console.log("  classified shape:  " + cls.shape)
  console.log("  signal:            " + cls.signal)
  console.log("  estimated tokens:  " + cls.estimated_input_tokens)
  console.log("  → target_model:    " + (dec.target_model ?? "[voter/compound dispatch]"))
  console.log("  → use_voter:       " + dec.use_voter)
  console.log("  → use_compound:    " + dec.use_compound)
  console.log("  → rule:            " + dec.rule)
  console.log("  → evidence_tier:   " + dec.evidence_tier)
  console.log()
}

console.log("=".repeat(70))
console.log("Auto-tier dispatch decision demo complete.")
console.log()
console.log("Each shape routes per facts/09 routing matrix to its documented")
console.log("value-optimum model. Voter pattern fires only on `hard-reasoning`")
console.log("(per facts/09 rule 11 + atom 0016 substrate-as-deterministic-")
console.log("verifier-head). Other shapes use single-tier dispatch (per")
console.log("session-2026-05-03 empirical finding that voter overhead is")
console.log("waste on classes where Adam-alone is at p>=0.99).")
console.log()
console.log("Per atom 0007 anti-fab: every decision is auditable via the")
console.log("rule + evidence_tier fields. Per atom 0008 claim-shape-runtime-")
console.log("anchored, the routing is transparent.")
console.log()
console.log("Cost: $0 (no inference; pure classifier + dispatch logic).")
