from __future__ import annotations

from dataclasses import dataclass, field
from typing import Generic, TypeVar


T = TypeVar("T")


@dataclass(slots=True, frozen=True)
class Receipt:
    command: str
    exit_code: int
    stdout_tail: str
    stderr_tail: str
    pytest_passed: int | None = None
    pytest_failed: int | None = None
    log_path: str | None = None
    duration_ms: int = 0
    timestamp: str = ""
    receipt_hash: str = ""


@dataclass(slots=True)
class Cell(Generic[T]):
    payload: T
    confidence: float
    derivation: list[str] = field(default_factory=list)
    assumptions: set[str] = field(default_factory=set)
    receipt: Receipt | None = None
    falsifier: str | None = None
    status: str = "live"


def make_cell(
    payload: T,
    confidence: float = 1.0,
    derivation: list[str] | None = None,
    assumptions: set[str] | None = None,
    receipt: Receipt | None = None,
    falsifier: str | None = None,
    status: str = "live",
) -> Cell[T]:
    return Cell(
        payload=payload,
        confidence=confidence,
        derivation=list(derivation or []),
        assumptions=set(assumptions or set()),
        receipt=receipt,
        falsifier=falsifier,
        status=status,
    )
