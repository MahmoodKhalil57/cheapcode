import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { callChatGptCodex } from "./chatgpt-oauth-fetch"

let tmpDir = ""
const originalFetch = globalThis.fetch

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

test("callChatGptCodex stops at output_text.done canonical text", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-codex-fetch-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({ openai: { type: "oauth", access: "tok", refresh: "rt", expires: Date.now() + 3600_000 } }),
  )

  const body = [
    'data: {"type":"response.output_text.delta","delta":"Hi"}',
    "",
    'data: {"type":"response.output_text.done","text":"Hi!"}',
    "",
    'data: {"type":"response.output_text.delta","delta":" SHOULD_NOT_APPEND"}',
    "",
  ].join("\n")

  globalThis.fetch = (async () => new Response(body, { status: 200 })) as typeof fetch

  const result = await callChatGptCodex({
    authPath,
    authKey: "openai",
    model: "gpt-5.5",
    prompt: "hi",
  })

  expect(result.text).toBe("Hi!")
})

test("callChatGptCodex handles full-text snapshot deltas without repetition", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-codex-fetch-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({ openai: { type: "oauth", access: "tok", refresh: "rt", expires: Date.now() + 3600_000 } }),
  )

  const body = [
    'data: {"type":"response.output_text.delta","delta":"Hi"}',
    "",
    'data: {"type":"response.output_text.delta","delta":"Hi!"}',
    "",
    'data: {"type":"response.output_text.delta","delta":"Hi! How can I help?"}',
    "",
    'data: {"type":"response.completed"}',
    "",
  ].join("\n")

  globalThis.fetch = (async () => new Response(body, { status: 200 })) as typeof fetch

  const result = await callChatGptCodex({
    authPath,
    authKey: "openai",
    model: "gpt-5.5",
    prompt: "hi",
  })

  expect(result.text).toBe("Hi! How can I help?")
})
