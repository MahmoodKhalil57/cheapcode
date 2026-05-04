#!/usr/bin/env bash
# tools/burhan-validate.sh — concat plan/facts/*.bn + plan/MAIN.bn,
# validate via burhan CLI. Same pattern as cheapcode + secproj.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPFILE="$(mktemp --suffix=.bn)"
trap "rm -f $TMPFILE" EXIT

shopt -s nullglob
FACTS=("$ROOT"/plan/facts/*.bn)
TOP_LEVEL=("$ROOT"/plan/*.bn)
shopt -u nullglob

declare -i ok=0
declare -i failed=0
for top in "${TOP_LEVEL[@]}"; do
  : > "$TMPFILE"
  if [ ${#FACTS[@]} -gt 0 ]; then
    cat "${FACTS[@]}" >> "$TMPFILE"
  fi
  cat "$top" >> "$TMPFILE"
  result="$(PYTHONPATH="$ROOT/../burhan/src" python3 -m burhan.cli "$TMPFILE" 2>&1)"
  rc=$?
  basename="${top##*/}"
  if [ $rc -eq 0 ]; then
    echo "$basename: $result"
    ok=$((ok + 1))
  else
    echo "$basename: FAILED" >&2
    echo "$result" >&2
    failed=$((failed + 1))
  fi
done

echo
echo "=== mizan burhan-validate summary ==="
echo "ok:     $ok"
echo "failed: $failed"
[ $failed -eq 0 ]
