# mizan MCP integration — supplementing claudecode-opus-4.7 / codex-gpt-5.5

Per cheapcode session 2026-05-03 operator directive: mizan is the
**intuition supplement** for LLM agents. Where the LLM brings fast
associative pattern-matching (system 1), mizan brings calibrated
slow-deliberation epistemic checks (system 2): witness-counting,
ceiling-caps, bcmea-violation flagging, atom 0019 convergence-energy.

Together: Kahneman-shape calibrated reasoning. The MCP server makes
mizan invokable inline by any MCP-compatible LLM agent, cross-LLM
portable, zero-deps stdlib-only.

## Tools exposed

- `mizan_verify_claim(claim_name, plan_dir)` — verify claim's epistemic
  standing; returns confidence cap, witness count, bcmea-violation flag.
- `mizan_check_action_safety(action_description, justification_claims,
  plan_dir, min_cap?)` — pre-action gate. **Returns `blocked: true` when
  any justification claim has insufficient witnesses or fires bcmea-
  violation. Directly addresses the Cursor/Replit production-incident
  pattern (facts/27 F6) where agents acted without verification gates.**
- `mizan_physical_reality_probe(include_git?, repo_path?)` — ground
  decision boundary in wallclock + disk + git via atom 0018.
- `mizan_recommend_next_experiment(plan_dir)` — atom-0011 cheapest-
  next-move recommender via mizan-converge.

## Claude Code integration

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mizan": {
      "command": "/home/USER/apps/adam/tools/mizan/bin/mizan-mcp-server"
    }
  }
}
```

Replace `USER` with your username. After restart, mizan tools appear in
Claude Code's tool list under `mcp__mizan__*` and Claude can invoke them
inline during dispatch.

### Suggested PreToolUse hook for action-gating

For irreversible operations (Bash, Edit, Write to production paths,
git push, file delete), wire `mizan_check_action_safety` as a
`PreToolUse` hook. The LLM provides justification-claim names; mizan
returns blocked/passed verdict with explicit reasons.

This converts atom 0007 anti-fab from a documentation principle into
a runtime structural enforcement, addressing the failure mode
documented in facts/27 F6 (Replit deleted production DB + concealed
actions; Cursor deleted Railway volume + backups in 9 seconds).

## Codex integration (gpt-5.5)

OpenAI adopted MCP in March 2025 (per facts/27 — "Anthropic created the
Model Context Protocol as the open standard for AI agent-to-tool
communication, which OpenAI adopted in March 2025 and Google DeepMind
followed"). Codex wires mizan via the same MCP server entry point;
configuration syntax matches Codex's MCP server config schema.

## Why this is "perfect supplement" — what gaps mizan fills

| LLM-native gap | mizan compensation | tool |
|---|---|---|
| Over-confidence on novel claims | confidence-cap from witness-count + dampening | `mizan_verify_claim` |
| Transfer-fallacy (X applies to Y) | structural-identity check | `mizan_verify_claim` (in audit_trail.convergence) |
| bcmea-violation under-detection | absolutist-language flag | `mizan_verify_claim` (bcmea_violation field) |
| No verification gate before irreversible ops | pre-action safety gate | `mizan_check_action_safety` |
| Time/recency hallucination | wallclock probe (atom 0018) | `mizan_physical_reality_probe` |
| No substrate-grounded next-move recommendation | atom-0011 recommender | `mizan_recommend_next_experiment` |

## Substrate basis

Atoms invoked: 0007 (anti-fab via artifact), 0010 (cross-witness as
intuition), 0015 (transfer-overstated guard), 0017 (unknowns-as-positive-
data), 0018 (measure first, decide second), 0019 (convergence-without-
contact lift). Mizaj rules: M11 source-tier, M14 auth-grade ceiling,
M19 ground-physical-reality at decision boundaries.

## Calibration profile per LLM (future work)

Tier-2 future upgrade: separate dampening hyperparameters per LLM
identifier (`claude-opus-4-7` vs `codex-gpt-5-5`). Atom 0013 calibration-
as-credential applied per-LLM. Requires N=20-50 paired predicted-vs-
observed outcomes; first round should bootstrap with current shared
dampening (0.5).

## Per-cheapcode-session 2026-05-03 status

Built: zero-dep stdlib-only stdio JSON-RPC 2.0 MCP server (`mcp_server.py`).
Tested: handshake (initialize → tools/list → tools/call) returns valid
responses. mizan_verify_claim correctly fires bcmea-violation on
"uniformly" claim. mizan_check_action_safety correctly blocks simulated
Cursor-style dangerous-action with 4 explicit reasons. 53 mizan pytest
tests still pass.

Next round options: (a) wire as PreToolUse hook in cheapcode-witness
v1x synthesizer; (b) bootstrap per-LLM calibration profile via paired
N=20 dispatch test; (c) add streaming claim-extraction module for
inline verification of free-form LLM outputs.
