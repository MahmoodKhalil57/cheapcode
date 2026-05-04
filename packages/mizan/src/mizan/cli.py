"""mizan.cli — command-line entry points."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from mizan.audit import AuditTrail, audit_record
from mizan.calibration import fit_dampening_from_outcomes
from mizan.mcp_server import serve_stdio
from mizan.probe import probe_now
from mizan.verify import verify_claim


def probe_main(argv: list[str] | None = None) -> int:
    """`mizan-probe` — emit one structured Probe as JSON to stdout."""
    ap = argparse.ArgumentParser(prog="mizan-probe")
    ap.add_argument("--no-git", action="store_true", help="skip git probe")
    ap.add_argument("--repo", type=Path, default=None)
    args = ap.parse_args(argv)

    p = probe_now(include_git=not args.no_git, repo=args.repo)
    print(json.dumps(asdict(p), default=str, sort_keys=True))
    return 0


def converge_main(argv: list[str] | None = None) -> int:
    """`mizan-converge` — wrap burhan-converge with mizan delegation.

    For now this just shells out to burhan-converge; future versions
    consume the witness list directly and apply mizan.energy.
    """
    import subprocess

    ap = argparse.ArgumentParser(prog="mizan-converge")
    ap.add_argument("plan_dir", type=Path)
    ap.add_argument("--explore-floor", type=float, default=0.85)
    ap.add_argument("--dampening", type=float, default=0.5)
    args, extra = ap.parse_known_args(argv)

    # Resolve burhan-converge: prefer Adam's vendored sibling copy,
    # then fall back to the operator's standalone install.
    here = Path(__file__).resolve()
    candidates = [
        here.parents[3] / "burhan" / "bin" / "burhan-converge",  # adam/tools/burhan
        Path.home() / "apps" / "adam" / "tools" / "burhan" / "bin" / "burhan-converge",
        Path.home() / "apps" / "burhan" / "bin" / "burhan-converge",
    ]
    burhan_converge = next((c for c in candidates if c.exists()), candidates[0])
    if not burhan_converge.exists():
        print(f"burhan-converge not found; tried: {candidates}", file=sys.stderr)
        return 2

    cmd = [
        str(burhan_converge), str(args.plan_dir),
        "--explore-floor", str(args.explore_floor),
        "--dampening", str(args.dampening),
        *extra,
    ]
    return subprocess.call(cmd)


def train_main(argv: list[str] | None = None) -> int:
    """`mizan-train` — fit dampening from a JSONL audit trail.

    Reads a JSONL file where each line is a record with payload.lift_amount
    and payload.falsifier_fired (bool). Outputs the CalibrationResult
    as JSON.
    """
    ap = argparse.ArgumentParser(prog="mizan-train")
    ap.add_argument("journal", type=Path, help="JSONL audit-trail file")
    ap.add_argument("--target-fire-rate", type=float, default=0.20)
    args = ap.parse_args(argv)

    if not args.journal.exists():
        print(f"journal not found: {args.journal}", file=sys.stderr)
        return 2

    trail = AuditTrail(args.journal)
    observations: list[tuple[float, bool]] = []
    for rec in trail.read():
        if rec.record_type != "lift":
            continue
        lift = rec.payload.get("lift_amount")
        fired = rec.payload.get("falsifier_fired")
        if lift is None or fired is None:
            continue
        observations.append((float(lift), bool(fired)))

    result = fit_dampening_from_outcomes(observations, target_fire_rate=args.target_fire_rate)
    print(json.dumps(asdict(result), sort_keys=True))
    return 0


def verify_main(argv: list[str] | None = None) -> int:
    """`mizan-verify` — runtime-callable claim verifier.

    Parses a plan directory, locates a claim by name, walks its
    cite chain to identify witness fact-files, scores convergence,
    and emits JSON with the recommended confidence cap + bcmea-
    violation flag + witness count + audit trail.

    Use case: cheapcode-witness synthesizer (and any LLM dispatch
    runtime) calls this inline to ask "is this claim sufficiently
    witnessed at this confidence?" before composing it into output.
    """
    ap = argparse.ArgumentParser(prog="mizan-verify")
    ap.add_argument("claim_name", help="claim identifier to verify")
    ap.add_argument(
        "--plan-dir",
        type=Path,
        required=True,
        help="path to plan directory (contains MAIN.bn or PLAN.bn + facts/)",
    )
    ap.add_argument("--dampening", type=float, default=0.5)
    ap.add_argument("--auth-ceiling-cap", type=float, default=0.95)
    args = ap.parse_args(argv)

    if not args.plan_dir.is_dir():
        print(f"plan-dir not a directory: {args.plan_dir}", file=sys.stderr)
        return 2

    result = verify_claim(
        args.claim_name,
        plan_dir=args.plan_dir,
        dampening=args.dampening,
        auth_ceiling_cap=args.auth_ceiling_cap,
    )
    print(json.dumps(asdict(result), default=str, sort_keys=True, indent=2))
    return 0 if result.found else 1


def mcp_server_main(argv: list[str] | None = None) -> int:
    """`mizan-mcp-server` — stdio MCP server exposing mizan tools.

    Per cheapcode session 2026-05-03 operator directive: mizan as
    intuition-supplement for claudecode-opus-4.7 / codex-gpt-5.5 via
    standard MCP protocol. Cross-LLM portable; zero deps; stdlib-only.

    Usage: register in MCP-compatible client. For Claude Code:
      Add to ~/.claude/settings.json:
        {
          "mcpServers": {
            "mizan": {
              "command": "/home/USER/apps/adam/tools/mizan/bin/mizan-mcp-server"
            }
          }
        }
    """
    ap = argparse.ArgumentParser(prog="mizan-mcp-server")
    ap.parse_args(argv)
    return serve_stdio()


if __name__ == "__main__":
    raise SystemExit(probe_main())
