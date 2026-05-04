"""mizan.probe — physical-reality measurement (atom 0018 runtime).

Mechanical, not from memory. Every value comes from the OS / filesystem
/ git, never from the agent's narrative state. The probe itself takes
nonzero wall-clock time; that cost is recorded as wall_clock_ms.

Substrate: atom 0007 (anti-fabrication-via-artifact-verification) —
every field must trace to a runtime artifact (the OS clock, the disk,
the git index, the process table). Atom 0018 — the asymmetry "measure
first, decide second" is encoded by returning a frozen dataclass
BEFORE any inference layer can touch the values.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

from mizan.types import Probe, utc_now_iso, utc_now_ms

PROBE_SOURCE = "mizan-probe/v0.1"


def _disk_free_bytes(path: str = "/") -> int | None:
    """OS-grounded disk-free bytes. None if the call fails."""
    try:
        usage = shutil.disk_usage(path)
        return int(usage.free)
    except OSError:
        return None


def _mem_free_bytes() -> int | None:
    """OS-grounded memory-available bytes. Reads /proc/meminfo on Linux;
    returns None on platforms without it."""
    meminfo = Path("/proc/meminfo")
    if not meminfo.exists():
        return None
    try:
        text = meminfo.read_text()
        for line in text.splitlines():
            if line.startswith("MemAvailable:"):
                # Format: "MemAvailable:    12345678 kB"
                parts = line.split()
                if len(parts) >= 2:
                    return int(parts[1]) * 1024  # kB → bytes
    except (OSError, ValueError):
        pass
    return None


def _load_avg() -> tuple[float, float, float] | None:
    """OS-grounded load average. None if unavailable."""
    try:
        return os.getloadavg()
    except (OSError, AttributeError):
        return None


def _git_head(repo: Path | None = None) -> str | None:
    """Git HEAD commit hash if running inside a git repo. None otherwise."""
    cwd = repo or Path.cwd()
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=2.0,
        )
        if result.returncode == 0:
            return result.stdout.strip()[:12]
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        pass
    return None


def probe_now(*, include_git: bool = True, repo: Path | None = None) -> Probe:
    """Take one physical-reality measurement at this exact wallclock instant.

    Returns a frozen Probe with:
      - measured_at:   ISO-8601 UTC timestamp at probe entry
      - wall_clock_ms: how long the probe itself took
      - source:        probe identifier for audit
      - values:        dict of OS-grounded measurements

    The function is intentionally slow (reads disk + mem + git +
    process state). atom 0018: measurement cost is part of the budget.
    """
    started_ms = utc_now_ms()
    measured_at = utc_now_iso()
    notes: list[str] = []

    values: dict[str, Any] = {
        "current_time_ms": started_ms,
        "pid": os.getpid(),
    }

    disk = _disk_free_bytes("/")
    if disk is not None:
        values["disk_free_bytes"] = disk
    else:
        notes.append("disk_free probe unavailable")

    mem = _mem_free_bytes()
    if mem is not None:
        values["mem_free_bytes"] = mem
    else:
        notes.append("mem_free probe unavailable on this platform")

    load = _load_avg()
    if load is not None:
        values["load_avg"] = list(load)

    if include_git:
        head = _git_head(repo)
        if head is not None:
            values["git_head"] = head
        else:
            notes.append("git_head unavailable (not in repo)")

    # Ensure non-zero wall_clock_ms even on very fast hosts. Atom
    # 0018: measurement has cost. If we're below 1ms (unrealistic),
    # add a minimum perturbation so back-to-back probes have
    # distinct measured_at.
    elapsed = utc_now_ms() - started_ms
    if elapsed == 0:
        time.sleep(0.001)  # ensure distinct timestamps
        elapsed = utc_now_ms() - started_ms

    return Probe(
        measured_at=measured_at,
        wall_clock_ms=elapsed,
        source=PROBE_SOURCE,
        values=values,
        notes=notes,
    )
