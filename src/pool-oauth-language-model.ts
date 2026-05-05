/**
 * pool-oauth-language-model.ts — multi-key consumer-Plus OAuth dispatch with
 * cooldown failover (M20.1).
 *
 * The single-key OAuthLanguageModelV2 errors out on a 429 / quota-exhausted
 * response from chatgpt.com/backend-api/codex/responses. When the operator
 * has multiple consumer-Plus accounts (e.g. "openai" + "openai-2" from the
 * M16 multi-account UI), we want automatic failover: mark the over-limit
 * key as cooled, pick the next available key, retry transparently.
 *
 * This is the consumer-Plus analog of dispatchWithPool — same pattern,
 * different transport (codex SSE instead of OpenAI api-key REST).
 *
 * Per atom 0007 anti-fab: we honor `resets_in_seconds` from the codex 429
 * body when present (the consumer-Plus quota response always includes it),
 * so the cooldown duration is grounded in the server's own ticker, not
 * estimated.
 *
 * Per memory project_chatgpt_plus_byok_risk.md: same risk profile as
 * opencode itself — chatgpt.com/backend-api could change at any time.
 */

import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
  LanguageModelV2Usage,
} from "@ai-sdk/provider"
import { CooldownTracker } from "./cooldown"
import { callChatGptCodex as defaultCallChatGptCodex, CODEX_ALLOWED_MODELS, type CodexCallResult } from "./chatgpt-oauth-fetch"
import type { CodexCaller } from "./oauth-language-model"
import { OAuthLanguageModelV2 } from "./oauth-language-model"

export interface PoolOAuthLanguageModelOptions {
  /** Path to opencode's auth.json. */
  authPath: string
  /** All consumer-Plus OAuth auth.json keys to round-robin across. */
  authKeys: string[]
  /** Codex-allowed model id. */
  modelId: string
  /** System-prompt-equivalent. */
  instructions?: string
  /** Persistent cooldown tracker (shared across the process). */
  cooldown?: CooldownTracker
  /** Override codex caller (testing). */
  codexCaller?: CodexCaller
}

interface CodexQuotaError extends Error {
  status?: number
  resets_in_seconds?: number
}

/**
 * Parse a codex 429 body into a cooldown duration. The chatgpt.com/backend-api
 * quota response shape (verified live 2026-05-04):
 *   {"error":{"type":"usage_limit_reached","message":"...","plan_type":"plus",
 *            "resets_at":1777972827,"eligible_promo":null,"resets_in_seconds":36640}}
 * Returns ms or undefined if the body doesn't match.
 */
function parseCodexQuotaResetMs(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return
  const e = err as { message?: string; status?: number }
  if (e.status !== 429 || !e.message) return
  // Best-effort regex — the body is JSON-stringified into the error message.
  const m = /"resets_in_seconds":(\d+)/.exec(e.message)
  if (m) {
    const n = parseInt(m[1], 10)
    if (Number.isFinite(n) && n > 0) return n * 1000
  }
  return
}

export class PoolOAuthLanguageModelV2 implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const
  readonly provider = "openai-consumer-plus-oauth-pool"
  readonly modelId: string
  readonly supportedUrls = {} as Record<string, RegExp[]>

  private readonly opts: PoolOAuthLanguageModelOptions
  private readonly cooldown: CooldownTracker
  private cursor = 0

  constructor(opts: PoolOAuthLanguageModelOptions) {
    if (opts.authKeys.length === 0) {
      throw new Error("PoolOAuthLanguageModelV2 requires at least one authKey")
    }
    if (!CODEX_ALLOWED_MODELS.has(opts.modelId)) {
      console.warn(
        `[cheapcode/pool-oauth] modelId "${opts.modelId}" not in CODEX_ALLOWED_MODELS; ` +
          `dispatch may fail. Known-good: ${Array.from(CODEX_ALLOWED_MODELS).join(", ")}`,
      )
    }
    this.opts = opts
    this.cooldown = opts.cooldown ?? new CooldownTracker("/dev/null") // in-memory only when no path given
    this.modelId = opts.modelId
  }

  /**
   * Pick the next available auth key. Round-robin across non-cooled candidates.
   * Returns undefined if every key is currently cooled (caller should error).
   */
  private pickAvailable(now: number = Date.now()): string | undefined {
    const keys = this.opts.authKeys
    for (let i = 0; i < keys.length; i++) {
      const idx = (this.cursor + i) % keys.length
      const k = keys[idx]
      if (this.cooldown.isAvailable(k, now)) {
        this.cursor = (idx + 1) % keys.length
        return k
      }
    }
    return undefined
  }

  /**
   * Try each non-cooled auth key in turn. On a cooldownable failure
   * (429/5xx/timeout/auth), mark the key + try the next. Bubble up the
   * last error when the pool is exhausted.
   */
  private async dispatchOnce(input: {
    instructions: string
    userText: string
    signal?: AbortSignal
  }): Promise<{ result: CodexCallResult; usedKey: string }> {
    const tried: string[] = []
    let lastErr: unknown
    const tryKey = async (authKey: string): Promise<{ result: CodexCallResult; usedKey: string } | undefined> => {
      tried.push(authKey)
      try {
        const r = await (this.opts.codexCaller ?? defaultCallChatGptCodex)({
          authPath: this.opts.authPath,
          authKey,
          model: this.opts.modelId,
          instructions: input.instructions,
          prompt: input.userText,
          signal: input.signal,
        })
        this.cooldown.clear(authKey)
        return { result: r, usedKey: authKey }
      } catch (err) {
        lastErr = err
        const reason = CooldownTracker.classifyError(err)
        if (!reason) throw err
        const resetMs = parseCodexQuotaResetMs(err)
        this.cooldown.mark(authKey, reason, resetMs)
        this.cooldown.save().catch(() => undefined)
        return undefined
      }
    }

    while (true) {
      const authKey = this.pickAvailable()
      if (!authKey) break
      const result = await tryKey(authKey)
      if (result) return result
    }

    // A persisted 429 cooldown can be stale if the server-side Plus bucket was
    // replenished out-of-band. When every key is cooled, revalidate 429 entries
    // once instead of treating the cache as authoritative.
    if (tried.length === 0) {
      const pending = this.cooldown.pending()
      const revalidateKeys = this.opts.authKeys.filter((k) => pending[k]?.reason === "429")
      for (const authKey of revalidateKeys) {
        this.cooldown.clear(authKey)
        const result = await tryKey(authKey)
        if (result) return result
      }
    }
    // Build an honest exhaustion message that distinguishes "tried and all
    // failed THIS call" from "every credential was already cooled before we
    // even tried" (the typical state on a follow-up call after a 429 burned
    // through every chatgpt account in the pool).
    const allKeys = this.opts.authKeys
    const cooledKeys = allKeys.filter((k) => !this.cooldown.isAvailable(k))
    const ageMs = Math.min(
      ...cooledKeys.map((k) => Math.max(0, (this.cooldown.pending()[k]?.until ?? 0) - Date.now())),
    )
    const minutesUntilFree = Number.isFinite(ageMs) && ageMs > 0 ? Math.ceil(ageMs / 60_000) : undefined
    let message: string
    if (tried.length > 0) {
      message =
        `pool-oauth: all ${tried.length} consumer-Plus credential(s) tried and failed (${tried.join(", ")}). ` +
        `Last error: ${(lastErr as Error)?.message ?? "unknown"}`
    } else if (cooledKeys.length > 0) {
      message =
        `pool-oauth: every credential is on cooldown (${cooledKeys.join(", ")})` +
        (minutesUntilFree !== undefined ? ` — earliest reset in ~${minutesUntilFree} min.` : ".") +
        ` This usually means your ChatGPT-Plus account hit its weekly usage cap; the cap is enforced server-side at the chatgpt-account level, so adding another OAuth entry for the same account does not help.` +
        ` Connect a DIFFERENT ChatGPT-Plus subscription (different email) via 'cheapcode web' for real failover.`
    } else {
      message = "pool-oauth: pool is empty (no consumer-Plus credentials available)"
    }
    const exhausted = new Error(message) as CodexQuotaError
    exhausted.name = "PoolOAuthExhaustedError"
    throw exhausted
  }

  private flattenPrompt(prompt: LanguageModelV2CallOptions["prompt"]): {
    instructions: string
    userText: string
  } {
    let instructions = this.opts.instructions ?? ""
    const userParts: string[] = []
    for (const msg of prompt) {
      if (msg.role === "system") {
        if (typeof msg.content === "string") instructions += (instructions ? "\n\n" : "") + msg.content
      } else if (msg.role === "user") {
        if (typeof msg.content === "string") {
          userParts.push(msg.content)
        } else {
          for (const part of msg.content) {
            if (part.type === "text") userParts.push(part.text)
            else if (part.type === "file") {
              throw new Error(
                "pool-oauth: file/image input not supported on consumer-Plus codex path",
              )
            }
          }
        }
      } else if (msg.role === "assistant") {
        if (typeof msg.content === "string") userParts.push(`[assistant prior]\n${msg.content}`)
        else {
          for (const part of msg.content) {
            if (part.type === "text") userParts.push(`[assistant prior]\n${part.text}`)
          }
        }
      } else if (msg.role === "tool") {
        throw new Error("pool-oauth: tool messages not supported on consumer-Plus codex path")
      }
    }
    return {
      instructions: instructions || "You are a concise, accurate assistant.",
      userText: userParts.join("\n\n"),
    }
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: LanguageModelV2Content[]
    finishReason: LanguageModelV2FinishReason
    usage: LanguageModelV2Usage
    response: { id: string; timestamp: Date; modelId: string }
    warnings: never[]
    providerMetadata?: { "cheapcode-pool"?: { used_key: string; cooled_keys: string[] } }
  }> {
    const { instructions, userText } = this.flattenPrompt(options.prompt)
    const { result, usedKey } = await this.dispatchOnce({
      instructions,
      userText,
      signal: options.abortSignal,
    })
    const cooledKeys = Object.keys(this.cooldown.pending())
    return {
      content: [{ type: "text", text: result.text }],
      finishReason: "stop",
      usage: {
        inputTokens: Math.round(userText.length / 4),
        outputTokens: Math.round(result.text.length / 4),
        totalTokens: Math.round((userText.length + result.text.length) / 4),
      },
      response: {
        id: `pool-oauth-codex-${Date.now()}`,
        timestamp: new Date(),
        modelId: this.opts.modelId,
      },
      warnings: [],
      providerMetadata: { "cheapcode-pool": { used_key: usedKey, cooled_keys: cooledKeys } },
    }
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>
    response: { headers?: Record<string, string> }
  }> {
    const r = await this.doGenerate(options)
    const text = (r.content.find((c): c is { type: "text"; text: string } => c.type === "text") ?? { text: "" }).text
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] })
        controller.enqueue({
          type: "response-metadata",
          id: r.response.id,
          modelId: r.response.modelId,
          timestamp: r.response.timestamp,
        })
        const id = `txt-${Date.now()}`
        controller.enqueue({ type: "text-start", id })
        controller.enqueue({ type: "text-delta", id, delta: text })
        controller.enqueue({ type: "text-end", id })
        controller.enqueue({ type: "finish", finishReason: "stop", usage: r.usage })
        controller.close()
      },
    })
    return { stream, response: {} }
  }
}

export function createPoolOAuthLanguageModel(
  opts: PoolOAuthLanguageModelOptions,
): PoolOAuthLanguageModelV2 {
  return new PoolOAuthLanguageModelV2(opts)
}

export { OAuthLanguageModelV2 } // re-export so callers have a single import surface
export const _internal = { parseCodexQuotaResetMs }
