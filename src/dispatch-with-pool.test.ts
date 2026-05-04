import { expect, test } from "bun:test"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { CooldownTracker } from "./cooldown"
import { buildPool, type ProviderListShape } from "./credential-pool"
import {
  dispatchWithPool,
  NoAvailableCredentialError,
} from "./dispatch-with-pool"

const list: ProviderListShape = {
  connected: ["openai", "openrouter"],
  credentials: [
    { key: "openai-2", providerID: "openai", type: "oauth" },
    { key: "openrouter-2", providerID: "openrouter", type: "api" },
  ],
}

const setupAuthJson = async () => {
  const dir = await mkdtemp(join(tmpdir(), "cheapcode-dwp-"))
  const path = join(dir, "auth.json")
  await writeFile(
    path,
    JSON.stringify({
      openai: { type: "oauth", access: "tok-1", refresh: "rt-1", expires: Date.now() + 3600_000 },
      "openai-2": { type: "oauth", access: "tok-2", refresh: "rt-2", expires: Date.now() + 3600_000 },
      openrouter: { type: "api", key: "or-k1" },
      "openrouter-2": { type: "api", key: "or-k2" },
    }),
  )
  return { path, cooldownPath: join(dir, "cooldown.json") }
}

test("dispatchWithPool resolves auth and runs caller dispatch", async () => {
  const { path, cooldownPath } = await setupAuthJson()
  const pool = buildPool(list, new CooldownTracker(cooldownPath))
  const seen: string[] = []
  const out = await dispatchWithPool({
    pool,
    canonical: "openai",
    targetModel: "openai/gpt-5.5",
    opencodeAuthPath: path,
    dispatch: async ({ authKey, auth, targetModel }) => {
      seen.push(authKey)
      expect(auth.kind).toBe("oauth")
      expect(targetModel).toBe("openai/gpt-5.5")
      return "ok"
    },
  })
  expect(out.result).toBe("ok")
  expect(seen).toEqual(["openai"])
  expect(out.attribution.canonical_provider).toBe("openai")
})

test("dispatchWithPool throws when all candidates cooled", async () => {
  const { path, cooldownPath } = await setupAuthJson()
  const cooldown = new CooldownTracker(cooldownPath)
  cooldown.mark("openai", "429", 60_000)
  cooldown.mark("openai-2", "429", 60_000)
  const pool = buildPool(list, cooldown)
  await expect(
    dispatchWithPool({
      pool,
      canonical: "openai",
      targetModel: "openai/gpt-5.5",
      opencodeAuthPath: path,
      dispatch: async () => "should-not-run",
    }),
  ).rejects.toBeInstanceOf(NoAvailableCredentialError)
})

test("dispatchWithPool marks cooldown on 429 and rethrows", async () => {
  const { path, cooldownPath } = await setupAuthJson()
  const pool = buildPool(list, new CooldownTracker(cooldownPath))
  await expect(
    dispatchWithPool({
      pool,
      canonical: "openrouter",
      targetModel: "openrouter/some-model",
      opencodeAuthPath: path,
      persistCooldownOnError: false, // skip disk write in test
      dispatch: async () => {
        const err: any = new Error("rate limit")
        err.status = 429
        err.retryAfter = 5
        throw err
      },
    }),
  ).rejects.toThrow("rate limit")
  // exactly one of the two openrouter keys should now be cooled
  const cooled = pool.candidates.openrouter.filter((k) => !pool.cooldown.isAvailable(k))
  expect(cooled.length).toBe(1)
})

test("dispatchWithPool falls through to alias when canonical is cooled", async () => {
  const { path, cooldownPath } = await setupAuthJson()
  const cooldown = new CooldownTracker(cooldownPath)
  cooldown.mark("openrouter", "429", 60_000)
  const pool = buildPool(list, cooldown)
  const out = await dispatchWithPool({
    pool,
    canonical: "openrouter",
    targetModel: "openrouter/m",
    opencodeAuthPath: path,
    dispatch: async ({ authKey }) => authKey,
  })
  expect(out.result).toBe("openrouter-2")
  expect(out.attribution.cooldown_skipped).toContain("openrouter")
})

test("dispatchWithPool retry-after parsed from headers map", async () => {
  const { path, cooldownPath } = await setupAuthJson()
  const pool = buildPool(list, new CooldownTracker(cooldownPath))
  const before = Date.now()
  await expect(
    dispatchWithPool({
      pool,
      canonical: "openai",
      targetModel: "openai/x",
      opencodeAuthPath: path,
      persistCooldownOnError: false,
      dispatch: async () => {
        const err: any = new Error("limited")
        err.status = 429
        err.headers = { "retry-after": "7" }
        throw err
      },
    }),
  ).rejects.toThrow()
  const pending = pool.cooldown.pending()
  // exactly one cooled, until ≈ before + 7000ms
  const entry = Object.values(pending)[0]
  expect(entry).toBeDefined()
  expect(entry.until - before).toBeGreaterThanOrEqual(6500)
  expect(entry.until - before).toBeLessThanOrEqual(7500)
})
