from pathlib import Path

from burhan.cell import Receipt
from burhan.evaluator import Evaluator
from burhan.parser import parse_program


def _run_source(source: str) -> Evaluator:
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program(source))
    return evaluator


def test_observe_test_succeeds_for_passing_command() -> None:
    evaluator = _run_source("""claim cmd_ok: Bool = observe_test(\"python3 -c 'pass'\")\n""")
    cell = evaluator.cells["cmd_ok"]
    assert cell.payload is True
    assert cell.receipt is not None
    assert cell.receipt.exit_code == 0


def test_observe_test_marks_falsified_when_exit_nonzero() -> None:
    evaluator = _run_source(
        """
claim cmd_ok: Bool = observe_test("python3 -c 'import sys; sys.exit(1)'")
falsified_when receipt.exit_code != 0
"""
    )
    assert evaluator.cells["cmd_ok"].status == "falsified"


def test_receipt_is_inspectable_on_cell(tmp_path: Path) -> None:
    test_file = tmp_path / "test_probe.py"
    test_file.write_text("def test_probe():\n    assert True\n")
    evaluator = _run_source(
        f'claim probe: Bool = observe_test("python3 -m pytest {test_file} -v")\n'
    )

    receipt = evaluator.cells["probe"].receipt
    assert isinstance(receipt, Receipt)
    assert receipt.command.endswith(f"pytest {test_file} -v")
    assert receipt.exit_code == 0
    assert receipt.stdout_tail
    assert receipt.stderr_tail is not None
    assert receipt.pytest_passed == 1
    assert receipt.log_path is not None
    assert Path(receipt.log_path).exists()
    assert receipt.duration_ms >= 0
    assert receipt.timestamp.endswith("Z")
    assert receipt.receipt_hash


def test_receipt_hash_is_stable_across_runs_for_deterministic_command() -> None:
    source = 'claim probe: Bool = observe_test("python3 -c \'print(42)\'")\n'
    first = _run_source(source).cells["probe"].receipt
    second = _run_source(source).cells["probe"].receipt
    assert first is not None
    assert second is not None
    assert first.receipt_hash == second.receipt_hash


def test_observation_returns_falsy_payload_for_nonzero_exit() -> None:
    evaluator = _run_source(
        """claim cmd_ok: Bool = observe_test(\"python3 -c 'import sys; sys.exit(1)'\")\n"""
    )
    cell = evaluator.cells["cmd_ok"]
    assert cell.payload is False
    assert cell.receipt is not None
    assert cell.receipt.exit_code != 0
