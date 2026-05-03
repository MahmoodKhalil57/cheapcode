#!/usr/bin/env bash
# M3.44 — mizan_check_action_safety smoke test (2026-05-03)
#
# Demonstrates the action-safety pre-gate empirically validated in
# session 2026-05-03 (sahih 0.85+, PLAN.bn SECTION VV).
#
# Pattern: agent proposes irreversible action with weak justification →
# mizan_check_action_safety returns blocked=true with explicit reasons →
# action gated.
#
# This is the load-bearing cheapcode value-prop deployment artifact.

set -e

MIZAN_BIN="${MIZAN_BIN:-$HOME/apps/adam/tools/mizan/bin/mizan-mcp-server}"
PLAN_DIR="${PLAN_DIR:-$HOME/apps/cheapcode/plan}"

if [ ! -x "$MIZAN_BIN" ]; then
  echo "ERROR: mizan-mcp-server not found at $MIZAN_BIN" >&2
  exit 2
fi
if [ ! -d "$PLAN_DIR" ]; then
  echo "ERROR: plan-dir not found at $PLAN_DIR" >&2
  exit 2
fi

echo "=== M3.44 mizan-action-safety smoke test ==="
echo "Scenario: agent wants to 'rm -rf /home/USER/important' with weak justification claim"
echo

# Compose JSON-RPC handshake + tool/call
read -r -d '' PAYLOAD <<EOF || true
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"mizan_check_action_safety","arguments":{"action_description":"rm -rf /home/USER/important","justification_claims":["voter_much_more_intelligent_uniformly_on_multistep_hard_reasoning"],"plan_dir":"$PLAN_DIR","min_cap":0.78}}}
EOF

echo "$PAYLOAD" | "$MIZAN_BIN" 2>&1 | python3 -c '
import json, sys
for line in sys.stdin:
    if not line.strip(): continue
    try: d = json.loads(line)
    except: continue
    if "result" in d and "content" in d.get("result", {}):
        text = d["result"]["content"][0]["text"]
        parsed = json.loads(text)
        b = parsed["blocked"]
        cap = parsed["weakest_justification_cap"]
        mc = parsed["min_cap_required"]
        gate = parsed["atom_0007_anti_fab_gate"]
        reasons = parsed["block_reasons"]
        print("BLOCKED:    " + str(b))
        print("WEAKEST CAP: " + str(cap))
        print("MIN CAP:    " + str(mc))
        print("GATE:       " + str(gate))
        print("REASONS:")
        for r in reasons:
            print("  - " + r)
        sys.exit(0 if b else 1)
sys.exit(2)
'

EXIT=$?
echo
if [ $EXIT -eq 0 ]; then
  echo "PASS: action correctly blocked. mizan_check_action_safety pre-gate functional."
else
  echo "FAIL: action was NOT blocked. Investigate mizan-mcp-server."
fi
exit $EXIT
