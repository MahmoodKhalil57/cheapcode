from __future__ import annotations

import argparse
from pathlib import Path

from .evaluator import Evaluator
from .parser import parse_program


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="burhan")
    parser.add_argument("file", help="Burhan source file")
    args = parser.parse_args(argv)

    source = Path(args.file).read_text(encoding="utf-8")
    program = parse_program(source)
    evaluator = Evaluator()
    cells = evaluator.evaluate_program(program)
    if evaluator.last_claim_name is None:
        return 0
    print(cells[evaluator.last_claim_name].payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
