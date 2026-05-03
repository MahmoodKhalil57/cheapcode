# cheapcode-witness artifact — q2-primes-n2-plus-1 (v1x panel-of-experts)

**Date:** 2026-05-03T11:19:41.448Z
**Cost:** $0.01917 | **Latency:** 43.9s (synth 24.4s)

## Question

Is it known whether there are infinitely many primes of the form n^2 + 1, where n is a positive integer? Specifically: is the question (a) settled with a proof of infinitude, (b) settled with a proof that the count is finite, or (c) an open problem? If open, name the famous list this problem belongs to and cite the strongest partial result known. If you do not know, say so explicitly rather than guessing.

## Synthesized artifact

[CONSENSUS]
- The statement "Are there infinitely many primes of the form n^2+1?" is an open problem (answer (c)). (A, B, D)
- This is one of Landau's four problems (the n^2+1 problem / Landau's fourth problem). (A, B, D)
- No proof is known either that there are infinitely many such primes or that only finitely many exist. (A, B, D)
- The strongest proved partial result is due to Henryk Iwaniec (1978): there are infinitely many integers n for which n^2+1 has at most two prime factors (often stated as infinitely many n with n^2+1 a P2-number / semiprime-type result). (A, B, D)

[DISAGREEMENTS]
- None of substance. A, B, D agree on status, Landau membership, and the Iwaniec partial result.

[UNIQUE-A]
- (none substantial beyond the consensus statements)

[UNIQUE-B]
- (none substantial beyond the consensus statements)

[UNIQUE-D]
- Explanation that sieve methods hit a "parity problem" obstruction which currently prevents upgrading P2 results to infinitely many primes.
- Explicit mention of the asymptotic-sieve methods as the technique behind Iwaniec's result.
- Heuristic (Bateman–Horn / Hardy–Littlewood style) asymptotic prediction:
  # {n ≤ x : n^2+1 prime} ~ C · √x / ln x,
  and an attempted explicit Euler-product constant and numeric value (see Errors below).

[ERROR]
- D's wording: D calls the Iwaniec conclusion "semiprime" and then parenthetically "a product of at most two primes." Strictly speaking, "semiprime" usually means exactly two prime factors (counted with multiplicity), while Iwaniec proved a P2 (≤2 prime factors) statement. This conflation is imprecise. (A used "product of two primes (i.e., has at most two prime factors)" — also imprecise phrasing but intention is to convey the P2 result.)
- D's explicit Euler-product formula and the numeric value for the Bateman–Horn/Hardy–Littlewood constant are given in a form that appears misstated or inconsistent with standard references; the heuristic asymptotic shape is correctly cited, but the displayed product and the quoted numeric 1.3863 should be verified against a standard source before use.

[CONFIDENCE SUMMARY]
- Sahih (high confidence, unanimous): The problem is open; it is Landau's fourth problem; Iwaniec (1978) proved infinitely many n with n^2+1 having ≤2 prime factors. 
- Hasan (moderate confidence, supported by some but not all specifics): The explanation that sieve methods face a parity problem (D supported; A/B implied via "advanced sieve methods"). The attribution of "asymptotic sieve" to Iwaniec is plausible and consistent with literature but was explicitly named only by D.
- Daif (low confidence, needs verification / contradicted or only singly stated): D's explicit Euler-product formula and numeric value for the Bateman–Horn constant (quote and product should be checked in a reference).

## Witness texts (full)

### `cheap-a` (deepseek/deepseek-v4-flash)

The question of whether there are infinitely many primes of the form \(n^2 + 1\) (with \(n\) a positive integer) remains an **open problem**. It is one of the four **Landau problems** (specifically the fourth one), which are considered classic unsolved questions in number theory.

The strongest known partial result is that there are infinitely many integers \(n\) such that \(n^2 + 1\) is either prime or a product of two primes (i.e., has at most two prime factors). This was proved by **Henryk Iwaniec** in 1978 using advanced sieve methods. No proof is known for the infinitude of primes themselves, nor has it been shown that there are only finitely many.

Thus, the correct answer is **(c) an open problem**.

---

### `cheap-b` (deepseek/deepseek-v4-flash)

The question is an open problem; it is one of Landau's four problems. The strongest known partial result is that there are infinitely many integers \(n\) such that \(n^2+1\) is either prime or a product of two primes (i.e., a \(P_2\) number), proved by Henryk Iwaniec in 1978.

---

### `frontier-d` (anthropic/claude-sonnet-4.6)

## Answer

### Status: Open Problem

The question of whether there are infinitely many primes of the form $n^2 + 1$ (where $n$ is a positive integer) is **definitively unsettled — it is an open problem (option c)**. This is established mathematical knowledge, not extrapolation.

---

### Why It's Open

To prove infinitely many primes of the form $n^2 + 1$, one needs a polynomial $f(n) = n^2 + 1$ that takes prime values infinitely often. The core difficulty is that sieve methods — the primary tool for such problems — are powerful enough to show that $n^2 + 1$ has infinitely many values with **at most a bounded number of prime factors**, but not to pin down the case of exactly one prime factor (i.e., the value itself being prime). This is sometimes called the **parity problem** in sieve theory.

---

### Famous List

This problem appears on **Landau's Problems**, presented by Edmund Landau at the 1912 International Congress of Mathematicians in Cambridge. The four problems are:

1. **Goldbach's conjecture** — every even integer $> 2$ is a sum of two primes.
2. **Twin prime conjecture** — infinitely many primes $p$ such that $p + 2$ is also prime.
3. **Legendre's conjecture** — there is always a prime between $n^2$ and $(n+1)^2$.
4. **Infinitely many primes of the form $n^2 + 1$.**

All four remain open.

---

### Strongest Partial Result

The strongest known partial result is due to **Henryk Iwaniec (1978)**:

> There are infinitely many positive integers $n$ such that $n^2 + 1$ is either prime or a **semiprime** (a product of at most two primes).

More precisely, Iwaniec proved using the **asymptotic sieve** (a refinement of the Brun/Selberg sieve) that $n^2 + 1$ is a $P_2$ number (at most 2 prime factors counted with multiplicity) for infinitely many $n$. This is the closest anyone has come to the full conjecture.

**Heuristic support:** The Hardy–Littlewood conjecture (Conjecture F / a special case of the Bateman–Horn conjecture) predicts the asymptotic count of such primes:

$$\#\{n \leq x : n^2 + 1 \text{ is prime}\} \sim C \cdot \frac{\sqrt{x}}{\ln x}$$

where $C = \prod_{p \text{ odd prime}} \left(1 - \left(\frac{-1}{p}\right)\frac{1}{p-1}\right) \approx 1.3863\ldots$

This heuristic is widely believed but unproven.

---

### Summary

| Status | Answer |
|--------|--------|
| Settled (infinitely many)? | **No** |
| Settled (finitely many)? | **No** |
| Open problem? | **Yes** |
| Famous list | **Landau's Problems (1912)** |
| Best partial result | **Iwaniec (1978): infinitely many $n$ with $n^2+1$ having at most 2 prime factors** |

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
