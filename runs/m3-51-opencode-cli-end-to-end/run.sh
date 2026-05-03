#!/usr/bin/env bash
# M3.51 — opencode CLI integration end-to-end smoke (closes M3.15)
#
# Per cheapcode session 2026-05-03 operator directive: verify cheapcode's
# features propagate properly through ALL UI consumers (CLI, TUI, web,
# desktop). Architectural claim: opencode is the BACKEND abstraction; all
# UIs inherit cheapcode integration via the AI SDK ProviderV2 contract
# at provider-load time, not at UI layer.
#
# This smoke validates the load-bearing case M3.41 said was failing:
# build-agent path (small=false) dispatch through cheapcode opencode
# CLI → OpenRouter → response.
#
# Pattern: temporary opencode.json in /tmp pointing at local cheapcode
# via file:// → opencode run with cheap-tier → expect cleanly-completed
# response, EXIT=0, no ProviderInitError.
#
# Closes the long-deferred M3.15 ProviderInitError v1.x follow-up.

set -e

CHEAPCODE_DIR="${CHEAPCODE_DIR:-$HOME/apps/cheapcode}"
SMOKE_DIR="$(mktemp -d -t cheapcode-opencode-smoke-XXXXXX)"

if ! command -v opencode >/dev/null 2>&1; then
  echo "ERROR: opencode binary not in PATH" >&2
  exit 2
fi
if [ ! -d "$CHEAPCODE_DIR" ]; then
  echo "ERROR: cheapcode dir not found at $CHEAPCODE_DIR" >&2
  exit 2
fi
if [ ! -f "$CHEAPCODE_DIR/.env" ]; then
  echo "ERROR: $CHEAPCODE_DIR/.env (with OPENROUTER_API_KEY) required" >&2
  exit 2
fi

cd "$SMOKE_DIR"
cat > opencode.json <<JSON
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "cheapcode": {
      "npm": "$CHEAPCODE_DIR",
      "name": "cheapcode tiers",
      "options": { "apiKey": "{env:OPENROUTER_API_KEY}" },
      "models": {
        "cheap": { "name": "cheap", "tools": false }
      }
    }
  }
}
JSON

# shellcheck disable=SC1091
set -a
source "$CHEAPCODE_DIR/.env"
set +a

echo "=== M3.51 opencode CLI end-to-end smoke ==="
echo "smoke dir: $SMOKE_DIR"
echo

OUTPUT=$(timeout 90 opencode run --model cheapcode/cheap "Reply with just one word: success" 2>&1)
EXIT=$?

echo "$OUTPUT"
echo
echo "EXIT=$EXIT"

# Cleanup
rm -rf "$SMOKE_DIR"

if [ "$EXIT" -eq 0 ] && echo "$OUTPUT" | grep -q "success"; then
  echo "PASS: opencode CLI dispatch through cheapcode works end-to-end."
  echo "M3.15 ProviderInitError empirically validated as RESOLVED."
  exit 0
fi

echo "FAIL: opencode CLI dispatch did not complete cleanly. Investigate."
exit 1
