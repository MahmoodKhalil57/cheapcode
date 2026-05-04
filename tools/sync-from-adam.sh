#!/usr/bin/env bash
# sync-from-adam.sh — refresh cheapcode/packages/ from canonical ~/apps/adam/tools/
#
# Per round 96 Phase A migration architecture: cheapcode VENDORS adam's
# substrate tools (burhan, daftar, mizan, khazina, codename) so cheapcode
# can run standalone without ~/apps/adam being present. Adam stays
# CANONICAL TRUTH; cheapcode/packages/ is a periodic snapshot. Drift
# between adam and cheapcode/packages/ corrupts the substrate, so this
# script is the bidirectional governance mechanism.
#
# Usage:
#   bash tools/sync-from-adam.sh              # apply sync
#   bash tools/sync-from-adam.sh --dry-run    # show what would change
#
# Per atom 0021 (recursive-substrate-use): every sync writes a receipt
# in SYNC_RECEIPT.md tracking last-sync timestamp + adam commit hash +
# diff summary. Future operator can audit: when did cheapcode/packages/
# last refresh from adam? what changed?

set -euo pipefail

ADAM_DIR="${ADAM_DIR:-$HOME/apps/adam}"
CHEAPCODE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGETS=("burhan" "daftar" "mizan" "khazina" "codename")

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=true ;;
  esac
done

if [ ! -d "$ADAM_DIR" ]; then
  echo "ERROR: adam dir not found at $ADAM_DIR" >&2
  echo "(adam is canonical truth for substrate tools; cheapcode/packages/ is its snapshot)" >&2
  exit 2
fi

echo "=== sync-from-adam.sh ==="
echo "adam:      $ADAM_DIR"
echo "cheapcode: $CHEAPCODE_DIR/packages/"
echo "dry-run:   $DRY_RUN"
echo

ADAM_COMMIT=$(git -C "$ADAM_DIR" rev-parse HEAD 2>/dev/null || echo "(not-a-git-repo)")
ADAM_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "adam HEAD: $ADAM_COMMIT"
echo "sync ts:   $ADAM_TS"
echo

CHANGED=()
for target in "${TARGETS[@]}"; do
  src="$ADAM_DIR/tools/$target/"
  dst="$CHEAPCODE_DIR/packages/$target/"
  if [ "$target" = "khazina" ]; then
    src="$ADAM_DIR/tools/khazina/atoms/"
    dst="$CHEAPCODE_DIR/packages/khazina/atoms/"
  fi
  if [ ! -d "$src" ]; then
    echo "  SKIP $target (source missing: $src)"
    continue
  fi

  rsync_args=(
    -a
    --delete
    --exclude='__pycache__'
    --exclude='node_modules'
    --exclude='.venv'
    --exclude='downloads'
    --exclude='*.sqlite'
    --exclude='*.db'
    --exclude='*.db-shm'
    --exclude='*.db-wal'
    --itemize-changes
  )
  if $DRY_RUN; then
    rsync_args+=(--dry-run)
  fi

  diff=$(rsync "${rsync_args[@]}" "$src" "$dst" 2>&1 | grep -E '^[><ch]' || true)
  if [ -n "$diff" ]; then
    CHANGED+=("$target")
    echo "  CHANGED $target"
    echo "$diff" | sed 's/^/    /'
  else
    echo "  unchanged $target"
  fi
done

if $DRY_RUN; then
  echo
  echo "=== dry-run complete (no changes applied) ==="
  exit 0
fi

# Write SYNC_RECEIPT.md
RECEIPT="$CHEAPCODE_DIR/packages/SYNC_RECEIPT.md"
{
  echo "# cheapcode/packages/ — sync receipts"
  echo
  echo "_Auto-updated by tools/sync-from-adam.sh. Append-only._"
  echo
  if [ -f "$RECEIPT" ]; then
    # Preserve old content (skip the auto-header we'll regen)
    sed -n '/^## /,$p' "$RECEIPT"
  fi
} > "${RECEIPT}.tmp"

{
  cat "${RECEIPT}.tmp"
  echo
  echo "## $ADAM_TS"
  echo "- adam HEAD: \`$ADAM_COMMIT\`"
  if [ ${#CHANGED[@]} -gt 0 ]; then
    echo "- changed: ${CHANGED[*]}"
  else
    echo "- changed: (no targets changed)"
  fi
} > "$RECEIPT"
rm -f "${RECEIPT}.tmp"

echo
echo "=== sync complete ==="
echo "receipt: $RECEIPT"
if [ ${#CHANGED[@]} -gt 0 ]; then
  echo "changed: ${CHANGED[*]}"
else
  echo "no changes"
fi
