/**
 * account-discovery.test.ts — unit tests for M8 auto-discovery.
 *
 * Mocked filesystem fixtures. No real opencode files. No network.
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  inferProviderFamily,
  discoverOpencodeAccounts,
  loadEffectiveRegistry,
  classifyAccountSource,
} from "./account-discovery"

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cheapcode-discovery-test-"))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function setupOpencodeFixtures(
  dir: string,
  opencodeConfig: object,
  authJson?: object,
): { opencodeConfigPath: string; opencodeAuthPath: string } {
  const cfgDir = join(dir, "config", "opencode")
  const authDir = join(dir, "share", "opencode")
  mkdirSync(cfgDir, { recursive: true })
  mkdirSync(authDir, { recursive: true })
  const cfgPath = join(cfgDir, "opencode.json")
  const authPath = join(authDir, "auth.json")
  writeFileSync(cfgPath, JSON.stringify(opencodeConfig))
  if (authJson) writeFileSync(authPath, JSON.stringify(authJson))
  return { opencodeConfigPath: cfgPath, opencodeAuthPath: authPath }
}

// ============================================================
// inferProviderFamily
// ============================================================

describe("inferProviderFamily", () => {
  test("openrouter via baseURL", () => {
    expect(inferProviderFamily("anyname", "https://openrouter.ai/api/v1")).toBe("openrouter")
  })
  test("openai via baseURL", () => {
    expect(inferProviderFamily("anyname", "https://api.openai.com/v1")).toBe("openai")
  })
  test("anthropic via baseURL", () => {
    expect(inferProviderFamily("x", "https://api.anthropic.com/v1")).toBe("anthropic")
  })
  test("google via gemini baseURL", () => {
    expect(inferProviderFamily("x", "https://generativelanguage.googleapis.com")).toBe("google")
  })

  test("openrouter via name prefix", () => {
    expect(inferProviderFamily("openrouter-team-1", "")).toBe("openrouter")
    expect(inferProviderFamily("or-personal", "")).toBe("openrouter")
  })
  test("openai via name prefix", () => {
    expect(inferProviderFamily("openai-personal", "")).toBe("openai")
    expect(inferProviderFamily("oai-team", "")).toBe("openai")
  })
  test("anthropic via name", () => {
    expect(inferProviderFamily("claude", "")).toBe("anthropic")
    expect(inferProviderFamily("anthropic-pro", "")).toBe("anthropic")
  })

  test("baseURL beats name when both present + conflict", () => {
    expect(inferProviderFamily("openai-fake", "https://openrouter.ai/api/v1")).toBe("openrouter")
  })

  test("fallback returns raw name when no pattern matches", () => {
    expect(inferProviderFamily("custom-vendor", "")).toBe("custom-vendor")
  })
})

// ============================================================
// discoverOpencodeAccounts
// ============================================================

describe("discoverOpencodeAccounts", () => {
  test("discovers OpenAI-keyed Custom provider with env-var apiKey", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          "openai-personal": {
            name: "OpenAI Personal",
            api: "https://api.openai.com/v1",
            options: { apiKey: "{env:OPENAI_PERSONAL_KEY}" },
          },
        },
      })
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath: "/nonexistent" })
      expect(accounts.length).toBe(1)
      expect(accounts[0].id).toBe("auto:openai-personal")
      expect(accounts[0].provider).toBe("openai")
      expect(accounts[0].auth_ref).toBe("env:OPENAI_PERSONAL_KEY")
      expect(accounts[0].label).toBe("OpenAI Personal")
    })
  })

  test("discovers Custom provider with auth.json-keyed credential", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath, opencodeAuthPath } = setupOpencodeFixtures(
        dir,
        {
          provider: {
            "openrouter-1": {
              name: "OpenRouter Personal",
              api: "https://openrouter.ai/api/v1",
            },
          },
        },
        {
          "openrouter-1": { type: "api", key: "sk-or-test" },
        },
      )
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath })
      expect(accounts.length).toBe(1)
      expect(accounts[0].id).toBe("auto:openrouter-1")
      expect(accounts[0].provider).toBe("openrouter")
      expect(accounts[0].auth_ref).toContain("auth.json#openrouter-1")
    })
  })

  test("excludes cheapcode itself by default", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          cheapcode: { npm: "/path/to/cheapcode", options: { apiKey: "{env:OPENROUTER_API_KEY}" } },
          "openai-personal": {
            name: "OpenAI",
            options: { apiKey: "{env:OAI_KEY}" },
          },
        },
      })
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath: "/nonexistent" })
      expect(accounts.length).toBe(1)
      expect(accounts[0].id).toBe("auto:openai-personal")
    })
  })

  test("custom exclude list", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          a: { options: { apiKey: "{env:KA}" } },
          b: { options: { apiKey: "{env:KB}" } },
        },
      })
      const accounts = discoverOpencodeAccounts({
        opencodeConfigPath,
        opencodeAuthPath: "/nonexistent",
        excludeKeys: new Set(["a", "cheapcode"]),
      })
      expect(accounts.length).toBe(1)
      expect(accounts[0].id).toBe("auto:b")
    })
  })

  test("skips provider entries with no resolvable auth", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          "no-auth-entry": {
            name: "No Auth",
            api: "https://api.example.com",
          },
        },
      })
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath: "/nonexistent" })
      expect(accounts.length).toBe(0)
    })
  })

  test("discovers auth.json-only entries (e.g., consumer OAuth) without provider config", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath, opencodeAuthPath } = setupOpencodeFixtures(
        dir,
        { provider: {} },
        {
          openai: {
            type: "oauth",
            access: "access-xyz",
            refresh: "refresh-abc",
            expires: 9999999999,
            accountId: "acc-001",
          },
        },
      )
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath })
      expect(accounts.length).toBe(1)
      expect(accounts[0].id).toBe("auto:openai")
      expect(accounts[0].auth_type).toBe("consumer-oauth")
      expect(accounts[0].tier).toBe("subscription")
    })
  })

  test("does not double-list when provider config + auth.json both reference same key", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath, opencodeAuthPath } = setupOpencodeFixtures(
        dir,
        {
          provider: {
            "openrouter-1": {
              name: "OpenRouter",
              api: "https://openrouter.ai/api/v1",
            },
          },
        },
        {
          "openrouter-1": { type: "api", key: "sk-or-x" },
        },
      )
      const accounts = discoverOpencodeAccounts({ opencodeConfigPath, opencodeAuthPath })
      expect(accounts.length).toBe(1) // only one entry, not duplicated
    })
  })

  test("missing opencode config returns auth-only discoveries", () => {
    withTempDir((dir) => {
      const cfgDir = join(dir, "config", "opencode")
      const authDir = join(dir, "share", "opencode")
      mkdirSync(authDir, { recursive: true })
      mkdirSync(cfgDir, { recursive: true })
      writeFileSync(join(authDir, "auth.json"), JSON.stringify({
        anthropic: { type: "api", key: "sk-ant-test" },
      }))
      const accounts = discoverOpencodeAccounts({
        opencodeConfigPath: join(cfgDir, "nonexistent.json"),
        opencodeAuthPath: join(authDir, "auth.json"),
      })
      expect(accounts.length).toBe(1)
      expect(accounts[0].provider).toBe("anthropic")
    })
  })

  test("missing both files returns empty array (no crash)", () => {
    const accounts = discoverOpencodeAccounts({
      opencodeConfigPath: "/nonexistent/cfg.json",
      opencodeAuthPath: "/nonexistent/auth.json",
    })
    expect(accounts.length).toBe(0)
  })

  test("malformed JSON is tolerated (returns empty or partial)", () => {
    withTempDir((dir) => {
      const cfgDir = join(dir, "config", "opencode")
      mkdirSync(cfgDir, { recursive: true })
      writeFileSync(join(cfgDir, "opencode.json"), "{ not json")
      const accounts = discoverOpencodeAccounts({
        opencodeConfigPath: join(cfgDir, "opencode.json"),
        opencodeAuthPath: "/nonexistent",
      })
      expect(accounts.length).toBe(0)
    })
  })
})

// ============================================================
// loadEffectiveRegistry
// ============================================================

describe("loadEffectiveRegistry", () => {
  test("merges explicit and auto-discovered accounts", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          "openrouter-1": {
            name: "OR1",
            api: "https://openrouter.ai/api/v1",
            options: { apiKey: "{env:OR1_KEY}" },
          },
        },
      })
      const explicitPath = join(dir, "accounts.json")
      writeFileSync(
        explicitPath,
        JSON.stringify({
          version: 1,
          accounts: [
            {
              id: "explicit-1",
              label: "Explicit",
              provider: "openai",
              auth_type: "api-key",
              auth_ref: "env:OPENAI_KEY",
              capabilities: ["*"],
              tier: "paid-per-token",
              priority: 100,
            },
          ],
        }),
      )
      const reg = loadEffectiveRegistry({
        registryPath: explicitPath,
        opencodeConfigPath,
        opencodeAuthPath: "/nonexistent",
      })
      expect(reg.accounts.length).toBe(2)
      expect(reg.accounts[0].id).toBe("explicit-1")
      expect(reg.accounts[1].id).toBe("auto:openrouter-1")
    })
  })

  test("explicit account with same auth_ref deduplicates auto-discovery", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          "openai-personal": {
            api: "https://api.openai.com/v1",
            options: { apiKey: "{env:OPENAI_KEY}" },
          },
        },
      })
      const explicitPath = join(dir, "accounts.json")
      writeFileSync(
        explicitPath,
        JSON.stringify({
          version: 1,
          accounts: [
            {
              id: "openai-mine",
              label: "Mine",
              provider: "openai",
              auth_type: "api-key",
              auth_ref: "env:OPENAI_KEY", // SAME as auto-discovered
              capabilities: ["*"],
              tier: "subscription",
              priority: 100,
            },
          ],
        }),
      )
      const reg = loadEffectiveRegistry({
        registryPath: explicitPath,
        opencodeConfigPath,
        opencodeAuthPath: "/nonexistent",
      })
      // Only 1 account — the explicit one wins
      expect(reg.accounts.length).toBe(1)
      expect(reg.accounts[0].id).toBe("openai-mine")
    })
  })

  test("CHEAPCODE_DISABLE_AUTO_DISCOVERY env var disables", () => {
    withTempDir((dir) => {
      const { opencodeConfigPath } = setupOpencodeFixtures(dir, {
        provider: {
          "openrouter-1": { options: { apiKey: "{env:K}" } },
        },
      })
      const explicitPath = join(dir, "accounts.json")
      writeFileSync(explicitPath, JSON.stringify({ version: 1, accounts: [] }))
      const original = process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY
      process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY = "1"
      try {
        const reg = loadEffectiveRegistry({
          registryPath: explicitPath,
          opencodeConfigPath,
          opencodeAuthPath: "/nonexistent",
        })
        expect(reg.accounts.length).toBe(0)
      } finally {
        if (original === undefined) delete process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY
        else process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY = original
      }
    })
  })
})

// ============================================================
// classifyAccountSource
// ============================================================

describe("classifyAccountSource", () => {
  test("auto: prefix → 'auto'", () => {
    expect(classifyAccountSource({ id: "auto:foo" } as never)).toBe("auto")
  })
  test("no prefix → 'explicit'", () => {
    expect(classifyAccountSource({ id: "explicit-1" } as never)).toBe("explicit")
  })
})
