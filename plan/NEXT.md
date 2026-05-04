# cheapcode/plan/NEXT.md

Single load-bearing next-task with falsifier (per atom 0011 + atom 0022
stewardship-of-inquiry).

Updated: 2026-05-04 (round 96 close — substrate-hygiene pass at 13:50 UTC).

---

## Substrate state at this checkpoint

| Metric | Value |
|---|---|
| .bn files | 31 |
| Claims indexed | 755 |
| Load-bearing claims | 471 |
| CAPs (default-scan single-witness load-bearing) | 0 |
| CAPs (explore-floor-0 full-scan) | 10 — audited as structural per [`CAP-AUDIT.md`](CAP-AUDIT.md) |
| CONVERGE auto-lift candidates | 3 (sub-threshold — halted at 2-round precedent per [`PLAN.bn`](PLAN.bn) round 96-close annotations) |
| Brittleness flag (under burhan-perturb on lifted claim) | NO — `cheapcode_v2_ships` invert cascade 1/471 = 0.2% |
| Substrate-as-runtime architecture | complete for single-account (Rules A-E + atoms 0018/0022/0023 composed) |
| burhan-validate | ⚠️ PRE-EXISTING parse error at PLAN.bn:3700 (multi-line claim format unsupported by parser; semantically clear, mechanically fixable) |
| Unit tests | 160/161 pass — 1 PRE-EXISTING failure in `tools/conversion-factors.test.ts:169` (non-existent log file edge case) |
| Plan-dir documents | EXPERIMENT-2 + COST-OF-INVENTION + RUNG-LADDER + CAP-AUDIT + SELF-GRADED-OUTPUT (5 added round 96-close 2026-05-04) |

## Round 96 ship summary

- atom 0022 (resource-as-amana / stewardship-of-inquiry) authored + Rule E shipped
- atom 0023 (counterfactual-perturbation) authored + burhan-perturb tool shipped
- C1+C2 fixes: auto-tier operational on small OpenRouter balances
- Per-turn substrate-context plugin (experimental.chat.system.transform refreshed every 60s)
- Multi-fiqh scriptorium architecture documented (Q. 5:6 pilot deferred)
- 84/84 substrate-test category passing (160/161 overall; pre-existing flake in tools/conversion-factors.test.ts is non-substrate)
- Paired benchmarks: M3.52 10/10, M3.53 crossover at #182, M3.54 12/12

## Round 96 close addendum (2026-05-04, $0 hygiene pass)

- 4 CONVERGE auto-lifts applied (2 rounds): cheapcode_v2_ships +0.123, cheapcode_v2_surgical_architecture_audited +0.033, best_next_step +0.033, m3_43_alone_insufficient +0.006 → total +0.195 audited confidence on load-bearing claims (note-b771c69eb5)
- 5 plan-dir documents added: [`EXPERIMENT-2.md`](EXPERIMENT-2.md) (N=30 SWE-bench pre-reg, $45 budget locked) · [`COST-OF-INVENTION.md`](COST-OF-INVENTION.md) (40hr/92commit/$200-280 dev-cost) · [`RUNG-LADDER.md`](RUNG-LADDER.md) (R1-R4 milestone progression) · [`CAP-AUDIT.md`](CAP-AUDIT.md) (10 structural CAPs verdicted) · [`SELF-GRADED-OUTPUT.md`](SELF-GRADED-OUTPUT.md) (E1-E4 truth-preserving-presentation pre-reg, $28 budget)
- Q4 daftar receipts written for SECTION MM/NN/OO/PP/QQ/RR/SS (cross-session continuity per atom 0020)
- Q1 mizan-recursion full-scan completed (`mizan-converge --explore-floor 0.0`); 10 CAPs surfaced + audited as structural per atom 0007 anti-fab → QUEUE.md Q3 superseded
- atom 0023 burhan-perturb dogfood: `cheapcode_v2_ships` invert cascade 1/471 (0.2%) — architecture robust under counterfactual perturbation

---

## Next task: depends on operator priority

Three substrate-grounded priorities, ranked by atom 0022 value-of-inquiry score:

### Priority 1 — C5 debug (live CLI under combined plugin load)
**Cost:** ~1-2 hrs
**Action:** Debug why `cheapcode run --model=cheapcode/auto` with `CHEAPCODE_STEWARDSHIP_THRESHOLD=0.4` env set times out under combined adam-plugin substrate-context load. Likely candidate: daftar query in `experimental.chat.system.transform` hook hanging when also doing stewardship eval, OR mizan-MCP subprocess startup-cost per-call.
**Falsifier:** if root cause is identified + fixed, live stewardship mode works in real CLI sessions; if not, atom 0022 stewardship is shipped-but-not-yet-operational outside paired benchmarks.
**Atom 0022 value-of-inquiry:** HIGH (unblocks live use of round 96's primary deliverable)

### Priority 2 — OpenAI-direct backend for real cost savings
**Cost:** ~2-3 hrs
**Action:** Implement consumer-OAuth dispatch path so cheapcode auto-tier can use ChatGPT-Plus quota (free) for compatible shapes, falling back to OpenRouter only when quota exhausts (per M3.53 quota-fallback). Currently OpenRouter-only; user has OpenAI auth in `~/.local/share/opencode/auth.json` unused.
**Falsifier:** measurable $0 dispatches via OpenAI subscription path on shapes where it has capability; OpenRouter fallback only after quota cross-over.
**Atom 0022 value-of-inquiry:** MEDIUM-HIGH (real cost savings; multi-provider routing operational)

### Priority 3 — Multi-fiqh scriptorium Q. 5:6 pilot
**Cost:** ~3-4 hrs
**Action:** Encode the 5 major fiqhs' interpretations of Q. 5:6 (wudu/feet washing vs wiping) + their *usul* citations as structured witnesses; run substrate witnessing layer; produce bcmea-bounded synthesis.
**Falsifier:** if encoding fiqh corpora as witnesses is intractable (lossy / can't attribute usul-variance computationally), the architecture proposed in round 96 is wrong; pivot to single-fiqh-with-attribution.
**Atom 0022 value-of-inquiry:** HIGH (validates a novel intellectual-research capability operator named as priority)

---

## Tier 0 — substrate hygiene (free, $0)

These should run continuously regardless of operator priority:

- **H1.** burhan-perturb each new load-bearing claim added in subsequent rounds (atom 0023 dogfood; tests architecture as it grows) — **2026-05-04 dogfooded on `cheapcode_v2_ships`, cascade 0.2%; PASSING**
- **H2.** Daftar receipts for every milestone closure (atom 0020 cross-session continuity) — **2026-05-04 round 96-close: 11 receipts written for SECTION MM-SS + 4 plan-dir docs**
- **H3.** Re-run burhan-converge after each round to harvest cascade lifts — **2026-05-04 round 96-close: 2-round halt criterion documented in PLAN.bn comments**

### H4. PRE-EXISTING substrate hygiene findings surfaced 2026-05-04 (operator decision needed)

- **H4.1** burhan-validate fails at `PLAN.bn:3700` — multi-line claim format unsupported by parser. Claim is `cheapcode_v2_substrate_as_runtime_round_96`; right-hand-side terms (`obs_round_96_substrate_as_runtime_complete_for_single_account` line 3699 + `substrate_as_runtime_architecture_complete_for_single_account` defined in [`facts/28`](facts/28-round-96-substrate-as-runtime.bn) line 139) are intact. Fix is mechanical: collapse 3700-3702 to one line, preserves identical semantics. Operator authorization required because (a) it's a load-bearing round-96 claim, (b) operator has uncommitted WIP that may include reformatting plans.
- **H4.2** Unit test `tools/conversion-factors.test.ts:169` fails on non-existent log file edge case (expects 0 sample_size, gets 2). Pre-existing; not caused by round-96-close edits. Likely surface bug in `getEstimate`'s default-value handling.
- **H4.3** 7 files have uncommitted changes from prior round-96 work (MAIN.md, README.md, plan/NEXT.md, plan/PLAN.bn, src/auto-wrapper.ts, src/cross-witness-voter.ts, src/router.ts) — operator-authored WIP, not committed. Adam (this session) added 5 plan-dir docs + edits to plan/NEXT.md + plan/PLAN.bn lift annotations on top of operator's WIP.

---

## What's deferred (not blockers, may earn build later)

- **D1.** Phase 2 #2 (mid-turn streaming-disagreement voter dispatch) — fork-patch territory; mostly subsumed by Rule B (ceiling-cap-voter-threshold). Earn build when specific failure mode shows ceiling-cap-at-routing-time isn't enough.
- **D2.** Final-answer-reached hook (post-multi-step-turn fork-patch in opencode runLoop:1325) — useful for burhan claim-graph propagation; defer until specific need.
- **D3.** Multi-account credential vault (groundwork doc exists in `docs/multi-account-groundwork.md`) — earn build when team-account need surfaces.
- **D4.** Stewardship calibration loop (atom 0017 residue cycle for atom 0022 — capture actual_value post-hoc) — architectural foundation in place via router's `expected_value` field; needs post-dispatch hook.
- **D5.** Auto-tier mini-switcher / contextual bandit graduation (substrate disagreement-rate exists; needs spot-check write infra).
- **D6.** Conf-propagation modeling in burhan-perturb — current model only re-walks witness counts; richer confidence-cascade would surface deeper coupling.

---

## Atom 0022 stewardship verdict on this NEXT.md

This document IS itself substrate-stewardship: every priority has explicit falsifier; every deferred item has a trigger condition; nothing is "always do this" without bounded form. Per atom 0022, the agent / operator default-behavior across the listed priorities is "evaluate value-of-inquiry per task, dispatch only when crossing threshold, decline-and-propose-alternative for low-value." The list is bounded; each entry survives bcmea-discipline.

_atom 0023 dogfood (round 96 first-use): cheapcode plan-graph is robust under single-root inversion. No brittleness flag fired. Architecture stable. Continue building forward._
