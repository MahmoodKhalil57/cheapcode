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
import { CooldownTracker } from "../src/cooldown"
import { buildPool, type ProviderListShape } from "../src/credential-pool"
import { dispatchWithPool, type PoolDispatchInput } from "../src/dispatch-with-pool"
import { resolveAuthRef } from "../src/auth-resolver"
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
  const cooldown = new CooldownTracker(COOLDOWN_PATH)
  await cooldown.load()
  return buildPool(list, cooldown)
}

async function getPool() {
  if (!_pool) _pool = await initPool()
  return _pool
}

export async function liveDispatchCheapcode(prompt: string): Promise<DispatchResult> {
  const start = performance.now()
  try {
    const pool = await getPool()
    // Pick canonical with most candidates (best parallelism headroom);
    // fall through to the first available canonical.
    const canonicals = Object.keys(pool.candidates).filter((c) => c !== "opencode")
    canonicals.sort((a, b) => pool.candidates[b].length - pool.candidates[a].length)
    if (canonicals.length === 0) throw new Error("no canonical providers available in pool")

    let lastErr: unknown
    for (const canonical of canonicals) {
      try {
        const out = await dispatchWithPool({
          pool,
          canonical,
          targetModel: targetForCanonical(canonical),
          dispatch: async (input: PoolDispatchInput) => {
            return await runOpenAICompatible(input, prompt)
          },
        })
        return {
          ...out.result,
          wall_clock_ms: Math.round(performance.now() - start),
          attribution: out.attribution,
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
    const apiKey = await resolveOpenAIKey()
    const client = createOpenAI({ apiKey })
    const result = await generateText({ model: client(GPT55_MODEL), prompt })
    const usage = result.usage ?? { promptTokens: prompt.length / 4, completionTokens: result.text.length / 4 }
    return {
      output: result.text.slice(0, 800),
      wall_clock_ms: Math.round(performance.now() - start),
      tokens_in: usage.promptTokens,
      tokens_out: usage.completionTokens,
      cost_usd_estimate: estimateGpt55Cost(usage.promptTokens, usage.completionTokens),
      model_used: GPT55_MODEL,
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
  const auth = resolveAuthRef("auth.json#openai", {})
  if (auth.kind === "api-key") return auth.key
  if (auth.kind === "oauth") return auth.access
  throw new Error("could not resolve openai credentials (set OPENAI_API_KEY or connect openai in cheapcode UI)")
}

function estimateGpt55Cost(tokensIn: number, tokensOut: number): number {
  // Best-guess pricing per 1M tokens; operator should override via env if more accurate is needed.
  const inUsd = (tokensIn / 1_000_000) * 5.0
  const outUsd = (tokensOut / 1_000_000) * 15.0
  return Math.round((inUsd + outUsd) * 10000) / 10000
}
