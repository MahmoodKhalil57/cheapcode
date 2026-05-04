from pathlib import Path

from burhan.evaluator import Evaluator
from burhan.parser import parse_program


def _run_source(source: str) -> Evaluator:
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program(source))
    return evaluator


def test_simple_claim_evaluates_with_empty_derivation() -> None:
    evaluator = _run_source("claim answer: Int = 2 + 2\n")
    cell = evaluator.cells["answer"]
    assert cell.payload == 4
    assert cell.derivation == []
    assert cell.confidence == 1.0


def test_assumptions_attach_to_downstream_claims() -> None:
    evaluator = _run_source('assume runtime.os == "linux"\nclaim disk_free: Int = 2\n')
    assert 'runtime.os == "linux"' in evaluator.cells["disk_free"].assumptions


def test_falsified_when_updates_status() -> None:
    evaluator = _run_source("claim x: Int = 0\nfalsified_when x == 0\n")
    assert evaluator.cells["x"].status == "falsified"


def test_example_files_execute() -> None:
    example_dir = Path(__file__).parent / "examples"
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program((example_dir / "01_simple.bn").read_text()))
    assert evaluator.cells["answer"].payload == 4


def test_runtime_assumption_example_executes() -> None:
    example_dir = Path(__file__).parent / "examples"
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program((example_dir / "02_provenance.bn").read_text()))
    assert evaluator.cells["disk_free"].payload == 2
    assert evaluator.cells["disk_free"].status == "live"
