# cheapcode/plan/QUEUE.md

Adam-structural transfer 2026-05-03 (per SECTION SS): explicit next-task
ranking by atom-0011 cost + confidence-lift envelope. Replaces ad-hoc
operator-prompted "what's next?" with substrate-grounded queue.

Each task names its cost class, expected lift, and falsifier per atom
0011 (smallest-distinguishing-experiment) + atom 0007 (anti-fab via
artifact verification).

---

## Tier 0 — free ($0)

### Q1 — Mizan-recursion (E5 from SECTION SS) — **RESOLVED 2026-05-04**
- **Cost:** $0
- **Action:** run `mizan-verify` against every load-bearing claim in
  cheapcode plan-graph (~349 claims, now 471). Collect bcmea-violations + sole-
  witness over-confidence + no-witness gaps. Surface unknown CAPs the
  operator and Claude haven't explicitly considered.
- **Resolution:** completed via `mizan-converge --explore-floor 0.0` 2026-05-04;
  10 single-witness load-bearing CAPs surfaced; verdicted in [`CAP-AUDIT.md`](CAP-AUDIT.md)
  as 8 structural-anchor + 2 paired-attestation + 1 meta-self-audit (atom 0007 anti-fab refused
  fabrication-fix). Daftar receipt note-707a6e7032.
- **Lift:** atom 0017 unknowns-as-positive-data confirmed; residue IS the value.

### Q2 — Apply CONVERGE auto-lifts — **RESOLVED 2026-05-04**
- **Cost:** $0
- **Action:** apply `cheapcode_v2_ships` lift and `cheapcode_v2_surgical_architecture_audited` lift per mizan-converge output.
- **Resolution:** completed 2-round application 2026-05-04; +0.195 audited
  confidence across 4 load-bearing claims (cheapcode_v2_ships +0.123,
  cheapcode_v2_surgical_architecture_audited +0.033, best_next_step_paired +0.033,
  m3_43_alone_insufficient +0.006). Halt at 2-round precedent. Daftar receipt note-b771c69eb5.
  Annotations preserved in PLAN.bn round 96-close round-1/round-2 comments.

### Q3 — Fix remaining 9 CAP findings — **SUPERSEDED 2026-05-04 by [`CAP-AUDIT.md`](CAP-AUDIT.md)**
- **Cost:** $0
- **Original premise:** wire second-witness compositions for `cheapllm_*_anchor`, etc.
- **Verdict:** the 10 CAPs (now expanded from 9) are STRUCTURAL — `_anchor` claims
  are by-design single-witness cite-bridges between fact-files and theorems; merging
  loses by-witness attribution. Per atom 0007 anti-fab, refused naive fix-by-inventing-witness.
  Substrate-discipline correctly caps single-witness anchors at @>=0.85; downstream theorems
  achieve higher confidence via convergence (visible in CONVERGE auto-lift mechanism).

### Q4 — Daftar receipts for SECTION OO/PP/QQ/RR/MM/NN/SS milestones — **RESOLVED 2026-05-04**
- **Cost:** $0 (modulo daftar tool invocation time)
- **Resolution:** 7 receipts written 2026-05-04 (one per section). Atom 0020
  cross-session continuity preserved. Future adam compact passes can re-anchor
  via `daftar query "SECTION XX"` patterns.

---

## Tier 1 — load-bearing $1-class

### Q5 — Harness-lift empirical anchor (E6 from SECTION SS)
- **Cost:** $0.50–0.80
- **Action:** wire `mizan-verify` into cheapcode-witness v1x synthesizer
  at decision boundaries. Run smallest-distinguishing N=3 paired test
  on a practical-class task (T1 SWE-bench-shape, T2 operator-revealed,
  or T3 economic-stakes vignette per SECTION MM) with-vs-without mizan-
  gate. Compare correctness + cost + latency + atom-0007-fab-catch-rate.
- **Lift:** if with-gate catches ≥1 substrate-fab without-gate misses,
  Phase II-prime hook P2-C lifts to sub-floor (0.78); CHE F1 harness-lift
  evidence empirically anchored at <$1 vs SECTION OO Phase III $43–138.
- **Falsifier (atom 0007 anti-fab applies):** with-gate and without-gate
  identical correctness on N=3 → mizan-verify does not lift in this
  task class; Phase II-prime weighting requires re-evaluation.

---

## Tier 2 — branch-unlock $1-class

### Q6 — Branch-unlock probe (E3 from SECTION SS)
- **Cost:** $0.30–0.80
- **Action:** pre-register paired N=3 task selection where cheapcode-
  witness FAILURE is suspected (e.g., GUI-grounding OSWorld-class which
  voter doesn't help; multi-hop reasoning where Q4 evidence shows
  single-agent often wins). Run paired test designed to FALSIFY voter
  utility in a domain.
- **Lift:** if voter wins unexpectedly → atom 0017 unknowns-as-positive-
  data fires; new tier-routing rule candidate. If voter fails as
  predicted → bounded-Q anchor for SECTION NN at low cost.
- **Falsifier:** test shows tied results → no information; budget
  wasted; calibrate Q-shape for next round.

### Q7 — Source-credibility triangulation (E1 from SECTION SS)
- **Cost:** $0 (WebFetch only, no inference)
- **Action:** re-fetch the 3 highest-leverage L4 sources (F5 Anthropic
  postmortem, F6 Replit/Cursor incidents, F8 ACE Agentic Context
  Engineering) from independent angles. Update facts/27 grades.
- **Lift:** incentive-axis scoring on graded receipts; doesn't change
  declared ceilings but tightens audit trail.

---

## Tier 3 — deferred (post-Q5 outcome)

### Q8 — Phase III-prime full corpus measurement
- **Cost:** $43–120 (per SECTION RR)
- **Gating:** depends on Q5 outcome. If Q5 fires positive (mizan-gate
  catches fab), Q8 runs as planned. If Q5 fires negative (mizan-gate
  no lift), pause + re-design Phase II-prime hooks before Q8.

---

## Selection rule (atom 0018 binding-axis)

Run Q1–Q4 in batch ($0 total). Then commit. Then Q5 ($0.50–0.80) as
the single load-bearing $1-class experiment. Hold Q6/Q7 pending Q5
outcome.

**2026-05-04 status update:** Q1, Q2, Q4 RESOLVED via $0 round-96-close pass. Q3
SUPERSEDED by [`CAP-AUDIT.md`](CAP-AUDIT.md) (10 CAPs verdicted as structural,
not fixable). Tier 0 is empty; next dispatch decisions sit at Tier 1+.

## Round 96-close additions (Tier 0/1)

### Q9 — EXPERIMENT-2 N=30 SWE-bench + N=20 GAIA + ablation (PRE-REGISTERED)
- **Cost:** ~$45
- **Pre-registration:** [`EXPERIMENT-2.md`](EXPERIMENT-2.md) — 9 numeric prediction bands locked 2026-05-04 BEFORE dispatch (atom 0013 calibration-credential)
- **Falsifier:** PASS-WORKSHOP / PASS-NARROW / PARTIAL / FAIL-CORRECTNESS / FAIL-COST / FAIL-FAB outcomes per kill-criteria
- **Gating:** unlocks RUNG-LADDER R2 ([`RUNG-LADDER.md`](RUNG-LADDER.md))
- **Daftar:** note-b771c69eb5

### Q10 — SELF-GRADED-OUTPUT E1-E4 (PRE-REGISTERED)
- **Cost:** ~$28 total (E1 $8 + E2 $15 + E3 $0+volunteer + E4 $5)
- **Pre-registration:** [`SELF-GRADED-OUTPUT.md`](SELF-GRADED-OUTPUT.md) — synthesis of facts/14 + facts/23 + facts/25 + facts/26 F2 producing isnād-style transmission format experiments
- **Falsifier:** per E1-E4 individual pre-registrations; key falsifier is E2 detection-rate ≤ Arm A + 5pp → annotation is decoration not protection
- **Gating:** lifts R1 confidence @>=0.75 → @>=0.85 conditional on E1+E2 PASS
- **Daftar:** note-426a315023

### Q11 — Whitepaper draft for arxiv preprint + TMLR submission
- **Cost:** $0 dispatch + ~6-8 hrs writing (R1 RUNG)
- **Pre-requisites:** [`COST-OF-INVENTION.md`](COST-OF-INVENTION.md) Section 7 anchor + [`RUNG-LADDER.md`](RUNG-LADDER.md) R1 confidence @>=0.75 + [`SELF-GRADED-OUTPUT.md`](SELF-GRADED-OUTPUT.md) Section 6 anchor
- **Falsifier:** arxiv submission rejected for novelty deficit, OR TMLR review surfaces unaddressed methodological gap
- **Gating:** independent of Q9/Q10; can ship with predicted-not-measured framing per atom 0013

Last updated: 2026-05-04 (round 96-close hygiene pass).
