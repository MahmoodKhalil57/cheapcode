/**
 * account-discovery.ts — auto-discover cheapcode account candidates from opencode (M8).
 *
 * Operator UX vision (2026-05-04): users add UNLIMITED OpenRouter keys / OpenAI
 * accounts via opencode's native "Custom provider → Connect" flow. cheapcode
 * picks them up automatically without further config.
 *
 * Strategy:
 *   - Read ~/.config/opencode/opencode.json → for each provider entry that
 *     isn't cheapcode itself, treat it as an auto-discovered cheapcode account
 *   - Read ~/.local/share/opencode/auth.json → for each entry without a
 *     corresponding provider config, also treat as auto-discovered
 *   - Infer provider family (openai / openrouter / anthropic / google) from
 *     name and/or baseURL
 *   - Default priority 30 (lower than typical explicit 50, so explicit accounts
 *     in ~/.config/cheapcode/accounts.json always win on conflict)
 *   - id format: "auto:<original-key>" — so explicit accounts (no prefix) and
 *     auto-discovered ones never collide
 *
 * Per memory project_credential_buckets.md: discovery is READ-ONLY against
 * opencode's files. cheapcode never duplicates credentials, never modifies
 * opencode's auth.json, never proxies tokens.
 *
 * Per memory feedback_perfect_confidence_foundations_base + atom 0007 anti-fab:
 * inference is best-effort. If we can't determine a provider family from name
 * or URL, the account still works — we just label its provider field with the
 * raw name. Resolution still works because capabilities match by model id.
 */

import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import {
  loadRegistry,
  type Account,
  type AccountRegistry,
} from "./account-registry"

// ============================================================
// Default paths
// ============================================================

export function defaultOpencodeConfigPath(): string {
  return join(homedir(), ".config", "opencode", "opencode.json")
}

export function defaultOpencodeAuthPath(): string {
  return join(homedir(), ".local", "share", "opencode", "auth.json")
}

// ============================================================
// Provider-family inference
// ============================================================

/**
 * Infer the provider family ("openai" / "openrouter" / etc.) from a provider
 * key + optional baseURL. Best-effort; falls back to the raw name if no
 * pattern matches.
 *
 * Public so tests can verify edge cases.
 */
export function inferProviderFamily(name: string, baseURL: string = ""): string {
  const n = name.toLowerCase()
  const u = baseURL.toLowerCase()

  // baseURL signals (most reliable)
  if (u.includes("openrouter.ai")) return "openrouter"
  if (u.includes("api.openai.com")) return "openai"
  if (u.includes("anthropic.com") || u.includes("claude.ai")) return "anthropic"
  if (u.includes("googleapis.com") || u.includes("gemini") || u.includes("generativelanguage.googleapis")) return "google"
  if (u.includes("groq.com")) return "groq"
  if (u.includes("deepseek.com")) return "deepseek"
  if (u.includes("mistral.ai")) return "mistral"
  if (u.includes("together.ai") || u.includes("together.xyz")) return "together"
  if (u.includes("fireworks.ai")) return "fireworks"

  // name-prefix signals (when baseURL doesn't help)
  if (n.startsWith("openrouter") || n.startsWith("or-") || n.startsWith("or_")) return "openrouter"
  if (n.startsWith("openai") || n.startsWith("oai-")) return "openai"
  if (n.startsWith("anthropic") || n === "claude" || n.startsWith("claude-")) return "anthropic"
  if (n.startsWith("google") || n.startsWith("gemini")) return "google"
  if (n.startsWith("groq")) return "groq"
  if (n.startsWith("deepseek")) return "deepseek"
  if (n.startsWith("mistral")) return "mistral"
  if (n.startsWith("together")) return "together"
  if (n.startsWith("fireworks")) return "fireworks"

  // Fallback: use the name as-is. Caller can still match by capability.
  return name
}

// ============================================================
// Auth-ref resolution from opencode-side data
// ============================================================

/**
 * Determine the auth_ref string for a given opencode provider entry.
 * Returns null if no usable auth source is found.
 *
 * Priority order:
 *   1. options.apiKey === "{env:VAR}" → env: ref (opencode's env-var template)
 *   2. options.apiKey === literal string → still env-encoded if recognizable;
 *      otherwise keep as auth.json reference (assumes opencode also wrote it
 *      to auth.json under the provider key)
 *   3. Provider key has matching auth.json entry → auth.json#<key>
 *   4. None of the above → null (unusable; skip discovery)
 */
function deriveAuthRef(
  providerKey: string,
  providerEntry: Record<string, unknown>,
  authJson: Record<string, unknown> | null,
): string | null {
  const opts = (providerEntry.options ?? {}) as Record<string, unknown>
  const apiKey = opts.apiKey

  if (typeof apiKey === "string" && apiKey.startsWith("{env:") && apiKey.endsWith("}")) {
    // opencode env-var template: "{env:OPENROUTER_API_KEY}"
    return "env:" + apiKey.slice(5, -1)
  }

  // Otherwise prefer auth.json#<key> (opencode's typical pattern for stored creds)
  if (authJson && providerKey in authJson) {
    return `~/.local/share/opencode/auth.json#${providerKey}`
  }

  // No usable ref
  return null
}

// ============================================================
// Discovery
// ============================================================

export interface DiscoveryOptions {
  /** Override opencode.json path. */
  opencodeConfigPath?: string
  /** Override auth.json path. */
  opencodeAuthPath?: string
  /** Provider keys to skip (default: ["cheapcode"]). */
  excludeKeys?: ReadonlySet<string>
  /** Default priority for auto-discovered accounts (default 30). */
  defaultPriority?: number
}

/**
 * Discover cheapcode-account candidates from opencode's config + auth files.
 *
 * Returns an array of Account objects with `id` prefixed `auto:` so they
 * never collide with explicit accounts in ~/.config/cheapcode/accounts.json.
 *
 * Pure-ish (FS read; no writes; no network).
 */
export function discoverOpencodeAccounts(opts: DiscoveryOptions = {}): Account[] {
  const cfgPath = opts.opencodeConfigPath ?? defaultOpencodeConfigPath()
  const authPath = opts.opencodeAuthPath ?? defaultOpencodeAuthPath()
  const exclude = opts.excludeKeys ?? new Set<string>(["cheapcode"])
  const defaultPriority = opts.defaultPriority ?? 30

  // Load auth.json once
  let authJson: Record<string, unknown> | null = null
  if (existsSync(authPath)) {
    try {
      authJson = JSON.parse(readFileSync(authPath, "utf-8")) as Record<string, unknown>
    } catch {
      authJson = null
    }
  }

  const accounts: Account[] = []
  const seenAuthRefs = new Set<string>()

  // ===== Pass 1: opencode.json provider entries =====
  if (existsSync(cfgPath)) {
    let cfg: Record<string, unknown> | null = null
    try {
      cfg = JSON.parse(readFileSync(cfgPath, "utf-8")) as Record<string, unknown>
    } catch {
      cfg = null
    }
    const providers = cfg?.provider as Record<string, unknown> | undefined
    if (providers) {
      for (const [key, value] of Object.entries(providers)) {
        if (exclude.has(key)) continue
        if (value === null || typeof value !== "object") continue
        const entry = value as Record<string, unknown>
        const baseURL = (entry.api as string | undefined) ?? ""
        const family = inferProviderFamily(key, baseURL)
        const auth_ref = deriveAuthRef(key, entry, authJson)
        if (auth_ref === null) continue
        seenAuthRefs.add(auth_ref)
        accounts.push({
          id: `auto:${key}`,
          label: (entry.name as string | undefined) ?? `${key} (auto-discovered)`,
          provider: family,
          auth_type: "api-key",
          auth_ref,
          capabilities: ["*"],
          tier: "paid-per-token",
          priority: defaultPriority,
        })
      }
    }
  }

  // ===== Pass 2: auth.json entries without provider config =====
  // (Opencode sometimes stores OAuth/API entries in auth.json without a
  // corresponding `provider.<key>` block — e.g., the consumer ChatGPT-Plus
  // OAuth flow.)
  if (authJson) {
    for (const key of Object.keys(authJson)) {
      if (exclude.has(key)) continue
      const ref = `~/.local/share/opencode/auth.json#${key}`
      if (seenAuthRefs.has(ref)) continue
      const entry = authJson[key]
      const isOAuth =
        entry !== null &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).type === "oauth"
      accounts.push({
        id: `auto:${key}`,
        label: `${key} (auto-discovered)`,
        provider: inferProviderFamily(key, ""),
        auth_type: isOAuth ? "consumer-oauth" : "api-key",
        auth_ref: ref,
        capabilities: ["*"],
        tier: isOAuth ? "subscription" : "paid-per-token",
        priority: defaultPriority,
      })
    }
  }

  return accounts
}

// ============================================================
// Effective registry (explicit + auto-discovered)
// ============================================================

export interface EffectiveRegistryOptions extends DiscoveryOptions {
  /** Explicit registry path (default ~/.config/cheapcode/accounts.json). */
  registryPath?: string
  /** Skip auto-discovery if true (env-var override possible). */
  disableAutoDiscovery?: boolean
}

/**
 * Load the effective account registry: explicit accounts (from
 * ~/.config/cheapcode/accounts.json) merged with auto-discovered accounts
 * (from opencode's config + auth.json).
 *
 * Conflict resolution: explicit accounts win on id-collision (auto: prefix
 * makes this rare). If both sources have the same auth_ref, the explicit one
 * wins because it's listed first in the merged array AND likely has a
 * customized priority.
 *
 * Auto-discovery can be disabled by:
 *   - setting CHEAPCODE_DISABLE_AUTO_DISCOVERY=1 environment variable
 *   - passing disableAutoDiscovery: true
 */
export function loadEffectiveRegistry(opts: EffectiveRegistryOptions = {}): AccountRegistry {
  const explicit = loadRegistry(opts.registryPath)
  const disable =
    opts.disableAutoDiscovery === true ||
    process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY === "1" ||
    process.env.CHEAPCODE_DISABLE_AUTO_DISCOVERY === "true"
  if (disable) return explicit

  const auto = discoverOpencodeAccounts(opts)
  // Dedup against explicit by id AND by auth_ref
  const explicitIds = new Set(explicit.accounts.map((a) => a.id))
  const explicitRefs = new Set(explicit.accounts.map((a) => a.auth_ref))
  const filtered = auto.filter((a) => !explicitIds.has(a.id) && !explicitRefs.has(a.auth_ref))
  return { version: 1, accounts: [...explicit.accounts, ...filtered] }
}

/**
 * Helper: classify which accounts in a registry are auto-discovered (id
 * starts with "auto:") vs explicit. Useful for CLI / MCP display.
 */
export function classifyAccountSource(account: Account): "explicit" | "auto" {
  return account.id.startsWith("auto:") ? "auto" : "explicit"
}
