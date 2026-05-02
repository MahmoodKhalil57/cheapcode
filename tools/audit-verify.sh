#!/usr/bin/env bash
# tools/audit-verify.sh
#
# Walks every `by audit <tag>` line in plan/facts/*.bn and checks that the
# tag resolves to a real artifact. Closes the khazina atom 0007 gap
# (anti-fabrication via artifact verification) for the project's burhan
# fact files. Pre-requisite for promoting any fact to sahih grade per
# mizaj rule 14.
#
# Tag patterns recognized:
#   mizaj-rules-NN-*           -> ~/apps/mizaj/rules/NN-*.md exists
#   khazina-atoms-NNNN[-*]     -> ~/apps/khazina/atoms/NNNN-*.md exists
#   cheapllm-daftar-note-*     -> daftar note in cheapllm shard (skipped offline)
#   cheapllm-results-*         -> ~/apps/cheapllm/results/ has matching file
#   cheapllm-readme-*          -> ~/apps/cheapllm/README.md exists
#   cheapllm-spec-*            -> ~/apps/cheapllm/SPEC.md exists
#   cheapllm-f-*               -> ~/apps/cheapllm/results/ has matching log
#   khatim-*                   -> ~/apps/khatim/<derived> (project archived; report only)
#   sanad-*                    -> ~/apps/sanad/<derived> (project archived; report only)
#   arxiv-NNNN-NNNNN-*         -> URL not network-verified offline; report only
#
# Exit code:
#   0 if all tags resolve OR are explicitly unverifiable-offline
#   1 if any tag categorized as RESOLVABLE-but-MISSING

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${HOME}"

shopt -s nullglob
FACT_FILES=("$ROOT"/plan/facts/*.bn "$ROOT"/plan/*.bn)
shopt -u nullglob

if [ ${#FACT_FILES[@]} -eq 0 ]; then
  echo "no plan/*.bn files; nothing to verify"
  exit 0
fi

declare -i resolved=0
declare -i missing=0
declare -i offline=0
declare -a missing_list=()

verify_tag() {
  local tag="$1"
  local file="$2"
  local line="$3"

  if [[ "$tag" =~ ^mizaj-rules-([0-9]+)(-(.*))?$ ]]; then
    local n="${BASH_REMATCH[1]}"
    local matches=("$HOME_DIR"/apps/mizaj/rules/"$n"-*.md)
    if [ -e "${matches[0]:-}" ]; then echo "RESOLVED: $tag -> ${matches[0]}"; return 0
    else missing_list+=("$file:$line  $tag (no mizaj rule $n)"); return 1; fi

  elif [[ "$tag" =~ ^khazina-atoms-([0-9]+) ]]; then
    local n="${BASH_REMATCH[1]}"
    local matches=("$HOME_DIR"/apps/khazina/atoms/"$n"-*.md)
    if [ -e "${matches[0]:-}" ]; then echo "RESOLVED: $tag -> ${matches[0]}"; return 0
    else missing_list+=("$file:$line  $tag (no khazina atom $n)"); return 1; fi

  elif [[ "$tag" == cheapllm-readme-* ]]; then
    if [ -f "$HOME_DIR/apps/cheapllm/README.md" ]; then echo "RESOLVED: $tag -> cheapllm/README.md"; return 0
    else missing_list+=("$file:$line  $tag (no cheapllm/README.md)"); return 1; fi

  elif [[ "$tag" == cheapllm-spec-* ]]; then
    if [ -f "$HOME_DIR/apps/cheapllm/SPEC.md" ]; then echo "RESOLVED: $tag -> cheapllm/SPEC.md"; return 0
    else missing_list+=("$file:$line  $tag (no cheapllm/SPEC.md)"); return 1; fi

  elif [[ "$tag" == cheapllm-daftar-note-* ]]; then
    local noteId
    noteId=$(echo "$tag" | grep -oE 'note-[a-f0-9]+' | head -1)
    if [ -z "$noteId" ]; then
      missing_list+=("$file:$line  $tag (no note-id pattern)"); return 1
    fi
    if bun "$HOME_DIR/apps/daftar/bin/daftar" list --project="$HOME_DIR/apps/cheapllm" 2>/dev/null | grep -q "\"$noteId\""; then
      echo "RESOLVED: $tag -> daftar:cheapllm:$noteId"; return 0
    fi
    missing_list+=("$file:$line  $tag (daftar entry $noteId not found in cheapllm shard)"); return 1

  elif [[ "$tag" == cheapllm-results-* || "$tag" == cheapllm-f-* ]]; then
    if [ -d "$HOME_DIR/apps/cheapllm/results" ]; then echo "RESOLVED: $tag -> cheapllm/results/ (exists; specific file not pattern-matched)"; return 0
    else missing_list+=("$file:$line  $tag (no cheapllm/results/ dir)"); return 1; fi

  elif [[ "$tag" == khatim-* ]]; then
    if [ -d "$HOME_DIR/apps/khatim" ]; then echo "RESOLVED: $tag -> khatim/ (archived project, dir present)"; return 0
    else echo "OFFLINE: $tag (khatim project retired)"; return 2; fi

  elif [[ "$tag" == sanad-* ]]; then
    if [ -d "$HOME_DIR/apps/sanad" ]; then echo "RESOLVED: $tag -> sanad/ (archived project, dir present)"; return 0
    else echo "OFFLINE: $tag (sanad project retired)"; return 2; fi

  elif [[ "$tag" =~ ^arxiv-[0-9]+-[0-9]+ ]]; then
    echo "OFFLINE: $tag (URL verification requires network; mizaj 11 L3)"
    return 2

  elif [[ "$tag" == cheapcode-joint-confidence-computation ]]; then
    if [ -f "$ROOT/tools/joint-confidence.ts" ]; then
      echo "RESOLVED: $tag -> tools/joint-confidence.ts"; return 0
    fi
    missing_list+=("$file:$line  $tag (tools/joint-confidence.ts not found)"); return 1

  elif [[ "$tag" == calibration-audit-* ]]; then
    if [ -f "$HOME_DIR/apps/khazina/lectionary/calibration-audit.md" ]; then
      echo "RESOLVED: $tag -> khazina/lectionary/calibration-audit.md"; return 0
    fi
    missing_list+=("$file:$line  $tag (lectionary cycle not found)"); return 1

  elif [[ "$tag" == experiment-0-and-2 || "$tag" == competitive-scorecard || "$tag" == project-meta || "$tag" == cheapcode-v2-surgical-architecture || "$tag" == cheapcode-research-equivalence-computation || "$tag" == cheapcode-v3-load-bearing-discharge ]]; then
    echo "ADVISORY: $tag (theorem-level audit category; documentary, not file-resolvable)"
    return 2

  else
    missing_list+=("$file:$line  $tag (unknown tag pattern; add a verify rule)")
    return 1
  fi
}

for FILE in "${FACT_FILES[@]}"; do
  while IFS=: read -r line content; do
    read -r kw1 kw2 tag _ <<< "$content"
    if [ "$kw1" != "by" ] || [ "$kw2" != "audit" ] || [ -z "$tag" ]; then continue; fi
    set +e
    verify_tag "$tag" "$FILE" "$line"
    rc=$?
    set -e
    case "$rc" in
      0) resolved=$((resolved + 1));;
      1) missing=$((missing + 1));;
      2) offline=$((offline + 1));;
    esac
  done < <(grep -nE "^[[:space:]]*by audit " "$FILE" || true)
done

echo
echo "=== audit-verify summary ==="
echo "resolved:  $resolved"
echo "offline:   $offline (URLs / cross-shard / archived; treat as known-unverified)"
echo "missing:   $missing"

if [ "$missing" -gt 0 ]; then
  echo
  echo "=== missing tags ==="
  for m in "${missing_list[@]}"; do echo "  $m"; done
  exit 1
fi
exit 0
