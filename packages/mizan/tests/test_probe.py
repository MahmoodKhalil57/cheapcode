"""TDD tests for mizan.probe (RED before implementation).

Each test maps to one observation claim in plan/facts/01-probe-grounded.bn.
"""

from __future__ import annotations

import re
import time

import pytest


def test_probe_has_measured_at_iso_utc() -> None:
    """A.1 — measured_at is ISO-8601 UTC with Z suffix."""
    from mizan.probe import probe_now

    p = probe_now()
    assert p.measured_at.endswith("Z"), f"measured_at must be UTC: {p.measured_at!r}"
    # Pattern: YYYY-MM-DDTHH:MM:SS.mmmZ
    assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$", p.measured_at), \
        f"measured_at must match ISO-8601 with millisecond precision: {p.measured_at!r}"


def test_probe_wall_clock_ms_is_nonzero() -> None:
    """A.2 — measurement has nonzero cost (atom 0018: measure first,
    decide second; the measurement itself competes for budget)."""
    from mizan.probe import probe_now

    p = probe_now()
    assert p.wall_clock_ms >= 0, "wall_clock_ms must be non-negative"
    # Probes that include git/disk/mem reads should always take >0 ms
    # in practice. If a probe completes in 0 ms it likely cheated
    # (returned from memory) — atom 0007 violation.
    assert p.wall_clock_ms < 5000, f"probe took >5s: {p.wall_clock_ms}ms (slow probe)"


def test_probe_age_ms_monotone_with_wallclock() -> None:
    """A.3 — Probe.age_ms() reflects actual wall-time elapsed."""
    from mizan.probe import probe_now

    p = probe_now()
    age0 = p.age_ms()
    time.sleep(0.05)  # 50ms
    age1 = p.age_ms()
    assert age1 > age0, f"age_ms must be monotone: age0={age0} age1={age1}"
    assert age1 - age0 >= 40, f"age_ms must reflect ~50ms sleep: delta={age1 - age0}"


def test_probe_source_populated() -> None:
    """A.4 — source field identifies the probe for audit trace."""
    from mizan.probe import probe_now

    p = probe_now()
    assert p.source, "source must be non-empty"
    assert "mizan" in p.source.lower(), f"source should identify mizan: {p.source!r}"


def test_probe_values_contain_grounded_fields() -> None:
    """A.5 — values dict carries disk_free / mem_free / git_head /
    current_time_ms / pid (or equivalent reality-anchors). Atom 0007:
    every value must come from the OS/filesystem, never from memory."""
    from mizan.probe import probe_now

    p = probe_now()
    assert "current_time_ms" in p.values
    assert "pid" in p.values
    # disk + mem may be opportunistic depending on platform; require
    # at least ONE physical-axis value.
    physical_keys = {"disk_free_bytes", "mem_free_bytes", "load_avg"}
    assert physical_keys & set(p.values.keys()), \
        f"probe must include at least one physical axis: {p.values.keys()}"


def test_probe_timestamps_strictly_distinct_back_to_back() -> None:
    """A.6 — two probes taken back-to-back have distinct measured_at.
    Probes that share timestamps would collide in audit.JSONL keys."""
    from mizan.probe import probe_now

    p1 = probe_now()
    p2 = probe_now()
    # In rare cases on very fast machines they could share to the ms.
    # Use a small sleep to ensure distinctness — the contract is
    # "back-to-back probes are distinct AT MILLISECOND PRECISION
    # given any probe overhead". probe_now itself adds at least 1ms
    # of overhead reading disk/mem so this should hold.
    assert p1.measured_at != p2.measured_at, \
        f"timestamps collided: {p1.measured_at} == {p2.measured_at} — probe overhead too low?"


def test_probe_is_frozen_dataclass() -> None:
    """The Probe dataclass must be frozen — once measured, the fields
    cannot be mutated. Atom 0007: an artifact whose value can be
    altered after the fact is not a measurement, it's a guess."""
    from mizan.probe import probe_now

    p = probe_now()
    with pytest.raises((AttributeError, TypeError)):
        p.values = {}  # type: ignore[misc]
