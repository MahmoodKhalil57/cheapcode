# EXPERIMENT-2 — N=30 canonical-corpus measurement, pre-registered for whitepaper (2026-05-04)

**Status:** pre-registered. Kill-criteria + numeric predictions written BEFORE any dispatch. Atom 0013 calibration-as-credential — pre-registration IS the credential, regardless of outcome.

**Substrate:** Khazīna atom 0011 (smallest-distinguishing-experiment-first), atom 0013 (calibration-as-credential), atom 0007 (anti-fab — predictions are claims subject to the same audit), atom 0015 (transfer-overstated-by-default — predictions deliberately conservative). Mizaj rule 01 (falsifier-first), rule 11 (cite-the-illah on every claim), rule 14 (substrate-bounded confidence).

**Gates this unlocks (if PASS):** the whitepaper draft proposed 2026-05-04 lifts from ~0.45 venue-fit at workshop level to ~0.70+. The N=12-only state cannot pass workshop review for a "substrate-disciplined agent" claim; N=30 on a recognized corpus crosses the publishability floor.

**Gates this closes (if FAIL):** the "at-least-as-correct as frontier" claim at sub-floor @0.80 in [`PLAN.bn`](PLAN.bn) Section JJ drops to daif. The whitepaper pivots from "we are cheaper at parity" to "we are cheaper but not yet at parity" — still publishable, but as cost-engineering not agent-capability.

---

## Question

On a pre-registered N=30 slice of SWE-bench-Verified (full agent loop, not diagnose-only) plus N=20 of GAIA Level-1 as triangulation, does cheapcode's substrate-disciplined harness simultaneously:

- **Match correctness:** completion rate ≥ 0.85× frontier-tier baseline (i.e. no more than 15% absolute drop)
- **Dominate cost:** cost-per-task ≤ 0.30× baseline (3× cheaper or better, consistent with N=12 sahih)
- **Maintain bcmea-discipline:** zero detected fabrications under atom-0007 9-axis anti-fab guard

vs. raw single-call frontier-tier baseline on the same task set?

The 0.85 correctness floor (NOT 1.0×, NOT 1.10× as in EXPERIMENT-1) is deliberate — atom 0015 transfer-overstated already fired on the strictly-more-correct claim at @0.20. Predicting parity-or-better at this stage would re-fire it.

## Pre-registered numeric predictions

Locked 2026-05-04 BEFORE any dispatch. Each prediction is a falsifiable claim subject to atom-0007 anti-fab on the back-end (we cannot retroactively edit).

### SWE-bench-Verified-full N=30

| Metric | Predicted value | 95% CI envelope | Falsifier |
|---|---|---|---|
| cheapcode completion rate | 0.40–0.55 | ±0.18 (binomial at N=30) | observed < 0.30 → FAIL |
| frontier-tier baseline completion rate | 0.55–0.70 | ±0.17 | observed > 0.80 → recalibrate |
| ratio (cheapcode / baseline) | 0.75–0.95 | — | observed < 0.65 → parity claim daif |
| cost ratio (cheapcode / baseline) | 0.10–0.25 | — | observed > 0.40 → cost-dominance daif |
| latency ratio (cheapcode / baseline) | 0.80–1.40 | — | observed > 1.80 → "faster on average" claim daif |
| anti-fab firings on cheapcode output | 0 | — | observed ≥ 1 → bcmea-discipline claim daif |

### GAIA Level-1 N=20 (triangulation)

| Metric | Predicted value | Falsifier |
|---|---|---|
| cheapcode completion rate | 0.30–0.45 | observed < 0.20 → triangulation FAIL |
| ratio vs baseline | 0.70–0.95 | observed < 0.55 → cross-corpus generalization daif |
| cost ratio | 0.10–0.25 | observed > 0.40 → cost-dominance not generalizing |

### Ablation: substrate-on vs substrate-off (same N=30 SWE-bench)

| Metric | Predicted delta | Falsifier |
|---|---|---|
| (substrate-on − substrate-off) completion rate | +0.03 to +0.12 pp | observed ≤ 0 → substrate is decoration, not lift |
| substrate-on cost overhead vs off | +5% to +20% | observed > +50% → substrate not worth runtime cost |

**Why these specific bands?** Anchored to: N=12 paired observation (1W/0L/9T/1BF on hard reasoning), SWE-bench-Verified frontier-tier published rates (Claude 3.7 ~70%, GPT-4o ~38%, our baseline likely between), atom-0015 firing history on transfer claims, and EXPERIMENT-1's PASS-EXPECTED outcome on cost-dominance. We deliberately did NOT predict cheapcode beats frontier — predicting parity-or-better at this evidence level would itself fire atom 0015.

## Procedure

1. **Pin baseline** (no dispatch yet): document model versions, harness commit, prompt templates, evaluation script. Lock these in `runs/experiment-2-attempt-1/lock.md` before any tokens flow.
2. **Run baseline on N=30 SWE-bench-Verified slice**: raw single-call frontier-tier (GPT-5.5 or Claude Opus 4.7, operator picks one — both not needed). Record per-task pass/fail + cost + latency.
3. **Run cheapcode-substrate-off arm on same N=30**: the wrapper without atom-0022 stewardship pre-gate, atom-0023 perturbation, atom-0007 anti-fab guard active. Otherwise identical pipeline.
4. **Run cheapcode-substrate-on arm on same N=30**: full substrate primitives active.
5. **Run GAIA Level-1 N=20** (substrate-on only, no ablation needed for triangulation): record same metrics.
6. **Compute** the seven ratios in the prediction tables. Compare each to its pre-registered band. Each metric independently PASSES, MATCHES (within band), or FAILS.

**Order of execution matters:** baseline first (anchors cost normalization), then substrate-off (controls for harness vs. discipline), then substrate-on (the headline claim). GAIA last as triangulation.

## Pre-registered kill-criteria for whitepaper-publishability

| Outcome | Definition | Whitepaper implication |
|---|---|---|
| **PASS-WORKSHOP** | All 6 SWE-bench predictions land within their bands; GAIA cost-ratio + completion-ratio land within band; substrate-on ablation shows ≥ +0.03 pp lift | Whitepaper proceeds to TMLR or NeurIPS workshop submission with ~0.70 venue-fit confidence |
| **PASS-NARROW** | 4-5 of 6 SWE-bench predictions in band, no full-FAILs (any band exceeded by < 50%) | Whitepaper proceeds with narrowed claims; the off-band metrics get explicit limitations sections |
| **PARTIAL** | Cost-dominance holds but correctness ratio < 0.65, OR vice versa | Whitepaper pivots: title becomes "Cost-Dominance Without Capability Loss on Easy Shapes" or similar narrowed framing. Still publishable as cost-engineering paper. |
| **FAIL-CORRECTNESS** | Correctness ratio < 0.65 on both corpora | The "at-least-as-correct" claim collapses. Whitepaper held; pivot to either (a) restrict to a sub-shape where parity holds or (b) drop the agent-capability framing entirely and ship as "substrate-discipline pattern" methodology paper without empirical headline. |
| **FAIL-COST** | Cost ratio > 0.40 on both corpora | The cost-dominance N=12 result didn't generalize. The whole project thesis re-opens. Halt before any whitepaper draft. |
| **FAIL-FAB** | ≥ 1 anti-fab firing on cheapcode-substrate-on output | bcmea-discipline claim falsified at the moment it most needs to hold. Investigate the firing; do not submit until root-caused. |

## Cost / time budget

- Wall-clock: ≤ 8 hours (60 SWE-bench task-runs × ~5 min + 20 GAIA × ~3 min + analysis)
- Spend: ≤ **$45** total. Breakdown:
  - Baseline N=30 SWE-bench at frontier-tier: ~$15–20
  - cheapcode substrate-off N=30: ~$5–8
  - cheapcode substrate-on N=30: ~$5–8
  - GAIA N=20 substrate-on: ~$3–5
  - Buffer: $5
- This aligns with operator's stated $30-60 envelope. If actual spend > 1.3× budget, halt and triage before continuing arms.

## Pre-registration receipt

Atom 0013 demands the pre-registration is committed BEFORE dispatch and never re-edited. The numeric bands above are locked. If they prove too narrow or too wide post-hoc, that calibration error is ITSELF a finding for the whitepaper — atom 0013 says calibration accuracy is the credential, not prediction accuracy.

```
bun ~/apps/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="EXPERIMENT-2 pre-registered: N=30 SWE-bench + N=20 GAIA + ablation, locked 2026-05-04" \
  --body="Pre-registration committed pre-dispatch. Numeric bands in plan/EXPERIMENT-2.md sections 'Pre-registered numeric predictions'. Atom 0013 receipt — the predictions become evidence-of-calibration regardless of PASS/FAIL outcome."
```

## Artifacts

- `runs/experiment-2-attempt-1/lock.md` — frozen environment + harness commit + prompt templates
- `runs/experiment-2-attempt-1/baseline-frontier.jsonl` — per-task metrics
- `runs/experiment-2-attempt-1/arm-substrate-off.jsonl`
- `runs/experiment-2-attempt-1/arm-substrate-on.jsonl`
- `runs/experiment-2-attempt-1/gaia-substrate-on.jsonl`
- `runs/experiment-2-attempt-1/predictions-vs-observed.md` — table of all 9 predictions, each marked WITHIN-BAND / OUT-OF-BAND-LOW / OUT-OF-BAND-HIGH
- `runs/experiment-2-attempt-1/verdict.md` — outcome citation per kill-criteria + Model Card framing (Mitchell et al. 2019), feeds whitepaper draft

## Out of scope

- SWE-bench-full (the 2,294-task set) — N=30 slice is the cheapest-distinguishing experiment per atom 0011; full set is post-acceptance work.
- METR HCAST and OSWorld — separate experiments. EXPERIMENT-2 is deliberately scoped to two corpora to keep budget bounded.
- Beating frontier-tier on correctness — we predicted parity-with-floor (0.75-0.95 ratio), not dominance. Beating-frontier on correctness is a SEPARATE claim requiring a SEPARATE pre-registration.

## Halt conditions

- **Mid-experiment:** if baseline arm produces correctness < 0.30 on N=15 (way under predicted 0.55-0.70 floor), the corpus or harness has a bug. Halt; investigate before running cheapcode arms.
- **Post-experiment:** if FAIL-CORRECTNESS or FAIL-COST fires, no whitepaper draft until the failure is root-caused and a follow-up experiment scoped. Atom 0007 anti-fab — submitting on falsified base claims is fabrication.
- **Mizaj rule 01:** if any of the 9 predictions land OUT-OF-BAND in a direction that contradicts the project's load-bearing claims (correctness floor breach, cost ratio inversion, fab firing), the project re-opens its thesis BEFORE drafting the whitepaper. The pre-registration's value is precisely that the falsifier was specified before the data — honor it.

## Why this experiment unlocks publishability

Workshop reviewers (TMLR, NeurIPS Agents/Evals, ICLR Reproducibility) reward two things substrate-discipline naturally provides: (a) pre-registered predictions with explicit bands, (b) honest reporting of the failure modes the predictions allow. EXPERIMENT-2's structure — predictions locked, kill-criteria specified, ablation isolated, two corpora for cross-witness — IS the methodology contribution. The empirical result is the headline; the methodology is the durable contribution.

Per atom 0013: a paper that pre-registers predictions and reports OUT-OF-BAND results honestly is MORE publishable at calibration-aware venues than a paper that quietly tunes predictions post-hoc to land WITHIN-band. The predictions above are conservative enough to likely land but explicit enough that calibration-failure is itself reportable.
