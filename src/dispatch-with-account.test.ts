/**
 * dispatch-with-account.test.ts — unit tests for M3b dispatch wrapper.
 *
 * Mock dispatch fn; mocked auth source. No network, no real SDK.
 */

import { describe, expect, test } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  dispatchWithAccount,
  NoEligibleAccountError,
  AuthExpiredError,
  type AccountDispatchInput,
  type AccountDispatchOutput,
} from "./dispatch-with-account"
import type { Account, AccountRegistry } from "./account-registry"

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "test-acc",
    label: "Test",
    provider: "openai",
    auth_type: "api-key",
    auth_ref: "env:TEST_KEY",
    capabilities: ["openai/gpt-5.5", "openai/gpt-5.4-mini"],
    tier: "paid-per-token",
    priority: 50,
    ...overrides,
  }
}

function makeRegistry(accounts: Account[]): AccountRegistry {
  return { version: 1, accounts }
}

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "cheapcode-dispatch-test-"))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ============================================================
// Happy path
// ============================================================

describe("dispatchWithAccount — happy path", () => {
  test("resolves api-key from env, calls dispatch, returns result + attribution", async () => {
    let dispatchInput: AccountDispatchInput | null = null
    const result = await dispatchWithAccount({
      registry: makeRegistry([makeAccount({ id: "primary" })]),
      targetModel: "openai/gpt-5.5",
      envLookup: (v) => (v === "TEST_KEY" ? "fake-secret" : undefined),
      dispatch: async (input) => {
        dispatchInput = input
        return { ok: true, content: "hello" }
      },
    })

    expect(dispatchInput).not.toBeNull()
    expect(dispatchInput!.account.id).toBe("primary")
    expect(dispatchInput!.auth.kind).toBe("api-key")
    if (dispatchInput!.auth.kind === "api-key") {
      expect(dispatchInput!.auth.key).toBe("fake-secret")
    }
    expect(dispatchInput!.targetModel).toBe("openai/gpt-5.5")

    expect(result.result).toEqual({ ok: true, content: "hello" } as never)
    expect(result.attribution.account_id).toBe("primary")
    expect(result.attribution.auth_kind).toBe("api-key")
    expect(result.attribution.target_model).toBe("openai/gpt-5.5")
    expect(result.attribution.selected_reason).toContain("priority-quota-selected")
  })

  test("resolves oauth from auth.json + provides oauth shape to dispatch", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: {
            type: "oauth",
            access: "access-xyz",
            refresh: "refresh-abc",
            expires: Date.now() + 600_000,
            accountId: "acc-001",
          },
        }),
      )
      const acc = makeAccount({
        id: "oauth-acc",
        auth_type: "consumer-oauth",
        auth_ref: `${path}#openai`,
      })
      let receivedAuth: { kind: string } | null = null
      const result = await dispatchWithAccount({
        registry: makeRegistry([acc]),
        targetModel: "openai/gpt-5.5",
        opencodeAuthPath: path,
        dispatch: async (input) => {
          receivedAuth = input.auth
          return "ok"
        },
      })
      expect(receivedAuth!.kind).toBe("oauth")
      expect(result.attribution.auth_kind).toBe("oauth")
    })
  })

  test("multi-account picks higher priority", async () => {
    const high = makeAccount({ id: "high", priority: 100 })
    const low = makeAccount({ id: "low", priority: 50 })
    const result = await dispatchWithAccount({
      registry: makeRegistry([low, high]),
      targetModel: "openai/gpt-5.5",
      envLookup: () => "key",
      dispatch: async () => "ok",
    })
    expect(result.attribution.account_id).toBe("high")
  })

  test("preferred account override picks specific account", async () => {
    const a = makeAccount({ id: "a", priority: 100 })
    const b = makeAccount({ id: "b", priority: 50 })
    const result = await dispatchWithAccount({
      registry: makeRegistry([a, b]),
      targetModel: "openai/gpt-5.5",
      preferredAccountId: "b",
      envLookup: () => "key",
      dispatch: async () => "ok",
    })
    expect(result.attribution.account_id).toBe("b")
    expect(result.attribution.selected_reason).toBe("preferred-account-selected:b")
  })
})

// ============================================================
// No-eligible-account error path
// ============================================================

describe("dispatchWithAccount — no eligible account", () => {
  test("throws NoEligibleAccountError when registry empty", async () => {
    let threw = false
    try {
      await dispatchWithAccount({
        registry: makeRegistry([]),
        targetModel: "openai/gpt-5.5",
        envLookup: () => "key",
        dispatch: async () => "ok",
      })
    } catch (e) {
      threw = true
      expect(e).toBeInstanceOf(NoEligibleAccountError)
      expect((e as NoEligibleAccountError).targetModel).toBe("openai/gpt-5.5")
      expect((e as NoEligibleAccountError).reason).toBe("registry-empty")
    }
    expect(threw).toBe(true)
  })

  test("throws when no account has capability", async () => {
    const acc = makeAccount({ id: "limited", capabilities: ["openai/gpt-5.4-mini"] })
    let threw = false
    try {
      await dispatchWithAccount({
        registry: makeRegistry([acc]),
        targetModel: "openai/gpt-5.5-pro",
        envLookup: () => "key",
        dispatch: async () => "ok",
      })
    } catch (e) {
      threw = true
      expect(e).toBeInstanceOf(NoEligibleAccountError)
    }
    expect(threw).toBe(true)
  })

  test("throws when all accounts below quota floor", async () => {
    const acc = makeAccount({ id: "exhausted" })
    let threw = false
    try {
      await dispatchWithAccount({
        registry: makeRegistry([acc]),
        targetModel: "openai/gpt-5.5",
        quotaRemaining: () => 0.05,
        quotaFloor: 0.1,
        envLookup: () => "key",
        dispatch: async () => "ok",
      })
    } catch (e) {
      threw = true
      expect(e).toBeInstanceOf(NoEligibleAccountError)
    }
    expect(threw).toBe(true)
  })
})

// ============================================================
// Auth-expired path
// ============================================================

describe("dispatchWithAccount — auth expired", () => {
  test("throws AuthExpiredError when oauth expired and no callback", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: {
            type: "oauth",
            access: "expired-token",
            refresh: "r",
            expires: Date.now() - 60_000, // 1 min ago
            accountId: "acc-x",
          },
        }),
      )
      const acc = makeAccount({ id: "expired-acc", auth_ref: `${path}#openai` })
      let threw = false
      try {
        await dispatchWithAccount({
          registry: makeRegistry([acc]),
          targetModel: "openai/gpt-5.5",
          opencodeAuthPath: path,
          dispatch: async () => "ok",
        })
      } catch (e) {
        threw = true
        expect(e).toBeInstanceOf(AuthExpiredError)
        expect((e as AuthExpiredError).accountId).toBe("expired-acc")
      }
      expect(threw).toBe(true)
    })
  })

  test("onAuthExpired returning false throws AuthExpiredError", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: { type: "oauth", access: "x", refresh: "r", expires: Date.now() - 1000, accountId: "" },
        }),
      )
      const acc = makeAccount({ id: "a", auth_ref: `${path}#openai` })
      let calledCallback = false
      let threw = false
      try {
        await dispatchWithAccount({
          registry: makeRegistry([acc]),
          targetModel: "openai/gpt-5.5",
          opencodeAuthPath: path,
          onAuthExpired: () => {
            calledCallback = true
            return false
          },
          dispatch: async () => "ok",
        })
      } catch (e) {
        threw = true
      }
      expect(calledCallback).toBe(true)
      expect(threw).toBe(true)
    })
  })

  test("onAuthExpired returning true proceeds with stale auth", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: { type: "oauth", access: "stale", refresh: "r", expires: Date.now() - 1000, accountId: "" },
        }),
      )
      const acc = makeAccount({ id: "a", auth_ref: `${path}#openai` })
      const result = await dispatchWithAccount({
        registry: makeRegistry([acc]),
        targetModel: "openai/gpt-5.5",
        opencodeAuthPath: path,
        onAuthExpired: () => true,
        dispatch: async (input) => {
          if (input.auth.kind === "oauth") return input.auth.access
          return "?"
        },
      })
      expect(result.result).toBe("stale")
    })
  })

  test("onAuthExpired returning fresh ResolvedAuth replaces auth", async () => {
    await withTempDir(async (dir) => {
      const path = join(dir, "auth.json")
      writeFileSync(
        path,
        JSON.stringify({
          openai: { type: "oauth", access: "stale", refresh: "r", expires: Date.now() - 1000, accountId: "" },
        }),
      )
      const acc = makeAccount({ id: "a", auth_ref: `${path}#openai` })
      const result = await dispatchWithAccount({
        registry: makeRegistry([acc]),
        targetModel: "openai/gpt-5.5",
        opencodeAuthPath: path,
        onAuthExpired: () => ({
          kind: "oauth",
          access: "fresh-after-refresh",
          refresh: "r",
          expires: Date.now() + 600_000,
          accountId: "",
        }),
        dispatch: async (input) => {
          if (input.auth.kind === "oauth") return input.auth.access
          return "?"
        },
      })
      expect(result.result).toBe("fresh-after-refresh")
    })
  })
})

// ============================================================
// Dispatch errors propagate uncaught
// ============================================================

describe("dispatchWithAccount — dispatch errors propagate", () => {
  test("error thrown by dispatch callback bubbles up", async () => {
    let threw = false
    try {
      await dispatchWithAccount({
        registry: makeRegistry([makeAccount()]),
        targetModel: "openai/gpt-5.5",
        envLookup: () => "key",
        dispatch: async () => {
          throw new Error("simulated SDK failure")
        },
      })
    } catch (e) {
      threw = true
      expect((e as Error).message).toBe("simulated SDK failure")
    }
    expect(threw).toBe(true)
  })
})

// ============================================================
// Realistic 3-account multi-provider scenario
// ============================================================

describe("dispatchWithAccount — realistic 3-account scenario", () => {
  test("OpenAI personal -> exhausted -> OpenAI team -> exhausted -> OpenRouter fallback", async () => {
    const personal = makeAccount({
      id: "openai-personal",
      provider: "openai",
      auth_type: "consumer-oauth",
      auth_ref: "env:OAUTH_PERSONAL", // simulate OAuth via env for test simplicity
      capabilities: ["openai/gpt-5.5"],
      tier: "subscription",
      priority: 100,
    })
    const team = makeAccount({
      id: "openai-team",
      provider: "openai",
      auth_type: "api-key",
      auth_ref: "env:OAUTH_TEAM",
      capabilities: ["openai/gpt-5.5"],
      tier: "paid-per-token",
      priority: 50,
    })
    const fallback = makeAccount({
      id: "openrouter-default",
      provider: "openrouter",
      auth_type: "api-key",
      auth_ref: "env:OAUTH_OR",
      capabilities: ["*"],
      tier: "paid-per-token",
      priority: 10,
    })
    const registry = makeRegistry([personal, team, fallback])
    const env: Record<string, string> = {
      OAUTH_PERSONAL: "personal-key",
      OAUTH_TEAM: "team-key",
      OAUTH_OR: "or-key",
    }
    const envLookup = (v: string) => env[v]
    const dispatch = async (input: AccountDispatchInput) => input.account.id

    // Scenario A: all available → personal
    const a = await dispatchWithAccount({
      registry,
      targetModel: "openai/gpt-5.5",
      quotaRemaining: () => 0.95,
      envLookup,
      dispatch,
    })
    expect(a.result).toBe("openai-personal")

    // Scenario B: personal exhausted → team
    const b = await dispatchWithAccount({
      registry,
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.id === "openai-personal" ? 0.05 : 0.95),
      envLookup,
      dispatch,
    })
    expect(b.result).toBe("openai-team")

    // Scenario C: both OpenAI exhausted → openrouter
    const c = await dispatchWithAccount({
      registry,
      targetModel: "openai/gpt-5.5",
      quotaRemaining: (acc) => (acc.provider === "openai" ? 0.02 : 0.95),
      envLookup,
      dispatch,
    })
    expect(c.result).toBe("openrouter-default")
  })
})
