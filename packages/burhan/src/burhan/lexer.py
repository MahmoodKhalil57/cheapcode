from __future__ import annotations

from dataclasses import dataclass
import re


TOKEN_RE = re.compile(
    r"""
    (?P<SPACE>[ \t]+)
    |(?P<COMMENT>\#.*$)
    |(?P<ATCONF>@>=\d+(?:\.\d+)?)
    |(?P<FLOAT>\d+\.\d+)
    |(?P<INT>\d+)
    |(?P<STRING>"([^"\\]|\\.)*"|'([^'\\]|\\.)*')
    |(?P<OP>==|!=|<=|>=|\+|\-|\*|/|<|>|=|:|,|\(|\)|\[|\]|\.)
    |(?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
    |(?P<MISMATCH>.)
    """,
    re.VERBOSE,
)


KEYWORD_KINDS = {
    "because": "BECAUSE",
    "illah": "ILLAH",
}


@dataclass(slots=True)
class Token:
    kind: str
    value: str
    line: int
    column: int


def strip_comment(line: str) -> str:
    in_string = False
    quote = ""
    escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if in_string:
            if char == quote:
                in_string = False
            continue
        if char in ('"', "'"):
            in_string = True
            quote = char
            continue
        if char == "#":
            return line[:index]
    return line


def tokenize(source: str) -> list[Token]:
    tokens: list[Token] = []
    for line_number, raw_line in enumerate(source.splitlines(), start=1):
        line = strip_comment(raw_line)
        position = 0
        while position < len(line):
            match = TOKEN_RE.match(line, position)
            if match is None:
                raise SyntaxError(f"Unexpected character at line {line_number}:{position + 1}")
            kind = match.lastgroup or "MISMATCH"
            value = match.group()
            if kind == "MISMATCH":
                raise SyntaxError(f"Unexpected token {value!r} at line {line_number}:{position + 1}")
            if kind == "NAME":
                kind = KEYWORD_KINDS.get(value, kind)
            if kind not in {"SPACE", "COMMENT"}:
                tokens.append(Token(kind, value, line_number, position + 1))
            position = match.end()
        tokens.append(Token("NEWLINE", "\\n", line_number, len(raw_line) + 1))
    return tokens
