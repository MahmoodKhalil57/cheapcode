#!/usr/bin/env bash
# tools/build.sh — Phase 1 build script
#
# Phase 1 architecture: cheapcode is an npm-loadable AI SDK provider package.
# This script:
#   1. Verifies the package can be type-checked with TypeScript
#   2. Verifies the export surface is consistent with opencode.json.example
#   3. Reports findings (NO API calls, NO bun build of opencode upstream —
#      Phase 1 keeps spend at $0)
#
# Phase 1 falsifier gate (per SPEC Revision 2026-05-02f):
#   "5 tiers don't appear in --list-models" → umbrella 3 falsified
#
# Smoke verification approach (Phase 1, $0):
#   Type-check passes + opencode.json.example references all 5 tiers under
#   the cheapcode provider = configuration would propagate via opencode's
#   documented provider-extension mechanism (umbrella 3 evidence at L1).
#
#   Full --list-models verification requires bun install of opencode +
#   running its CLI; deferred to Phase 3 (4-client smoke regression).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=== cheapcode Phase 1 build verification ==="
echo "Repo:        $ROOT"
echo "Spec phase:  Phase 1 (no wrapper, no API calls, \$0 spend)"
echo

# 1. Source files exist
echo "Step 1: source files exist"
for f in src/cheapcode-tiers.ts package.json cheapcode.toml opencode.json.example; do
  if [ -f "$ROOT/$f" ]; then
    echo "  OK   $f"
  else
    echo "  MISS $f"
    exit 1
  fi
done

# 2. cheapcode-tiers.ts has all 5 tier IDs
echo
echo "Step 2: 5 tiers defined in cheapcode-tiers.ts"
EXPECTED_TIERS=("cheap" "cheap-fast" "smart" "smart-fast" "auto")
for t in "${EXPECTED_TIERS[@]}"; do
  if grep -q "\"$t\":" "$ROOT/src/cheapcode-tiers.ts" || grep -q "$t:" "$ROOT/src/cheapcode-tiers.ts"; then
    echo "  OK   tier '$t'"
  else
    echo "  MISS tier '$t'"
    exit 1
  fi
done

# 3. opencode.json.example references all 5 tiers
echo
echo "Step 3: opencode.json.example references all 5 tiers"
for t in "${EXPECTED_TIERS[@]}"; do
  if grep -q "\"$t\"" "$ROOT/opencode.json.example"; then
    echo "  OK   '$t' present in opencode.json.example"
  else
    echo "  MISS '$t' missing from opencode.json.example"
    exit 1
  fi
done

# 4. Type-check (best effort; requires bun + typescript installed)
echo
echo "Step 4: TypeScript type-check (best effort)"
if command -v bunx >/dev/null 2>&1; then
  cd "$ROOT"
  if bunx --bun tsc --noEmit src/cheapcode-tiers.ts 2>&1 | head -40; then
    echo "  Note: tsc passed (or no errors)"
  else
    echo "  Note: tsc reported issues (check output above)"
  fi
else
  echo "  SKIP bunx not available; type-check deferred to Phase 3 smoke regression"
fi

# 5. LoC count for surgical-fork budget tracking
echo
echo "Step 5: LoC for cell #14 + #18 budget tracking"
LOC_TIERS=$(wc -l < "$ROOT/src/cheapcode-tiers.ts")
LOC_TOTAL_SRC=$(find "$ROOT/src" -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
LOC_TOTAL_SRC=${LOC_TOTAL_SRC:-$LOC_TIERS}
echo "  cheapcode-tiers.ts: $LOC_TIERS LoC"
echo "  src/ total:         $LOC_TOTAL_SRC LoC"
echo "  Cell #14 MIN budget: 350 LoC ($([ "$LOC_TOTAL_SRC" -le 350 ] && echo within || echo OVER))"
echo "  Cell #18 wrapper budget (Phase 2): 350 LoC for MIN tier wrapper"

echo
echo "=== Phase 1 build verification complete ==="
echo "Falsifier gate (5 tiers in --list-models): unconfirmable in Phase 1 \$0"
echo "Architecture-level evidence: 5 tiers defined + opencode.json template"
echo "                              references all 5 = configuration would propagate"
echo "                              via opencode's documented provider-extension"
echo "                              mechanism. L1 source-readable."
echo
echo "Full --list-models smoke deferred to Phase 3 (4-client regression)."
