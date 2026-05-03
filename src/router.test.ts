/**
 * router.test.ts — sanity tests for task-shape classifier and dispatch.
 * Run: bun test src/router.test.ts
 */

import { test, expect } from "bun:test"
import { classifyTaskShape, route, type RouterOptions } from "./router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
}

test("classifies long-context by token threshold", () => {
  const huge = "x".repeat(500_000) // ~125k tokens
  expect(classifyTaskShape(huge).shape).toBe("long-context")
})

test("classifies SWE-style prompts as agentic-swe", () => {
  expect(classifyTaskShape("Fix the bug in auth.ts and create a PR").shape).toBe("agentic-swe")
})

test("classifies math problems as math-chain (short, non-AIME)", () => {
  expect(classifyTaskShape("Find the smallest n such that n^2 ≡ 1 mod 7").shape).toBe("math-chain")
  // M3.18: explicit AIME marker now routes to hard-reasoning (cross-witness voter)
})

test("classifies bounded code as bounded-code", () => {
  expect(
    classifyTaskShape("Implement a function that reverses a linked list").shape,
  ).toBe("bounded-code")
})

test("classifies classification asks as classification", () => {
  expect(classifyTaskShape("Categorize the following text as positive or negative").shape).toBe(
    "classification",
  )
})

test("classifies computer-use as computer-use", () => {
  expect(classifyTaskShape("Open the file foo.ts and click the run button").shape).toBe(
    "computer-use",
  )
})

test("classifies sub-second latency", () => {
  expect(classifyTaskShape("Real-time streaming response").shape).toBe("subsecond-latency")
})

test("falls through to multistep-general when nothing matches", () => {
  expect(classifyTaskShape("Tell me about the history of Rome.").shape).toBe(
    "multistep-general",
  )
})

test("route dispatches multistep-general to smart-target without compound by default", () => {
  const decision = route("Tell me about the history of Rome.", opts)
  expect(decision.shape).toBe("multistep-general")
  expect(decision.use_compound).toBe(false)
  expect(decision.target_model).toBe(opts.smartTarget)
})

test("route dispatches long-context to longContextTarget", () => {
  const decision = route("x".repeat(500_000), opts)
  expect(decision.shape).toBe("long-context")
  expect(decision.target_model).toBe(opts.longContextTarget)
})

test("route honors per-shape overrides", () => {
  const decision = route("Tell me about the history of Rome.", {
    ...opts,
    routeOverrides: { "multistep-general": "anthropic/claude-opus-4" },
  })
  expect(decision.target_model).toBe("anthropic/claude-opus-4")
})

test("route opt-in compound for multistep-general", () => {
  const decision = route("Tell me about the history of Rome.", {
    ...opts,
    forceCompoundOnMultistep: true,
  })
  expect(decision.use_compound).toBe(true)
  expect(decision.target_model).toBeNull()
})

test("route to bounded-code uses Haiku 4.5 by default", () => {
  const decision = route("Implement a function that sorts an array", opts)
  expect(decision.shape).toBe("bounded-code")
  expect(decision.target_model).toBe("anthropic/claude-haiku-4.5")
  expect(decision.use_compound).toBe(false)
})

test("route to math-chain uses cheap target (DeepSeek)", () => {
  const decision = route("Prove that for all n, gcd(n, n+1) = 1", opts)
  expect(decision.shape).toBe("math-chain")
  expect(decision.target_model).toBe(opts.cheapTarget)
})

test("each decision carries a rule citation + evidence tier", () => {
  const decision = route("Implement a function that sorts an array", opts)
  expect(decision.rule).toContain("facts/09")
  expect(["L1", "L1+L4", "L4", "L4+operator-L1"]).toContain(decision.evidence_tier)
})

test("classifies AIME-style prompts as hard-reasoning (M3.18)", () => {
  const aimePrompt =
    "There exist real numbers x and y, both greater than 1, such that log_x(y^x)=log_y(x^(4y))=10. Find xy. " +
    "This is an AIME problem. The answer is an integer between 0 and 999."
  expect(classifyTaskShape(aimePrompt).shape).toBe("hard-reasoning")
})

test("hard-reasoning routes to cross-witness voter (use_voter=true, target_model=null)", () => {
  const aimePrompt = "AIME 2024 problem: find all positive integers n such that n^2 - 5n + 6 = 0"
  const decision = route(aimePrompt, opts)
  expect(decision.shape).toBe("hard-reasoning")
  expect(decision.use_voter).toBe(true)
  expect(decision.use_compound).toBe(false)
  expect(decision.target_model).toBeNull()
  expect(decision.rule).toContain("rule 11")
  expect(decision.rule).toContain("cross-witness")
})

test("simple math (no AIME marker, short) still routes to math-chain not hard-reasoning", () => {
  const decision = route("Prove that for all n, gcd(n, n+1) = 1", opts)
  expect(decision.shape).toBe("math-chain")
  expect(decision.use_voter).toBe(false)
})
