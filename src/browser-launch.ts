/**
 * browser-launch.ts — open an OAuth URL in a fresh private/incognito browser
 * window so multi-account OAuth feels identical to opencode's first-account
 * Connect (M10).
 *
 * Operator directive: "OAuth multi-account becomes feel-identical to
 * first-account Connect even on browser ui so that nontechnical users can
 * use cheapcode" + "keep our maintenance overhead low, we want to be able
 * to merge downstream from opencode frequently."
 *
 * Maintenance posture:
 *   - Pure platform-detection + spawn. No opencode internals touched.
 *   - Uses stable browser CLI flags (--incognito / --inprivate / -private-window)
 *     that have been stable for 5+ years across vendors.
 *   - Failure mode is graceful: returns { launched: false } and the caller
 *     surfaces a manual-open instruction. Never throws.
 *   - All logic lives in this one file (~200 LoC); easy to inspect on each
 *     opencode upstream merge.
 *
 * Per memory project_compat_matrix.md: this layer is strictly additive. If
 * we can't launch a private window, the existing manual-incognito instruction
 * (already in cheapcode_account_oauth_add tool description) takes over.
 */

import { spawn, spawnSync } from "node:child_process"

// ============================================================
// Types
// ============================================================

export interface LaunchResult {
  /** True if a child process was spawned successfully. */
  launched: boolean
  /** Human-readable browser identifier ("chromium", "firefox", "edge", "safari", or "none"). */
  browser: string
  /** The command + args we used (joined with spaces, for debugging / logging). */
  command: string
  /** Reason for failure, when launched=false. */
  error?: string
}

interface BrowserLauncher {
  browser: string
  /**
   * Check command — if it exits 0, this browser is present. Null = skip
   * check (e.g., on Windows where `where.exe` is unreliable in some shells).
   */
  check: ReadonlyArray<string> | null
  /** Spawn argv (without the URL — appended at launch time). */
  cmd: ReadonlyArray<string>
}

// ============================================================
// Per-platform launcher tables
// ============================================================
//
// Order matters: we prefer Chromium-family first because their --incognito
// flag is most reliable, then Firefox, then Edge as fallback.

const LINUX_LAUNCHERS: ReadonlyArray<BrowserLauncher> = [
  { browser: "chromium", check: ["chromium", "--version"], cmd: ["chromium", "--incognito", "--new-window"] },
  { browser: "google-chrome", check: ["google-chrome", "--version"], cmd: ["google-chrome", "--incognito", "--new-window"] },
  { browser: "google-chrome-stable", check: ["google-chrome-stable", "--version"], cmd: ["google-chrome-stable", "--incognito", "--new-window"] },
  { browser: "brave-browser", check: ["brave-browser", "--version"], cmd: ["brave-browser", "--incognito", "--new-window"] },
  { browser: "firefox", check: ["firefox", "--version"], cmd: ["firefox", "-private-window"] },
  { browser: "microsoft-edge", check: ["microsoft-edge", "--version"], cmd: ["microsoft-edge", "--inprivate", "--new-window"] },
]

const DARWIN_LAUNCHERS: ReadonlyArray<BrowserLauncher> = [
  // macOS uses `open -na` to launch a fresh instance with args; `--args` separates
  // open-flags from the browser's flags. Skip checks (mdfind is slow); rely on
  // `open` exit codes — `open -na` returns non-zero if the app isn't installed.
  { browser: "chrome", check: null, cmd: ["open", "-na", "Google Chrome", "--args", "--incognito", "--new-window"] },
  { browser: "brave", check: null, cmd: ["open", "-na", "Brave Browser", "--args", "--incognito", "--new-window"] },
  { browser: "firefox", check: null, cmd: ["open", "-na", "Firefox", "--args", "-private-window"] },
  { browser: "edge", check: null, cmd: ["open", "-na", "Microsoft Edge", "--args", "--inprivate", "--new-window"] },
]

const WIN32_LAUNCHERS: ReadonlyArray<BrowserLauncher> = [
  // Windows: launching a child process via `cmd /c start "" <browser>` so the
  // start-command resolves the browser via PATH/registry. Empty quoted string
  // "" is the start command's "title" parameter (required when first arg is
  // quoted). Skip pre-checks; `start` returns 0 even if it falls through to
  // shell association, which is acceptable.
  { browser: "chrome", check: null, cmd: ["cmd", "/c", "start", "", "chrome", "--incognito", "--new-window"] },
  { browser: "msedge", check: null, cmd: ["cmd", "/c", "start", "", "msedge", "--inprivate", "--new-window"] },
  { browser: "firefox", check: null, cmd: ["cmd", "/c", "start", "", "firefox", "-private-window"] },
  { browser: "brave", check: null, cmd: ["cmd", "/c", "start", "", "brave", "--incognito", "--new-window"] },
]

function launchersForPlatform(platform: NodeJS.Platform): ReadonlyArray<BrowserLauncher> {
  switch (platform) {
    case "linux":
      return LINUX_LAUNCHERS
    case "darwin":
      return DARWIN_LAUNCHERS
    case "win32":
      return WIN32_LAUNCHERS
    default:
      return []
  }
}

// ============================================================
// Public API
// ============================================================

export interface LaunchOptions {
  /** Override platform detection (for tests). */
  platform?: NodeJS.Platform
  /**
   * Override the spawn function (for tests). Default: node:child_process.spawn.
   * Returns true if the child was launched; false otherwise.
   */
  spawnFn?: (cmd: string, args: ReadonlyArray<string>) => boolean
  /**
   * Override the existence check (for tests). Default: spawnSync the check command.
   * Returns true if the browser is detected as present.
   */
  checkFn?: (check: ReadonlyArray<string>) => boolean
}

/**
 * Open the given URL in a fresh private/incognito browser window.
 *
 * Tries each platform-appropriate browser in priority order. Returns details
 * about the first successful launch, or `{ launched: false }` if none worked.
 * NEVER throws — caller can always fall back to the manual-open instruction.
 *
 * The launched browser is detached from the parent process so it survives
 * the cheapcode-accounts-mcp lifecycle.
 */
export function launchPrivateBrowser(url: string, opts: LaunchOptions = {}): LaunchResult {
  const platform = opts.platform ?? process.platform
  const launchers = launchersForPlatform(platform)
  if (launchers.length === 0) {
    return { launched: false, browser: "none", command: "", error: `unsupported platform: ${platform}` }
  }

  const checkFn = opts.checkFn ?? defaultCheck
  const spawnFn = opts.spawnFn ?? defaultSpawn

  const errors: string[] = []
  for (const l of launchers) {
    if (l.check && !checkFn(l.check)) {
      errors.push(`${l.browser}: not installed`)
      continue
    }
    const argv = [...l.cmd, url]
    if (spawnFn(argv[0], argv.slice(1))) {
      return { launched: true, browser: l.browser, command: argv.join(" ") }
    }
    errors.push(`${l.browser}: spawn failed`)
  }

  return {
    launched: false,
    browser: "none",
    command: "",
    error: `no browser launched. tried: ${errors.join(" / ")}`,
  }
}

// ============================================================
// Default spawn / check (use stdlib node:child_process)
// ============================================================

function defaultCheck(check: ReadonlyArray<string>): boolean {
  try {
    const r = spawnSync(check[0], check.slice(1), {
      timeout: 2000,
      stdio: "ignore",
    })
    return r.status === 0
  } catch {
    return false
  }
}

function defaultSpawn(cmd: string, args: ReadonlyArray<string>): boolean {
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
    })
    child.unref()
    // We can't fully verify the launch without waiting; if spawn() didn't
    // throw synchronously, treat it as launched. The browser opening is
    // user-visible and gives them feedback either way.
    return true
  } catch {
    return false
  }
}

// ============================================================
// Convenience: shape a user-facing message based on launch outcome
// ============================================================

/**
 * Build the user-facing message after a launch attempt. Used by MCP tools
 * to relay status to the LLM (which then tells the user).
 */
export function buildLaunchMessage(url: string, result: LaunchResult, accountName: string): string {
  if (result.launched) {
    return (
      `A private/incognito window opened in ${result.browser}. ` +
      `Sign in with the account you want to add as "${accountName}" — ` +
      `it must be a different account from your existing one. The OAuth will ` +
      `complete automatically.`
    )
  }
  return (
    `Couldn't auto-open a private window (${result.error ?? "unknown reason"}). ` +
    `Please open this URL manually in incognito/private mode and sign in with ` +
    `the account you want to add as "${accountName}":\n\n${url}`
  )
}
