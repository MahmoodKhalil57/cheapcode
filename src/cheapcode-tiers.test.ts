/**
 * cheapcode-tiers.test.ts — M3.38 M18-discipline tests for AI SDK v3
 * ProviderV2 contract conformance. Written BEFORE the source fix.
 *
 * Per PLAN.bn SECTION II:
 * - provider_exposes_specification_version_v3_and_required_model_methods
 * - embedding_and_image_models_throw_not_supported_per_atom_0007
 * - m3_38_provider_shape_fix_resolves_m3_15_provider_init_error
 *
 * Statistical lineage (per Statistics.md): contract conformance is
 * categorical not statistical — every method either exists or doesn't.
 * Atom 0007 (anti-fab via artifact verification) demands NOT silently
 * returning a stub; embedding/image must throw a clear "not supported"
 * error so consumers know to route elsewhere.
 */

import { test, expect } from "bun:test"
import { createCheapcodeProvider } from "./cheapcode-tiers"

function makeProvider() {
  return createCheapcodeProvider({ apiKey: "fake-key-for-tests", name: "cheapcode" } as any)
}

// ============================================================
// AI SDK v3 ProviderV2 contract conformance
// ============================================================

test("provider exposes specificationVersion = 'v3' (claim 1)", () => {
  const p = makeProvider() as any
  expect(p.specificationVersion).toBe("v3")
})

test("provider exposes languageModel(id) returning a model (claim 1)", () => {
  const p = makeProvider() as any
  expect(typeof p.languageModel).toBe("function")
  const m = p.languageModel("cheap")
  expect(m).toBeDefined()
  expect(m.modelId).toBeDefined()
})

test("provider exposes chatModel(id) as alias for languageModel (claim 1)", () => {
  const p = makeProvider() as any
  expect(typeof p.chatModel).toBe("function")
  const m = p.chatModel("cheap")
  expect(m).toBeDefined()
  expect(m.modelId).toBeDefined()
})

test("provider exposes completionModel(id) (claim 1)", () => {
  const p = makeProvider() as any
  expect(typeof p.completionModel).toBe("function")
  // completionModel may delegate to languageModel; just verify it returns
  const m = p.completionModel("cheap")
  expect(m).toBeDefined()
})

test("provider exposes textEmbeddingModel(id) and embeddingModel(id) (claim 1)", () => {
  const p = makeProvider() as any
  expect(typeof p.textEmbeddingModel).toBe("function")
  expect(typeof p.embeddingModel).toBe("function")
})

test("provider exposes imageModel(id) (claim 1)", () => {
  const p = makeProvider() as any
  expect(typeof p.imageModel).toBe("function")
})

// ============================================================
// Atom 0007: embedding/image stubs THROW (not silently return)
// ============================================================

test("textEmbeddingModel throws 'not supported' (claim 2)", () => {
  const p = makeProvider() as any
  expect(() => p.textEmbeddingModel("cheap")).toThrow(/not support/i)
})

test("embeddingModel throws 'not supported' (claim 2)", () => {
  const p = makeProvider() as any
  expect(() => p.embeddingModel("cheap")).toThrow(/not support/i)
})

test("imageModel throws 'not supported' (claim 2)", () => {
  const p = makeProvider() as any
  expect(() => p.imageModel("cheap")).toThrow(/not support/i)
})

// ============================================================
// Existing behavior unchanged (regression)
// ============================================================

test("provider remains callable as provider(modelId) per OpenRouter SDK convention", () => {
  const p = makeProvider() as any
  const m = p("cheap")
  expect(m).toBeDefined()
  expect(m.modelId).toBeDefined()
})

test("provider.models exposes the 5 tier ids", () => {
  const p = makeProvider() as any
  expect(Array.isArray(p.models)).toBe(true)
  expect(p.models).toContain("cheap")
  expect(p.models).toContain("smart")
  expect(p.models).toContain("auto")
})

test("provider('auto') returns the auto-router model (regression)", () => {
  const p = makeProvider() as any
  const m = p("auto")
  expect(m.modelId).toBe("auto")
})
