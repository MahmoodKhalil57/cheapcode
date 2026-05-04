/**
 * chatgpt-oauth-fetch.ts — consumer ChatGPT-Plus OAuth dispatch helper.
 *
 * Replicates the pattern from opencode's codex plugin (codex.ts loader):
 * provides a custom fetch that wraps any AI SDK call against an "openai"
 * provider and rewrites it to the consumer-Plus-OAuth-only endpoint at
 * chatgpt.com/backend-api/codex/responses.
 *
 * Why this exists separately from m17-live-dispatch:
 *   - the codex plugin lives inside the opencode runtime, not the cheapcode
 *     scripts.
 *   - operators with ONLY consumer ChatGPT-Plus OAuth (no api-type key)
 *     would otherwise be blocked from running --live.
 *
 * Token-refresh logic mirrors codex.ts refreshAccessToken — same client id,
 * same auth.openai.com OAuth endpoint. Atom 0007 anti-fab: we read the
 * existing refresh token from auth.json rather than starting a new flow.
 *
 * Per memory project_chatgpt_plus_byok_risk.md: same risk profile as
 * opencode itself — OpenAI could change the endpoint; this is "expected
 * to work today, may need adjustment."
 */

import { readFile, writeFile } from "node:fs/promises"

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const ISSUER = "https://auth.openai.com"
const CODEX_API_ENDPOINT = "https://chatgpt.com/backend-api/codex/responses"
const REFRESH_BUFFER_MS = 60_000

interface TokenResponse {
  id_token?: string
  access_token: string
  refresh_token: string
  expires_in?: number
}

interface OAuthAuthEntry {
  type: "oauth"
  access: string
  refresh: string
  expires: number
  accountId?: string
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }).toString(),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`token refresh failed: ${response.status} ${body.slice(0, 200)}`)
  }
  return (await response.json()) as TokenResponse
}

async function loadAuthEntry(authPath: string, key: string): Promise<OAuthAuthEntry> {
  const raw = await readFile(authPath, "utf8")
  const parsed = JSON.parse(raw) as Record<string, OAuthAuthEntry | unknown>
  const entry = parsed[key]
  if (!entry || typeof entry !== "object") {
    throw new Error(`auth.json entry "${key}" not found`)
  }
  if ((entry as { type?: string }).type !== "oauth") {
    throw new Error(`auth.json entry "${key}" is not oauth-type`)
  }
  return entry as OAuthAuthEntry
}

async function persistAuthEntry(authPath: string, key: string, entry: OAuthAuthEntry): Promise<void> {
  const raw = await readFile(authPath, "utf8").catch(() => "{}")
  const parsed = JSON.parse(raw) as Record<string, unknown>
  parsed[key] = entry
  await writeFile(authPath, JSON.stringify(parsed, null, 2))
}

/**
 * Build a fetch function that:
 *  1. refreshes the OAuth token if expired (with 60s buffer)
 *  2. strips dummy api-key authorization headers
 *  3. sets Bearer <access> + ChatGPT-Account-Id
 *  4. rewrites /v1/responses or /chat/completions to chatgpt.com/backend-api/codex/responses
 *
 * Returns a function compatible with the standard global `fetch` signature
 * so it slots into createOpenAI({ apiKey, fetch }).
 */
export function buildChatGptOAuthFetch(opts: {
  authPath: string
  authKey: string
}): typeof fetch {
  return async function chatgptOAuthFetch(input: RequestInfo | URL, init?: RequestInit) {
    let entry = await loadAuthEntry(opts.authPath, opts.authKey)

    if (!entry.access || entry.expires - REFRESH_BUFFER_MS < Date.now()) {
      const tokens = await refreshAccessToken(entry.refresh)
      entry = {
        type: "oauth",
        access: tokens.access_token,
        refresh: tokens.refresh_token,
        expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
        accountId: entry.accountId,
      }
      await persistAuthEntry(opts.authPath, opts.authKey, entry)
    }

    // Strip any pre-set authorization header (AI SDK sets dummy 'Bearer dummy')
    const headers = new Headers()
    if (init?.headers) {
      const h = new Headers(init.headers as HeadersInit)
      h.forEach((value, key) => {
        if (key.toLowerCase() !== "authorization") headers.set(key, value)
      })
    }
    headers.set("authorization", `Bearer ${entry.access}`)
    if (entry.accountId) headers.set("ChatGPT-Account-Id", entry.accountId)

    // Rewrite URL to codex endpoint
    const parsed =
      input instanceof URL
        ? input
        : new URL(typeof input === "string" ? input : (input as Request).url)
    const url =
      parsed.pathname.includes("/v1/responses") ||
      parsed.pathname.includes("/chat/completions") ||
      parsed.pathname.endsWith("/responses")
        ? new URL(CODEX_API_ENDPOINT)
        : parsed

    return fetch(url, { ...init, headers })
  }
}

/** Models supported by chatgpt.com/backend-api/codex/responses (per opencode's codex plugin). */
export const CODEX_ALLOWED_MODELS = new Set([
  "gpt-5.5",
  "gpt-5.2",
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.4",
  "gpt-5.4-mini",
])

const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses"

export interface CodexCallResult {
  text: string
  // chatgpt.com SSE doesn't surface a final usage object on the wire; estimate
  // from the prompt + completion lengths in the caller.
  raw_event_count: number
}

/**
 * Direct dispatch to chatgpt.com/backend-api/codex/responses. Bypasses the
 * AI SDK because the codex endpoint has its own contract (stream:true required,
 * instructions field required, input is an array of message objects).
 *
 * Streams Server-Sent Events; accumulates response.output_text.delta events
 * into a single string. Returns when response.output_text.done fires (or
 * stream closes). Reuses buildChatGptOAuthFetch for token refresh + headers.
 */
export async function callChatGptCodex(opts: {
  authPath: string
  authKey: string
  model: string
  instructions?: string
  prompt: string
  signal?: AbortSignal
}): Promise<CodexCallResult> {
  const fetchFn = buildChatGptOAuthFetch({ authPath: opts.authPath, authKey: opts.authKey })
  const body = {
    model: opts.model,
    instructions: opts.instructions ?? "You are a concise, accurate assistant.",
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: opts.prompt }],
      },
    ],
    stream: true,
    store: false,
  }
  const res = await fetchFn(CODEX_RESPONSES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(`codex/responses ${res.status}: ${text.slice(0, 300)}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (!res.body) throw new Error("codex/responses returned no body")
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let text = ""
  let events = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = block.split("\n").find((l) => l.startsWith("data:"))
      if (!dataLine) continue
      const payload = dataLine.slice(5).trim()
      if (!payload || payload === "[DONE]") continue
      events++
      try {
        const evt = JSON.parse(payload) as { type?: string; delta?: string; text?: string }
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          text += evt.delta
        } else if (evt.type === "response.output_text.done" && typeof evt.text === "string") {
          // final canonical text — prefer over accumulated deltas if present
          text = evt.text
        } else if (evt.type === "response.completed") {
          // best to break out; some servers don't send [DONE]
          break
        }
      } catch {
        // skip malformed events
      }
    }
  }
  return { text, raw_event_count: events }
}
