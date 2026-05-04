/**
 * account-mutation.ts — pure CRUD operations on accounts.json (M5a).
 *
 * Companion to account-registry.ts (which is read-only). This module owns
 * WRITE-side operations: add / remove / update / list. Keeps the read-side
 * registry loader as a pure function for fast in-memory use.
 *
 * Per memory project_credential_buckets.md: cheapcode never proxies or
 * duplicates credentials. accounts.json contains REFERENCES (auth_ref)
 * that point at opencode-side auth entries. Mutations here only edit
 * those references + cheapcode-specific metadata (priority, capabilities,
 * tier, label).
 *
 * Per memory feedback_commit_regularly: write-side operations use atomic
 * temp-file + rename pattern so a partial-write can never corrupt the
 * registry — operator's existing accounts survive even if a process is
 * killed mid-write.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import {
  loadRegistry,
  validateRegistry,
  defaultRegistryPath,
  type Account,
  type AccountRegistry,
} from "./account-registry"

// ============================================================
// Result types
// ============================================================

export interface MutationResult {
  ok: boolean
  /** Updated registry (if ok) or pre-mutation registry (if not). */
  registry: AccountRegistry
  /** Error message if ok=false. */
  error?: string
}

// ============================================================
// Atomic write
// ============================================================

/**
 * Write the registry to disk atomically. Creates parent directory if needed.
 * Uses temp-file + rename so partial writes can't corrupt the file.
 */
export function writeRegistry(registry: AccountRegistry, path: string = defaultRegistryPath()): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  // Validate before write — refuse to persist malformed state.
  validateRegistry(registry)
  const tmp = `${path}.tmp.${process.pid}`
  writeFileSync(tmp, JSON.stringify(registry, null, 2) + "\n", { mode: 0o600 })
  renameSync(tmp, path)
}

// ============================================================
// Add
// ============================================================

/**
 * Add a new account. Fails if id already exists.
 * Returns the updated registry on success.
 */
export function addAccount(account: Account, path: string = defaultRegistryPath()): MutationResult {
  const registry = loadRegistry(path)
  if (registry.accounts.some((a) => a.id === account.id)) {
    return { ok: false, registry, error: `account id "${account.id}" already exists` }
  }
  const updated: AccountRegistry = {
    ...registry,
    accounts: [...registry.accounts, account],
  }
  try {
    writeRegistry(updated, path)
  } catch (e) {
    return { ok: false, registry, error: `failed to write registry: ${(e as Error).message}` }
  }
  return { ok: true, registry: updated }
}

// ============================================================
// Remove
// ============================================================

/**
 * Remove an account by id. Fails if id doesn't exist.
 */
export function removeAccount(id: string, path: string = defaultRegistryPath()): MutationResult {
  const registry = loadRegistry(path)
  if (!registry.accounts.some((a) => a.id === id)) {
    return { ok: false, registry, error: `account id "${id}" not found` }
  }
  const updated: AccountRegistry = {
    ...registry,
    accounts: registry.accounts.filter((a) => a.id !== id),
  }
  try {
    writeRegistry(updated, path)
  } catch (e) {
    return { ok: false, registry, error: `failed to write registry: ${(e as Error).message}` }
  }
  return { ok: true, registry: updated }
}

// ============================================================
// Update (partial)
// ============================================================

/**
 * Update fields of an existing account. Fields not in `updates` keep their
 * current values. Fails if id doesn't exist or if updates would create an
 * invalid account.
 *
 * `id` itself is NOT updatable via this method (rename = remove + re-add).
 */
export function updateAccount(
  id: string,
  updates: Partial<Omit<Account, "id">>,
  path: string = defaultRegistryPath(),
): MutationResult {
  const registry = loadRegistry(path)
  const idx = registry.accounts.findIndex((a) => a.id === id)
  if (idx === -1) {
    return { ok: false, registry, error: `account id "${id}" not found` }
  }
  const merged: Account = { ...registry.accounts[idx], ...updates, id }
  const updated: AccountRegistry = {
    ...registry,
    accounts: registry.accounts.map((a, i) => (i === idx ? merged : a)),
  }
  try {
    writeRegistry(updated, path)
  } catch (e) {
    return { ok: false, registry, error: `failed to write registry: ${(e as Error).message}` }
  }
  return { ok: true, registry: updated }
}

// ============================================================
// Read helpers (thin wrappers — keep all account ops in one module)
// ============================================================

/**
 * List all accounts. Returns empty array if registry doesn't exist.
 */
export function listAccounts(path: string = defaultRegistryPath()): Account[] {
  return loadRegistry(path).accounts
}

/**
 * Show one account by id. Returns null if not found.
 */
export function showAccount(id: string, path: string = defaultRegistryPath()): Account | null {
  const accounts = loadRegistry(path).accounts
  return accounts.find((a) => a.id === id) ?? null
}

// ============================================================
// Convenience: provider-aware auth_ref builder
// ============================================================

/**
 * Build a standard auth_ref string for the given provider, pointing at
 * opencode's auth.json entry. This is the canonical pattern for cheapcode
 * accounts that reference opencode-managed credentials.
 *
 * Example: opencodeAuthRef("openai") → "~/.local/share/opencode/auth.json#openai"
 */
export function opencodeAuthRef(providerKey: string): string {
  return `~/.local/share/opencode/auth.json#${providerKey}`
}

/**
 * Build an env-var auth_ref string. Convention: env:VAR_NAME.
 */
export function envAuthRef(varName: string): string {
  return `env:${varName}`
}

export { defaultRegistryPath, type Account, type AccountRegistry }
