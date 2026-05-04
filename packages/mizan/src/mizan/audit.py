"""mizan.audit — append-only JSONL journal of mizan operations.

Atom 0007 (anti-fabrication) at the journaling layer: every lift /
decision / probe writes one line. The journal IS the artifact whose
existence is verifiable post-hoc; without the journal, mizan's
recommendations are just guesses.

Format: one record per line, each independently json-parseable
(line-delimited JSON / "JSONL"). Append-only by file-mode contract;
no API to mutate existing records.
"""

from __future__ import annotations

import json
import secrets
from dataclasses import asdict
from pathlib import Path
from typing import Iterator

from mizan.types import AuditRecord, utc_now_iso, utc_now_ms


def audit_record(
    *,
    record_type: str,
    payload: dict,
    wall_clock_ms: int | None = None,
) -> AuditRecord:
    """Build an AuditRecord with a fresh record_id + ISO timestamp.

    record_id format: "ar_<timestamp_ms>_<8_hex>" — sortable + unique
    even at sub-millisecond rate.
    """
    ts_ms = utc_now_ms()
    rid = f"ar_{ts_ms}_{secrets.token_hex(4)}"
    return AuditRecord(
        record_id=rid,
        record_type=record_type,
        measured_at=utc_now_iso(),
        wall_clock_ms=wall_clock_ms or 0,
        payload=payload,
    )


class AuditTrail:
    """JSONL append-only journal at a fixed path. Single-writer
    semantics (no in-process locking — caller is responsible for
    concurrent-write coordination if running in a multi-worker
    context)."""

    def __init__(self, path: Path | str):
        self.path = Path(path)
        # Ensure parent dir exists.
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, record: AuditRecord) -> None:
        """Append one record as a JSONL line."""
        line = json.dumps(asdict(record), ensure_ascii=False, sort_keys=True)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")

    def read(self) -> Iterator[AuditRecord]:
        """Read all records back. Each line parsed independently."""
        if not self.path.exists():
            return
        with self.path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                d = json.loads(line)
                yield AuditRecord(**d)

    def __len__(self) -> int:
        if not self.path.exists():
            return 0
        with self.path.open("r", encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())
