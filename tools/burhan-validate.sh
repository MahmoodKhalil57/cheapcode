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

if [ ${#FACTS[@]} -gt 0 ]; then
  cat "${FACTS[@]}" >> "$TMPFILE"
fi
cat "$ROOT"/plan/PLAN.bn >> "$TMPFILE"

PYTHONPATH="${HOME}/apps/burhan/src" python3 -m burhan.cli "$TMPFILE"
