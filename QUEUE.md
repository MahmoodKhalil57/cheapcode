
## M17 — auto-router across all accounts (queued 2026-05-04)

**Self-contained dispatch contract**: `plan/M17-DISPATCH-CONTRACT.md` (read-this-first activation).

**Activation from any cwd**:
```bash
cd ~/apps/cheapcode && CHEAPCODE_HARD_CLASS=1 cheapcode run --model=cheapcode/auto \
  "$(cat plan/M17-DISPATCH-CONTRACT.md)"
```

Phase A (BLOCKING): credential-aware routing + cooldown — uses M16 `Provider.ListResult.credentials` shipped this session.
Phase B: temporal-anchor + sycophancy-detect (daftar + cross-witness-voter primitives already exist).
Phase C: quota tracker + time-budget telemetry.

**Headline claim "smarter/faster/cheaper than gpt-5.5"** GATED behind paired-benchmark receipt at `plan/receipts/m17-paired-benchmark-*.json`. No marketing without receipts (atom 0007).


## M18 — Eve curates the human-design canon (queued 2026-05-04)

**Adam-Eve frame**: per atom 0020, Eve (cheapcode) curates a canon of authoritative human-design principles across 8 dimensions and injects them at dispatch time, so Adam (LLM) outputs honor what humans actually understand and prefer. The canon is Eve-fetched (URL + mizan-verified), NOT Adam-recalled (training memory).

**Self-contained dispatch contract**: `plan/M18-DISPATCH-CONTRACT.md` (read-this-first activation).
**Design rationale**: `plan/M18-eve-as-subconscious-canon.md`.

**Activation from any cwd**:
```bash
cd ~/apps/cheapcode && CHEAPCODE_HARD_CLASS=1 cheapcode run --model=cheapcode/auto \
  "$(cat plan/M18-DISPATCH-CONTRACT.md)"
```

**Eight dimensions**: software-architecture, api-dx, ui-visual, accessibility, ux-research, ai-ml-product, llm-failure-research, policy-governance.

**Headline-claim gate** ("big step toward better general agent"): ≥3 of 7 scorecard axes improve, 0 regress, operator spot-check ≥80% canon-relevance. Atom 0007 anti-fab. Until then `canonInjection` defaults OFF.

