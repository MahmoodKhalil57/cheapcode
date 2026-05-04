/**
 * multi-account-language-model.ts — LanguageModelV2 wrapper that intercepts
 * .doGenerate / .doStream to multiplex across accounts (M3e).
 *
 * Per Vercel AI SDK's @ai-sdk/provider/src/language-model/v2/language-model-v2.ts:
 * LanguageModelV2 has two callable methods (doGenerate, doStream) plus 4
 * read-only fields (specificationVersion, provider, modelId, supportedUrls).
 *
 * Per memory feedback_perfect_confidence_foundations_base + atom 0007 anti-fab:
 * the wrapper does NOT construct SDK clients itself. Caller supplies a
 * `modelFactory(account, auth) → LanguageModelV2` callback. This decouples
 * the wrapper from SDK-version specifics (createOpenAI/createOpenRouter etc).
 *
 * Per memory project_compat_matrix.md: when the registry is empty, this
 * wrapper passes through to the fallback model unchanged. Multi-account is
 * strictly additive.
 *
 * Attribution: the chosen account's metadata is embedded in providerMetadata.cheapcode
 * on doGenerate results so daftar receipts can capture the dispatch lineage.
 * doStream attribution is best-effort (no per-stream providerMetadata field
 * in V2) and lives only in the wrapper's debug logging if enabled.
 */

import type { LanguageModelV2 } from "@ai-sdk/provider"
import type { Account, AccountRegistry } from "./account-registry"
import type { ResolvedAuth } from "./auth-resolver"
import { dispatchWithAccount, type AccountAttribution } from "./dispatch-with-account"

// ============================================================
// Types
// ============================================================

export interface MultiAccountWrapperOptions {
  /** Account registry (M2). If empty, wrapper passes through fallback unchanged. */
  registry: AccountRegistry
  /** The cheapcode-side target model id (e.g. "openai/gpt-5.5"). */
  targetModel: string
  /**
   * Factory that constructs an actual base LanguageModelV2 given a chosen
   * account + resolved auth. Caller controls SDK client construction.
   */
  modelFactory: (account: Account, auth: ResolvedAuth) => LanguageModelV2
  /** Per-call quota lookup (1.0 = full, 0.0 = exhausted). */
  quotaRemaining?: (account: Account) => number
  /** Optional explicit account override. */
  preferredAccountId?: string
  /** Account ids marked temporarily-unavailable. */
  unavailableIds?: ReadonlySet<string>
  /** Override opencode auth.json path (for tests). */
  opencodeAuthPath?: string
  /** Override env lookup (for tests). */
  envLookup?: (varName: string) => string | undefined
  /** Buffer for auth-expiry check (default 60_000). */
  authExpiryBufferMs?: number
  /**
   * Optional callback invoked when the resolved auth is expired.
   * See dispatch-with-account.ts for semantics.
   */
  onAuthExpired?: (account: Account, auth: ResolvedAuth) => boolean | ResolvedAuth
  /**
   * Optional callback invoked AFTER each successful dispatch; receives the
   * attribution record. Use this to update quota state, write daftar receipts,
   * or audit trails. Errors thrown here are caught and logged (don't fail
   * the dispatch).
   */
  onDispatch?: (attribution: AccountAttribution) => void
}

// ============================================================
// wrapWithMultiAccount
// ============================================================

/**
 * Wrap a base LanguageModelV2 with per-call account multiplexing.
 *
 * If `opts.registry.accounts.length === 0`, returns the fallback unchanged
 * (no overhead, no behavior change). Otherwise returns a wrapped model that
 * resolves an account + auth on each .doGenerate() / .doStream() call.
 *
 * The wrapped model preserves the fallback's read-only fields (provider,
 * modelId, supportedUrls) for telemetry compatibility.
 */
export function wrapWithMultiAccount(
  fallback: LanguageModelV2,
  opts: MultiAccountWrapperOptions,
): LanguageModelV2 {
  if (opts.registry.accounts.length === 0) {
    return fallback
  }

  const dispatchOpts = {
    registry: opts.registry,
    targetModel: opts.targetModel,
    preferredAccountId: opts.preferredAccountId,
    quotaRemaining: opts.quotaRemaining,
    unavailableIds: opts.unavailableIds,
    opencodeAuthPath: opts.opencodeAuthPath,
    envLookup: opts.envLookup,
    authExpiryBufferMs: opts.authExpiryBufferMs,
    onAuthExpired: opts.onAuthExpired,
  }

  const reportDispatch = (attribution: AccountAttribution): void => {
    if (!opts.onDispatch) return
    try {
      opts.onDispatch(attribution)
    } catch (e) {
      // Don't let attribution-side-effects fail the dispatch.
      // eslint-disable-next-line no-console
      console.error(`[multi-account] onDispatch callback threw: ${(e as Error).message}`)
    }
  }

  return {
    specificationVersion: "v2",
    provider: fallback.provider,
    modelId: fallback.modelId,
    supportedUrls: fallback.supportedUrls,

    async doGenerate(callOpts) {
      const out = await dispatchWithAccount({
        ...dispatchOpts,
        dispatch: async (input) => {
          const model = opts.modelFactory(input.account, input.auth)
          return await model.doGenerate(callOpts)
        },
      })
      reportDispatch(out.attribution)

      // Attach attribution to providerMetadata.cheapcode for daftar capture.
      const existingMeta = (out.result.providerMetadata ?? {}) as Record<string, unknown>
      return {
        ...out.result,
        providerMetadata: {
          ...existingMeta,
          cheapcode: {
            account_id: out.attribution.account_id,
            account_label: out.attribution.account_label,
            account_provider: out.attribution.account_provider,
            auth_kind: out.attribution.auth_kind,
            target_model: out.attribution.target_model,
            selected_reason: out.attribution.selected_reason,
          },
        },
      }
    },

    async doStream(callOpts) {
      const out = await dispatchWithAccount({
        ...dispatchOpts,
        dispatch: async (input) => {
          const model = opts.modelFactory(input.account, input.auth)
          return await model.doStream(callOpts)
        },
      })
      reportDispatch(out.attribution)
      // doStream's return shape has no providerMetadata field at this level
      // (per LanguageModelV2 spec). Attribution lives in onDispatch callback only.
      return out.result
    },
  }
}
