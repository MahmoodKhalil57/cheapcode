/**
 * account-mutation.test.ts — unit tests for M5a.
 *
 * Tests the FS-backed write operations using temp directories.
 * Verifies atomic-write pattern (no partial-state corruption).
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  addAccount,
  removeAccount,
  updateAccount,
  listAccounts,
  showAccount,
  writeRegistry,
  opencodeAuthRef,
  envAuthRef,
} from "./account-mutation"
import type { Account, AccountRegistry } from "./account-registry"

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "test-acc",
    label: "Test",
    provider: "openai",
    auth_type: "api-key",
    auth_ref: "env:TEST_KEY",
    capabilities: ["openai/gpt-5.5"],
    tier: "paid-per-token",
    priority: 50,
    ...overrides,
  }
}

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cheapcode-mutation-test-"))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ============================================================
// addAccount
// ============================================================

describe("addAccount", () => {
  test("adds to empty registry, creates file", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      const result = addAccount(makeAccount({ id: "first" }), path)
      expect(result.ok).toBe(true)
      expect(result.registry.accounts.length).toBe(1)
      expect(existsSync(path)).toBe(true)
    })
  })

  test("appends to existing registry", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "a" }), path)
      const r2 = addAccount(makeAccount({ id: "b" }), path)
      expect(r2.ok).toBe(true)
      expect(r2.registry.accounts.length).toBe(2)
    })
  })

  test("rejects duplicate id", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "dup" }), path)
      const r2 = addAccount(makeAccount({ id: "dup", label: "Other" }), path)
      expect(r2.ok).toBe(false)
      expect(r2.error).toContain("already exists")
    })
  })

  test("creates parent directory if missing", () => {
    withTempDir((dir) => {
      const path = join(dir, "nested", "deep", "accounts.json")
      const result = addAccount(makeAccount(), path)
      expect(result.ok).toBe(true)
      expect(existsSync(path)).toBe(true)
    })
  })

  test("written file is valid JSON round-trippable", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "rt" }), path)
      const raw = readFileSync(path, "utf-8")
      const parsed = JSON.parse(raw)
      expect(parsed.version).toBe(1)
      expect(parsed.accounts[0].id).toBe("rt")
    })
  })
})

// ============================================================
// removeAccount
// ============================================================

describe("removeAccount", () => {
  test("removes existing account", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "keep" }), path)
      addAccount(makeAccount({ id: "drop" }), path)
      const r = removeAccount("drop", path)
      expect(r.ok).toBe(true)
      expect(r.registry.accounts.map((a) => a.id)).toEqual(["keep"])
    })
  })

  test("fails when id not found", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "exists" }), path)
      const r = removeAccount("ghost", path)
      expect(r.ok).toBe(false)
      expect(r.error).toContain("not found")
    })
  })
})

// ============================================================
// updateAccount
// ============================================================

describe("updateAccount", () => {
  test("updates a single field", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "u", priority: 50 }), path)
      const r = updateAccount("u", { priority: 100 }, path)
      expect(r.ok).toBe(true)
      expect(r.registry.accounts[0].priority).toBe(100)
      expect(r.registry.accounts[0].id).toBe("u") // id preserved
    })
  })

  test("updates capabilities array", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "u" }), path)
      const r = updateAccount("u", { capabilities: ["*"] }, path)
      expect(r.ok).toBe(true)
      expect(r.registry.accounts[0].capabilities).toEqual(["*"])
    })
  })

  test("fails on unknown id", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      const r = updateAccount("ghost", { priority: 1 }, path)
      expect(r.ok).toBe(false)
    })
  })
})

// ============================================================
// listAccounts / showAccount
// ============================================================

describe("listAccounts / showAccount", () => {
  test("listAccounts on missing file returns empty", () => {
    const accounts = listAccounts("/nonexistent/path/accounts.json")
    expect(accounts.length).toBe(0)
  })

  test("listAccounts returns all accounts in order", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "a" }), path)
      addAccount(makeAccount({ id: "b" }), path)
      addAccount(makeAccount({ id: "c" }), path)
      const accounts = listAccounts(path)
      expect(accounts.map((a) => a.id)).toEqual(["a", "b", "c"])
    })
  })

  test("showAccount returns matching account", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "show-me", label: "Found" }), path)
      const a = showAccount("show-me", path)
      expect(a?.label).toBe("Found")
    })
  })

  test("showAccount returns null when not found", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      const a = showAccount("ghost", path)
      expect(a).toBeNull()
    })
  })
})

// ============================================================
// auth_ref builders
// ============================================================

describe("opencodeAuthRef / envAuthRef", () => {
  test("opencodeAuthRef builds canonical path", () => {
    expect(opencodeAuthRef("openai")).toBe("~/.local/share/opencode/auth.json#openai")
    expect(opencodeAuthRef("openrouter")).toBe("~/.local/share/opencode/auth.json#openrouter")
  })

  test("envAuthRef builds env: prefix", () => {
    expect(envAuthRef("OPENAI_API_KEY")).toBe("env:OPENAI_API_KEY")
  })
})

// ============================================================
// writeRegistry atomicity (defensive)
// ============================================================

describe("writeRegistry — atomicity", () => {
  test("rejects malformed registry on write", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      const bad = { version: 1, accounts: [{ id: "x" }] } as unknown as AccountRegistry
      expect(() => writeRegistry(bad, path)).toThrow()
      // File should NOT exist
      expect(existsSync(path)).toBe(false)
    })
  })

  test("does not corrupt existing file when validation fails", () => {
    withTempDir((dir) => {
      const path = join(dir, "accounts.json")
      addAccount(makeAccount({ id: "preserve" }), path)
      const bad = { version: 1, accounts: [{ id: "x" }] } as unknown as AccountRegistry
      try {
        writeRegistry(bad, path)
      } catch {
        // expected
      }
      // Original file intact
      const reread = listAccounts(path)
      expect(reread.length).toBe(1)
      expect(reread[0].id).toBe("preserve")
    })
  })
})
