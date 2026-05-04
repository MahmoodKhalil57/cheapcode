/**
 * quota-tracker.ts — per-credential rate-limit + per-task budget tracker (M17 Phase C).
 *
 * Two responsibilities, intentionally combined to avoid duplicating the
 * persistent-state machinery:
 *
 *   1. Per-credential remaining-quota visibility, parsed from x-ratelimit-*
 *      headers when present; falls back to a sliding-window request counter
 *      when the provider doesn't surface ratelimit headers.
 *
 *   2. Per-task budget gate: callers open a TaskBudget with maxBudgetMs +
 *      maxBudgetUsd, charge it before each dispatch, and read its status
 *      to decide escalate-down (>=70% consumed) vs reject-new (>=100%).
 *
 * Telemetry: every charged dispatch appends one JSONL row to
 * ~/.local/share/cheapcode/dispatch.jsonl (rotated when >10 MB).
 *
 * Per atom 0018 measure-first: budget consumption is MEASURED at the
 * dispatch boundary (wall_clock_ms, cost_usd_estimate), never inferred
 * from prompt content.
 *
 * Per M17-DISPATCH-CONTRACT.md §C.
 */

import { existsSync, statSync } from "node:fs"
import { appendFile, mkdir, rename } from "node:fs/promises"
import { dirname } from "node:path"

// ---- ratelimit header parsing ---------------------------------------

export interface QuotaSnapshot {
  /** Requests remaining in the current window, if known. */
  requests_remaining?: number
  /** Tokens remaining in the current window, if known. */
  tokens_remaining?: number
  /** Wall-clock ms until the window resets, if known. */
  reset_in_ms?: number
  /** Source of the snapshot — "header" or "counter". */
  source: "header" | "counter"
  /** Last-seen wall-clock ms (Date.now() at observation). */
  observed_at: number
}

/**
 * Parse the response headers (Headers, Map, or plain object) for ratelimit
 * fields. Looks for OpenAI-style (x-ratelimit-remaining-requests) and
 * Anthropic-style (anthropic-ratelimit-requests-remaining) variants.
 */
export function parseRateLimitHeaders(headers: unknown): QuotaSnapshot | undefined {
  const get = (key: string): string | undefined => {
    if (!headers) return
    const k = key.toLowerCase()
    if (headers instanceof Headers) return headers.get(k) ?? undefined
    if (headers instanceof Map) return (headers.get(k) ?? headers.get(key)) as string | undefined
    if (typeof headers === "object") {
      const obj = headers as Record<string, string | string[] | undefined>
      const direct = obj[key] ?? obj[k] ?? obj[key.toUpperCase()]
      if (Array.isArray(direct)) return direct[0]
      return direct as string | undefined
    }
    return
  }
  const num = (s: string | undefined): number | undefined => {
    if (s === undefined) return
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }

  const reqRem =
    num(get("x-ratelimit-remaining-requests")) ??
    num(get("ratelimit-remaining")) ??
    num(get("anthropic-ratelimit-requests-remaining"))
  const tokRem =
    num(get("x-ratelimit-remaining-tokens")) ??
    num(get("anthropic-ratelimit-tokens-remaining"))
  const resetMsRaw =
    get("x-ratelimit-reset-requests") ??
    get("x-ratelimit-reset") ??
    get("anthropic-ratelimit-requests-reset")
  let resetMs: number | undefined
  if (resetMsRaw) {
    const m = /^(\d+(?:\.\d+)?)(ms|s|m)?$/i.exec(resetMsRaw.trim())
    if (m) {
      const v = Number(m[1])
      const unit = (m[2] ?? "s").toLowerCase()
      resetMs = unit === "ms" ? v : unit === "m" ? v * 60_000 : v * 1000
    }
  }

  if (reqRem === undefined && tokRem === undefined) return
  return {
    requests_remaining: reqRem,
    tokens_remaining: tokRem,
    reset_in_ms: resetMs,
    source: "header",
    observed_at: Date.now(),
  }
}

// ---- per-credential quota state -------------------------------------

export class QuotaTracker {
  private snapshots: Record<string, QuotaSnapshot> = {}
  private counters: Record<string, number[]> = {} // sliding window of unix-ms timestamps

  /**
   * Record a dispatch against a credential. Pass headers when available; the
   * tracker prefers header-based snapshots over the counter fallback.
   */
  record(authKey: string, headers?: unknown): void {
    const snap = parseRateLimitHeaders(headers)
    if (snap) {
      this.snapshots[authKey] = snap
    }
    const arr = (this.counters[authKey] ??= [])
    arr.push(Date.now())
    // keep only entries from the last 60s
    const cutoff = Date.now() - 60_000
    while (arr.length > 0 && arr[0] < cutoff) arr.shift()
  }

  snapshot(authKey: string): QuotaSnapshot | undefined {
    const fromHeader = this.snapshots[authKey]
    if (fromHeader) return fromHeader
    const arr = this.counters[authKey]
    if (!arr || arr.length === 0) return
    return {
      source: "counter",
      observed_at: arr[arr.length - 1],
      requests_remaining: undefined, // unknown — caller can use the count itself
    }
  }

  /** Requests in the last `windowMs` for this auth key (sliding-window). */
  recentRequests(authKey: string, windowMs: number = 60_000, now: number = Date.now()): number {
    const arr = this.counters[authKey]
    if (!arr) return 0
    let n = 0
    for (let i = arr.length - 1; i >= 0; i--) {
      if (now - arr[i] <= windowMs) n++
      else break
    }
    return n
  }
}

// ---- per-task budget ------------------------------------------------

export type BudgetStatus = "ok" | "escalate-down" | "reject"

export interface BudgetSnapshot {
  ms_used: number
  ms_remaining: number
  usd_used: number
  usd_remaining: number
  fraction_used: number // max of (ms, usd)
  status: BudgetStatus
}

export class TaskBudget {
  private startedAt: number
  private msUsed = 0
  private usdUsed = 0
  constructor(
    public readonly maxBudgetMs: number,
    public readonly maxBudgetUsd: number,
    public readonly escalateDownThreshold: number = 0.7,
  ) {
    this.startedAt = Date.now()
  }

  /** Charge the budget after a dispatch completes. */
  charge(wallClockMs: number, costUsd: number): BudgetSnapshot {
    this.msUsed += wallClockMs
    this.usdUsed += costUsd
    return this.status()
  }

  status(): BudgetSnapshot {
    const msFrac = this.maxBudgetMs > 0 ? this.msUsed / this.maxBudgetMs : 0
    const usdFrac = this.maxBudgetUsd > 0 ? this.usdUsed / this.maxBudgetUsd : 0
    const frac = Math.max(msFrac, usdFrac)
    let status: BudgetStatus
    if (frac >= 1) status = "reject"
    else if (frac >= this.escalateDownThreshold) status = "escalate-down"
    else status = "ok"
    return {
      ms_used: this.msUsed,
      ms_remaining: Math.max(0, this.maxBudgetMs - this.msUsed),
      usd_used: this.usdUsed,
      usd_remaining: Math.max(0, this.maxBudgetUsd - this.usdUsed),
      fraction_used: frac,
      status,
    }
  }

  elapsed(): number {
    return Date.now() - this.startedAt
  }
}

// ---- telemetry append + rotation ------------------------------------

export interface DispatchTelemetry {
  ts: string // ISO
  auth_key: string
  canonical: string
  target_model: string
  wall_clock_ms: number
  cost_usd_estimate: number
  status: BudgetStatus | "no-budget"
  tokens_in?: number
  tokens_out?: number
}

/** Default 10 MB rotation threshold per dispatch contract §C. */
export const TELEMETRY_ROTATE_BYTES = 10 * 1024 * 1024

export async function appendDispatchTelemetry(
  path: string,
  row: DispatchTelemetry,
  rotateAt: number = TELEMETRY_ROTATE_BYTES,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  // rotate first if oversized — keep a rolling .1 backup
  if (existsSync(path)) {
    try {
      const size = statSync(path).size
      if (size >= rotateAt) {
        await rename(path, `${path}.1`).catch(() => undefined)
      }
    } catch {
      // tolerate stat failure — fall through to append
    }
  }
  await appendFile(path, JSON.stringify(row) + "\n")
}
