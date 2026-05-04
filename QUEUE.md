
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

