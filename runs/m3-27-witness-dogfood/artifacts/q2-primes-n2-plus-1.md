# cheapcode-witness artifact — q2-primes-n2-plus-1

**Date:** 2026-05-03T11:03:29.390Z
**Grade:** `daif` (mizaj 14: sahih > hasan > daif)
**Cost:** $0.00564 | **Latency:** 61.5s | **Escalated:** true

## Question

Is it known whether there are infinitely many primes of the form n^2 + 1, where n is a positive integer? Specifically: is the question (a) settled with a proof of infinitude, (b) settled with a proof that the count is finite, or (c) an open problem? If open, name the famous list this problem belongs to and cite the strongest partial result known. If you do not know, say so explicitly rather than guessing.

## Aggregated answer (daif)

**Full text:**

Short answer: the question is open.

Reasoning and context, briefly:
- It is not known whether infinitely many primes are of the form n^2+1. This is one of Landau’s four problems (posed 1912).
- Heuristics (Bateman–Horn / Schinzel’s Hypothesis H) predict infinitely many and give an asymptotic, but these conjectures are unproven.
- Strong unconditional partial results: Iwaniec showed that n^2+1 takes infinitely many values having only a bounded number of prime factors (almost-primes; P_2-type results). Friedlander and Iwaniec (1998) proved the striking related result that there are infinitely many primes of the form a^2 + b^4, but that does not settle n^2+1 itself.

References: Landau’s problems; Bateman–Horn and Schinzel’s Hypothesis H (conjectural); H. Iwaniec on almost-primes represented by quadratic polynomials; J. Friedlander & H. Iwaniec, "Using a parity-sensitive sieve to count primes of the form a^2 + b^4" (Annals of Math., 1998).

Answer: (c)

## Witness trace

### 1. `cheap-a`

- **Extracted answer:** `(c) an open problem; it belongs to Landau's problems; the strongest partial result is that there are infinitely many integers \(n\) such that \(n^2+1\) has at most two prime factors (Iwaniec, 1978)`
- **Tail (last 100 chars):** `re infinitely many integers \(n\) such that \(n^2+1\) has at most two prime factors (Iwaniec, 1978).`

### 2. `cheap-b`

- **Extracted answer:** `(c) open problem; it belongs to Landau's problems; the strongest partial result is that there are infinitely many integers \(n\) such that \(n^2+1\) is either prime or a product of two primes (Iwaniec, 1978)`
- **Tail (last 100 chars):** ` many integers \(n\) such that \(n^2+1\) is either prime or a product of two primes (Iwaniec, 1978).`

### 3. `smart-c`

- **Extracted answer:** `the question is open`
- **Tail (last 100 chars):** ` parity-sensitive sieve to count primes of the form a^2 + b^4" (Annals of Math., 1998). ⏎  ⏎ Answer: (c)`

## Audit

This artifact was produced by `tools/cheapcode-witness.ts` via the cheapcode cross-witness voter (M3.18). Per atom 0010, the witness disagreement (or convergence) IS the load-bearing signal. Per atom 0007 (anti-fabrication), the witness votes carried in this artifact are inspectable; downstream callers should not treat the answer as load-bearing unless the grade matches their confidence threshold.

- `sahih` = both cheap witnesses converged independently → highest confidence
- `hasan` = cheap pair disagreed; smart escalation produced a 2-of-3 majority → moderate confidence
- `daif` = no convergence (or single-witness-rescue with low confidence) → consume only as a starting point for further inquiry
