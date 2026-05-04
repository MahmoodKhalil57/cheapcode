from burhan.lexer import strip_comment, tokenize


def test_strip_comment_preserves_hash_in_string() -> None:
    assert strip_comment('claim s: Str = "a#b" # comment') == 'claim s: Str = "a#b" '


def test_tokenize_confidence_annotation() -> None:
    tokens = tokenize("claim x: Float @>=0.82 = 1.0\n")
    assert any(token.kind == "ATCONF" and token.value == "@>=0.82" for token in tokens)


def test_tokenize_lemma_keywords() -> None:
    tokens = tokenize("lemma demo\n  proves True\n")
    values = [token.value for token in tokens if token.kind == "NAME"]
    assert values[:3] == ["lemma", "demo", "proves"]
