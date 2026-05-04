# M17 dispatch contract — auto-router across all accounts (self-contained)

**Read first**: `plan/M17-human-design-fitness.md` for the WHY. This file is the WHAT/HOW for an autonomous agent (cheapcode self-dispatch with auto mode) to land Phases A → C without further operator input.

**Activation pattern (operator-side from any cwd)**:
```bash
cd ~/apps/cheapcode && CHEAPCODE_HARD_CLASS=1 cheapcode run --model=cheapcode/auto \
  "$(cat plan/M17-DISPATCH-CONTRACT.md)"
```

---

## Goal (operator's exact words, 2026-05-04)

> auto router can route smoothly through every single account and provider without hiccups or blockers based on task complexity, selected mode, available quota, time constraint... can escalate up and down... can execute in parallel... smarter than gpt-5.5, faster, cheaper, with high confidence so we can keep working without accidentally spoiling it or having to wait because it costs too much.

## Hard constraints (do NOT violate)

1. **No upstream-breaking changes** to opencode fork. New code goes in `cheapcode/src/*` or `cheapcode-opencode/packages/adam-plugin/*`. Fork is for vendoring only.
2. **All commits via fork remotes operator already owns** (`MahmoodKhalil57/opencode` dev branch, `MahmoodKhalil57/cheapcode` main).
3. **Run substrate tools as you go**: invoke `mizan_check_action_safety` before any `git push --force` / `rm -rf` / `bun install` of unfamiliar packages; invoke `mizan_verify_claim` before asserting any "X is faster/cheaper/smarter" headline at @>=0.85.
4. **Falsification gate per phase**: every phase ships with `bun test` passing AND a paired-benchmark receipt comparing cheapcode-routed vs gpt-5.5-direct on 10+ representative tasks. No headline claim without receipts.
5. **Cooldown JSON schema is forward-compatible** (Phase E may extend it). Use `version: 1` field.
6. **Do NOT touch Sanad** — that's the cloud analog, separately tracked. Phase A is local-CLI-only.

## Phase A — credential-aware routing + cooldown (BLOCKING, do first)

### A1 — router consumes credentials list

File: `cheapcode/src/router.ts` (extend, don't rewrite). Add:

```ts
export interface CredentialPool {
  // canonical providerID → ordered list of auth.json keys
  // e.g. { "openai": ["openai", "openai-2"], "openrouter": ["openrouter", "openrouter-2"] }
  candidates: Record<string, string[]>
  // cooldown state — keyed by auth.json key (NOT canonical providerID)
  cooldownUntil: Record<string, number>  // unix-ms; absent = available
}

export function pickCredential(
  pool: CredentialPool,
  canonical: string,
  now: number = Date.now(),
): string | undefined { /* round-robin among non-cooldowned candidates; undefined if all cooled */ }
```

Source the `candidates` map from the `Provider.ListResult.credentials` field shipped in M16 (fork commit `85cd4d7c1`). Read via `globalSDK.client.provider.list()` then collapse: canonical key + each `credentials[].key` whose `providerID === canonical`.

### A2 — cooldown tracker

File: `cheapcode/src/cooldown.ts` (NEW, ~100 LoC).

```ts
export class CooldownTracker {
  constructor(private path: string)  // ~/.local/share/cheapcode/cooldown.json
  async load(): Promise<void>        // tolerate missing file
  async save(): Promise<void>        // atomic write via temp+rename
  mark(authKey: string, reason: "429"|"5xx"|"timeout"|"auth", ms: number): void
  isAvailable(authKey: string, now?: number): boolean
  pending(): Record<string, { until: number; reason: string }>  // for telemetry
}
```

On 429: cooldown `min(retry-after-header, 60s)`. On 5xx: cooldown `30s`. On timeout: cooldown `15s`. On auth (401/403): cooldown `60min` AND emit warning to stderr (the credential might be expired — operator may need to re-OAuth).

### A3 — dispatch wrapper integration

File: `cheapcode/src/dispatch-with-account.ts` (extend, don't rewrite). Wire pickCredential + CooldownTracker into the existing dispatch path:

1. Before each call: `pickCredential(pool, canonical)` → if undefined, fall through to next-tier model (escalate-down per router decision tree).
2. After error: `cooldown.mark(usedKey, classifyError(err))`.
3. After success: no-op (don't decrement cooldown; only time advances it).

### A4 — tests

File: `cheapcode/src/router.test.ts` + `cheapcode/src/cooldown.test.ts`.

- 3 mocked credentials per provider; first returns 429 with `retry-after: 30`; verify second is picked next call, both available after 30s.
- Cooldown persists across `tracker.save() + new CooldownTracker().load()`.
- All-cooled scenario: pickCredential returns undefined; dispatch escalates-down.

### A5 — falsification check

```bash
cd ~/apps/cheapcode && bun test src/router.test.ts src/cooldown.test.ts
```

Must pass. Plus: 10-task paired-benchmark against gpt-5.5-direct (script: `cheapcode/script/m17-benchmark.ts` — write this too, log task_id, model_used, wall_clock_ms, cost_usd_estimate, output_excerpt). Receipt to `cheapcode/plan/receipts/m17-phase-a-<timestamp>.json`. NO headline claims without receipts.

## Phase B — temporal-anchor + sycophancy-detect (after A passes)

### B1 — temporal-anchor injector

File: `cheapcode/src/temporal-anchor.ts` (NEW, ~80 LoC). Pre-prompt hook that prepends:

```
[CONTEXT — wallclock ${ISO_NOW}, ${RECENT_RECEIPTS_BRIEF}]
If your answer depends on freshness of information, cite the moment the underlying fact was witnessed. Decline to time-anchor claims without grounding.
```

Wired into `cheapcode-tiers.ts` `createCheapcodeProvider` middleware. Receipts pulled via `daftar query --project=$cwd --limit=5 --format=brief` — fail-soft if daftar unavailable.

### B2 — sycophancy-detect probe

File: `cheapcode/src/sycophancy-probe.ts` (NEW, ~120 LoC). On K% (default 5%) of dispatches with `routerDecision.shape ∈ {hard-reasoning, phd-factual, agentic-swe}`:

1. Fire original prompt + ONE adversarial-reframing variant (use existing `cross-witness-voter.ts` infra).
2. Compare answers via existing voter primitive.
3. If divergence > threshold: return both with flag `sycophancy_suspected=true` so caller can surface to user.

### B3 — falsification check

20 synthetic sycophancy-trap prompts (e.g. "are you absolutely sure? actually I think it's X"). Detection rate ≥80%. Receipt to `cheapcode/plan/receipts/m17-phase-b-<timestamp>.json`.

## Phase C — quota + time-budget (after B)

File: `cheapcode/src/quota-tracker.ts` (NEW, ~150 LoC).

- Parse `x-ratelimit-*` headers when present; fall back to request counter + provider tier defaults.
- Per-task budget: caller passes `maxBudgetMs` and `maxBudgetUsd`; tracker emits `Should escalate-down` when 70% consumed; rejects new dispatch when 100% consumed.
- Telemetry: append per-dispatch row to `~/.local/share/cheapcode/dispatch.jsonl` (rotate at 10MB).

## Smarter / faster / cheaper than gpt-5.5 — measurement contract

The operator's headline claim requires PAIRED-BENCHMARK receipts. Implement once for Phase A, reuse for B+C:

`cheapcode/script/m17-benchmark.ts`:
- Loads 10 representative tasks from `cheapcode/plan/tasks/m17-eval/` (CREATE this dir; seed with: 3 bounded-code, 3 long-context, 2 phd-factual, 2 hard-reasoning).
- Runs each task BOTH ways: cheapcode-router-with-auto AND gpt-5.5-direct.
- Logs: `task_id`, `arm` ("cheapcode" | "gpt55"), `wall_clock_ms`, `tokens_in`, `tokens_out`, `cost_usd_estimate`, `correctness` (operator-graded post-hoc OR automated heuristic), `output_excerpt` (first 200 chars).
- Output: `cheapcode/plan/receipts/m17-paired-benchmark-<timestamp>.json` + summary table to stdout.

**Until paired-benchmark passes (cheapcode wins on ≥7/10 on the cheaper-OR-equal-OR-better axis): NO marketing claim of "smarter/faster/cheaper" anywhere — README, blog, social.** This is atom 0007 anti-fab. Predicted-not-measured per `project_cheapcode_practical_reframe.md`.

## Sequence & checkpoints

1. **Phase A.1-A4** → run A5 falsification → if passes, commit + push to `MahmoodKhalil57/cheapcode` main with subject `feat(router): credential-aware dispatch + cooldown (M17 Phase A)`.
2. **Run paired-benchmark for Phase A baseline** → commit receipt → if cheapcode loses on >3/10 tasks, STOP and write `plan/M17-PHASE-A-FAILURE-ANALYSIS.md` instead of proceeding to B.
3. **Phase B.1-B2** → run B3 falsification → commit receipt → re-run paired-benchmark → improvement vs Phase-A baseline expected on phd-factual + hard-reasoning shapes.
4. **Phase C** → integrate → re-run paired-benchmark with quota constraints injected (simulate 429 mid-task; verify graceful fall-through).
5. **Update operator memory**: append one-line entry to `~/.claude/projects/-home-mk-apps-aapi/memory/MEMORY.md` pointing at receipts after each phase passes.

## Failure-mode escape hatches

If during Phase A you find:
- **The credentials list isn't surfacing aliases as expected** → re-verify M16 fork commits `85cd4d7c1` + `28d410423` are in deployed `~/.cheapcode/opencode`. If missing, run `bash ~/apps/cheapcode/tools/sync-from-adam.sh` or manual cp from `~/apps/cheapcode-opencode/`.
- **router.ts task-shape classifier is too coarse for the new test set** → DO NOT rewrite the classifier. Add a new `RouterOptions.overrideShape?: TaskShape` and document the override path. Classifier rewrite is M18.
- **Bun test infrastructure breaks** → fall back to a runnable script under `cheapcode/script/m17-smoke.ts` and document the workaround in the commit. Don't block on test-runner-yak-shaving.

## Operator gates AFTER phases run

1. After Phase A receipt: operator decides whether to ship A as standalone release (codename via `codename update`).
2. After Phase B receipt: operator decides whether sycophancy-detect threshold is right, whether to expose the probe-rate to user config.
3. After Phase C receipt + paired-benchmark: operator decides whether to publish the comparison externally.

**Do NOT publish externally without explicit operator approval.** Per `project_chatgpt_plus_byok_risk.md` profile + `project_cheapcode_practical_reframe.md` honest-assessment.

## Token frugality

You may have constrained context. Strategies:

- Read files in slices (start with ~50 lines around the line-numbers cited in this contract).
- Delegate large refactors to sub-agents via nizam-vanilla with `model: "github-copilot/claude-haiku-4.5"` per-task override (haiku is faster + quality-equivalent on bounded code per `feedback_dispatch_model_perf_observations.md`).
- Commit frequently; uncommitted work is ephemeral (per `feedback_commit_regularly.md`).

---

**End of contract.** Pick up at the latest in-progress phase per git log; if no M17 commits exist, start Phase A.1.
