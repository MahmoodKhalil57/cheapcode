from burhan.ast import CitationExpr, Claim, Lemma
from burhan.parser import parse_program


def test_parse_claim_with_confidence() -> None:
    program = parse_program("claim disk_free: Float @>=0.99 = 1.5\n")
    claim = program.statements[0]
    assert isinstance(claim, Claim)
    assert claim.name == "disk_free"
    assert claim.type_name == "Float"
    assert claim.confidence == 0.99


def test_parse_falsifier_attaches_to_prior_claim() -> None:
    program = parse_program("claim x: Int = 1\nfalsified_when x < 0\n")
    claim = program.statements[0]
    assert isinstance(claim, Claim)
    assert claim.falsifier is not None
    assert claim.falsifier.source == "x < 0"


def test_parse_theorem_alias_and_citation() -> None:
    source = """
theorem t
  assume account == \"free\"
  proves not can_mint_operator_pool_token(account)
  by audit policy

claim denied: Bool = cite t with account=current_user
"""
    program = parse_program(source)
    assert isinstance(program.statements[0], Lemma)
    assert program.statements[0].kind == "theorem"
    claim = program.statements[1]
    assert isinstance(claim, Claim)
    assert isinstance(claim.expr, CitationExpr)
    assert claim.expr.lemma_name == "t"


def test_parse_list_type_name() -> None:
    program = parse_program("claim nums: List<Int> = [1, 2, 3]\n")
    claim = program.statements[0]
    assert isinstance(claim, Claim)
    assert claim.type_name == "List<Int>"
