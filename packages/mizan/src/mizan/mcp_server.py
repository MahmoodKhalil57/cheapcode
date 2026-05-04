"""mizan.mcp_server — MCP (Model Context Protocol) server for mizan.

Per cheapcode session 2026-05-03 operator directive: "mizan is your
intuition; build it to supplement claudecode opus 4.7 or codex gpt 5.5
as perfectly as possible."

This module exposes mizan's runtime epistemic checks as MCP tools any
MCP-compatible LLM agent (Claude Code, Codex, Anthropic SDK apps,
OpenAI Agents) can call inline during dispatch.

Protocol: stdio JSON-RPC 2.0, MCP spec 2024-11-05. Stdlib-only
implementation per mizan's zero-deps constraint (pyproject.toml).

Tools exposed:
  - mizan_verify_claim: verify a claim's confidence cap + bcmea-violation
    flag + missing-witness recommendation against a plan directory.
  - mizan_recommend_next_experiment: surface the cheapest atom-0011
    next-move from mizan-converge audit.
  - mizan_physical_reality_probe: ground decision-boundary state via
    wallclock + disk + git probe (atom 0018).
  - mizan_check_action_safety: pre-action gate — verify justification
    claims meet confidence threshold before irreversible operations.

Atoms invoked: 0007 (anti-fab via artifact), 0010 (cross-witness as
intuition), 0017 (unknowns-as-positive-data), 0018 (measure first /
decide second), 0019 (convergence-without-contact lift).
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

from mizan.probe import probe_now
from mizan.verify import verify_claim


# ─── Tool definitions (MCP spec 2024-11-05) ──────────────────────────


_TOOLS: list[dict[str, Any]] = [
    {
        "name": "mizan_verify_claim",
        "description": (
            "Verify a claim's epistemic standing. Walks the cite chain "
            "transitively (echo-chamber upstream-tracing), counts independent "
            "fact-file witnesses, scores convergence energy, detects bcmea "
            "absolutist-language violations, and returns a recommended "
            "confidence cap. Use BEFORE asserting a claim at high confidence "
            "(>=0.85) — if the recommended cap is lower than your stated "
            "confidence, either lower the confidence or add witnesses."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "claim_name": {
                    "type": "string",
                    "description": "burhan claim identifier (e.g. cheapcode_v2_ships)",
                },
                "plan_dir": {
                    "type": "string",
                    "description": "path to plan directory containing MAIN.bn or PLAN.bn + facts/",
                },
            },
            "required": ["claim_name", "plan_dir"],
        },
    },
    {
        "name": "mizan_check_action_safety",
        "description": (
            "Pre-action epistemic gate (atom 0007 anti-fab + atom 0019 "
            "convergence). Before invoking an irreversible operation (file "
            "delete, db wipe, git push, bash with side effects), pass the "
            "list of claim names that justify the action. Returns "
            "blocked=true if any justification claim has insufficient "
            "witnesses or fires bcmea-violation. Directly addresses the "
            "Cursor/Replit production-incident pattern (facts/27 F6) where "
            "agents acted without verification gates."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "action_description": {
                    "type": "string",
                    "description": "human-readable description of the proposed action",
                },
                "justification_claims": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "list of claim names supporting this action",
                },
                "plan_dir": {
                    "type": "string",
                    "description": "path to plan directory",
                },
                "min_cap": {
                    "type": "number",
                    "description": "minimum required confidence cap (default 0.78 sub-floor)",
                },
            },
            "required": ["action_description", "justification_claims", "plan_dir"],
        },
    },
    {
        "name": "mizan_physical_reality_probe",
        "description": (
            "Ground a decision boundary in physical reality (atom 0018 — "
            "measure first, decide second). Returns wallclock UTC + repo "
            "freshness + cheap system facts as a structured Probe. Use at "
            "every consequential decision point so the LLM's claims about "
            "time / recency / 'just now' are externalized rather than "
            "hallucinated."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "include_git": {
                    "type": "boolean",
                    "description": "include git repo probe (default true)",
                },
                "repo_path": {
                    "type": "string",
                    "description": "path to git repo (default cwd)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "mizan_recommend_next_experiment",
        "description": (
            "Atom-0011 smallest-distinguishing-experiment recommender. "
            "Runs mizan-converge audit on a plan directory; returns the "
            "cheapest move that resolves the highest-leverage CAP or "
            "CONVERGE finding. Use to ask 'what's the cheapest next thing "
            "to do?' before spending on experiments."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "plan_dir": {
                    "type": "string",
                    "description": "path to plan directory",
                },
            },
            "required": ["plan_dir"],
        },
    },
]


# ─── Tool dispatch ───────────────────────────────────────────────────


def _tool_verify_claim(args: dict[str, Any]) -> dict[str, Any]:
    claim_name = args["claim_name"]
    plan_dir = Path(args["plan_dir"]).expanduser().resolve()
    if not plan_dir.is_dir():
        return {"error": f"plan_dir not a directory: {plan_dir}"}
    result = verify_claim(claim_name, plan_dir=plan_dir)
    return asdict(result)


def _tool_check_action_safety(args: dict[str, Any]) -> dict[str, Any]:
    action = args["action_description"]
    claim_names = args["justification_claims"]
    plan_dir = Path(args["plan_dir"]).expanduser().resolve()
    min_cap = float(args.get("min_cap", 0.78))

    if not plan_dir.is_dir():
        return {"error": f"plan_dir not a directory: {plan_dir}"}

    blocked = False
    block_reasons: list[str] = []
    per_claim: list[dict[str, Any]] = []
    weakest_cap = 1.0

    for cn in claim_names:
        result = verify_claim(cn, plan_dir=plan_dir)
        per_claim.append({
            "claim": cn,
            "found": result.found,
            "declared_ceiling": result.declared_ceiling,
            "recommended_cap": result.recommended_ceiling_cap,
            "bcmea_violation": result.bcmea_violation,
            "witness_count": result.witness_count,
        })
        if not result.found:
            blocked = True
            block_reasons.append(f"justification claim '{cn}' not found in plan-graph")
            continue
        if result.bcmea_violation:
            blocked = True
            block_reasons.append(
                f"claim '{cn}' fires bcmea-violation (terms: {result.bcmea_terms}); "
                "atom 0015 absolutist framing not safe for irreversible action"
            )
        if result.witness_count == 0:
            blocked = True
            block_reasons.append(
                f"claim '{cn}' has zero witnesses; action lacks evidential basis"
            )
        weakest_cap = min(weakest_cap, result.recommended_ceiling_cap or 0.0)

    if weakest_cap < min_cap:
        blocked = True
        block_reasons.append(
            f"weakest justification cap @>={weakest_cap:.3f} below required min_cap @>={min_cap:.2f}"
        )

    return {
        "blocked": blocked,
        "action_description": action,
        "weakest_justification_cap": weakest_cap,
        "min_cap_required": min_cap,
        "block_reasons": block_reasons,
        "per_claim_diagnostics": per_claim,
        "atom_0007_anti_fab_gate": "fired" if blocked else "passed",
    }


def _tool_physical_reality_probe(args: dict[str, Any]) -> dict[str, Any]:
    include_git = bool(args.get("include_git", True))
    repo = args.get("repo_path")
    repo_path = Path(repo).expanduser().resolve() if repo else None
    p = probe_now(include_git=include_git, repo=repo_path)
    return asdict(p)


def _tool_recommend_next_experiment(args: dict[str, Any]) -> dict[str, Any]:
    import subprocess

    plan_dir = Path(args["plan_dir"]).expanduser().resolve()
    if not plan_dir.is_dir():
        return {"error": f"plan_dir not a directory: {plan_dir}"}

    # __file__ = .../tools/mizan/src/mizan/mcp_server.py;
    # parents[2] = .../tools/mizan; bin/mizan-converge lives there.
    here = Path(__file__).resolve()
    converge_bin = here.parents[2] / "bin" / "mizan-converge"
    if not converge_bin.exists():
        return {"error": f"mizan-converge binary not found at {converge_bin}"}

    try:
        out = subprocess.run(
            [str(converge_bin), str(plan_dir)],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        return {"error": "mizan-converge timed out after 30s"}

    text = out.stdout

    cap_count = 0
    converge_count = 0
    next_cap = ""
    in_cap_section = False
    for line in text.splitlines():
        if line.startswith("## CAP"):
            try:
                cap_count = int(line.split("(")[1].split(")")[0])
                in_cap_section = True
            except (IndexError, ValueError):
                pass
        elif line.startswith("## CONVERGE"):
            try:
                converge_count = int(line.split("(")[1].split(")")[0])
                in_cap_section = False
            except (IndexError, ValueError):
                pass
        elif line.strip().startswith("- **`") and in_cap_section and not next_cap:
            next_cap = line.strip()
    # If no CAPs but CONVERGE candidates exist, surface the first one as
    # the next cheapest move (atom 0019 lift-application is $0 work).
    if not next_cap and converge_count > 0:
        for line in text.splitlines():
            if line.strip().startswith("### `"):
                next_cap = line.strip().lstrip("# ").strip() + " — auto-lift candidate (apply via plan-edit)"
                break

    return {
        "cap_findings": cap_count,
        "converge_findings": converge_count,
        "cheapest_next_move": next_cap or "no findings — substrate clean",
        "atom_0011_recommendation": (
            f"resolve {cap_count} CAP findings + {converge_count} CONVERGE auto-lifts at $0 "
            "before any experiment spend"
        ) if cap_count or converge_count else "substrate clean — proceed to next experiment per QUEUE.md",
        "raw_output": text,
    }


_DISPATCH: dict[str, Any] = {
    "mizan_verify_claim": _tool_verify_claim,
    "mizan_check_action_safety": _tool_check_action_safety,
    "mizan_physical_reality_probe": _tool_physical_reality_probe,
    "mizan_recommend_next_experiment": _tool_recommend_next_experiment,
}


# ─── JSON-RPC 2.0 stdio loop ─────────────────────────────────────────


def _make_response(request_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "result": result}


def _make_error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def _handle_initialize(request_id: Any, params: dict[str, Any]) -> dict[str, Any]:
    return _make_response(request_id, {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": {},
        },
        "serverInfo": {
            "name": "mizan",
            "version": "0.1.0",
        },
        "instructions": (
            "mizan provides epistemic supplements for LLM dispatch. Call "
            "mizan_verify_claim before asserting load-bearing claims; "
            "mizan_check_action_safety before irreversible operations; "
            "mizan_physical_reality_probe to ground time/recency claims; "
            "mizan_recommend_next_experiment for atom-0011 cheapest-next-move."
        ),
    })


def _handle_tools_list(request_id: Any) -> dict[str, Any]:
    return _make_response(request_id, {"tools": _TOOLS})


def _handle_tools_call(request_id: Any, params: dict[str, Any]) -> dict[str, Any]:
    name = params.get("name")
    args = params.get("arguments", {})
    if name not in _DISPATCH:
        return _make_error(request_id, -32602, f"unknown tool: {name}")
    try:
        result = _DISPATCH[name](args)
    except Exception as exc:
        return _make_error(request_id, -32603, f"tool {name} raised: {exc}")
    return _make_response(request_id, {
        "content": [
            {"type": "text", "text": json.dumps(result, default=str, sort_keys=True, indent=2)}
        ],
        "isError": False,
    })


def _handle_request(req: dict[str, Any]) -> dict[str, Any] | None:
    method = req.get("method")
    request_id = req.get("id")
    params = req.get("params", {}) or {}

    if method == "initialize":
        return _handle_initialize(request_id, params)
    if method == "initialized" or method == "notifications/initialized":
        return None
    if method == "tools/list":
        return _handle_tools_list(request_id)
    if method == "tools/call":
        return _handle_tools_call(request_id, params)
    if method == "ping":
        return _make_response(request_id, {})
    if request_id is None:
        return None
    return _make_error(request_id, -32601, f"method not found: {method}")


def serve_stdio() -> int:
    """Read newline-delimited JSON-RPC requests from stdin, write responses
    to stdout. Standard MCP stdio transport.
    """
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            req = json.loads(raw)
        except json.JSONDecodeError:
            err = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "parse error"}}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()
            continue

        response = _handle_request(req)
        if response is not None:
            sys.stdout.write(json.dumps(response, default=str) + "\n")
            sys.stdout.flush()
    return 0
