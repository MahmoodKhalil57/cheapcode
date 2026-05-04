from __future__ import annotations

import ast as pyast
from datetime import UTC, datetime
import hashlib
import platform
import re
import subprocess
import tempfile
import time
from types import SimpleNamespace

from .ast import Assume, CitationExpr, Claim, Expr, Lemma, Program
from .cell import Cell, Receipt, make_cell
from .lemma_store import LemmaRecord, LemmaStore


def _build_round_has_artifacts(slug: str) -> bool:
    return bool(slug)


def _can_mint_operator_pool_token(account: str) -> bool:
    return account != "free"


def _identity(value: str) -> str:
    return value


def _parse_pytest_count(output: str, label: str) -> int | None:
    match = re.search(rf"(\d+)\s+{label}", output)
    if match is None:
        return None
    return int(match.group(1))


def _observe_test(command: str, timeout: int = 60) -> Receipt:
    started_at = time.perf_counter()
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    try:
        completed = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
    except subprocess.TimeoutExpired as error:
        exit_code = 124
        stdout = error.stdout or ""
        stderr = (error.stderr or "") + f"\nTimed out after {timeout}s"

    duration_ms = int((time.perf_counter() - started_at) * 1000)
    stdout_tail = stdout[-2000:]
    stderr_tail = stderr[-2000:]
    combined_output = "".join(part for part in (stdout, stderr) if part)
    pytest_passed = _parse_pytest_count(combined_output, "passed")
    pytest_failed = _parse_pytest_count(combined_output, "failed")

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        prefix="burhan-observe-test-",
        suffix=".log",
        delete=False,
    ) as log_file:
        log_file.write(stdout)
        if stdout and stderr:
            log_file.write("\n")
        log_file.write(stderr)
        log_path = log_file.name

    receipt_hash = hashlib.sha256(
        "\n".join([command, str(exit_code), stdout_tail, stderr_tail]).encode("utf-8")
    ).hexdigest()
    return Receipt(
        command=command,
        exit_code=exit_code,
        stdout_tail=stdout_tail,
        stderr_tail=stderr_tail,
        pytest_passed=pytest_passed,
        pytest_failed=pytest_failed,
        log_path=log_path,
        duration_ms=duration_ms,
        timestamp=timestamp,
        receipt_hash=receipt_hash,
    )


BUILTINS = {
    "build_round_has_artifacts": _build_round_has_artifacts,
    "can_mint_operator_pool_token": _can_mint_operator_pool_token,
    "scaffold_template": _identity,
    "repo_init": _identity,
    "agent_dispatch": _identity,
    "local_verify": lambda value: bool(value),
    "observe_test": _observe_test,
}


class IllahViolation(ValueError):
    pass


class Evaluator:
    def __init__(self) -> None:
        self.steps_taken = 0
        self.cells: dict[str, Cell[object]] = {}
        self.assumptions: set[str] = set()
        self.lemma_store = LemmaStore()
        self.runtime = SimpleNamespace(os=platform.system().lower())
        self.last_claim_name: str | None = None

    def evaluate_program(self, program: Program) -> dict[str, Cell[object]]:
        for statement in program.statements:
            if isinstance(statement, Assume):
                self._evaluate_assume(statement)
            elif isinstance(statement, Claim):
                self._evaluate_claim(statement)
            elif isinstance(statement, Lemma):
                self._register_lemma(statement)
        return self.cells

    def _evaluate_assume(self, statement: Assume) -> None:
        result = self._eval_expression(statement.predicate, {})
        if not isinstance(result, bool):
            raise TypeError("assume predicate must evaluate to Bool")
        if not result:
            raise ValueError(f"Assumption failed: {statement.predicate.source}")
        self.assumptions.add(statement.predicate.source)

    def _register_lemma(self, statement: Lemma) -> None:
        if statement.proves is None:
            raise ValueError(f"Lemma {statement.name} is missing a proof target")
        self.lemma_store.add(
            LemmaRecord(
                name=statement.name,
                kind=statement.kind,
                parameters=statement.parameters,
                assumption=statement.assumption,
                illah=statement.illah,
                proves=statement.proves,
                by=statement.by,
                proof_cost=LemmaStore.estimate_cost(statement.by),
            )
        )

    def _evaluate_claim(self, statement: Claim) -> None:
        payload, derivation, receipt = self._eval_claim_expr(statement.expr)
        confidence = statement.confidence if statement.confidence is not None else 1.0
        if isinstance(statement.expr, CitationExpr):
            cited = self.lemma_store.get(statement.expr.lemma_name)
            confidence = statement.confidence if statement.confidence is not None else 1.0
            derivation = [f"cite:{cited.name}"]
        elif self._is_pure_literal_expr(statement.expr):
            confidence = 1.0 if statement.confidence is None else statement.confidence
            derivation = []
        else:
            derivation = derivation or self._dependency_names(statement.expr)
        cell = make_cell(
            payload=payload,
            confidence=confidence,
            derivation=derivation,
            assumptions=set(self.assumptions),
            receipt=receipt,
            falsifier=statement.falsifier.source if statement.falsifier else None,
        )
        self.cells[statement.name] = cell
        self.last_claim_name = statement.name
        if statement.falsifier is not None:
            # Falsifiers read receipt fields through the `receipt` binding so
            # observation claims stay explicit about which probe they depend on.
            falsifier_env = {"receipt": cell.receipt} if cell.receipt is not None else {}
            if self._eval_expression(statement.falsifier, falsifier_env):
                cell.status = "falsified"

    def _eval_claim_expr(self, expr: Expr | CitationExpr) -> tuple[object, list[str], Receipt | None]:
        if isinstance(expr, CitationExpr):
            return self._eval_citation(expr), [f"cite:{expr.lemma_name}"], None
        value = self._eval_expression(expr, {})
        if isinstance(value, Receipt):
            return value.exit_code == 0, [], value
        return value, [], None

    def _eval_citation(self, expr: CitationExpr) -> object:
        self.steps_taken += 1
        lemma = self.lemma_store.get(expr.lemma_name)
        bindings = {name: self._eval_expression(value, {}) for name, value in expr.bindings.items()}
        if lemma.assumption is not None:
            assumption_ok = self._eval_expression(lemma.assumption, bindings)
            if not assumption_ok:
                raise ValueError(f"Lemma assumption failed for {lemma.name}")
        illah = expr.illah or lemma.illah
        if illah is not None:
            illah_ok = self._unwrap_truthy(self._eval_expression(illah, bindings))
            if not illah_ok:
                raise IllahViolation(
                    f"Illah violation for lemma {lemma.name}: {illah.source}"
                )
        self.steps_taken += 1
        return self._eval_expression(lemma.proves, bindings)

    def _eval_expression(self, expr: Expr, local_env: dict[str, object]) -> object:
        tree = pyast.parse(expr.source, mode="eval")
        return self._eval_node(tree.body, local_env)

    def _eval_node(self, node: pyast.AST, local_env: dict[str, object]) -> object:
        if isinstance(node, pyast.Constant):
            return node.value
        if isinstance(node, pyast.Name):
            return self._resolve_name(node.id, local_env)
        if isinstance(node, pyast.List):
            return [self._eval_node(item, local_env) for item in node.elts]
        if isinstance(node, pyast.Tuple):
            return tuple(self._eval_node(item, local_env) for item in node.elts)
        if isinstance(node, pyast.Attribute):
            value = self._eval_node(node.value, local_env)
            if isinstance(value, dict):
                return value[node.attr]
            return getattr(value, node.attr)
        if isinstance(node, pyast.UnaryOp):
            operand = self._eval_node(node.operand, local_env)
            if isinstance(node.op, pyast.Not):
                return not operand
            if isinstance(node.op, pyast.USub):
                return -operand
        if isinstance(node, pyast.BoolOp):
            values = [self._eval_node(value, local_env) for value in node.values]
            if isinstance(node.op, pyast.And):
                return all(values)
            if isinstance(node.op, pyast.Or):
                return any(values)
        if isinstance(node, pyast.BinOp):
            left = self._eval_node(node.left, local_env)
            right = self._eval_node(node.right, local_env)
            self.steps_taken += 1
            if isinstance(node.op, pyast.Add):
                return left + right
            if isinstance(node.op, pyast.Sub):
                return left - right
            if isinstance(node.op, pyast.Mult):
                return left * right
            if isinstance(node.op, pyast.Div):
                return left / right
        if isinstance(node, pyast.Compare):
            left = self._eval_node(node.left, local_env)
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator, local_env)
                if isinstance(op, pyast.Eq) and not (left == right):
                    return False
                if isinstance(op, pyast.NotEq) and not (left != right):
                    return False
                if isinstance(op, pyast.Lt) and not (left < right):
                    return False
                if isinstance(op, pyast.LtE) and not (left <= right):
                    return False
                if isinstance(op, pyast.Gt) and not (left > right):
                    return False
                if isinstance(op, pyast.GtE) and not (left >= right):
                    return False
                if isinstance(op, pyast.In) and not (left in right):
                    return False
                if isinstance(op, pyast.NotIn) and not (left not in right):
                    return False
                left = right
            return True
        if isinstance(node, pyast.Call):
            func = self._eval_node(node.func, local_env)
            args = [self._eval_node(arg, local_env) for arg in node.args]
            kwargs = {kw.arg: self._eval_node(kw.value, local_env) for kw in node.keywords}
            self.steps_taken += 1
            return func(*args, **kwargs)
        raise TypeError(f"Unsupported expression node: {type(node).__name__}")

    def _resolve_name(self, name: str, local_env: dict[str, object]) -> object:
        if name in local_env:
            return local_env[name]
        if name in self.cells:
            return self.cells[name].payload
        if name == "runtime":
            return self.runtime
        if name in BUILTINS:
            return BUILTINS[name]
        if name in {"True", "False", "None"}:
            return {"True": True, "False": False, "None": None}[name]
        raise NameError(f"Unknown identifier {name!r}")

    def _unwrap_truthy(self, value: object) -> bool:
        if isinstance(value, Cell):
            value = value.payload
        return bool(value)

    def _is_pure_literal_expr(self, expr: Expr | CitationExpr) -> bool:
        if isinstance(expr, CitationExpr):
            return False
        tree = pyast.parse(expr.source, mode="eval")
        return self._literal_only(tree.body)

    def _literal_only(self, node: pyast.AST) -> bool:
        if isinstance(node, pyast.Constant):
            return True
        if isinstance(node, pyast.List):
            return all(self._literal_only(item) for item in node.elts)
        if isinstance(node, pyast.UnaryOp):
            return isinstance(node.op, pyast.USub) and self._literal_only(node.operand)
        if isinstance(node, pyast.BinOp):
            return self._literal_only(node.left) and self._literal_only(node.right)
        if isinstance(node, pyast.BoolOp):
            return all(self._literal_only(value) for value in node.values)
        if isinstance(node, pyast.Compare):
            return self._literal_only(node.left) and all(
                self._literal_only(comparator) for comparator in node.comparators
            )
        return False

    def _dependency_names(self, expr: Expr) -> list[str]:
        tree = pyast.parse(expr.source, mode="eval")
        names = {
            node.id
            for node in pyast.walk(tree)
            if isinstance(node, pyast.Name) and node.id in self.cells
        }
        return sorted(names)
