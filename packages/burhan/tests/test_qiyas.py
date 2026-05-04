from burhan.evaluator import Evaluator, IllahViolation
from burhan.parser import parse_program


def _run_source(source: str) -> Evaluator:
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program(source))
    return evaluator


def test_illah_passes_when_predicate_true() -> None:
    source = """
lemma free_user_denied(account)
  because illah = account == "free"
  proves not can_mint_operator_pool_token(account)

claim token_request_denied: Bool = cite free_user_denied with account="free"
"""
    evaluator = _run_source(source)
    assert evaluator.cells["token_request_denied"].payload is True


def test_illah_blocks_citation_when_predicate_false() -> None:
    source = """
lemma free_user_denied(account)
  because illah = account == "free"
  proves not can_mint_operator_pool_token(account)

claim token_request_denied: Bool = cite free_user_denied with account="pro"
"""
    try:
        _run_source(source)
    except IllahViolation as error:
        assert "free_user_denied" in str(error)
        assert 'account == "free"' in str(error)
    else:
        raise AssertionError("Expected citation to fail when the illah is false")


def test_lemma_without_illah_still_works() -> None:
    source = """
lemma free_user_denied(account)
  proves not can_mint_operator_pool_token(account)

claim token_request_denied: Bool = cite free_user_denied with account="free"
"""
    evaluator = _run_source(source)
    assert evaluator.cells["token_request_denied"].payload is True


def test_citation_can_override_illah() -> None:
    source = """
lemma pool_user_allowed(account)
  because illah = account == "pro"
  proves can_mint_operator_pool_token(account)

claim token_request_allowed: Bool = cite pool_user_allowed with account="free" because illah = account == "free"
"""
    evaluator = _run_source(source)
    assert evaluator.cells["token_request_allowed"].payload is False
