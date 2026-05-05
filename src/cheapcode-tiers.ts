/**
 * cheapcode-tiers — Phase 1 implementation.
 *
 * Exposes 5 synthetic models (`cheap`, `cheap-fast`, `smart`, `smart-fast`,
 * `auto`) that route to OpenRouter under the hood. Phase 1 implements the
 * 4 simple tiers + a STUB for `auto` (currently routes to `cheap`).
 * Phase 2 replaces the auto stub with the structured-reasoning wrapper
 * (plan-decompose + best-of-K + cross-model verifier + retry).
 *
 * Architecture: ships as a Vercel AI SDK provider package, loaded by
 * opencode via opencode.json's `npm:` provider-extension mechanism.
 * Zero patches to upstream opencode.
 *
 * Per Phase 0 decisions (runs/phase-0/decisions.md):
 *   cheap       → deepseek/deepseek-v4-flash
 *   cheap-fast  → race-K of deepseek-v4-flash + gemini-2.5-flash (Phase 1 stub: deepseek-v4-flash only)
 *   smart       → openai/gpt-5-mini
 *   smart-fast  → anthropic/claude-haiku-4.5
 *   auto        → STUB → cheap (Phase 2 wraps with best-of-K + verifier)
 *
 * Long-context override: when input is > 128k tokens and tier is `cheap`
 * or `auto`, route to x-ai/grok-4-fast (cheapllm v1 H3B receipt).
 *
 * Substrate citations:
 *   PLAN.bn umbrella 1 (cheapllm capability inherited @>=0.95)
 *   PLAN.bn umbrella 2 (auto-wrapper multistep dominance @>=0.85)
 *   PLAN.bn umbrella 3 (provider-registry propagation @>=0.97)
 *   SPEC Revision 2026-05-02f Phase 1 falsifier gate
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV2 } from "@ai-sdk/provider"
import { existsSync, readFileSync } from "node:fs"
import { CheapcodeAutoModel, type AutoWrapperConfig } from "./auto-wrapper"
import type { RouterOptions, TaskShape } from "./router"
import { type AccountRegistry, type Account } from "./account-registry"
import { loadEffectiveRegistry } from "./account-discovery"
import { wrapWithMultiAccount } from "./multi-account-language-model"
import type { ResolvedAuth } from "./auth-resolver"
import { defaultOpencodeAuthPath } from "./auth-resolver"
import { createOAuthLanguageModel } from "./oauth-language-model"
import { createPoolOAuthLanguageModel } from "./pool-oauth-language-model"
import { CODEX_ALLOWED_MODELS as CODEX_ALLOWED_MODELS_GLOBAL } from "./chatgpt-oauth-fetch"
import { buildCopilotFetch, COPILOT_FRIEND_KNOWN_MODELS } from "./copilot-fetch"
import { CooldownTracker } from "./cooldown"
import { homedir } from "node:os"
import { join as pathJoin } from "node:path"

// ============================================================
// Multi-account state — loaded lazily on first provider construction.
// Empty registry → wrapWithMultiAccount returns the base model unchanged
// (zero overhead, full backward-compat per docs/multi-account-wiring-recipe.md).
// Operator authors ~/.config/cheapcode/accounts.json to opt in.
// ============================================================

let _registryCache: AccountRegistry | null = null
function getAccountRegistry(): AccountRegistry {
  if (_registryCache === null) {
    try {
      // loadEffectiveRegistry merges explicit ~/.config/cheapcode/accounts.json
      // with auto-discovered providers from opencode's config + auth.json.
      // Operator's "unlimited keys via UI" UX vision: any Custom provider
      // they Connect via opencode's Providers panel becomes a cheapcode
      // multi-account candidate automatically.
      _registryCache = loadEffectiveRegistry()
    } catch (e) {
      // Malformed registry → log + fall through to empty (don't crash dispatches).
      // eslint-disable-next-line no-console
      console.error(`[cheapcode] account registry load failed: ${(e as Error).message}; ` +
        `falling back to single-account mode (set OPENROUTER_API_KEY).`)
      _registryCache = { version: 1, accounts: [] }
    }
  }
  return _registryCache
}

/**
 * For tests + hot-reload scenarios: clear the registry cache so the next
 * call re-reads from disk. Not used by production code.
 */
export function _resetAccountRegistryCache(): void {
  _registryCache = null
}

// ============================================================
// Tier definitions (Phase 0 locked picks)
// ============================================================

export const CHEAPCODE_TIERS = {
  cheap: {
    target: "deepseek/deepseek-v4-flash",
    receipt: "cheapllm v1 L1 — $0.0015–0.0032/task on TB-easy, 26–56× cheaper than GPT-5.5",
    long_context_override: "x-ai/grok-4-fast", // when input > 128k tokens
  },
  "cheap-fast": {
    // Phase 1 stub: just deepseek-v4-flash. Phase 2 adds race-K with gemini-2.5-flash.
    target: "deepseek/deepseek-v4-flash",
    receipt: "cheapllm v1 race-K pattern (Phase 2 will add gemini-2.5-flash race partner)",
    long_context_override: "x-ai/grok-4-fast",
  },
  smart: {
    target: "openai/gpt-5-mini",
    receipt: "cheapllm v1 F-E1 router escalation; honest direct-route (atom 0013)",
    long_context_override: null,
  },
  "smart-fast": {
    target: "anthropic/claude-haiku-4.5",
    receipt: "L3 leaderboard categorization (artificialanalysis.ai); GPT-5-nano backup",
    long_context_override: null,
  },
  auto: {
    // Phase 1 STUB: route to cheap. Phase 2 implements the wrapper:
    //   plan-decompose (smart) + parallel cheap leaves + best-of-K=3 frontier
    //   synthesis + cross-MODEL verification + retry-with-feedback
    target: "deepseek/deepseek-v4-flash",
    receipt: "Phase 1 stub. Phase 2 EXPERIMENT-1 validates the 3-axis dominance claim",
    long_context_override: "x-ai/grok-4-fast",
    is_phase_1_stub: true,
  },
  local: {
    // r170-F (2026-05-04): iai-katib local OpenAI-compatible endpoint.
    // Validated 9/9 pass + 2.09× faster than gpt-5.5-codex on bounded
    // code-task pilot (results/r170f/iai-katib_run.json + gpt-5.5-codex_run.json
    // in iai). Bypasses OpenRouter; dispatches to CHEAPCODE_LOCAL_BASE_URL
    // (default http://127.0.0.1:8000/v1). $0 marginal cost.
    //
    // For v1 this tier is EXPLICIT-ONLY: --model=cheapcode/local. Auto
    // routing of agentic-swe / bounded-code shapes deferred until a 30+
    // task validation set exists (per gpt-5.5 architectural review).
    //
    // Failure mode: hard error if local unreachable. Caller intentionally
    // selected local for privacy/cost/control; silent fallback to paid
    // would corrupt those assumptions.
    target: "iai-tier-0",
    receipt: "iai-katib local OpenAI-compatible endpoint (Qwen2.5-Coder-7B + katib-local profile); r170-F 9/9 pilot",
    long_context_override: null,
  },
} as const

export type TierId = keyof typeof CHEAPCODE_TIERS

const LONG_CONTEXT_THRESHOLD_TOKENS = 128_000

// ============================================================
// Provider factory — Vercel AI SDK provider interface
// ============================================================

export interface CheapcodeProviderOptions {
  /** OpenRouter API key. Required. */
  apiKey: string
  /** Optional per-tier OR model overrides (per cheapcode.toml). */
  tierOverrides?: Partial<Record<TierId, string>>
  /** Optional override for the long-context threshold. */
  longContextThresholdTokens?: number
  /** Optional tag for opencode telemetry (HTTP-Referer / X-Title). */
  appName?: string
  /**
   * Auto-tier wrapper configuration. If absent, `auto` falls back to the
   * `cheap` tier passthrough (Phase 1 behavior). When set, the auto tier
   * is the structured-reasoning wrapper per SPEC Revision 2026-05-03j.
   *
   * The verifierTarget MUST be a different model family than the
   * smart-tier (per atom 0010 cross-witness honesty pipeline). Default
   * smart = openai/gpt-5-mini → verifier defaults to anthropic/claude-opus-4
   * if not specified.
   */
  auto?: {
    enabled?: boolean
    verifierTarget?: string
    k?: number
    maxRetries?: number
    /**
     * Per-shape model overrides for the router (M3.14). Keys are TaskShape
     * names; values are OpenRouter model ids. Lets operators override the
     * facts/09 routing matrix on a per-shape basis via cheapcode.toml.
     */
    routeOverrides?: Partial<Record<TaskShape, string>>
    /**
     * Force compound-wrapper invocation on multistep-general shape.
     * Default false per M3.11/M3.11b L1 evidence (compound costs more
     * + slower with no completion lift on saturated tasks). Operator
     * may opt in if they have evidence the wrapper helps on their slice.
     */
    forceCompoundOnMultistep?: boolean
    /**
     * Per-call timeout in milliseconds for compound-wrapper sub-calls
     * (plan / leaf / synthesis / verify / retry). M3.17 production fix:
     * any single sub-call exceeding this deadline is rejected so the
     * pipeline doesn't hang indefinitely. Default 180_000 (3 minutes).
     * Decrease for cheap-tier-only fast paths; increase for hard-reasoning
     * frontier syntheses if your benchmark requires it.
     */
    perCallTimeoutMs?: number
  }
}

export interface CheapcodeProvider {
  (modelId: TierId | string): ReturnType<ReturnType<typeof createOpenRouter>>
  /** Lists the 5 synthetic tier IDs (for opencode --list-models surfacing). */
  models: readonly TierId[]
  /**
   * Vercel AI SDK convention: provider exposes `.languageModel(id)` method.
   * opencode calls this after loading the package (provider.ts:195).
   * Also defined as a callable function for convenience (the openrouter
   * pattern). Both shapes resolve to the same model.
   */
  languageModel: (modelId: TierId | string) => ReturnType<ReturnType<typeof createOpenRouter>>
}

/**
 * Estimate input token count for routing decisions. Cheap heuristic
 * (chars/4) — accurate enough for the >128k branch decision; not used
 * for billing.
 */
function estimateInputTokens(input: unknown): number {
  if (typeof input === "string") return Math.ceil(input.length / 4)
  if (Array.isArray(input)) {
    return input.reduce((acc, msg) => {
      const content = (msg as { content?: unknown })?.content
      if (typeof content === "string") return acc + Math.ceil(content.length / 4)
      if (Array.isArray(content)) {
        return (
          acc +
          content.reduce((sub: number, part) => {
            const text = (part as { text?: string })?.text
            return text ? sub + Math.ceil(text.length / 4) : sub
          }, 0)
        )
      }
      return acc
    }, 0)
  }
  return 0
}

/**
 * Resolve a tier ID + input to the actual OpenRouter model ID.
 * - If the model ID is not a known tier, return as-is (passthrough).
 * - If the tier has a long-context override and input > threshold, use it.
 * - Otherwise use the tier's primary target.
 */
export function resolveTierTarget(
  tierId: string,
  inputTokens: number,
  options: CheapcodeProviderOptions = { apiKey: "" },
): string {
  const tier = CHEAPCODE_TIERS[tierId as TierId]
  if (!tier) return tierId // not a cheapcode tier → passthrough
  const override = options.tierOverrides?.[tierId as TierId]
  if (override) return override
  const threshold = options.longContextThresholdTokens ?? LONG_CONTEXT_THRESHOLD_TOKENS
  if (tier.long_context_override && inputTokens > threshold) {
    return tier.long_context_override
  }
  return tier.target
}

/**
 * Create a Vercel AI SDK provider that exposes the 5 cheapcode tiers
 * and routes to OpenRouter under the hood.
 *
 * Usage from opencode.json:
 *   {
 *     "provider": {
 *       "cheapcode": {
 *         "npm": "@cheapcode/ai-sdk-provider",
 *         "name": "cheapcode tiers",
 *         "options": { "apiKey": "$OPENROUTER_API_KEY" },
 *         "models": {
 *           "cheap": { "name": "cheap" },
 *           "cheap-fast": { "name": "cheap-fast" },
 *           "smart": { "name": "smart" },
 *           "smart-fast": { "name": "smart-fast" },
 *           "auto": { "name": "auto (Phase 1 stub)" }
 *         }
 *       }
 *     }
 *   }
 */
export function createCheapcodeProvider(options: CheapcodeProviderOptions): CheapcodeProvider {
  // r170-F: apiKey is no longer required at construction. Local-only users
  // (--model=cheapcode/local) don't dispatch to OpenRouter at all. Only error
  // when a non-local tier is requested without a configured key.
  //
  // M20: opencode passes the LITERAL template string "{env:OPENROUTER_API_KEY}"
  // when the env var is unset (template substitution didn't fire). Treat that
  // as missing so the consumer-Plus OAuth fallback path gets a chance.
  const apiKeyMissing =
    !options.apiKey ||
    options.apiKey.startsWith("{env:") ||
    options.apiKey.startsWith("missing-openrouter-key-")

  const openrouter = createOpenRouter({
    apiKey: options.apiKey ?? "missing-openrouter-key-set-OPENROUTER_API_KEY-to-use-non-local-tiers",
    headers: {
      "HTTP-Referer": "https://github.com/cheapcode",
      "X-Title": options.appName ?? "cheapcode",
    },
  })

  // r170-F: local tier — iai-katib OpenAI-compatible endpoint. Bypasses
  // OpenRouter. CHEAPCODE_LOCAL_BASE_URL overrides the default endpoint.
  // CHEAPCODE_LOCAL_API_KEY is sent in the Authorization header (iai-katib
  // currently ignores it, but the AI SDK provider requires a value).
  const localBaseURL = process.env.CHEAPCODE_LOCAL_BASE_URL ?? "http://127.0.0.1:8000/v1"
  const localApiKey = process.env.CHEAPCODE_LOCAL_API_KEY ?? "local-no-auth"
  const localOpenAI = createOpenAI({
    baseURL: localBaseURL,
    apiKey: localApiKey,
  })

  const autoEnabled = options.auto?.enabled ?? true
  const verifierTarget = options.auto?.verifierTarget ?? "anthropic/claude-opus-4"
  const k = options.auto?.k ?? 3
  const maxRetries = options.auto?.maxRetries ?? 1

  // Multi-account model factory — invoked per-dispatch by wrapWithMultiAccount
  // when the registry has accounts. Constructs a fresh SDK client with the
  // chosen account's auth.
  //
  // M20.1: openai + oauth (consumer ChatGPT-Plus) routes through the
  // PoolOAuthLanguageModelV2 against the FULL set of openai-OAuth keys in
  // auth.json — so a 429 'usage_limit_reached' on this account fails over
  // to the next consumer-Plus account automatically (same cooldown ledger
  // as the apiKeyMissing path below). Without this, OAuth tokens would be
  // sent to api.openai.com as if they were api keys, returning the
  // 'api.responses.write' scope error.
  const multiAccountModelFactory = (account: Account, auth: ResolvedAuth, target: string): LanguageModelV2 => {
    if (account.provider === "openai") {
      const modelId = target.startsWith("openai/") ? target.slice("openai/".length) : target
      if (auth.kind === "oauth") {
        const consumerPlus = detectConsumerPlusOAuth()
        const codexModel = CODEX_ALLOWED_MODELS_GLOBAL.has(modelId) ? modelId : "gpt-5.5"
        if (consumerPlus) {
          return createPoolOAuthLanguageModel({
            authPath: consumerPlus.authPath,
            authKeys: consumerPlus.authKeys,
            modelId: codexModel,
            cooldown: getSharedConsumerPlusCooldown(),
          })
        }
        // No detectable consumer-Plus chain — fall back to api.openai.com
        // with the oauth access as a bearer (works for true api.openai.com
        // OAuth, not consumer-Plus).
        return createOpenAI({ apiKey: auth.access })(modelId)
      }
      return createOpenAI({ apiKey: auth.key })(modelId)
    }

    // M23: github-copilot dispatch via api.githubcopilot.com (OpenAI-compat
    // chat/completions). The Bearer is the GitHub token stored in the
    // auth.json oauth `refresh` field (opencode storage convention; see
    // copilot-fetch.ts header). createOpenAI's customFetch handles the
    // header swap + Copilot-specific headers; the AI SDK speaks standard
    // OpenAI Chat Completions which Copilot accepts for gpt-* models.
    // Claude/Gemini-via-Copilot need /v1/messages (Anthropic format) — the
    // friend's first request will route here regardless; if it fails it
    // bubbles up. v2 polish: add @ai-sdk/anthropic SDK dispatch for
    // claude-* model ids on the same baseURL.
    if (account.provider === "github-copilot" && auth.kind === "oauth") {
      const modelId = target.startsWith("github-copilot/")
        ? target.slice("github-copilot/".length)
        : target
      const authPath = defaultOpencodeAuthPath()
      const fetchFn = buildCopilotFetch({ authPath, authKey: account.id })
      return createOpenAI({
        apiKey: "dummy-overridden-by-fetch",
        baseURL: "https://api.githubcopilot.com",
        fetch: fetchFn,
      })(modelId)
    }

    // Default path: route through OpenRouter with the chosen apiKey.
    // Works for any "vendor/model" target.
    const apiKey = auth.kind === "api-key" ? auth.key : auth.access
    return createOpenRouter({
      apiKey,
      headers: {
        "HTTP-Referer": "https://github.com/cheapcode",
        "X-Title": options.appName ?? "cheapcode",
      },
    })(target)
  }

  // Helper: wrap base model with multi-account if registry is non-empty.
  // The wrapper's empty-registry passthrough makes this a no-op when the
  // operator hasn't authored accounts.json. Strictly additive.
  const wrapIfMultiAccount = (baseModel: LanguageModelV2, target: string): LanguageModelV2 => {
    return wrapWithMultiAccount(baseModel, {
      registry: getAccountRegistry(),
      targetModel: target,
      modelFactory: (account, auth) => multiAccountModelFactory(account, auth, target),
    })
  }

  const provider = ((modelId: string) => {
    // r170-F: local tier intercept — bypass OpenRouter, dispatch to local
    // OpenAI-compatible endpoint (iai-katib). Operator-explicit only;
    // hard error path on connection refusal lives at the AI SDK layer
    // (no silent fallback to paid OpenRouter).
    if (modelId === "local") {
      return localOpenAI(resolveTierTarget("local", 0, options))
    }

    // M20.1 / M23: when the operator has no OpenRouter key, fall through to
    // OAuth-based dispatch.
    //   - consumer ChatGPT-Plus OAuth → chatgpt.com/backend-api/codex/responses
    //     via PoolOAuthLanguageModelV2 (multi-account failover, codex 429
    //     'usage_limit_reached' honors resets_in_seconds).
    //   - GitHub Copilot OAuth → api.githubcopilot.com/chat/completions via
    //     createOpenAI with customFetch (default OpenAI-compat for gpt-*
    //     models in the operator's Copilot catalog).
    if (apiKeyMissing && modelId !== "local") {
      const consumerPlus = detectConsumerPlusOAuth()
      const copilot = !consumerPlus ? detectCopilotOAuth() : undefined
      if (copilot) {
        const tierModelId = pickCopilotModelForTier(modelId, options)
        if (modelId === "auto" && autoEnabled) {
          const smartC = pickCopilotModelForTier("smart", options)
          const cheapC = pickCopilotModelForTier("cheap", options)
          const cfg: AutoWrapperConfig = {
            smart: buildCopilotModel(copilot.authPath, copilot.authKey, smartC),
            cheap: buildCopilotModel(copilot.authPath, copilot.authKey, cheapC),
            verifier: buildCopilotModel(copilot.authPath, copilot.authKey, smartC),
            k,
            maxRetries,
            perCallTimeoutMs: options.auto?.perCallTimeoutMs,
          }
          const routerOpts: RouterOptions = {
            smartTarget: `github-copilot/${smartC}`,
            cheapTarget: `github-copilot/${cheapC}`,
            longContextTarget: `github-copilot/${smartC}`,
            routeOverrides: options.auto?.routeOverrides,
            forceCompoundOnMultistep: options.auto?.forceCompoundOnMultistep ?? false,
            hardClassDetection:
              process.env.CHEAPCODE_HARD_CLASS === "1" || process.env.CHEAPCODE_HARD_CLASS === "true",
          }
          return new CheapcodeAutoModel(cfg, routerOpts, (orId) =>
            buildCopilotModel(
              copilot.authPath,
              copilot.authKey,
              orId.startsWith("github-copilot/") ? orId.slice("github-copilot/".length) : tierModelId,
            ),
          )
        }
        return buildCopilotModel(copilot.authPath, copilot.authKey, tierModelId)
      }
      if (consumerPlus) {
        const tierModelId = pickOAuthModelForTier(modelId, options)
        if (modelId === "auto" && autoEnabled) {
          const smartCodex = pickOAuthModelForTier("smart", options)
          const cheapCodex = pickOAuthModelForTier("cheap", options)
          const cfg: AutoWrapperConfig = {
            smart: createPoolOAuthLanguageModel({
              authPath: consumerPlus.authPath,
              authKeys: consumerPlus.authKeys,
              modelId: smartCodex,
              cooldown: getSharedConsumerPlusCooldown(),
            }),
            cheap: createPoolOAuthLanguageModel({
              authPath: consumerPlus.authPath,
              authKeys: consumerPlus.authKeys,
              modelId: cheapCodex,
              cooldown: getSharedConsumerPlusCooldown(),
            }),
            verifier: createPoolOAuthLanguageModel({
              authPath: consumerPlus.authPath,
              authKeys: consumerPlus.authKeys,
              modelId: smartCodex,
              cooldown: getSharedConsumerPlusCooldown(),
            }),
            k,
            maxRetries,
            perCallTimeoutMs: options.auto?.perCallTimeoutMs,
          }
          const routerOpts: RouterOptions = {
            smartTarget: `openai/${smartCodex}`,
            cheapTarget: `openai/${cheapCodex}`,
            longContextTarget: `openai/${smartCodex}`,
            routeOverrides: options.auto?.routeOverrides,
            forceCompoundOnMultistep: options.auto?.forceCompoundOnMultistep ?? false,
            hardClassDetection:
              process.env.CHEAPCODE_HARD_CLASS === "1" || process.env.CHEAPCODE_HARD_CLASS === "true",
          }
          return new CheapcodeAutoModel(cfg, routerOpts, (orId) =>
            createPoolOAuthLanguageModel({
              authPath: consumerPlus.authPath,
              authKeys: consumerPlus.authKeys,
              modelId: orId.startsWith("openai/") ? orId.slice("openai/".length) : tierModelId,
              cooldown: getSharedConsumerPlusCooldown(),
            }),
          )
        }
        return createPoolOAuthLanguageModel({
          authPath: consumerPlus.authPath,
          authKeys: consumerPlus.authKeys,
          modelId: tierModelId,
          cooldown: getSharedConsumerPlusCooldown(),
        })
      }
      throw new Error(
        `cheapcode: no dispatchable credentials for non-local tier "${modelId}". ` +
          `Set OPENROUTER_API_KEY, OR connect a provider (openai consumer ChatGPT-Plus, ` +
          `github-copilot, or any api-key provider) via 'cheapcode web' → Settings → Providers, ` +
          `OR use --model=cheapcode/local with iai-katib running on ` +
          `${process.env.CHEAPCODE_LOCAL_BASE_URL ?? "http://127.0.0.1:8000/v1"}.`,
      )
    }

    // Phase 2 + M3.14 (SPEC Revision 2026-05-03k): when modelId === "auto"
    // AND wrapper is enabled, return the failure-mode-aware router. The
    // router classifies the task by surface signature and dispatches to
    // the documented value-optimum frontier model per facts/09. Compound
    // wrapping is invoked CONDITIONALLY (default off per M3.11/M3.11b L1
    // evidence — compound costs more + slower with no completion lift on
    // saturated tasks).
    //
    // For other tier ids (cheap/cheap-fast/smart/smart-fast), passthrough
    // to the OpenRouter-resolved primary target unchanged.
    if (modelId === "auto" && autoEnabled) {
      const smartTarget = resolveTierTarget("smart", 0, options)
      const cheapTarget = resolveTierTarget("cheap", 0, options)
      const longContextTarget = "x-ai/grok-4-fast"
      const cfg: AutoWrapperConfig = {
        smart: openrouter(smartTarget),
        cheap: openrouter(cheapTarget),
        verifier: openrouter(verifierTarget),
        k,
        maxRetries,
        perCallTimeoutMs: options.auto?.perCallTimeoutMs,
      }
      // Round 96 substrate gates — opt-in via env vars. Default OFF
      // preserves backward compat. Setting any env activates the
      // corresponding gate.
      //   CHEAPCODE_STEWARDSHIP_THRESHOLD=0.4 → atom 0022 Rule E
      //   CHEAPCODE_KNOWABILITY_THRESHOLD=0.55 → atom 0024 Rule F
      //   CHEAPCODE_HARD_CLASS=1               → M3.57 force-voter on hard-class
      const stewardshipEnv = process.env.CHEAPCODE_STEWARDSHIP_THRESHOLD
      const stewardshipThreshold = stewardshipEnv ? parseFloat(stewardshipEnv) : undefined
      const knowabilityEnv = process.env.CHEAPCODE_KNOWABILITY_THRESHOLD
      const knowabilityThreshold = knowabilityEnv ? parseFloat(knowabilityEnv) : undefined
      const hardClassDetection =
        process.env.CHEAPCODE_HARD_CLASS === "1" ||
        process.env.CHEAPCODE_HARD_CLASS === "true"
      const routerOpts: RouterOptions = {
        smartTarget,
        cheapTarget,
        longContextTarget,
        routeOverrides: options.auto?.routeOverrides,
        forceCompoundOnMultistep: options.auto?.forceCompoundOnMultistep ?? false,
        stewardshipThreshold,
        knowabilityThreshold,
        hardClassDetection,
      }
      // Auto-mode: route OpenRouter sub-calls through multi-account wrapper too.
      // When registry is empty, wrapIfMultiAccount is a no-op passthrough.
      return new CheapcodeAutoModel(cfg, routerOpts, (orId) => wrapIfMultiAccount(openrouter(orId), orId))
    }
    const target = resolveTierTarget(modelId, 0, options)
    return wrapIfMultiAccount(openrouter(target), target)
  }) as CheapcodeProvider

  Object.defineProperty(provider, "models", {
    value: Object.keys(CHEAPCODE_TIERS) as readonly TierId[],
    writable: false,
    enumerable: true,
  })

  // M3.38 fix for M3.15 ProviderInitError: opencode's AI SDK ProviderV2
  // contract requires the provider to expose specificationVersion +
  // languageModel + chatModel + completionModel + embeddingModel +
  // textEmbeddingModel + imageModel. Title-agent (small=true) only
  // probed languageModel and worked; build-agent (small=false) probed
  // additional methods → ProviderInitError. This block defines all the
  // required keys.
  //
  // For embedding + image: cheapcode does not support these modalities
  // (it's a routing layer for chat-completion models). Per atom 0007
  // (anti-fab via artifact verification), the stubs THROW a clear
  // "not supported" error rather than silently returning a stub the
  // caller would treat as valid.

  Object.defineProperty(provider, "specificationVersion", {
    value: "v3",
    writable: false,
    enumerable: true,
  })

  // Vercel AI SDK convention: provider exposes `.languageModel(id)` so
  // opencode (and any AI-SDK consumer) can call `sdk.languageModel(modelID)`
  // after loading the package. Mirrors the callable `provider(modelId)`
  // shape used by `@openrouter/ai-sdk-provider`.
  Object.defineProperty(provider, "languageModel", {
    value: (modelId: string) => provider(modelId),
    writable: false,
    enumerable: true,
  })

  // chatModel + completionModel are aliases — cheapcode tiers route
  // to chat-completion models regardless. Per AI SDK v3 ProviderV2.
  Object.defineProperty(provider, "chatModel", {
    value: (modelId: string) => provider(modelId),
    writable: false,
    enumerable: true,
  })
  Object.defineProperty(provider, "completionModel", {
    value: (modelId: string) => provider(modelId),
    writable: false,
    enumerable: true,
  })

  // Embedding + image: NOT SUPPORTED. Throw clearly so callers know to
  // route elsewhere (per atom 0007 anti-fab).
  const notSupported = (kind: string) => (modelId: string): never => {
    throw new Error(
      `cheapcode does not support ${kind} models (requested modelId="${modelId}"). ` +
      `Route ${kind} requests to a dedicated provider (e.g., @openrouter/ai-sdk-provider directly).`,
    )
  }
  Object.defineProperty(provider, "textEmbeddingModel", {
    value: notSupported("text embedding"),
    writable: false,
    enumerable: true,
  })
  Object.defineProperty(provider, "embeddingModel", {
    value: notSupported("embedding"),
    writable: false,
    enumerable: true,
  })
  Object.defineProperty(provider, "imageModel", {
    value: notSupported("image"),
    writable: false,
    enumerable: true,
  })

  return provider
}

// ============================================================
// Phase 2 status — wrapper IMPLEMENTED (M3.10), EXPERIMENT-1 Arm A pending
// ============================================================

/**
 * Phase 2 wrapper implemented in src/auto-wrapper.ts (M3.10):
 *   1. Plan-decompose with smart-tier (1× frontier call)
 *   2. Execute leaves at cheap-tier in parallel
 *   3. Best-of-K=3 frontier synthesis
 *   4. Cross-MODEL verification (different frontier model than synthesizer)
 *   5. Retry-with-feedback if verifier disagrees
 *
 * EXPERIMENT-1 Arm A (3-axis dominance test on TB-multistep) pending —
 * needs operator OpenRouter BYOK for ~$5 spend per SPEC Revision 2026-05-03j.
 *
 * Arm B (substrate-runtime-verifier marginal lift) DEFERRED to v1.x per
 * M3.2 retrospective + M3.9 — TB-3 failure-mode mismatch with substrate's
 * reasoning-with-citations strength. Atom 0016 build-time interpretation
 * IS validated; runtime interpretation untested.
 */
export const PHASE_2_AUTO_WRAPPER_IMPLEMENTED = true as const
export const EXPERIMENT_1_ARM_A_PENDING = true as const

// ============================================================
// M20 — consumer ChatGPT-Plus OAuth fallback
// ============================================================

/**
 * Decode a JWT payload into its claims. Best-effort; returns undefined on
 * any parse failure. Used for chatgpt_account_id dedup so we don't pretend
 * two tokens for the same chatgpt account give us failover headroom.
 */
function decodeJwtClaims(token: string): Record<string, unknown> | undefined {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return undefined
    return JSON.parse(Buffer.from(parts[1], "base64url").toString())
  } catch {
    return undefined
  }
}

// One-shot flag so we only emit the dedupe warning once per process.
let _dedupeWarningPrinted = false

function chatgptAccountIdFor(entry: { access?: string; accountId?: string }): string | undefined {
  if (entry.accountId) return entry.accountId
  if (!entry.access) return undefined
  const claims = decodeJwtClaims(entry.access)
  const auth = claims?.["https://api.openai.com/auth"] as { chatgpt_account_id?: string } | undefined
  return auth?.chatgpt_account_id ?? (claims?.["chatgpt_account_id"] as string | undefined)
}

/**
 * Detect "operator has consumer ChatGPT-Plus OAuth" mode. Returns the
 * authPath + ALL DISTINCT openai-OAuth auth.json keys (canonical + every
 * alias from M16 multi-account, deduplicated by chatgpt_account_id).
 *
 * The pool-aware model uses the full list to fail over across accounts
 * when one hits its weekly Plus quota — but the failover is only useful
 * when the underlying chatgpt accounts are actually distinct. Two tokens
 * for the SAME chatgpt account share the same quota pool server-side, so
 * we drop duplicates here and emit a one-time warning.
 *
 * Returns undefined when no openai-OAuth entry exists.
 */
export function detectConsumerPlusOAuth():
  | { authPath: string; authKey: string; authKeys: string[] }
  | undefined {
  const authPath = defaultOpencodeAuthPath()
  if (!existsSync(authPath)) return undefined
  try {
    const map = JSON.parse(readFileSync(authPath, "utf8")) as Record<string, { type?: string; providerID?: string; access?: string; accountId?: string }>
    // Collect candidate openai-OAuth keys (canonical first, then aliases)
    const candidates: string[] = []
    if (map["openai"]?.type === "oauth") candidates.push("openai")
    for (const [key, entry] of Object.entries(map)) {
      if (key === "openai") continue
      if (entry?.type !== "oauth") continue
      if (entry.providerID === "openai" || key.startsWith("openai-") || key.startsWith("openai_")) {
        candidates.push(key)
      }
    }
    if (candidates.length === 0) return undefined

    // Dedupe by chatgpt_account_id — two tokens for the same chatgpt account
    // do not give us failover headroom (quota is server-enforced at the
    // chatgpt account level).
    const seenAccountIds = new Map<string, string>() // accountId → first authKey
    const distinctKeys: string[] = []
    const dupes: Array<{ key: string; accountId: string; firstKey: string }> = []
    for (const key of candidates) {
      const accountId = chatgptAccountIdFor(map[key]) ?? `__unknown_${key}__`
      const firstKey = seenAccountIds.get(accountId)
      if (firstKey) {
        dupes.push({ key, accountId, firstKey })
        continue
      }
      seenAccountIds.set(accountId, key)
      distinctKeys.push(key)
    }

    if (dupes.length > 0 && process.env.CHEAPCODE_QUIET !== "1" && !_dedupeWarningPrinted) {
      _dedupeWarningPrinted = true
      console.error(
        `[cheapcode] note: ${dupes.length} OAuth entry/entries map to a ChatGPT account already represented in auth.json:`,
      )
      for (const d of dupes) {
        console.error(`  - "${d.key}" shares chatgpt_account_id with "${d.firstKey}" (${d.accountId})`)
      }
      console.error(
        `  Two tokens for the same ChatGPT-Plus subscription share the same weekly quota.`,
      )
      console.error(
        `  For real failover, connect a DIFFERENT ChatGPT-Plus account (different email) via 'cheapcode web'.`,
      )
    }

    return { authPath, authKey: distinctKeys[0], authKeys: distinctKeys }
  } catch {
    // malformed auth.json — treat as no consumer-Plus available
  }
  return undefined
}

/**
 * Detect "operator has GitHub Copilot OAuth" mode. Returns the authPath +
 * auth.json key of the first github-copilot oauth entry (canonical or
 * alias from M16 multi-account). Read once per provider construction.
 */
export function detectCopilotOAuth(): { authPath: string; authKey: string } | undefined {
  const authPath = defaultOpencodeAuthPath()
  if (!existsSync(authPath)) return undefined
  try {
    const map = JSON.parse(readFileSync(authPath, "utf8")) as Record<
      string,
      { type?: string; providerID?: string; refresh?: string }
    >
    if (map["github-copilot"]?.type === "oauth" && map["github-copilot"]?.refresh) {
      return { authPath, authKey: "github-copilot" }
    }
    for (const [key, entry] of Object.entries(map)) {
      if (key === "github-copilot") continue
      if (entry?.type !== "oauth" || !entry?.refresh) continue
      if (entry.providerID === "github-copilot" || key.startsWith("github-copilot")) {
        return { authPath, authKey: key }
      }
    }
  } catch {
    // malformed auth.json — treat as no copilot available
  }
  return undefined
}

/**
 * Pick a Copilot model for a tier. Defaults map to the OpenAI-family models
 * in the friend's catalog (gpt-* via Copilot's chat/completions endpoint).
 * Operators can override via tierOverrides (including claude-* / gemini-*
 * once those endpoints are wired in v2).
 */
export function pickCopilotModelForTier(
  tierId: string,
  options: CheapcodeProviderOptions,
): string {
  const override = options.tierOverrides?.[tierId as TierId]
  if (override) {
    return override.startsWith("github-copilot/") ? override.slice("github-copilot/".length) : override
  }
  if (tierId === "smart" || tierId === "auto") return "gpt-5.4"
  if (tierId === "smart-fast") return "gpt-5.4"
  return "gpt-5-mini" // cheap, cheap-fast — cheapest gpt in the friend's catalog
}

/**
 * Build a Copilot LanguageModelV2 for a given model id. Wraps createOpenAI
 * with the api.githubcopilot.com baseURL + the customFetch that injects the
 * GitHub Bearer + Copilot headers from auth.json.
 */
function buildCopilotModel(authPath: string, authKey: string, modelId: string) {
  const fetchFn = buildCopilotFetch({ authPath, authKey })
  return createOpenAI({
    apiKey: "dummy-overridden-by-fetch",
    baseURL: "https://api.githubcopilot.com",
    fetch: fetchFn,
  })(modelId)
}

/**
 * Shared cooldown tracker for consumer-Plus OAuth keys. One per process —
 * the auto-router's smart/cheap/verifier sub-models AND any direct tier
 * dispatch share the same tracker, so a 429 on key X for `smart` cools
 * X for `cheap` and the verifier too. Persistent at
 * ~/.local/share/cheapcode/oauth-cooldown.json so the cooldown survives
 * process restart (the chatgpt.com Plus weekly window is much longer
 * than any single CLI invocation).
 */
let _consumerPlusCooldown: CooldownTracker | undefined
export function getSharedConsumerPlusCooldown(): CooldownTracker {
  if (!_consumerPlusCooldown) {
    const path = pathJoin(homedir(), ".local", "share", "cheapcode", "oauth-cooldown.json")
    _consumerPlusCooldown = new CooldownTracker(path)
    _consumerPlusCooldown.load().catch(() => undefined)
  }
  return _consumerPlusCooldown
}

/**
 * Map a cheapcode tier id to a CODEX_ALLOWED_MODELS entry. Defaults are
 * conservative and operator-overridable via tierOverrides:
 *   cheap, cheap-fast, smart-fast → gpt-5.4-mini
 *   smart                         → gpt-5.5
 *   auto                          → gpt-5.5 (the smart slot of the auto wrapper)
 */
export function pickOAuthModelForTier(
  tierId: string,
  options: CheapcodeProviderOptions,
): string {
  const override = options.tierOverrides?.[tierId as TierId]
  if (override) {
    const stripped = override.startsWith("openai/") ? override.slice("openai/".length) : override
    return stripped
  }
  if (tierId === "smart" || tierId === "auto") return "gpt-5.5"
  if (tierId === "smart-fast") return "gpt-5.4"
  return "gpt-5.4-mini"
}
