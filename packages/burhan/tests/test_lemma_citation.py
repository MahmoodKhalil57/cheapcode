from pathlib import Path

from burhan.evaluator import Evaluator
from burhan.parser import parse_program


def test_theorem_citation_runs() -> None:
    example_dir = Path(__file__).parent / "examples"
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program((example_dir / "06_lemma_cite.bn").read_text()))
    assert evaluator.cells["token_request_denied"].payload is True
    assert evaluator.cells["token_request_denied"].derivation == ["cite:paid_pool_forbidden_for_free_user"]


def test_chain_citation_runs() -> None:
    example_dir = Path(__file__).parent / "examples"
    evaluator = Evaluator()
    evaluator.evaluate_program(parse_program((example_dir / "07_lemma_chain.bn").read_text()))
    assert evaluator.cells["foo_ready"].payload is True


def test_citation_short_circuits_long_chain() -> None:
    uncited = """
claim foo_ready: Bool = local_verify(agent_dispatch(repo_init(scaffold_template("foo"))))
"""
    cited = """
lemma template_round_trip
  assume template_id in ["saas-web", "marketing-brochure", "api-service", "expo-app"]
  proves build_round_has_artifacts(slug)
  by chain [scaffold_template, repo_init, agent_dispatch, local_verify]

claim foo_ready: Bool = cite template_round_trip with slug="foo", template_id="saas-web"
"""
    uncited_eval = Evaluator()
    uncited_eval.evaluate_program(parse_program(uncited))
    cited_eval = Evaluator()
    cited_eval.evaluate_program(parse_program(cited))
    assert uncited_eval.steps_taken >= 4
    assert cited_eval.steps_taken <= 3
    assert cited_eval.steps_taken < uncited_eval.steps_taken
