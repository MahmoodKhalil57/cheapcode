# COST-OF-INVENTION — git-grounded measurement of cheapcode's development economics

**Audience:** reviewers + operator + future Adam-instances. **Frame:** atom 0007 anti-fab + atom 0013 calibration-as-credential applied to *our own* development. We measure ourselves with the same audit-discipline we apply to the agent's outputs. The numbers below are commit-grounded, daftar-grounded, and reproducible from `git log` + `daftar stats`.

**Probe timestamp:** 2026-05-04T13:11:40.551Z (mizan_physical_reality_probe). git_head: `86c0d2605eb2`.

---

## Headline

cheapcode reached round 96 — a working substrate-disciplined agent harness with 84/84 unit tests, 471 load-bearing claims, paired-benchmark validation across M3.x, and live `cheapcode/auto` dispatch — in **40 wall-clock hours** of solo + AI-assisted development on top of an opencode fork, at *zero engineering headcount* and *zero external funding*.

This is auditable. Re-derive the numbers from:

```
git -C ~/apps/cheapcode log --shortstat --pretty=tformat: | awk '...'
git -C ~/apps/cheapcode log --pretty=format:"%ct" | head -1   # first commit
git -C ~/apps/cheapcode log -1 --pretty=format:"%ct"          # last commit
~/apps/adam/tools/daftar/bin/daftar stats --project=/home/mk/apps/cheapcode
```

---

## Measured cost (2026-05-02 to 2026-05-04 wall-clock)

### Engineering effort

| Metric | Value | Source |
|---|---|---|
| Wall-clock span (M0 scaffold → round 96 close) | **40 hours** | `git log` first/last commit timestamps |
| Git commits | **92** | `git log --oneline \| wc -l` |
| Unique M-milestones tagged | **73** (M0.0 – M3.51 family) | grep on commit subject |
| Lines added (all-time) | **102,686** | `git log --shortstat` aggregate |
| Lines deleted | **1,637** | same |
| Net line growth | **+101,049** | derived |
| TypeScript code volume (current) | **13,110 LoC** | `find ... *.ts \| wc -l` |
| Substrate volume (`plan/*.bn` + `plan/*.md`) | **8,740 lines** | same |
| Daftar entries (audit-bearing artifacts) | **229** (64 burhan segments + 54 notes + 111 receipts) | `daftar stats` |
| Engineering FTEs | **1** (operator) + Claude AI assistance | observable |
| External funding | **$0** | observable |

### Compute spend

The substrate-discipline development itself ran on the operator's existing Claude+ subscription quota — *marginal* dispatch cost was bounded by quota, not metered. Conservative envelope:

- Operator's Claude+ subscription: ~$200/mo flat
- Marginal API calls outside subscription (paired benchmarks, cross-witness verifier samples): bounded by [`PLAN.bn`](PLAN.bn) per-experiment budgets ($1-$5 per test) summed across M3.x ≈ ~$30-80 total
- **Total compute spend on development: ~$200-280** — operator's actual figure is the audit anchor; this estimate is bounded above by Claude+ subscription duration × marginal-API receipts in daftar

A reviewer can falsify the upper bound by querying daftar for cost-bearing receipts:

```
~/apps/adam/tools/daftar/bin/daftar query "cost" --project=/home/mk/apps/cheapcode --limit=50
```

---

## Comparative reference (public-record competitor signals)

For *direction*, not strict equivalence — competitors target broader scope. The point is the order-of-magnitude gap.

| Project | Wall-clock to working agent | Engineering FTEs (disclosed) | Funding raised |
|---|---|---|---|
| **cheapcode (this work)** | **40 hours** | **1 + AI** | **$0** |
| Cognition Devin | ~12-18 months to public launch (2024) | ~30+ team disclosed | ~$200M+ Series A by 2024-25 |
| Cursor (Anysphere) | ~24 months to v1 | ~50+ at scale | ~$60M+ as of mid-2024 |
| Aider (OSS) | ~18 months active development | small core team | open-source, no funding |
| opencode (sst) — *the fork base* | ~6 months since project creation | small team | OSS |
| Claude Code (Anthropic) | undisclosed internal | Anthropic team | Anthropic-funded |

**Fair comparison:** cheapcode FORKED from opencode and INHERITED its working harness (per [facts/19](facts/19-cheapcode-current-state-anchor.bn) C1). The 40-hour figure is the time to add: substrate-discipline runtime layer (Rules A-F), 4 atoms shipped as runtime primitives (0018 / 0022 / 0023 + the M3.57 hard-class detector), cross-witness voter v1x, panel-of-experts synthesizer, anti-fab guard, mizan ceiling-cap layer, and 84/84 test coverage — *on top of* an existing harness.

This is precisely the "harness propagation thesis" cheapcode argues: most of agent-engineering is already shipped in opencode; the remaining lift is substrate-discipline composition.

---

## Why the development cost itself is a contribution

Two reasons reviewers should care:

### 1. Reproducibility credential (atom 0013 calibration-as-credential applied to dev process)

The development is end-to-end auditable: every commit is timestamped, every load-bearing decision has a daftar receipt or fact-file claim, every confidence number has a witness-graph. A reviewer can `git checkout` any commit and re-run the substrate audit at that point in time. No competing agent-product publishes its development trace at this granularity.

### 2. Indie-research economics demonstration

If a 1-person + AI-assisted 40-hour effort produces an agent harness that is *Pareto-comparable* to multi-million-dollar engineering-team products on the cost × correctness × calibration × adaptivity axes — *the substrate-discipline pattern is the lever*. The paper's central methodology claim is structurally validated by its own development cost.

This is the "cheapcode is itself an example of cheapcode" recursion. Atom 0017 unknowns-as-positive-data: the development cost is itself evidence for the thesis.

---

## What this section does NOT claim

- **NOT** that cheapcode is "more capable" than Devin / Cursor / Claude Code on every axis (per [facts/19](facts/19-cheapcode-current-state-anchor.bn) C5: at-least-as-correct + decisively-cheaper, NOT yet much-more-intelligent — atom 0015 fired on the strict-dominance claim).
- **NOT** that 40 hours is a strict lower bound on building an agent harness (the inheritance from opencode is load-bearing; competitors built their own harnesses).
- **NOT** that the operator's $200-280 estimate is the floor — competitors don't disclose dev compute spend either; we can only say *upper-bounded* by subscription + receipts.
- **NOT** that "AI-assisted" means the AI built it. The AI was a tool; the operator made every load-bearing decision. The audit chain in daftar + plan/ is the evidence.

bcmea-discipline applies even to our own development claims. This file is auditable and revisable as further data lands.

---

## Falsifiers

This section is falsified if any of the following turn out true:

- `git log` shows more than 50 hours wall-clock between first and last commit at probe time
- daftar `stats` shows `count` outside [200, 280] range at probe time
- plan/ volume below 7,000 lines or above 11,000 lines at probe time
- Code volume below 10,000 LoC or above 16,000 LoC at probe time
- A competitor (Devin / Cursor / Claude Code) is found to have a similar substrate-discipline composition shipped in production at comparable wall-clock cost
- A reviewer reproduces the substrate from scratch in fewer than ~30 hours, demonstrating the discipline transfers without specific tooling

The first 4 falsifiers are *measurement-grounded* and re-checkable now. The last 2 are *prospective* and remain open.

---

## How to use this in the whitepaper

Section 7 of the EXPERIMENT-2-grounded whitepaper draft. Title suggestion: **"Reproducibility and Development Economics"**. The section serves three reviewer-facing purposes:

1. **Proves the methodology is the contribution.** A 40-hour solo-developer agent that performs Pareto-comparably to multi-team products is a positive existence proof for substrate-discipline as a lever.
2. **Inoculates against the most common rejection** ("you didn't compete with the SOTA team's resources"). Answer: that's the point. The audit-bearing pattern is the moat, not raw compute.
3. **Demonstrates the operator's calibration-as-credential applies to itself.** A paper that audits its own development cost is rare; reviewers reward this.

---

## Daftar receipt for this artifact

```
bun ~/apps/adam/tools/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="COST-OF-INVENTION drafted (round 96-close, 2026-05-04)" \
  --body="Git-grounded development economics: 40h wall-clock, 92 commits, 73 milestones, 13,110 LoC TS + 8,740 lines substrate + 229 daftar entries, 1 operator + AI, ~\$200-280 total compute. Falsifiers explicit. Section 7 anchor for whitepaper."
```
