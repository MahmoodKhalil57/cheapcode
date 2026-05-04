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
  // Filter to canonicals whose auth.json entries are api-key type (oauth tokens
  // for consumer ChatGPT-Plus / GitHub-Copilot can't hit /v1/chat/completions).
  const authPath = defaultOpencodeAuthPath()
  let authMap: Record<string, { type?: string }> = {}
  try {
    const { readFileSync } = await import("node:fs")
    authMap = JSON.parse(readFileSync(authPath, "utf-8"))
  } catch {
    // auth.json missing — no credentials available
  }
  const isApiKey = (k: string) => authMap[k]?.type === "api"
  const filteredConnected = list.connected.filter(isApiKey)
  const filteredCredentials = (list.credentials ?? []).filter((c) => isApiKey(c.key))
  if (filteredConnected.length === 0) {
    throw new Error(
      "no api-key credentials available — only oauth entries found in auth.json. " +
        "Set OPENROUTER_API_KEY or connect a provider via api-key in cheapcode UI.",
    )
  }
  const cooldown = new CooldownTracker(COOLDOWN_PATH)
  await cooldown.load()
  return buildPool({ connected: filteredConnected, credentials: filteredCredentials }, cooldown)
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
    const pool = await getPool()
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
          call: async (input) => {
            const callStart = performance.now()
            const modelId = input.targetModel.includes("/")
              ? input.targetModel.slice(input.targetModel.indexOf("/") + 1)
              : input.targetModel
            // Dispatch by canonical: openai uses OpenAI SDK directly,
            // openrouter (and others routed through openrouter) use the
            // OpenRouter provider which translates to /api/v1/chat/completions.
            const model =
              input.canonical === "openrouter"
                ? createOpenRouter({ apiKey: input.apiKey })(input.targetModel) // keep "openrouter/auto" full id
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
              // generateText in newer ai-sdk versions exposes response.headers;
              // pass through when present so QuotaTracker can record snapshots.
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
    // Prefer real api-key OpenAI when available; fall back to openrouter
    // routing to a gpt-5.5-class model so the baseline arm is dispatchable
    // even when the operator only has openrouter credentials.
    let model: ReturnType<ReturnType<typeof createOpenAI>>
    let modelLabel = GPT55_MODEL
    try {
      const apiKey = await resolveOpenAIKey()
      model = createOpenAI({ apiKey })(GPT55_MODEL)
    } catch {
      const orKey = await resolveOpenRouterKey()
      const orModel = process.env.CHEAPCODE_GPT55_VIA_OPENROUTER ?? "openai/gpt-5.5"
      model = createOpenRouter({ apiKey: orKey })(orModel) as never
      modelLabel = `openrouter:${orModel}`
    }
    const result = await generateText({ model, prompt })
    const usage = result.usage ?? { promptTokens: prompt.length / 4, completionTokens: result.text.length / 4 }
    return {
      output: result.text.slice(0, 800),
      wall_clock_ms: Math.round(performance.now() - start),
      tokens_in: usage.promptTokens,
      tokens_out: usage.completionTokens,
      cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens),
      model_used: modelLabel,
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
