/**
 * version-check.ts — lightweight git-based update probe (M21).
 *
 * Both cheapcode source (~/.cheapcode/lib) and the cheapcode-opencode fork
 * (~/.cheapcode/opencode) are git checkouts. To check if updates are
 * available we:
 *   1. read local HEAD via `git rev-parse HEAD`
 *   2. read remote tip via `git ls-remote <remote> <branch>`
 *      (no full fetch — single HTTP roundtrip to GitHub, no working-tree work)
 *   3. compare the two SHAs
 *
 * Per atom 0007 anti-fab: this never WRITES to the working tree. It probes,
 * caches the result for 24h in ~/.cache/cheapcode/version-check.json, and
 * returns the diff. Operators apply the update via `cheapcode update` which
 * does the actual git pull + bun install + rebuild.
 *
 * Designed to fail-soft: any subprocess / network failure returns
 * { status: "unknown" } so the startup banner stays silent rather than
 * scaring the user with red text.
 */

import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

export type RepoStatus =
  | { status: "current"; localSha: string }
  | { status: "behind"; localSha: string; remoteSha: string; commitsAhead: number }
  | { status: "unknown"; reason: string }

export interface VersionCheckResult {
  cheapcode: RepoStatus
  fork: RepoStatus
  /** ISO timestamp of when this check ran. */
  checked_at: string
}

interface CacheFile {
  version: 1
  checked_at: string
  cheapcode: RepoStatus
  fork: RepoStatus
}

const DEFAULT_CACHE_PATH = join(homedir(), ".cache", "cheapcode", "version-check.json")
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

interface RepoSpec {
  /** Local working-tree path. */
  path: string
  /** Remote URL to ls-remote. */
  remoteUrl: string
  /** Branch on the remote. */
  branch: string
}

function git(args: string[], cwd?: string, timeoutMs = 4000): { stdout: string; ok: boolean; err?: string } {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (r.error) return { stdout: "", ok: false, err: r.error.message }
  if (r.status !== 0) return { stdout: r.stdout, ok: false, err: r.stderr.trim() || `git exited ${r.status}` }
  return { stdout: r.stdout.trim(), ok: true }
}

/** Probe a single repo: returns RepoStatus. Fail-soft. */
export function probeRepo(spec: RepoSpec): RepoStatus {
  if (!existsSync(spec.path)) return { status: "unknown", reason: `path missing: ${spec.path}` }
  if (!existsSync(join(spec.path, ".git"))) {
    return { status: "unknown", reason: `not a git checkout: ${spec.path}` }
  }
  const local = git(["rev-parse", "HEAD"], spec.path)
  if (!local.ok || !/^[0-9a-f]{40}$/.test(local.stdout)) {
    return { status: "unknown", reason: `local rev-parse failed: ${local.err ?? "no sha"}` }
  }
  const localSha = local.stdout
  const remote = git(["ls-remote", spec.remoteUrl, spec.branch])
  if (!remote.ok) return { status: "unknown", reason: `ls-remote failed: ${remote.err}` }
  const m = /^([0-9a-f]{40})\s/.exec(remote.stdout)
  if (!m) return { status: "unknown", reason: `ls-remote returned no sha for ${spec.branch}` }
  const remoteSha = m[1]
  if (localSha === remoteSha) return { status: "current", localSha }
  // Best-effort commits-ahead count (only works if local has fetched)
  const ahead = git(["rev-list", "--count", `${localSha}..${remoteSha}`], spec.path)
  const commitsAhead = ahead.ok ? parseInt(ahead.stdout, 10) || 0 : 0
  return { status: "behind", localSha, remoteSha, commitsAhead }
}

export interface CheckOptions {
  cheapcodeRoot: string
  forkPath: string
  /** Override default cache path (testing). */
  cachePath?: string
  /** Override TTL (testing). */
  cacheTtlMs?: number
  /** Force re-probe even if cache is fresh. */
  force?: boolean
  /** cheapcode source remote URL (override for self-hosted forks). */
  cheapcodeRemoteUrl?: string
  /** fork remote URL. */
  forkRemoteUrl?: string
}

const DEFAULT_CHEAPCODE_REMOTE = "https://github.com/MahmoodKhalil57/cheapcode.git"
const DEFAULT_FORK_REMOTE = "https://github.com/MahmoodKhalil57/opencode.git"

/**
 * Check both repos for updates, with 24h on-disk cache. Operators that need
 * a fresh check pass `{ force: true }`; otherwise startup banners reuse the
 * cached result so we don't network-call on every `cheapcode web` invocation.
 */
export function checkForUpdates(opts: CheckOptions): VersionCheckResult {
  const cachePath = opts.cachePath ?? DEFAULT_CACHE_PATH
  const ttl = opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS

  if (!opts.force && existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, "utf8")) as CacheFile
      if (cached.version === 1 && cached.checked_at) {
        const age = Date.now() - new Date(cached.checked_at).getTime()
        if (age >= 0 && age < ttl) {
          return {
            cheapcode: cached.cheapcode,
            fork: cached.fork,
            checked_at: cached.checked_at,
          }
        }
      }
    } catch {
      // corrupt cache — fall through to fresh probe
    }
  }

  const cheapcode = probeRepo({
    path: opts.cheapcodeRoot,
    remoteUrl: opts.cheapcodeRemoteUrl ?? DEFAULT_CHEAPCODE_REMOTE,
    branch: "main",
  })
  const fork = probeRepo({
    path: opts.forkPath,
    remoteUrl: opts.forkRemoteUrl ?? DEFAULT_FORK_REMOTE,
    branch: "dev",
  })
  const checked_at = new Date().toISOString()
  const payload: CacheFile = { version: 1, checked_at, cheapcode, fork }
  try {
    mkdirSync(dirname(cachePath), { recursive: true })
    writeFileSync(cachePath, JSON.stringify(payload, null, 2))
  } catch {
    // cache write failure is non-fatal
  }
  return { cheapcode, fork, checked_at }
}

/** Build a one-line banner string suitable for the `cheapcode web/tui` startup. Empty when up-to-date. */
export function buildUpdateBanner(result: VersionCheckResult): string {
  const lines: string[] = []
  if (result.cheapcode.status === "behind") {
    const n = result.cheapcode.commitsAhead || 0
    lines.push(
      n > 0
        ? `cheapcode: ${n} new commit${n === 1 ? "" : "s"} on origin/main`
        : `cheapcode: a new commit is available on origin/main`,
    )
  }
  if (result.fork.status === "behind") {
    const n = result.fork.commitsAhead || 0
    lines.push(
      n > 0
        ? `fork: ${n} new commit${n === 1 ? "" : "s"} on origin/dev`
        : `fork: a new commit is available on origin/dev`,
    )
  }
  if (lines.length === 0) return ""
  return `[update] ${lines.join("; ")} — run \`cheapcode update\` to apply`
}

/** Convenience predicate. */
export function hasUpdate(result: VersionCheckResult): boolean {
  return result.cheapcode.status === "behind" || result.fork.status === "behind"
}
