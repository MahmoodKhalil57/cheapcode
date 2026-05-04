import { afterEach, expect, test, mock } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CooldownTracker } from "./cooldown"
import {
  _internal,
  createPoolOAuthLanguageModel,
} from "./pool-oauth-language-model"

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

const setupAuth = async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-pool-oauth-"))
  const authPath = join(tmpDir, "auth.json")
  await writeFile(
    authPath,
    JSON.stringify({
      openai: { type: "oauth", access: "tok-1", refresh: "rt-1", expires: Date.now() + 3600_000 },
      "openai-2": { type: "oauth", access: "tok-2", refresh: "rt-2", expires: Date.now() + 3600_000 },
    }),
  )
  const cdPath = join(tmpDir, "cooldown.json")
  return { authPath, cdPath }
}

const codex429 = (resetSeconds: number) => {
  const err: Error & { status?: number; message: string } = new Error(
    `codex/responses 429: {"error":{"type":"usage_limit_reached","message":"limit","plan_type":"plus","resets_in_seconds":${resetSeconds}}}`,
  )
  err.status = 429
  return err
}

test("parseCodexQuotaResetMs extracts resets_in_seconds × 1000", () => {
  const err = codex429(36640)
  expect(_internal.parseCodexQuotaResetMs(err)).toBe(36640_000)
})

test("parseCodexQuotaResetMs returns undefined when no resets_in_seconds", () => {
  expect(_internal.parseCodexQuotaResetMs({ status: 429, message: "limit" })).toBeUndefined()
  expect(_internal.parseCodexQuotaResetMs({ status: 500, message: "x" })).toBeUndefined()
  expect(_internal.parseCodexQuotaResetMs(undefined)).toBeUndefined()
})

test("constructor rejects empty authKeys", async () => {
  const { authPath } = await setupAuth()
  expect(() =>
    createPoolOAuthLanguageModel({ authPath, authKeys: [], modelId: "gpt-5.5" }),
  ).toThrow("at least one authKey")
})

test("doGenerate falls over to second key when first 429s", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  const callsByKey: Record<string, number> = {}
  const codexCaller = mock(async (opts: { authKey: string }) => {
    callsByKey[opts.authKey] = (callsByKey[opts.authKey] ?? 0) + 1
    if (opts.authKey === "openai") throw codex429(3600)
    return { text: `served by ${opts.authKey}`, raw_event_count: 1 }
  })
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller: codexCaller as never,
  })
  const r = await m.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  } as never)
  const text = (r.content[0] as { type: "text"; text: string }).text
  expect(text).toBe("served by openai-2")
  expect(callsByKey).toEqual({ openai: 1, "openai-2": 1 })
  // openai got cooled per the 429 with the parsed reset
  expect(cooldown.isAvailable("openai")).toBe(false)
  expect(cooldown.isAvailable("openai-2")).toBe(true)
  // attribution surfaces the used key + cooled set
  expect(r.providerMetadata?.["cheapcode-pool"]?.used_key).toBe("openai-2")
  expect(r.providerMetadata?.["cheapcode-pool"]?.cooled_keys).toContain("openai")
})

test("doGenerate skips already-cooled keys on next call (no wasted attempt)", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  cooldown.mark("openai", "429", 60_000) // pre-cool
  const codexCaller = mock(async (opts: { authKey: string }) => ({
    text: `served by ${opts.authKey}`,
    raw_event_count: 1,
  }))
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller: codexCaller as never,
  })
  await m.doGenerate({
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  } as never)
  // codexCaller was invoked once, only on openai-2, never on cooled openai
  expect(codexCaller).toHaveBeenCalledTimes(1)
  const arg = (codexCaller as unknown as { mock: { calls: [{ authKey: string }][] } }).mock.calls[0][0]
  expect(arg.authKey).toBe("openai-2")
})

test("doGenerate throws PoolOAuthExhaustedError when every key is cooled", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  cooldown.mark("openai", "429", 60_000)
  cooldown.mark("openai-2", "429", 60_000)
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller: (async () => {
      throw new Error("should-not-be-called")
    }) as never,
  })
  await expect(
    m.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    } as never),
  ).rejects.toThrow("every credential is on cooldown")
})

test("doGenerate exhaustion message lists the keys it actually tried", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  const codexCaller = (async () => {
    throw codex429(3600)
  }) as never
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller,
  })
  let caught: Error | undefined
  try {
    await m.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    } as never)
  } catch (e) {
    caught = e as Error
  }
  // Message lists every key in `tried` (pool-oauth: all N tried and failed (openai, openai-2))
  expect(caught?.message).toContain("openai")
  expect(caught?.message).toContain("openai-2")
  expect(caught?.message).toMatch(/tried and failed|every credential/)
})

test("doStream is consistent with doGenerate (same fall-over path)", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  let calls = 0
  const codexCaller = (async (opts: { authKey: string }) => {
    calls++
    if (opts.authKey === "openai") throw codex429(3600)
    return { text: "stream answer from " + opts.authKey, raw_event_count: 1 }
  }) as never
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller,
  })
  const { stream } = await m.doStream({
    prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
  } as never)
  let collected = ""
  const reader = stream.getReader()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value.type === "text-delta") collected += value.delta
  }
  expect(collected).toBe("stream answer from openai-2")
  expect(calls).toBe(2) // tried openai (429), then openai-2 (success)
})

test("non-cooldownable error bubbles up immediately without trying next key", async () => {
  const { authPath, cdPath } = await setupAuth()
  const cooldown = new CooldownTracker(cdPath)
  let calls = 0
  const codexCaller = (async () => {
    calls++
    throw new Error("invalid prompt format")
  }) as never
  const m = createPoolOAuthLanguageModel({
    authPath,
    authKeys: ["openai", "openai-2"],
    modelId: "gpt-5.5",
    cooldown,
    codexCaller,
  })
  await expect(
    m.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
    } as never),
  ).rejects.toThrow("invalid prompt format")
  expect(calls).toBe(1) // did NOT try second key
})
