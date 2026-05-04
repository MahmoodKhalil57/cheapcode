import { expect, test } from "bun:test"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CooldownTracker } from "./cooldown"
import { buildPool, nextAvailableAt, pickCredential, type ProviderListShape } from "./credential-pool"

const newCooldown = async () => {
  const dir = await mkdtemp(join(tmpdir(), "cheapcode-pool-"))
  return new CooldownTracker(join(dir, "cooldown.json"))
}

const list: ProviderListShape = {
  connected: ["openai", "openrouter", "opencode"],
  credentials: [
    { key: "openai-2", providerID: "openai", type: "oauth" },
    { key: "openrouter-2", providerID: "openrouter", type: "api" },
    { key: "openrouter-3", providerID: "openrouter", type: "api" },
    { key: "stale-alias", providerID: "anthropic", type: "oauth" }, // not in connected — ignore
  ],
}

test("buildPool collapses canonical + aliases per provider", async () => {
  const pool = buildPool(list, await newCooldown())
  expect(pool.candidates.openai).toEqual(["openai", "openai-2"])
  expect(pool.candidates.openrouter).toEqual(["openrouter", "openrouter-2", "openrouter-3"])
  expect(pool.candidates.opencode).toEqual(["opencode"])
  expect(pool.candidates.anthropic).toBeUndefined() // stale alias dropped
})

test("buildPool deduplicates if alias key duplicates canonical", async () => {
  const pool = buildPool(
    {
      connected: ["openai"],
      credentials: [{ key: "openai", providerID: "openai", type: "oauth" }],
    },
    await newCooldown(),
  )
  expect(pool.candidates.openai).toEqual(["openai"])
})

test("pickCredential round-robins across all candidates", async () => {
  const pool = buildPool(list, await newCooldown())
  const picks = [pickCredential(pool, "openrouter"), pickCredential(pool, "openrouter"), pickCredential(pool, "openrouter")]
  expect(new Set(picks)).toEqual(new Set(["openrouter", "openrouter-2", "openrouter-3"]))
})

test("pickCredential skips cooled candidates", async () => {
  const cooldown = await newCooldown()
  cooldown.mark("openai", "429", 60_000)
  const pool = buildPool(list, cooldown)
  expect(pickCredential(pool, "openai")).toBe("openai-2")
})

test("pickCredential returns undefined when all candidates cooled", async () => {
  const cooldown = await newCooldown()
  cooldown.mark("openai", "429", 60_000)
  cooldown.mark("openai-2", "429", 60_000)
  const pool = buildPool(list, cooldown)
  expect(pickCredential(pool, "openai")).toBeUndefined()
})

test("pickCredential returns undefined for unknown providers", async () => {
  const pool = buildPool(list, await newCooldown())
  expect(pickCredential(pool, "ghost")).toBeUndefined()
})

test("nextAvailableAt reports earliest cooldown expiry", async () => {
  const cooldown = await newCooldown()
  const t = Date.now()
  cooldown.mark("openai", "429", 60_000)
  cooldown.mark("openai-2", "429", 30_000)
  const pool = buildPool(list, cooldown)
  const next = nextAvailableAt(pool, "openai")
  expect(next).toBeDefined()
  expect(next! - t).toBeGreaterThan(29_000)
  expect(next! - t).toBeLessThan(31_000)
})

test("nextAvailableAt returns now when any candidate available", async () => {
  const cooldown = await newCooldown()
  cooldown.mark("openai", "429", 60_000)
  const pool = buildPool(list, cooldown)
  const next = nextAvailableAt(pool, "openai")
  expect(next).toBeDefined()
  expect(next!).toBeLessThanOrEqual(Date.now() + 100)
})
