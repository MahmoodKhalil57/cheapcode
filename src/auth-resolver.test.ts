/**
 * auth-resolver.test.ts — unit tests for M3a auth resolution.
 *
 * No real credentials. All fixtures inline. Mocked auth.json + env vars.
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  resolveAuthRef,
  parseAuthJsonRef,
  parseEnvRef,
  parseManagedPoolRef,
  parseOpencodeAuthEntry,
  isAuthExpired,
  AuthResolutionError,
  defaultOpencodeAuthPath,
} from "./auth-resolver"

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cheapcode-auth-resolver-test-"))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ============================================================
// Format-parser unit tests
// ============================================================

describe("parseEnvRef", () => {
  test("parses valid env: ref", () => {
    expect(parseEnvRef("env:OPENAI_API_KEY")).toBe("OPENAI_API_KEY")
  })
  test("returns null for non-env ref", () => {
    expect(parseEnvRef("auth.json#openai")).toBeNull()
  })
  test("returns null for empty env name", () => {
    expect(parseEnvRef("env:")).toBeNull()
  })
})

describe("parseAuthJsonRef", () => {
  test("parses ~/.local path with key", () => {
    const r = parseAuthJsonRef("~/.local/share/opencode/auth.json#openai")
    expect(r).not.toBeNull()
    expect(r?.key).toBe("openai")
    expect(r?.path.endsWith("/.local/share/opencode/auth.json")).toBe(true)
  })
  test("parses absolute path with key", () => {
    const r = parseAuthJsonRef("/abs/auth.json#mykey")
    expect(r?.path).toBe("/abs/auth.json")
    expect(r?.key).toBe("mykey")
  })
  test("returns null for missing #", () => {
    expect(parseAuthJsonRef("/abs/auth.json")).toBeNull()
  })
  test("returns null for empty key after #", () => {
    expect(parseAuthJsonRef("/abs/auth.json#")).toBeNull()
  })
  test("returns null for non-.json file", () => {
    expect(parseAuthJsonRef("/abs/foo.txt#key")).toBeNull()
  })
})

describe("parseManagedPoolRef", () => {
  test("parses managed-pool: with id", () => {
    expect(parseManagedPoolRef("managed-pool:saastemly-team-1")).toBe("saastemly-team-1")
  })
  test("returns null for empty pool id", () => {
    expect(parseManagedPoolRef("managed-pool:")).toBeNull()
  })
})

// ============================================================
// parseOpencodeAuthEntry
// ============================================================

describe("parseOpencodeAuthEntry", () => {
  test("parses oauth entry with all fields", () => {
    const r = parseOpencodeAuthEntry("openai", {
      type: "oauth",
      access: "access-token-xyz",
      refresh: "refresh-token-abc",
      expires: 1234567890,
      accountId: "acc_001",
    })
    expect(r.kind).toBe("oauth")
    if (r.kind === "oauth") {
      expect(r.access).toBe("access-token-xyz")
      expect(r.refresh).toBe("refresh-token-abc")
      expect(r.expires).toBe(1234567890)
      expect(r.accountId).toBe("acc_001")
    }
  })

  test("parses oauth entry with minimal fields (defaults)", () => {
    const r = parseOpencodeAuthEntry("p", { type: "oauth", access: "a" })
    if (r.kind === "oauth") {
      expect(r.access).toBe("a")
      expect(r.refresh).toBe("")
      expect(r.expires).toBe(0)
      expect(r.accountId).toBe("")
    }
  })

  test("parses api-key entry (type: api)", () => {
    const r = parseOpencodeAuthEntry("openrouter", { type: "api", key: "sk-foo" })
    expect(r.kind).toBe("api-key")
    if (r.kind === "api-key") expect(r.key).toBe("sk-foo")
  })

  test("parses api-key entry (type: api-key)", () => {
    const r = parseOpencodeAuthEntry("p", { type: "api-key", key: "sk-bar" })
    if (r.kind === "api-key") expect(r.key).toBe("sk-bar")
  })

  test("throws on oauth entry missing access", () => {
    expect(() => parseOpencodeAuthEntry("p", { type: "oauth" })).toThrow(/missing access token/)
  })

  test("throws on api-key entry missing key", () => {
    expect(() => parseOpencodeAuthEntry("p", { type: "api" })).toThrow(/missing key/)
  })

  test("throws on unsupported type", () => {
    expect(() => parseOpencodeAuthEntry("p", { type: "magic" })).toThrow(/unsupported auth entry type/)
  })
})

// ============================================================
// resolveAuthRef (FS + env)
// ============================================================

describe("resolveAuthRef — env: refs", () => {
  test("resolves env ref to api-key", () => {
    const r = resolveAuthRef("env:MY_FAKE_KEY", {
      envLookup: (v) => (v === "MY_FAKE_KEY" ? "fake-secret-value" : undefined),
    })
    expect(r.kind).toBe("api-key")
    if (r.kind === "api-key") expect(r.key).toBe("fake-secret-value")
  })

  test("throws when env var missing", () => {
    expect(() =>
      resolveAuthRef("env:MISSING_VAR", { envLookup: () => undefined }),
    ).toThrow(/MISSING_VAR not set/)
  })

  test("throws when env var empty string", () => {
    expect(() =>
      resolveAuthRef("env:EMPTY", { envLookup: () => "" }),
    ).toThrow(/EMPTY not set or empty/)
  })
})

describe("resolveAuthRef — auth.json refs", () => {
  test("resolves oauth entry from disk", () => {
    withTempDir((dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: {
            type: "oauth",
            access: "access-from-disk",
            refresh: "refresh-from-disk",
            expires: 9999999999,
            accountId: "acc-001",
          },
        }),
      )
      const r = resolveAuthRef(`${path}#openai`)
      expect(r.kind).toBe("oauth")
      if (r.kind === "oauth") {
        expect(r.access).toBe("access-from-disk")
        expect(r.accountId).toBe("acc-001")
      }
    })
  })

  test("resolves api-key entry from disk", () => {
    withTempDir((dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(path, JSON.stringify({ openrouter: { type: "api", key: "sk-disk-test" } }))
      const r = resolveAuthRef(`${path}#openrouter`)
      if (r.kind === "api-key") expect(r.key).toBe("sk-disk-test")
    })
  })

  test("throws on missing file", () => {
    expect(() => resolveAuthRef("/nonexistent/path/auth.json#openai")).toThrow(/not found at/)
  })

  test("throws on missing key", () => {
    withTempDir((dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(path, JSON.stringify({ other: { type: "api", key: "x" } }))
      expect(() => resolveAuthRef(`${path}#missing`)).toThrow(/key "missing" not found/)
    })
  })

  test("throws on malformed JSON", () => {
    withTempDir((dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(path, "{ not valid json")
      expect(() => resolveAuthRef(`${path}#anykey`)).toThrow(/failed to parse/)
    })
  })

  test("opencodeAuthPath override redirects FS read", () => {
    withTempDir((dir) => {
      const overridePath = join(dir, "auth.json")
      writeFileSync(overridePath, JSON.stringify({ openai: { type: "api", key: "sk-override" } }))
      const r = resolveAuthRef("/will-be-ignored.json#openai", { opencodeAuthPath: overridePath })
      if (r.kind === "api-key") expect(r.key).toBe("sk-override")
    })
  })
})

describe("resolveAuthRef — unsupported formats", () => {
  test("managed-pool throws unsupported-format", () => {
    try {
      resolveAuthRef("managed-pool:team-1")
      expect.unreachable("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(AuthResolutionError)
      expect((e as AuthResolutionError).code).toBe("unsupported-format")
    }
  })

  test("garbage ref throws unsupported-format", () => {
    expect(() => resolveAuthRef("not-a-ref-shape")).toThrow(/unsupported auth_ref format/)
  })
})

// ============================================================
// isAuthExpired
// ============================================================

describe("isAuthExpired", () => {
  test("returns false for api-key (no expiry)", () => {
    expect(isAuthExpired({ kind: "api-key", key: "x" })).toBe(false)
  })

  test("returns false for oauth with expires=0 (unknown)", () => {
    expect(
      isAuthExpired({ kind: "oauth", access: "a", refresh: "r", expires: 0, accountId: "" }),
    ).toBe(false)
  })

  test("returns true for oauth past expiry", () => {
    expect(
      isAuthExpired(
        { kind: "oauth", access: "a", refresh: "r", expires: 1000, accountId: "" },
        60_000,
        2000,
      ),
    ).toBe(true)
  })

  test("returns true within buffer-ms of expiry", () => {
    expect(
      isAuthExpired(
        { kind: "oauth", access: "a", refresh: "r", expires: 60_500, accountId: "" },
        60_000,
        1000,
      ),
    ).toBe(true)
  })

  test("returns false outside buffer-ms of expiry", () => {
    expect(
      isAuthExpired(
        { kind: "oauth", access: "a", refresh: "r", expires: 200_000, accountId: "" },
        60_000,
        1000,
      ),
    ).toBe(false)
  })
})

// ============================================================
// defaultOpencodeAuthPath
// ============================================================

describe("defaultOpencodeAuthPath", () => {
  test("returns ~/.local/share/opencode/auth.json", () => {
    const p = defaultOpencodeAuthPath()
    expect(p.endsWith("/.local/share/opencode/auth.json")).toBe(true)
  })
})
