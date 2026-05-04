/**
 * account-registry.ts — multi-account credential vault for cheapcode (M2 of multi-account rollout).
 *
 * Per docs/multi-account-groundwork.md design: cheapcode owns the multi-account
 * state at ~/.config/cheapcode/accounts.json; opencode stays one-account-per-
 * provider (its model); cheapcode multiplexes underneath at dispatch time.
 *
 * Scope of THIS file (M2):
 *   - Account / AccountRegistry types
 *   - File-system loader (read + parse + validate)
 *   - Pure resolution function (in-memory, unit-testable)
 *
 * Out of scope (M3):
 *   - Auth-ref resolution (reading auth.json / env vars)
 *   - SDK client construction with chosen account's auth
 *   - Integration into cheapcode-tiers.ts dispatch path
 *
 * Per atom 0007 anti-fab: this file does NOT proxy or rewrite opencode's
 * auth.json. It only REFERENCES auth entries that opencode/operator manage
 * separately. Cheapcode never owns or duplicates credentials.
 *
 * Per memory project_credential_buckets.md: three credential buckets remain
 * cleanly separated — Sanad-side BYOK / Khātim-disk auth.json / Bāb-browser.
 * This file operates in the Khātim-disk bucket only.
 */

import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// ============================================================
// Types
// ============================================================

export type AuthType = "consumer-oauth" | "api-key" | "managed-pool"

export type AccountTier = "subscription" | "paid-per-token" | "free"

export interface Account {
  /** Unique identifier within the registry. */
  id: string
  /** Human-readable label for UI / daftar attribution. */
  label: string
  /** Provider key — must match one of cheapcode/opencode's known providers. */
  provider: string
  /** How auth is resolved at dispatch time. */
  auth_type: AuthType
  /**
   * Reference to the credential. Format conventions:
   *   "~/.local/share/opencode/auth.json#openai"   — opencode auth entry
   *   "env:OPENAI_API_KEY_TEAM"                    — environment variable
   *   "managed-pool:saastemly-team-1"              — managed-pool ref (future)
   * Resolution is deferred to dispatch time (M3) — not parsed here.
   */
  auth_ref: string
  /**
   * Model ids this account can access. Use `["*"]` for "all".
   * Compared against the router's chosen target model id.
   */
  capabilities: string[]
  /** Account billing tier (used for cost attribution + selection priority hints). */
  tier: AccountTier
  /**
   * Selection priority. Higher = preferred. Ties are broken by quota
   * remaining (more quota wins).
   */
  priority: number
}

export interface AccountRegistry {
  /** Schema version for future migration. */
  version: 1
  /** Account list — resolution scans in registry order, then sorts by priority. */
  accounts: Account[]
}

// ============================================================
// Default file path
// ============================================================

/**
 * Default registry path. Honors XDG_CONFIG_HOME for substrate-discipline portability.
 * Returns the absolute path a load call would default to. Pure — no FS access.
 */
export function defaultRegistryPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config")
  return join(base, "cheapcode", "accounts.json")
}

// ============================================================
// Validation
// ============================================================

const VALID_AUTH_TYPES: ReadonlySet<AuthType> = new Set([
  "consumer-oauth",
  "api-key",
  "managed-pool",
])

const VALID_TIERS: ReadonlySet<AccountTier> = new Set([
  "subscription",
  "paid-per-token",
  "free",
])

export class AccountRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AccountRegistryError"
  }
}

/**
 * Validate a parsed JSON object as an AccountRegistry. Throws AccountRegistryError
 * on schema violation. Pure — no FS access.
 */
export function validateRegistry(raw: unknown): AccountRegistry {
  if (raw === null || typeof raw !== "object") {
    throw new AccountRegistryError("registry root must be an object")
  }
  const root = raw as Record<string, unknown>
  if (root.version !== 1) {
    throw new AccountRegistryError(`unsupported version ${String(root.version)} (expected 1)`)
  }
  if (!Array.isArray(root.accounts)) {
    throw new AccountRegistryError("registry.accounts must be an array")
  }
  const seenIds = new Set<string>()
  const accounts: Account[] = []
  for (let i = 0; i < root.accounts.length; i++) {
    const a = root.accounts[i]
    if (a === null || typeof a !== "object") {
      throw new AccountRegistryError(`accounts[${i}] must be an object`)
    }
    const acc = a as Record<string, unknown>
    const required = ["id", "label", "provider", "auth_type", "auth_ref", "capabilities", "tier", "priority"]
    for (const k of required) {
      if (!(k in acc)) {
        throw new AccountRegistryError(`accounts[${i}] missing required field "${k}"`)
      }
    }
    if (typeof acc.id !== "string" || acc.id.length === 0) {
      throw new AccountRegistryError(`accounts[${i}].id must be a non-empty string`)
    }
    if (seenIds.has(acc.id)) {
      throw new AccountRegistryError(`duplicate account id "${acc.id}"`)
    }
    seenIds.add(acc.id)
    if (typeof acc.label !== "string") {
      throw new AccountRegistryError(`accounts[${i}].label must be a string`)
    }
    if (typeof acc.provider !== "string" || acc.provider.length === 0) {
      throw new AccountRegistryError(`accounts[${i}].provider must be a non-empty string`)
    }
    if (typeof acc.auth_type !== "string" || !VALID_AUTH_TYPES.has(acc.auth_type as AuthType)) {
      throw new AccountRegistryError(
        `accounts[${i}].auth_type "${String(acc.auth_type)}" not in {consumer-oauth, api-key, managed-pool}`,
      )
    }
    if (typeof acc.auth_ref !== "string" || acc.auth_ref.length === 0) {
      throw new AccountRegistryError(`accounts[${i}].auth_ref must be a non-empty string`)
    }
    if (!Array.isArray(acc.capabilities) || !acc.capabilities.every((c) => typeof c === "string")) {
      throw new AccountRegistryError(`accounts[${i}].capabilities must be a string array`)
    }
    if (typeof acc.tier !== "string" || !VALID_TIERS.has(acc.tier as AccountTier)) {
      throw new AccountRegistryError(
        `accounts[${i}].tier "${String(acc.tier)}" not in {subscription, paid-per-token, free}`,
      )
    }
    if (typeof acc.priority !== "number" || !Number.isFinite(acc.priority)) {
      throw new AccountRegistryError(`accounts[${i}].priority must be a finite number`)
    }
    accounts.push({
      id: acc.id,
      label: acc.label,
      provider: acc.provider,
      auth_type: acc.auth_type as AuthType,
      auth_ref: acc.auth_ref,
      capabilities: acc.capabilities as string[],
      tier: acc.tier as AccountTier,
      priority: acc.priority,
    })
  }
  return { version: 1, accounts }
}

// ============================================================
// Loader
// ============================================================

/**
 * Load and validate an account registry from disk.
 *
 * Behavior:
 *   - Missing file → empty registry (backward-compatible; no error)
 *   - Empty / whitespace-only file → empty registry
 *   - Malformed JSON → throws AccountRegistryError
 *   - Invalid schema → throws AccountRegistryError
 *
 * Caller-side: use `defaultRegistryPath()` for production; pass an explicit
 * path for tests.
 */
export function loadRegistry(path: string = defaultRegistryPath()): AccountRegistry {
  if (!existsSync(path)) {
    return { version: 1, accounts: [] }
  }
  const raw = readFileSync(path, "utf-8").trim()
  if (raw.length === 0) {
    return { version: 1, accounts: [] }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new AccountRegistryError(`failed to parse JSON at ${path}: ${(e as Error).message}`)
  }
  return validateRegistry(parsed)
}

// ============================================================
// Resolution
// ============================================================

/**
 * Inputs for resolving the best account for a given target model.
 * `quotaRemaining` is a callback so this module stays decoupled from
 * mizan-shim's QuotaState shape — caller provides the lookup.
 */
export interface ResolveOptions {
  /** Target model id from the router's RouteDecision (e.g. "openai/gpt-5.5"). */
  targetModel: string
  /** Optional override — if set + matches a registered account, picks it. */
  preferredAccountId?: string
  /**
   * Optional quota-remaining lookup, returns 1.0 = full, 0.0 = exhausted.
   * If omitted, all accounts treated as full quota.
   */
  quotaRemaining?: (account: Account) => number
  /**
   * Floor below which an account is excluded (default 0.10 = 10% remaining).
   */
  quotaFloor?: number
  /**
   * Optional set of accounts marked temporarily-unavailable
   * (e.g., recent auth-failure). Excluded from selection.
   */
  unavailableIds?: ReadonlySet<string>
}

export interface ResolutionResult {
  /** The chosen account, or null if no account satisfies constraints. */
  account: Account | null
  /** Reason string for audit / daftar attribution. */
  reason: string
}

/**
 * Resolve the best account for a given target model.
 *
 * Decision order (per docs/multi-account-groundwork.md):
 *   1. If preferredAccountId set + that account matches capability + has quota → return it
 *   2. Filter to accounts with capability for target model (or "*")
 *   3. Filter to accounts with quota remaining > floor
 *   4. Filter out unavailable accounts
 *   5. Sort by priority desc; tiebreak by quotaRemaining desc
 *   6. Return top, or null if none survive (caller should fall back to next-rung-down model)
 */
export function resolveAccount(registry: AccountRegistry, opts: ResolveOptions): ResolutionResult {
  const floor = opts.quotaFloor ?? 0.1
  const unavailable = opts.unavailableIds ?? new Set<string>()
  const quotaOf = (a: Account): number => (opts.quotaRemaining ? opts.quotaRemaining(a) : 1.0)

  if (registry.accounts.length === 0) {
    return { account: null, reason: "registry-empty" }
  }

  // Step 1: explicit preferred-account override
  if (opts.preferredAccountId) {
    const preferred = registry.accounts.find((a) => a.id === opts.preferredAccountId)
    if (!preferred) {
      return { account: null, reason: `preferred-account-not-found:${opts.preferredAccountId}` }
    }
    if (unavailable.has(preferred.id)) {
      return { account: null, reason: `preferred-account-unavailable:${preferred.id}` }
    }
    if (!hasCapability(preferred, opts.targetModel)) {
      return { account: null, reason: `preferred-account-no-capability:${preferred.id}:${opts.targetModel}` }
    }
    const q = quotaOf(preferred)
    if (q <= floor) {
      return { account: null, reason: `preferred-account-below-floor:${preferred.id}:q=${q}` }
    }
    return { account: preferred, reason: `preferred-account-selected:${preferred.id}` }
  }

  // Step 2-4: capability + quota + availability filter
  const eligible = registry.accounts
    .filter((a) => hasCapability(a, opts.targetModel))
    .filter((a) => !unavailable.has(a.id))
    .filter((a) => quotaOf(a) > floor)

  if (eligible.length === 0) {
    return { account: null, reason: `no-eligible-account:${opts.targetModel}` }
  }

  // Step 5: sort priority desc, quotaRemaining desc as tiebreak
  eligible.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority
    return quotaOf(b) - quotaOf(a)
  })

  return { account: eligible[0], reason: `priority-quota-selected:${eligible[0].id}` }
}

/**
 * Capability check: account either lists target model in capabilities, or has "*".
 */
function hasCapability(account: Account, targetModel: string): boolean {
  if (account.capabilities.includes("*")) return true
  return account.capabilities.includes(targetModel)
}
