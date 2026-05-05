import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  COPILOT_FRIEND_KNOWN_MODELS,
  buildCopilotFetch,
  resolveCopilotBaseUrl,
} from "./copilot-fetch"

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

const setup = async (
  override: Record<string, unknown> = {},
): Promise<{ authPath: string }> => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-copilot-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({
      "github-copilot": {
        type: "oauth",
        refresh: "gho_TESTTOKEN",
        access: "",
        ...override,
      },
    }),
  )
  return { authPath }
}

test("resolveCopilotBaseUrl: github.com default", async () => {
  const { authPath } = await setup()
  const url = await resolveCopilotBaseUrl({ authPath, authKey: "github-copilot" })
  expect(url).toBe("https://api.githubcopilot.com")
})

test("resolveCopilotBaseUrl: enterprise host", async () => {
  const { authPath } = await setup({ enterpriseUrl: "https://github.acme.com/" })
  const url = await resolveCopilotBaseUrl({ authPath, authKey: "github-copilot" })
  expect(url).toBe("https://copilot-api.github.acme.com")
})

test("resolveCopilotBaseUrl: throws when no entry", async () => {
  const { authPath } = await setup()
  await expect(resolveCopilotBaseUrl({ authPath, authKey: "github-copilot-2" })).rejects.toThrow(
    'auth.json entry "github-copilot-2" not found',
  )
})

test("resolveCopilotBaseUrl: throws when not oauth", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-copilot-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({ "github-copilot": { type: "api", key: "x" } }),
  )
  await expect(resolveCopilotBaseUrl({ authPath, authKey: "github-copilot" })).rejects.toThrow(
    "is not oauth-type",
  )
})

test("buildCopilotFetch: replaces authorization with Bearer <github-token> + sets headers", async () => {
  const { authPath } = await setup()
  let captured: { url: unknown; init?: RequestInit } | undefined
  const stub = (((input: RequestInfo | URL, init?: RequestInit) => {
    captured = { url: input, init }
    return Promise.resolve(new Response("{}", { status: 200 }))
  }) as unknown) as typeof fetch
  // Monkey-patch globalThis.fetch within this test only.
  const original = globalThis.fetch
  globalThis.fetch = stub as never
  try {
    const cf = buildCopilotFetch({ authPath, authKey: "github-copilot" })
    await cf("https://api.githubcopilot.com/chat/completions", {
      method: "POST",
      headers: { authorization: "Bearer dummy", "x-api-key": "should-strip" },
      body: '{"messages":[]}',
    })
  } finally {
    globalThis.fetch = original
  }
  const headers = new Headers((captured?.init?.headers as HeadersInit) ?? {})
  expect(headers.get("authorization")).toBe("Bearer gho_TESTTOKEN")
  expect(headers.get("x-api-key")).toBeNull()
  expect(headers.get("user-agent")).toContain("cheapcode/")
  expect(headers.get("openai-intent")).toBe("conversation-edits")
  expect(headers.get("x-initiator")).toBe("user")
})

test("buildCopilotFetch: throws when entry missing refresh field", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-copilot-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({ "github-copilot": { type: "oauth", refresh: "", access: "" } }),
  )
  const cf = buildCopilotFetch({ authPath, authKey: "github-copilot" })
  await expect(cf("https://x", {})).rejects.toThrow("no GitHub token")
})

test("COPILOT_FRIEND_KNOWN_MODELS contains expected ids", () => {
  expect(COPILOT_FRIEND_KNOWN_MODELS.has("claude-haiku-4.5")).toBe(true)
  expect(COPILOT_FRIEND_KNOWN_MODELS.has("gpt-5-mini")).toBe(true)
  expect(COPILOT_FRIEND_KNOWN_MODELS.has("gpt-5.4")).toBe(true)
  expect(COPILOT_FRIEND_KNOWN_MODELS.has("gemini-2.5-pro")).toBe(true)
  expect(COPILOT_FRIEND_KNOWN_MODELS.has("gpt-99")).toBe(false)
})

test("pickCopilotModelForTier defaults span all three families", async () => {
  const { pickCopilotModelForTier } = await import("./cheapcode-tiers")
  expect(pickCopilotModelForTier("cheap", { apiKey: "" })).toBe("claude-haiku-4.5")
  expect(pickCopilotModelForTier("cheap-fast", { apiKey: "" })).toBe("claude-haiku-4.5")
  expect(pickCopilotModelForTier("smart", { apiKey: "" })).toBe("claude-sonnet-4.6")
  expect(pickCopilotModelForTier("smart-fast", { apiKey: "" })).toBe("gpt-5.4")
  expect(pickCopilotModelForTier("auto", { apiKey: "" })).toBe("claude-sonnet-4.6")
})

test("pickCopilotModelForTier honors tierOverrides for gemini routing", async () => {
  const { pickCopilotModelForTier } = await import("./cheapcode-tiers")
  expect(
    pickCopilotModelForTier("smart", {
      apiKey: "",
      tierOverrides: { smart: "github-copilot/gemini-2.5-pro" },
    }),
  ).toBe("gemini-2.5-pro")
  expect(
    pickCopilotModelForTier("cheap", {
      apiKey: "",
      tierOverrides: { cheap: "claude-haiku-4.5" },
    }),
  ).toBe("claude-haiku-4.5")
})

test("normalizeCopilotModelId strips vendor prefix and falls through known catalog", async () => {
  const { normalizeCopilotModelId } = await import("./cheapcode-tiers")
  // openrouter-style → bare in catalog
  expect(normalizeCopilotModelId("openai/gpt-5-mini")).toBe("gpt-5-mini")
  expect(normalizeCopilotModelId("anthropic/claude-haiku-4.5")).toBe("claude-haiku-4.5")
  expect(normalizeCopilotModelId("anthropic/claude-sonnet-4.6")).toBe("claude-sonnet-4.6")
  // already bare ids in catalog
  expect(normalizeCopilotModelId("gpt-5.4")).toBe("gpt-5.4")
  expect(normalizeCopilotModelId("gemini-2.5-pro")).toBe("gemini-2.5-pro")
})

test("normalizeCopilotModelId maps non-Copilot openrouter ids to Copilot equivalents", async () => {
  const { normalizeCopilotModelId } = await import("./cheapcode-tiers")
  // deepseek (cheap-tier) → claude-haiku-4.5 (Copilot's fast cheap)
  expect(normalizeCopilotModelId("deepseek/deepseek-v4-flash")).toBe("claude-haiku-4.5")
  // x-ai grok long-context → claude-haiku-4.5
  expect(normalizeCopilotModelId("x-ai/grok-4-fast")).toBe("claude-haiku-4.5")
  // gemini flash → gemini pro (Copilot doesn't expose flash)
  expect(normalizeCopilotModelId("google/gemini-2.5-flash")).toBe("gemini-2.5-pro")
  // llama → gpt-5-mini (cheap-classify replacement)
  expect(normalizeCopilotModelId("meta-llama/llama-4-scout")).toBe("gpt-5-mini")
})

test("normalizeCopilotModelId leaves unknown bare ids alone (Copilot will reject loudly)", async () => {
  const { normalizeCopilotModelId } = await import("./cheapcode-tiers")
  expect(normalizeCopilotModelId("nonexistent-model-9999")).toBe("nonexistent-model-9999")
})
