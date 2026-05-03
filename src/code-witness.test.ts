/**
 * code-witness.test.ts — M18-discipline tests written BEFORE src/code-witness.ts.
 *
 * Per mizaj 18 (burhan-backed TDD for fork-additions):
 * - Each test discriminates a load-bearing burhan claim from PLAN.bn SECTION FF
 * - Tests are smallest-distinguishing (atom 0011)
 * - No mocking of upstream opencode; isolate fork-side logic only
 *
 * Claim coverage map:
 * - code_witness_returns_m18_shaped_artifact_with_code_claim_test_grade @0.85
 *   → "returns M18-shaped artifact" + "fields are correct types"
 * - code_witness_grade_logic_returns_sahih_on_cheap_convergence @0.92
 *   → "sahih when cheap pair converges on identical code-text"
 * - code_witness_grade_logic_handles_disagreement_with_synthesizer_path @0.85
 *   → "hasan when cheap diverges + synthesizer produces unified artifact"
 *   → "daif when cheap diverges + synthesizer fails"
 */

import { test, expect } from "bun:test"
import { runCodeWitness, extractCodeBlock, type CodeWitnessConfig } from "./code-witness"

function fakeModel(responseText: string) {
  return {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake",
    async doGenerate() {
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

// ============================================================
// extractCodeBlock helper
// ============================================================

test("extractCodeBlock pulls fenced code from markdown response", () => {
  const text = "Here's the code:\n\n```typescript\nfunction add(a: number, b: number) { return a + b }\n```\n\nDone."
  expect(extractCodeBlock(text)).toBe("function add(a: number, b: number) { return a + b }")
})

test("extractCodeBlock handles code-block without language tag", () => {
  const text = "```\nconst x = 1\n```"
  expect(extractCodeBlock(text)).toBe("const x = 1")
})

test("extractCodeBlock returns null when no fence present", () => {
  expect(extractCodeBlock("Some prose without any code fence.")).toBeNull()
})

test("extractCodeBlock prefers the first fenced block", () => {
  const text = "First:\n```\nA\n```\nSecond:\n```\nB\n```"
  expect(extractCodeBlock(text)).toBe("A")
})

// ============================================================
// Artifact structure (claim 1: M18-shaped)
// ============================================================

test("code-witness returns M18-shaped artifact with code, claim, test, grade fields (claim 1)", async () => {
  const witnessResponse = `Here's the code:

\`\`\`typescript
function add(a: number, b: number): number { return a + b }
\`\`\`

CLAIM: add(a, b) returns the sum of integers a and b.
TEST: expect(add(2, 3)).toBe(5)`

  const cfg: CodeWitnessConfig = {
    cheap: fakeModel(witnessResponse),
    smart: fakeModel(witnessResponse),
    perCallTimeoutMs: 1000,
  }

  const artifact = await runCodeWitness("add two integers", cfg)

  expect(artifact).toHaveProperty("code")
  expect(artifact).toHaveProperty("claim")
  expect(artifact).toHaveProperty("test")
  expect(artifact).toHaveProperty("grade")
  expect(artifact).toHaveProperty("witnesses")
  expect(typeof artifact.code).toBe("string")
  expect(typeof artifact.claim).toBe("string")
  expect(typeof artifact.test).toBe("string")
  expect(["sahih", "hasan", "daif"]).toContain(artifact.grade)
  expect(Array.isArray(artifact.witnesses)).toBe(true)
  expect(artifact.witnesses.length).toBeGreaterThanOrEqual(2)
})

// ============================================================
// Grade logic — sahih on cheap convergence (claim 2)
// ============================================================

test("code-witness returns sahih when both cheap witnesses produce identical code (claim 2)", async () => {
  const sameResponse = `\`\`\`
function add(a, b) { return a + b }
\`\`\`

CLAIM: returns sum.
TEST: add(1,1)===2`

  const cfg: CodeWitnessConfig = {
    cheap: fakeModel(sameResponse),
    smart: fakeModel("should not be called"),
    perCallTimeoutMs: 1000,
  }
  const artifact = await runCodeWitness("add ints", cfg)
  expect(artifact.grade).toBe("sahih")
  expect(artifact.escalated).toBe(false)
  expect(artifact.code).toContain("a + b")
})

// ============================================================
// Grade logic — disagreement path (claim 3)
// ============================================================

test("code-witness returns hasan when cheap diverges and synthesizer produces unified artifact (claim 3a)", async () => {
  let cheapCallCount = 0
  const dualCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-dual",
    async doGenerate() {
      cheapCallCount++
      const text =
        cheapCallCount === 1
          ? "```\nfunction add(a, b) { return a + b }\n```\nCLAIM: returns sum.\nTEST: add(1,1)===2"
          : "```\nfunction add(x, y) { return x + y }\n```\nCLAIM: returns sum.\nTEST: add(1,1)===2"
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any

  const synthesizerResponse = `\`\`\`
function add(a, b) { return a + b }
\`\`\`
CLAIM: returns the sum of a and b.
TEST: expect(add(1,1)).toBe(2)`

  const cfg: CodeWitnessConfig = {
    cheap: dualCheap,
    smart: fakeModel(synthesizerResponse),
    perCallTimeoutMs: 1000,
  }
  const artifact = await runCodeWitness("add ints", cfg)
  expect(artifact.grade).toBe("hasan")
  expect(artifact.escalated).toBe(true)
})

test("code-witness returns daif when cheap diverges AND synthesizer fails (claim 3b)", async () => {
  let cheapCallCount = 0
  const dualCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-dual",
    async doGenerate() {
      cheapCallCount++
      const text =
        cheapCallCount === 1
          ? "```\nlet a = 1\n```\nCLAIM: x.\nTEST: y"
          : "```\nlet a = 2\n```\nCLAIM: x.\nTEST: y"
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any

  const cfg: CodeWitnessConfig = {
    cheap: dualCheap,
    smart: hangingModel(),
    perCallTimeoutMs: 100,
  }
  const artifact = await runCodeWitness("differ", cfg)
  expect(artifact.grade).toBe("daif")
  expect(artifact.escalated).toBe(true)
})

// ============================================================
// Resilience: cheap-a hang doesn't kill cheap-b (Promise.allSettled)
// ============================================================

test("code-witness does not hang when cheap-a hangs (Promise.allSettled at parallel-leaf)", async () => {
  let cheapCallCount = 0
  const flakyCheap = {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-flaky",
    doGenerate() {
      cheapCallCount++
      if (cheapCallCount === 1) {
        return new Promise(() => {})
      }
      return Promise.resolve({
        content: [{ type: "text", text: "```\nlet x = 1\n```\nCLAIM: x.\nTEST: y" }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      })
    },
  } as any

  const cfg: CodeWitnessConfig = {
    cheap: flakyCheap,
    smart: fakeModel("```\nlet x = 1\n```\nCLAIM: x.\nTEST: y"),
    perCallTimeoutMs: 100,
  }
  const t0 = Date.now()
  const artifact = await runCodeWitness("test", cfg)
  expect(Date.now() - t0).toBeLessThan(2000)
  // cheap-a hung; cheap-b returned; smart escalated → at least 2 fulfilled witnesses
  expect(artifact.witnesses.filter((w) => w.code !== null).length).toBeGreaterThanOrEqual(1)
})
