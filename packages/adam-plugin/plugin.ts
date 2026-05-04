// @cheapcode/adam-plugin — bake adam (substrate) into cheapcode at runtime.
//
// Per the 2026-05-04 design pass on "what we couldn't enforce as Claude Code
// agent-discipline that fork-source-access lets us enforce as runtime gates":
// every "remember to invoke X" instruction in CLAUDE.md is a place where the
// substrate failed to be runtime. This plugin moves those gates into the
// opencode pipeline so the LLM doesn't need to remember discipline — the
// runtime enforces it for them.
//
// Phase 1 hooks (this file):
//   - tool.execute.before                 → action-safety pre-gate
//   - tool.execute.after                  → auto daftar receipt
//   - experimental.chat.system.transform  → inject adam-status snapshot
//   - experimental.text.complete          → claim auto-flag (v0)
//
// Phase 2 (deferred, requires opencode source patch):
//   - streaming claim-interceptor (inline ceiling-cap warnings)
//   - confidence-based voter dispatch in agent loop
//   - pre/post-turn substrate checkpoints

import type { Plugin } from "@opencode-ai/plugin"
import { $ } from "bun"
import fs from "fs/promises"
import path from "path"

const ADAM_STATUS_FILE = `${process.env.HOME}/.claude/adam-status.md`
// Phase A migration architecture (round 96): prefer cheapcode-vendored
// daftar binary (cheapcode/packages/daftar/bin/daftar) so cheapcode runs
// standalone. Fall back to ~/apps/adam/tools/... when vendored copy is
// missing (legacy install, fresh clone, etc.).
import * as path from "node:path"
import { existsSync } from "node:fs"
const PLUGIN_DIR = path.dirname(new URL(import.meta.url).pathname)
const VENDORED_DAFTAR_BIN = path.resolve(PLUGIN_DIR, "..", "daftar", "bin", "daftar")
const LEGACY_DAFTAR_BIN = `${process.env.HOME}/apps/adam/tools/daftar/bin/daftar`
const DAFTAR_BIN = existsSync(VENDORED_DAFTAR_BIN) ? VENDORED_DAFTAR_BIN : LEGACY_DAFTAR_BIN
const DAFTAR_PROJECT = process.env.CHEAPCODE_DAFTAR_PROJECT // optional override; default = cwd

// --- action-safety: TS port of mizan_check_action_safety, narrowed to
// patterns observable from tool args. The Python version walks a cite-graph
// for justification claims; that lookup runs out-of-band via the daftar
// receipt + post-turn audit, not in the synchronous pre-tool gate (latency).

const DESTRUCTIVE_BASH_PATTERNS: Array<{ pattern: RegExp; reason: string; severity: "block" | "warn" }> = [
  { pattern: /\brm\s+(-[rRfF]+\s+)?[~/]\s*$/, reason: "rm -rf at filesystem root or home", severity: "block" },
  { pattern: /\brm\s+-[rRfF]+\s+\/\S+/, reason: "rm -rf on absolute path outside cwd", severity: "warn" },
  { pattern: /\bgit\s+push\s+(.*\s+)?--force(?!-with-lease)/, reason: "git push --force (without --force-with-lease) — atom 0007 anti-fab", severity: "warn" },
  { pattern: /\bgit\s+reset\s+--hard/, reason: "git reset --hard — destroys uncommitted work (memory: 2026-04-28 rollback incident)", severity: "warn" },
  { pattern: /\bgit\s+checkout\s+--\s+\./, reason: "git checkout -- . — wipes uncommitted edits", severity: "warn" },
  { pattern: /\bgit\s+clean\s+-[fxd]+/, reason: "git clean -fd — removes untracked files", severity: "warn" },
  { pattern: /\bgit\s+branch\s+-D\b/, reason: "git branch -D — force-delete branch", severity: "warn" },
  { pattern: /\bdd\s+.*of=\/dev\//, reason: "dd writing to /dev/ — disk overwrite risk", severity: "block" },
  { pattern: /\bmkfs\.\w+\s+\/dev\//, reason: "mkfs on /dev/ — formats device", severity: "block" },
  { pattern: /:\(\)\s*\{\s*:\|:&\s*\};:/, reason: "fork bomb", severity: "block" },
  { pattern: /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE|SCHEMA)\b/i, reason: "SQL DROP/TRUNCATE — irreversible", severity: "warn" },
  { pattern: /\bchmod\s+-R\s+000\b/, reason: "chmod -R 000 — locks all files", severity: "warn" },
  { pattern: /\b(curl|wget)\s+[^|]+\|\s*(bash|sh|zsh)/, reason: "curl|sh — runs untrusted remote code", severity: "warn" },
  { pattern: /\b--no-verify\b/, reason: "--no-verify — bypasses pre-commit/pre-push hooks", severity: "warn" },
]

const PROTECTED_PATH_PREFIXES = ["/etc/", "/root/", "/usr/", "/var/", "/boot/", "/sys/", "/proc/"]

function checkBash(cmd: string): { blocked: boolean; reasons: string[] } {
  const reasons: string[] = []
  let blocked = false
  for (const { pattern, reason, severity } of DESTRUCTIVE_BASH_PATTERNS) {
    if (pattern.test(cmd)) {
      reasons.push(`[${severity}] ${reason}`)
      if (severity === "block") blocked = true
    }
  }
  return { blocked, reasons }
}

function checkProtectedPath(filePath: string | undefined): { blocked: boolean; reasons: string[] } {
  if (!filePath) return { blocked: false, reasons: [] }
  for (const prefix of PROTECTED_PATH_PREFIXES) {
    if (filePath.startsWith(prefix)) {
      return { blocked: false, reasons: [`[warn] writing under protected prefix ${prefix}`] }
    }
  }
  return { blocked: false, reasons: [] }
}

function checkActionSafety(tool: string, args: any): { blocked: boolean; reasons: string[] } {
  if (tool === "bash" && typeof args?.command === "string") return checkBash(args.command)
  if ((tool === "write" || tool === "edit") && typeof args?.filePath === "string") return checkProtectedPath(args.filePath)
  return { blocked: false, reasons: [] }
}

// --- daftar receipt: spawn the daftar CLI to add a structured note. Uses
// kind=receipt.observation per atom 0018 (measure-first-decide-second) — the
// receipt IS the observation, downstream audit walks them.

let _daftarAvailable: boolean | null = null
async function daftarAvailable(): Promise<boolean> {
  if (_daftarAvailable !== null) return _daftarAvailable
  try {
    await fs.access(DAFTAR_BIN)
    _daftarAvailable = true
  } catch {
    _daftarAvailable = false
  }
  return _daftarAvailable
}

async function writeReceipt(input: {
  tool: string
  sessionID: string
  callID: string
  args: any
  outputTitle: string
  outputText: string
  blocked: boolean
  reasons: string[]
}) {
  if (!(await daftarAvailable())) return
  const title = `${input.tool}:${input.callID.slice(0, 8)} ${input.blocked ? "[BLOCKED] " : ""}${input.outputTitle.slice(0, 80)}`
  const body = JSON.stringify(
    {
      session: input.sessionID,
      tool: input.tool,
      args: redact(input.args),
      output_preview: input.outputText.slice(0, 500),
      blocked: input.blocked,
      reasons: input.reasons,
      ts: new Date().toISOString(),
    },
    null,
    2,
  )
  const metadata = JSON.stringify({ tool: input.tool, blocked: input.blocked, session: input.sessionID })
  try {
    const cwd = DAFTAR_PROJECT ?? process.cwd()
    await $`${DAFTAR_BIN} add receipt.observation --title=${title} --body=${body} --metadata=${metadata} --project=${cwd}`
      .quiet()
      .nothrow()
  } catch {
    // never let receipt-write failures break the agent loop
  }
}

function redact(args: any): any {
  // prevent secrets from leaking into receipts
  try {
    const json = JSON.stringify(args)
    if (json.length > 4000) return { _truncated: true, preview: json.slice(0, 200) }
    return JSON.parse(json.replace(/"(api[_-]?key|token|secret|password)"\s*:\s*"[^"]*"/gi, '"$1":"<redacted>"'))
  } catch {
    return { _unserializable: true }
  }
}

// --- adam-status injection: the existing adam-tick hook writes
// ~/.claude/adam-status.md. Reading it on system-prompt assembly gives the
// LLM session-start substrate snapshot WITHOUT requiring the user to
// remember to consult it (which is exactly what was failing under
// CLAUDE.md-instruction discipline).

async function readAdamStatus(): Promise<string | null> {
  try {
    const content = await fs.readFile(ADAM_STATUS_FILE, "utf8")
    return content.trim().slice(0, 4000) // soft cap
  } catch {
    return null
  }
}

// --- post-turn claim interceptor: detect bcmea-violating absolutist terms in
// completed assistant text. Two responses: (1) write a daftar audit receipt,
// (2) append a visible ceiling-cap annotation to the message body so the
// USER sees the warning attached to the claim — not just the agent.
//
// Critical design: only flag terms NOT already qualified by nearby softeners.
// "always (within bounded case X)" or "always — except when..." is fine.
// Bare "always" without qualification within ~30 tokens is the actual fail.

const BCMEA_TERMS = [
  "uniformly",
  "always",
  "universally",
  "100%",
  "never fails",
  "guaranteed",
  "definitely",
  "certainly",
  "without exception",
  "in all cases",
  "everyone agrees",
  "no one disputes",
]

const QUALIFIER_TERMS = [
  "except",
  "unless",
  "bounded",
  "within",
  "in this case",
  "in bounded",
  "modulo",
  "for the most part",
  "approximately",
  "roughly",
  "typically",
  "usually",
  "in most",
  "p≥",
  "p>=",
  "ceiling-cap",
  "depends on",
  "it depends",
  "in some cases",
  "sometimes",
  "tends to",
  "often",
]

// negation patterns immediately preceding the absolutist term (within ~5
// tokens / ~30 chars) — "not always", "isn't always", "doesn't always",
// "wasn't always", "rarely", "almost never", etc. These INVERT the term to
// bcmea-respecting form and should NOT be flagged.
const NEGATION_PATTERNS = [
  /\bnot\s+$/i,
  /\bn't\s+$/i,
  /\bnever\s+$/i,
  /\brarely\s+$/i,
  /\bseldom\s+$/i,
  /\bhardly\s+$/i,
  /\balmost never\s+$/i,
  /\bnot quite\s+$/i,
  /\bisn't\s+$/i,
  /\bdoesn't\s+$/i,
  /\bdon't\s+$/i,
  /\bwasn't\s+$/i,
  /\bweren't\s+$/i,
  /\bcan't\s+$/i,
  /\bcannot\s+$/i,
  /\bwon't\s+$/i,
  /\bwouldn't\s+$/i,
  /\bshouldn't\s+$/i,
]

function isNegated(text: string, hitIdx: number): boolean {
  // Look at the ~30 chars immediately preceding the hit
  const window = text.slice(Math.max(0, hitIdx - 30), hitIdx)
  return NEGATION_PATTERNS.some((p) => p.test(window))
}

function findUnqualifiedHits(text: string): Array<{ term: string; context: string }> {
  const lower = text.toLowerCase()
  const hits: Array<{ term: string; context: string }> = []
  for (const term of BCMEA_TERMS) {
    let idx = 0
    while ((idx = lower.indexOf(term, idx)) !== -1) {
      if (isNegated(lower, idx)) {
        idx += term.length
        continue
      }
      // Look at ±200 chars around the hit for qualifiers
      const ctxStart = Math.max(0, idx - 200)
      const ctxEnd = Math.min(text.length, idx + term.length + 200)
      const ctx = lower.slice(ctxStart, ctxEnd)
      const hasQualifier = QUALIFIER_TERMS.some((q) => ctx.includes(q))
      if (!hasQualifier) {
        // Capture the actual sentence containing the hit for the warning
        const sentStart = Math.max(0, text.lastIndexOf(".", idx) + 1, text.lastIndexOf("\n", idx) + 1)
        const dotEnd = text.indexOf(".", idx + term.length)
        const nlEnd = text.indexOf("\n", idx + term.length)
        const candidates = [dotEnd, nlEnd].filter((n) => n !== -1)
        const sentEnd = candidates.length > 0 ? Math.min(...candidates) + 1 : Math.min(text.length, idx + term.length + 80)
        hits.push({ term, context: text.slice(sentStart, sentEnd).trim() })
      }
      idx += term.length
    }
  }
  return hits
}

// --- M3.56 atom 0024 + 0017 calibration loop: when the model voluntarily
// declines or hallucinates in its response, write a calibration receipt
// so the knowability detector can distill new patterns from real model
// behavior. Per user 2026-05-04: "as smarter models are used we should
// be seeing a more accurate signal from mizan as to whether we have
// enough information to determine knowability-decline." Smart-model
// behavior IS the teacher signal for the heuristic gate.
const MODEL_DECLINE_PATTERNS_LOCAL = [
  /\bi (don't|do not) know\b/i,
  /\bi cannot (tell|determine|deduce|verify|say)\b/i,
  /\bwithout more (information|context|details)\b/i,
  /\bi (would|will) need (more|additional)\b/i,
  /\bi don't have (enough|access|visibility)\b/i,
  /\bcould you (clarify|specify|provide more)\b/i,
  /\bi'm not (sure|certain) (which|what|who)\b/i,
]

function detectModelDeclineMarkers(text: string): string[] {
  const hits: string[] = []
  for (const p of MODEL_DECLINE_PATTERNS_LOCAL) {
    const m = text.match(p)
    if (m) hits.push(m[0])
  }
  return hits
}

async function writeKnowabilityCalibrationReceipt(input: {
  sessionID: string
  messageID: string
  responseText: string
  declineMarkers: string[]
}): Promise<void> {
  if (!(await daftarAvailable())) return
  const title = `knowability.calibration: model declined in ${input.messageID.slice(0, 8)} (markers=${input.declineMarkers.length})`
  const body = JSON.stringify(
    {
      session: input.sessionID,
      message: input.messageID,
      decline_markers: input.declineMarkers,
      response_preview: input.responseText.slice(0, 800),
      ts: new Date().toISOString(),
      note: "Model voluntarily declined or expressed uncertainty. If our heuristic knowability detector passed this prompt as 'answerable', this is a false-negative signal — distill into improved pattern set.",
    },
    null,
    2,
  )
  const metadata = JSON.stringify({
    kind: "knowability.calibration",
    decline_marker_count: input.declineMarkers.length,
    session: input.sessionID,
  })
  try {
    const cwd = DAFTAR_PROJECT ?? process.cwd()
    await $`${DAFTAR_BIN} add receipt.observation --title=${title} --body=${body} --metadata=${metadata} --project=${cwd}`
      .quiet()
      .nothrow()
  } catch {}
}

async function flagAndAnnotateClaims(input: {
  sessionID: string
  messageID: string
  text: string
}): Promise<string> {
  // M3.56 calibration loop: detect model-decline-markers in the response.
  // Fire-and-forget receipt write; never blocks the agent loop.
  const declineMarkers = detectModelDeclineMarkers(input.text)
  if (declineMarkers.length > 0) {
    void writeKnowabilityCalibrationReceipt({
      sessionID: input.sessionID,
      messageID: input.messageID,
      responseText: input.text,
      declineMarkers,
    })
  }

  const hits = findUnqualifiedHits(input.text)
  if (hits.length === 0) return input.text

  // Audit receipt
  if (await daftarAvailable()) {
    const title = `bcmea-candidates in ${input.messageID.slice(0, 8)}: ${hits.map((h) => h.term).join(", ")}`
    try {
      const cwd = DAFTAR_PROJECT ?? process.cwd()
      await $`${DAFTAR_BIN} add receipt.observation --title=${title} --body=${input.text.slice(0, 2000)} --metadata=${JSON.stringify({ kind: "claim_flag", hits, session: input.sessionID })} --project=${cwd}`
        .quiet()
        .nothrow()
    } catch {}
  }

  // User-visible ceiling-cap annotation appended to the message
  const lines = [
    "",
    "---",
    "",
    "> ⚠ **substrate ceiling-cap suggested** (auto-flagged by @cheapcode/adam-plugin):",
    "> the response contains absolutist forms without nearby qualifiers, which violates",
    "> bcmea (bounded coexistence of mutually exclusive absolutes). Recommend reframing",
    "> as bounded claims with explicit envelopes.",
    ">",
    ...hits.slice(0, 3).map((h) => `> - **\`${h.term}\`** in: _"${h.context.slice(0, 200).replace(/\n/g, " ")}"_`),
  ]
  if (hits.length > 3) lines.push(`> - …and ${hits.length - 3} more`)
  lines.push(
    ">",
    "> _Disable this check with env `CHEAPCODE_BCMEA_OFF=1` if running in a mode where",
    "> absolutist phrasing is intentional (e.g., generating final user-facing copy)._",
  )
  return input.text + lines.join("\n")
}

// --- per-turn substrate context (Phase 2 #3, plugin path): on each LLM call
// (system.transform fires per-call, not just once), refresh the substrate
// snapshot so cross-session continuity is automatic. The agent doesn't
// need to remember to consult ~/.claude/adam-status.md or query daftar —
// the plugin injects fresh state at every turn.
//
// Cached for 60s to avoid spamming daftar/disk on every short turn.

let _substrateCacheText: string | null = null
let _substrateCacheAt = 0
const SUBSTRATE_REFRESH_MS = 60_000

async function recentDaftarReceiptsBlock(projectPath?: string): Promise<string | null> {
  if (!(await daftarAvailable())) return null
  try {
    const cwd = projectPath ?? DAFTAR_PROJECT ?? process.cwd()
    const out = await $`${DAFTAR_BIN} list --kind=receipt.observation --limit=5 --project=${cwd}`
      .quiet()
      .nothrow()
      .text()
    const parsed = JSON.parse(out)
    const entries: any[] = parsed.entries ?? []
    if (entries.length === 0) return null
    const lines = entries.slice(0, 5).map((e: any) => {
      const t = (e.title ?? "").slice(0, 100)
      const ts = e.created_at ?? ""
      return `- _${ts.slice(0, 19)}_ — ${t}`
    })
    return [
      "### recent daftar receipts (last 5, this project)",
      "_Auto-injected; per atom 0021 recursive-substrate-use. The substrate has memory; you do not need to re-derive what's already grounded here._",
      "",
      ...lines,
    ].join("\n")
  } catch {
    return null
  }
}

async function buildSubstrateSnapshot(projectPath?: string): Promise<string | null> {
  const now = Date.now()
  if (_substrateCacheText !== null && now - _substrateCacheAt < SUBSTRATE_REFRESH_MS) {
    return _substrateCacheText
  }
  const adamStatus = await readAdamStatus()
  const receipts = await recentDaftarReceiptsBlock(projectPath)
  if (!adamStatus && !receipts) {
    _substrateCacheText = null
    _substrateCacheAt = now
    return null
  }
  const parts: string[] = ["## substrate snapshot (auto-injected by @cheapcode/adam-plugin)"]
  parts.push(
    "_Refreshed every 60s. Per atom 0018 measure-first-decide-second + atom 0020 Adam-Eve compositor: this is Eve's persistent memory across sessions._",
    "",
  )
  if (adamStatus) {
    parts.push("### adam-tick (substrate state at last tick)", "", adamStatus, "")
  }
  if (receipts) parts.push(receipts, "")
  _substrateCacheText = parts.join("\n").trim()
  _substrateCacheAt = now
  return _substrateCacheText
}

// --- plugin entry point ---

export const AdamPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const { blocked, reasons } = checkActionSafety(input.tool, output.args)
      if (reasons.length > 0) {
        // attach reasons to args metadata so they surface in the tool output
        // (visible to the agent + user); blocked=true throws to abort
        if (blocked) {
          throw new Error(
            `[adam-plugin] action-safety BLOCK on ${input.tool}: ${reasons.join("; ")}. ` +
              `Refusing to execute. If this is intentional, narrow the operation.`,
          )
        }
        // warn-level: surface via thrown soft-warn? AI SDK lacks a soft-warn
        // channel; we inject the warning into args as a sidecar field that
        // the agent can read in tool output context.
        output.args = { ...output.args, _adam_warn: reasons.join("; ") }
      }
    },

    "tool.execute.after": async (input, output) => {
      const warn = (input.args as any)?._adam_warn
      const reasons = warn ? warn.split("; ") : []
      await writeReceipt({
        tool: input.tool,
        sessionID: input.sessionID,
        callID: input.callID,
        args: input.args,
        outputTitle: output.title ?? "",
        outputText: typeof output.output === "string" ? output.output : JSON.stringify(output.output ?? ""),
        blocked: false,
        reasons,
      })
    },

    "experimental.chat.system.transform": async (_input, output) => {
      if (process.env.CHEAPCODE_SUBSTRATE_OFF === "1") return
      const snapshot = await buildSubstrateSnapshot()
      if (snapshot) output.system.push(snapshot)
    },

    "experimental.text.complete": async (input, output) => {
      if (process.env.CHEAPCODE_BCMEA_OFF === "1") return
      output.text = await flagAndAnnotateClaims({
        sessionID: input.sessionID,
        messageID: input.messageID,
        text: output.text,
      })
    },
  }
}

export default AdamPlugin
