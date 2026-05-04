#!/usr/bin/env bash
#
# build-cheapcode.sh — produce a standalone `cheapcode` binary by applying
# our branding patches on top of pinned opencode-upstream and running its
# native bun-compile pipeline.
#
# Pattern (per cheapcode round 96, 2026-05-03 operator pivot from
# "zero-patches provider package" to "true fork with own binary"):
#   1. Verify opencode-upstream is on the expected tag with clean tree.
#   2. Apply patches/*.patch in lexical order.
#   3. Build via opencode's existing script/build.ts (uses bun build --compile).
#   4. Copy the produced standalone binary into ~/apps/cheapcode/dist/.
#   5. Restore opencode-upstream to clean tagged state on exit (always).
#
# Usage:
#   bash tools/build-cheapcode.sh                # current platform, single binary
#   bash tools/build-cheapcode.sh --all          # all platforms (linux/darwin/win, x64/arm64)
#   bash tools/build-cheapcode.sh --skip-revert  # leave upstream patched (dev/debug)
#
# The patches MUST stay branding-only. Anything semantic should land
# upstream first or live in @cheapcode/ai-sdk-provider as configuration.

set -euo pipefail

CHEAPCODE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM_DIR="${OPENCODE_UPSTREAM_DIR:-$HOME/apps/opencode-upstream}"
EXPECTED_TAG="${OPENCODE_TAG:-v1.14.33}"
PATCHES_DIR="$CHEAPCODE_DIR/patches"
DIST_DIR="$CHEAPCODE_DIR/dist"

ALL_PLATFORMS=false
SKIP_REVERT=false
for arg in "$@"; do
  case "$arg" in
    --all) ALL_PLATFORMS=true ;;
    --skip-revert) SKIP_REVERT=true ;;
    -h|--help) sed -n '2,/^set -e/p' "$0" | sed 's/^# \?//'; exit 0 ;;
  esac
done

if [ ! -d "$UPSTREAM_DIR" ]; then
  echo "ERROR: opencode-upstream not found at $UPSTREAM_DIR" >&2
  echo "Clone it first: git clone https://github.com/anomalyco/opencode.git $UPSTREAM_DIR" >&2
  exit 2
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "ERROR: bun not in PATH (build pipeline requires bun)" >&2
  exit 2
fi

# --- Phase 1: verify clean upstream at pinned tag ---
cd "$UPSTREAM_DIR"
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "ERROR: opencode-upstream tree is dirty. Refusing to build on dirty tree." >&2
  echo "       Run 'git -C $UPSTREAM_DIR checkout -- .' or commit your work first." >&2
  exit 3
fi

CURRENT_REF=$(git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD)
if [ "$CURRENT_REF" != "$EXPECTED_TAG" ] && [ "${SKIP_TAG_CHECK:-}" != "1" ]; then
  echo "WARNING: opencode-upstream is at '$CURRENT_REF', not '$EXPECTED_TAG'" >&2
  echo "         Patches were authored against $EXPECTED_TAG. Set SKIP_TAG_CHECK=1 to override." >&2
  exit 4
fi

# --- Phase 2: revert-on-exit handler (always restore upstream cleanly) ---
revert_upstream() {
  if [ "$SKIP_REVERT" = "true" ]; then
    echo "(--skip-revert: leaving upstream patched at $UPSTREAM_DIR)" >&2
    return
  fi
  git -C "$UPSTREAM_DIR" checkout -- . 2>/dev/null || true
}
trap revert_upstream EXIT

# --- Phase 3: apply branding patches ---
echo "=== applying patches from $PATCHES_DIR ==="
shopt -s nullglob
PATCH_FILES=("$PATCHES_DIR"/*.patch)
shopt -u nullglob
if [ ${#PATCH_FILES[@]} -eq 0 ]; then
  echo "ERROR: no patches in $PATCHES_DIR" >&2
  exit 5
fi
for patch in "${PATCH_FILES[@]}"; do
  echo "  applying $(basename "$patch")"
  git apply --check "$patch" || { echo "ERROR: patch failed --check" >&2; exit 6; }
  git apply "$patch"
done

# --- Phase 4: install workspace deps + build ---
echo "=== bun install (workspace) ==="
bun install --frozen-lockfile 2>&1 | tail -20 || bun install 2>&1 | tail -20

echo "=== building cheapcode binary ==="
cd "$UPSTREAM_DIR/packages/opencode"
BUILD_FLAGS=""
if [ "$ALL_PLATFORMS" = "false" ]; then
  BUILD_FLAGS="--single"
fi
bun run script/build.ts $BUILD_FLAGS

# --- Phase 5: copy artifacts to cheapcode/dist/ ---
echo "=== copying artifacts ==="
mkdir -p "$DIST_DIR"
if [ -d "$UPSTREAM_DIR/packages/opencode/dist" ]; then
  rsync -a --delete "$UPSTREAM_DIR/packages/opencode/dist/" "$DIST_DIR/"
  echo "    artifacts -> $DIST_DIR/"
fi

# --- Phase 6: smoke-test current-platform binary ---
PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
NATIVE_BIN="$DIST_DIR/cheapcode-$PLATFORM-$ARCH/bin/cheapcode"
if [ -x "$NATIVE_BIN" ]; then
  echo "=== smoke test: $NATIVE_BIN --version ==="
  "$NATIVE_BIN" --version
  echo
  echo "PASS: cheapcode binary built at $NATIVE_BIN"
else
  echo "WARNING: native binary not found at $NATIVE_BIN" >&2
  ls -la "$DIST_DIR" 2>&1 || true
fi
