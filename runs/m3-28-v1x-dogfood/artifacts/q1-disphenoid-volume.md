# cheapcode-witness artifact — q1-disphenoid-volume (v1x panel-of-experts)

**Date:** 2026-05-03T11:20:26.163Z
**Cost:** $0.05306 | **Latency:** 94.3s (synth 27.5s)

## Question

Derive the volume formula for a disphenoid (also called isosceles tetrahedron), defined as a tetrahedron where each pair of opposite edges has equal length. Let p, q, r denote the three opposite-edge-pair lengths. Provide the formula AND a sanity check by setting p = q = r = a (the regular-tetrahedron case) and confirming the result matches the known volume a^3 / (6 sqrt 2). Be explicit about each algebraic step.

## Synthesized artifact

[CONSENSUS]
- Final volume formula (all three present the same expression):
  V = sqrt((p^2+q^2−r^2)(p^2+r^2−q^2)(q^2+r^2−p^2)) / (6√2).
- Standard coordinate/box embedding: the disphenoid can be realized from a rectangular box so that opposite edges are
  p = √(a^2 + b^2), q = √(a^2 + c^2), r = √(b^2 + c^2) (A/B use a,b,c; B uses x,y,z; D uses half-dimensions α,β,γ but equivalent).
- From those identities:
  a^2 = (p^2+q^2−r^2)/2,
  b^2 = (p^2+r^2−q^2)/2,
  c^2 = (q^2+r^2−p^2)/2.
- Volume expressed in box-variables: V = (abc)/3 (equivalently, with D’s half-variables, V = (8αβγ)/3 because a=2α etc. — all consistent).
- Substituting a^2,b^2,c^2 into V = abc/3 yields the consensus formula above.
- Sanity check: p = q = r = a gives V = a^3/(6√2), which matches the known regular-tetrahedron volume.

[DISAGREEMENTS]
- None substantive. All three derivations are algebraically consistent and lead to the same final formula. Differences are only in notation/embeddings (origin-centered vs corner-based) and in the chosen route to the same algebra.

[UNIQUE-A: vector/Gram determinant approach]
- A sets vertex A at the origin and uses vectors u,v,w for AB, AC, AD, computes dot-products
  X = (p^2+q^2−r^2)/2, Y = (p^2+r^2−q^2)/2, Z = (q^2+r^2−p^2)/2,
  and notes V^2 = (1/36) det(G) where G is the Gram matrix [[p^2,X,Y],[X,q^2,Z],[Y,Z,r^2]]. (A mentions Gram/determinant as an alternative route.)

[UNIQUE-B: concise determinant at corner-of-box placement]
- B uses vertices A(0,0,0), B(x,y,0), C(x,0,z), D(0,y,z), computes det([AB,AC,AD]) = 2xyz and so V = (1/6)*2xyz = xyz/3, then substitutes x^2,y^2,z^2 to get the final formula in one short chain.

[UNIQUE-D: centered-box (half-dimensions) plus explicit corner-tetra subtraction]
- D places the box centered and uses α,β,γ (half-side lengths), shows p^2 = 4(α^2+β^2), etc., solves for α^2,β^2,γ^2, computes box volume 8αβγ, and derives the disphenoid occupies 1/3 of the box by computing the four corner tetrahedra via scalar triple products; substitutes and simplifies to the same final formula.

[ERRORS / NOTABLE MISSTEPS]
- A briefly floated an incorrect tentative expression "… /72?" before discarding it; that stray number is incorrect and should be ignored. (Final A result is correct.)
- No other algebraic or logical errors found in the three final derivations; D's subtraction-of-corners is careful and consistent with the others after accounting for the 2× scaling between α/β/γ and A/B/C's a/b/c.

[CONFIDENCE SUMMARY]
- Sahih (high confidence, agreed by all 3): final formula V = sqrt((p^2+q^2−r^2)(p^2+r^2−q^2)(q^2+r^2−p^2)) / (6√2); expressions for a^2,b^2,c^2 in terms of p,q,r; sanity check p=q=r=a → V = a^3/(6√2).
- Hasan (moderate; supported by 2–3 witnesses in different forms): the coordinate/box embeddings and the statement V = (1/3)·(product of the three orthogonal edge-lengths from the chosen origin-based embedding) — B and A present it directly, D demonstrates equivalently with centered coordinates and corner subtraction.
- Daif (weak / discarded): A’s initial tentative "/72" expression (not carried through) — no support from others.

If you want, I can produce a single compact derivation (one-line algebraic sequence) using one chosen embedding (corner or centered) and show each algebraic substitution step-by-step. Which notation do you prefer (a,b,c) or (α,β,γ)?

## Witness texts (full)

### `cheap-a` (deepseek/deepseek-v4-flash)

We need to derive the volume formula for a disphenoid (isosceles tetrahedron) where each pair of opposite edges are equal. Let the three lengths be p, q, r. The tetrahedron has vertices A, B, C, D. Opposite edges are those that do not share a vertex: e.g., edges AB and CD are opposite, AC and BD opposite, AD and BC opposite. We set lengths: AB = CD = p, AC = BD = q, AD = BC = r.

We need volume formula in terms of p, q, r.

One approach: Use coordinates. Place the tetrahedron conveniently. Since opposite edges are equal, there is a known fact: For a disphenoid, the circumscribed parallelepiped is rectangular (or the tetrahedron can be inscribed in a rectangular box). Specifically, we can consider that the tetrahedron can be formed by taking a box (rectangular parallelepiped) with side lengths a, b, c and connecting opposite vertices. Or we can use the formula that volume V = √( ( (p^2 + q^2 - r^2)(p^2 + r^2 - q^2)(q^2 + r^2 - p^2) ) / 72 )? Need to derive.

Actually known formula: For a disphenoid with opposite edges lengths p, q, r, volume V = \frac{ \sqrt{ (p^2 + q^2 - r^2)(p^2 + r^2 - q^2)(q^2 + r^2 - p^2) } }{ 6\sqrt{2} }? Not exactly, let's confirm with regular tetrahedron: p = q = r = a. Then numerator = (a^2+a^2 - a^2)(a^2+a^2 - a^2)(a^2+a^2 - a^2) = (a^2)(a^2)(a^2) = a^6, sqrt = a^3. Then V = a^3 / (6√2). That matches known volume a^3/(6√2). So formula would be V = \frac{ \sqrt{ (p^2 + q^2 - r^2)(p^2 + r^2 - q^2)(q^2 + r^2 - p^2) } }{ 6\sqrt{2} }. But check: denominator 6√2 yields positive volume. However this expression might be zero if p, q, r do not satisfy triangle inequalities? Actually for any three lengths that can be side lengths of a triangle? For a tetrahedron to exist, the three numbers must satisfy something: each p, q, r must satisfy the triangle inequality with themselves? Actually p, q, r are lengths of opposite edges. There is condition that each of (p^2+q^2−r^2), etc., must be positive? Not necessarily; but if they are negative, product may be negative, so inside sqrt negative -> impossible. So existence condition is that p^2, q^2, r^2 satisfy triangle inequality? Indeed, we need p^2 + q^2 > r^2 etc., which is triangle condition on squares. This corresponds to acute triangle? Anyway.

We need to derive formula.

One method: Use vectors. Let vertices coordinates: Place A at origin (0,0,0). Let B = vector u, C = vector v, D = vector w. Then edges: AB = |u| =? Not necessarily. But lengths: AB = |u|, AC = |v|, AD = |w|. Opposite edges: CD = |w - v|, BD = |w - u|, BC = |v - u|. So we set:

|u| = ? We need AB = CD = p => |u| = |w - v| = p.
Similarly, AC = BD = q => |v| = |w - u| = q.
And AD = BC = r => |w| = |v - u| = r.

Thus we have a system: lengths of vectors u, v, w and lengths of their differences pairwise satisfy these. This is reminiscent of a tetrahedron inscribed in a box. Solve for dot products.

Let |u|^2 = A, |v|^2 = B, |w|^2 = C. Let dot products: u·v = X, u·w = Y, v·w = Z.

Then:

|u|^2 = A = p^2? Actually careful: AB = |u| = ? We have: AB = p => |u| = p? But we set AB = p, so yes |u| = p. So |u|^2 = p^2.

Similarly, AC = q => |v| = q => |v|^2 = q^2.

AD = r => |w| = r => |w|^2 = r^2.

Now opposite edges:
CD = |w - v| = p => |w - v|^2 = p^2 => |w|^2 + |v|^2 - 2 v·w = p^2 => r^2 + q^2 - 2Z = p^2 => 2Z = q^2 + r^2 - p^2 => Z = (q^2 + r^2 - p^2)/2.

BD = |w - u| = q => |w - u|^2 = q^2 => |w|^2 + |u|^2 - 2 u·w = q^2 => r^2 + p^2 - 2Y = q^2 => 2Y = p^2 + r^2 - q^2 => Y = (p^2 + r^2 - q^2)/2.

BC = |v - u| = r => |v - u|^2 = r^2 => |v|^2 + |u|^2 - 2 u·v = r^2 => q^2 + p^2 - 2X = r^2 => 2X = p^2 + q^2 - r^2 => X = (p^2 + q^2 - r^2)/2.

So we have dot products expressed in terms of p,q,r.

Volume V of tetrahedron formed by vectors u, v, w from A is V = (1/6) | (u × v) · w | = (1/6) |det([u v w])|.

We can compute squared volume: V^2 = (1/36) (det([u v w])^2) = (1/36) Gram determinant = (1/36) det( [u·u u·v u·w; v·u v·v v·w; w·u w·v w·w] ).

So compute Gram matrix G:

G = [[p^2, X, Y],
     [X, q^2, Z],
     [Y, Z, r^2]]

where X = (p^2+q^2 - r^2)/2, Y = (p^2+r^2 - q^2)/2, Z = (q^2+r^2 - p^2)/2.

Compute determinant of G.

Let us denote:

p^2 = P, q^2 = Q, r^2 = R for simplicity.

Then X = (P+Q-R)/2, Y = (P+R-Q)/2, Z = (Q+R-P)/2.

Now compute det(G) = P*(Q*R - Z^2) - X*(X*R - Y*Z) + Y*(X*Z - Y*Q).

We can compute step by step.

First compute Q*R - Z^2. Z = (Q+R-P)/2, so Z^2 = (Q+R-P)^2/4.

Thus Q*R - Z^2 = QR - (Q+R-P)^2/4 = (4QR - (Q+R-P)^2)/4.

Similarly, X*R - Y*Z: XR - YZ = R*(P+Q-R)/2 - ((P+R-Q)/2)*((Q+R-P)/2) = (R(P+Q-R))/2 - ((P+R-Q)(Q+R-P))/(4).

Better to compute everything with common denominator 4.

We can compute det(G) by using known formula for volume of tetrahedron given opposite edges. Alternatively, note that the Gram matrix is symmetric and we can also compute using the fact that the tetrahedron can be inscribed in a rectangular box with side lengths something. Another approach: The disphenoid can be formed from a box with sides a,b,c: take vertices (0,0,0), (a,b,0), (a,0,c), (0,b,c). Then edges: AB = sqrt(a^2+b^2), AC = sqrt(a^2+c^2), AD = sqrt(b^2+c^2). Opposite edges: CD = vector from (a,0,c) to (0,b,c) = ( -a, b, 0) length sqrt(a^2+b^2) = AB; BD = (0,b,c) - (a,b,0) = (-a,0,c) length sqrt(a^2+c^2) = AC; BC = (a,0,c)-(a,b,0) = (0,-b,c) length sqrt(b^2+c^2) = AD. So indeed, any disphenoid corresponds to such a box with sides a,b,c. Then p = sqrt(a^2+b^2), q = sqrt(a^2+c^2), r = sqrt(b^2+c^2). And volume of tetrahedron = (1/3)*(area of base? Actually known: Volume = (1/6) * (volume of box)? Wait: The tetrahedron formed by those four vertices: (0,0,0), (a,b,0), (a,0,c), (0,b,c). The volume can be computed as 1/6 * |det( vectors )|. Vectors from origin: u = (a,b,0), v = (a,0,c), w = (0,b,c). Determinant: det = a*(0*c - c*b) - b*(a*c - c*0) + 0*(a*b - 0*0) = a*(-bc) - b*(ac) = -abc - abc = -2abc. Absolute value = 2abc. Then volume = 1/6 * 2abc = abc/3. Actually that's volume of tetrahedron. But known formula for disphenoid volume: V = \frac{abc}{3}? Let's check: For regular tetrahedron, sides a,b,c should be such that p = q = r = a, means sqrt(a^2+b^2)=a, etc. That would require a,b,c all zero? Not right. Wait: For regular tetrahedron, all edges equal: p=q=r=L. Then solving a,b,c from p^2 = a^2+b^2, q^2 = a^2+c^2, r^2 = b^2+c^2. Adding: p^2+q^2+r^2 = 2(a^2+b^2+c^2). For L=1, we have a^2+b^2=1, a^2+c^2=1, b^2+c^2=1 -> solving gives a^2 = b^2 = c^2 = 0.5, so a=b=c=1/√2. Then volume V = abc/3 = (1/ (2√2))/3 = 1/(6√2). Meanwhile actual volume of regular tetrahedron edge length 1 is 1/(6√2). Yes! So V = abc/3 works. So volume formula in terms of p,q,r: Since a^2 = (p^2+q^2 - r^2)/2? Actually from above: p^2 = a^2+b^2, q^2 = a^2+c^2, r^2 = b^2+c^2. Solve for a^2, b^2, c^2: Adding first two: p^2+q^2 = 2a^2+b^2+c^2 = 2a^2 + r^2 => 2a^2 = p^2+q^2 - r^2 => a^2 = (p^2+q^2 - r^2)/2. Similarly b^2 = (p^2+r^2 - q^2)/2, c^2 = (q^2+r^2 - p^2)/2. So a,b,c are half the square roots of these expressions. Then volume V = abc/3 = (1/3) * sqrt( a^2 b^2 c^2 ) = (1/3) * sqrt( ((p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2))/8 ) = (1/3) * sqrt( product / 8 ) = (1/3) * (1/ (2√2)) * sqrt(product) = sqrt(product) / (6√2). Exactly the formula.

Thus we have derived volume formula:

V = \frac{ \sqrt{ (p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2) } }{ 6\sqrt{2} }.

But note: This formula requires that the three expressions under sqrt are non-negative; otherwise volume is complex (invalid). For a valid disphenoid, these should be positive (if equal to zero gives degenerate). So okay.

Now sanity check: For regular tetrahedron, p=q=r=a: then each factor = a^2 + a^2 - a^2 = a^2. Product = a^6, sqrt = a^3, V = a^3/(6√2) matches.

Thus derivation done.

We should present derivation step-by-step. So answer: Volume formula as above. Provide explanation.

The volume of a disphenoid (isosceles tetrahedron) with opposite edge lengths \(p\), \(q\), \(r\) is

\[
V = \frac{\sqrt{(p^2 + q^2 - r^2)(p^2 + r^2 - q^2)(q^2 + r^2 - p^2)}}{6\sqrt{2}}.
\]

### Derivation

A disphenoid can be realized as the tetrahedron formed by the four vertices  
\((0,0,0)\), \((a,b,0)\), \((a,0,c)\), \((0,b,c)\) of a rectangular box with side lengths \(a,b,c\).  
The six edges are:

- \(AB = \sqrt{a^2 + b^2}\) (between \((0,0,0)\) and \((a,b,0)\))
- \(AC = \sqrt{a^2 + c^2}\) (between \((0,0,0)\) and \((a,0,c)\))
- \(AD = \sqrt{b^2 + c^2}\) (between \((0,0,0)\) and \((0,b,c)\))
- \(BC = \sqrt{b^2 + c^2}\) (between \((a,b,0)\) and \((a,0,c)\))
- \(BD = \sqrt{a^2 + c^2}\) (between \((a,b,0)\) and \((0,b,c)\))
- \(CD = \sqrt{a^2 + b^2}\) (between \((a,0,c)\) and \((0,b,c)\))

Thus opposite edges are equal:  
\(p = \sqrt{a^2 + b^2},\quad q = \sqrt{a^2 + c^2},\quad r = \sqrt{b^2 + c^2}.

Solving for \(a^2, b^2, c^2\):

\[
\begin{aligned}
a^2 &= \frac{p^2 + q^2 - r^2}{2},\\[2pt]
b^2 &= \frac{p^2 + r^2 - q^2}{2},\\[2pt]
c^2 &= \frac{q^2 + r^2 - p^2}{2}.
\end{aligned}
\]

The volume of the tetrahedron is one‑sixth of the volume of the parallelepiped spanned by vectors  
\(\vec{u} = (a,b,0)\), \(\vec{v} = (a,0,c)\), \(\vec{w} = (0,b,c)\):

\[
\det[\vec{u}\ \vec{v}\ \vec{w}] = \begin{vmatrix}
a & b & 0\\
a & 0 & c\\
0 & b & c
\end{vmatrix}
= a(0\cdot c - c\cdot b) - b(a\cdot c - c\cdot0) + 0 = -abc - abc = -2abc,
\]

so the absolute value is \(2abc\). Hence the tetrahedron volume is

\[
V = \frac{1}{6} \cdot 2abc = \frac{abc}{3}.
\]

Substituting the expressions for \(a,b,c\):

\[
abc = \sqrt{a^2 b^2 c^2}
= \sqrt{ \frac{p^2 + q^2 - r^2}{2} \cdot \frac{p^2 + r^2 - q^2}{2} \cdot \frac{q^2 + r^2 - p^2}{2} }
= \frac{ \sqrt{ (p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2) } }{ 2\sqrt{2} }.
\]

Therefore

\[
V = \frac{1}{3} \cdot \frac{ \sqrt{ (p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2) } }{ 2\sqrt{2} }
= \frac{ \sqrt{ (p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2) } }{ 6\sqrt{2} }.
\]

### Sanity check: regular tetrahedron

For a regular tetrahedron all edges are equal: \(p = q = r = a\). Then

\[
p^2+q^2-r^2 = a^2,\quad p^2+r^2-q^2 = a^2,\quad q^2+r^2-p^2 = a^2.
\]

The product is

---

### `cheap-b` (deepseek/deepseek-v4-flash)

The volume \(V\) of a disphenoid (isosceles tetrahedron) with opposite-edge lengths \(p, q, r\) is given by

\[
V = \frac{\sqrt{(p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2)}}{6\sqrt{2}}.
\]

**Derivation**  
Place the tetrahedron in a rectangular box with side lengths \(x, y, z\) using vertices  
\(A(0,0,0),\; B(x,y,0),\; C(x,0,z),\; D(0,y,z)\).  
Then the edge lengths are:  
\(AB = \sqrt{x^2+y^2}=p\), \(AC = \sqrt{x^2+z^2}=q\), \(AD = \sqrt{y^2+z^2}=r\),  
and opposite edges automatically match: \(CD = p\), \(BD = q\), \(BC = r\).  
The volume of this tetrahedron is  
\(V = \frac{1}{6}|\det(\vec{AB},\vec{AC},\vec{AD})| = \frac{xyz}{3}\).  
Solving \(p^2 = x^2+y^2,\; q^2 = x^2+z^2,\; r^2 = y^2+z^2\) gives  
\(x^2 = \frac{p^2+q^2-r^2}{2},\; y^2 = \frac{p^2+r^2-q^2}{2},\; z^2 = \frac{q^2+r^2-p^2}{2}\).  
Hence \(xyz = \sqrt{\frac{(p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2)}{8}}\), and  
\(V = \frac{xyz}{3} = \frac{\sqrt{(p^2+q^2-r^2)(p^2+r^2-q^2)(q^2+r^2-p^2)}}{6\sqrt{2}}\).

**Sanity check**  
For a regular tetrahedron \(p=q=r=a\):  
\((p^2+q^2-r^2)=a^2\) (same for the other factors), product \(=a^6\), \(\sqrt{a^6}=a^3\),  
so \(V = \frac{a^3}{6\sqrt{2}}\), which is the known formula.

---

### `frontier-d` (anthropic/claude-sonnet-4.6)

# Volume of a Disphenoid

## Setup and Coordinate Embedding

A disphenoid has three pairs of opposite edges with lengths p, q, r. A beautiful fact (established, not extrapolation) is that **every disphenoid can be embedded as a rectangular parallelepiped (box) with vertices at alternating corners**.

### The Embedding

Take a box with half-dimensions α, β, γ (so side lengths 2α, 2β, 2γ). Place it with center at the origin. The 8 corners split into two groups of 4 (like a 3D checkerboard coloring). Pick the group:

$$A = (\alpha, \beta, \gamma), \quad B = (-\alpha, -\beta, \gamma), \quad C = (-\alpha, \beta, -\gamma), \quad D = (\alpha, -\beta, -\gamma)$$

**Claim:** these four points form a disphenoid. Let me verify the edge lengths explicitly.

**Edge AB:**
$$|AB|^2 = (2\alpha)^2 + (2\beta)^2 + 0^2 = 4\alpha^2 + 4\beta^2$$

**Edge CD:**
$$|CD|^2 = (2\alpha)^2 + (2\beta)^2 + 0^2 = 4\alpha^2 + 4\beta^2 \checkmark \quad \text{(opposite edges equal)}$$

**Edge AC:**
$$|AC|^2 = (2\alpha)^2 + 0^2 + (2\gamma)^2 = 4\alpha^2 + 4\gamma^2$$

**Edge BD:**
$$|BD|^2 = (2\alpha)^2 + 0^2 + (2\gamma)^2 = 4\alpha^2 + 4\gamma^2 \checkmark$$

**Edge AD:**
$$|AD|^2 = 0^2 + (2\beta)^2 + (2\gamma)^2 = 4\beta^2 + 4\gamma^2$$

**Edge BC:**
$$|BC|^2 = 0^2 + (2\beta)^2 + (2\gamma)^2 = 4\beta^2 + 4\gamma^2 \checkmark$$

So the three opposite-edge-pair lengths are:
$$p^2 = 4(\alpha^2 + \beta^2), \quad q^2 = 4(\alpha^2 + \gamma^2), \quad r^2 = 4(\beta^2 + \gamma^2)$$

### Solving for α, β, γ

I need α², β², γ² in terms of p, q, r. From the system:

$$\alpha^2 + \beta^2 = \frac{p^2}{4}$$
$$\alpha^2 + \gamma^2 = \frac{q^2}{4}$$
$$\beta^2 + \gamma^2 = \frac{r^2}{4}$$

Add all three:
$$2(\alpha^2 + \beta^2 + \gamma^2) = \frac{p^2 + q^2 + r^2}{4}$$
$$\alpha^2 + \beta^2 + \gamma^2 = \frac{p^2 + q^2 + r^2}{8}$$

Subtract each original equation:

$$\gamma^2 = \frac{p^2 + q^2 + r^2}{8} - \frac{p^2}{4} = \frac{-p^2 + q^2 + r^2}{8}$$

$$\beta^2 = \frac{p^2 + q^2 + r^2}{8} - \frac{q^2}{4} = \frac{p^2 - q^2 + r^2}{8}$$

$$\alpha^2 = \frac{p^2 + q^2 + r^2}{8} - \frac{r^2}{4} = \frac{p^2 + q^2 - r^2}{8}$$

---

## Computing the Volume

### Volume of the Box

The box has side lengths 2α, 2β, 2γ, so:
$$V_{\text{box}} = 8\alpha\beta\gamma$$

### Fraction Occupied by the Disphenoid

The disphenoid occupies exactly **1/3** of the box volume. (Established result: the 4 "corner tetrahedra" cut away from the box are 4 right-angle corner tetrahedra. Each corner tetrahedron at a vertex of the box has legs along the box edges and occupies 1/6 of the box, and there are 4 of them — wait, let me be careful.)

**Careful derivation:** The box has 8 corners; 4 form the disphenoid, 4 are "cut off." Each cut-off corner is a right tetrahedron with legs 2α, 2β, 2γ... actually each cut-off tetrahedron has legs equal to the *full* box edge lengths. Let me be more explicit.

The 4 vertices not chosen are:
$$A' = (-\alpha,-\beta,-\gamma),\ B' = (\alpha,\beta,-\gamma),\ C' = (\alpha,-\beta,\gamma),\ D' = (-\alpha,\beta,\gamma)$$

Consider the corner of the box at $(\alpha, \beta, -\gamma)$ — that's $B'$. The three box edges from $B'$ connect to $A, C, D$ (the disphenoid vertices). The corner tetrahedron $B'\text{-}ACD$ is cut off.

Its volume:
$$V_{\text{corner}} = \frac{1}{6}|(\vec{B'A} \times \vec{B'C}) \cdot \vec{B'D}|$$

$$\vec{B'A} = (0, 0, 2\gamma), \quad \vec{B'C} = (-2\alpha, 0, 0), \quad \vec{B'D} = (0, -2\beta, 0)$$

$$\vec{B'A} \times \vec{B'C} = \begin{vmatrix}\mathbf{i} & \mathbf{j} & \mathbf{k} \\ 0 & 0 & 2\gamma \\ -2\alpha & 0 & 0\end{vmatrix} = (0 - 0)\mathbf{i} - (0-(-4\alpha\gamma))\mathbf{j} + (0-0)\mathbf{k} = -4\alpha\gamma\,\mathbf{j}$$

$$(\vec{B'A}\times\vec{B'C})\cdot\vec{B'D} = (-4\alpha\gamma)(−2\beta) = 8\alpha\beta\gamma$$

$$V_{\text{corner}} = \frac{1}{6}(8\alpha\beta\gamma) = \frac{4\alpha\beta\gamma}{3}$$

By symmetry, **all four corner tetrahedra have the same volume** $\frac{4\alpha\beta\gamma}{3}$.

Total removed: $4 \times \frac{4\alpha\beta\gamma}{3} = \frac{16\alpha\beta\gamma}{3}$.

$$V_{\text{disphenoid}} = V_{\text{box}} - V_{\text{removed}} = 8\alpha\beta\gamma - \frac{16\alpha\beta\gamma}{3} = \alpha\beta\gamma\left(8 - \frac{16}{3}\right) = \alpha\beta\gamma \cdot \frac{8}{3}$$

$$\boxed{V_{\text{disphenoid}} = \frac{8\alpha\beta\gamma}{3}}$$

This is exactly 1/3 of the box volume $8\alpha\beta\gamma$. ✓

### Substituting α, β, γ in terms of p, q, r

$$\alpha\beta\gamma = \sqrt{\alpha^2\beta^2\gamma^2} = \sqrt{\frac{(p^2+q^2-r^2)(p^2-q^2+r^2)(-p^2+q^2+r^2)}{8^3}}$$

$$= \frac{1}{8\sqrt{8}}\sqrt{(p^2+q^2-r^2)(p^2-q^2+r^2)(-p^2+q^2+r^2)}$$

So:
$$V = \frac{8}{3} \cdot \frac{1}{8\sqrt{8}}\sqrt{(p^2+q^2-r^2)(p^2-q^2+r^2)(-p^2+q^2+r^2)}$$

$$V = \frac{1}{3\sqrt{8}}\sqrt{(p^2+q^2-r^2)(p^2-q^2+r^2)(-p^2+q^2+r^2)}$$

Since $\sqrt{8} = 2\sqrt{2}$:

$$\Large\boxed{V = \frac{1}{6\sqrt{2}}\sqrt{(p^2+q^2-r^2)(p^2-q^2+r^2)(-p^2+q^2+r^2)}}$$

---

## Sanity Check: Regular Tetrahedron (p = q = r = a)

Substitute p = q = r = a:

Each factor in the product:
$$p^2 + q^2 - r^2 = a^2 + a^2 - a^2 = a^2$$
$$p^2 - q^2 + r^2 = a^2 - a^2 + a^2 = a^2$$
$$-p^2 + q^2 + r^2 = -a^2 + a^2 + a^2 = a^2$$

So the product is $(a^2)^3 = a^6$, and $\sqrt{a^6} = a^3$.

$$V = \frac{a^3}{6\sqrt{2}}$$

This matches the **known volume of a regular tetrahedron** with edge length $a$. ✓

---

## Summary of Key Steps and Where I Extrapolated

| Step | Status |
|------|--------|
| Embedding of disphenoid in a box | Established (classical result) |
| Edge-length calculations | Explicit algebra, verified |
| Solving α², β², γ² from p, q, r | Straightforward linear algebra |
| Corner tetrahedra volume calculation | Explicit via scalar triple product |
| Final formula | Derived, confirmed by sanity check |

The one "known fact" I used is that every disphenoid embeds in a rectangular box at alternating vertices — this is a classical and established result, not an extrapolation.

## Audit

This v1x artifact was produced by the panel-of-experts pattern (M3.28):
3 parallel witnesses across different model families (cheap × 2 from
deepseek family + frontier from anthropic family), then composed via
synthesizer (openai/gpt-5-mini). Per atom 0010, cross-family
witness disagreement IS the load-bearing signal — the synthesizer's
[CONSENSUS] / [DISAGREEMENT] / [UNIQUE-X] / [ERROR] tags surface it
for downstream audit.

The raw witness texts are preserved above so callers can verify the
synthesizer didn't introduce its own claims beyond what witnesses said.
