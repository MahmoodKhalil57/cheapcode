from __future__ import annotations

import ast as pyast
import re

from .ast import Assume, CitationExpr, Claim, Expr, Lemma, Program
from .lexer import strip_comment


CLAIM_RE = re.compile(
    r"^claim\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?P<type>[^=@]+?)\s*(?P<conf>@>=\d+(?:\.\d+)?)?\s*=\s*(?P<expr>.+)$"
)
LEMMA_RE = re.compile(
    r"^(?P<kind>lemma|theorem)\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)(?:\((?P<params>.*)\))?$"
)
def _parse_expr(source: str) -> Expr | CitationExpr:
    text = source.strip()
    if not text:
        raise SyntaxError("Expected expression")
    if text.startswith("cite "):
        return _parse_citation_expr(text)
    try:
        pyast.parse(text, mode="eval")
    except SyntaxError as error:
        raise SyntaxError(f"Invalid expression {text!r}: {error.msg}") from error
    return Expr(text)


def _parse_plain_expr(source: str) -> Expr:
    expr = _parse_expr(source)
    if isinstance(expr, CitationExpr):
        raise SyntaxError("cite is not allowed in this clause")
    return expr


def _parse_citation_expr(text: str) -> CitationExpr:
    cite_body = text[len("cite ") :].strip()
    if not cite_body:
        raise SyntaxError("Expected lemma name after cite")
    lemma_name, _, remainder = cite_body.partition(" ")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", lemma_name):
        raise SyntaxError(f"Invalid lemma name in citation: {lemma_name}")

    remainder = remainder.strip()
    raw_bindings = None
    illah = None

    if remainder:
        if remainder.startswith("with "):
            bindings_text = remainder[len("with ") :]
            split_at = bindings_text.find(" because illah = ")
            if split_at >= 0:
                raw_bindings = bindings_text[:split_at].strip()
                illah_text = bindings_text[split_at + len(" because illah = ") :].strip()
                if not illah_text:
                    raise SyntaxError("Expected expression after because illah =")
                illah = Expr(illah_text)
            else:
                raw_bindings = bindings_text.strip()
        elif remainder.startswith("because illah = "):
            illah_text = remainder[len("because illah = ") :]
            split_at = illah_text.find(" with ")
            if split_at >= 0:
                raw_illah = illah_text[:split_at].strip()
                raw_bindings = illah_text[split_at + len(" with ") :].strip()
            else:
                raw_illah = illah_text.strip()
            if not raw_illah:
                raise SyntaxError("Expected expression after because illah =")
            illah = Expr(raw_illah)
        else:
            raise SyntaxError(f"Invalid citation clause: {remainder}")

    bindings: dict[str, Expr] = {}
    if raw_bindings:
        for binding in _split_csv(raw_bindings):
            name, sep, expr_text = binding.partition("=")
            if sep != "=":
                raise SyntaxError(f"Invalid binding: {binding}")
            bindings[name.strip()] = Expr(expr_text.strip())

    return CitationExpr(lemma_name=lemma_name, bindings=bindings, source=text, illah=illah)


def _split_csv(value: str) -> list[str]:
    items: list[str] = []
    current: list[str] = []
    depth = 0
    in_string = False
    quote = ""
    escaped = False
    for char in value:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\":
            current.append(char)
            escaped = True
            continue
        if in_string:
            current.append(char)
            if char == quote:
                in_string = False
            continue
        if char in ('"', "'"):
            current.append(char)
            in_string = True
            quote = char
            continue
        if char in "([":
            depth += 1
        elif char in ")]":
            depth -= 1
        if char == "," and depth == 0:
            items.append("".join(current).strip())
            current = []
            continue
        current.append(char)
    if current:
        items.append("".join(current).strip())
    return [item for item in items if item]


def _parse_params(raw: str | None) -> list[str]:
    if not raw:
        return []
    params: list[str] = []
    for item in _split_csv(raw):
        name = item.split(":", 1)[0].strip()
        if not name:
            raise SyntaxError(f"Invalid parameter declaration: {item}")
        params.append(name)
    return params


def parse_program(source: str) -> Program:
    lines = source.splitlines()
    statements = []
    previous_claim: Claim | None = None
    index = 0
    while index < len(lines):
        raw_line = lines[index]
        line = strip_comment(raw_line).rstrip()
        if not line.strip():
            index += 1
            continue
        if raw_line.startswith((" ", "\t")):
            raise SyntaxError(f"Unexpected indentation at line {index + 1}")
        if line.startswith("assume "):
            statements.append(Assume(_parse_plain_expr(line[len("assume ") :])))
            previous_claim = None
            index += 1
            continue
        if line.startswith("falsified_when "):
            if previous_claim is None:
                raise SyntaxError("falsified_when must follow a claim")
            previous_claim.falsifier = _parse_plain_expr(line[len("falsified_when ") :])
            index += 1
            continue
        claim_match = CLAIM_RE.match(line)
        if claim_match:
            claim = Claim(
                name=claim_match.group("name"),
                type_name=claim_match.group("type").strip(),
                expr=_parse_expr(claim_match.group("expr")),
                confidence=(
                    float(claim_match.group("conf")[3:]) if claim_match.group("conf") else None
                ),
            )
            statements.append(claim)
            previous_claim = claim
            index += 1
            continue
        lemma_match = LEMMA_RE.match(line)
        if lemma_match:
            kind = lemma_match.group("kind")
            name = lemma_match.group("name")
            params = _parse_params(lemma_match.group("params"))
            index += 1
            assumption = None
            illah = None
            proves = None
            by = ""
            while index < len(lines):
                block_raw = lines[index]
                block_line = strip_comment(block_raw).rstrip()
                if not block_line.strip():
                    index += 1
                    continue
                if not block_raw.startswith((" ", "\t")):
                    break
                content = block_line.strip()
                if content.startswith("assume "):
                    assumption = _parse_plain_expr(content[len("assume ") :])
                elif content.startswith("because illah = "):
                    illah = _parse_plain_expr(content[len("because illah = ") :])
                elif content.startswith("proves "):
                    proves = _parse_expr(content[len("proves ") :])
                elif content.startswith("by "):
                    by = content[len("by ") :].strip()
                else:
                    raise SyntaxError(f"Unknown lemma clause at line {index + 1}: {content}")
                index += 1
            if proves is None:
                raise SyntaxError(f"{kind} {name} missing proves clause")
            statements.append(
                Lemma(
                    name=name,
                    kind=kind,
                    parameters=params,
                    assumption=assumption,
                    illah=illah,
                    proves=proves,
                    by=by,
                )
            )
            previous_claim = None
            continue
        raise SyntaxError(f"Unknown statement at line {index + 1}: {line}")
    return Program(statements)
