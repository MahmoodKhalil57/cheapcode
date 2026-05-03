# Q1: What is the correct volume formula for a disphenoid (isosceles tetrahedron) with opposite-edge pairs (p, q, r)?

**My answer (Claude Opus 4.7, written 2026-05-03 BEFORE running cheapcode-witness):**

A disphenoid (isosceles tetrahedron) is a tetrahedron in which each pair of opposite edges has equal length. Label the three opposite-edge-pair lengths as p, q, r.

The volume formula is:

```
V = (1/(6·√2)) · √( (p² + q² − r²) · (p² − q² + r²) · (−p² + q² + r²) )
```

**Sanity check 1 (regular tetrahedron):** for p = q = r = a (all edges equal), each factor in the radicand equals a², so V = (1/(6√2)) · √(a⁶) = a³/(6√2) = a³√2/12. This matches the known regular-tetrahedron volume. ✓

**Sanity check 2 (degenerate case):** if one of the parenthesized factors becomes ≤ 0, the disphenoid is non-realizable — i.e., the three pairs (p, q, r) cannot be the opposite-edge lengths of any tetrahedron. The formula correctly returns 0 or fails on the boundary, which is the right behavior.

**Counter-example showing GPT-5's wrong formula:**

In M3.23 baseline, GPT-5 emitted `V = (1/12) · √(2(p²q² + q²r² + r²p²) − (p⁴ + q⁴ + r⁴))`. On the regular case (p=q=r=a) this gives V = (1/12) · √(3a⁴) = a²√3/12 — which is dimensionally wrong (a² instead of a³) and does NOT match a³√2/12. So GPT-5's formula is definitively incorrect.

**Confidence:** sahih on the formula (verified by sanity check on a known case) AND on the counter-example showing GPT-5 was wrong.
