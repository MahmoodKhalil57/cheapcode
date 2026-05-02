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
}

export interface CheapcodeProvider {
  (modelId: TierId | string): ReturnType<ReturnType<typeof createOpenRouter>>
  /** Lists the 5 synthetic tier IDs (for opencode --list-models surfacing). */
  models: readonly TierId[]
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
  if (!options.apiKey) {
    throw new Error("cheapcode: apiKey is required (set OPENROUTER_API_KEY)")
  }

  const openrouter = createOpenRouter({
    apiKey: options.apiKey,
    headers: {
      "HTTP-Referer": "https://github.com/cheapcode",
      "X-Title": options.appName ?? "cheapcode",
    },
  })

  const provider = ((modelId: string) => {
    // The AI SDK provider doesn't get the input messages at this stage —
    // they arrive at generate-time. So we resolve as a stub here using
    // the primary target, and rely on a wrapping layer for long-context
    // override at request time.
    //
    // Phase 1 simplification: ignore long-context for now; resolve to
    // primary target. Phase 2 wraps the call to inspect input and route.
    const target = resolveTierTarget(modelId, 0, options)
    return openrouter(target)
  }) as CheapcodeProvider

  Object.defineProperty(provider, "models", {
    value: Object.keys(CHEAPCODE_TIERS) as readonly TierId[],
    writable: false,
    enumerable: true,
  })

  return provider
}

// ============================================================
// Phase 2 hook (NOT YET IMPLEMENTED — placeholder for wrapper)
// ============================================================

/**
 * Phase 2 will implement the auto-tier structured-reasoning wrapper here:
 *   1. Detect task type (long-context / hard-reasoning / routine)
 *   2. Plan-decompose with smart-tier (1× frontier call)
 *   3. Execute leaves at cheap-tier in parallel
 *   4. Best-of-K=3 frontier synthesis
 *   5. Cross-MODEL verification (different frontier model than synthesizer)
 *   6. Retry-with-feedback if verifier disagrees
 *
 * Until Phase 2 + EXPERIMENT-1 PASS, `auto` falls back to `cheap`.
 */
export const PHASE_2_AUTO_WRAPPER_PENDING = true as const
