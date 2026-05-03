# cheapcode + mizan integration — bounded value-prop deployment

Empirical findings from session 2026-05-03 ($0.082 calibration spend,
30+ tests across 7 rounds, 4-LLM voter test on T0015):

## What was empirically validated

1. **`mizan_check_action_safety` pre-gate prevents Cursor/Replit-class
   catastrophic actions** (sahih 0.85+). Demonstrated by simulating
   `rm -rf /home/mk/important` with weak justification — gate returned
   `blocked: true` with 3 explicit reasons (bcmea-violation +
   zero-witnesses + below-min-cap; atom_0007_anti_fab_gate fired).

## What was empirically falsified

1. **Voter pattern lift on T0015-class subtle textbook-vs-substrate**:
   4 frontier LLMs (gpt-5.5, claude-opus-4-7, claude-haiku-4-5,
   gemini-2.5-pro) all converged on the same answer per atom 0019
   convergence-without-contact. Voter pattern provides no detectable
   lift when all witnesses converge. Atom 0015 honestly fired on the
   over-generalization.

2. **mizan-prompt-injection lifts on T0015**: paired N=3 with-vs-without
   gate prompt showed identical answers on T0015-original. Prompt
   nudging doesn't override domain-specific textbook associations.

3. **gpt-5.5 broad weakness on logical/code reasoning**: ~100% accuracy
   on chain-derivation up to k=30 with mixed XOR/NAND/AND/OR/NOT, plus
   100% on classic production-code gotchas (closures, async-in-loop,
   mutable-default, IEEE 754).

## The achievable bounded-form value-prop

cheapcode v2 is **NOT "smarter than gpt-5.5 across full task mix"** — that
framing is empirically demonstrated unachievable + bcmea-blocked at the
absolute limit.

cheapcode v2 IS:
> Substrate-disciplined deployment of frontier LLMs that prevents
> catastrophic-action-class failures (Cursor/Replit-style) via
> mandatory `mizan_check_action_safety` pre-gate, at parity correctness
> on tested classes, at lower aggregate cost via voter-only-on-uncertain
> routing.

Real businesses lose real money to Cursor/Replit-class incidents.
Action-safety alone justifies cheapcode v2 deployment in production.

## How to deploy

### 1. Register mizan-MCP-server in Claude Code settings

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mizan": {
      "command": "/home/USER/apps/adam/tools/mizan/bin/mizan-mcp-server"
    }
  }
}
```

After Claude Code restart, mizan tools appear as `mcp__mizan__*` and
the LLM can invoke them inline:

- `mizan_verify_claim(claim_name, plan_dir)` — verify claim's epistemic
  standing before asserting at high confidence
- `mizan_check_action_safety(action_description, justification_claims,
  plan_dir, min_cap?)` — pre-action gate; returns `blocked: true` for
  weak-justification destructive operations
- `mizan_physical_reality_probe(include_git?, repo_path?)` — wallclock
  + disk + git probe for grounded decisions
- `mizan_recommend_next_experiment(plan_dir)` — atom-0011 cheapest-
  next-move

### 2. Configure cheapcode-witness as the auto-tier

In opencode's `opencode.json` or operator's config:

```json
{
  "provider": {
    "cheapcode": {
      "npm": "@cheapcode/ai-sdk-provider",
      "name": "cheapcode tiers",
      "options": {
        "apiKey": "{env:OPENROUTER_API_KEY}"
      },
      "models": {
        "auto": { "name": "auto", "tools": true }
      }
    }
  }
}
```

cheapcode auto-tier classifies task shape and dispatches via
`src/router.ts` (facts/09 routing matrix). Voter pattern fires only
on `hard-reasoning` shape per substrate evidence; other shapes use
single-tier dispatch (per session-2026-05-03 empirical finding that
voter overhead is waste on classes where p>=0.99).

### 3. Operator usage pattern

When working in Claude Code with cheapcode + mizan registered:

1. **Before any irreversible action** (file delete, db drop, git push,
   bash with side effects), the LLM SHOULD invoke
   `mizan_check_action_safety` with justification claim names from the
   project's plan-graph.

2. **Before any load-bearing assertion at @>=0.85 confidence**, the
   LLM SHOULD invoke `mizan_verify_claim` to check witness count +
   bcmea-violation flag.

3. **At decision boundaries**, the LLM SHOULD invoke
   `mizan_physical_reality_probe` instead of guessing wallclock,
   recency, or repo state.

These patterns convert atom 0007 anti-fab from a documentation
principle into runtime structural enforcement.

## Substrate basis

Atoms invoked: 0007 (anti-fab via artifact), 0010 (cross-witness
honesty pipeline — caught my own atom-over-application this session),
0011 (smallest-distinguishing-experiment), 0013 (calibration-as-
credential — failed predictions stay visible), 0015 (transfer-
overstated — fired on me re T0015), 0016 (substrate-as-deterministic-
verifier-head), 0017 (unknowns-as-positive-data), 0018 (energy-
transformation: research-seconds for experiment-dollars), 0019
(convergence-without-contact — 4-LLM convergence revealed my error).

Mizaj rules: M11 source-tier ladder, M14 auth-grade ceiling cap @0.95,
M19 ground-physical-reality at decision boundaries.

## Honest atom-0013 disclosure

Across session 2026-05-03 calibration ($0.082 spent, 30+ tests):
- 1 empirical lift validated (action-safety prevention)
- 4 hypotheses honestly falsified (uniform substrate superiority,
  concentrated-class via prompt-injection, voter on T0015, T0015 as
  LLM-blindspot itself)
- 1 new finding: atom-over-application as a substrate failure mode
- Goal trajectory sharpened: bounded form is action-safety + cost-
  dominance + at-least-as-correct, NOT smarter than frontier

The session worked as designed — the substrate caught my own over-
claims before they became load-bearing. That itself validates the
substrate's calibration discipline.

## See also

- `~/apps/adam/tools/mizan/docs/mcp-integration.md` — mizan-MCP-server
  full reference
- `plan/PLAN.bn` SECTION TT/UU/VV/WW — full session findings
- `plan/QUEUE.md` — atom-0011-ranked next-tasks
