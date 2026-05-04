from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class Expr:
    source: str


@dataclass(slots=True)
class CitationExpr:
    lemma_name: str
    bindings: dict[str, Expr]
    source: str
    illah: Expr | None = None


Expression = Expr | CitationExpr


@dataclass(slots=True)
class Statement:
    pass


@dataclass(slots=True)
class Assume(Statement):
    predicate: Expr


@dataclass(slots=True)
class Claim(Statement):
    name: str
    type_name: str
    expr: Expression
    confidence: float | None = None
    falsifier: Expr | None = None


@dataclass(slots=True)
class Lemma(Statement):
    name: str
    kind: str
    parameters: list[str] = field(default_factory=list)
    assumption: Expr | None = None
    illah: Expr | None = None
    proves: Expression | None = None
    by: str = ""


@dataclass(slots=True)
class Program:
    statements: list[Statement]
