import { afterEach, expect, test, mock } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createOAuthLanguageModel } from "./oauth-language-model"

// We can't make real network calls; mock the codex caller via module mock.
// The unit tests focus on prompt-flattening + V2 shape correctness.

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

const setupAuth = async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-oauth-lm-"))
  const path = join(tmpDir, "auth.json")
  await writeFile(
    path,
    JSON.stringify({
      openai: {
        type: "oauth",
        access: "tok",
        refresh: "rt",
        expires: Date.now() + 3600_000,
      },
    }),
  )
  return path
}

test("OAuthLanguageModelV2 reports correct V2 surface", async () => {
  const authPath = await setupAuth()
  const m = createOAuthLanguageModel({ authPath, authKey: "openai", modelId: "gpt-5.5" })
  expect(m.specificationVersion).toBe("v2")
  expect(m.provider).toBe("openai-consumer-plus-oauth")
  expect(m.modelId).toBe("gpt-5.5")
})

test("OAuthLanguageModelV2 warns on unknown model id but still constructs", async () => {
  const authPath = await setupAuth()
  const original = console.warn
  let warned = ""
  console.warn = (msg: unknown) => {
    warned = String(msg)
  }
  try {
    const m = createOAuthLanguageModel({ authPath, authKey: "openai", modelId: "gpt-9000" })
    expect(m.modelId).toBe("gpt-9000")
    expect(warned).toContain("not in CODEX_ALLOWED_MODELS")
  } finally {
    console.warn = original
  }
})

test("OAuthLanguageModelV2 doGenerate flattens prompt and calls codex", async () => {
  const authPath = await setupAuth()
  const codexCaller = mock(async (opts: { prompt: string; instructions?: string }) => ({
    text: `responded to: ${opts.prompt} (instructions: ${opts.instructions})`,
    raw_event_count: 1,
  }))
  const m = createOAuthLanguageModel({
    authPath,
    authKey: "openai",
    modelId: "gpt-5.5",
    codexCaller: codexCaller as never,
  })
  const result = await m.doGenerate({
    prompt: [
      { role: "system", content: "Be concise." },
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ],
    maxOutputTokens: 100,
  } as never)
  expect(codexCaller).toHaveBeenCalledTimes(1)
  expect((result.content[0] as { type: "text"; text: string }).text).toContain("responded to: hello")
  expect(result.finishReason).toBe("stop")
  expect(result.usage.inputTokens).toBeGreaterThan(0)
  expect(result.usage.outputTokens).toBeGreaterThan(0)
})

test("OAuthLanguageModelV2 throws on tool messages (codex contract limitation)", async () => {
  const authPath = await setupAuth()
  const m = createOAuthLanguageModel({ authPath, authKey: "openai", modelId: "gpt-5.5" })
  await expect(
    m.doGenerate({
      prompt: [{ role: "tool", content: [{ type: "tool-result", toolCallId: "x", toolName: "y", output: { type: "text", value: "z" } }] }],
    } as never),
  ).rejects.toThrow("tool messages not supported")
})

test("OAuthLanguageModelV2 throws on file inputs (codex contract limitation)", async () => {
  const authPath = await setupAuth()
  const m = createOAuthLanguageModel({ authPath, authKey: "openai", modelId: "gpt-5.5" })
  await expect(
    m.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "file", data: "data:image/png;base64,xx", mediaType: "image/png" }],
        },
      ],
    } as never),
  ).rejects.toThrow("file/image input not supported")
})

test("OAuthLanguageModelV2 doStream emits stream-start, text-start, text-delta, text-end, finish", async () => {
  const authPath = await setupAuth()
  const m = createOAuthLanguageModel({
    authPath,
    authKey: "openai",
    modelId: "gpt-5.5",
    codexCaller: (async () => ({ text: "streamed answer", raw_event_count: 1 })) as never,
  })
  const { stream } = await m.doStream({
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  } as never)
  const reader = stream.getReader()
  const types: string[] = []
  let collected = ""
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    types.push(value.type)
    if (value.type === "text-delta") collected += value.delta
  }
  expect(types).toEqual([
    "stream-start",
    "response-metadata",
    "text-start",
    "text-delta",
    "text-end",
    "finish",
  ])
  expect(collected).toBe("streamed answer")
})
