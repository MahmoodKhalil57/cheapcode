"""TDD tests for mizan.audit."""

from __future__ import annotations

import json
from pathlib import Path


def test_audit_append_writes_jsonl_line(tmp_path: Path) -> None:
    """A.1 — append() writes one JSONL line."""
    from mizan.audit import AuditTrail, audit_record

    journal = tmp_path / "journal.jsonl"
    trail = AuditTrail(journal)
    rec = audit_record(record_type="lift", payload={"claim": "x", "lift": 0.05})
    trail.append(rec)
    assert journal.exists()
    lines = journal.read_text().splitlines()
    assert len(lines) == 1


def test_audit_record_has_required_fields() -> None:
    """A.2 — every record has record_id, record_type, measured_at,
    wall_clock_ms, payload."""
    from mizan.audit import audit_record

    rec = audit_record(record_type="probe", payload={})
    assert rec.record_id
    assert rec.record_type == "probe"
    assert rec.measured_at  # ISO timestamp
    assert rec.wall_clock_ms >= 0
    assert isinstance(rec.payload, dict)


def test_audit_append_only_two_records(tmp_path: Path) -> None:
    """A.3 — appending TWO records produces TWO lines."""
    from mizan.audit import AuditTrail, audit_record

    journal = tmp_path / "j.jsonl"
    t = AuditTrail(journal)
    t.append(audit_record(record_type="lift", payload={"k": 1}))
    t.append(audit_record(record_type="lift", payload={"k": 2}))
    lines = journal.read_text().splitlines()
    assert len(lines) == 2


def test_audit_jsonl_each_line_parseable(tmp_path: Path) -> None:
    """A.4 — every line is json-parseable independently."""
    from mizan.audit import AuditTrail, audit_record

    journal = tmp_path / "j.jsonl"
    t = AuditTrail(journal)
    for i in range(3):
        t.append(audit_record(record_type="lift", payload={"i": i}))
    for line in journal.read_text().splitlines():
        d = json.loads(line)
        assert "record_id" in d
        assert "record_type" in d
        assert "measured_at" in d


def test_audit_read_back_returns_records(tmp_path: Path) -> None:
    """The journal can be read back into AuditRecord objects."""
    from mizan.audit import AuditTrail, audit_record

    journal = tmp_path / "j.jsonl"
    t = AuditTrail(journal)
    t.append(audit_record(record_type="lift", payload={"x": 1}))
    t.append(audit_record(record_type="cap", payload={"y": 2}))

    records = list(t.read())
    assert len(records) == 2
    assert records[0].record_type == "lift"
    assert records[1].record_type == "cap"


def test_audit_record_id_unique() -> None:
    """Every record_id is unique even when records are created
    in rapid succession (sub-millisecond)."""
    from mizan.audit import audit_record

    seen = set()
    for _ in range(100):
        r = audit_record(record_type="probe", payload={})
        assert r.record_id not in seen, f"collision on {r.record_id}"
        seen.add(r.record_id)
