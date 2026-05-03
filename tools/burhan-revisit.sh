#!/usr/bin/env bash
# tools/burhan-revisit.sh — surface branches in cheapcode's plan that need attention.
#
# Composes plan/facts/*.bn (sorted) + each top-level plan/*.bn into a tempfile
# (mirroring tools/burhan-validate.sh) and runs burhan-revisit on it.
# Detects MAIN.md drift relative to the latest snapshot per top-level.
#
# Output: runs/revisit-reports/<top>.<timestamp>.md (and -.latest.md symlink)
# Exit non-zero if --strict and any items surface.
#
# Usage:
#   tools/burhan-revisit.sh                 # all top-levels
#   tools/burhan-revisit.sh PLAN.bn         # one
#   tools/burhan-revisit.sh --strict        # exit non-zero on drift (CI gate)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$ROOT/runs/snapshots"
REPORT_DIR="$ROOT/runs/revisit-reports"
mkdir -p "$REPORT_DIR"

STRICT=0
EXPLORE_FLOOR="0.85"
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --strict) STRICT=1; shift ;;
    --explore-floor) EXPLORE_FLOOR="$2"; shift 2 ;;
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

shopt -s nullglob
FACTS=("$ROOT"/plan/facts/*.bn)
shopt -u nullglob

TAG="$(date -u +%Y%m%dT%H%M%SZ)"
EXIT_CODE=0

for top in "${TARGETS[@]}"; do
  TOP_PATH="$ROOT/plan/$top"
  if [ ! -f "$TOP_PATH" ]; then
    echo "burhan-revisit.sh: $TOP_PATH not found" >&2
    EXIT_CODE=1
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

  REPORT="$REPORT_DIR/$base.$TAG.md"
  LATEST_REPORT="$REPORT_DIR/$base.latest.md"
  BASELINE_SNAP="$SNAP_DIR/$base.latest.json"

  ARGS=(
    "$TMPFILE"
    --discharge ships --discharge cheapcode
    --explore-floor "$EXPLORE_FLOOR"
    --main "$ROOT/MAIN.md"
  )
  if [ -f "$BASELINE_SNAP" ]; then
    ARGS+=( --baseline-snapshot "$BASELINE_SNAP" )
  fi

  set +e
  PYTHONPATH="$HOME/apps/burhan/src" python3 "$HOME/apps/burhan/bin/burhan-revisit" "${ARGS[@]}" > "$REPORT" 2>/dev/null
  rc=$?
  set -e

  ln -sfn "$(basename "$REPORT")" "$LATEST_REPORT"

  # Replace tempfile path in report with original file paths (best effort).
  python3 - "$REPORT" "$TMPFILE" "$ROOT" "${FACTS[@]}" "$TOP_PATH" <<'PY'
import sys, re, hashlib
from pathlib import Path
report_path, tmpfile, root = sys.argv[1], sys.argv[2], sys.argv[3]
originals = sys.argv[4:]
text = Path(report_path).read_text(encoding="utf-8")
# Build a name → original-file index by scanning each original.
name_to_file = {}
for orig in originals:
    src = Path(orig).read_text(encoding="utf-8")
    for m in re.finditer(r"^\s*(?:claim|theorem|lemma)\s+(\w+)", src, re.MULTILINE):
        name = m.group(1)
        name_to_file.setdefault(name, orig)
# Replace `tmpfile:LINE` with original-file path (line number kept best-effort)
def fix_line(line):
    m = re.search(r"\*\*`(\w+)`\*\* — \S+:(\d+)", line)
    if m:
        name = m.group(1)
        if name in name_to_file:
            orig = name_to_file[name]
            # rewrite the entire `path:line` → `originalpath:line`
            line = re.sub(re.escape(tmpfile) + r":\d+", f"{orig}", line, count=1)
    line = line.replace(tmpfile, "<composed>")
    return line
out_lines = [fix_line(ln) for ln in text.splitlines()]
Path(report_path).write_text("\n".join(out_lines) + "\n", encoding="utf-8")
PY

  TOTAL=$(grep -c "^- \*\*" "$REPORT" 2>/dev/null || echo 0)
  if [ "$TOTAL" -gt 0 ]; then
    echo "⚠ $top — $TOTAL items surfaced → $REPORT"
    [ "$STRICT" -eq 1 ] && EXIT_CODE=1
  else
    echo "✅ $top — no items surfaced"
  fi

  rm -f "$TMPFILE"
done

exit $EXIT_CODE
