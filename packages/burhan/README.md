# Burhan

Round 1 implementation of the Burhan claim language from the r98 roadmap.

Implemented surface:

- `claim NAME: TYPE = EXPR`
- optional `@>=0.82` confidence annotation on claims
- `assume PRED`
- `falsified_when PRED`
- `lemma` / `theorem`
- `cite LEMMA with bindings`
- comments with `#`
- basic scalar types, `List<T>`, arithmetic, boolean expressions, identifiers, and function calls

Install and run:

```bash
python -m pip install -e .[dev]
python -m pytest -v
python -m burhan.cli examples/01_simple.bn
```

The runtime keeps simple claims cheap: literal arithmetic produces a `cell` with empty derivation and confidence `1.0`.
