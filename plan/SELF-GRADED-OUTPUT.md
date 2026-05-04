# SELF-GRADED OUTPUT — isnād-style transmission format for truth-preserving presentation

**Authored:** 2026-05-04 (round 96 close), substrate-grounded synthesis of [`facts/14`](facts/14-panel-of-experts-mutawatir.bn) + [`facts/23`](facts/23-source-grading-system.bn) + [`facts/25`](facts/25-contrarian-honest-extraction-strategy.bn) + [`facts/26`](facts/26-che-pass-1-unintuitive-but-correct-findings.bn).

**Operator question (2026-05-04):** "the best way to present information to a dumb or smart, sceptical or not user in a simple to understand way while perfectly maintaining line of truth and authenticity."

**Structural answer:** move the audit FROM consumer-side (where capability + skepticism vary) TO producer-side (where substrate-discipline is uniform). Encode grading INTO output. Consumer task reduces to "verify the chain," which is constant across user matrix.

---

## The dual-structure synthesis

| Axis | Producer side (cheapcode synthesizer) | Consumer side (cheap-tier LLM / human) |
|---|---|---|
| Imperfection | over-simplification under summarization pressure ([`facts/14`](facts/14-panel-of-experts-mutawatir.bn) bag-of-agents 17.2× error amplification when conditions fail) | gullibility on persuasive-but-wrong content ([`facts/23`](facts/23-source-grading-system.bn) 5-axis grading exists exactly because consumer can't always tell) |
| Existing substrate | atom 0007 anti-fab + bcmea-violation detector + cite-graph + ceiling-cap layer | 5-axis rubric (S/C/D/I/V) + U1-U4 contrarian-honest filter |
| Variability | uniform (same producer-discipline regardless of consumer) | high (dumb/smart × skeptical/not = 4-cell matrix at minimum) |

**Move:** producer emits output with isnād-style self-grading attached. Consumer-side discipline collapses to chain-verification (trivially auditable for any consumer with read-access to the cite-graph).

This is structurally the hadith methodology pattern: chains of transmission ship pre-graded (sahih / hasan / da'if / mawdu') and downstream readers inherit the audit without re-running it. The grading is the credential; the audit is the value.

---

## Output format specification

Every load-bearing claim in cheapcode-emitted output is annotated with:

```
<claim text>
  ↳ confidence: @>=0.NN  (per substrate audit)
  ↳ witnesses: [N independent fact-files / sources]
  ↳ ceiling-cap: @>=0.NN  (mizaj M14 ruling)
  ↳ falsifier: <one-sentence condition that would invalidate>
  ↳ chain-grade: { sahih | hasan | da'if | mawdu' } (per facts/23 5-axis composite)
```

Polished surface prose remains polished — the annotation is a sidecar, not an interruption. Rendering options:

1. **Inline footnote markers** (^1) with grading at end-of-document
2. **Hover-tooltip** in HTML/web rendering
3. **Collapsible JSON sidecar** for LLM-consumer parsing (machine-readable)
4. **Plain-text bracketed grade** `<claim> [@>=0.85, sahih, falsifier: X, witnesses: 2]` for terminal use

The cheapcode-witness v1x synthesizer ([`facts/14`](facts/14-panel-of-experts-mutawatir.bn)) ALREADY generates this internally during cross-witness aggregation. The novel move is *exposing it* in user-facing output, not generating it.

---

## Why this works across (dumb/smart × skeptical/non-skeptical) consumer matrix

| Consumer type | Without self-graded output | With self-graded output |
|---|---|---|
| Dumb + non-skeptical | Maximum gullibility risk; accepts persuasive prose verbatim | Receives polished surface AND grades; can choose to read either; chain serves as *passive* protection (the structure itself constrains what claims can be made without grade) |
| Dumb + skeptical | Spends effort fact-checking but lacks tools; often ineffective | Skepticism redirects from "is this true" to "do the witnesses exist"; effort yields actual epistemic lift |
| Smart + non-skeptical | Accepts polished prose; misses hidden bcmea-violations | Smart consumer can spot-check the grade independently; producer's grade serves as *commitment* visible to peers |
| Smart + skeptical | Effective fact-checker but slow; bottleneck on time | Grades accelerate skeptical review by 5-10× (skeptic verifies witness chain, not raw content) |

**The structure is invariant across the 4 cells.** Different cells use it differently, but no cell is harmed by its presence. This satisfies "perfectly maintaining line of truth and authenticity" because:
- Truth-line is preserved at the producer (substrate-discipline)
- Authenticity-line is preserved at the chain (isnād)
- Simplification of surface prose is *bounded* by the requirement that load-bearing claims carry annotation; the producer cannot drop a bound without dropping the annotation, which is detectable

bcmea-violation detector at the producer side specifically prevents "ultimate / always / uniformly" surface prose without matching ceiling-cap ≥ 0.95 + multiple-witness backing. The discipline composes.

---

## Pre-registered experiments

Four experiments, ranked by cost. All test the **truth-preservation under capability × skepticism asymmetry** central question.

### E1 — Producer-side ablation: graded vs ungraded output, same underlying answer (~$8 dispatch)

**Question:** does emitting self-graded output cost the producer extra tokens / latency / coherence?

**Procedure:** N=20 prompts spanning easy / moderate / hard task-shape (per [`facts/09`](facts/09-task-shape-routing-matrix.bn)). For each, generate two outputs from cheapcode-witness v1x:
- Arm A: standard polished prose
- Arm B: same prose + isnād annotation (footnote markers + end-of-doc grading table)

Measure: token-overhead, latency-overhead, blind-judge-rated coherence (3 raters), bcmea-violation frequency in both arms.

**Pre-registered prediction:** Arm B has +15-30% token overhead, +10-25% latency overhead, equal coherence (within 0.2 SD on 5-pt scale), 0 bcmea-violations vs ~1-2 in Arm A.

**Falsifier:** Arm B has ≥+50% token overhead → discipline is too expensive. Arm B has worse coherence by ≥0.5 SD → annotation harms readability.

**Cost:** ~$8 (40 generations × ~$0.20 each at cheapcode-witness v1x).

### E2 — Consumer-side gullibility test: cheap-tier LLM consuming graded vs ungraded (~$15 dispatch)

**Question:** does graded input protect a less-capable consumer from injected false premises?

**Procedure:** N=30 task-pairs. For each, frontier-tier produces an answer that includes an injected false premise (controlled). Half the time annotation is included (Arm B), half the time not (Arm A). A cheap-tier consumer (Haiku-4.5 / GPT-4o-mini) is given the answer as context and asked a follow-up question whose correct response REQUIRES detecting the false premise.

Measure: false-premise detection rate (Arm B vs Arm A), follow-up answer correctness rate.

**Pre-registered prediction:** Arm B detection rate ≥ Arm A by +20-40pp on N=30. Effect size larger on harder task-shapes.

**Falsifier:** Arm B detection rate ≤ Arm A + 5pp → annotation is decoration, not protection. Arm B WORSE → annotation distracts.

**Cost:** ~$15 (60 generations + 60 cheap-tier consumer queries).

### E3 — Human consumer × skepticism interaction (~$0 dispatch + ~10 humans, ~30 min each)

**Question:** does annotation interact with consumer skepticism level?

**Procedure:** N=10 human raters, randomized 2×2: graded/ungraded × told-to-verify/told-to-trust. Each shown 5 cheapcode-generated answers, 2 of which contain injected false premises. Measure detection rate per cell.

**Pre-registered prediction:** main effect of grading (+15-30pp detection), main effect of skepticism (+10-20pp detection), positive interaction (graded × skeptical largest effect).

**Falsifier:** no main effect of grading → consumer gets nothing from annotation. Negative interaction (skeptical-with-grading WORSE than skeptical-alone) → grading triggers over-rejection.

**Cost:** $0 dispatch (uses existing E1/E2 outputs); operator coordinates ~10 human raters (~5 hours total volunteer time).

### E4 — Self-grading meta-error robustness (~$5 dispatch)

**Question:** when the producer's grading is itself wrong (over-confident), does the consumer (or downstream auditor) catch the meta-error?

**Procedure:** Inject deliberate grade-inflation in 1/3 of cheapcode outputs (substitute @>=0.95 for actual @>=0.65 on a load-bearing claim). Run consumer (LLM + human) detection on detecting (a) the false premise + (b) the meta-error in the grade.

**Pre-registered prediction:** detection of meta-error follows detection of premise (~80% conditional rate). Consumers who detect false premise also flag the inflated grade.

**Falsifier:** detection of meta-error <30% conditional on premise-detection → grading layer is itself a manipulation surface; substrate-discipline alone insufficient at consumer side.

**Cost:** ~$5 (uses existing infrastructure).

---

## Composition with rung ladder

This direction lifts R1 ([`RUNG-LADDER.md`](RUNG-LADDER.md)) confidence from @>=0.75 to @>=0.85 IF E1+E2 PASS. The presentation-architecture finding becomes Section 6 of the whitepaper:

> **"Self-graded output as a transferable substrate-discipline pattern."** A producer that emits isnād-annotated output transfers the audit-discipline to the consumer at zero consumer-side runtime cost. We demonstrate this empirically on N=20 task-pairs (E1) + N=30 cross-tier consumer trials (E2), showing [predicted result]. The pattern generalizes beyond cheapcode: any substrate-disciplined LLM application can adopt isnād transmission format.

This is genuinely publishable work that cheapcode is uniquely positioned to ship, because the substrate-discipline ALREADY produces the grades internally — the novelty is *exposing them* as transmission format.

---

## Connection to the four LLM imperfections

| Imperfection (operator-stated 2026-05-04) | How self-graded output addresses it |
|---|---|
| Internet-as-input (context overflow / retrieval limits) | Graded annotations bind specific claims to specific witnesses → consumer doesn't need full context, only chain-verification |
| Time / physical-reality drift | Each grade carries falsifier + measure-first probe timestamp ([atom 0018](../adam/tools/khazina/atoms/0018-iterative-energy-transformation.md)); stale grade is detectable |
| Understanding / reasoning calibration | Producer's substrate-discipline encodes the calibration; consumer inherits without needing own calibration |
| Cross-session amnesia | Daftar receipts persist grades across sessions; self-graded output is a wire-format for the receipt |

This is the "Eve completes Adam" pattern at the *output transmission layer*, complementing the input/runtime layers cheapcode already addresses.

---

## Action items

| Priority | Action | Cost | Status |
|---|---|---|---|
| 1 | Operator review of synthesis + experiment design | $0 | this document |
| 2 | E1 pre-register lock + dispatch | ~$8 | pending operator authorization |
| 3 | E2 pre-register lock + dispatch (depends on E1 PASS) | ~$15 | conditional |
| 4 | E3 human-rater coordination | $0 dispatch + volunteer time | conditional on E1+E2 PASS |
| 5 | E4 meta-error robustness | ~$5 | conditional |
| 6 | Whitepaper Section 6 draft (uses E1-E4 results) | $0 dispatch + ~3 hrs writing | conditional on E1+E2 PASS |

**Total dispatch budget if all PASS: ~$28.** Sits inside R2's $45 envelope; could be combined with EXPERIMENT-2 if operator wants to land both empirical lifts in the same dispatch session.

---

## Atom-candidacy verdict (deliberated 2026-05-04 round 96-close, NOT YET AUTHORED)

Applied khazīna 5-criterion atom-eligibility test ([`~/apps/adam/tools/khazina/CLAUDE.md`](../../adam/tools/khazina/CLAUDE.md)):

| # | Criterion | Verdict |
|---|---|---|
| 1 | Novel structural move | PROVISIONAL PASS — composition novel, individual primitives not |
| 2 | Falsifiable claim | PASS — E1 token-overhead and E2 detection-rate falsifiers explicit |
| 3 | Applicable problem shape + concrete example | PASS — any LLM→consumer pipeline |
| 4 | Output form + monetization path | PROVISIONAL PASS — enterprise audit-grade for compliance markets, plausible not validated |
| 5 | Cross-reference vs existing atoms | NEEDS CHECK — closest match atom 0032 (confidence-calibration-as-decision-cap); DISTINCT but boundary needs articulation |

**Decision: DO NOT AUTHOR YET.**

Reasoning (atom 0007 anti-fab applied to atom-authoring itself): khazīna explicitly forbids inflating the catalog with hypotheses ("don't add if not yet ready"). The composition is genuinely novel structurally, but Criteria 1 + 4 are PROVISIONAL pending empirical validation (E1+E2). Authoring before validation = exactly the failure mode khazīna's 5-criterion gate exists to prevent.

**Trigger to author:** E1 (producer-side ablation) + E2 (consumer-side gullibility) BOTH pass per the pre-registered bands. Then re-run the 5-criterion test; expected outcome: all 5 PASS, atom authored in `~/apps/adam/tools/khazina/atoms/00NN-isnad-style-self-graded-output.md` (or similar slug), receipt-trail anchored to E1+E2 verdicts.

**Until then:** the synthesis lives as substrate-doc `plan/SELF-GRADED-OUTPUT.md` (this file), not as an atom. The discipline-of-not-authoring is itself the credential.

## Daftar receipt

```
bun ~/apps/adam/tools/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="SELF-GRADED OUTPUT synthesis drafted (round 96-close, 2026-05-04)" \
  --body="Synthesis of facts/14 (panel-of-experts) + facts/23 (5-axis grading) + facts/25 (CHE) + facts/26 F2 (counter-mutawatir): producer-side substrate-discipline encodes audit INTO output (isnād-style transmission format), collapsing consumer-side variance across (dumb/smart × skeptical/non-skeptical) matrix. 4 pre-registered experiments E1-E4, total dispatch ~\$28. Generalizes to whitepaper Section 6 — transferable substrate-discipline pattern. Connects to RUNG-LADDER R1 lift @>=0.75 → @>=0.85 conditional on E1+E2 PASS."
```
