#!/bin/sh
# cheapcode installer — curl-pipe-able install script.
#
# Usage (linux / macos — what to share with friends):
#   curl -fsSL https://raw.githubusercontent.com/MahmoodKhalil57/cheapcode/main/install.sh | sh
#
# Usage (local dev — install from a checked-out repo):
#   CHEAPCODE_SOURCE=/home/mk/apps/cheapcode sh /path/to/install.sh
#
# What it does:
#   1. detects platform (linux/macos)
#   2. checks for opencode (installs via official opencode installer if missing)
#   3. checks for bun (installs via official bun installer if missing)
#   4. installs cheapcode bin/ symlinks at ~/.cheapcode/bin
#   5. registers cheapcode in ~/.config/opencode/opencode.json (if not already)
#   6. registers cheapcode-accounts MCP server (if not already)
#   7. creates default ~/.config/cheapcode/accounts.json (empty registry)
#   8. updates shell rc to add ~/.cheapcode/bin to PATH
#
# Per memory project_credential_buckets.md: this installer touches credential
# files only via opencode's own flow. It NEVER writes to ~/.local/share/opencode/auth.json
# directly — providers must be added through `opencode providers login`.

set -eu

# ============================================================
# Output helpers
# ============================================================

if [ -t 1 ]; then
  c_red='\033[31m'
  c_green='\033[32m'
  c_yellow='\033[33m'
  c_cyan='\033[36m'
  c_dim='\033[2m'
  c_bold='\033[1m'
  c_reset='\033[0m'
else
  c_red=''; c_green=''; c_yellow=''; c_cyan=''; c_dim=''; c_bold=''; c_reset=''
fi

say() { printf '%b\n' "$*"; }
info() { say "${c_cyan}[cheapcode]${c_reset} $*"; }
warn() { say "${c_yellow}[cheapcode]${c_reset} $*"; }
ok() { say "${c_green}[cheapcode]${c_reset} $*"; }
err() { say "${c_red}[cheapcode]${c_reset} $*" >&2; }
die() { err "$@"; exit 1; }

# ============================================================
# Platform detection
# ============================================================

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  linux|darwin) ;;
  *) die "unsupported OS: $OS (linux/macos only for now)" ;;
esac

ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) die "unsupported arch: $ARCH (amd64/arm64 only for now)" ;;
esac

info "platform: ${c_bold}${OS}/${ARCH}${c_reset}"

# ============================================================
# Source — where to install FROM
# ============================================================
#
# CHEAPCODE_SOURCE: local checkout path (dev mode)
# Otherwise: git-clone from CHEAPCODE_REPO (default github saastemly/cheapcode)
# (Eventually: download a pre-built binary from a release URL.)

CHEAPCODE_SOURCE="${CHEAPCODE_SOURCE:-}"
CHEAPCODE_REPO="${CHEAPCODE_REPO:-https://github.com/MahmoodKhalil57/cheapcode.git}"
# Cheapcode is a fork of opencode. We clone our fork (not upstream sst/opencode)
# so users get cheapcode's native UI patches like the "+ Add another credential"
# button. Downstream merges from sst/opencode flow through this fork.
OPENCODE_FORK_REPO="${OPENCODE_FORK_REPO:-https://github.com/MahmoodKhalil57/opencode.git}"
OPENCODE_FORK_BRANCH="${OPENCODE_FORK_BRANCH:-dev}"
CHEAPCODE_HOME="${CHEAPCODE_HOME:-$HOME/.cheapcode}"
CHEAPCODE_LIB="$CHEAPCODE_HOME/lib"
CHEAPCODE_OPENCODE="$CHEAPCODE_HOME/opencode"
CHEAPCODE_BIN="$CHEAPCODE_HOME/bin"

# ============================================================
# Check + install bun if missing
# ============================================================

if ! command -v bun >/dev/null 2>&1; then
  warn "bun not found in PATH; installing via official bun installer..."
  curl -fsSL https://bun.sh/install | bash
  if [ -d "$HOME/.bun/bin" ]; then
    PATH="$HOME/.bun/bin:$PATH"
    export PATH
  fi
  command -v bun >/dev/null 2>&1 || die "bun install failed; install manually: https://bun.sh"
  ok "bun installed: $(bun --version 2>&1 | head -1)"
else
  ok "bun found: $(bun --version 2>&1 | head -1)"
fi

# ============================================================
# Clone (or update) the cheapcode opencode fork
# ============================================================
# We do NOT install upstream opencode binary. Cheapcode IS a fork of opencode,
# distributed independently with our UI patches. Run-from-source via bun.

if [ -d "$CHEAPCODE_OPENCODE/.git" ]; then
  info "updating cheapcode-opencode fork at $CHEAPCODE_OPENCODE"
  git -C "$CHEAPCODE_OPENCODE" fetch --quiet origin || warn "fetch failed; continuing"
  git -C "$CHEAPCODE_OPENCODE" reset --hard "origin/$OPENCODE_FORK_BRANCH" --quiet || warn "reset failed"
else
  rm -rf "$CHEAPCODE_OPENCODE"
  info "cloning cheapcode-opencode fork from $OPENCODE_FORK_REPO (branch $OPENCODE_FORK_BRANCH)"
  git clone --depth 50 --branch "$OPENCODE_FORK_BRANCH" --quiet "$OPENCODE_FORK_REPO" "$CHEAPCODE_OPENCODE"
fi
info "installing fork dependencies (this is a large monorepo; first install can take a few minutes)"
(cd "$CHEAPCODE_OPENCODE" && bun install --silent)
info "building packages/app SPA (vite build; produces dist/ for runtime serving)"
(cd "$CHEAPCODE_OPENCODE/packages/app" && bun run build > /tmp/cheapcode-app-build.log 2>&1) || {
  warn "packages/app build failed; cheapcode web will fall back to upstream UI (no '+ Add another' button visible)"
  warn "see /tmp/cheapcode-app-build.log for details"
}
ok "cheapcode-opencode fork ready at $CHEAPCODE_OPENCODE"

# ============================================================
# Place / fetch cheapcode source
# ============================================================

mkdir -p "$CHEAPCODE_HOME" "$CHEAPCODE_BIN"

if [ -n "$CHEAPCODE_SOURCE" ]; then
  # Dev mode: symlink from existing checkout
  if [ ! -d "$CHEAPCODE_SOURCE" ]; then
    die "CHEAPCODE_SOURCE directory does not exist: $CHEAPCODE_SOURCE"
  fi
  info "linking lib from local source: $CHEAPCODE_SOURCE"
  rm -rf "$CHEAPCODE_LIB"
  ln -s "$CHEAPCODE_SOURCE" "$CHEAPCODE_LIB"
else
  # Production mode: clone (eventually replace with pre-built binary download)
  if [ -d "$CHEAPCODE_LIB/.git" ]; then
    info "updating cheapcode at $CHEAPCODE_LIB"
    git -C "$CHEAPCODE_LIB" pull --ff-only --quiet || warn "git pull failed; continuing with existing checkout"
  else
    rm -rf "$CHEAPCODE_LIB"
    info "cloning cheapcode from $CHEAPCODE_REPO"
    git clone --depth 1 --quiet "$CHEAPCODE_REPO" "$CHEAPCODE_LIB"
  fi
  info "installing dependencies"
  (cd "$CHEAPCODE_LIB" && bun install --silent)
fi

# ============================================================
# Install bin/ symlinks
# ============================================================

# Each entry maps `<command-name> -> <target-relative-to-lib>`
install_bin() {
  name=$1
  target=$2
  if [ ! -f "$CHEAPCODE_LIB/$target" ]; then
    warn "skipping $name: $target not found in lib"
    return
  fi
  ln -sf "$CHEAPCODE_LIB/$target" "$CHEAPCODE_BIN/$name"
  chmod +x "$CHEAPCODE_LIB/$target"
}

install_bin "cheapcode" "bin/cheapcode"
install_bin "cheapcode-accounts" "bin/cheapcode-accounts"
install_bin "cheapcode-account-status" "bin/cheapcode-account-status"
install_bin "cheapcode-accounts-mcp" "bin/cheapcode-accounts-mcp"

ok "cheapcode binaries installed at $CHEAPCODE_BIN"

# ============================================================
# Default config
# ============================================================

CHEAPCODE_CONFIG="$HOME/.config/cheapcode"
mkdir -p "$CHEAPCODE_CONFIG"

if [ ! -f "$CHEAPCODE_CONFIG/accounts.json" ]; then
  cat > "$CHEAPCODE_CONFIG/accounts.json" <<'JSON'
{
  "version": 1,
  "accounts": []
}
JSON
  ok "created empty accounts.json at $CHEAPCODE_CONFIG/accounts.json"
fi

# ============================================================
# Register cheapcode in opencode.json (additive — doesn't clobber existing)
# ============================================================

OPENCODE_CFG="$HOME/.config/opencode/opencode.json"
mkdir -p "$(dirname "$OPENCODE_CFG")"

if [ ! -f "$OPENCODE_CFG" ]; then
  info "creating $OPENCODE_CFG with cheapcode provider + MCP server registered"
  cat > "$OPENCODE_CFG" <<JSON
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "cheapcode": {
      "npm": "$CHEAPCODE_LIB",
      "name": "cheapcode tiers",
      "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
      "models": {
        "cheap": { "name": "cheap", "tools": true },
        "cheap-fast": { "name": "cheap-fast", "tools": true },
        "smart": { "name": "smart", "tools": true },
        "smart-fast": { "name": "smart-fast", "tools": true },
        "auto": { "name": "auto", "tools": true },
        "local": { "name": "local", "tools": true }
      }
    }
  },
  "mcp": {
    "cheapcode-accounts": {
      "type": "local",
      "command": ["$CHEAPCODE_BIN/cheapcode-accounts-mcp"]
    }
  }
}
JSON
else
  # Existing config — surface a non-destructive warning + suggest manual edit if cheapcode entries missing
  if ! grep -q '"cheapcode"' "$OPENCODE_CFG"; then
    warn "your existing $OPENCODE_CFG does not contain a 'cheapcode' provider entry"
    warn "add this manually under the 'provider' key:"
    say ""
    say "    \"cheapcode\": {"
    say "      \"npm\": \"$CHEAPCODE_LIB\","
    say "      \"name\": \"cheapcode tiers\","
    say "      \"options\": { \"apiKey\": \"{env:OPENROUTER_API_KEY}\" },"
    say "      \"models\": {"
    say "        \"auto\": { \"name\": \"auto\", \"tools\": true },"
    say "        \"smart-fast\": { \"name\": \"smart-fast\", \"tools\": true }"
    say "      }"
    say "    }"
    say ""
  fi
  if ! grep -q '"cheapcode-accounts"' "$OPENCODE_CFG"; then
    warn "your existing $OPENCODE_CFG does not contain the 'cheapcode-accounts' MCP server"
    warn "add this manually under the 'mcp' key:"
    say ""
    say "    \"cheapcode-accounts\": {"
    say "      \"type\": \"local\","
    say "      \"command\": [\"$CHEAPCODE_BIN/cheapcode-accounts-mcp\"]"
    say "    }"
    say ""
  fi
fi

# ============================================================
# Shell PATH setup
# ============================================================

add_to_path() {
  rc=$1
  if [ -f "$rc" ] && ! grep -q "cheapcode/bin" "$rc"; then
    {
      echo ""
      echo "# cheapcode"
      echo "export PATH=\"\$HOME/.cheapcode/bin:\$PATH\""
    } >> "$rc"
    ok "added cheapcode to PATH in $rc"
  elif [ ! -f "$rc" ]; then
    return
  fi
}

case "${SHELL:-}" in
  */zsh) add_to_path "$HOME/.zshrc" ;;
  */bash) add_to_path "$HOME/.bashrc" ;;
  *)
    add_to_path "$HOME/.bashrc"
    add_to_path "$HOME/.zshrc"
    ;;
esac

# ============================================================
# Done
# ============================================================

say ""
say "${c_bold}${c_green}cheapcode installed.${c_reset}"
say ""
say "  bin:    $CHEAPCODE_BIN"
say "  lib:    $CHEAPCODE_LIB"
say "  config: $CHEAPCODE_CONFIG"
say ""
say "${c_bold}next steps:${c_reset}"
say "  ${c_cyan}1.${c_reset} restart your shell (or: ${c_cyan}export PATH=\"\$HOME/.cheapcode/bin:\$PATH\"${c_reset})"
say "  ${c_cyan}2.${c_reset} run ${c_cyan}cheapcode doctor${c_reset} to verify"
say "  ${c_cyan}3.${c_reset} simple flow: ${c_cyan}cheapcode web${c_reset} → browser → add providers"
say "  ${c_cyan}4.${c_reset} technical flow: ${c_cyan}cheapcode providers login openrouter${c_reset} then ${c_cyan}cheapcode accounts add${c_reset}"
say ""
