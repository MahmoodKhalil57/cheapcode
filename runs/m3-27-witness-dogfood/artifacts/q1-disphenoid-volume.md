# cheapcode-witness artifact — q1-disphenoid-volume

**Date:** 2026-05-03T11:04:49.863Z
**Grade:** `daif` (mizaj 14: sahih > hasan > daif)
**Cost:** $0.01217 | **Latency:** 144.8s | **Escalated:** true

## Question

Derive the volume formula for a disphenoid (also called isosceles tetrahedron), defined as a tetrahedron where each pair of opposite edges has equal length. Let p, q, r denote the three opposite-edge-pair lengths. Provide the formula AND a sanity check by setting p = q = r = a (the regular-tetrahedron case) and confirming the result matches the known volume a^3 / (6 sqrt 2). Be explicit about each algebraic step.

## Aggregated answer (daif)

**Full text:**

Construction and coordinates.
- Place the disphenoid centered at the origin with vertices
  v1 = ( a,  b,  c ),
  v2 = ( a, -b, -c ),
  v3 = (-a,  b, -c ),
  v4 = (-a, -b,  c ).
  (This choice enforces the threefold opposite-edge equalities.)

Edge lengths of opposite pairs:
- v1-v2 = (0, 2b, 2c) so p = |v1-v2| = 2 sqrt(b^2 + c^2).
- v1-v3 = (2a, 0, 2c) so q = 2 sqrt(a^2 + c^2).
- v1-v4 = (2a, 2b, 0) so r = 2 sqrt(a^2 + b^2).

Volume via a determinant.
- The volume V of the tetrahedron is V = |det(v2-v1, v3-v1, v4-v1)| / 6.
- Form the three edge vectors from v1:
  u = v2-v1 = (0, -2b, -2c) = -2(0, b, c),
  v = v3-v1 = (-2a, 0, -2c) = -2(a, 0, c),
  w = v4-v1 = (-2a, -2b, 0) = -2(a, b, 0).
- The 3×3 matrix with columns u,v,w equals (-2) times the matrix N with columns (0,b,c), (a,0,c), (a,b,0). Hence det[u,v,w] = (-2)^3 det N = -8 det N.
- Compute det N. With rows
  r1 = (0, a, a), r2 = (b, 0, b), r3 = (c, c, 0),
  det N = 0*(0*0 - b*c) - a*(b*0 - b*c) + a*(b*c - 0*c) = a b c + a b c = 2 a b c.
- So det[u,v,w] = -8 * 2 a b c = -16 a b c, and |det| = 16 a b c.
- Therefore V = (16 a b c)/6 = (8/3) a b c.

Express a b c in terms of p,q,r.
- Let A = a^2, B = b^2, C = c^2. From the edge relations:
  B + C = p^2/4,
  A + C = q^2/4,
  A + B = r^2/4.
- Sum the three: 2(A+B+C) = (p^2+q^2+r^2)/4, so
  A + B + C = (p^2+q^2+r^2)/8.
- Solve for A, B, C:
  A = ( -p^2 + q^2 + r^2 )/8,
  B = (  p^2 - q^2 + r^2 )/8,
  C = (  p^2 + q^2 - r^2 )/8.
- Hence
  a b c = sqrt( A B C )
        = sqrt( ( -p^2+q^2+r^2 )( p^2 - q^2 + r^2 )( p^2+q^2 - r^2 ) ) / sqrt(8^3)
        = sqrt( ( -p^2+q^2+r^2 )( p^2 - q^2 + r^2 )( p^2+q^2 - r^2 ) ) / (16 sqrt 2).

Substitute into V:
- V = (8/3) a b c
    = (8/3) * [ sqrt( ( -p^2+q^2+r^2 )( p^2 - q^2 + r^2 )( p^2+q^2 - r^2 ) ) / (16 sqrt 2) ]
    = sqrt( ( -p^2+q^2+r^2 )( p^2 - q^2 + r^2 )( p^2+q^2 - r^2 ) ) / (6 sqrt 2).

Sanity check (regular tetrahedron): set p = q = r = a.
- Each factor becomes ( -a^2 + a^2 + a^2 ) = a^2, so the product under the square root is a^6 and its square root is a^3.
- Therefore V = a^3 / (6 sqrt 2), which matches the known regular-tetrahedron volume.

Final formula:
Answer: V = (1/(6*sqrt(2))) * sqrt(( -p^2 + q^2 + r^2 )*( p^2 - q^2 + r^2 )*( p^2 + q^2 - r^2 ))

## Witness trace

### 1. `cheap-a`

- **Extracted answer:** `\(V = \frac{\sqrt{(p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2)}}{6\sqrt{2}}\)`
- **Tail (last 100 chars):** ` the known volume. ⏎  ⏎ Answer: \(V = \frac{\sqrt{(p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2)}}{6\sqrt{2}}\)`

### 2. `cheap-b`

- **Extracted answer:** `\(V = \frac{1}{6\sqrt{2}}\sqrt{(p^{2}+q^{2}-r^{2})(p^{2}+r^{2}-q^{2})(q^{2}+r^{2}-p^{2})}\)`
- **Tail (last 100 chars):** ` ⏎ Answer: \(V = \frac{1}{6\sqrt{2}}\sqrt{(p^{2}+q^{2}-r^{2})(p^{2}+r^{2}-q^{2})(q^{2}+r^{2}-p^{2})}\)`

### 3. `smart-c`

- **Extracted answer:** `V = (1/(6*sqrt(2))) * sqrt(( -p^2 + q^2 + r^2 )*( p^2 - q^2 + r^2 )*( p^2 + q^2 - r^2 ))`
- **Tail (last 100 chars):** `la: ⏎ Answer: V = (1/(6*sqrt(2))) * sqrt(( -p^2 + q^2 + r^2 )*( p^2 - q^2 + r^2 )*( p^2 + q^2 - r^2 ))`

## Audit

This artifact was produced by `tools/cheapcode-witness.ts` via the cheapcode cross-witness voter (M3.18). Per atom 0010, the witness disagreement (or convergence) IS the load-bearing signal. Per atom 0007 (anti-fabrication), the witness votes carried in this artifact are inspectable; downstream callers should not treat the answer as load-bearing unless the grade matches their confidence threshold.

- `sahih` = both cheap witnesses converged independently → highest confidence
- `hasan` = cheap pair disagreed; smart escalation produced a 2-of-3 majority → moderate confidence
- `daif` = no convergence (or single-witness-rescue with low confidence) → consume only as a starting point for further inquiry
