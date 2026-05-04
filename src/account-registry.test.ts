/**
 * account-registry.test.ts — unit tests for M2 multi-account schema + loader + resolution.
 *
 * Test categories:
 *   1. defaultRegistryPath
 *   2. validateRegistry
 *   3. loadRegistry (file-based)
 *   4. resolveAccount
 *
 * No dispatch. No real auth.json reads. Fixtures are inline.
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  defaultRegistryPath,
  validateRegistry,
  loadRegistry,
  resolveAccount,
  AccountRegistryError,
  type Account,
  type AccountRegistry,
} from "./account-registry"

// ============================================================
// Test fixtures
// ============================================================

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "test-account",
    label: "Test Account",
    provider: "openai",
    auth_type: "api-key",
    auth_ref: "env:OPENAI_API_KEY_TEST",
    capabilities: ["openai/gpt-5.4-mini", "openai/gpt-5.5"],
    tier: "paid-per-token",
    priority: 50,
    ...overrides,
  }
}

function makeRegistry(accounts: Account[]): AccountRegistry {
  return { version: 1, accounts }
}

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cheapcode-account-registry-test-"))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ============================================================
// defaultRegistryPath
// ============================================================

describe("defaultRegistryPath", () => {
  test("respects XDG_CONFIG_HOME when set", () => {
    const original = process.env.XDG_CONFIG_HOME
    process.env.XDG_CONFIG_HOME = "/custom/xdg"
    try {
      expect(defaultRegistryPath()).toBe("/custom/xdg/cheapcode/accounts.json")
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME
      else process.env.XDG_CONFIG_HOME = original
    }
  })

  test("falls back to ~/.config when XDG_CONFIG_HOME unset", () => {
    const original = process.env.XDG_CONFIG_HOME
    delete process.env.XDG_CONFIG_HOME
    try {
      const path = defaultRegistryPath()
      expect(path.endsWith("/.config/cheapcode/accounts.json")).toBe(true)
    } finally {
      if (original !== undefined) process.env.XDG_CONFIG_HOME = original
    }
  })
})

// ============================================================
// validateRegistry
// ============================================================

describe("validateRegistry", () => {
  test("accepts valid empty registry", () => {
    const result = validateRegistry({ version: 1, accounts: [] })
    expect(result.accounts.length).toBe(0)
  })

  test("accepts valid registry with one account", () => {
    const acc = makeAccount()
    const result = validateRegistry(makeRegistry([acc]))
    expect(result.accounts.length).toBe(1)
    expect(result.accounts[0].id).toBe("test-account")
  })

  test("rejects null root", () => {
    expect(() => validateRegistry(null)).toThrow(AccountRegistryError)
  })

  test("rejects wrong version", () => {
    expect(() => validateRegistry({ version: 2, accounts: [] })).toThrow(/unsupported version/)
  })

  test("rejects non-array accounts", () => {
    expect(() => validateRegistry({ version: 1, accounts: "not-an-array" })).toThrow(/must be an array/)
  })

  test("rejects missing required field", () => {
    expect(() =>
      validateRegistry({
        version: 1,
        accounts: [{ id: "x", label: "L", provider: "p", auth_type: "api-key", auth_ref: "env:X", tier: "free", priority: 0 }],
      }),
    ).toThrow(/missing required field "capabilities"/)
  })

  test("rejects duplicate account id", () => {
    const dup = [makeAccount({ id: "same" }), makeAccount({ id: "same", label: "Other" })]
    expect(() => validateRegistry(makeRegistry(dup))).toThrow(/duplicate account id "same"/)
  })

  test("rejects invalid auth_type enum", () => {
    expect(() =>
      validateRegistry(makeRegistry([makeAccount({ auth_type: "magic-cookie" as never })])),
    ).toThrow(/auth_type "magic-cookie"/)
  })

  test("rejects invalid tier enum", () => {
    expect(() => validateRegistry(makeRegistry([makeAccount({ tier: "premium" as never })]))).toThrow(/tier "premium"/)
  })

  test("rejects non-finite priority", () => {
    expect(() => validateRegistry(makeRegistry([makeAccount({ priority: NaN })]))).toThrow(/priority must be a finite number/)
  })

  test("rejects empty capabilities not-string-array", () => {
    expect(() =>
      validateRegistry(makeRegistry([makeAccount({ capabilities: [123 as never] })])),
    ).toThrow(/capabilities must be a string array/)
  })
})

// ============================================================
// loadRegistry
// ============================================================

describe("loadRegistry", () => {
  test("returns empty registry when file does not exist", () => {
    const result = loadRegistry("/nonexistent/path/accounts.json")
    expect(result.accounts.length).toBe(0)
    expect(result.version).toBe(1)
  })

  test("returns empty registry when file is empty", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      writeFileSync(path, "")
      const result = loadRegistry(path)
      expect(result.accounts.length).toBe(0)
    })
  })

  test("loads valid registry from disk", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      writeFileSync(path, JSON.stringify(makeRegistry([makeAccount({ id: "from-disk" })])))
      const result = loadRegistry(path)
      expect(result.accounts.length).toBe(1)
      expect(result.accounts[0].id).toBe("from-disk")
    })
  })

  test("throws on malformed JSON", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      writeFileSync(path, "{ not json")
      expect(() => loadRegistry(path)).toThrow(AccountRegistryError)
    })
  })
})

// ============================================================
// resolveAccount
// ============================================================

describe("resolveAccount", () => {
  test("empty registry returns null with reason", () => {
    const result = resolveAccount(makeRegistry([]), { targetModel: "openai/gpt-5.5" })
    expect(result.account).toBeNull()
    expect(result.reason).toBe("registry-empty")
  })

  test("picks higher-priority account when both have capability", () => {
    const high = makeAccount({ id: "high", priority: 100 })
    const low = makeAccount({ id: "low", priority: 50 })
    const result = resolveAccount(makeRegistry([low, high]), { targetModel: "openai/gpt-5.5" })
    expect(result.account?.id).toBe("high")
  })

  test("breaks ties by quota remaining when priorities equal", () => {
    const a = makeAccount({ id: "a", priority: 50 })
    const b = makeAccount({ id: "b", priority: 50 })
    const result = resolveAccount(makeRegistry([a, b]), {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.id === "a" ? 0.3 : 0.8),
    })
    expect(result.account?.id).toBe("b")
  })

  test("filters accounts by capability", () => {
    const limited = makeAccount({ id: "limited", capabilities: ["openai/gpt-5.4-mini"], priority: 100 })
    const universal = makeAccount({ id: "universal", capabilities: ["*"], priority: 50 })
    const result = resolveAccount(makeRegistry([limited, universal]), { targetModel: "openai/gpt-5.5-pro" })
    expect(result.account?.id).toBe("universal")
  })

  test("excludes accounts below quota floor", () => {
    const high = makeAccount({ id: "high", priority: 100 })
    const low = makeAccount({ id: "low", priority: 50 })
    const result = resolveAccount(makeRegistry([high, low]), {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.id === "high" ? 0.05 : 0.9),
      quotaFloor: 0.1,
    })
    expect(result.account?.id).toBe("low")
  })

  test("returns null when all accounts exhausted", () => {
    const a = makeAccount({ id: "a" })
    const b = makeAccount({ id: "b" })
    const result = resolveAccount(makeRegistry([a, b]), {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: () => 0.05,
      quotaFloor: 0.1,
    })
    expect(result.account).toBeNull()
    expect(result.reason).toContain("no-eligible-account")
  })

  test("excludes unavailable accounts", () => {
    const a = makeAccount({ id: "a", priority: 100 })
    const b = makeAccount({ id: "b", priority: 50 })
    const result = resolveAccount(makeRegistry([a, b]), {
      targetModel: "openai/gpt-5.5",
      unavailableIds: new Set(["a"]),
    })
    expect(result.account?.id).toBe("b")
  })

  test("preferred account override picks it when valid", () => {
    const a = makeAccount({ id: "a", priority: 100 })
    const b = makeAccount({ id: "b", priority: 50 })
    const result = resolveAccount(makeRegistry([a, b]), {
      targetModel: "openai/gpt-5.5",
      preferredAccountId: "b",
    })
    expect(result.account?.id).toBe("b")
    expect(result.reason).toBe("preferred-account-selected:b")
  })

  test("preferred account not found returns null", () => {
    const result = resolveAccount(makeRegistry([makeAccount({ id: "a" })]), {
      targetModel: "openai/gpt-5.5",
      preferredAccountId: "ghost",
    })
    expect(result.account).toBeNull()
    expect(result.reason).toContain("preferred-account-not-found")
  })

  test("preferred account without capability returns null", () => {
    const acc = makeAccount({ id: "a", capabilities: ["openai/gpt-5.4-mini"] })
    const result = resolveAccount(makeRegistry([acc]), {
      targetModel: "openai/gpt-5.5-pro",
      preferredAccountId: "a",
    })
    expect(result.account).toBeNull()
    expect(result.reason).toContain("preferred-account-no-capability")
  })

  test("preferred account below quota floor returns null", () => {
    const acc = makeAccount({ id: "a" })
    const result = resolveAccount(makeRegistry([acc]), {
      targetModel: "openai/gpt-5.5",
      preferredAccountId: "a",
      quotaRemaining: () => 0.05,
      quotaFloor: 0.1,
    })
    expect(result.account).toBeNull()
    expect(result.reason).toContain("preferred-account-below-floor")
  })

  test("realistic multi-account scenario from groundwork doc", () => {
    // Per docs/multi-account-groundwork.md test-table row 1:
    // 2 OpenAI accounts (personal subscription priority 100, team API priority 50)
    // both have quota → picks personal
    const personal = makeAccount({
      id: "openai-personal",
      provider: "openai",
      auth_type: "consumer-oauth",
      auth_ref: "~/.local/share/opencode/auth.json#openai",
      capabilities: ["openai/gpt-5.4-mini", "openai/gpt-5.4", "openai/gpt-5.5", "openai/gpt-5.5-pro"],
      tier: "subscription",
      priority: 100,
    })
    const team = makeAccount({
      id: "openai-team-1",
      provider: "openai",
      auth_type: "api-key",
      auth_ref: "env:OPENAI_API_KEY_TEAM",
      capabilities: ["openai/gpt-5.4-mini", "openai/gpt-5.5", "openai/gpt-5.5-pro"],
      tier: "paid-per-token",
      priority: 50,
    })
    const router = makeAccount({
      id: "openrouter-default",
      provider: "openrouter",
      auth_type: "api-key",
      auth_ref: "env:OPENROUTER_API_KEY",
      capabilities: ["*"],
      tier: "paid-per-token",
      priority: 10,
    })
    const registry = makeRegistry([personal, team, router])

    // Row 1: both available → personal
    const r1 = resolveAccount(registry, {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: () => 0.95,
    })
    expect(r1.account?.id).toBe("openai-personal")

    // Row 2: personal at 5% → drops to team
    const r2 = resolveAccount(registry, {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.id === "openai-personal" ? 0.05 : 0.95),
    })
    expect(r2.account?.id).toBe("openai-team-1")

    // Row 3: both OpenAI exhausted → openrouter
    const r3 = resolveAccount(registry, {
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.provider === "openai" ? 0.02 : 0.95),
    })
    expect(r3.account?.id).toBe("openrouter-default")
  })
})
