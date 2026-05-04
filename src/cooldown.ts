/**
 * cooldown.ts — per-credential cooldown tracker (M17 Phase A.2).
 *
 * Persistent state at ~/.local/share/cheapcode/cooldown.json (version: 1).
 * Keyed by auth.json key (NOT canonical providerID), so "openai" and "openai-2"
 * track independently. On 429 / 5xx / timeout / auth-failure, mark for cooldown;
 * router.pickCredential consults isAvailable() before dispatch.
 *
 * Per M17-DISPATCH-CONTRACT.md §A2. Falsification gate: cooldown.test.ts.
 */

import { existsSync } from "node:fs"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type CooldownReason = "429" | "5xx" | "timeout" | "auth"

export interface CooldownEntry {
  until: number // unix-ms
  reason: CooldownReason
}

interface CooldownFile {
  version: 1
  entries: Record<string, CooldownEntry>
}

const DEFAULT_MS: Record<CooldownReason, number> = {
  "429": 60_000, // capped; override with retry-after when present
  "5xx": 30_000,
  timeout: 15_000,
  auth: 60 * 60_000, // 1 hour — credential probably expired
}

export class CooldownTracker {
  private entries: Record<string, CooldownEntry> = {}

  constructor(private readonly path: string) {}

  async load(): Promise<void> {
    if (!existsSync(this.path)) return
    try {
      const raw = await readFile(this.path, "utf8")
      const parsed = JSON.parse(raw) as CooldownFile
      if (parsed.version === 1 && parsed.entries) this.entries = parsed.entries
    } catch {
      // tolerate corrupt file — fresh start
      this.entries = {}
    }
  }

  async save(): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    const payload: CooldownFile = { version: 1, entries: this.entries }
    const tmp = `${this.path}.tmp`
    await writeFile(tmp, JSON.stringify(payload, null, 2))
    await rename(tmp, this.path)
  }

  mark(authKey: string, reason: CooldownReason, retryAfterMs?: number): void {
    const ms = retryAfterMs ?? DEFAULT_MS[reason]
    this.entries[authKey] = { until: Date.now() + ms, reason }
  }

  isAvailable(authKey: string, now: number = Date.now()): boolean {
    const e = this.entries[authKey]
    if (!e) return true
    if (now >= e.until) {
      delete this.entries[authKey]
      return true
    }
    return false
  }

  pending(now: number = Date.now()): Record<string, CooldownEntry> {
    const out: Record<string, CooldownEntry> = {}
    for (const [k, v] of Object.entries(this.entries)) {
      if (now < v.until) out[k] = v
    }
    return out
  }

  /** Classify a fetch-style error into a cooldown reason. Returns undefined for non-cooldown errors. */
  static classifyError(err: unknown): CooldownReason | undefined {
    if (!err || typeof err !== "object") return
    const e = err as { status?: number; code?: string; name?: string }
    if (e.status === 429) return "429"
    if (e.status && e.status >= 500 && e.status < 600) return "5xx"
    if (e.status === 401 || e.status === 403) return "auth"
    if (e.name === "AbortError" || e.code === "ETIMEDOUT" || e.code === "ECONNRESET") return "timeout"
    return
  }
}
