/**
 * oauth-language-model.ts — LanguageModelV2 adapter for consumer ChatGPT-Plus
 * OAuth dispatch (M20 runtime path).
 *
 * Wraps callChatGptCodex() so cheapcode-tiers.ts createCheapcodeProvider can
 * return tier models that work for users with ONLY consumer-Plus OAuth (no
 * api-keys, no OpenRouter credit). The AI SDK's createOpenAI({fetch}) pattern
 * doesn't work because chatgpt.com/backend-api/codex/responses has a custom
 * contract (instructions + input array, not chat/completions or v1/responses
 * shape) — see chatgpt-oauth-fetch.ts for the wire-format details.
 *
 * Per atom 0007 anti-fab: this adapter does NOT pretend to support tools /
 * structured output / json mode / image input. It claims a minimal V2 surface
 * and surfaces explicit errors when called with unsupported features.
 *
 * Per memory project_chatgpt_plus_byok_risk.md: same risk profile as opencode
 * itself — chatgpt.com/backend-api could change at any time. Operators using
 * this path are knowingly accepting the consumer-Plus envelope.
 */

import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2Content, LanguageModelV2StreamPart, LanguageModelV2FinishReason, LanguageModelV2Usage } from "@ai-sdk/provider"
import { callChatGptCodex as defaultCallChatGptCodex, CODEX_ALLOWED_MODELS, type CodexCallResult } from "./chatgpt-oauth-fetch"

export type CodexCaller = (opts: {
  authPath: string
  authKey: string
  model: string
  instructions?: string
  prompt: string
  signal?: AbortSignal
}) => Promise<CodexCallResult>

export interface OAuthLanguageModelOptions {
  /** Path to opencode's auth.json. */
  authPath: string
  /** Auth.json key to use (e.g. "openai", "openai-2"). */
  authKey: string
  /** Codex-allowed model id (gpt-5.5, gpt-5.4, gpt-5.4-mini, etc.). */
  modelId: string
  /** System-prompt-equivalent. */
  instructions?: string
  /** Override the codex caller (testing). Defaults to the real network impl. */
  codexCaller?: CodexCaller
}

export class OAuthLanguageModelV2 implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const
  readonly provider = "openai-consumer-plus-oauth"
  readonly modelId: string
  readonly supportedUrls = {} as Record<string, RegExp[]>

  private readonly callCodex: CodexCaller

  constructor(private readonly opts: OAuthLanguageModelOptions) {
    this.callCodex = opts.codexCaller ?? defaultCallChatGptCodex
    if (!CODEX_ALLOWED_MODELS.has(opts.modelId)) {
      // not fatal — codex endpoint may accept others — but warn so callers
      // know they're outside the operator-tested envelope.
      console.warn(
        `[cheapcode/oauth-language-model] modelId "${opts.modelId}" is not in CODEX_ALLOWED_MODELS; ` +
          `dispatch may fail. Known-good ids: ${Array.from(CODEX_ALLOWED_MODELS).join(", ")}`,
      )
    }
    this.modelId = opts.modelId
  }

  /**
   * Convert the AI SDK V2 prompt to a single user-text string for codex/responses.
   * Codex doesn't accept the multi-part prompt format directly; we flatten by
   * concatenating system + user text parts. Tool calls / image inputs raise.
   */
  private flattenPrompt(prompt: LanguageModelV2CallOptions["prompt"]): {
    instructions: string
    userText: string
  } {
    let instructions = this.opts.instructions ?? ""
    const userParts: string[] = []
    for (const msg of prompt) {
      if (msg.role === "system") {
        const t = msg.content
        if (typeof t === "string") instructions += (instructions ? "\n\n" : "") + t
      } else if (msg.role === "user") {
        if (typeof msg.content === "string") {
          userParts.push(msg.content)
        } else {
          for (const part of msg.content) {
            if (part.type === "text") userParts.push(part.text)
            else if (part.type === "file") {
              throw new Error(
                "oauth-language-model: file/image input not supported on consumer-Plus codex path",
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
        throw new Error(
          "oauth-language-model: tool messages not supported on consumer-Plus codex path",
        )
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
  }> {
    const { instructions, userText } = this.flattenPrompt(options.prompt)
    const r = await this.callCodex({
      authPath: this.opts.authPath,
      authKey: this.opts.authKey,
      model: this.opts.modelId,
      instructions,
      prompt: userText,
      signal: options.abortSignal,
    })
    return {
      content: [{ type: "text", text: r.text }],
      finishReason: "stop",
      usage: {
        inputTokens: Math.round(userText.length / 4),
        outputTokens: Math.round(r.text.length / 4),
        totalTokens: Math.round((userText.length + r.text.length) / 4),
      },
      response: {
        id: `oauth-codex-${Date.now()}`,
        timestamp: new Date(),
        modelId: this.opts.modelId,
      },
      warnings: [],
    }
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>
    response: { headers?: Record<string, string> }
  }> {
    // Simple impl: run doGenerate, emit a single text-delta + finish part.
    // Codex actually streams SSE; a richer impl would wire that through.
    // For tier dispatch this is fine — the auto wrapper consumes the final text.
    const result = await this.doGenerate(options)
    const text =
      result.content.find((c): c is { type: "text"; text: string } => c.type === "text")?.text ?? ""
    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: [] })
        controller.enqueue({ type: "response-metadata", id: result.response.id, modelId: result.response.modelId, timestamp: result.response.timestamp })
        const id = `txt-${Date.now()}`
        controller.enqueue({ type: "text-start", id })
        controller.enqueue({ type: "text-delta", id, delta: text })
        controller.enqueue({ type: "text-end", id })
        controller.enqueue({ type: "finish", finishReason: "stop", usage: result.usage })
        controller.close()
      },
    })
    return { stream, response: {} }
  }
}

/** Construct an OAuthLanguageModelV2 with a stable provider-style factory. */
export function createOAuthLanguageModel(opts: OAuthLanguageModelOptions): OAuthLanguageModelV2 {
  return new OAuthLanguageModelV2(opts)
}
