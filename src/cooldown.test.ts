import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CooldownTracker } from "./cooldown"

let tmpDir: string

const newTracker = async (file = "cooldown.json") => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-cooldown-"))
  return { tracker: new CooldownTracker(join(tmpDir, file)), path: join(tmpDir, file) }
}

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

test("isAvailable returns true for unmarked keys", async () => {
  const { tracker } = await newTracker()
  expect(tracker.isAvailable("openai")).toBe(true)
})

test("mark + isAvailable enforces cooldown window", async () => {
  const { tracker } = await newTracker()
  tracker.mark("openai", "429", 1000)
  expect(tracker.isAvailable("openai")).toBe(false)
  expect(tracker.isAvailable("openai", Date.now() + 1500)).toBe(true)
})

test("retry-after override beats default", async () => {
  const { tracker } = await newTracker()
  tracker.mark("openai-2", "429", 50)
  tracker.mark("openai-3", "429") // default 60s
  expect(tracker.isAvailable("openai-2", Date.now() + 100)).toBe(true)
  expect(tracker.isAvailable("openai-3", Date.now() + 100)).toBe(false)
})

test("save+load round-trips state", async () => {
  const { tracker, path } = await newTracker()
  tracker.mark("openrouter", "5xx", 30_000)
  await tracker.save()
  const fresh = new CooldownTracker(path)
  await fresh.load()
  expect(fresh.isAvailable("openrouter")).toBe(false)
})

test("pending lists only future cooldowns", async () => {
  const { tracker } = await newTracker()
  tracker.mark("a", "429", 1000)
  tracker.mark("b", "timeout", -5) // already expired
  const pending = tracker.pending()
  expect(Object.keys(pending)).toEqual(["a"])
})

test("classifyError maps statuses correctly", () => {
  expect(CooldownTracker.classifyError({ status: 429 })).toBe("429")
  expect(CooldownTracker.classifyError({ status: 503 })).toBe("5xx")
  expect(CooldownTracker.classifyError({ status: 401 })).toBe("auth")
  expect(CooldownTracker.classifyError({ name: "AbortError" })).toBe("timeout")
  expect(CooldownTracker.classifyError({ status: 200 })).toBe(undefined)
})

test("auto-clears expired entries on isAvailable", async () => {
  const { tracker } = await newTracker()
  tracker.mark("k", "5xx", 10)
  expect(tracker.isAvailable("k", Date.now() + 100)).toBe(true)
  expect(Object.keys(tracker.pending())).not.toContain("k")
})
