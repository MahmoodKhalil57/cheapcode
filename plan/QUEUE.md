# cheapcode/plan/QUEUE.md

Adam-structural transfer 2026-05-03 (per SECTION SS): explicit next-task
ranking by atom-0011 cost + confidence-lift envelope. Replaces ad-hoc
operator-prompted "what's next?" with substrate-grounded queue.

Each task names its cost class, expected lift, and falsifier per atom
0011 (smallest-distinguishing-experiment) + atom 0007 (anti-fab via
artifact verification).

---

## Tier 0 — free ($0)

### Q1 — Mizan-recursion (E5 from SECTION SS)
- **Cost:** $0
- **Action:** run `mizan-verify` against every load-bearing claim in
  cheapcode plan-graph (~349 claims). Collect bcmea-violations + sole-
  witness over-confidence + no-witness gaps. Surface unknown CAPs the
  operator and Claude haven't explicitly considered.
- **Lift:** unknown — atom 0017 unknowns-as-positive-data; the residue
  IS the value.
- **Falsifier:** scan returns 0 new findings beyond what mizan-converge
  surfaced → no marginal value.

### Q2 — Apply CONVERGE auto-lifts
- **Cost:** $0
- **Action:** apply `cheapcode_v2_ships` lift (@0.45 → @0.575) and
  `cheapcode_v2_surgical_architecture_audited` lift (@0.85 → @0.875)
  per mizan-converge output.
- **Lift:** +0.125 + 0.025 on two load-bearing claims.
- **Falsifier:** lift formulas mis-apply (mizan output is the audit
  trail; manual cross-check verifies).

### Q3 — Fix remaining 9 CAP findings
- **Cost:** $0
- **Action:** wire second-witness compositions for `cheapllm_*_anchor`,
  `iai_router_pattern_anchor`, `mizaj_substrate_anchor`,
  `khatim_negative_knowledge_anchor`, plus 4 bcmea-derived CAPs in
  SECTION NN. Use existing fact-files as second witnesses where
  available.
- **Lift:** removes mizan CAP findings; preserves @>=0.99 declared
  ceilings.
- **Falsifier:** mizan-converge still flags the claim after wiring.

### Q4 — Daftar receipts for SECTION OO/PP/QQ/RR/MM/NN/SS milestones
- **Cost:** $0 (modulo daftar tool invocation time)
- **Action:** write daftar receipts for each major SECTION addition
  this session (2026-05-03). Future adam compact passes will re-anchor
  without conversation context.
- **Lift:** continuity across sessions; no claim-graph confidence change.
- **Falsifier:** receipts not written → next adam compact reports same
  M3.33 as last known measurement.

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

Last updated: 2026-05-03 (cheapcode session, adam-structural-transfer round).
