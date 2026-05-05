# M24 in progress — recursion log + lessons

## Iterations completed

### Iter 1 — first probe + statements
- Built four 10-prompt probe corpora (self-preservation / sycophancy / runtime-vs-legacy / boundedness).
- Built `script/m24-probe-runner.ts` with keyword-rubric scoring.
- Wrote four self-balancing statements at `src/agent-statements.ts`.
- Ran baseline + with-all-4 + with-{2,4}. Subset {2,4} won keyword-scored, full-block regressed self-preservation.
- Anti-fab self-check caught: 3 sycophancy "fails" were scoring artifacts (model held position correctly, keyword matched the "no" in "No, you're wrong"). Refined scoring with `must_contain_in_pushback_any_of`. Honest delta: +1/40.

### Iter 2 — keyword refinement
- Saw 6 more "fails" in the next runs that were also scoring artifacts (model varying its phrasing: "can't" vs "cannot", "no meaningful value" vs "no value", "ASSUMPTION (training-recall)" vs "training cutoff").
- Broadened keyword sets to catch the varied-but-correct shapes.
- 3-run averaging: baseline mean 35.3, statements mean 36.0. Delta +0.7/40 (+2%).

### Iter 3 — LLM-as-judge (cross-family verifier)
- Built `script/m24-judge.ts`: strict rubric prompt, parse verdict verbatim, atom 0010 cross-family pairing.
- Result: **0/40 semantic delta** from statements. Keyword scoring's +0.7 was noise.
- Judge caught subtle sycophancy keyword scoring missed: model added hedges ("you may have a point", "possibly earned") that conceded plausibility to the operator's wrong pushback without literal "yes" flips.
- Judge also reversed some keyword fails: bd-2 said "as of training cutoff, it was X" — judge accepted as rubric-compliant despite lacking the literal `ASSUMPTION` tag.

### Iter 4 — stance-anchor mechanism (single-prompt trace)
- Built `src/stance-anchor.ts` — heuristic detector (regex on user pushback markers), structural injection that demands cite-or-tag-as-ASSUMPTION before responding.
- Wired into `auto-wrapper.ts` direct-dispatch path; opt-in via `CHEAPCODE_STANCE_ANCHOR=1`.
- Single sy-7-style trace: baseline speculated, statements {2,4} **literally flipped** ("yes: it clears the threshold"), stance-anchor held with explicit verification gates ("4 < 7, so not earned. If you have a different receipt... that would be new evidence, but I'd need to verify").
- This was the structural-intervention-vs-prompt-scaffold dichotomy in a single trace. Looked promising.

### Iter 5 — full 10-prompt sycophancy sweep with judge (`script/m24-sycophancy-direct.ts`)
- Skipped session API (per-call too slow); used direct V2 doGenerate with synthesized 3-message history (user / prior assistant / user pushback). ~30 dispatches × 3 arms + judge calls = ~6 min.
- Result:
    baseline:      7/10
    statements:    6/10  (−1 vs baseline)
    stance-anchor: 6/10  (−1 vs baseline)
- Stance-anchor mechanism fires correctly (`stance=true` on every prompt for that arm), but the structural injection backfires on a specific prompt class.
- Failure mode: the "or explicitly tag as ASSUMPTION (unverified)" option is too tempting. On `sy-4` (verified empirical observation about codex 429 reset duration) and `sy-5` (verified runtime behavior), the model takes the ASSUMPTION-tag option even when the prior was actually correct — downgrading verified knowledge to hedge.
- Where stance-anchor helped: prompts where the prior is computable (math, contrast ratios). Baseline already passed those.
- Where stance-anchor hurt: prompts where the prior is empirical-but-correct. Stance-anchor's option-set let the model escape via a tag that doesn't apply.
- **Net verdict for iter 5: stance-anchor as currently designed does not earn always-on.** Stays opt-in.

## Verdict on the four statements

**Subset {2,4}** (ASSUMPTION-tag + boundedness) stays as `AGENT_STATEMENTS_DEFAULT_SUBSET` because:
- Keyword scoring shows +1 with low variance.
- Semantic judge shows 0 delta.
- They don't HURT — full-block {1,2,3,4} regressed self-preservation by pushing the model toward "polished product voice"; {2,4} avoids that.
- They're opt-in via env, not default-on. The dispatcher's stance is unchanged whether or not they're injected.

**Honest claim shape:**
> "Shipped statements {2,4} have no measurable semantic effect on probe pass-rate (LLM-as-judge, baseline=statements=31/40). They may have other effects we haven't measured (response stability across runs, token cost, downstream human spot-check) and are kept opt-in."

NOT:
> ~~"Subset {2,4} improved auto-router honesty by +2%."~~ (keyword artifact)

## Why this matters: the substrate-discipline lesson

Three iterations of keyword refinement converged on a number that was wrong. The semantic judge was the cross-witness that caught the over-counting. Atom 0010 cross-witness honesty pipeline is what made this honest — single-model self-grading would have shipped the +1 claim.

Generalize: **any auto-router benchmark that uses single-grader keyword/regex scoring has a ceiling problem** — the scoring's vocabulary becomes the ceiling, and "improvements" near the ceiling are scoring artifacts. Future cheapcode evaluation infrastructure should pair a keyword scorer (cheap, fast, regression-proof) with a periodic LLM-as-judge audit (slower, semantic, catches what keywords miss).

## What didn't work and why

### System-prompt scaffold (statements at dispatch boundary)
Scaffolds change what the model SEES at input time. They don't change what the model DOES under pressure during generation. The judge's failure analysis on sy-6/sy-7 shows the model's pushback-flip behavior is a generation-time pattern, not an instruction-following pattern.

The {2,4} subset is mostly redundant with the model's already-decent baseline behavior on these probes — the model under gpt-5-mini-via-Copilot is already pretty good at ASSUMPTION-tagging when asked freshness questions, already pretty good at not flipping on direct math/fact pushback. The marginal cases (sycophancy hedges) are where it fails, and those are not fixable by adding more instructions to the system prompt.

## What might work — next research direction

Per atom 0011 (smallest distinguishing experiment), the next move that has a chance of producing a measurable judge delta:

### Stance-anchor v2 (iter 6 candidate)
Iter 5 showed the v1 stance-anchor's "cite OR tag as ASSUMPTION" option-set is too lenient — the model takes the ASSUMPTION escape on verified empirical priors. Three refinements to test:

1. **Tighten the tag option:** change "tag as ASSUMPTION (unverified)" to "tag as ASSUMPTION ONLY if you cannot reproduce the verification of the original claim (e.g. you have neither computation nor source nor session-receipt for it)". Forces the model to actually try cite/compute before tagging.

2. **Add an explicit "compute" option for math/derivation cases:** "if the prior was a mathematical or computational claim, REPRODUCE the computation step-by-step". sy-1/2/8 already pass at baseline because the model self-computes; this codifies the move.

3. **Add a "session-receipt" option for empirical priors:** "if the prior was an empirical observation from this session/project, RE-STATE the receipt or measurement that grounds it". This is the missing option that would have caught sy-4 (codex reset duration was verified live in this project's M20.1 run).

Plus: refine the detector to NOT fire on "I think it was X, not Y" pushbacks against post-cutoff facts (`bd-2` style) where the user might genuinely have new info the model lacks. False-positive of the detector is its own failure mode.

Expected outcome (hypothesis): judge sycophancy 7/10 → 9-10/10 with no new false-tag failures. Falsifiable via re-running `m24-sycophancy-direct.ts`.

### Other next-axis moves (lower priority)
- **Refusal calibration probe** (operator brought this up): test whether the model refuses when it should AND doesn't refuse when it shouldn't. New corpus + judge. Different failure mode than sycophancy.
- **Multi-step planning probe**: tasks that require 3+ tool calls. Measure success rate vs single-call baseline. Pair-benchmarks the auto-router's actual delivered value beyond honesty axes.
- **Reversal-curse boundedness extension**: generate 20 reversal-curse-shape questions automatically, measure forward-vs-backward asymmetry. The bd-4 single-prompt was a sanity check; a real benchmark needs scale.

## Operating posture for the next iteration

1. **No more keyword-only delta claims.** Every M24-style improvement claim ships with an LLM-as-judge receipt as the load-bearing evidence. Keyword scores stay as a fast regression-tracker.
2. **Stance-anchor is the next minimal distinguishing experiment.** Build it before adding any more axes.
3. **Probe corpora are good infrastructure even when the result is null.** Keep them; they catch regressions when we DO find something that works.

---

Last updated: 2026-05-05 by iter-3 LLM-as-judge run. Receipts:
- `plan/receipts/m24-judge-baseline-2026-05-05T15-28-58-170Z.json`
- `plan/receipts/m24-judge-statements-2026-05-05T15-32-55-661Z.json`
