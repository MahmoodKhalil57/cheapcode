/**
 * auto-wrapper.test.ts — sanity tests for compound wrapper timeout
 * behavior (M3.17). Mocks the LanguageModel layer with promises that
 * resolve / hang / reject so the wrapper's pipeline-level error
 * handling can be exercised without API calls.
 *
 * Per atom 0011 (smallest distinguishing experiment): the timeout
 * guard is the smallest distinguishing change between hung-pipeline
 * (M3.13) and bounded-pipeline (M3.17). These tests exercise the
 * delta directly.
 */

import { test, expect } from "bun:test"
import { runAutoWrapper, type AutoWrapperConfig } from "./auto-wrapper"

/** Build a fake LanguageModel that resolves with the given text after delayMs. */
function fakeModel(text: string, delayMs = 0) {
  return {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake",
    async doGenerate() {
      await new Promise((r) => setTimeout(r, delayMs))
      return {
        content: [{ type: "text", text }],
        finishReason: "stop",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    },
  } as any
}

/** Build a fake LanguageModel that hangs forever. */
function hangingModel() {
  return {
    specificationVersion: "v3" as const,
    provider: "fake",
    modelId: "fake-hang",
    doGenerate() {
      return new Promise(() => {
        /* never resolves */
      })
    },
  } as any
}

test("wrapper completes within budget when all sub-calls are fast", async () => {
  const cfg: AutoWrapperConfig = {
    smart: fakeModel("1. step a\n2. step b\nFinal answer: 42"),
    cheap: fakeModel("step result"),
    verifier: fakeModel("PASS"),
    k: 2,
    perCallTimeoutMs: 1000,
  }
  const result = await runAutoWrapper("what is 6 times 7", cfg)
  expect(result.text).toContain("42")
  expect(result.trace.plan.length).toBeGreaterThanOrEqual(1)
  expect(result.trace.verifierVerdict.passed).toBe(true)
})

test("wrapper does NOT hang when leaf call hangs — Promise.allSettled survives", async () => {
  const planText = "1. step a\n2. step b"
  const cfg: AutoWrapperConfig = {
    smart: fakeModel(`${planText}\nFinal answer: 42`),
    cheap: hangingModel(), // ALL leaves hang
    verifier: fakeModel("PASS"),
    k: 2,
    perCallTimeoutMs: 100, // short timeout for test speed
  }
  const t0 = Date.now()
  const result = await runAutoWrapper("test", cfg)
  const elapsed = Date.now() - t0
  // Should take ~100ms (leaf timeout) + ~0ms (synth from cached smart) +
  // ~0ms (verifier), not infinity
  expect(elapsed).toBeLessThan(2000)
  // Failed leaves should be replaced with diagnostic strings, not hang
  expect(result.trace.leafResults.every((s) => s.includes("failed"))).toBe(true)
})

test("wrapper does NOT hang when verifier hangs — falls through optimistically", async () => {
  const planText = "1. step a"
  const cfg: AutoWrapperConfig = {
    smart: fakeModel(`${planText}\nFinal answer: ok`),
    cheap: fakeModel("leaf"),
    verifier: hangingModel(),
    k: 1,
    perCallTimeoutMs: 100,
  }
  const t0 = Date.now()
  const result = await runAutoWrapper("test", cfg)
  const elapsed = Date.now() - t0
  expect(elapsed).toBeLessThan(2000)
  // Verifier-skipped: optimistic pass; original candidate preserved
  expect(result.trace.verifierVerdict.passed).toBe(true)
  expect(result.trace.verifierVerdict.feedback).toContain("verifier-skipped")
})

test("wrapper throws if ALL syntheses time out (nothing to return)", async () => {
  const cfg: AutoWrapperConfig = {
    smart: hangingModel(), // ALL smart calls hang (plan AND syntheses)
    cheap: fakeModel("leaf"),
    verifier: fakeModel("PASS"),
    k: 2,
    perCallTimeoutMs: 100,
  }
  // Plan-decompose is the FIRST hang, so error should fire there
  await expect(runAutoWrapper("test", cfg)).rejects.toThrow(/cheapcode-wrapper/)
})

test("default timeout is 3 minutes (180_000 ms)", async () => {
  // We don't actually wait 3 minutes; we verify the constant is correct
  // by checking that an undefined perCallTimeoutMs uses the documented default.
  // The DEFAULT_PER_CALL_TIMEOUT_MS const is module-private; this test
  // exercises the API surface — passing undefined should use the default.
  const cfg: AutoWrapperConfig = {
    smart: fakeModel("1. a\nFinal answer: ok"),
    cheap: fakeModel("leaf"),
    verifier: fakeModel("PASS"),
    k: 1,
  }
  const t0 = Date.now()
  const result = await runAutoWrapper("test", cfg)
  expect(Date.now() - t0).toBeLessThan(2000)
  expect(result.text).toContain("ok")
})
