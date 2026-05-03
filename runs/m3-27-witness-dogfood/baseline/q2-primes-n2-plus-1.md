# Q2: Are there infinitely many primes of the form n² + 1?

**My answer (Claude Opus 4.7, written 2026-05-03 BEFORE running cheapcode-witness):**

**Status: OPEN PROBLEM.** It is not known whether there are infinitely many primes of the form n² + 1. This is one of Landau's four problems (stated by Edmund Landau at the 1912 ICM as problems "unattackable by present-day mathematics") — alongside Goldbach's conjecture, the twin prime conjecture, and the conjecture that there is always a prime between n² and (n+1)².

**What IS known:**
- Iwaniec (1978) showed that there are infinitely many n such that n² + 1 has at most two prime factors (i.e., is either prime or a product of two primes).
- Friedlander & Iwaniec (1998) proved a similar result with sharper bounds for primes representable as a² + b⁴.
- The expected asymptotic density (Hardy–Littlewood conjecture F): the number of primes p ≤ N of the form n² + 1 is asymptotically ~(C·√N) / log N for an explicit constant C ≈ 0.6864...

**What is NOT known:** Whether the count is even unbounded.

**Why the test matters here:** the question has a known correct answer ("open problem; conjectured but unproven"). If cheapcode's voter says definitively "yes, infinitely many" or "no, finitely many," it has hallucinated. If it says "open / unknown / Landau's problem," it has correctly identified the structure of the answer. This tests whether voter handles **negation-of-knowledge** (we don't know) cleanly vs over-asserting.

**Confidence:** sahih on the meta-answer ("this is an open problem"). Specific names (Iwaniec dates, exact density constant) are hasan — I'm pulling from memory and could be off by a year or a digit.
