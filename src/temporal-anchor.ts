/**
 * temporal-anchor.ts — pre-prompt temporal scaffold (M17 Phase B.1).
 *
 * Per arXiv 2025 TicToc finding (operator's research list 2026-05-04):
 * frontier LLMs omit timestamps in 96%+ of reasoning traces. A bare
 * wall-clock + a brief recent-event window prepended to the prompt
 * forces the model to anchor freshness-dependent claims.
 *
 * Per atom 0018 (measure-first-decide-second): the wallclock value is
 * MEASURED at injection time, never inferred from prompt content. Daftar
 * receipts (when available) supply the recent-event window — also
 * measured, never narrated.
 *
 * This module is dependency-injected for testability: callers pass
 * `now()` + `recentReceipts()` so unit tests don't shell out to the
 * daftar binary. The default `daftarReceiptsBriefDefault` shells out
 * to ~/apps/cheapcode/packages/daftar/bin/daftar (fail-soft to []
 * if unavailable).
 *
 * Per M17-DISPATCH-CONTRACT.md §B1: inject ~50 tokens per dispatch.
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"

export interface RecentReceipt {
  /** Local time string when the receipt was filed (ISO or human-readable). */
  at: string
  /** One-line summary of what was witnessed. */
  summary: string
}

export interface TemporalAnchorOptions {
  /** Override the wall-clock source (testing). */
  now?: () => Date
  /** Override the receipt source (testing or alt-substrate). */
  recentReceipts?: () => Promise<RecentReceipt[]> | RecentReceipt[]
  /** Max number of receipts to include in the scaffold (default 5). */
  maxReceipts?: number
  /** Soft cap on the prepended scaffold byte length (default 600 bytes ≈ 150 tokens). */
  maxBytes?: number
  /** When true (default), include the strict-anchoring instruction line. */
  includeAnchoringInstruction?: boolean
}

/**
 * Build the scaffold string. Always returns SOMETHING — at minimum the
 * wall-clock — so callers can blindly prepend without conditional logic.
 */
export async function buildTemporalScaffold(opts: TemporalAnchorOptions = {}): Promise<string> {
  const now = (opts.now ?? (() => new Date()))()
  const lines: string[] = []
  lines.push(`[CONTEXT — wallclock ${now.toISOString()}]`)

  let receipts: RecentReceipt[] = []
  try {
    const fn = opts.recentReceipts ?? daftarReceiptsBriefDefault
    const result = await fn()
    receipts = Array.isArray(result) ? result : []
  } catch {
    receipts = []
  }
  const max = opts.maxReceipts ?? 5
  if (receipts.length > 0) {
    lines.push("Recent witnessed events (substrate ledger):")
    for (const r of receipts.slice(0, max)) {
      const summary = r.summary.replace(/\s+/g, " ").trim().slice(0, 120)
      lines.push(`  - ${r.at}: ${summary}`)
    }
  }

  if (opts.includeAnchoringInstruction !== false) {
    lines.push(
      "If your answer depends on the freshness of any fact, anchor it explicitly to a witnessed moment or decline to time-anchor.",
    )
  }

  let scaffold = lines.join("\n")
  const cap = opts.maxBytes ?? 600
  if (scaffold.length > cap) {
    // Drop receipts from the tail rather than truncating mid-sentence.
    const truncated: string[] = []
    for (const line of lines) {
      if (truncated.join("\n").length + line.length + 1 > cap) break
      truncated.push(line)
    }
    scaffold = truncated.join("\n")
  }
  return scaffold
}

/**
 * Prepend the scaffold to a prompt with a separator. Returns the full
 * prompt string ready to send to the model.
 */
export async function withTemporalAnchor(prompt: string, opts: TemporalAnchorOptions = {}): Promise<string> {
  const scaffold = await buildTemporalScaffold(opts)
  return `${scaffold}\n\n---\n\n${prompt}`
}

// ---- default daftar shell-out (fail-soft) ---------------------------

/**
 * Resolve the daftar binary using the same precedence as
 * cheapcode/packages/adam-plugin/plugin.ts: vendored copy first
 * (cheapcode/packages/daftar/bin/daftar), then ~/apps/adam fallback.
 * Returns undefined if neither exists.
 */
function resolveDaftarBin(): string | undefined {
  // Walk up from this module looking for packages/daftar/bin/daftar.
  let dir = dirname(import.meta.dir)
  for (let i = 0; i < 4; i++) {
    const candidate = join(dir, "packages", "daftar", "bin", "daftar")
    if (existsSync(candidate)) return candidate
    dir = dirname(dir)
  }
  const legacy = join(process.env.HOME ?? "", "apps", "adam", "tools", "daftar", "bin", "daftar")
  if (existsSync(legacy)) return legacy
  return undefined
}

async function daftarReceiptsBriefDefault(): Promise<RecentReceipt[]> {
  const bin = resolveDaftarBin()
  if (!bin) return []
  const project = process.env.CHEAPCODE_DAFTAR_PROJECT ?? process.cwd()
  return new Promise<RecentReceipt[]>((resolve) => {
    const out: string[] = []
    const child = spawn(bin, ["query", `--project=${project}`, "--limit=5", "--format=brief"], {
      timeout: 1500,
    })
    child.stdout.on("data", (d) => out.push(d.toString()))
    child.on("close", () => {
      try {
        const text = out.join("")
        const receipts: RecentReceipt[] = []
        // brief format: one line per receipt, "ISO_OR_HUMAN | summary"
        for (const line of text.split("\n")) {
          const t = line.trim()
          if (!t) continue
          const sep = t.indexOf("|")
          if (sep < 0) continue
          receipts.push({ at: t.slice(0, sep).trim(), summary: t.slice(sep + 1).trim() })
        }
        resolve(receipts)
      } catch {
        resolve([])
      }
    })
    child.on("error", () => resolve([]))
  })
}
