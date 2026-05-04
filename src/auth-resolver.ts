/**
 * auth-resolver.ts — resolve account auth_ref strings into actual credentials (M3a of multi-account rollout).
 *
 * Scope of THIS file:
 *   - Pure type definitions for resolved credentials (oauth | api-key | managed-pool)
 *   - resolveAuthRef(): reads opencode auth.json or env vars, never proxies
 *
 * Out of scope:
 *   - SDK client construction (M3b dispatch-with-account)
 *   - OAuth refresh flow (defer; access tokens have non-trivial lifetimes today)
 *   - managed-pool implementation (future when team/billing-pool surfaces)
 *
 * Per atom 0007 anti-fab + memory project_credential_buckets.md: cheapcode
 * NEVER duplicates or proxies credentials. It only RESOLVES references that
 * point AT operator-managed credential stores (opencode's auth.json or env
 * vars). Khātim-disk bucket only.
 *
 * Per memory project_2026_04_29_strategic_pivot.md: bab/khatim's
 * "CF-Workers→chatgpt.com anti-bot ceiling" failure was caused by trying to
 * proxy consumer OAuth through cloud. This module specifically refuses that
 * pattern — auth_ref resolution is local-only; OAuth tokens stay where opencode
 * put them.
 */

import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

// ============================================================
// Resolved-credential types
// ============================================================

export type ResolvedAuth =
  | {
      kind: "oauth"
      /** Bearer token to use in Authorization header. */
      access: string
      /** Refresh token (may be empty if provider doesn't issue one). */
      refresh: string
      /** Expiry timestamp in ms-since-epoch (0 if unknown). */
      expires: number
      /** Provider account id (for daftar attribution). */
      accountId: string
    }
  | {
      kind: "api-key"
      /** API key value. */
      key: string
    }

export class AuthResolutionError extends Error {
  constructor(
    message: string,
    /** "missing-file" | "missing-key" | "missing-env" | "unsupported-format" | "parse-error" */
    public readonly code: string,
  ) {
    super(message)
    this.name = "AuthResolutionError"
  }
}

// ============================================================
// auth.json reader (opencode-managed)
// ============================================================

/**
 * Default opencode auth.json path. Resolves ~ → homedir.
 */
export function defaultOpencodeAuthPath(): string {
  return join(homedir(), ".local", "share", "opencode", "auth.json")
}

/**
 * Parse an auth_ref pointing at opencode's auth.json.
 *
 * Format: `~/.local/share/opencode/auth.json#<key>` OR `<absolute-path>#<key>`
 *   - `~` is expanded to homedir
 *   - `#<key>` selects which provider entry
 *
 * Returns the parsed (path, key) tuple or null if format doesn't match.
 */
export function parseAuthJsonRef(authRef: string): { path: string; key: string } | null {
  if (!authRef.includes("#")) return null
  const [rawPath, key] = authRef.split("#", 2)
  if (!key || key.length === 0) return null
  // Only accept paths ending in auth.json (defensive)
  if (!rawPath.endsWith(".json")) return null
  const path = rawPath.startsWith("~/") ? join(homedir(), rawPath.slice(2)) : rawPath
  return { path, key }
}

/**
 * Parse an env: ref. Format: `env:VARNAME`. Returns the variable name or null.
 */
export function parseEnvRef(authRef: string): string | null {
  if (!authRef.startsWith("env:")) return null
  const varName = authRef.slice(4)
  if (varName.length === 0) return null
  return varName
}

/**
 * Parse a managed-pool: ref (future). Format: `managed-pool:<pool-id>`. Returns the pool id or null.
 */
export function parseManagedPoolRef(authRef: string): string | null {
  if (!authRef.startsWith("managed-pool:")) return null
  const poolId = authRef.slice("managed-pool:".length)
  if (poolId.length === 0) return null
  return poolId
}

// ============================================================
// Resolution
// ============================================================

export interface ResolveAuthOptions {
  /** Override opencode auth.json path (for tests). */
  opencodeAuthPath?: string
  /** Override env lookup (for tests). Defaults to process.env. */
  envLookup?: (varName: string) => string | undefined
}

/**
 * Resolve an auth_ref string into a ResolvedAuth.
 *
 * Throws AuthResolutionError on:
 *   - unsupported format (not auth.json#key, env:VAR, or managed-pool:id)
 *   - missing file
 *   - missing key in auth.json
 *   - missing env var
 *   - malformed auth.json entry
 *   - managed-pool refs (not yet implemented; throws with code "unsupported-format")
 */
export function resolveAuthRef(authRef: string, opts: ResolveAuthOptions = {}): ResolvedAuth {
  // env: VAR
  const envVar = parseEnvRef(authRef)
  if (envVar !== null) {
    const lookup = opts.envLookup ?? ((v: string) => process.env[v])
    const value = lookup(envVar)
    if (value === undefined || value.length === 0) {
      throw new AuthResolutionError(`environment variable ${envVar} not set or empty`, "missing-env")
    }
    return { kind: "api-key", key: value }
  }

  // auth.json#key
  const jsonRef = parseAuthJsonRef(authRef)
  if (jsonRef !== null) {
    const path = opts.opencodeAuthPath ?? jsonRef.path
    if (!existsSync(path)) {
      throw new AuthResolutionError(`opencode auth.json not found at ${path}`, "missing-file")
    }
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(readFileSync(path, "utf-8"))
    } catch (e) {
      throw new AuthResolutionError(`failed to parse ${path}: ${(e as Error).message}`, "parse-error")
    }
    const entry = parsed[jsonRef.key]
    if (entry === undefined) {
      throw new AuthResolutionError(`key "${jsonRef.key}" not found in ${path}`, "missing-key")
    }
    if (entry === null || typeof entry !== "object") {
      throw new AuthResolutionError(`entry "${jsonRef.key}" in ${path} is not an object`, "parse-error")
    }
    return parseOpencodeAuthEntry(jsonRef.key, entry as Record<string, unknown>)
  }

  // managed-pool: (future)
  const poolId = parseManagedPoolRef(authRef)
  if (poolId !== null) {
    throw new AuthResolutionError(
      `managed-pool refs not yet implemented (got "${poolId}")`,
      "unsupported-format",
    )
  }

  throw new AuthResolutionError(
    `unsupported auth_ref format: "${authRef}" (expected auth.json#key, env:VAR, or managed-pool:id)`,
    "unsupported-format",
  )
}

/**
 * Parse a single opencode auth.json entry into ResolvedAuth.
 * Public for tests; pure function.
 */
export function parseOpencodeAuthEntry(key: string, entry: Record<string, unknown>): ResolvedAuth {
  const type = entry.type
  if (type === "oauth") {
    const access = entry.access
    const refresh = entry.refresh ?? ""
    const expires = entry.expires ?? 0
    const accountId = entry.accountId ?? ""
    if (typeof access !== "string" || access.length === 0) {
      throw new AuthResolutionError(`oauth entry "${key}" missing access token`, "parse-error")
    }
    return {
      kind: "oauth",
      access,
      refresh: typeof refresh === "string" ? refresh : "",
      expires: typeof expires === "number" ? expires : 0,
      accountId: typeof accountId === "string" ? accountId : "",
    }
  }
  if (type === "api" || type === "api-key") {
    // opencode's own api-key entries use {type: "api", key: "..."}
    const apiKey = entry.key
    if (typeof apiKey !== "string" || apiKey.length === 0) {
      throw new AuthResolutionError(`api-key entry "${key}" missing key`, "parse-error")
    }
    return { kind: "api-key", key: apiKey }
  }
  throw new AuthResolutionError(
    `unsupported auth entry type "${String(type)}" for key "${key}"`,
    "unsupported-format",
  )
}

/**
 * Cheap-side check: is the resolved oauth token expired?
 *
 * `bufferMs` is a safety margin (default 60s) — if the token expires within
 * this many ms, we consider it expired-for-our-purposes so we don't dispatch
 * with a token about to die mid-call.
 *
 * Returns true if expired (or expiring soon); false if still good.
 * For api-key entries always returns false.
 *
 * Caller decides what to do with expired tokens — refresh flow is M3.x+ scope.
 */
export function isAuthExpired(auth: ResolvedAuth, bufferMs: number = 60_000, now: number = Date.now()): boolean {
  if (auth.kind !== "oauth") return false
  if (auth.expires === 0) return false // unknown expiry — assume valid
  return auth.expires <= now + bufferMs
}
