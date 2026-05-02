#!/usr/bin/env bash
# tools/burhan-validate.sh
#
# Concatenate plan/facts/*.bn (sorted) + plan/PLAN.bn for burhan validation.
# Burhan's CLI takes a single file; we externalize supporting facts as
# separate .bn files to keep PLAN.bn focused without losing the citation chain.
#
# Substrate: mizaj rule 11 (tier-the-source-before-citing) governs which
# fact files we'll add. Each fact file is scoped to one credibility tier
# or one source class.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPFILE="$(mktemp --suffix=.bn)"
trap "rm -f $TMPFILE" EXIT

shopt -s nullglob
FACTS=("$ROOT"/plan/facts/*.bn)
shopt -u nullglob

shopt -s nullglob
TOP_LEVEL=("$ROOT"/plan/*.bn)
shopt -u nullglob

# Validate each top-level .bn (PLAN.bn, MAIN.bn, etc) concatenated with
# the shared facts. Each top-level file is its own composition and is
# expected to validate True against the facts.
declare -i ok=0
declare -i failed=0
for top in "${TOP_LEVEL[@]}"; do
  : > "$TMPFILE"
  if [ ${#FACTS[@]} -gt 0 ]; then
    cat "${FACTS[@]}" >> "$TMPFILE"
  fi
  cat "$top" >> "$TMPFILE"
  result="$(PYTHONPATH="${HOME}/apps/burhan/src" python3 -m burhan.cli "$TMPFILE" 2>&1)"
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
echo "=== burhan-validate summary ==="
echo "ok:     $ok"
echo "failed: $failed"
[ $failed -eq 0 ]
