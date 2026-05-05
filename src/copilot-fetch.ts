/**
 * copilot-fetch.ts — GitHub Copilot OAuth dispatch helper (M23).
 *
 * Mirrors the chatgpt-oauth-fetch pattern: builds a custom fetch that adds
 * Copilot-specific headers + GitHub Bearer auth, so cheapcode tiers can
 * dispatch through api.githubcopilot.com using the operator's existing
 * github-copilot OAuth credential.
 *
 * Per opencode's plugin/github-copilot/copilot.ts (line 84+): the AUTH
 * value used as the Bearer token is the GitHub OAuth token stored in the
 * `refresh` field of the auth.json oauth entry (not the `access` field —
 * that's an opencode storage convention quirk for github-copilot).
 *
 * Endpoint: https://api.githubcopilot.com (or the enterprise-specific
 * copilot-api.<host> when opencode's auth flow recorded enterpriseUrl).
 * Standard OpenAI Chat Completions API; the Bearer + Copilot headers are
 * what makes Copilot accept the request.
 *
 * Per atom 0007 anti-fab: this never writes to auth.json — it only reads
 * the github-copilot credential. The token-refresh flow (when the GitHub
 * token expires) is opencode's responsibility, not ours.
 *
 * Per memory project_chatgpt_plus_byok_risk.md: same risk profile —
 * Copilot's API surface could change at any time.
 */

import { readFile } from "node:fs/promises"

const DEFAULT_COPILOT_BASE = "https://api.githubcopilot.com"

interface CopilotAuthEntry {
  type: "oauth"
  refresh: string
  access?: string
  expires?: number
  enterpriseUrl?: string
}

export interface CopilotFetchOptions {
  authPath: string
  authKey: string // typically "github-copilot" or an alias
}

async function loadCopilotAuth(authPath: string, authKey: string): Promise<CopilotAuthEntry> {
  const raw = await readFile(authPath, "utf8")
  const parsed = JSON.parse(raw) as Record<string, CopilotAuthEntry | unknown>
  const entry = parsed[authKey]
  if (!entry || typeof entry !== "object") {
    throw new Error(`auth.json entry "${authKey}" not found`)
  }
  if ((entry as { type?: string }).type !== "oauth") {
    throw new Error(`auth.json entry "${authKey}" is not oauth-type`)
  }
  const oauth = entry as CopilotAuthEntry
  if (!oauth.refresh) {
    throw new Error(`auth.json entry "${authKey}" has no GitHub token in 'refresh' field`)
  }
  return oauth
}

function copilotBaseUrl(enterpriseUrl?: string): string {
  if (!enterpriseUrl) return DEFAULT_COPILOT_BASE
  // Mirror opencode plugin: copilot-api.<normalized-host>
  const host = enterpriseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return `https://copilot-api.${host}`
}

/**
 * Build a fetch function compatible with the standard fetch signature.
 * Adds:
 *  - Authorization: Bearer <github-token>
 *  - User-Agent: cheapcode/<version>
 *  - Openai-Intent: conversation-edits
 *  - x-initiator: user
 * Strips any pre-set authorization or x-api-key headers (the AI SDK sets a
 * dummy Bearer that we replace).
 *
 * Returns a fetch function. Caller wires it into createOpenAI({ apiKey: 'dummy', fetch }).
 */
export function buildCopilotFetch(opts: CopilotFetchOptions): typeof fetch {
  return async function copilotFetch(input: RequestInfo | URL, init?: RequestInit) {
    const auth = await loadCopilotAuth(opts.authPath, opts.authKey)

    const headers = new Headers()
    if (init?.headers) {
      const h = new Headers(init.headers as HeadersInit)
      h.forEach((value, key) => {
        const k = key.toLowerCase()
        if (k === "authorization" || k === "x-api-key") return
        headers.set(key, value)
      })
    }
    headers.set("authorization", `Bearer ${auth.refresh}`)
    headers.set("user-agent", "cheapcode/0.1.0-pre")
    if (!headers.has("openai-intent")) headers.set("openai-intent", "conversation-edits")
    if (!headers.has("x-initiator")) headers.set("x-initiator", "user")

    return fetch(input, { ...init, headers })
  }
}

/** Resolve the Copilot API baseURL for the operator's connected entry. */
export async function resolveCopilotBaseUrl(opts: CopilotFetchOptions): Promise<string> {
  const auth = await loadCopilotAuth(opts.authPath, opts.authKey)
  return copilotBaseUrl(auth.enterpriseUrl)
}

/**
 * Models known to the operator-supplied Copilot list (2026-05-04 — friend's
 * "temp" string). Used by tier-pick fallback when a tierOverride doesn't
 * specify one. Names match how Copilot's own catalog ids them; brands track
 * the friend's spelling so the tier defaults map cleanly.
 */
export const COPILOT_FRIEND_KNOWN_MODELS = new Set([
  "claude-haiku-4.5",
  "claude-opus-4",
  "claude-opus-4.5",
  "claude-opus-4.6",
  "claude-sonnet-4",
  "claude-sonnet-4.5",
  "claude-sonnet-4.6",
  "gemini-2.5-pro",
  "gpt-4.1",
  "gpt-4o",
  "gpt-5-mini",
  "gpt-5.2",
  "gpt-5.2-codex",
  "gpt-5.3-codex",
  "gpt-5.4",
])
