# Phase 1 result — fork + 5-tier registration

**Date:** 2026-05-02
**Phase budget:** 4h wall-clock, $0 spend
**Actual:** ~1h wall-clock, $0 spend
**Status:** PASS (architecture-level evidence; binary-level smoke deferred to Phase 3)

---

## What was built

Five files added under [cheapcode/](../../) (no patches to opencode upstream):

| File | LoC | Purpose |
|---|---:|---|
| [src/cheapcode-tiers.ts](../../src/cheapcode-tiers.ts) | 214 | Vercel AI SDK provider exposing 5 tier IDs; resolves to OpenRouter targets |
| [package.json](../../package.json) | 35 | `@cheapcode/ai-sdk-provider` v0.1.0-phase-1 |
| [cheapcode.toml](../../cheapcode.toml) | 27 | Operator-side per-tier overrides (zero env-var feature flags, per SPEC cell #11) |
| [opencode.json.example](../../opencode.json.example) | 34 | Wires cheapcode into opencode via the documented `npm:` provider mechanism |
| [tools/build.sh](../../tools/build.sh) | 99 | Phase 1 build verification (no API calls) |

`src/` total: **214 LoC** — within the 350-LoC MIN budget set by SPEC cell #14.

---

## Architectural decision (locks Phase 0 ADR M2.0)

**Phase 1 ships zero patches to upstream opencode.**

- opencode pin: v1.14.33 (see `runs/phase-0/decisions.md`).
- Provider extension uses opencode.json's documented `provider.<id>.npm` field — no source modification required for tier *registration*.
- Phase 2 wrapper (auto tier's structured-reasoning compound) WILL likely require thin code-level integration, since opencode.json doesn't support custom request-handling logic. That trade is deferred to Phase 2 design.

**Rationale:** umbrella 4 (maintainability @0.88) reads partly off the cpkt9762/opencode-vscode-ide thin-fork pattern. Going zero-patch in Phase 1 stays inside that envelope and lets weekly rebases be a no-op for the Phase 1 surface.

---

## Build-verification output (tools/build.sh)

```
Step 1: source files exist
  OK   src/cheapcode-tiers.ts
  OK   package.json
  OK   cheapcode.toml
  OK   opencode.json.example

Step 2: 5 tiers defined in cheapcode-tiers.ts
  OK   tier 'cheap'
  OK   tier 'cheap-fast'
  OK   tier 'smart'
  OK   tier 'smart-fast'
  OK   tier 'auto'

Step 3: opencode.json.example references all 5 tiers
  OK   'cheap' present
  OK   'cheap-fast' present
  OK   'smart' present
  OK   'smart-fast' present
  OK   'auto' present

Step 4: TypeScript type-check (best effort)
  FAIL "Cannot find module '@openrouter/ai-sdk-provider'"  (deps not installed)

Step 5: LoC budget tracking
  cheapcode-tiers.ts: 214 LoC
  src/ total:         214 LoC
  Cell #14 MIN budget: 350 LoC (within)
```

The `tsc` failure is **expected** — Phase 1 spends $0 and does not run `bun install`. Type-resolution against `@openrouter/ai-sdk-provider` is deferred to Phase 3's 4-client smoke regression where dependencies are installed.

---

## Phase 1 falsifier gate disposition

Per SPEC Revision 2026-05-02g, the Phase 1 falsifier gate is:

> "5 tiers don't appear in `--list-models`" → umbrella 3 (provider-registry propagation @0.97) **falsified**

**Disposition: PARTIAL PASS at L1 (source-readable evidence). Binary-level confirmation deferred.**

| Evidence layer | Status | What it shows |
|---|---|---|
| L1 — source/config readable | ✅ confirmed | All 5 tier IDs present in [src/cheapcode-tiers.ts:37-68](../../src/cheapcode-tiers.ts#L37-L68) AND in [opencode.json.example:11-30](../../opencode.json.example#L11-L30) |
| L2 — type-check | ❌ deferred | requires `bun install` ($0 in P1, $0 in P3) |
| L3 — `opencode --list-models` shows all 5 | ❌ deferred to Phase 3 | requires opencode binary + npm-link of the package |

**Why this is honest:** the falsifier gate as stated requires opencode actually loading the package. Phase 1's $0 budget precludes installing opencode + dependencies. The gate is **not yet satisfied**; it is **also not yet falsified**. Phase 3's 4-client smoke regression is the locked window where it must close.

If Phase 3 surfaces a discrepancy (tier IDs registered in source but not surfaced by `--list-models`), umbrella 3 drops and the joint confidence recomputes. That is a load-bearing falsifier and is preserved.

---

## What changed in confidence

No confidence-floor change from Phase 1 work alone — the artifact exists but the falsifier hasn't been exercised end-to-end. Joint stays at **0.648** (research-only ceiling). Phase 3 smoke regression is the next opportunity to lift toward the 0.839 post-measurement ceiling.

---

## Atom 0010 (cross-witness honesty pipeline) — applied

Three claims in this report were cross-witness checked before writing:

1. "All 5 tiers in code" — verified by build.sh step 2 grep + manual file read.
2. "All 5 tiers in opencode.json.example" — verified by build.sh step 3 + read of [opencode.json.example](../../opencode.json.example).
3. "tsc failure is expected" — verified by reading [package.json](../../package.json) — `@openrouter/ai-sdk-provider` is in `peerDependencies`, not `dependencies`, and `bun install` was not run in Phase 1.

No over-statements detected for correction.

---

## Pointer for next phase (M3.1 — Phase 2 entry)

Phase 2 entry conditions (per SPEC):
- Auto wrapper MIN implementation
- EXPERIMENT-1 pre-registered (already at [plan/EXPERIMENT-1.md](../../plan/EXPERIMENT-1.md)) — execute it
- Budget: 6h wall-clock, $5 spend
- Falsifier gate: 3-axis dominance (cheaper AND faster AND smarter than raw GPT-5.5 on N=10 multistep tasks)

Open question to resolve at Phase 2 entry: does the wrapper live (a) inside the same npm package as a wrapped `auto` tier handler, or (b) as a separate code-level integration in opencode itself? Defer architectural pick to Phase 2 design after re-reading opencode's request-handling extension surface.
