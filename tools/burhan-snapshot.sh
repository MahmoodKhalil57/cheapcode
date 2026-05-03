#!/usr/bin/env bash
# tools/burhan-snapshot.sh — wrap burhan-snapshot for the cheapcode plan layout.
#
# Composes plan/facts/*.bn (sorted) + each top-level plan/*.bn into a tempfile
# and runs burhan-snapshot on it. Mirrors the composition rule from
# tools/burhan-validate.sh — each top-level is its own snapshot since
# top-levels have independent theorem namespaces.
#
# Output: runs/snapshots/<top>.<timestamp>.json
# Also writes a "latest" symlink: runs/snapshots/<top>.latest.json
#
# Usage:
#   tools/burhan-snapshot.sh                       # snapshot all top-levels
#   tools/burhan-snapshot.sh PLAN.bn               # snapshot one top-level
#
# Flags:
#   --tag <name>   tag for the snapshot filename (default: timestamp)
#   --quiet        suppress per-claim summary output

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$ROOT/runs/snapshots"
mkdir -p "$SNAP_DIR"

TAG=""
USER_TAG=0
QUIET=0
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="$2"; USER_TAG=1; shift 2 ;;
    --quiet) QUIET=1; shift ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^#\s\?//'
      exit 0
      ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done

if [ "${#TARGETS[@]}" -eq 0 ]; then
  shopt -s nullglob
  for f in "$ROOT"/plan/*.bn; do
    TARGETS+=("$(basename "$f")")
  done
  shopt -u nullglob
fi

if [ -z "$TAG" ]; then
  TAG="$(date -u +%Y%m%dT%H%M%SZ)"
fi

shopt -s nullglob
FACTS=("$ROOT"/plan/facts/*.bn)
shopt -u nullglob

declare -i ok=0
declare -i failed=0
for top in "${TARGETS[@]}"; do
  TOP_PATH="$ROOT/plan/$top"
  if [ ! -f "$TOP_PATH" ]; then
    echo "burhan-snapshot.sh: top-level $TOP_PATH not found" >&2
    failed=$((failed + 1))
    continue
  fi
  base="${top%.bn}"
  TMPFILE="$(mktemp --suffix=.bn)"
  trap "rm -f $TMPFILE" EXIT
  : > "$TMPFILE"
  if [ ${#FACTS[@]} -gt 0 ]; then
    cat "${FACTS[@]}" >> "$TMPFILE"
  fi
  cat "$TOP_PATH" >> "$TMPFILE"

  OUT="$SNAP_DIR/$base.$TAG.json"
  LATEST="$SNAP_DIR/$base.latest.json"

  if PYTHONPATH="$HOME/apps/burhan/src" python3 "$HOME/apps/burhan/bin/burhan-snapshot" \
        "$TMPFILE" \
        --track "$ROOT/MAIN.md" \
        --discharge ships --discharge v1 --discharge cheapcode \
        -o "$OUT" \
        $([ "$QUIET" -eq 1 ] && echo "" || true) >/dev/null; then
    # rewrite source paths to point to the original files, not the tempfile
    python3 - "$OUT" "$TMPFILE" "$ROOT" "${FACTS[@]}" "$TOP_PATH" <<'PY'
import json, sys
out_path, tmpfile, root = sys.argv[1], sys.argv[2], sys.argv[3]
originals = sys.argv[4:]
data = json.load(open(out_path))
# Replace the single-tempfile source with the originals.
data["sources"] = []
for orig in originals:
    import hashlib, pathlib
    p = pathlib.Path(orig)
    data["sources"].append({"path": str(p), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()})
# Rewrite per-claim file paths if they point to the tempfile (they will, by line)
# Best-effort: find the original file each claim was defined in by scanning source lines.
def find_owner(name, originals):
    for orig in originals:
        with open(orig) as f:
            for i, line in enumerate(f, 1):
                stripped = line.strip()
                if stripped.startswith(f"claim {name}") or \
                   stripped.startswith(f"theorem {name}") or \
                   stripped.startswith(f"lemma {name}"):
                    return orig, i
    return None, 0
for cname, info in data["claims"].items():
    if info.get("file") and info["file"].endswith(tmpfile.lstrip("/")):
        owner, line = find_owner(cname, originals)
        if owner:
            info["file"] = owner
            info["line"] = line
json.dump(data, open(out_path, "w"), indent=2, sort_keys=True)
PY
    # Only update the canonical `latest` symlink for un-tagged (refresh) runs.
    # Named --tag invocations are for testing/named-snapshots; they must not
    # clobber the baseline that burhan-diff and burhan-revisit consume.
    if [ "$USER_TAG" -eq 0 ]; then
      ln -sfn "$(basename "$OUT")" "$LATEST"
      [ "$QUIET" -eq 0 ] && echo "✅ $top → $OUT (linked: $LATEST)"
    else
      [ "$QUIET" -eq 0 ] && echo "✅ $top → $OUT (tagged; latest symlink not updated)"
    fi
    ok=$((ok + 1))
  else
    echo "❌ $top — snapshot failed" >&2
    failed=$((failed + 1))
  fi
  rm -f "$TMPFILE"
done

[ "$QUIET" -eq 0 ] && echo
[ "$QUIET" -eq 0 ] && echo "=== burhan-snapshot summary: ok=$ok failed=$failed ==="
[ $failed -eq 0 ]
