/**
 * dispatch-with-pool.ts — credential-pool dispatch wrapper (M17 Phase A.3).
 *
 * Sibling of dispatch-with-account.ts. The registry-based path remains for
 * callers that built up Account records explicitly; this path consumes the
 * M16 Provider.ListResult.credentials shape directly via CredentialPool +
 * CooldownTracker. Use this from cheapcode-tiers / router when the input is
 * "any auth.json key for canonical X" rather than "specific Account by id."
 *
 * Per M17-DISPATCH-CONTRACT.md §A3.
 *
 * Behavior:
 *   1. pickCredential(pool, canonical) → if undefined, all candidates cooled,
 *      throw NoAvailableCredentialError so caller escalates-down a tier.
 *   2. Resolve auth via auth-resolver (auth.json#<key>).
 *   3. Caller's dispatch callback runs with (authKey, auth, targetModel).
 *   4. On error: classify via CooldownTracker.classifyError → mark cooldown
 *      → rethrow (caller decides retry policy; this layer is the policy
 *      pre-condition, not the retry loop).
 *   5. On success: no cooldown change.
 *
 * Per atom 0007 anti-fab: this wrapper never constructs SDK clients; caller
 * still does that with the resolved auth. Wrapper returns attribution.
 */

import { CooldownTracker, type CooldownReason } from "./cooldown"
import type { CredentialPool } from "./credential-pool"
import { pickCredential } from "./credential-pool"
import type { ResolvedAuth } from "./auth-resolver"
import { resolveAuthRef } from "./auth-resolver"

export interface PoolDispatchInput {
  authKey: string
  canonical: string
  auth: ResolvedAuth
  targetModel: string
}

export interface PoolAttribution {
  auth_key: string
  canonical_provider: string
  auth_kind: "oauth" | "api-key"
  target_model: string
  cooldown_skipped: string[] // keys that were cooled-out at pick time
}

export interface PoolDispatchOutput<T> {
  result: T
  attribution: PoolAttribution
}

export interface DispatchWithPoolOptions<T> {
  pool: CredentialPool
  /** Canonical providerID (e.g. "openai", "openrouter"). */
  canonical: string
  /** Target model id (e.g. "openai/gpt-5.5"). Passed through to dispatch. */
  targetModel: string
  /** Caller-provided dispatch — constructs SDK with the resolved auth. */
  dispatch: (input: PoolDispatchInput) => Promise<T>
  /** Override opencode auth.json path (for tests). */
  opencodeAuthPath?: string
  /** Override env lookup (for tests). */
  envLookup?: (varName: string) => string | undefined
  /** Persist cooldown state after each marked failure (default true). */
  persistCooldownOnError?: boolean
}

export class NoAvailableCredentialError extends Error {
  constructor(
    public readonly canonical: string,
    public readonly cooledKeys: string[],
  ) {
    super(
      `no available credential for canonical provider "${canonical}" — all ${cooledKeys.length} candidate(s) cooled: ${cooledKeys.join(", ")}`,
    )
    this.name = "NoAvailableCredentialError"
  }
}

export async function dispatchWithPool<T>(
  opts: DispatchWithPoolOptions<T>,
): Promise<PoolDispatchOutput<T>> {
  const candidates = opts.pool.candidates[opts.canonical] ?? []
  const before = candidates.filter((k) => !opts.pool.cooldown.isAvailable(k))

  const authKey = pickCredential(opts.pool, opts.canonical)
  if (authKey === undefined) {
    throw new NoAvailableCredentialError(opts.canonical, before)
  }

  // Build auth_ref — for now assume auth.json#<key>; auth-resolver resolves it.
  const auth = resolveAuthRef(`auth.json#${authKey}`, {
    opencodeAuthPath: opts.opencodeAuthPath,
    envLookup: opts.envLookup,
  })

  let result: T
  try {
    result = await opts.dispatch({
      authKey,
      canonical: opts.canonical,
      auth,
      targetModel: opts.targetModel,
    })
  } catch (err) {
    const reason = CooldownTracker.classifyError(err)
    if (reason) {
      const retryAfter = parseRetryAfter(err)
      opts.pool.cooldown.mark(authKey, reason, retryAfter)
      if (opts.persistCooldownOnError !== false) {
        // fire-and-forget; if save fails, in-memory state still tracks
        opts.pool.cooldown.save().catch(() => undefined)
      }
    }
    throw err
  }

  return {
    result,
    attribution: {
      auth_key: authKey,
      canonical_provider: opts.canonical,
      auth_kind: auth.kind,
      target_model: opts.targetModel,
      cooldown_skipped: before,
    },
  }
}

function parseRetryAfter(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return
  const e = err as { headers?: Record<string, string> | Headers; retryAfter?: number | string }
  if (typeof e.retryAfter === "number") return e.retryAfter * 1000
  if (typeof e.retryAfter === "string") {
    const n = Number(e.retryAfter)
    if (!Number.isNaN(n)) return n * 1000
  }
  if (e.headers) {
    const h =
      e.headers instanceof Headers
        ? e.headers.get("retry-after")
        : e.headers["retry-after"] ?? e.headers["Retry-After"]
    if (h) {
      const n = Number(h)
      if (!Number.isNaN(n)) return n * 1000
    }
  }
  return
}

export type { CooldownReason }
