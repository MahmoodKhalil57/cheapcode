#!/usr/bin/env bash
# tools/burhan-plateau.sh — surface plateau-flagged claims for mizaj 17
#                          (apply-byproducts-when-method-plateaus).
#
# Per khazina atom 0017 (unknowns-as-positive-data-recursion), a load-bearing
# claim is "plateaued" when:
#   - confidence is sub-floor (< 0.85 or --explore-floor)
#   - confidence has not moved across the last N snapshots (default N=3)
#   - the claim is in the cite-closure of a discharge claim (load-bearing)
#
# When plateau-flagged claims surface, the prescribed move is the M17 cycle:
#   1. Inventory the byproducts (failed runs, daif outputs, per-task variance,
#      timeouts, residue from prior experiments)
#   2. Look for shape (cluster patterns the original metric averaged over)
#   3. Lift the inferred shape to a falsifier-bearing claim
#   4. Re-estimate; recurse if plateau again
#
# Output: runs/plateau-reports/<top>.<timestamp>.md (and -.latest.md symlink)
#
# Usage:
#   tools/burhan-plateau.sh                  # all top-levels, N=3
#   tools/burhan-plateau.sh --window 5       # require N=5 unchanged snapshots
#   tools/burhan-plateau.sh --explore-floor 0.85
#   tools/burhan-plateau.sh --strict         # exit non-zero if any plateau-flagged

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP_DIR="$ROOT/runs/snapshots"
REPORT_DIR="$ROOT/runs/plateau-reports"
mkdir -p "$REPORT_DIR"

WINDOW=3
EXPLORE_FLOOR="0.85"
STRICT=0
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --window) WINDOW="$2"; shift 2 ;;
    --explore-floor) EXPLORE_FLOOR="$2"; shift 2 ;;
    --strict) STRICT=1; shift ;;
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

TAG="$(date -u +%Y%m%dT%H%M%SZ)"
EXIT_CODE=0

for top in "${TARGETS[@]}"; do
  base="${top%.bn}"
  REPORT="$REPORT_DIR/$base.$TAG.md"
  LATEST_REPORT="$REPORT_DIR/$base.latest.md"

  python3 - "$base" "$SNAP_DIR" "$WINDOW" "$EXPLORE_FLOOR" "$REPORT" <<'PY'
import json, sys, glob, os, re
from pathlib import Path

base, snap_dir, window, floor, report_path = sys.argv[1:6]
window = int(window)
floor = float(floor)

# Collect snapshots in chronological order (newest last).
pattern = os.path.join(snap_dir, f"{base}.*.json")
snaps = sorted(p for p in glob.glob(pattern) if not p.endswith(".latest.json"))

if len(snaps) < window:
    Path(report_path).write_text(
        f"# burhan-plateau — {base}\n\n"
        f"Insufficient snapshot history: need ≥{window}, have {len(snaps)}.\n"
        f"Run `tools/burhan-snapshot.sh` after each plan-graph change to build history.\n",
        encoding="utf-8",
    )
    sys.exit(0)

# Take last N snapshots (most recent).
recent = snaps[-window:]
data = []
for s in recent:
    with open(s) as f:
        data.append(json.load(f))

# Compute load-bearing set: claims in cite-closure of discharges.
latest = data[-1]
claims = latest["claims"]

def cites(name):
    info = claims.get(name, {})
    return info.get("derivation", []) or []

def discharges():
    out = set()
    for n, info in claims.items():
        # Heuristic: a discharge claim cites a theorem; theorems show up as
        # citations. For our purposes, treat any claim with @<floor that's
        # cited by another claim as load-bearing.
        for d in cites(n):
            out.add(d)
    return out

# Build claim → set-of-claims-citing-it
cited_by = {}
for n, info in claims.items():
    for d in cites(n):
        cited_by.setdefault(d, set()).add(n)

# Plateau detection: claim is sub-floor in latest AND unchanged across window.
def confidence(snap, name):
    return snap["claims"].get(name, {}).get("confidence", None)

plateau = []
for name, info in claims.items():
    c = info.get("confidence", 0)
    if c >= floor:
        continue
    # Check confidence stability across window
    series = [confidence(d, name) for d in data]
    if any(c is None for c in series):
        continue  # missing in some snapshot — not plateaued, just new
    if max(series) - min(series) > 0.001:
        continue  # has moved
    # Has it been experimented on? Heuristic: it's load-bearing AND
    # there's at least one related run/ artifact mentioning the claim name.
    is_loadbearing = name in cited_by or name.startswith("cheapcode_") or name.startswith("route_") or name.startswith("voter_")
    if not is_loadbearing:
        continue
    plateau.append((name, c, len(cited_by.get(name, []))))

plateau.sort(key=lambda x: x[1])

# Write report
lines = [f"# burhan-plateau — {base}\n"]
lines.append(f"**Window:** last {window} snapshots\n")
lines.append(f"**Explore floor:** {floor}\n")
lines.append(f"**Plateau-flagged:** {len(plateau)}\n\n")

if plateau:
    lines.append("## Plateau-flagged load-bearing claims\n")
    lines.append("Per mizaj 17 + khazīna atom 0017, these are candidates for the unknowns-as-positive-data cycle:\n")
    lines.append("1. **Inventory** the byproducts (failed runs, per-task variance, daif outputs, timeouts) related to the claim.")
    lines.append("2. **Look for shape** in clusters the original metric averaged over.")
    lines.append("3. **Lift** the inferred shape to a falsifier-bearing claim (mizaj 01).")
    lines.append("4. **Re-estimate**; recurse if plateau again.\n")
    lines.append("| Claim | Confidence | Citing claims |")
    lines.append("|---|---|---|")
    for name, c, n_citers in plateau:
        lines.append(f"| `{name}` | @{c:.2f} | {n_citers} |")
    lines.append("")
else:
    lines.append("✅ No plateau-flagged load-bearing claims.\n")
    lines.append("Either no sub-floor claims are stable across the window, or claims are moving.\n")

Path(report_path).write_text("\n".join(lines) + "\n", encoding="utf-8")

# Print summary line for shell
if plateau:
    print(f"⚠ {base} — {len(plateau)} plateau-flagged → {report_path}")
    sys.exit(2 if "${STRICT}" == "1" else 0)
else:
    print(f"✅ {base} — no plateau-flagged claims")
PY
  rc=$?

  ln -sfn "$(basename "$REPORT")" "$LATEST_REPORT"

  if [ "$rc" -eq 2 ] && [ "$STRICT" -eq 1 ]; then
    EXIT_CODE=1
  fi
done

exit $EXIT_CODE
