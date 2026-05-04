/**
 * dispatch-with-account.ts — additive multi-account dispatch wrapper (M3b).
 *
 * Composes account-registry (M2) + auth-resolver (M3a) into a thin generic
 * function that the caller (eventually cheapcode-tiers.ts) plugs in WITHOUT
 * needing to change its existing dispatch surface.
 *
 * Per memory project_compat_matrix.md: this layer is OPTIONAL — if no account
 * registry is provided OR registry is empty, callers fall through to vanilla
 * single-account behavior. Multi-account is strictly additive.
 *
 * Per atom 0007 anti-fab: this function does NOT construct SDK clients itself.
 * It hands the caller the resolved (account, auth, target) tuple via a dispatch
 * callback; caller constructs the SDK client with the given auth. This keeps
 * the wrapper free of SDK-version coupling and testable without network.
 *
 * Per memory project_canonical_product_arch.md: this lives Khātim-disk-side
 * (the operator's local CLI account); never proxies credentials to a server.
 */

import type { Account, AccountRegistry } from "./account-registry"
import { resolveAccount } from "./account-registry"
import type { ResolvedAuth } from "./auth-resolver"
import { resolveAuthRef, isAuthExpired } from "./auth-resolver"

// ============================================================
// Types
// ============================================================

export interface AccountDispatchInput {
  account: Account
  auth: ResolvedAuth
  targetModel: string
}

export interface AccountAttribution {
  account_id: string
  account_label: string
  account_provider: string
  auth_kind: "oauth" | "api-key"
  target_model: string
  selected_reason: string
}

export interface AccountDispatchOutput<T> {
  result: T
  attribution: AccountAttribution
}

export interface DispatchWithAccountOptions<T> {
  /** Loaded account registry (M2). Empty registry → throws NoEligibleAccountError. */
  registry: AccountRegistry
  /** Target model id the router chose (e.g. "openai/gpt-5.5"). */
  targetModel: string
  /** Optional account-id override for explicit selection / debugging. */
  preferredAccountId?: string
  /** Optional quota-remaining lookup, 1.0 = full, 0.0 = exhausted. */
  quotaRemaining?: (account: Account) => number
  /** Floor below which an account is excluded (default 0.10). */
  quotaFloor?: number
  /** Account ids marked temporarily-unavailable (e.g. recent auth-failure). */
  unavailableIds?: ReadonlySet<string>
  /** Override opencode auth.json path (for tests). */
  opencodeAuthPath?: string
  /** Override env lookup (for tests). */
  envLookup?: (varName: string) => string | undefined
  /**
   * The caller-provided dispatch function. Receives the resolved
   * (account, auth, targetModel) tuple; constructs an SDK client with
   * the auth; performs the actual LLM call; returns the result.
   *
   * Errors thrown here are NOT caught by the wrapper — caller-side
   * retry/fallback logic stays in the caller.
   */
  dispatch: (input: AccountDispatchInput) => Promise<T>
  /**
   * Optional buffer for the auth-expired check (default 60s).
   */
  authExpiryBufferMs?: number
  /**
   * Optional callback invoked when the resolved auth is expired.
   * If absent, dispatchWithAccount throws AuthExpiredError (caller can
   * handle the refresh flow + retry). If present, callback decides
   * whether to throw or proceed (e.g. it can refresh + return).
   *
   * Returning false → throw AuthExpiredError.
   * Returning true → proceed with possibly-stale auth (caller's choice).
   * Returning a new ResolvedAuth → proceed with that fresh auth.
   */
  onAuthExpired?: (account: Account, auth: ResolvedAuth) => boolean | ResolvedAuth
}

// ============================================================
// Errors
// ============================================================

export class NoEligibleAccountError extends Error {
  constructor(
    message: string,
    public readonly targetModel: string,
    public readonly reason: string,
  ) {
    super(message)
    this.name = "NoEligibleAccountError"
  }
}

export class AuthExpiredError extends Error {
  constructor(
    message: string,
    public readonly accountId: string,
  ) {
    super(message)
    this.name = "AuthExpiredError"
  }
}

// ============================================================
// dispatchWithAccount
// ============================================================

/**
 * Dispatch a target-model call through the multi-account layer.
 *
 * Returns the dispatch result plus an attribution record suitable for
 * daftar metadata_json.account_id field.
 *
 * Throws:
 *   - NoEligibleAccountError when no account resolves for the target
 *   - AuthResolutionError (from auth-resolver) when auth_ref invalid / file missing / etc.
 *   - AuthExpiredError when oauth token expired and onAuthExpired absent or returns false
 *   - any error thrown by the caller's dispatch callback (uncaught)
 */
export async function dispatchWithAccount<T>(
  opts: DispatchWithAccountOptions<T>,
): Promise<AccountDispatchOutput<T>> {
  // 1. Resolve account
  const resolution = resolveAccount(opts.registry, {
    targetModel: opts.targetModel,
    preferredAccountId: opts.preferredAccountId,
    quotaRemaining: opts.quotaRemaining,
    quotaFloor: opts.quotaFloor,
    unavailableIds: opts.unavailableIds,
  })

  if (resolution.account === null) {
    throw new NoEligibleAccountError(
      `no account resolved for target "${opts.targetModel}": ${resolution.reason}`,
      opts.targetModel,
      resolution.reason,
    )
  }

  const account = resolution.account

  // 2. Resolve auth
  let auth = resolveAuthRef(account.auth_ref, {
    opencodeAuthPath: opts.opencodeAuthPath,
    envLookup: opts.envLookup,
  })

  // 3. Check expiry
  if (isAuthExpired(auth, opts.authExpiryBufferMs ?? 60_000)) {
    if (opts.onAuthExpired) {
      const handled = opts.onAuthExpired(account, auth)
      if (handled === false) {
        throw new AuthExpiredError(
          `auth for account "${account.id}" expired and refresh declined`,
          account.id,
        )
      }
      if (handled !== true) {
        // returned a new ResolvedAuth
        auth = handled
      }
      // handled === true → proceed with possibly-stale auth (caller's choice)
    } else {
      throw new AuthExpiredError(
        `auth for account "${account.id}" expired and no onAuthExpired callback provided`,
        account.id,
      )
    }
  }

  // 4. Dispatch
  const result = await opts.dispatch({ account, auth, targetModel: opts.targetModel })

  // 5. Build attribution
  const attribution: AccountAttribution = {
    account_id: account.id,
    account_label: account.label,
    account_provider: account.provider,
    auth_kind: auth.kind,
    target_model: opts.targetModel,
    selected_reason: resolution.reason,
  }

  return { result, attribution }
}
