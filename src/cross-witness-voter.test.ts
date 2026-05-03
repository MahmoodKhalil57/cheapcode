/**
 * cross-witness-voter.test.ts — sanity tests for the substrate-runtime
 * voter (M3.18). Mocks LanguageModel layer with deterministic responses.
 *
 * Tests cover the 4 outcome paths:
 *   - sahih (cheap pair converges)
 *   - hasan (cheap pair diverges; smart agrees with one)
 *   - hasan (cheap pair diverges; smart agrees with other)
 *   - daif (3-way disagreement)
 *
 * Plus extractAnswer regex coverage and timeout failure modes.
 */

import { test, expect } from "bun:test"
import { runCrossWitnessVoter, extractAnswer, type VoterConfig } from "./cross-witness-voter"

function fakeModel(responseText: string, delayMs = 0) {
  return {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake",
    async doGenerate() {
      await new Promise((r) => setTimeout(r, delayMs))
      return {
        content: [{ type: "text", text: responseText }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any
}

function hangingModel() {
  return {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-hang",
    doGenerate() {
      return new Promise(() => {})
    },
  } as any
}

test("extractAnswer handles 'Answer: N' format", () => {
  expect(extractAnswer("Some reasoning.\nAnswer: 42")).toBe("42")
  expect(extractAnswer("answer: -3.14")).toBe("-3.14")
  expect(extractAnswer("Final answer = 100")).toBe("100")
})

test("extractAnswer handles boxed format", () => {
  expect(extractAnswer("So the answer is \\boxed{197}")).toBe("197")
  expect(extractAnswer("...therefore boxed{321}")).toBe("321")
})

test("extractAnswer falls back to trailing integer", () => {
  expect(extractAnswer("Long reasoning... 371")).toBe("371")
})

test("extractAnswer returns null when no number visible", () => {
  expect(extractAnswer("I don't know")).toBeNull()
})

test("voter returns sahih when cheap pair converges", async () => {
  const cfg: VoterConfig = {
    cheap: fakeModel("Reasoning A.\nAnswer: 25"),
    smart: fakeModel("Should not be called.\nAnswer: 99"),
    perCallTimeoutMs: 1000,
  }
  // BOTH cheap calls return same answer (same model used for cheap-a and cheap-b)
  const result = await runCrossWitnessVoter("Find xy", cfg)
  expect(result.trace.convergence).toBe("sahih")
  expect(result.trace.agreed_answer).toBe("25")
  expect(result.trace.escalated).toBe(false)
  expect(result.trace.witnesses.length).toBe(2)
})

test("voter escalates to smart when cheap pair diverges; smart agrees with cheap-a → hasan", async () => {
  // We need cheap_a and cheap_b to give different answers; smart agrees with a.
  // Use a counter-based model that returns different text per call.
  let callCount = 0
  const dualCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-dual",
    async doGenerate() {
      callCount++
      const text = callCount === 1 ? "Answer: 42" : "Answer: 100"
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any
  const cfg: VoterConfig = {
    cheap: dualCheap,
    smart: fakeModel("After thought.\nAnswer: 42"),
    perCallTimeoutMs: 1000,
  }
  const result = await runCrossWitnessVoter("Compute X", cfg)
  expect(result.trace.convergence).toBe("hasan")
  expect(result.trace.agreed_answer).toBe("42")
  expect(result.trace.escalated).toBe(true)
  expect(result.trace.witnesses.length).toBe(3)
})

test("voter returns daif on 3-way disagreement", async () => {
  let callCount = 0
  const dualCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-dual",
    async doGenerate() {
      callCount++
      const text = callCount === 1 ? "Answer: 42" : "Answer: 100"
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any
  const cfg: VoterConfig = {
    cheap: dualCheap,
    smart: fakeModel("Different answer.\nAnswer: 999"),
    perCallTimeoutMs: 1000,
  }
  const result = await runCrossWitnessVoter("Compute Y", cfg)
  expect(result.trace.convergence).toBe("daif")
  expect(result.trace.agreed_answer).toBeNull()
  expect(result.trace.escalated).toBe(true)
  expect(result.text).toContain("999") // ships smart-c output
})

test("voter does not hang when cheap-a hangs (Promise.allSettled)", async () => {
  let callCount = 0
  const flakyCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "flaky",
    doGenerate() {
      callCount++
      if (callCount === 1) {
        // First call (cheap-a) hangs
        return new Promise(() => {})
      }
      // Second call (cheap-b) succeeds
      return Promise.resolve({
        content: [{ type: "text", text: "Answer: 50" }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      })
    },
  } as any
  const cfg: VoterConfig = {
    cheap: flakyCheap,
    smart: fakeModel("Smart says.\nAnswer: 50"),
    perCallTimeoutMs: 100,
  }
  const t0 = Date.now()
  const result = await runCrossWitnessVoter("Hard task", cfg)
  expect(Date.now() - t0).toBeLessThan(2000)
  // cheap-a timed out, cheap-b returned 50, smart returned 50 → 2-of-3 majority
  expect(result.trace.convergence).toBe("hasan")
  expect(result.trace.agreed_answer).toBe("50")
})

test("voter returns daif when smart escalation also fails", async () => {
  let callCount = 0
  const dualCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "dual",
    async doGenerate() {
      callCount++
      const text = callCount === 1 ? "Answer: 1" : "Answer: 2"
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any
  const cfg: VoterConfig = {
    cheap: dualCheap,
    smart: hangingModel(),
    perCallTimeoutMs: 100,
  }
  const result = await runCrossWitnessVoter("Disagreement task", cfg)
  // No 2-of-3 agreement (cheap split 1 vs 2; smart timed out)
  expect(result.trace.convergence).toBe("daif")
  expect(result.trace.escalated).toBe(true)
})
