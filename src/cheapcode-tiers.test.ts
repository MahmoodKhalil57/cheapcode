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

import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { test, expect } from "bun:test"
import { createCheapcodeProvider, generateBackedStreamModelForOpencode } from "./cheapcode-tiers"

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

test("Copilot fallback wins over exhausted OpenAI OAuth when both credentials exist", () => {
  const oldXdg = process.env.XDG_DATA_HOME
  const dir = join(tmpdir(), `cheapcode-copilot-priority-${Date.now()}`)
  try {
    process.env.XDG_DATA_HOME = dir
    const authDir = join(dir, "cheapcode", "opencode")
    mkdirSync(authDir, { recursive: true })
    writeFileSync(
      join(authDir, "auth.json"),
      JSON.stringify({
        openai: { type: "oauth", access: "openai-access", refresh: "openai-refresh", expires: Date.now() + 3600_000 },
        "github-copilot": { type: "oauth", access: "copilot-access", refresh: "copilot-refresh", expires: Date.now() + 3600_000 },
      }),
    )
    const p = createCheapcodeProvider({ apiKey: "", name: "cheapcode" } as any) as any
    const m = p("cheap")
    expect(m.modelId).toBe("claude-haiku-4.5")
    expect(m.provider).not.toBe("openai-consumer-plus-oauth-pool")
  } finally {
    if (oldXdg === undefined) delete process.env.XDG_DATA_HOME
    else process.env.XDG_DATA_HOME = oldXdg
    rmSync(dir, { recursive: true, force: true })
  }
})

test("Copilot stream wrapper emits opencode text lifecycle around generated text", async () => {
  const wrapped = generateBackedStreamModelForOpencode({
    specificationVersion: "v3",
    provider: "github-copilot",
    modelId: "gpt-5.4",
    async doGenerate() {
      return {
        content: [{ type: "text", text: "hello" }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      }
    },
  } as any) as any

  const { stream } = await wrapped.doStream({})
  const reader = stream.getReader()
  const types: string[] = []
  let text = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    types.push(value.type)
    if (value.type === "text-delta") text += value.delta
  }

  expect(types).toEqual(["stream-start", "response-metadata", "text-start", "text-delta", "text-end", "finish"])
  expect(text).toBe("hello")
})

test("auto model is callable and returns a model object", () => {
  const p = createCheapcodeProvider({ apiKey: "fake-key-for-tests", name: "cheapcode" } as any) as any
  const model = p("auto")
  expect(model).toBeDefined()
  expect(model.modelId).toBe("auto")
})
