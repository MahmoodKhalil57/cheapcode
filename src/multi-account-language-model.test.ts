/**
 * multi-account-language-model.test.ts — unit tests for M3e LanguageModelV2 wrapper.
 *
 * Mocks LanguageModelV2 (no real SDK calls). Verifies:
 *   - Empty registry → passthrough (no overhead)
 *   - Per-call account resolution + modelFactory invocation
 *   - providerMetadata.cheapcode attribution attachment
 *   - onDispatch callback firing with correct attribution
 *   - Stream wrapping
 *   - Error from dispatch propagates
 */

import { describe, expect, test } from "bun:test"
import type { LanguageModelV2 } from "@ai-sdk/provider"
import { wrapWithMultiAccount } from "./multi-account-language-model"
import type { Account, AccountRegistry } from "./account-registry"

// ============================================================
// Test fixtures
// ============================================================

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    label: "Account One",
    provider: "openai",
    auth_type: "api-key",
    auth_ref: "env:TEST_KEY",
    capabilities: ["openai/gpt-5.5"],
    tier: "paid-per-token",
    priority: 50,
    ...overrides,
  }
}

function makeRegistry(accounts: Account[]): AccountRegistry {
  return { version: 1, accounts }
}

/**
 * Build a minimal LanguageModelV2 mock. Returns hardcoded content + tracks
 * how many times each method was invoked.
 */
interface MockModel extends LanguageModelV2 {
  callCounts: { doGenerate: number; doStream: number }
  lastApiKey?: string
}

function makeMockModel(
  apiKey: string = "fallback-key",
  generateContent: string = "default-output",
): MockModel {
  const counts = { doGenerate: 0, doStream: 0 }
  const m: MockModel = {
    specificationVersion: "v2",
    provider: "mock-provider",
    modelId: "mock-model",
    supportedUrls: {},
    callCounts: counts,
    lastApiKey: apiKey,
    async doGenerate() {
      counts.doGenerate++
      return {
        content: [{ type: "text", text: generateContent }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
      }
    },
    async doStream() {
      counts.doStream++
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "s" })
            controller.enqueue({ type: "text-delta", id: "s", delta: generateContent })
            controller.enqueue({ type: "text-end", id: "s" })
            controller.close()
          },
        }),
      }
    },
  }
  return m
}

// ============================================================
// Empty registry → passthrough
// ============================================================

describe("wrapWithMultiAccount — empty registry passthrough", () => {
  test("returns fallback unchanged when registry empty", () => {
    const fallback = makeMockModel()
    const wrapped = wrapWithMultiAccount(fallback, {
      registry: makeRegistry([]),
      targetModel: "openai/gpt-5.5",
      modelFactory: () => fallback,
    })
    expect(wrapped).toBe(fallback)
  })
})

// ============================================================
// Account dispatch + modelFactory invocation
// ============================================================

describe("wrapWithMultiAccount — per-call account resolution", () => {
  test("doGenerate invokes modelFactory with chosen account + auth", async () => {
    const acc = makeAccount()
    let factoryAccount: Account | null = null
    let factoryAuthKind: string | null = null

    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([acc]),
      targetModel: "openai/gpt-5.5",
      envLookup: (v) => (v === "TEST_KEY" ? "key-from-env" : undefined),
      modelFactory: (account, auth) => {
        factoryAccount = account
        factoryAuthKind = auth.kind
        return makeMockModel("ignored", "model-output")
      },
    })

    const result = await wrapped.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    } as never)

    expect(factoryAccount).not.toBeNull()
    expect(factoryAccount!.id).toBe("acc-1")
    expect(factoryAuthKind).toBe("api-key")

    // result content should come from the per-dispatch model, not the fallback
    expect(result.content).toEqual([{ type: "text", text: "model-output" }])
  })

  test("doGenerate attaches cheapcode attribution to providerMetadata", async () => {
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount({ id: "primary", label: "Primary" })]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => makeMockModel(),
    })

    const result = await wrapped.doGenerate({} as never)
    expect(result.providerMetadata).toBeDefined()
    const cheapcodeMeta = (result.providerMetadata as Record<string, unknown>).cheapcode as Record<
      string,
      unknown
    >
    expect(cheapcodeMeta.account_id).toBe("primary")
    expect(cheapcodeMeta.account_label).toBe("Primary")
    expect(cheapcodeMeta.target_model).toBe("openai/gpt-5.5")
    expect(cheapcodeMeta.auth_kind).toBe("api-key")
  })

  test("preserves existing providerMetadata fields when adding cheapcode", async () => {
    const fallback = makeMockModel()
    const wrapped = wrapWithMultiAccount(fallback, {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => ({
        ...fallback,
        async doGenerate() {
          return {
            content: [{ type: "text", text: "" }],
            finishReason: "stop",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            warnings: [],
            providerMetadata: { openrouter: { foo: "bar" } },
          } as never
        },
      }),
    })

    const result = await wrapped.doGenerate({} as never)
    const meta = result.providerMetadata as Record<string, unknown>
    expect(meta.openrouter).toEqual({ foo: "bar" } as never)
    expect(meta.cheapcode).toBeDefined()
  })

  test("preserves fallback's read-only fields", () => {
    const fallback = makeMockModel()
    const wrapped = wrapWithMultiAccount(fallback, {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      modelFactory: () => fallback,
    })
    expect(wrapped.specificationVersion).toBe("v2")
    expect(wrapped.provider).toBe("mock-provider")
    expect(wrapped.modelId).toBe("mock-model")
  })
})

// ============================================================
// onDispatch callback
// ============================================================

describe("wrapWithMultiAccount — onDispatch callback", () => {
  test("fires onDispatch with attribution after successful doGenerate", async () => {
    let captured: { account_id?: string } | null = null
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount({ id: "tracked" })]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => makeMockModel(),
      onDispatch: (attr) => {
        captured = attr
      },
    })
    await wrapped.doGenerate({} as never)
    expect(captured).not.toBeNull()
    expect(captured!.account_id).toBe("tracked")
  })

  test("onDispatch error does NOT fail dispatch", async () => {
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => makeMockModel(),
      onDispatch: () => {
        throw new Error("simulated attribution failure")
      },
    })
    // Should NOT throw
    const result = await wrapped.doGenerate({} as never)
    expect(result.content.length).toBeGreaterThan(0)
  })
})

// ============================================================
// Streaming
// ============================================================

describe("wrapWithMultiAccount — doStream", () => {
  test("doStream invokes modelFactory and returns the stream", async () => {
    let factoryCalled = false
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => {
        factoryCalled = true
        return makeMockModel("test-key", "stream-output")
      },
    })
    const result = await wrapped.doStream({} as never)
    expect(factoryCalled).toBe(true)
    expect(result.stream).toBeDefined()

    // Read the stream
    const reader = result.stream.getReader()
    const parts: unknown[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
    }
    expect(parts.length).toBeGreaterThan(0)
  })

  test("doStream fires onDispatch", async () => {
    let captured = false
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => makeMockModel(),
      onDispatch: () => {
        captured = true
      },
    })
    await wrapped.doStream({} as never)
    expect(captured).toBe(true)
  })
})

// ============================================================
// Multi-account scenarios
// ============================================================

describe("wrapWithMultiAccount — multi-account scenarios", () => {
  test("picks higher-priority account on doGenerate", async () => {
    const high = makeAccount({ id: "high", priority: 100 })
    const low = makeAccount({ id: "low", priority: 50 })
    let chosen = ""
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([low, high]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: (acc) => {
        chosen = acc.id
        return makeMockModel()
      },
    })
    await wrapped.doGenerate({} as never)
    expect(chosen).toBe("high")
  })

  test("falls back to next-priority when first below quota floor", async () => {
    const a = makeAccount({ id: "a", priority: 100 })
    const b = makeAccount({ id: "b", priority: 50 })
    let chosen = ""
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([a, b]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      quotaRemaining: (acc) => (acc.id === "a" ? 0.05 : 0.95),
      modelFactory: (acc) => {
        chosen = acc.id
        return makeMockModel()
      },
    })
    await wrapped.doGenerate({} as never)
    expect(chosen).toBe("b")
  })
})

// ============================================================
// Error propagation
// ============================================================

describe("wrapWithMultiAccount — errors", () => {
  test("modelFactory throw propagates", async () => {
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => {
        throw new Error("factory boom")
      },
    })
    let threw = false
    try {
      await wrapped.doGenerate({} as never)
    } catch (e) {
      threw = true
      expect((e as Error).message).toBe("factory boom")
    }
    expect(threw).toBe(true)
  })

  test("dispatch error from inner doGenerate propagates", async () => {
    const wrapped = wrapWithMultiAccount(makeMockModel(), {
      registry: makeRegistry([makeAccount()]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      modelFactory: () => ({
        ...makeMockModel(),
        async doGenerate() {
          throw new Error("inner SDK failure")
        },
      }),
    })
    let threw = false
    try {
      await wrapped.doGenerate({} as never)
    } catch (e) {
      threw = true
      expect((e as Error).message).toBe("inner SDK failure")
    }
    expect(threw).toBe(true)
  })
})
