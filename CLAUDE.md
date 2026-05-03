# cheapcode — agent guidance

This file is loaded by Claude Code at session start. It exists to wire substrate primitives the project depends on so a fresh agent picks them up reflexively.

## Substrate primitives (load BEFORE acting)

cheapcode is a substrate-paired project. The plan-graph (`plan/PLAN.bn` + `plan/facts/*.bn`) is the contract; experiments + receipts in `runs/` are the evidence. Every load-bearing claim has a falsifier per mizaj 01.

**Mizaj rules** (read at `~/apps/mizaj/rules/`):
- `01-state-falsifier-first.md` — every claim needs a falsifier
- `11-tier-the-source-before-citing.md` — L1-L5 source-tier ladder
- `14-authentication-grade-bounds-confidence.md` — sahih/hasan/daif grading
- `15-consult-atom-before-reinventing.md` — check khazīna first
- `16-synthesize-research-as-experiment-equivalent.md` — research can substitute experiments
- `17-apply-byproducts-when-method-plateaus.md` — **when load-bearing claim stalls at sub-floor, run the M17 cycle (companion: khazīna atom 0017)**
- `18-burhan-backed-tdd-for-fork-additions.md` — **MANDATORY for any new code added to cheapcode-fork atop opencode upstream. Write burhan claim + falsifier-bearing test BEFORE the source. Trust upstream as L3-sahih; prove fork-additions with minimal tests + perfect coverage of fork-side LoC.**

**Khazīna atoms** (read at `~/apps/khazina/atoms/`):
- `0010-blinded-independent-witness-pass.md` — cross-witness honesty
- `0011-smallest-distinguishing-experiment-first.md` — bound experiment cost
- `0013-calibration-discipline-as-credential-substitute.md` — preserve failed experiments visibly
- `0015-research-pipeline-overstates-base-model-specific-transfer.md` — atom 0015 fires by default; check transfer
- `0016-substrate-as-deterministic-verifier-head.md` — substrate as runtime critic (this project's anchor)
- `0017-unknowns-as-positive-data-recursion.md` — **at plateau, inventory byproducts, study shape, lift to known, recurse**

## When to apply M17 / atom 0017 reflexively

The cycle should fire automatically when ANY of these patterns shows up in the agent's reasoning:

1. "The experiment didn't discriminate" (ceiling effect / saturation)
2. "We'd need a different benchmark" (without first studying the residue from the existing one)
3. "I don't know what shape this is" (without first inventorying byproducts)
4. "The data is noisy" (without first checking whether the noise has structure)
5. "Let's switch methods" (without first applying the cycle on the current method's residue)
6. A burhan-revisit report shows a load-bearing claim sub-floor for ≥3 snapshots
7. A `tools/burhan-plateau.sh` run produces a non-empty report

In all these cases: **stop, inventory the byproducts, look for shape, lift to falsifier-bearing claim, then continue.** This is not optional substrate decoration — it's the discipline that prevented the cheapcode project from drifting at multiple plateau points (M3.18b, M3.18c, M3.13, M3.23 — all 4 in successful_transformations on atom 0017).

## When to apply M18 (burhan-backed TDD) — MANDATORY for any fork-addition

Cheapcode is a fork of opencode (pinned upstream v1.14.33). The fork's value is the substrate-enhanced dispatch + routing-intelligence layered atop the inherited harness. M18 is the discipline that keeps fork-additions audit-bearing.

**Apply M18 every time you would add or modify code in the fork-side source tree** (`src/*.ts`, `tools/*.ts`, etc. — anything not directly mirrored from opencode upstream). The fork-addition flow:

1. Write the burhan-shape claim FIRST in `plan/PLAN.bn` (or `plan/facts/*.bn`) with mizaj-01 falsifier.
2. Write the smallest test in `src/*.test.ts` that discriminates the claim (atom 0011).
3. Implement the source. Test must pass; coverage of new fork-side LoC must be ~100%.
4. Snapshot + revisit so the new claim enters burhan-plateau tracking.

**The asymmetry is load-bearing:** trust opencode upstream as L3-sahih (assume their code works); prove fork-additions with minimal tests + perfect coverage. This is what makes the fork rebaseable cheaply — upstream changes don't need re-testing; only fork-additions are project-tested.

Anti-patterns to refuse:
- Source code without a preceding burhan claim
- Burhan claim without a discriminating test
- Mocking opencode-upstream behavior to make fork-side tests pass (couples to a contract that may drift)
- Coverage measurement that includes upstream-vanilla files (only fork-additions count)
- "More tests = better" — atom 0011 says smallest distinguishing

## Tool entry-points

```bash
# Validate plan-graph
bash tools/burhan-validate.sh

# Snapshot current claim-graph state (call after every cascade)
bash tools/burhan-snapshot.sh

# Surface load-bearing claims that need attention (drift / sub-floor / load-bearing without evidence)
bash tools/burhan-revisit.sh

# Surface plateau-flagged claims for M17 cycle (sub-floor + stable across window)
bash tools/burhan-plateau.sh
bash tools/burhan-plateau.sh --window 5     # require 5 unchanged snapshots
bash tools/burhan-plateau.sh --strict       # CI gate (exit non-zero if plateau-flagged)
```

## Daftar receipts

After every milestone cascade, write a daftar receipt in the cheapcode shard:

```bash
bun ~/apps/daftar/bin/daftar add note --project="/home/mk/apps/cheapcode" \
  --title="<milestone> — <one-line headline>" \
  --body="$(cat <<'EOF'
<full milestone narrative — what was tried, what worked, what didn't, what
the next byproduct-inventory candidate is>
EOF
)"
```

## What's load-bearing about this project

cheapcode is the first compound-LLM-runtime operationalization of khazīna atom 0016 (substrate-as-deterministic-verifier-head) on a falsifier-loaded benchmark. The substrate isn't decoration — it's the runtime critic. M3.18→M3.23 cascade is the empirical anchor for atom 0016 + atom 0017.

When in doubt, read `LATESTMILESTONE.md` (most recent entries first) for the path-history, then `plan/PLAN.bn` for the current claim-graph, then `runs/*/verdict.md` for the empirical receipts.
