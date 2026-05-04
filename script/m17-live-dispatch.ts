/**
 * m17-live-dispatch.ts — live arms for m17-benchmark.ts.
 *
 * Imported by m17-benchmark.ts when --live is passed. Builds a CredentialPool
 * by fetching /provider from a running cheapcode web server (CHEAPCODE_BENCH_SERVER
 * env var, default http://127.0.0.1:4096), then uses dispatchWithPool to route
 * the cheapcode arm and a direct OpenAI client for the gpt55 arm.
 *
 * Per M17-DISPATCH-CONTRACT.md §A3 + §"Smarter/faster/cheaper measurement contract".
 *
 * Required env:
 *   CHEAPCODE_BENCH_SERVER (default: http://127.0.0.1:4096)
 *   CHEAPCODE_GPT55_MODEL  (default: gpt-5.5)
 *   OPENAI_API_KEY OR auth.json#openai must resolve for the gpt55 arm
 */

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { CooldownTracker } from "../src/cooldown"
import { buildPool, type ProviderListShape } from "../src/credential-pool"
import { orchestrate } from "../src/orchestrate"
import { QuotaTracker, TaskBudget } from "../src/quota-tracker"
import { defaultOpencodeAuthPath, resolveAuthRef } from "../src/auth-resolver"
import { callChatGptCodex, CODEX_ALLOWED_MODELS } from "../src/chatgpt-oauth-fetch"
import { homedir } from "node:os"
import { join } from "node:path"

interface DispatchResult {
  output: string
  wall_clock_ms: number
  tokens_in: number
  tokens_out: number
  cost_usd_estimate: number
  model_used: string
  attribution?: { auth_key?: string; canonical_provider?: string; cooldown_skipped?: string[] }
  error?: string
}

const SERVER = process.env.CHEAPCODE_BENCH_SERVER ?? "http://127.0.0.1:4096"
const GPT55_MODEL = process.env.CHEAPCODE_GPT55_MODEL ?? "gpt-5.5"
const COOLDOWN_PATH = join(homedir(), ".local", "share", "cheapcode", "cooldown.json")

let _pool: Awaited<ReturnType<typeof initPool>> | undefined

async function initPool() {
  const res = await fetch(`${SERVER}/provider`)
  if (!res.ok) throw new Error(`cheapcode server at ${SERVER} returned HTTP ${res.status}`)
  const list = (await res.json()) as ProviderListShape
  // Filter to canonicals we know how to dispatch:
  //  - api-type entries (any canonical) → AI SDK with apiKey
  //  - oauth-type entries for canonical "openai" (consumer ChatGPT-Plus) →
  //    custom fetch to chatgpt.com/backend-api/codex/responses
  // OAuth for github-copilot etc. requires its own custom fetch (not wired);
  // filtered out so the pool only iterates dispatchable.
  const authPath = defaultOpencodeAuthPath()
  let authMap: Record<string, { type?: string }> = {}
  try {
    const { readFileSync } = await import("node:fs")
    authMap = JSON.parse(readFileSync(authPath, "utf-8"))
  } catch {
    // auth.json missing — no credentials available
  }
  const dispatchable = (k: string, canonical: string): boolean => {
    const t = authMap[k]?.type
    if (t === "api") return true
    if (t === "oauth" && canonical === "openai") return true // consumer-Plus path
    return false
  }
  const filteredConnected = list.connected.filter((id) => dispatchable(id, id))
  const filteredCredentials = (list.credentials ?? []).filter((c) =>
    dispatchable(c.key, c.providerID),
  )
  if (filteredConnected.length === 0) {
    throw new Error(
      "no dispatchable credentials in auth.json. Connect openai (consumer-Plus OAuth or " +
        "api-key) OR an api-type provider (openrouter, anthropic, ...) via cheapcode UI.",
    )
  }
  const cooldown = new CooldownTracker(COOLDOWN_PATH)
  await cooldown.load()
  const pool = buildPool({ connected: filteredConnected, credentials: filteredCredentials }, cooldown)
  return { pool, authMap, authPath }
}

export function authTypeFor(authKey: string, authMap: Record<string, { type?: string }>): "api" | "oauth" | undefined {
  const t = authMap[authKey]?.type
  if (t === "api" || t === "oauth") return t
  return undefined
}

async function getPool() {
  if (!_pool) _pool = await initPool()
  return _pool
}

// Shared per-process state — persists across tasks in one --live run.
const sharedQuota = new QuotaTracker()
let sharedBudget: TaskBudget | undefined
function getSharedBudget(): TaskBudget {
  if (!sharedBudget) {
    const ms = Number(process.env.CHEAPCODE_BENCH_BUDGET_MS ?? 600_000)
    const usd = Number(process.env.CHEAPCODE_BENCH_BUDGET_USD ?? 1.0)
    sharedBudget = new TaskBudget(ms, usd)
  }
  return sharedBudget
}

export async function liveDispatchCheapcode(prompt: string): Promise<DispatchResult> {
  const start = performance.now()
  try {
    const { pool, authMap, authPath } = await getPool()
    const canonicals = Object.keys(pool.candidates).filter((c) => c !== "opencode")
    canonicals.sort((a, b) => pool.candidates[b].length - pool.candidates[a].length)
    if (canonicals.length === 0) throw new Error("no canonical providers available in pool")

    const sycophancyRate = Number(process.env.CHEAPCODE_BENCH_SYCOPHANCY_RATE ?? 0)
    const dispatchId = `m17-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let lastErr: unknown
    for (const canonical of canonicals) {
      try {
        const out = await orchestrate({
          pool,
          canonical,
          dispatchId,
          prompt,
          targetModel: targetForCanonical(canonical),
          quota: sharedQuota,
          budget: getSharedBudget(),
          sycophancyRate,
          canonInjection: process.env.CHEAPCODE_CANON_INJECTION === "1",
          claimShapeVerify: process.env.CHEAPCODE_CLAIM_SHAPE_VERIFY === "1",
          call: async (input) => {
            const callStart = performance.now()
            const modelId = input.targetModel.includes("/")
              ? input.targetModel.slice(input.targetModel.indexOf("/") + 1)
              : input.targetModel
            const authKind = authTypeFor(input.authKey, authMap)

            // openai + oauth (consumer ChatGPT-Plus) → bypass AI SDK and call
            // chatgpt.com/backend-api/codex/responses directly (different contract:
            // stream:true required, instructions+input shape required).
            if (input.canonical === "openai" && authKind === "oauth") {
              const codexModel = CODEX_ALLOWED_MODELS.has(modelId) ? modelId : "gpt-5.5"
              const r = await callChatGptCodex({
                authPath,
                authKey: input.authKey,
                model: codexModel,
                prompt: input.prompt,
              })
              const tokensIn = Math.round(input.prompt.length / 4)
              const tokensOut = Math.round(r.text.length / 4)
              return {
                text: r.text.slice(0, 800),
                wall_clock_ms: Math.round(performance.now() - callStart),
                cost_usd_estimate: 0, // consumer-Plus is flat-rate; no per-call cost
                tokens_in: tokensIn,
                tokens_out: tokensOut,
              }
            }

            // openrouter → @openrouter/ai-sdk-provider, full "openrouter/auto" id
            // any other canonical with api-type key → @ai-sdk/openai (api.openai.com)
            const model =
              input.canonical === "openrouter"
                ? createOpenRouter({ apiKey: input.apiKey })(input.targetModel) as never
                : createOpenAI({ apiKey: input.apiKey })(modelId)
            const result = await generateText({ model, prompt: input.prompt })
            const usage = result.usage ?? {
              promptTokens: input.prompt.length / 4,
              completionTokens: result.text.length / 4,
            }
            return {
              text: result.text.slice(0, 800),
              wall_clock_ms: Math.round(performance.now() - callStart),
              cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens) * 0.6,
              tokens_in: usage.promptTokens,
              tokens_out: usage.completionTokens,
              responseHeaders: (result as unknown as { response?: { headers?: unknown } }).response?.headers,
            }
          },
        })
        return {
          output: out.text,
          wall_clock_ms: Math.round(performance.now() - start),
          tokens_in: out.tokens_in ?? 0,
          tokens_out: out.tokens_out ?? 0,
          cost_usd_estimate: out.cost_usd_estimate,
          model_used: out.attribution.target_model,
          attribution: {
            auth_key: out.attribution.auth_key,
            canonical_provider: out.attribution.canonical_provider,
            cooldown_skipped: out.attribution.cooldown_skipped,
          },
        }
      } catch (err) {
        lastErr = err
        continue
      }
    }
    throw lastErr ?? new Error("all canonicals failed")
  } catch (err) {
    return {
      output: "",
      wall_clock_ms: Math.round(performance.now() - start),
      tokens_in: 0,
      tokens_out: 0,
      cost_usd_estimate: 0,
      model_used: "cheapcode/auto",
      error: (err as Error).message,
    }
  }
}

export async function liveDispatchGpt55(prompt: string): Promise<DispatchResult> {
  const start = performance.now()
  try {
    // Resolution preference order for the gpt55 baseline:
    //   1. real api-type OpenAI key (sk-proj-... etc.) → api.openai.com via AI SDK
    //   2. consumer ChatGPT-Plus OAuth → chatgpt.com/backend-api codex path direct
    //   3. openrouter routing to "openai/gpt-5.5" → openrouter.ai
    const authPath = defaultOpencodeAuthPath()
    let apiKey: string | undefined
    try {
      apiKey = await resolveOpenAIKey()
    } catch {
      // not available — try OAuth or openrouter below
    }
    if (apiKey) {
      const result = await generateText({ model: createOpenAI({ apiKey })(GPT55_MODEL), prompt })
      const usage = result.usage ?? { promptTokens: prompt.length / 4, completionTokens: result.text.length / 4 }
      return {
        output: result.text.slice(0, 800),
        wall_clock_ms: Math.round(performance.now() - start),
        tokens_in: usage.promptTokens,
        tokens_out: usage.completionTokens,
        cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens),
        model_used: GPT55_MODEL,
      }
    }

    const oauthAvailable = await (async () => {
      try {
        const { readFile } = await import("node:fs/promises")
        const map = JSON.parse(await readFile(authPath, "utf8")) as Record<string, { type?: string }>
        return map["openai"]?.type === "oauth"
      } catch {
        return false
      }
    })()
    if (oauthAvailable) {
      const codexModel = CODEX_ALLOWED_MODELS.has(GPT55_MODEL) ? GPT55_MODEL : "gpt-5.5"
      const r = await callChatGptCodex({
        authPath,
        authKey: "openai",
        model: codexModel,
        prompt,
      })
      const tokensIn = Math.round(prompt.length / 4)
      const tokensOut = Math.round(r.text.length / 4)
      return {
        output: r.text.slice(0, 800),
        wall_clock_ms: Math.round(performance.now() - start),
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd_estimate: 0, // consumer-Plus is flat-rate
        model_used: `chatgpt-oauth:${codexModel}`,
      }
    }

    const orKey = await resolveOpenRouterKey()
    const orModel = process.env.CHEAPCODE_GPT55_VIA_OPENROUTER ?? "openai/gpt-5.5"
    const result = await generateText({ model: createOpenRouter({ apiKey: orKey })(orModel) as never, prompt })
    const usage = result.usage ?? { promptTokens: prompt.length / 4, completionTokens: result.text.length / 4 }
    return {
      output: result.text.slice(0, 800),
      wall_clock_ms: Math.round(performance.now() - start),
      tokens_in: usage.promptTokens,
      tokens_out: usage.completionTokens,
      cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens),
      model_used: `openrouter:${orModel}`,
    }
  } catch (err) {
    return {
      output: "",
      wall_clock_ms: Math.round(performance.now() - start),
      tokens_in: 0,
      tokens_out: 0,
      cost_usd_estimate: 0,
      model_used: GPT55_MODEL,
      error: (err as Error).message,
    }
  }
}

// ---- helpers ---------------------------------------------------------

function targetForCanonical(canonical: string): string {
  // Sensible defaults; operator can adjust per their account-tier mapping.
  if (canonical === "openai") return "openai/gpt-5.5"
  if (canonical === "openrouter") return "openrouter/auto"
  if (canonical === "anthropic") return "anthropic/claude-sonnet-4-6"
  return `${canonical}/default`
}

async function runOpenAICompatible(input: PoolDispatchInput, prompt: string): Promise<Omit<DispatchResult, "wall_clock_ms" | "attribution">> {
  const apiKey = input.auth.kind === "api-key" ? input.auth.key : input.auth.access
  const client = createOpenAI({ apiKey })
  const modelId = input.targetModel.includes("/") ? input.targetModel.split("/")[1] : input.targetModel
  const result = await generateText({ model: client(modelId), prompt })
  const usage = result.usage ?? { promptTokens: prompt.length / 4, completionTokens: result.text.length / 4 }
  return {
    output: result.text.slice(0, 800),
    tokens_in: usage.promptTokens,
    tokens_out: usage.completionTokens,
    cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens) * 0.6, // rough cheapcode-tier discount
    model_used: input.targetModel,
  }
}

async function resolveOpenAIKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const auth = resolveAuthRef("auth.json#openai", { opencodeAuthPath: defaultOpencodeAuthPath() })
  if (auth.kind === "api-key") return auth.key
  // OAuth tokens from consumer ChatGPT-Plus do not grant /v1/responses access;
  // refuse to use them as if they were api keys.
  throw new Error("openai entry is oauth-typed (consumer ChatGPT-Plus); needs api-type key for benchmarking")
}

async function resolveOpenRouterKey(): Promise<string> {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY
  const auth = resolveAuthRef("auth.json#openrouter", { opencodeAuthPath: defaultOpencodeAuthPath() })
  if (auth.kind === "api-key") return auth.key
  throw new Error("could not resolve openrouter credentials (set OPENROUTER_API_KEY or connect openrouter in cheapcode UI)")
}

function estimateGpt55Cost(tokensIn: number, tokensOut: number): number {
  // Best-guess pricing per 1M tokens; operator should override via env if more accurate is needed.
  const inUsd = (tokensIn / 1_000_000) * 5.0
  const outUsd = (tokensOut / 1_000_000) * 15.0
  return Math.round((inUsd + outUsd) * 10000) / 10000
}
