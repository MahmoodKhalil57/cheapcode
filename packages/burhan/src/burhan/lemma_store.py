from __future__ import annotations

from dataclasses import dataclass
import re

from .ast import Expression


@dataclass(slots=True)
class LemmaRecord:
    name: str
    kind: str
    parameters: list[str]
    assumption: Expression | None
    illah: Expression | None
    proves: Expression
    by: str
    proof_cost: int


class LemmaStore:
    def __init__(self) -> None:
        self._items: dict[str, LemmaRecord] = {}

    def add(self, record: LemmaRecord) -> None:
        self._items[record.name] = record

    def get(self, name: str) -> LemmaRecord:
        try:
            return self._items[name]
        except KeyError as error:
            raise KeyError(f"Unknown lemma {name!r}") from error

    @staticmethod
    def estimate_cost(by: str) -> int:
        match = re.search(r"chain\s*\[(?P<items>.*)\]", by)
        if match:
            items = [item.strip() for item in match.group("items").split(",") if item.strip()]
            return max(1, len(items))
        return 1 if by else 0
