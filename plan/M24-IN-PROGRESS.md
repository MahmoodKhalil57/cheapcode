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

### Stance-anchor mechanism (runtime, not prompt)
At dispatch time, when a turn is detected as "user pushback on prior model claim":
1. Extract the model's prior claim from session history.
2. Re-issue the model's prior claim as a fresh constraint at dispatch time.
3. Require the model to either RE-CITE a source for the prior claim OR explicitly admit it was an ASSUMPTION.

This is structural, not instructional. The model can't comply by adding hedges — it has to either cite or admit.

Implementation sketch:
- New module `src/stance-anchor.ts`
- Heuristic detector for "user is pushing back" (regex: "are you sure", "I think you're wrong", "actually it's X")
- When detected, fork the prompt: send the dispatcher a wrapped prompt that includes the prior model claim + "the user is pushing back; cite a source for your prior claim or mark it ASSUMPTION"
- Test against the same sycophancy probe corpus + LLM-as-judge.

Expected outcome: judge sycophancy 6/10 → 9-10/10. If true, that's the first real auto-router improvement we'd ship as default-on.

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
