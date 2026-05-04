/**
 * credential-pool.ts — credential-aware dispatch candidate selection (M17 Phase A.1).
 *
 * Bridges the M16 Provider.ListResult.credentials field (fork commits 85cd4d7c1
 * + 28d410423) into the router. Builds Map<canonical, [authKey, ...]> from the
 * server's response, picks a non-cooldowned key with round-robin fairness.
 *
 * Per M17-DISPATCH-CONTRACT.md §A1.
 *
 * Auth.json keying convention (post-M16):
 *   - canonical: providerID === auth.json key (e.g. "openai")
 *   - aliased: auth.json key with optional .providerID metadata pointing back
 *     at canonical (e.g. "openai-2" with providerID="openai")
 */

import { CooldownTracker } from "./cooldown"

/** Shape of `provider.list()` response we depend on (post-M16). */
export interface ProviderListShape {
  connected: string[]
  credentials?: Array<{ key: string; providerID: string; type: "oauth" | "api" | "wellknown" }>
}

export interface CredentialPool {
  /** canonical providerID → ordered list of auth.json keys (canonical first, aliases after). */
  candidates: Record<string, string[]>
  cooldown: CooldownTracker
  /** round-robin cursors per provider — mutated by pickCredential to spread load. */
  cursors: Record<string, number>
}

export function buildPool(list: ProviderListShape, cooldown: CooldownTracker): CredentialPool {
  const candidates: Record<string, string[]> = {}
  for (const id of list.connected) candidates[id] = [id]
  for (const cred of list.credentials ?? []) {
    if (!candidates[cred.providerID]) continue // ignore stale aliases
    if (candidates[cred.providerID].includes(cred.key)) continue
    candidates[cred.providerID].push(cred.key)
  }
  return { candidates, cooldown, cursors: {} }
}

/**
 * Pick the next available auth.json key for a canonical provider.
 * Round-robin across non-cooldowned candidates; undefined if all are cooled
 * (caller's responsibility to escalate-down to a different tier).
 */
export function pickCredential(
  pool: CredentialPool,
  canonical: string,
  now: number = Date.now(),
): string | undefined {
  const list = pool.candidates[canonical]
  if (!list || list.length === 0) return
  const start = pool.cursors[canonical] ?? 0
  for (let i = 0; i < list.length; i++) {
    const idx = (start + i) % list.length
    const key = list[idx]
    if (pool.cooldown.isAvailable(key, now)) {
      pool.cursors[canonical] = (idx + 1) % list.length
      return key
    }
  }
  return
}

/** Earliest moment any candidate for `canonical` will be available again. */
export function nextAvailableAt(pool: CredentialPool, canonical: string): number | undefined {
  const list = pool.candidates[canonical]
  if (!list) return
  const pending = pool.cooldown.pending()
  let min: number | undefined
  for (const k of list) {
    const e = pending[k]
    if (!e) return Date.now() // some candidate is already free
    if (min === undefined || e.until < min) min = e.until
  }
  return min
}
