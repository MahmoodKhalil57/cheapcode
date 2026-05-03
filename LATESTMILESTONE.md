# LATESTMILESTONE — cheapcode

**Read this BEFORE [`plan/`](plan/).** The plan is the working draft; this file is the authoritative record of what's been completed and what should change next.

**Format:** going forward, milestone entries follow the ADR (Nygard) 5-section format per SPEC Revision 2026-05-02g: Title (with date) / Status / Context / Decision / Consequences / Pointer. Existing entries below approximate this informally.

---

## M3.8 — Option 3 lock: defer Phase 2 + EXPERIMENT-1 to v1.x; ship narrower v1.0 (2026-05-03)

### Status

Accepted. SPEC Revision 2026-05-03i pinned; PLAN.bn discharge updated; MAIN.md scope narrowed.

### Context

After three research-lift cycles (M3.5 / M3.6 / M3.7) the $0 research-lift pool was exhausted — PLAN.bn dropped from 17 → 6 EXPLORE items. Remaining 6 are either structural compositional dilution (3 discharge claims) or measurement-gated (cross_model_verification, phase_2_wrapper, smart_fast_tier_choice).

The M3.2 retrospective surfaced a load-bearing concern: Phase 2 EXPERIMENT-1's TB-3 multistep slice has a failure-mode mix (code-execution / system-success failures) orthogonal to the substrate's strength (reasoning-with-citations consistency). Running Arm B as-specified would likely return FAIL-B for the wrong reason — axis mismatch, not hypothesis falsification.

Three options live: (1) run as specified expecting FAIL-B, (2) reframe Arm B benchmark, (3) defer entirely. Operator picked Option 3 at end of M3.7.

### Decision

Defer Phase 2 (auto wrapper MIN + EXPERIMENT-1) and Phase 2's substrate-as-runtime-verifier-head test to v1.x. Ship cheapcode v1.0 at narrower scope: 5 tier registration only, auto = STUB to cheap, no compound-LLM wrapper.

Cascade:

- **SPEC** Revision 2026-05-03i: documents Option 3, marks cells #18 (auto-wrapper LoC) and #19 (substrate verifier LoC) as N/A for v1.0. Cells #14 (LoC budget) honors MIN ≤500 (only 214 LoC ships).
- **PLAN.bn** SECTION W (`cheapcode_v1_ships_via_phase_completion`): theorem assume-clause now drops `phase_2_wrapper_passes_at_least_min`. v1.0 ships when phases 0, 1, 3, 4, 5 + project_no_halt + smart_fast_tier_choice hold. Discharge confidence rises 0.45 → 0.65 (no more phase_2's 0.65 dragging the joint).
- **MAIN.md**: goal narrowed to "5 tier IDs + zero-patch package". Three-axis comprehensive-dominance, smarter-than-frontier, auto-wrapper claims explicitly moved to "what you are NOT getting (v1.0)". Progress bar 0% → 50%.
- **Khazīna atom 0016** (`substrate-as-deterministic-verifier-head`): runtime claim stays `drafted-but-not-validated` per Option 3 election. Build-time interpretation IS validated (atom 0010 caught 0.7pp over-statement in cheapcode M1.9; cheapllm v1 logged 7× atom-0015 firings).

### Consequences

**Good:**
- v1.0 ships clean, narrow, auditable. The smallest distinguishing experiment (atom 0011) for the npm-package mechanism IS Phase 3 smoke regression — and that closes the original Phase 1 falsifier gate (5 tiers in `--list-models`).
- $4-5 + 6h wall reclaimed; comfortable headroom for Phase 3 + 4 + 5.
- Compound-LLM ambitions live as forward-looking PLAN.bn claims (v2/v3) at honest forward-looking confidences. They get their own dedicated investigation later, ideally with a fitter benchmark than TB-3.
- Per atom 0013 (calibration-discipline-as-credential): the honest narrow scope IS the credential. Phase 4 README's Model Card scorecard discloses what's in / what's out / what's deferred / why.

**Bad / honest tradeoffs:**
- The "smarter than GPT-5.5 on multistep" pitch is gone from v1.0. cheapcode v1.0 markets as "5 routing tiers + zero patches" — significantly less ambitious than the original M1.2 framing.
- Khazīna atom 0016's runtime interpretation stays untested indefinitely. The build-time discipline still validates, but the structural claim that substrate IS a runtime verifier head is in limbo until v1.x or a follow-on project tests it on a fitter benchmark.
- Operators who came expecting comprehensive-dominance might be disappointed. The honest disclosure rules out the silent failure mode where we ship a wrapper that fails on TB-3 and call it "calibration."

### Pointer for Phase 3 entry

Phase 3 process per SPEC Revision 2026-05-02f, with one wording update from Revision 2026-05-03i: smoke verifies 5 tiers in `--list-models` AND that one prompt routes correctly through `cheap` tier. The auto-stub returning to cheap IS acceptable v1.0 behavior; verify it returns SOMETHING (no error), not that it does compound logic.

Operator action required: provide OpenRouter BYOK key for the smoke. Estimated cost ≤$0.05 across 4 clients × 1 prompt.

After Phase 3 closes: write Phase 4 README per Model Cards format; v1.0.0 git tag in Phase 5.

---

## M3.7 — batch lift: apophatic +0.10, plan_decompose +0.05, honest-skip cross_model (2026-05-03)

Status: Accepted. PLAN.bn 8 → 6 EXPLORE items. $0 research-lift pool exhausted.
- auto_wrapper_apophatic 0.80 → 0.90 (3 L1 + 2 L3)
- plan_decompose 0.80 → 0.85 (3 L3 ceiling)
- cross_model_verification SKIPPED — atom 0015 fires; Phase 2 EXPERIMENT-1 was the smallest distinguishing experiment, now deferred per M3.8.

## M3.6 — cross_witness_pattern_lifts_hard_reasoning 0.80 → 0.90 (2026-05-03)

Status: Accepted. 2 L1 in-house (atoms 0010, 0014) + 5 L3 mutawatir (Wang 2022 self-consistency, Optimal-SC 2025, Adaptive-TTC, Forest-of-Thought 2024, Difficulty-Adaptive NAACL 2025). PLAN.bn 9 → 8 EXPLORE items.

## M3.5 — weekly_rebase_holds 0.80 → 0.97 (2026-05-03)

Status: Accepted. Lifted on zero-patch self-evidence (M3.0 + M3.2 confirmed Phase 1 + Phase 2 architecture both stay at 0 patches). With 0 patches, weekly rebase reduces to `git fetch && git rebase` with no conflicts possible. Paired with burhan@de3e844 (deep-walk joint computation through theorem assumes). PLAN.bn 10 → 9 EXPLORE items.

## M3.4 — plan refactor: cheapcode_v1_ships discharge added; orphan obs retired (2026-05-03)

Status: Accepted. Acted on M3.3 burhan-revisit findings. Added SECTION W theorem composing phase_0..5 + project_no_halt + smart_fast_tier_choice into `cheapcode_v1_ships @0.45`. Removed orphaned `obs_phase_2_experiment_1_partial`. Paired with burhan@4867e9c (theorem regex anchored to start-of-line — false-matching `# theorem ties...` comments was hiding v1's theorem from closure walker). PLAN.bn 17 → 10 EXPLORE items.

## M3.3 — substrate tooling: burhan auto-confidence-propagation + branch-revisit (2026-05-03)

Status: Accepted. Operator redirect: "we are missing from our tool substrate a way to propagate confidence through burhan files automatically, and a way to auto highlight branches that need revisiting (explore/move/dissect/merge/remove) when something changes from main.md or more burhan is added." Built three tools in burhan/bin/ (snapshot, diff, revisit) + two cheapcode wrappers. Substrate now reflexively audits its own plan-graph; surfaces drift on MAIN.md hash change AND new burhan files added.

## M3.2 — Phase 2 entry research: architecture, prior art, retrospective (2026-05-03)

Status: Accepted. Three Phase 2 entry investigations at $0:
1. **Architecture** — opencode source-read confirmed npm-package-only is viable (zero patches needed for compound-LLM auto-wrapper). LanguageModelV3.doGenerate is treated as opaque by opencode.
2. **Arm B prior art** — novel; ~0.30 prior-art coverage, well below mizaj-16 0.85 skip threshold. Adjacent papers (HERMES, LLM-Modulo, LINC) all shift at least one variable.
3. **$0 retrospective** — checked cheapllm v1's TB-3 misses; substrate would have caught 0/2 (best case). TB / Terminal-Bench failure mix is code-execution dominated; substrate's strength is reasoning-with-citations consistency. Orthogonal axes. Surfaced three options to operator.

## M3.1 — substrate-as-deterministic-verifier-head + EXPERIMENT-1 arm split (2026-05-03)

Status: Accepted. Operator reframe lands a Phase-2-architecture decision and adds Arm B (substrate-on) vs Arm A (substrate-off) to EXPERIMENT-1. Convergent-evolution credential: muḥaddithūn + Cochrane GRADE independently arrived at tiered-source authentication for multi-step claims. Khazīna atom 0016 drafted (drafted-but-not-validated; runtime claim hypothesis-status). SPEC Revision 2026-05-03h committed.

## M3.0 — Phase 1 ships: zero-patch 5-tier provider package (2026-05-02)

### Status

Accepted. Phase 1 deliverables on disk; falsifier gate at L1 (source-readable) confirmed; L3 (binary `--list-models`) deferred to Phase 3 smoke regression by SPEC.

### Context

SPEC Revision 2026-05-02g locked Phase 1 at 4h wall-clock + $0 spend with one falsifier: "5 tiers don't appear in `--list-models` → umbrella 3 falsified."

Two architectural paths on the table at Phase 1 entry:

1. **Patch opencode upstream** — modify provider.ts at L102/L422/L1370 to register the 5 tiers natively. Weekly-rebase pain proportional to upstream churn near those lines.
2. **Ship as npm-loadable AI SDK provider package** — load via opencode.json's documented `provider.<id>.npm` field. Zero patches; rebase cost is zero for Phase 1 surface.

Path 2 fits umbrella 4 (maintainability @0.88, partly grounded in cpkt9762/opencode-vscode-ide thin-fork pattern) better. Path 1 may be needed for Phase 2's auto-wrapper compound logic — that decision is deferred.

### Decision

Phase 1 ships as **`@cheapcode/ai-sdk-provider`** v0.1.0-phase-1 — a Vercel AI SDK provider exposing 5 synthetic tier IDs (`cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`) routing to OpenRouter. ZERO patches to opencode upstream.

Five files added under [cheapcode/](.):

- [src/cheapcode-tiers.ts](src/cheapcode-tiers.ts) (214 LoC, within cell #14 350-LoC MIN budget)
- [package.json](package.json), [cheapcode.toml](cheapcode.toml), [opencode.json.example](opencode.json.example)
- [tools/build.sh](tools/build.sh) — Phase 1 verification (no API calls, $0)

Phase 0 model picks: cheap → deepseek-v4-flash, smart → gpt-5-mini, smart-fast → claude-haiku-4.5, auto → STUB routes to cheap (Phase 2 wraps), long-context override → grok-4-fast above 128k tokens.

Phase 1 falsifier disposition: **PARTIAL PASS at L1.** All 5 tier IDs present in source AND in opencode.json.example. Type-check + binary `--list-models` deferred to Phase 3 — Phase 1's $0 envelope precluded `bun install`.

### Consequences

**Good:**
- Weekly rebase is a no-op for Phase 1 surface (no opencode source touched).
- Thin-package shape under cell #14 LoC budget with headroom.
- Phase 2 architectural pick (wrapper integration surface) preserved — not foreclosed by a Phase 1 patch.

**Bad / honest tradeoffs:**
- Falsifier gate not yet end-to-end exercised. Phase 1 evidence is L1 (source-readable), not L3 (binary). Phase 3 may still falsify.
- Auto tier is a STUB routing to cheap. Until Phase 2 + EXPERIMENT-1, the "auto" name is honest in surface but doesn't yet deliver 3-axis dominance.
- TypeScript type-resolution against `@openrouter/ai-sdk-provider` unverified — that's L2, deferred to Phase 3.

**Joint confidence:** unchanged at 0.648 (research-only ceiling). Phase 1 produces an artifact but doesn't exercise a measurement falsifier. Lift toward the 0.839 post-measurement ceiling requires Phase 2 (EXPERIMENT-1) + Phase 3 (4-client smoke).

### Pointer for next agent

Phase 2 entry conditions + details: [runs/phase-1/result.md](runs/phase-1/result.md).

Open Phase 2 design question: does the auto-wrapper live (a) inside the npm package as a wrapped `auto` tier handler, or (b) as a separate code-level integration in opencode? Re-read opencode's request-handling extension surface before picking. Phase 2 budget: 6h, $5.

---

## M2.1 — adopt 3 parallel standards (Model Cards / GRADE / ADR) (2026-05-02)

### What changed (Status: Accepted)

Operator: "take a look at our substrate suite and see if there are well supported and tested parallel standards online that we can use to make our plan better."

Surveyed 6 candidates: W3C PROV, GRADE, Model Cards, Datasheets for Datasets, ADRs (Nygard/MADR), Toulmin model, PRISMA. Adopted 3, deferred 3 with explicit rationale (SPEC Revision 2026-05-02g).

### What was learned (Context)

The substrate suite (mizaj/burhan/khazina/daftar) has direct parallels in established standards. Best matches:

- **GRADE evidence quality** (Cochrane/WHO/NICE; 20+ orgs adoption) ↔ mizaj rule 11's L1-L5 ladder. Complementary, not duplicative — GRADE is the evidence-quality axis (5 downgrade criteria within a tier); mizaj 11 is the source-class axis.
- **Model Cards** (Mitchell et al. 2019; HuggingFace/Meta/Google/OpenAI standard) ↔ Phase 4 README scorecard. Battle-tested format; zero substrate-change cost; immediate credibility.
- **ADR Nygard format** (5 sections: Title/Status/Context/Decision/Consequences) ↔ LATESTMILESTONE.md milestone entries. We were approximating this informally already.
- **W3C PROV** ↔ daftar Sahih's `isnad` schema. Substantial change, low current benefit, deferred.
- **Toulmin model** ↔ burhan claim shape. Would inflate parser, deferred.
- **PRISMA full** ↔ research-equivalence systematic review. Overkill for current scope; light pieces already there.

### Decision

Three adoptions locked in SPEC Revision 2026-05-02g:

1. **Phase 4 README structured as Model Card.** 9 standard sections (Model details / Intended use / Factors / Metrics / Evaluation data / Training data / Quantitative analyses / Ethical considerations / Caveats and recommendations).

2. **GRADE 5-domain checklist as research-synthesis pre-flight.** Before applying mizaj-16 formula on any L3+ source, run risk-of-bias / inconsistency / indirectness / imprecision / publication-bias check. Downgrade tier by 1 step if any domain triggers. Manual review for now; programmatic enforcement deferred to next round.

3. **ADR (Nygard) format for milestone entries.** Going-forward LATESTMILESTONE.md entries follow Title / Status / Context / Decision / Consequences / Pointer.

### Consequences

**Good:**
- Phase 4 README will be immediately credible to ML practitioners (Model Card format expected).
- Research synthesis catches more soft over-statements via GRADE 5-domain checklist (analogous to cheapllm-v1's 7× atom-0015 firings — that's the failure mode we're now systematically guarding against).
- Milestone entries become parseable by tools that consume ADRs.
- Substrate suite is now triangulated against established standards, not just our own framework.

**Bad / honest tradeoffs:**
- GRADE checklist adds ~5 min review per claim during research-synthesis. Wall-clock cost: marginal.
- ADR format requires existing milestone entries to be slightly rewritten if we want full consistency. Not doing the retroactive cleanup; existing entries approximate the format.
- We may discover GRADE downgrades that pull our joint confidence below 0.648 honestly. That's a feature, not a bug.

### Pointer for the next agent

The substrate-improvement detour added ~30 min of wall-clock to the project budget (now ~1h consumed of 24h). No experiments, no spend.

When proceeding to Phase 1: apply the new standards going forward (no retroactive rewrite needed). Specifically:

- Phase 1 implementation: cheapcode-tiers.ts comments can reference Model Cards format if it helps.
- Phase 2 EXPERIMENT-1 results: report per Model Card "Quantitative analyses" + "Caveats" sections.
- Phase 4 README: full Model Card structure.
- Future research synthesis (Phase 0+ rounds): run GRADE 5-domain check before applying mizaj-16 formula.

Project state at end of M2.1:
- Wall consumed: ~1h of 24h
- Spend: $0 of $10
- Code shipped: 0 LoC
- Joint confidence: 0.648

Authorized to proceed to Phase 1 when operator says go.

---

## M2.0 — Phase 0 complete: research synthesis + decisions locked (2026-05-02)

### What was completed

Operator: "start". Phase 0 of locked plan executed.

**Wall:** ~30 min (well under 2h budget). **Spend:** $0.

3 parallel research vectors via mizaj rule 16 (no experiments):

1. **Smart-fast latency benchmark** — artificialanalysis.ai page extracted no inline numbers (interactive charts), but search yielded: Gemini 2.5 Flash 1.1s median, $0.003/run, 97.1% quality. Pick: Claude Haiku 4.5 primary, GPT-5-nano backup, Gemini 2.5 Flash for latency-priority.
2. **opencode upstream pin** — v1.14.33 (released 2026-05-02). v1.14.30 added "DeepSeek compatibility with providers that vary model naming" — directly relevant to cheap-tier integration. 8 patch versions past Khātim's old pin.
3. **Cheap-fast race-K candidates** — deepseek-v4-flash (cheapllm-v1 receipt) + gemini-2.5-flash (1.1s median). Mistral Medium 3.5 with reasoning support (added v1.14.30) as fallback.

### Locked decisions ([runs/phase-0/decisions.md](runs/phase-0/decisions.md))

| Tier | OR target | Confidence backing |
|---|---|---|
| cheap | `deepseek/deepseek-v4-flash` | cheapllm v1 L1 receipts |
| cheap-fast | race-K of deepseek-v4-flash + gemini-2.5-flash | cheapllm v1 race-K pattern + L3 leaderboard |
| smart | `openai/gpt-5-mini` direct | cheapllm v1 F-E1 + atom-0013 honest direct-route |
| smart-fast | `anthropic/claude-haiku-4.5` (primary) / `openai/gpt-5-nano` (backup) | L3 leaderboard categorization (specific TTFT not extracted) |
| auto | structured-reasoning wrapper (Phase 2) | umbrella 2 @0.85 pending EXPERIMENT-1 |
| (long-context override) | `x-ai/grok-4-fast` for >128k input | cheapllm v1 H3B receipt |

Upstream pin: **opencode v1.14.33**.

### Umbrella re-audit (per cheapllm-v1's 7× atom-0015 firing warning)

All 5 umbrellas held their values:

| # | Umbrella | Confidence | Status |
|---|---|---|---|
| 1 | cheapllm capability inherited | 0.95 | ✅ |
| 2 | auto-wrapper multistep dominance | 0.85 | ✅ Phase 2 EXPERIMENT-1 is load-bearing |
| 3 | provider-registry propagation | 0.97 | ✅ strengthened by v1.14.30 DeepSeek changes |
| 4 | surgical maintainability | 0.88 | ✅ |
| 5 | cost ratio vs competitors | 0.94 | ✅ DeepSeek V3.2 67.8% SWE-bench confirms |

**Joint confidence: 0.648 (unchanged).** No falsifier triggered. **Phase 0 → Phase 1 transition CLEARED per SPEC Revision 2026-05-02f.**

### Honest gaps acknowledged in decisions doc

1. Smart-fast latency: pick by L3 categorization, not specific TTFT receipts (artificialanalysis.ai charts didn't extract).
2. Cheap-fast race-K specific P50: substituting gemini-2.5-flash for cheapllm-v1's flash-lite — should be at least as fast but unmeasured.
3. Cross-model verification model for Phase 2 wrapper: not yet locked; defer to Phase 2 prep.

These are L3+ confidence on picks. L1 measurement would close the residual gap; tradeoff accepted per operator's research-first discipline.

### Next: Phase 1

Phase 1 — Fork + 5-tier registration (4h budget, $0). Per the implementation sketch in [runs/phase-0/decisions.md](runs/phase-0/decisions.md):

- New file: `packages/opencode/src/provider/cheapcode-tiers.ts` (~150 LoC)
- Modify: `packages/opencode/src/provider/provider.ts` (~15 LoC near OpenRouter init line 403)
- New: `cheapcode.toml` config (per SPEC cell #11)
- Smoke: `bun run ... run --model cheap "say hello"` returns output

Falsifier gate: 5 tiers don't appear in `--list-models` → umbrella 3 falsified, pivot per SPEC Phase 1 table.

**Project state at end of Phase 0:**
- Wall consumed: ~30 min of 24h
- Spend: $0 of $10
- Joint confidence: 0.648 (post-research ceiling)
- Code shipped: 0 LoC

Authorized to proceed to Phase 1 when operator says go.

---

## M1.10 — locked phase plan with falsifier gates + cheapllm v1 status acknowledged (2026-05-02)

### What changed

Operator: "lets start by locking in the plan from the start and setting falsifications along the way... any 'experiments' we run will count towards the wallclock... supplement with internet research along the way to not run redundant experiments."

Plus cheapllm v1 status update at 23:32 BST: 93% complete, projected ship ~50–80 min, **atom 0015 fired 7 times in their session**, smart-axis honestly disclosed at 11–33% vs GPT-5.5's 82%, Q2 finding showed K=1 alone OUTPERFORMS K=1+router on hard tasks (router net-hurt).

### Locked phase plan (SPEC.md Revision 2026-05-02f)

6 sequential phases, ~17h cumulative wall-clock, ~$6 spend, with explicit falsifier gates:

| # | Phase | Wall | $ | Falsifier gate |
|---|---|---|---|---|
| 0 | Final research synthesis | 2h | $0 | Any umbrella drops materially → HALT |
| 1 | Fork + 5-tier registration | 4h | $0 | 5 tiers don't appear in `--list-models` → umbrella 3 falsified, pivot |
| 2 | Auto wrapper MIN + EXPERIMENT-1 | 6h | $5 | EXPERIMENT-1 verdict (PASS-EXPECTED / PASS-MIN / PARTIAL / FAIL) determines path |
| 3 | 4-client smoke regression | 2h | $0 | Any client fails → umbrella 3 actually falsified |
| 4 | Scorecard + README | 2h | $1 | Measured contradicts SPEC targets without honest reframe → mizaj 04 violation |
| 5 | Ship | 1h | $0 | (administrative) |

Buffer: 7h, $4. Project-level halts: 22h+ wall with Phase 2 not started, $9+ spend before Phase 4, any umbrella confidence drop in Phase 0, upstream architecture change.

**Mizaj 16 enforced:** before any experiment, the agent runs a research-synthesis check. If literature can answer with ≥0.85 confidence, **skip the experiment**. Experiments count toward 24h envelope; research is free.

### PLAN.bn additions

Section P (phase observations) added — 7 observation claims + 6 phase-success claims + 4 project-halt observations. All entered as supporting evidence; the discharge claim still cites the 5 umbrellas.

### cheapllm v1 status acknowledged

Per the operator's update, cheapllm v1's session showed **atom 0015 fired 7 times**:

1. Phase 0 — substrate prompt no transfer
2. Phase 0.1 — substrate prompt liability at higher difficulty
3. H0b-1 — cheap base ALREADY frontier on TB-easy (inverted prior)
4. F-D — reasoning_details streaming-only (not in TB workflow)
5. H4 META-meta — prior consults assumed all-LLM-bound
6. H6 META — H5 said "don't build verifier hook on n=1"; F-J2 inverted
7. **Q2 — the ROUTER ITSELF over-stated transfer; K=1 alone outperforms K=1+router on hard tasks**

That last finding is materially relevant to cheapcode: a router-on-cheap-base for hard reasoning under-performed K=1 on the same base. **It does NOT directly refute cheapcode-auto's claim** (cheapcode-auto uses frontier models internally for best-of-K + cross-MODEL verification, not cheap-base + router) — but it is a strong substrate-discipline signal that test-time-compute thesis transfer is *more* overstated than the literature claims.

For cheapcode's umbrella 2 (auto-wrapper multistep dominance), the implication is: **stay at 0.85 (L3 mutawatir ceiling) per atom 0015**; do NOT lift past that without EXPERIMENT-1 measurement on cheapcode's specific frontier-ensemble architecture. Phase 2 of the locked plan is exactly this measurement.

### What cheapcode inherits from cheapllm v1

Once cheapllm v1 ships (~00:30 BST today):

- **L1 in-house verifier hook** — cheapllm's verifier hook IS LIVE in their running proxy (committed d616876). cheapcode can cite this directly as L1 evidence for the verifier-hook component of umbrella 2 (already lifted via mizaj 16 to 0.94 in M1.5).
- **L1 in-house honest-niche framing receipt** — cheapllm's "3 undeniable axes + honest miss disclosure on smart" pattern (atom 0013) is the template cheapcode should follow.
- **L1 receipts of atom 0015 transfer-overstatement** — 7 firings means cheapcode should be MORE conservative on transfer claims, not less. Per atom 0015: every research-synthesis lift in cheapcode's PLAN.bn should be re-audited for soft over-statement before EXPERIMENT-1.

### Joint confidence (unchanged from M1.9)

Current: **0.648** (~65%). Post-research ceiling: 0.648. Post-measurement ceiling: 0.839. The phase lock doesn't change the joint — it adds explicit gates and a sequenced path past 65%.

### Honest concerns

- **The cheapllm v1 atom-0015 firing rate (7×) is high.** Each firing was a research-supported claim that didn't replicate under measurement. cheapcode's research synthesis may have similar over-statements that we haven't yet caught. The phase plan's mizaj-16-before-experiment discipline is the mitigation, but operator should weigh that risk before committing to all 17h.
- **EXPERIMENT-1 in Phase 2 is the load-bearing test.** All the research synthesis lifts to 65% are bounded by L3 ceiling. Lifting past that requires direct measurement on cheapcode's specific architecture. If EXPERIMENT-1 returns PARTIAL or FAIL, the wrapper code reverts and we ship cheapcode at the narrower 5-tier niche (per Phase 2 pivot table).
- **24h envelope is tight.** cheapllm v1 is at 89% wall-clock (21h26m of 24h) at 93% completion — it's running close to the limit. cheapcode at the same scope budget will be similarly tight.

### Plan changes implied

The plan is LOCKED. Further changes require operator approval + a SPEC revision section. The next move is **start Phase 0**: final research synthesis + locking model picks for cheap-fast and smart-fast tiers. ~2h, $0.

### Pointer for the next agent

Phase 0 starts now. The agent runs final research on:
1. cheap-fast model picks (race-K candidates from current OR catalog)
2. smart-fast latency benchmark (haiku-4.5 vs gpt-5-nano vs gemini-flash via artificialanalysis.ai)
3. opencode upstream version pin (latest stable tag as of fork day)

Pre-phase research-synthesis check per mizaj 16: do these questions have published answers we can cite? If yes, skip the lookup. If no, do the lookup. NO EXPERIMENTS in Phase 0.

If Phase 0 surfaces any umbrella-falsifying evidence, HALT before Phase 1 and reconsider per SPEC project-halt conditions.

---

## M1.9 — research round 3 + cheap honesty-verification probe (2026-05-02)

### What changed

Operator: "continue try to use our substrate to convert experiments to internet research... approach 0.9999 just by scouring the internet in a structured way and doing VERY minimal cheap fast verification, ideally to verify honesty rather than claim."

Two phases:

**Phase A — 6 more parallel research vectors (umbrella 4 specifically):**
1. Aider/Cline + DeepSeek SWE-bench scores
2. SWE-bench cost-per-task data
3. METR HCAST evaluations
4. opencode fork minimal-divergence examples
5. Cognition Devin technical architecture (huge find)
6. Cheap-base-plus-best-of-N cost-effective claims

**Phase B — atom 0010 honesty-verification probe** on the load-bearing fresh evidence (cpkt9762/opencode-vscode-ide thin fork claim).

### Phase A findings ([plan/facts/07-thin-fork-and-compound-production-evidence.bn](plan/facts/07-thin-fork-and-compound-production-evidence.bn))

13 new lemmas across:

- **Cognition Devin**: explicit compound AI system in production. Quote: *"Devin is a compound AI system that uses a diverse set of model inferences to plan, act, evaluate, and use tools."* SWE-check is RL-trained 10× faster than Opus 4.6. **Direct production evidence for cheapcode-auto's architecture pattern.** L4 vendor blog (capped 0.40), but reinforces qualitatively.
- **cpkt9762/opencode-vscode-ide**: thin-fork example against VS Code (huge upstream). L1 source-readable — pattern matches cheapcode's intended approach.
- **Cost-effectiveness data**: DeepSeek V3.2 67.8% SWE-bench at 1/50th GPT-5.4 cost; MiniMax M2.5 80.2% at $0.30/$1.20 per M tokens. Concrete numbers strengthening umbrella 5.
- **Aider + DeepSeek V3 top score** on aider's code editing benchmark.

### Phase B finding (the honest correction)

Cheap WebFetch on cpkt9762/opencode-vscode-ide README **CAUGHT AN OVER-STATEMENT** in our M1.9 Phase A synthesis:

| Sub-claim | Verdict |
|---|---|
| ✅ Thin-fork pattern with `src/vs/workbench/contrib/opencode/` directory | **Verified directly in README** |
| ⚠️ Actively maintained | **Partial** — 154K commits visible but no recent date |
| ❌ Weekly rebase cadence | **Not supported** — no rebase schedule documented in repo |

Per atom 0015 (transfer overstated) + atom 0010 (cross-witness honesty), corrected umbrella 4 lift from 0.85 → 0.88 (not 0.89 as Phase A initially proposed). The pattern IS documented; operational long-term success at cpkt9762 is NOT verified.

**This is exactly what the operator's "verify honesty rather than claim" frame is for.** The verification CAUGHT the over-statement; we honestly corrected.

### Joint confidence delta

| Metric | M1.8 | M1.9 Phase A (over-stated) | **M1.9 Phase B (honest)** | Net lift |
|---|---|---|---|---|
| Current joint | 0.626 | 0.655 | **0.648** | +0.022 (+2.2pp) |

The honest correction was **−0.7pp** from the over-stated number. Net lift is still real (+2.2pp from M1.8) but smaller than Phase A claimed.

### Path past 65% via more research

Each round adds ~1-2pp:
- M1.6 → M1.7: +1.9pp
- M1.7 → M1.8: +1.3pp
- M1.8 → M1.9: +2.2pp (with honesty correction)

Diminishing-but-real returns. The substrate-discipline framework works as designed: research synthesis lifts confidence, cheap honesty probes catch over-statements, joint converges honestly.

### What 0.9999 would actually require

| Composition | Joint at 0.99 per claim | Joint at L1 ceiling 0.99 each |
|---|---|---|
| 5 umbrellas | `0.99^5` = 0.951 | 0.951 max |
| 4 umbrellas | `0.99^4` = 0.961 | 0.961 max |
| 3 umbrellas | `0.99^3` = 0.970 | 0.970 max |
| 2 umbrellas | `0.99^2` = 0.980 | 0.980 max |
| 1 umbrella | 0.99 | 0.99 max |

**0.9999 over any composition with N>1 is mathematically unreachable** unless each claim approaches certainty (six-nines per claim). Even reducing to 1 umbrella + maxing L1 measurement = 0.99, not 0.9999.

The honest realistic ceiling is ~0.95-0.98 with full L1 measurement on a tight composition. To "approach 0.9999" we'd need to either accept the asymptote at ~0.95 OR collapse all claims into one (e.g., one EXPERIMENT-1 that simultaneously verifies all 5 axes as a single observation).

### Honest concerns

- **Honesty probe CAUGHT one over-statement.** That's good — substrate worked. But it suggests other lifts may also have soft over-statements I haven't probed yet.
- **Approaching 0.9999 by research alone is mathematically impossible** for any meaningful composition. Operator should weigh whether to accept the asymptotic ceiling (~0.95) as the actual target.
- **Research is now at deep diminishing returns**. Each round adds 1-2pp from a base of strong evidence. Marginal value of more research is low.

### Plan changes implied

The honest framing of "approach 0.9999" should probably be:
- "Approach 0.95-0.98 joint with full L1 measurement on a tight composition"
- "Approach 0.65-0.70 joint via research alone on the current 5-umbrella plan"
- "Approach 0.85+ joint by reducing to 2-3 umbrellas at L1"

### Pointer for the next agent

The substrate has done its work via mizaj rule 16. Next move options (sorted by leverage):

1. **Run more atom-0010 honesty probes** on existing claims — likely catches more soft over-statements; net effect could be lift OR correction
2. **Run EXPERIMENT-1** ($5, 3h) to lift umbrella 2 to L1 → joint ~0.74
3. **Reduce N to 2-3 umbrellas** — joint ~0.85+ honest with measurement
4. **Continue research** (asymptotic; +1-2pp per round)

The operator's "approach 0.9999" framing should be re-grounded: **research-only ceiling is ~0.65; full-measurement ceiling on 5 umbrellas is ~0.84; L1-on-2-umbrellas can hit ~0.95**. 0.9999 is structurally unreachable without single-claim collapse.

---

## M1.8 — parallel research push: 6 vectors at once (2026-05-02)

### What changed

Operator: "think parallely, write more burhan files... code segments from popular github projects, blog posts from relevant people, latest news from top companies, bleeding edge papers, etc."

6 parallel WebSearches:
1. DSPy / LangGraph / AutoGen compound benchmarks
2. GitHub best-of-N + verifier multi-model agents in TypeScript
3. Anthropic Claude Code production architecture
4. NVIDIA NeMo Agent Toolkit production benchmarks
5. Test-time compute / self-consistency / best-of-N bleeding-edge papers
6. Thin-fork weekly-rebase maintenance practices

### Findings synthesized into two new fact files

**[`plan/facts/05-production-deployment-evidence.bn`](plan/facts/05-production-deployment-evidence.bn)** — 13 lemmas covering:
- Anthropic Claude Code production architecture (orchestrator + specialized sub-agents pattern, Claude Opus 4.7 self-verifies outputs, 7-hour vLLM 12.5M LoC task at 99.9% accuracy, 4% of public GitHub commits authored by Claude Code) — L4 vendor blog
- NVIDIA NeMo Agent Toolkit + Nemotron 3 Nano Omni 9× throughput compound systems — L4
- opencode community stats: 6.5M monthly developers, 150K GitHub stars, 850 contributors, 11000+ commits, awesome-opencode curated extension list, OpenAgentsControl built on opencode — L1 source-readable
- SWE-bench Verified leaderboard (Claude Adaptive 87.6%, multi-rollout systems at top) — L3

**[`plan/facts/06-test-time-compute-bleeding-edge.bn`](plan/facts/06-test-time-compute-bleeding-edge.bn)** — 6 lemmas covering:
- Optimal Self-Consistency arxiv 2511.12309 (Nov 2025; power-law scaling + Blend-ASC algorithm) — L3
- Adaptive Test-Time Compute Allocation (Level 3 hard questions get +7.2–8.5pp from K=1→16) — L3, **directly in our 5–15pp claim range**
- Forest-of-Thought arxiv 2412.09078 — L3
- Self-Consistency original (Wang 2022, +18% accuracy on math) — L3
- Difficulty-Adaptive Self-Consistency NAACL 2025 — L3
- Survey of Test-Time Compute (2025) — L3

### Joint confidence delta

| Metric | M1.7 | **M1.8** | Lift |
|---|---|---|---|
| Current joint | 0.613 | **0.626** | +0.013 (+1.3pp) |
| Post-research ceiling | 0.613 | **0.626** | (current = ceiling) |
| Post-measurement ceiling | 0.839 | 0.839 | unchanged |

The +1.3pp lift comes from umbrella 3 (provider-registry propagation): 0.95 → 0.97 with multi-source L1 evidence (4+ independent L1 witnesses including community stats + extension ecosystem).

Umbrella 2 doesn't lift past 0.85 because it's already at the L3 mutawatir ceiling — adding the 3 new test-time-compute papers takes the witness count from 6 to 9+ independent groups, but the per-tier ceiling caps further lift. **The evidence chain is now belt-and-suspenders robust** — that's worth something even if it doesn't move the joint number.

### Research is asymptotic past M1.8

Each round adds ~1-2pp:
- M1.5 → M1.6: refactor (17% → 59%; structural change, biggest lift)
- M1.6 → M1.7: round 1 (+2pp)
- M1.7 → M1.8: round 2 (+1.3pp)

We're at the research-only ceiling on this composition. Further rounds would strengthen evidence (more witnesses) but not lift the joint past ~63%.

### Production deployment evidence reinforces architecture

Anthropic's engineering blog: "Multi-agent architectures where an orchestrator model delegates work to specialized sub-agents become the standard pattern for complex tasks." That's **exactly cheapcode-auto's plan-decompose architecture**, deployed at scale by the most capable AI lab. Per mizaj 11 it's L4 (vendor blog) capped at 0.40, but the qualitative validation is meaningful — independent confirmation that production teams converge on cheapcode's architecture.

### Honest concerns

- **L4 vendor blogs are the limiting factor for production-evidence claims.** Even Anthropic + NVIDIA's compound-system marketing is bounded at 0.40 ceiling per mizaj 11. We can cite it as direction but not as load-bearing evidence.
- **Umbrella 2's 0.85 cap is structural** — only L1 own-measurement (EXPERIMENT-1) can lift past L3 ceiling.
- **Umbrella 4 (maintainability) remains research-resistant** — operational discipline by definition.

### Plan changes implied

**Research-driven lift is exhausted at 0.626.** Path past 63%:

1. **Run EXPERIMENT-1** ($5, 3h, fits envelope) → lifts umbrella 2 from 0.85 toward L1-own-measurement 0.95 → joint ~0.71
2. **Reduce N** — drop umbrella 4 (project-meta, can't be research-lifted) → 4 umbrellas at higher per-claim values → joint ~0.74
3. **Both** → joint ~0.83

Operator-direction needed past this point.

### Pointer for the next agent

The research push has produced 19+ new lemmas across 2 fact files, 9+ independent L3 groups for umbrella 2 mutawatir, and multi-source L1 lift on umbrella 3. The substrate has done all it can without measurement.

Three orthogonal paths:

1. **Ship at 63%** with explicit per-umbrella falsifiers + transparent disclosure (most honest per atom 0013)
2. **Run EXPERIMENT-1** to lift umbrella 2 → 71%
3. **Tighten scope** to 4 umbrellas (drop maintainability) → 74%

---

## M1.7 — research round on production deployments + opencode docs (2026-05-02)

### What changed

Operator: "do more research, people on the internet probably tried our experiments or something similar that we can synthesize from."

4 targeted searches:
1. SWE-bench Verified leaderboard (compound systems vs raw)
2. Cline / Aider / Roo Code multi-model architectures
3. opencode plugin / provider extension docs
4. METR evaluations on compound systems

### Findings

**Strong (lift-bearing):**

- **SWE-bench Verified leaderboard** — top entries include Claude Mythos Preview 93.9%, Claude Opus 4.7 (Adaptive) 87.6%, GPT-5.3 Codex 85%. The leaderboard description explicitly notes "wide variety of AI coding systems, from simple LM agent loops to RAG systems to multi-rollout and review type systems." **Compound architectures (Adaptive, multi-rollout) are at the frontier** — direct L3 evidence supporting umbrella 2.
- **METR evaluations** — Claude Opus 4.6 ~12hrs human-time-equivalent, GPT-5.2 ~6hrs. Compound system architectures consistently top capability time-equivalent rankings.
- **opencode docs** — explicitly confirm provider-extension architecture: "Bundled / NPM-installed / Custom Loaders." Provider registry is the documented propagation point. Lifts umbrella 3 from L1-source-readable-only to L1-source-readable+L1-docs.

**Honest constraint discovered (validates M1.0 fork architecture):**

opencode's plugin/provider-extension via opencode.json **does NOT support custom compound logic** — only pointer-style provider configs (baseURL, npm package). Quote from docs: "The documentation does not describe support for custom synthesis logic or internal routing." cheapcode's wrapper (best-of-K + cross-model + plan-decompose) **cannot be a config-only addition** — it MUST live in a fork. M1.0's fork architecture is the only viable path.

This is a useful negative finding — invalidates a tempting "plugin-only" alternative. The fork plan stands.

### Joint confidence delta

| Metric | M1.6 | **M1.7** | Lift |
|---|---|---|---|
| Current joint | 0.594 | **0.613** | +0.019 (+2pp) |
| Post-research ceiling | 0.594 | **0.613** | (current = ceiling) |
| Post-measurement ceiling | 0.839 | 0.839 | unchanged |

Modest but honest. Most of the M1.6 lift was from refactoring (17% → 59%); this round added small per-umbrella reinforcement.

### Per-umbrella state after M1.7

| Umbrella | M1.6 | M1.7 | Notes |
|---|---|---|---|
| 1 cheapllm capability inherited | 0.95 | 0.95 | unchanged (already at L1) |
| 2 auto-wrapper multistep dominance | 0.85 | 0.85 | strengthened (6 indep groups now at L3 ceiling) |
| 3 provider-registry propagation | 0.92 | **0.95** | opencode docs confirm provider-extension L1 |
| 4 surgical maintainability | 0.85 | 0.85 | unchanged (no research lifted this) |
| 5 cost ratio vs competitors | 0.94 | 0.94 | unchanged (already at L1+L2 ceiling) |

### Diminishing returns on research alone

We're now AT the post-research ceiling on 5 umbrellas. Further lifts past 61% require either:
- L1 own-measurement (run EXPERIMENT-1 → lift umbrella 2 toward 0.95 → joint ~0.71)
- Tighter scope (e.g., drop umbrella 4 maintainability if its 0.85 is the bottleneck → joint ~0.72)
- Both → joint ~0.79

### Plan changes implied

The structural finding about plugin-vs-fork is locked: cheapcode's wrapper code MUST live in the fork. SPEC.md Revision 2026-05-02b's surgical-fork architecture stays. Plugin-only path investigated and ruled out.

### Pointer for the next agent

We've extracted what research can give us at this composition. The 61% joint confidence is the honest research-only ceiling for the 5-umbrella plan. From here:

1. **Ship at 61%** with explicit per-umbrella falsifiers (most honest)
2. **Run EXPERIMENT-1** ($5, 3h, fits envelope) → lifts umbrella 2 → joint ~0.71
3. **Tighter scope** — drop umbrella 4 (project-meta is the bottleneck) → joint ~0.72 with 4 umbrellas

Substrate did all it can without measurement. Operator-direction needed.

---

## M1.6 — 5-umbrella refactor (substrate-driven; no experiments) (2026-05-02)

### What changed (substrate-converged best move)

Operator: "use the substrate to do the best meaningful move to increase our confidence, either refactor plan, more research, or both. don't run experiments yet."

Substrate convergence on the answer:

- **Atom 0011** (smallest distinguishing experiment first) — what kills the project if false? Most claims are derived/supporting, not independently load-bearing.
- **Mizaj 02** (generate-before-select) — adding more claims is the default; reducing to load-bearing-only is the disciplined alternative.
- **Mizaj 07** (stack-default-not-neutral) — 27-claim count was a default, not deliberate.
- **Atom 0015** (transfer overstated) — fewer claims = less surface for transfer-overstatement.

The best meaningful move: **identify the 5 truly load-bearing claims, restructure PLAN.bn around umbrella claims with direct evidence, demote everything else to supporting evidence**.

### The 5 umbrella claims

Each umbrella has DIRECT evidence at its tier ceiling — not derived from sub-claim composition. This escapes compositional dilution that plagued the 27-claim plan.

| # | Umbrella | Direct evidence | Confidence |
|---|---|---|---|
| 1 | `umbrella_cheapllm_capability_inherited` | cheapllm v1 daftar shard L1 receipts (cost / fast / context all measured) | `@>=0.95` |
| 2 | `umbrella_auto_wrapper_multistep_dominance_research_grounded` | Snell ICLR 2025 + EMNLP 2025 CAI Survey + EMNLP 2025 CAI Eval + AlphaCode-2 = 4 indep L3 groups (mutawatir at L3 ceiling) | `@>=0.85` |
| 3 | `umbrella_provider_registry_propagation_layer_1` | opencode upstream `provider.ts` source-readable (already special-cases OpenRouter at lines 102/403/1343) | `@>=0.92` |
| 4 | `umbrella_surgical_maintainability_lessons_inherited` | Khātim/Sanad post-mortem L1 + project-meta discipline (LoC budget, weekly rebase, 0 new packages) | `@>=0.85` |
| 5 | `umbrella_cheapcode_cost_ratio_vs_competitors` | OpenAI Codex pricing L2 + cheapllm-v1 in-house cost receipts L1 = direct arithmetic (~10× cheaper per task) | `@>=0.94` |

### Joint confidence delta (the headline)

| Metric | M1.5 (27 claims) | **M1.6 (5 umbrellas)** | Lift |
|---|---|---|---|
| Current joint | 0.168 | **0.594** | **+0.426 (3.5×)** |
| Post-research ceiling | 0.341 | **0.594** | (already at ceiling) |
| Post-measurement ceiling | 0.640 | **0.839** | +0.199 |

The current joint **equals** the post-research ceiling — meaning research synthesis on the umbrellas is already maximal. Further lift requires either L1 own-measurement (run EXPERIMENT-1) or even tighter scope.

### Why this isn't cheating

The 22 detail claims still exist in PLAN.bn as supporting evidence. They aren't deleted (atom 0007 — anti-fabrication via artifact retention; mizaj 14 — daif/mawdu retention principle). They're just not in the discharge chain because the umbrellas have direct evidence and the supporting claims are derivable from the umbrellas, not load-bearing for the project's success.

If `umbrella_auto_wrapper_multistep_dominance` is true, then the supporting claims (best-of-K helps, cross-model verification helps, plan-decompose amortizes) are implied — they're HOW the umbrella holds, not separate load-bearing assumptions.

### Honest concerns

- **Each umbrella's confidence is bounded by its evidence's tier ceiling.** L3 ceiling 0.85 caps umbrella 2 (auto-wrapper). Mutawatir at L3 = 0.85 max. Only L1 own-measurement could lift past that.
- **Umbrella 4 (maintainability) is project-meta.** It depends on disciplined use, not measurement. The 0.85 reflects "we'll keep the discipline if we're careful" — not bulletproof.
- **The 5-umbrella structure is more honest, but still not 0.99999.** Joint at 5 umbrellas with each at 0.95 ceiling = `0.95^5 ≈ 0.77`. Even at 0.99 each, `0.99^5 ≈ 0.95`. Compositional dilution is structural; even 5 claims can't trivially hit 5-nines.

### Plan changes implied

The path forward is now clear:

1. **Ship at ~59% joint** with 5 explicit load-bearing umbrellas + per-umbrella falsifiers. Honest framing.
2. **Run EXPERIMENT-1** to lift umbrella 2 from L3 (0.85) to L1 (0.95). Joint → ~0.65.
3. **L1 own-measurement on remaining umbrellas** if needed. Joint → ~0.84.
4. **Continue research** has diminishing returns; we're already at research-only ceiling.

### Pointer for the next agent

Three operator decisions still open:

1. **Ship at 59% with 5-umbrella plan?** Honest, transparent, defensible per atom 0013.
2. **Run EXPERIMENT-1 first** (~$5, ~3h, fits envelope) to lift umbrella 2 toward 0.95? Path to ~84% joint.
3. **Tighten further** — could 4 umbrellas instead of 5 raise joint? Probably not significantly given umbrella 4's `@>=0.85` is the bottleneck.

The substrate has done its job. Next move is operator-direction, not more substrate work.

---

## M1.5 — research lift via mizaj 16 (no code, no experiments, no spend) (2026-05-02)

### What changed (operator instruction: "do more research to increase confidence")

Operator pushed for deeper research per mizaj rule 16's research-as-experiment-substitute path. Did 4 targeted WebSearches:

1. Smart-fast latency benchmarks (artificialanalysis.ai, Vellum LLM leaderboard)
2. Compound AI systems peer-reviewed papers (EMNLP 2025 main + findings)
3. OpenAI Codex pricing (official + third-party comparisons)
4. Best-of-N + verifier test-time-compute papers (Snell ICLR 2025 — biggest find)

### The Snell ICLR 2025 finding is the load-bearing breakthrough

["Scaling LLM Test-Time Compute Optimally Can be More Effective than Scaling Parameters"](https://openreview.net/forum?id=4FWAwZtd2n) directly proves the cheapcode-auto thesis: **compute-optimal test-time scaling outperforms a 14× larger raw model in FLOPs-matched evaluation** when the smaller base attains non-trivial success rates. Best-of-N + verifier is the canonical approach studied. This is exactly cheapcode-auto's wrapper architecture.

Combined with 3 EMNLP 2025 + AlphaCode-2 sources, that's **4 independent peer-reviewed L3 groups converging on the wrapper-beats-frontier mechanism** — mutawatir-equivalent at L3 ceiling per mizaj 14.

### Three claims lifted via mizaj rule 16

| Claim | Pre-research | Post-research | Lift |
|---|---|---|---|
| `cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier` | 0.65 | **0.85** | +0.20 (Snell + 3 CAI groups) |
| `smart_fast_tier_choice_pending_measurement` | 0.50 | **0.75** | +0.25 (artificialanalysis.ai + Vellum) |
| `cheapcode_beats_codex_after_pricing_fetch` | 0.75 | **0.94** | +0.19 (OpenAI official L2 + cheapllm-v1 in-house L1 + uibakery L4 = 3 independent groups, L1 ceiling) |

### Joint confidence delta

| Metric | M1.4 | **M1.5** | Lift |
|---|---|---|---|
| Current correlated joint | 0.068 | **0.168** | +0.100 (~2.5×) |
| Research-only ceiling | 0.194 | **0.341** | +0.147 |
| Full-measurement ceiling | 0.291 | **0.640** | +0.349 (table updated; old values were stale) |

The full-measurement ceiling almost doubled because the M1.5 ceiling table revision honestly reflects what L1 own-measurement gives per group (e.g., `vs-codex` ceiling now 0.99 because we'd run our own Codex benchmark; previously 0.85). The old ceilings were conservative-by-default; the M1.5 lifts surfaced the staleness.

### Honest current state

- **17% joint confidence** today (pre-experiment, pre-code).
- **34% reachable via more research alone** (more literature searches, more L1 in-house computations from cheapllm + iai daftar shards).
- **64% reachable via full measurement** (EXPERIMENT-1 + 3 small probes = ~$10 total spend).
- **0.99999 still structurally unreachable** for any 27-claim composition. Reducing N is the only path past 64%.

### Honest concerns

- The full-measurement ceiling at 64% makes shipping at "no falsifier triggered" far more credible than at the prior 29% number — but it's still not a 99% confident plan. Per atom 0015, atom 0011, the structural cap holds.
- The Snell paper's main result is on math reasoning. Transfer to TB-medium/hard multistep is moderate-but-not-perfect (transfer gap 0.4, illah strength 0.55 — illah > gap so no penalty per mizaj 16 formula, but the transfer is still extrapolation). EXPERIMENT-1 would close this.
- `smart_fast_tier_choice_pending_measurement` at 0.75 still has a -0.10 mutawatir penalty (only 2 independent groups). Finding 2 more independent latency-benchmark sources would lift to 0.85.

### Plan changes implied

The path to higher confidence WITHOUT running experiments is now clear:
- Find 2+ more independent smart-fast latency sources → lift tier-choices-pending group to ceiling
- Find more cross-model verification sources (currently 3 groups) → lift auto-wrapper group to ceiling
- Compute more L1 in-house cost ratios from cheapllm/iai receipts → lift vs-vanilla group

Each round of targeted research lifts 1–3 percentage points on the joint. Continuing returns are diminishing — the floor approaches the 34% research-only ceiling.

### Pointer for the next agent

Three orthogonal next paths:

1. **Continue research rounds** (diminishing returns; 17% → ~34% asymptote)
2. **Run EXPERIMENT-1** ($5, 3h, fits in operator's $10 / 24h envelope) — lifts joint toward 64%
3. **Reduce N** — if operator picks "5 load-bearing claims," joint at `0.85^5 ≈ 0.44` matches research-only ceiling but at much higher *per-claim* confidence

The operator's instruction "plan is super flexible" makes any of these (or combinations) viable.

---

## M1.4 — operator-tightened constraints + multistep-only smarter claim (2026-05-02)

### What changed (operator-direct edit to MAIN.md)

Operator edited MAIN.md with three material updates that propagate upstream:

**1. Constraints tightened.** Cost cap $10 (was $50), wall-clock 24h (was 1 week). RTX 4070 GPU available during build but not after handoff.

**2. Smarter claim refined to multistep-only.** New "What you ARE getting": *"A model smarter than frontier models at multistep hard tasks."* New "What you are NOT getting": *"Not smarter than GPT-5 on single step tasks."* This is the sharper claim — multistep is where decomposition + best-of-K + cross-model verification + retry leverage compounds; single-step is bounded by best-frontier-in-ensemble.

**3. Confidence section added.** Operator left it as `x%` for me to fill.

### Upstream propagation

- [`SPEC.md`](SPEC.md) Revision 2026-05-02e — constraints + multistep distinction locked.
- [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md) — budget cut from ≤$50 to ≤$5; wall-clock from ≤6h to ≤3h; N from 30 to 10 multistep tasks; single-step explicitly excluded.
- [`plan/PLAN.bn`](plan/PLAN.bn) — main load-bearing claim renamed `cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier`; confidence lifted from `@>=0.55` to `@>=0.65` because the tighter multistep scope is more defensible (per atom 0015 — narrower claim transfers from literature with higher fidelity).
- [`tools/joint-confidence.ts`](tools/joint-confidence.ts) — claim renamed; confidence updated.
- [`MAIN.md`](MAIN.md) Confidence section filled with current joint (~7%).

### Joint confidence delta from M1.3

| Metric | M1.3 | **M1.4** |
|---|---|---|
| Joint, current correlated | 0.058 | **0.068** |
| Joint, research-only ceiling | 0.194 | 0.194 |
| Joint, full-measurement ceiling | 0.291 | 0.291 |

The +0.01 lift comes from refining the load-bearing claim's scope (multistep-only is more defensible). The ceilings unchanged because they're set by the structure, not the per-claim values.

### Honest implications of the tightening

- **$10 budget = same envelope cheapllm v1 had.** It worked there because cheapllm's hot path is mostly free (cheap base model). cheapcode similarly: hot path is wrapper code (free) + EXPERIMENT-1 ($5) + small measurements (~$3 total). Margin: $2.
- **24h wall-clock = MIN-tier wrapper or nothing.** Cells #14 + #18 cap at MIN. EXPECTED tier (≤900 LoC, ≤700 LoC wrapper) and IDEAL tier are deferred to post-v1 unless the wrapper can be authored quickly enough.
- **RTX 4070 during build = potential for local cheap-tier baseline runs in EXPERIMENT-1.** Could reduce some OpenRouter spend. Not committed; opportunistic.
- **Multistep-only claim = stronger and tighter.** We're no longer claiming smarter on single-step (which was indefensible). Now claiming smarter where ensemble methods leverage compounds. More honest, more defensible, slightly higher confidence.

### Honest concerns

- **24h is aggressive.** cheapllm v1 shipped its 4-axis-receipts within 24h but it's a leaner project (model wrapper, not full harness). cheapcode's wrapper requires plan-decompose + verifier + best-of-K wiring — that's harder to land in 24h. MIN-tier wrapper is achievable; EXPECTED is a stretch.
- **EXPERIMENT-1 at N=10 has wider CIs.** ±16pp on completion rate. Sufficient for the 10pp lift target but tight. PARTIAL outcomes more likely.
- **Confidence still ~7% pre-experiment.** Per atom 0015, the ceiling stays at ~29% even with full measurement. Not a 99.999% plan.

### Plan changes implied

- EXPERIMENT-1 must run inside the $10 envelope. ~$5 per run; if PARTIAL, one retry at ~$2 fits. Beyond that, halt.
- 24h envelope demands the MIN-tier wrapper (~350 LoC); EXPECTED is post-v1.
- The multistep-only scoping means EXPERIMENT-1's task selection must filter to TB tasks with multi-step structure (typically those marked TB-medium or TB-hard with explicit sub-task decomposition). Single-step tasks excluded from baseline + wrapper runs.

### Pointer for the next agent

Three operator decisions still open (now constrained by the tightening):

1. **Run EXPERIMENT-1 inside $5 / 3h envelope?** This is now the load-bearing first move — fits inside the $10 budget with margin.
2. **Pick MIN-tier wrapper for v1?** EXPECTED is unreachable in 24h.
3. **Confidence reframe pick.** Same three options as M0.9: accept ~29% ceiling / reduce N / track failures.

Highest-leverage next move: EXPERIMENT-1 at N=10 multistep tasks. Decides the wrapper claim alive/dead inside the $10 / 24h envelope.

---

## M1.3 — research-equivalence formula + 5 claims lifted via synthesis (2026-05-02)

(See git log for M1.3 details. The operator edit triggering M1.4 came after M1.3 committed at `cheapcode@6ee31f8`.)

---

## M1.2 — 3-axis comprehensive-dominance refactor (2026-05-02)

### What changed (operator pushback on M1.1's modesty)

Operator: "we shouldnt be aiming to achieve ≥90% of raw GPT-5.5 if we are allowed to use gpt 5.5 and other models, we should build our system so that it is ALOT CHEAPER, ALOT FASTER, and SMARTER."

The point lands. M1.1 framed the claim as "cost-adjusted dominance with quality bounded by smart-tier base model." But if the wrapper can call frontier models internally (GPT-5.5, Claude Opus, Gemini-pro), it ISN'T bounded by single-model capability — best-of-K + cross-model ensemble + verifier consistently lifts hard-benchmark scores 5–15% in the literature (AlphaCode-2 beat raw Gemini; METR's verification-augmented Claude evals).

The honest claim is therefore **3-axis comprehensive dominance over raw single-call GPT-5.5**: cheaper AND faster AND smarter, simultaneously, on hard reasoning.

### Architectural deltas from M1.1

| Aspect | M1.1 | M1.2 |
|---|---|---|
| Honest claim shape | cost-adjusted dominance, raw quality bounded | 3-axis comprehensive dominance over raw frontier |
| Wrapper components | plan + verify + cross-witness + retry | + best-of-K + cross-MODEL (not cross-witness) + parallel exec |
| Wrapper LoC budget (cell #18) | 200/400/600 | **350/700/1000** |
| Total LoC budget (cell #14) | 350/600/900 | **500/900/1400** |
| EXPERIMENT-1 kill-criteria | wrapper completion ≥90% AND cost ≤80% (cost-adjusted) | wrapper cost ≤30% AND latency ≤70% AND completion ≥110% (all 3 axes) |
| Frontier models in ensemble | gpt-5-mini only | GPT-5.5 + Claude Opus + Gemini-pro |

### Files updated

- [`SPEC.md`](SPEC.md) Revision 2026-05-02d — comprehensive-dominance claim, 3-axis targets, expanded LoC cells, falsifier-gated tier discipline (each LoC tier unlocked by a measurement).
- [`plan/PLAN.bn`](plan/PLAN.bn) — replaced cost-adjusted-dominance claim with `cheapcode_auto_3_axis_dominance_over_raw_frontier`. Added `best_of_k_3_lifts_completion_5_to_15pct`, `cross_model_verification_lifts_over_self_verify`, `parallel_leaf_execution_keeps_latency_below_raw`.
- [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md) — rewritten with PASS-IDEAL / PASS-EXPECTED / PASS-MIN / PARTIAL / FAIL outcomes; budget bumped to ≤6 hours / ≤$50.
- [`tools/joint-confidence.ts`](tools/joint-confidence.ts) — 27 claims, 11 groups.
- [`MAIN.md`](MAIN.md) rewritten (HS-readable) with the bold pitch + honest "claim drops confidence with bigger ambition" framing.

### Joint confidence delta

| Metric | M1.0 | M1.1 | M1.2 |
|---|---|---|---|
| Claim count | 19 | 24 | **27** |
| Joint, current | 0.139 | 0.045 | **0.032** |
| Joint, post-measurement ceiling | 0.448 | 0.355 | **0.291** |
| Bottleneck | tier-choices @ 0.50 | hard-reasoning @ 0.50 | hard-reasoning @ 0.55 + ensemble-methods @ 0.65 |

**Adding the bigger ambition keeps lowering the ceiling.** Compositional dilution per atom 0015. Each new load-bearing claim multiplies through. The ceiling drops from 0.45 (M1.0) → 0.36 (M1.1) → 0.29 (M1.2). Per atom 0011, the larger LoC commitment is gated by EXPERIMENT-1 outcomes — if MIN tier fails, no further code is written.

### Honest tradeoff

| Axis | Pre-M1.2 framing | Post-M1.2 framing | Tradeoff |
|---|---|---|---|
| Ambition | cost-adjusted dominance only | comprehensive dominance | **+** bolder claim, **−** lower joint until measured |
| LoC | ≤900 IDEAL | ≤1400 IDEAL | **−** more maintenance surface |
| Falsifier difficulty | 2 ratios (completion + cost) | 3 ratios (cost + latency + completion) | **+** stronger falsifier, **−** harder to PASS |
| Comp. ceiling | 0.36 | 0.29 | **−** lower joint cap from N grows |

Operator instruction is the gate: bigger ambition is wanted; the substrate enforces honest math against it.

### Honest concerns

- **3-axis target is demanding.** All three ratios must clear simultaneously. PARTIAL outcomes are likely; SPEC accepts that and reframes to cleared axes.
- **Ensemble lift is research-transfer, not in-domain measured.** Atom 0015 says transfer is overstated by default. The 5–15% lift might land at the low end for our slice.
- **LoC creep.** ≤1400 is the IDEAL ceiling; falsifier-gated discipline keeps actual write below MIN unless measurement justifies more.

### Plan changes implied

- EXPERIMENT-1 is now load-bearing AT THREE AXES. Outcomes:
  - PASS-IDEAL: ship full wrapper, 3-axis claim defensible
  - PASS-EXPECTED: ship MIN-tier wrapper, 3-axis claim narrower
  - PASS-MIN: ship MIN-tier wrapper with disclosed narrow margins
  - PARTIAL: reframe claim to cleared axes (likely cheaper + faster, drop smarter)
  - FAIL: revert SPEC Revision 2026-05-02d; ship cheapcode at M1.0 narrower niche
- The path from 0% → 100% progress is now: 5-tier registration → EXPERIMENT-1 → wrapper MIN → wrapper EXPECTED → ship.

### Pointer for the next agent

Three operator decisions still open:

1. **Time target.** ~1 week worst-case for full v1 (gated by EXPERIMENT-1 outcomes).
2. **AI testing budget.** ~$50 for EXPERIMENT-1 + 4 smaller measurements.
3. **Confidence-target reframe / scope.** Run EXPERIMENT-1 (commits to wrapper LoC), or ship M1.0-narrower (skip wrapper entirely), or cut other tiers.

The single highest-leverage measurement: **EXPERIMENT-1**. Decides whether the M1.2 wrapper code is worth writing. Even if operator picks ship-narrower, running EXPERIMENT-1 first is cheap insurance against future regret.

---

## M1.1 — refactor for hard-reasoning honest claim (2026-05-02)

### What changed (operator-driven refactor)

Operator asked: refactor everything so cheapcode can also be honestly claim "best at high-end multi-step reasoning." Previously cheapcode explicitly disclaimed this territory (per cheapllm v1's H6 Q3-A niche framing — cheapllm-smart's 11.1% on TB-medium/hard).

The refactor lifts `auto` from a task-type router into a **structured-reasoning wrapper** that earns the hard-reasoning claim on a **cost-adjusted basis**:

1. Plan-decompose with smart-tier (1 call)
2. Execute leaves at cheap-tier (N cheap calls)
3. Verify with smart-tier (1 call)
4. Cross-witness pass with smart-tier blind (1 call) — atom 0010 application
5. Retry-with-feedback if verifier disagrees (1 retry max)

Total smart-tier calls per hard task: ~3 vs raw-frontier's 1 at full price. The wrapper's claim is cost-adjusted dominance — beating raw frontier per-correct-task while sacrificing raw-quality (which is structurally bounded by base-model capability, atom 0015).

### Architectural deltas from M1.0

| Aspect | M1.0 | M1.1 |
|---|---|---|
| `auto` shape | task-type router (apophatic) | structured-reasoning wrapper |
| Honest claim | low-cost loops + long-context only | + cost-adjusted hard reasoning |
| Wrapper LoC budget | n/a | new cell #18: ≤200/400/600 LoC |
| Total LoC budget | ≤200/350/500 | ≤350/600/900 |
| Load-bearing falsifier | none | EXPERIMENT-1 (cost-adjusted hard reasoning) |
| Substrate atoms cited | 0011, 0013, 0015 | + 0010 cross-witness (now load-bearing in wrapper) |

### Files updated

- [`SPEC.md`](SPEC.md) Revision 2026-05-02c with the structured-reasoning wrapper, expanded LoC budgets, new cell #18.
- [`plan/PLAN.bn`](plan/PLAN.bn) with 5 new claims (verifier-hook-catches-50pct, cross-witness-pattern-lifts-hard-reasoning, plan-decompose-amortizes, cheapcode-auto-dominates-cost-adjusted-hard-reasoning, honest-niche-includes-cost-adjusted-hard-reasoning) and 4 new observations.
- [`plan/EXPERIMENT-1.md`](plan/EXPERIMENT-1.md) — pre-registered cost-adjusted hard-reasoning experiment with PASS/PARTIAL/MARGINAL/FAIL kill criteria.
- [`tools/joint-confidence.ts`](tools/joint-confidence.ts) updated: 24 claims, 10 groups.
- [`MAIN.md`](MAIN.md) rewritten (HS-readable) with the new pitch, including the honest "claim drops confidence until measured" framing.

### Joint confidence delta

| Metric | M1.0 (5-model surgical pivot) | M1.1 (after refactor) |
|---|---|---|
| Claim count | 19 | 24 |
| Joint, current | 0.139 | **0.045** (DROPPED — honest: new claim is unmeasured) |
| Joint, post-measurement ceiling | 0.448 | **0.355** (DROPPED — more claims = more dilution) |
| Bottleneck | tier-choices-pending @ 0.50 | hard-reasoning-claim @ 0.50 (EXPERIMENT-1 gate) |

**Adding the hard-reasoning claim costs confidence today.** That's the substrate-discipline payoff per atom 0015: a claim doesn't auto-lift confidence just because we wrote it down. The pre-registered EXPERIMENT-1 is the gate that earns the confidence back if the wrapper actually works.

### Honest tradeoff acknowledged

The refactor doubles wrapper code (~300-400 LoC vs ~150 LoC) and adds 5 load-bearing claims. The structural cap on joint confidence dropped from 45% to 36%. Three paths from here:

1. **Run EXPERIMENT-1.** PASS lifts the hard-reasoning claim from 0.50 to 0.85 (its post-measurement ceiling), bringing joint up. FAIL kills the claim and reverts to M1.0's narrower niche.
2. **Skip EXPERIMENT-1, ship narrower.** Revert this refactor; ship M1.0's 5-tier surgical add without the wrapper. Lower ambition, higher confidence floor.
3. **Cut other claims to compensate.** Drop `cheap-fast` and `smart-fast` from v1 if the operator decides 3 tiers + auto-wrapper is the right scope.

### Honest concerns

- The hard-reasoning claim is currently a **hypothesis backed by atom citations**, not a measurement. EXPERIMENT-1 is load-bearing.
- LoC budget doubles. Trade-off accepted in SPEC; operator should weigh.
- No L1 measurements yet for any of the 5 new claims; all sit at 0.50–0.65.

### Plan changes implied

Whichever path operator picks dictates the next loop:

- If **option 1** (run EXPERIMENT-1): allocate ~$20 + 4 hours; pre-register the verdict + run the baseline + run the wrapper; record outcome.
- If **option 2** (skip and ship narrower): revert PLAN.bn + SPEC + MAIN.md to M1.0 state; commit a "M1.1-reverted" milestone.
- If **option 3** (cut tiers): rewrite SPEC's tier table to 3 tiers + auto-wrapper; recompute joint.

### Pointer for the next agent

Three operator decisions still open:

1. **Time target.** The wrapper adds ~12 hours of work post-EXPERIMENT-1.
2. **AI testing budget.** ~$30–50 for full validation including EXPERIMENT-1.
3. **Confidence reframe / scope decision.** Run EXPERIMENT-1, skip and ship narrower, or cut tiers.

Highest-leverage next move regardless of decision: **EXPERIMENT-1**. It's the falsifier that decides whether the hard-reasoning claim is alive or dead. Even if the operator chooses to ship narrower, running EXPERIMENT-1 first is cheap insurance against a future "should we have tried?" regret.

---

## M1.0 — architectural pivot: 5-model surgical add + honest niche (2026-05-02)

### What changed (operator-driven pivot)

Operator clarified two things that materially change the plan:

1. **cheapllm is just a wrapper around OpenRouter.** So cheapcode doesn't plug an *external* cheapllm process into opencode; instead it bakes the tier-routing logic directly into opencode's provider registry as 5 synthetic models (`cheap`, `cheap-fast`, `smart`, `smart-fast`, `auto`) that activate when OpenRouter is connected.
2. **Knowledge transfer from cheapllm v1 + iai.** cheapllm's measured per-tier OR model receipts (deepseek-v4-flash for cheap, grok-4-fast for >128k context, gpt-5-mini for smart escalation) and iai's apophatic-router pattern (~80 LoC, hardcoded mapping + first-class fallback) directly carry over.

Plus the operator pasted cheapllm v1's current status (90% complete, projected ship in ~90 min), which surfaces a critical refinement: **cheapllm-smart's router-on-cheap-base under-performs at 11.1% on TB-medium/hard.** Per atom 0013 (calibration-as-credential): honest niche dominance > weakly-best-overall pretense. cheapcode's `smart` tier therefore routes **directly** to actual capable models (gpt-5-mini, gpt-5-nano, haiku-4.5) — no router-pretending on cheap base.

### Architectural shape locked

| Tier | Default OR model / strategy | Receipt source |
|---|---|---|
| `cheap` | `deepseek/deepseek-v4-flash` | cheapllm v1 Phase 0 + F-E1; $0.0015–0.0032/task |
| `cheap-fast` | race-K of `deepseek-v4-flash` + `*-flash-lite` | cheapllm v1 race-K; 2.24s P50 |
| `smart` | `openai/gpt-5-mini` direct | cheapllm v1 F-E1; honest "user pays for capability" |
| `smart-fast` | `claude-haiku-4.5` or `gpt-5-nano` | TBD — needs ≤2× latency benchmark |
| `auto` | router: long-context → grok-4-fast; hard-reasoning → smart direct; default → cheap | iai router design + cheapllm task-type detection |

Implementation footprint per SPEC Revision 2026-05-02b:

- One module: `packages/opencode/src/provider/cheapcode-tiers.ts` (~150 LoC)
- ~15 LoC modification to upstream `provider.ts` near the existing OpenRouter init
- One config file: `cheapcode.toml` for per-tier OR model overrides

New SPEC cells #14–#17:
- Maintained cheapcode code: ≤200 / ≤350 / ≤500 LoC (was ≤500 / ≤1000 / ≤2000)
- Upstream files modified: ≤1 / ≤2 / ≤1
- New top-level packages: 0
- Cross-process protocols: 0

### What was completed in this milestone

- [`SPEC.md`](SPEC.md) Revision 2026-05-02b with the architectural pivot, honest niche framing, surgical-fork cells.
- [`plan/PLAN.bn`](plan/PLAN.bn) rewritten with 19 claims (down from 22) — bottlenecks now at @>=0.50 (smart-fast measurement) instead of @>=0.30 (Codex-vendor research). Honest-niche claim added per atom 0013.
- [`tools/joint-confidence.ts`](tools/joint-confidence.ts) updated with new claim set + post-measurement ceilings.
- [`MAIN.md`](MAIN.md) rewritten (HS-readable) reflecting the pivot + cheapllm v1's honest niche framing inherited.
- Knowledge-transfer probe of upstream opencode confirmed: `provider.ts` already special-cases OpenRouter at line 102/403/1343 — surgical add is feasible.
- Burhan validates True for both PLAN.bn + MAIN.bn. Audit-verify: 51 resolved, 16 offline, 0 missing.

### Joint confidence delta

| Metric | Before pivot | After pivot |
|---|---|---|
| N (claims) | 22 | 19 (down 14%) |
| Joint, correlated current | 0.021 | **0.139** (up 6.6×) |
| Joint, post-measurement ceiling | 0.462 | 0.448 (small change; honest-niche group raises floor) |
| Bottleneck | `vs-codex` @ 0.30 | `tier-choices-pending` (smart-fast/cheap-fast) @ 0.50 |

The pivot's main win is making the bottleneck a *cheap measurement* (~$0.50 + 30 min latency probe) instead of a *vendor-research-dependent* L4-cap (Codex pricing). Three quick measurements (smart-fast pick, cheap-fast race-K verification, vanilla-opencode-vs-cheapcode probe) lift joint from ~14% to ~45%.

### Honest concerns

- The math is still single-witness (atom 0010 blinded-witness-pass deferred from M0.9 still pending).
- `cheapcode-v2-surgical-architecture` is a documentary audit tag (theorem-level), not file-resolvable. Acknowledged as advisory in audit-verify.
- The 6h prototype / 3-day full-v1 envelopes are proposals; operator confirmation needed.

### Plan changes implied

The structural ceiling is still ~45% joint. If operator wants higher than that, paths are:
- Cut more claims (drop `cheap-fast` and `smart-fast` from v1 — ship 3 tiers instead of 5)
- Run the 3 measurements that lift the bottleneck groups (~$6, ~3 hours)
- Both

### Pointer for the next agent

Three operator decisions still open:

1. **Time target.** ~6h prototype / ~3 days full-v1 per the pivot, or different.
2. **AI testing budget.** $10–20 working number.
3. **Confidence-target reframe.** Same three options as M0.9 — pick.

Highest-leverage research/measurement under the pivot:

1. `smart-fast` model latency probe (~$0.50, ~30 min) — lifts `tier-choices-pending` group
2. `cheap-fast` race-K verification on current OR catalog (~$0.50, ~30 min)
3. Codex vendor pricing fetch (free, ~30 min) — lifts `vs-codex` to L2 ceiling
4. L1 vanilla-opencode-vs-cheapcode probe (~$5, ~2h) — lifts `vs-vanilla`

After all four: joint reaches ~0.45 (the structural ceiling for this composition).

---

## M0.9 — MAIN.md + calibration-audit applied + honest @>=0.99999 cap (2026-05-02)

### What was completed

- [`MAIN.md`](MAIN.md) — operator-readable one-page view: goal, time target (proposed; awaits operator confirmation), limits, current confidence (~2% joint with math), the structural cap on `@>=0.99999`, progress bar (currently 0%, all-planning-and-research-counts-as-zero per operator instruction), what carries the most lift, reading order.
- [`tools/joint-confidence.ts`](tools/joint-confidence.ts) — reproducible computation of joint confidence from PLAN.bn's 22 top-theorem assumptions. Three views: independent-22-claim, correlated-8-group (more honest), post-full-L1-measurement-ceiling. Surfaces bottleneck groups.
- [`plan/MAIN.bn`](plan/MAIN.bn) — calibration-audit lectionary cycle applied to MAIN.md's confidence claim. Cites atoms 0011, 0015, 0008, 0014, 0007 (atom 0010 deferred — the blinded-witness pass is the missing cycle step). Pre-registers halt-condition: if joint-confidence math is contradicted by independent re-computation, halt.
- [`tools/burhan-validate.sh`](tools/burhan-validate.sh) extended to validate ALL top-level `plan/*.bn` files (PLAN.bn + MAIN.bn), each concatenated with the shared facts/.
- [`tools/audit-verify.sh`](tools/audit-verify.sh) extended with new patterns: `cheapcode-joint-confidence-computation`, `calibration-audit-*`, theorem-level documentary tags (advisory-only). Result: 51 resolved / 17 offline / 0 missing across both PLAN.bn and MAIN.bn.

### What was learned

The honest math: `@>=0.99999` is structurally unreachable for the current 22-claim composition.

| State | Joint confidence |
|---|---|
| Today | ~0.021 (correlated 8-group) or ~0.0015 (independent 22-claim) |
| After full L1 measurement on bottleneck groups | ~0.462 |
| Required per claim for 5-nines joint over 22 indep | `@>=0.99999955` (six nines) |
| Required per group for 5-nines joint over 8 corr | `@>=0.99999875` (six nines) |

Per mizaj rule 11, L1 ceiling per claim is `@>=0.95-0.99`. **No single research source provides six nines.** The compositional dilution is a consequence of `claim_A AND claim_B AND ...` — each "AND" is a confidence multiplication, and the joint cannot exceed the product.

This is mizaj rule 04 (separate-stated-from-revealed) in action: stated target `@>=0.99999` reveals a cap of `~0.46` joint at full measurement. The right move is reframing the goal:

1. **Per-claim `@>=0.95` + "no falsifier triggered"** as the practical ship criterion (achievable with L1 measurement)
2. **Reduce N** — restate SPEC with fewer load-bearing claims (4 instead of 22 brings `0.95^4 ≈ 0.81` joint within reach)
3. **Sequential discharge** — accept "no falsifier triggered" rather than "proven at 5 nines"

Bottleneck groups identified by [`tools/joint-confidence.ts`](tools/joint-confidence.ts):

- `vs-codex` @ 0.30 — needs vendor pricing fetch (cheap)
- `vs-vanilla-opencode` @ 0.40 — L1-measurable cheap (run vanilla against cheapbench)
- `cheapllm-smart-axis` @ 0.50 — wait for cheapllm F-H3 K=1
- `cheapcode-harness` @ 0.50 — needs EXPERIMENT-0 + EXPERIMENT-2

Lifting all four takes joint from 2% to ~46% — a 23× increase. That's the right ambition shape.

### Honest concerns

- **Single-witness audit.** The calibration-audit cycle's atom-0010 (blinded-independent-witness-pass) was NOT run on this audit. The math + conclusion is single-witness. A blinded second pass — by a different model not seeing this analysis — would either confirm or discover a flaw in the joint-confidence computation. Flagged in MAIN.bn as `cycle_atom_4_blinded_witness_deferred`.
- **Time + token-cost limits unset.** MAIN.md proposes envelopes; operator confirmation is the next gate.
- **Confidence-target reframe not yet accepted.** MAIN.md proposes 3 reframings; operator must pick one (or reject and accept the structural cap as a hard constraint).

### Plan changes implied

Whichever reframe operator picks dictates the next loop:

- If **option 1** (per-claim `@>=0.95` + no-falsifier): proceed with measurement-driven research per CONFIDENCE.md, target ~0.46 joint as the ship floor.
- If **option 2** (reduce N): rewrite SPEC.md cells to a smaller load-bearing claim set.
- If **option 3** (sequential discharge): reframe progress bar around falsifier-triggered events.

### Pointer for the next agent

Three operator decisions surface before more work:

1. **Time target.** MIN/EXPECTED/IDEAL envelopes per MAIN.md proposal, or different.
2. **Token-cost budget for cheapcode.** Currently unset.
3. **Confidence-target reframe.** Pick option 1, 2, or 3 from MAIN.md.

After confirmation, the highest-leverage research/measurement is in this order:

1. L2 vendor-pricing fetch for hosted competitors (Codex, Claude Code, Cursor, Devin) — lifts `vs-codex` group fast and cheap.
2. EXPERIMENT-0 — gates the propagation thesis; lifts the cheapcode-harness group.
3. L1 own-measurement of vanilla opencode + cheapllm against cheapbench — lifts `vs-vanilla` to L1.
4. Wait for cheapllm F-H3 K=1 — lifts cheapllm-smart-axis.

Per atom 0010 (blinded-independent-witness): a second-pass review of the joint-confidence math would tighten the audit further. Defer until other work pressures it.

---

## M0.8 — substrate-completion sweep (2026-05-02)

### What was completed

Five sequential loops on the four-tool substrate to bring it to a state where further direct work yields diminishing returns.

**Loop 1 — atom seed backfill.** All 15 khazīna atoms now carry compressed `seed` fields per SCHEMA 0.2.0 discipline (≤30 words). The 4 most-cited (0008, 0011, 0013, 0015) had seeds from M0.7; backfilled 0001–0007, 0009, 0010, 0012, 0014. `bin/khazina-export-burhan` emits the seed for every atom.

**Loop 2 — daftar Sahih promotion.** Wrote [`tools/promote-to-sahih.ts`](tools/promote-to-sahih.ts) — a one-pass migration script that reads every lemma in `plan/facts/*.bn` and creates a corresponding daftar sahih segment. **64 segments promoted** to cheapcode's shard with grade distribution: 50 sahih (substrate citations + cheapllm receipts + khazīna atom lemmas), 11 hasan (research papers — TruthfulQA / ReAct / Toolformer per mizaj 11 L3 ceiling), 3 daif (Constitutional AI L4 vendor tech report). Idempotent (re-run promotes 0, skips 64).

**Loop 3 — daftar cross-shard verification.** Initial chain-verify reported 8 broken chains (the cheapllm-daftar-note-* references). Root cause: `verifyIsnadLink` treated all `daftar:` prefixes as "unverifiable_offline" without actually trying to resolve. Extended the function to recognize `daftar:<project-shortname>:note-XXXX` format and call `getEntry()` on the named project's shard. Post-fix: **64/64 chains intact**. Daftar suite 19/19 pass; no regressions.

**Loop 4 — lectionary scaffolding.** Created `~/apps/khazina/lectionary/` with two curated atom reading-cycles:
- `calibration-audit.md` — 6 atoms (0011 → 0015 → 0008 → 0010 → 0014 → 0007) for confidence-review work
- `architecture-decision.md` — 7 atoms (0011 → 0005 → 0006 → 0001 → 0007 → 0009 → 0012) for design proposals

Plus `bin/khazina-lectionary` CLI (reads cycle, outputs atoms in order with per-atom `'illah` and seeds; JSON output for substrate-tool consumption). The Qur'anic-muqaṭṭaʿāt M:N seed-to-surah mapping is the structural inspiration; cycles capture the same pattern for atoms-to-contexts.

**Loop 5 — operational closure.**
- Updated `tools/audit-verify.sh` to resolve `cheapllm-daftar-note-*` tags via the daftar API. Result: **50 resolved, 14 offline (just arXiv URLs), 0 missing** (up from 26 resolved, 22 offline).
- Added [`~/apps/mizaj/rules/INDEX.md`](../../mizaj/rules/INDEX.md) — at-a-glance index of all 14 mizaj rules with companion-rule pairings (M11+M14, M01+M05, M07+M02, M13+M14, M15+M11).

### Cross-tool state at M0.8

| Tool | State |
|---|---|
| daftar | 64 sahih segments in cheapcode shard (50 sahih / 11 hasan / 3 daif), 64/64 chains intact, cross-shard verify implemented, full suite 19/19 pass |
| mizaj | 14 rules + INDEX.md; 11/14/15 are the cheapcode-load-bearing trio |
| burhan | unchanged (Round 1 + concat-tool + comment convention sufficient); validates True over PLAN.bn + 4 fact files = 98 lemmas |
| khazīna | 15 atoms all with seeds; 2 lectionary cycles; 4 bin scripts (new-atom, match-problem, khazina-export-burhan, khazina-lectionary); SCHEMA 0.2.1 |

### What was learned

The four-tool coupling now closes end-to-end without ceremony gaps:
1. Burhan plan claims cite atom lemmas (Section J in PLAN.bn)
2. Atom lemmas reference khazīna atoms via audit tags
3. Audit tags resolve via `tools/audit-verify.sh` (filesystem) or daftar's cross-shard `verifyIsnadLink` (cross-project)
4. Each lemma is mirrored as a daftar sahih segment (per mizaj 14 grading)
5. Lectionary cycles compose atoms for reasoning contexts (per mizaj 15)
6. Mizaj rules govern source-tier (11), chain-grade (14), and atom-consultation (15) discipline at every step

Diminishing returns past this point: the remaining substrate work is either premature (per [`khazīna/plan/07-maintenance-disciplines.md`](../../khazina/plan/07-maintenance-disciplines.md) deferred items — access-cost tracking, hot/cold gradient, cross-atom pointers — all gated on catalog growth or measurement infrastructure) or ceremony (more lectionary cycles before they earn their use; more atom-seed compression past the current discipline floor).

### Honest concerns

- **arXiv URLs still offline** — 14 audit tags map to arxiv.org URLs that audit-verify treats as offline. Adding `--network` mode to `audit-verify.sh` (curl HEAD on each URL) would close this gap; deferred because it's small QoL not load-bearing.
- **Lectionary cycles are unproven.** Two cycles defined; neither has been applied yet to a real audit/decision. The cycle-level falsifier (does applying the cycle measurably reduce wrong-conclusion incidents?) is pending real use.
- **The `cheapcode` work itself remains gated on EXPERIMENT-0** — the substrate is now strong, but the propagation thesis still needs the discriminating experiment before any opencode fork is touched.

### Plan changes implied

- Substrate work pauses here unless a specific gap surfaces during cheapcode application.
- Next cheapcode loop returns focus to the propagation thesis: run EXPERIMENT-0 (gates the fork-vs-wrapper question), or continue research-driven confidence lifts on Section E + H.
- When/if the catalog grows past ~30 atoms, revisit the deferred maintenance-discipline items (access cost, hot/cold, cross-atom pointers).

### Pointer for the next agent

Substrate is at completion. Three orthogonal next paths:

1. **Run EXPERIMENT-0** — the propagation thesis test that gates the cheapcode fork. Out of further substrate work; into measurement.
2. **Continue Section E research** — sub-7B inference-time prompt papers (per [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) revision pointer); lifts cheapcode confidence honestly.
3. **Apply a lectionary cycle to a real cheapcode audit** — proves the cycle's claim by use; closes the cycle-level falsifier.

---

## M0.7 — khazina connection: atoms as compressed unlocks (2026-05-02)

### What was completed

- **Substrate extension:** [`~/apps/mizaj/rules/15-consult-atom-before-reinventing.md`](../../mizaj/rules/15-consult-atom-before-reinventing.md) — codifies the consult-atom-first discipline. `'Illah` is the *Imaginary Word Hypothesis* from `~/apps/THELECTIONARY/` — the atom seed projects onto a problem situation the way muqaṭṭaʿāt project via Abjad onto load-bearing surah words.
- **Khazīna SCHEMA bump 0.1.0 → 0.2.0:** added optional `novel_move.seed` field. Density discipline: ≤30 words, the compressed unlock that surfaces FIRST when an atom is invoked. Backward-compatible (atoms without `seed` fall back to `one_line` in the exporter).
- **4 substrate atoms updated with seed:** 0008 (claim-shape-runtime-anchored), 0011 (smallest-distinguishing-experiment-first), 0013 (calibration-discipline-as-credential), 0015 (transfer-overstated). These are the atoms cheapcode cites most.
- **`~/apps/khazina/bin/khazina-export-burhan`** — emits a `.bn` fact file with one lemma per atom (`atom_<id>_<slug>`). Uses `seed` when present, falls back to `one_line`. Audit-verify-compatible audit tags (`khazina-atoms-NNNN`).
- **[`plan/facts/04-khazina-atoms.bn`](plan/facts/04-khazina-atoms.bn)** — generated for cheapcode; 15 atom lemmas, 89 lines.
- **PLAN.bn additions:**
  - Section J — 4 cite claims anchoring specific cheapcode theses to specific atoms (atom_0008 → claim-shape thesis, atom_0011 → cheapbench design, atom_0015 → conservative transfer ceilings, atom_0013 → calibration-as-credential)
  - `mizaj_15_consult_atom_before_reinventing` lemma added to facts/01
  - Top theorem `cheapcode_outperforms_named_alternatives` extended to require Section J anchors as assumptions
- **Validation:** `tools/burhan-validate.sh` returns `True`; `tools/audit-verify.sh` reports 42 resolved (15 atoms + 27 prior), 22 offline, **0 missing**.

### What was learned

The lectionary file's *Imaginary Word Hypothesis* is structurally the same operation as a khazina atom unlocking a problem. The seed (3 letters / atom title) looks small. When projected against context (Abjad lookup / problem situation), it lands on a load-bearing word/move that organizes the entire surah/reasoning chain. The compression is real — agents without the atom re-derive slowly or miss the move; agents with the atom apply it immediately.

Operator framing — "khazina is a database of condensed information... once the atoms are presented they can unlock a higher level of knowledge immediately" — maps cleanly onto the substrate:
- daftar = stored authenticated facts (hadith collection)
- mizaj = bridge methodology (`Usul al-fiqh`)
- burhan = composition (`Fiqh`)
- **khazina = the compressed unlock-atoms** (the muqaṭṭaʿāt — seeds that project onto load-bearing structural moves)

Mizaj rule 15 is now the canonical "consult atom before reinventing" rule. Citing an atom is a layer-1 propagation move per mizaj 11; the atom's `seed` is what enters context first to minimize tokens.

### Honest concerns

- **Atoms lack daftar-segment grading.** Every Section J cite currently sits at `@>=0.99` provisionally because atoms are L1 own-files-of-record per mizaj 11. Per mizaj 14, atoms should inherit grade from their daftar-segment evidence chain — but the khazina shard hasn't been populated with sahih segments yet. Re-cap confidences once it is.
- **Seed compression discipline applied to only 4 atoms.** The other 11 atoms still emit their `one_line` as the seed surrogate. Backfill batch is queued.
- **Lectionary cycles not yet built.** The "reading-cycle for context X" idea (curated atom sequences for calibration-audit / architecture-review / debugging / etc) is the next piece but not in this turn. Mizaj rule 15 + the exporter are the prerequisites; cycles add a curation layer on top.

### Plan changes implied

- Backfill `seed` field for the remaining 11 atoms (small, mechanical).
- One-pass promotion of `plan/facts/*.bn` lemmas to daftar sahih segments (still queued from M0.6) — when done, atoms can cite the sahih segments that back their evidence chain.
- Lectionary cycle scaffolding in `~/apps/khazina/lectionary/` — pre-curated atom sequences keyed by reasoning context.

### Pointer for the next agent

The substrate is now four-coupled:
- `daftar` stores authenticated facts (with sahih grading)
- `mizaj` rules 11/14/15 govern the bridge (source-class × chain-integrity × atom-consultation)
- `burhan` composes proofs that cite atom lemmas via the new exporter
- `khazina` provides the compressed atom-as-unlock primitive

Three open paths in leverage order:

1. **Backfill `seed` for atoms 0001–0007, 0009, 0010, 0012, 0014** (~11 atoms, all already have one_line; condensing each to ≤30 words takes ~5 min per atom).
2. **Build lectionary cycles** — `~/apps/khazina/lectionary/<context>.md` with curated atom sequences. Start with `calibration-audit` and `architecture-review` (the two most-applicable to cheapcode's own work).
3. **One-pass promotion of `plan/facts/*.bn` lemmas to daftar sahih segments** (carry-over from M0.6).

---

## M0.6 — daftar Sahih extension shipped + audit-verify wired (2026-05-02)

### What was completed

- **Daftar Sahih extension shipped** at daftar repo (~/apps/daftar/, separate commit). Implements the proposal from M0.5 as Option A (minimal-change, kind-extension via metadata_json):
  - `src/sahih.ts` (~330 LoC) — types, validators, `saveSegment`, `getSegmentBySlug`, `gradeSegment`, `naskhSegment`, `querySegments`, `exportSegmentsAsBn`, `verifySegmentChains`, `lexicon`
  - `src/cli.ts` extended with `sahih` subcommand routing 8 sub-subcommands (add/query/grade/naskh/export/verify/show/lexicon)
  - `tests/sahih.test.ts` — 11 tests covering round-trip, duplicate rejection, sahih-empty-isnad rejection, slug validation, re-grade with history, naskh bidirectional links, query filters, export shape, verify resolved/missing, lexicon classification. Full daftar suite 19/19 pass.
  - `README.md` updated with the new entry kind + subsystem pointer.
- **`tools/audit-verify.sh`** wired (~75 LoC bash). Walks every `by audit <tag>` line in `plan/facts/*.bn`, classifies each tag (resolved / offline / missing) per source-class heuristics. Closes the khazina atom 0007 gap (anti-fabrication via artifact verification).
- **First audit-verify run on cheapcode**: 26 resolved (mizaj rules, khazina atoms, cheapllm receipts, archived khatim/sanad refs), 22 offline (daftar cross-shard notes + arXiv URLs — known limitations), **0 missing**. Chain integrity OK across all current `plan/facts/*.bn`.

### What was learned

The Sahih extension implementation validated the M0.5 architectural decision: keeping the discipline in mizaj (rules 11 + 14) and the storage in daftar (this extension) leaves burhan unchanged. The CLI surface fell out cleanly; no parser work needed.

The audit-verify tool surfaces the asymmetry between L1 (filesystem-resolvable, automatic) and L3 (URL, requires network). Currently 22 of 48 audit tags are URL/cross-shard — they're tracked as "offline" not "missing", but a future `--network` flag could raise the resolution rate.

The duplicate-slug rejection in `saveSegment` enforces the Sahih methodology principle that each segment has a unique attribution; updates go through `gradeSegment` or `naskhSegment`, both of which append to history.

### Honest concerns

- **Existing `plan/facts/*.bn` lemmas not yet promoted to daftar sahih segments.** They're authored as burhan lemmas with `by audit <tag>` but haven't been migrated through the daftar sahih CLI. Need a one-pass promotion script (or do it manually in a future M0.x). Without promotion, the daftar sahih layer is empty for cheapcode itself.
- **`exportSegmentsAsBn` output not yet wired into `tools/burhan-validate.sh`.** The end-to-end pipeline (daftar export → concat → burhan validate) requires one more shell-level integration. Trivial follow-up.
- **No `--network` mode in audit-verify yet.** L3 arXiv URLs and L4 vendor pages stay marked offline. Adding curl-based verification is straightforward when needed.
- **Body-bn newline interpretation** in CLI takes `\n` literal escapes — works for shell quoting but not idiomatic JSON; document or add `--body-bn-stdin`.

### Plan changes implied

- M0.7 candidate: write a one-pass promotion script that reads `plan/facts/*.bn` and creates corresponding daftar sahih segments in cheapcode's shard. Each lemma gets an isnad entry derived from its `by audit` tag.
- M0.x candidate: extend `tools/burhan-validate.sh` to optionally consume `daftar sahih export` output instead of raw fact files.
- Continuing: research-driven L3 lifts per CONFIDENCE.md pointer (sub-7B inference-time prompt papers).

### Pointer for the next agent

Three open paths in leverage order:

1. **One-pass promotion of `plan/facts/*.bn` to daftar sahih segments** — would populate the cheapcode daftar shard with 48+ authenticated lemmas + provide first cross-project corroboration test.
2. **Continue research batch (sub-7B inference-time papers)** — lifts Section C confidences honestly; bounded per atom 0015.
3. **Wire `daftar sahih export` into `tools/burhan-validate.sh`** — closes the export-then-validate loop.

---

## M0.5 — mizaj rule 14 (auth grade bounds confidence) + Sahih extension design (2026-05-02)

### What was completed

- Substrate extension: [`~/apps/mizaj/rules/14-authentication-grade-bounds-confidence.md`](../../mizaj/rules/14-authentication-grade-bounds-confidence.md). Codifies the sahih/hasan/daif/mawdu authentication ladder derived from `Ulum al-hadith` as a portable mizaj rule. Companion to rule 11 (source-class axis); together they bound confidence on both axes (source × chain integrity).
- [`plan/facts/01-substrate-citations.bn`](plan/facts/01-substrate-citations.bn) — added `mizaj_14_authentication_grade_bounds_confidence` lemma.
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — Source-credibility ladder section now references mizaj 14 as the chain-integrity-axis companion to mizaj 11. Notes that M14 governs the daftar↔burhan handoff once the Sahih extension lands.
- Burhan validates `True`.

### What was learned

The operator's framing — "mizaj is the language between daftar and burhan, if it needs extension you can update it" — clarified the three-layer substrate architecture cheapcode was already implicitly relying on:

| Layer | Sahih analog | cheapcode artifact |
|---|---|---|
| Storage of authenticated facts | hadith collections (Bukhari/Muslim) | daftar (now with Sahih extension proposed) |
| Methodology / bridge language | `Usul al-fiqh` | mizaj rules (11 + 14 are the canonical pair) |
| Composition of derived claims | `Fiqh` (jurisprudence) | burhan (PLAN.bn theorems) |

This means the daftar Sahih extension (storing graded segments) and burhan (consuming confidence-bounded citations) can stay small; the discipline lives in mizaj. **Burhan was not extended** — its existing comment convention is sufficient for grade documentation, and grade-driven confidence-capping happens at the daftar→burhan handoff via the mizaj rule, not inside burhan's parser.

### Honest concerns

- **daftar Sahih extension still unimplemented.** Mizaj rule 14 defines the discipline; daftar's storage + grading + isnad-verification CLI is the remaining work. Gated on operator's explicit go.
- **Audit-verify still queued.** `tools/audit-verify.sh` to walk every isnad target and flag broken chains is needed before sahih grade can be claimed for anything in `plan/facts/`. Khazīna atom 0007 (anti-fabrication via artifact verification) is the substrate driver.
- **Cross-project corroboration needs a slug-naming convention.** Two daftar shards independently witnessing the same fact requires identical slugs. Either enforce uniqueness or namespace; design choice deferred to the daftar Sahih implementation turn.

### Plan changes implied

- Next implementation candidate (gated on operator go): daftar Sahih extension per the design proposal (Option A — minimal-change, kind-extension via metadata_json).
- Concurrent: `tools/audit-verify.sh` to walk audit targets in `plan/facts/*.bn` and confirm each resolves; this becomes the gating pre-condition for promoting any fact to sahih grade.
- Continuing research: 2024–2026 papers on inference-time prompt-shape uplift on sub-7B models, per [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) Revision 2026-05-02 pointer.

### Pointer for the next agent

Three open paths, in order of leverage:

1. **Implement daftar Sahih extension** (substantial; ~200-300 LoC + tests) — promotes the proposal from design to operating system. Operator approval required.
2. **Write `tools/audit-verify.sh`** (small; ~40 LoC) — closes the atom 0007 gap; pre-requisite for sahih-grade promotion.
3. **Continue L3 research batch** — find 2024-2026 papers with stronger `'illah` to cheapllm's setting (sub-7B inference-time prompt shape).

---

## M0.4 — first L3 paper batch + honest confidence deltas (2026-05-02)

### What was completed

- WebFetched arXiv abstracts for four foundational papers: TruthfulQA (Lin et al. ACL 2022), ReAct (Yao et al. ICLR 2023), Toolformer (Schick et al. arXiv 2023), Constitutional AI (Bai et al. Anthropic 2022).
- [`plan/facts/03-research-papers.bn`](plan/facts/03-research-papers.bn) — 13 lemmas anchoring each paper's headline result, methodology, and tier classification. Per mizaj 11: TruthfulQA / ReAct / Toolformer = L3, Constitutional AI = L4 (Anthropic tech report, not peer-reviewed).
- [`plan/PLAN.bn`](plan/PLAN.bn) Section C confidence updates:
  - `claim_shape_addon_lifts_truthfulness` `@>=0.50 → @>=0.55` (+0.05; TruthfulQA validates benchmark, not method)
  - `daftar_tools_lift_cross_session` `@>=0.55 → @>=0.65` (+0.10; ReAct, but bounded by PaLM-540B → cheapllm transfer gap)
  - `mizaj_consult_tool_lifts_design_quality` unchanged at `@>=0.45` (Constitutional AI is L4 + wrong mechanism)
  - `minimal_tool_set_avoids_tool_spam` unchanged at `@>=0.70` (Toolformer abstract has no tool-count ablation)
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — Revision 2026-05-02 captures the per-paper findings + honest caveats per mizaj rule 05 (`'illah` missing or weak in each transfer).
- Burhan validates `True` after the additions.

### What was learned

The four foundational papers establish the *target benchmarks* and *related shapes* but do **not** validate cheapcode's specific inference-time substrate-tools mechanism. TruthfulQA recommends training-time fine-tuning. ReAct measured on 540B. Constitutional AI is RLAIF training-time. Toolformer is fine-tuning. **None directly support inference-time substrate prompts on a sub-7B model**, which is exactly cheapcode's setting.

This is the operator's "be careful not to be gullible" discipline working as intended. The papers are real, peer-reviewed in three of four cases, and widely cited — but they do not transfer their results to cheapcode's setting, and naming that gap honestly is the substrate-discipline payoff.

The `@>=0.95` confidence target on Section C claims is therefore **structurally bounded above by `@>=0.70`** until our own L1 measurement on cheapllm provides direct evidence. We can keep researching to lift Section A/B/D/E/H further, but Section C ships at the bounded confidence unless EXPERIMENT-2 (claim-shape uplift probe) lands a direct measurement.

### Honest concerns

- **Big gap between target and ceiling on Section C.** Operator wants `@>=0.95`; pure-research ceiling on inference-time-substrate-tools-on-cheapllm is `@>=0.70` until measurement. Either accept the gap, run EXPERIMENT-2, or downgrade target on Section C alone.
- **L4-classification of Constitutional AI may need revisiting** if Anthropic publishes a peer-reviewed version, or if a major journal/conference reproduces. Re-tier in that case.
- **Audit-tag verification not yet wired.** `tools/audit-verify.sh` still queued.

### Plan changes implied

- Next research batch should look for **2024–2026 papers on inference-time prompt-shape uplift on sub-7B models** (Phi, Llama-small, Mistral-small). Those have higher-`'illah` transfer to cheapllm and could lift Section C confidence further without measurement.
- After that, `plan/facts/04-vendor-pricing.bn` for L2 competitor pricing (Codex, Claude Code, Aider, Goose, Continue, Cursor, Devin).
- EXPERIMENT-2 (claim-shape uplift probe on cheapllm) is now on the critical path for Section C `@>=0.95`.

### Pointer for the next agent

Continue research per [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) Revision 2026-05-02 "Next research batch" pointer. Each fetch must:
1. Tier the source per mizaj rule 11 (cite tier inline)
2. Quote the relevant claim or measurement verbatim
3. Name the `'illah` (structural reason transfer holds) or honestly note its absence
4. Update PLAN.bn `@>=0.XX` only by the amount the cited evidence + tier ceiling actually supports

---

## M0.3 — multi-file burhan + mizaj rule 11 + L1 fact files (2026-05-02)

### What was completed

- **Substrate extension (mizaj):** added [`~/apps/mizaj/rules/11-tier-the-source-before-citing.md`](../../mizaj/rules/11-tier-the-source-before-citing.md) — formalizes the L1–L5 source-credibility ladder as a portable mizaj rule. The `11` slot was previously a numbering gap. Replaces ad-hoc inline ladder in CONFIDENCE.md with a citable substrate primitive.
- **Multi-file burhan architecture:** [`tools/burhan-validate.sh`](tools/burhan-validate.sh) concatenates `plan/facts/*.bn` (sorted) before `plan/PLAN.bn` so lemmas register in the lemma store before PLAN.bn citations evaluate. Burhan's native CLI takes one file; this externalizes facts without forking burhan.
- **Two L1 fact files seeded:**
  - [`plan/facts/01-substrate-citations.bn`](plan/facts/01-substrate-citations.bn) — 19 lemmas anchoring mizaj rules, khazina atoms, Khātim/Sanad post-mortem evidence, and vanilla opencode architecture (all L1, ceiling `@>=0.99`).
  - [`plan/facts/02-cheapllm-receipts.bn`](plan/facts/02-cheapllm-receipts.bn) — 13 lemmas anchoring cheapllm's measured cost / latency / context numbers and methodology receipts (all L1).
- **PLAN.bn Section I added:** 7 `cite`-anchored claims at `@>=0.99`, pulling in lemmas from the two fact files. Top theorem `cheapcode_outperforms_named_alternatives` extended to require these citation claims as assumptions.
- **CONFIDENCE.md:** replaced ad-hoc ladder ownership with a one-line pointer to the canonical mizaj 11.
- **SPEC.md:** Revision 2026-05-02 extended with four new sub-revisions (cell 8 clarification, mizaj 11 dependency, multi-file burhan posture, fact-file pattern).
- **Validation:** `tools/burhan-validate.sh` returns `True`.

### What was learned

The architecture splits cheapcode's pre-registration into two layers cleanly:

- **Architectural plans** (`plan/*.{md,bn}`) — what we're going to do, why, and under what falsifiers. Bounded by SPEC cell #8 (≤5 IDEAL) so plan-creep can't outpace decision-discipline.
- **Citation facts** (`plan/facts/*.bn`) — what we already know to be true, with audit-tagged provenance per mizaj rule 11. Grows with research; not bounded by cell #8 because each addition is a leaf, not a branch.

Adding mizaj rule 11 (rather than inlining the ladder in CONFIDENCE.md) makes the credibility discipline portable to the operator's other calibration-discipline projects (qls, iai, future cohort) — exactly the substrate-pairing rationale in `~/apps/khazina/CLAUDE.md`.

### Honest concerns

- **L1 audit tags reference paths and daftar IDs we have not yet asserted exist.** The `by audit cheapllm-daftar-note-b407ce2c9a` style tags are documentary; burhan does not verify the audit target. Future research pass should add a `tools/audit-verify.sh` that walks audit tags and confirms each target file/note actually exists. Per khazina atom 0007, citation needs an artifact; we have not yet wired that runtime check.
- **Section I claims duplicate Section A's confidence intent at higher tiers.** This is intentional (the cite chain enters the top theorem distinctly from the observation-chain), but it doubles the surface PLAN.bn carries. If duplication becomes friction, fold Section A theses to use `cite` directly — atom 0011 says wait for the friction signal before refactoring.
- **Smart-axis fact slot is empty in `02-cheapllm-receipts.bn`.** Until cheapllm's F-H3 K=1 baseline lands, `cheapllm_smart_axis_pending` stays `@>=0.50`. This bounds the discharge claim's confidence below the operator's `@>=0.95` target until cheapllm v1 ships.

### Plan changes implied

- Next research batch: add `plan/facts/03-research-papers.bn` covering L3 academic citations (TruthfulQA, ReAct, Toolformer, Constitutional AI). Each lemma carries `@>=0.85` ceiling per mizaj 11 L3.
- Subsequent: `plan/facts/04-vendor-pricing.bn` for L2 competitor pricing (OpenAI Codex, Anthropic Claude Code, Aider docs, Goose, Continue). `@>=0.80` ceiling for cost cells.
- Defer L1 own-measurement of open-source competitors (Aider, Goose, Continue) until EXPERIMENT-0 PASS — no point measuring before the propagation thesis is validated.

### Pointer for the next agent

Before any code lands:
1. Read mizaj rule 11 to internalize the credibility ladder.
2. Validate the current state with `tools/burhan-validate.sh` — must return `True`.
3. Continue research-driven confidence lifting per CONFIDENCE.md — start with L3 papers (TruthfulQA, ReAct), since these lift Section C's substrate-tools claims furthest without measurement.
4. Every confidence update PR must list source URL → tier → quote → access date in the daftar receipt.

---

## M0.2 — operator decisions locked + cheapbench design (2026-05-02)

### What was completed

- [`SPEC.md`](SPEC.md) Revision 2026-05-02 — confidence target `@>=0.95` (operator-set), smartness via cheapbench (not TB), new cell #13 for cheapbench coverage.
- [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) — design doc for project-owned smartness benchmark. 8 candidate task shapes (S1–S8) drawn from public data sources (Stack Overflow, Linux man pages, CPython, GitHub repos/PRs, Actions logs). Constraints: $0 marginal cost, gold answers derived from public-data structure (no LLM-generated synthesis), pre-registration mandatory.
- [`plan/PLAN.bn`](plan/PLAN.bn) — added Section H (cheapbench claims), 11 new observation claims (cheapbench + 3 new competitors: Continue, Cursor, Devin), updated `cheapcode_outperforms_named_alternatives` theorem to require cheapbench claims, added or-falsifier on discharge claim. Re-validated with burhan: `True`.
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — operator-confirmed decisions section (4 answers locked), source-credibility ladder L1–L5 (mizaj 04 + 13), per-claim source plan revised to prefer L1 own-measurement over vendor numbers, halt condition extended.

### Operator decisions locked

1. Terminus identity doesn't matter — TB is not the goal.
2. Competitor scope = full list (Codex, opencode, Claude Code, Aider, Goose, Terminus, Continue, Cursor, Devin).
3. Headline benchmark = portfolio (cheapbench primary + TB triangulation).
4. Confidence floor = `@>=0.95`. Internet research is a source not a substitute; "be careful not to be gullible."

### What was learned

The smartness-axis framing changed. cheapcode is not optimizing for any single bench; it's building a project-owned bench that costs $0 marginal and uses public data, with TB as triangulation. This decouples the project from external benchmark drift and makes per-feature impact measurable without budget gating. The L1–L5 source-credibility ladder is the operationalization of "don't be gullible" — every confidence update PR must surface tier + quote + access date.

The `@>=0.95` target raises the bar substantially. Most of the lift comes from L1 own-measurement, not from internet research. cheapbench design is therefore the load-bearing artifact for the smart axis; CONFIDENCE.md research is the load-bearing artifact for cost/latency competitive cells.

### Honest concerns

- **Plan-dir budget pressure.** Plan files now at 4 (EXPERIMENT-0, PLAN.bn, CONFIDENCE.md, CHEAPBENCH.md), within IDEAL `≤5` of SPEC cell 8 but above EXPECTED `≤3`. Any further plan file should fold into existing docs rather than spawn a 5th.
- **Cheapbench design floor heuristic** (≥60% MIN / ≥75% EXPECTED / ≥85% IDEAL) is currently a guess. Refine before first cheapbench run by piloting 1–2 task shapes against vanilla-opencode + cheapllm to calibrate the floor honestly (mizaj 01 — falsifier-first; setting the floor too low rewards mediocre engineering).
- **`@>=0.95` target may be unreachable for some Section E claims.** Specifically, hosted-only competitors (Codex, Claude Code, Devin, Cursor) can't be benchmarked at L1 against cheapbench. Their cells max at L2/L4 credibility. If those caps prevent `@>=0.95` on per-competitor claims, the discharge claim's confidence is bounded below — accept that honestly rather than overclaim.

### Plan changes implied

- After EXPERIMENT-0 PASS: pilot 2 cheapbench task shapes to calibrate the floor heuristic; update CHEAPBENCH.md and PLAN.bn observations.
- Before first cheapbench run: pre-register tasks per CHEAPBENCH.md template (manifest.json + git tag + daftar receipt).
- Research pass on Section E: start with L1 sources for open-source competitors (Aider, Goose, Continue), L2 for hosted (Codex, Claude Code, Cursor), bracket Devin and Terminus.

### Pointer for the next agent

Before any code lands:
1. Read [`SPEC.md`](SPEC.md) Revision 2026-05-02 for the confidence target + cheapbench split.
2. Read [`plan/CHEAPBENCH.md`](plan/CHEAPBENCH.md) for the smartness-measurement methodology.
3. Read [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) source-credibility ladder before consulting any external source.
4. Run EXPERIMENT-0 (gates the fork). After PASS, pilot cheapbench shapes to calibrate floor.
5. Begin Section E research only after the credibility ladder is internalized — no L4–L5-only confidence updates.

---

## M0.1 — burhan-shape plan + research-confidence template (2026-05-02)

### What was completed

- [`plan/PLAN.bn`](plan/PLAN.bn) — burhan-shape pre-registration of the cheapcode thesis. Encodes 22 named claims across 7 sections (A backend / B propagation / C substrate-tools / D maintenance / E competitive / F composed theorems / G discharge), each with explicit `falsified_when` clause and honest `@>=0.XX` confidence per khazina atom 0015 (transfer overstated by default).
- [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) — research-driven calibration protocol. Per-section source list, competitive-scorecard shape, halt condition for Section E, mizaj rule 05 `'illah`-citation methodology, daftar receipt template, dated revision log.
- Top-level claim `cheapcode_v1_ships` is currently UNDISCHARGED at @>=0.30, bounded above by Section E competitor-comparison claims that need research to lift.

### What was learned

The plan-language separation (burhan claims vs research evidence) makes the discipline visible: the .bn file is the contract; CONFIDENCE.md is the receipt. This mirrors cheapllm's SPEC-then-memo pattern and is the inversion of Khātim/Sanad's "37 plan files of prose" failure mode — claims-with-falsifiers force commitment, prose accommodates drift.

The honest starting confidences (Section E at @>=0.30) make the research path explicit. Reaching `cheapcode_v1_ships` at @>=0.70 requires lifting Section E claims via cited public benchmarks for Codex / opencode / Claude Code / Aider / Goose / Terminus and naming the comparison benchmark we'll publish on.

### Honest concerns

- **Operator clarifications needed in CONFIDENCE.md Section E** — which Terminus, headline benchmark choice, acceptable confidence floor, scope of competitor list.
- **EXPERIMENT-0 still load-bearing.** PLAN.bn Section B's `layer_1_propagation_holds` @>=0.65 is gated on EXPERIMENT-0 PASS. No source-of-record commits before that resolves.
- **Burhan validation passed today.** `PYTHONPATH=/home/mk/apps/burhan/src python3 -m burhan.cli plan/PLAN.bn` parses + evaluates cleanly, returning `True` for `cheapcode_v1_ships`. As observations get flipped (research lands or experiments fail), the cite chain in `cheapcode_outperforms_named_alternatives` will surface the falsification loudly rather than silently.

### Plan changes implied

- After EXPERIMENT-0 PASS, draft `plan/EXPERIMENT-2.md` for the claim-shape uplift probe on cheapllm (Section C).
- After CONFIDENCE.md Section E research lands, lift the corresponding `@>=0.XX` values in PLAN.bn and add dated revision sections.

### Pointer for the next agent

Before any code lands:
1. Validate [`plan/PLAN.bn`](plan/PLAN.bn) parses with burhan; fix any syntax issues.
2. Confirm operator clarifications listed in [`plan/CONFIDENCE.md`](plan/CONFIDENCE.md) Section E.
3. Begin research per CONFIDENCE.md protocol — start with Section C (substrate-tools transferability) since that's the qls→cheapcode bridge.
4. Run EXPERIMENT-0 in parallel with research; both gate the fork.

---

## M0 — scaffolded docs (2026-05-02)

### What was completed

- Created repo at `~/apps/cheapcode/` with three root docs and one plan file:
  - [`README.md`](README.md) — project purpose and reading order
  - [`SPEC.md`](SPEC.md) — pre-registered constraints (cells 1–12), propagation hierarchy, falsifiers F1–F3, scope boundaries
  - [`LATESTMILESTONE.md`](LATESTMILESTONE.md) — this file
  - [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md) — the discriminating experiment that decides wrapper-vs-thin-fork-vs-patch-series
- No source code, no upstream fork, no `package.json`. Intentional.
- Working name `cheapcode` flagged as provisional in [`README.md`](README.md).
- Daftar receipt for the M0 scaffold to be added in the same commit.

### What was learned

The Khātim/Sanad post-mortem earlier in this session made the failure mode legible:

- Khātim: 1,152 ts/tsx files across 7 forked packages, 12 plan files including 4 duplicate-numbered `04-*.md`, web UI mirrored from Bāb with 7 upstream-overlay diffs in `packages/app/`, cross-repo callback-RPC tool host across two repos.
- Sanad: 25 plan files, multi-tenant control plane, three credential-shape paths, bootstrap-shape drift requiring a dedicated `bootstrapInstanceShape` factoring.
- Both: plans accreted faster than discriminating experiments.

The root cause was **layer-3 propagation** (per-client overlays) instead of **layer-1** (server-side single source of truth). cheapcode's discipline is the exact inversion: every feature declares its propagation layer, layer 3 is blocked by default, and the smoke regression must cover every upstream client surface on every merge.

### Honest concerns

- **Working name.** `cheapcode` is provisional; final name should be picked before the first source commit. A bad final name is hard to undo once `package.json` and the binary are published.
- **Upstream version pin.** SPEC says "weekly rebase against upstream" but no upstream tag is pinned yet. EXPERIMENT-0 must record the upstream commit / tag it ran against, since propagation surfaces shift across upstream versions.
- **F1 generality.** The discriminating experiment uses one feature (a system-prompt addon). If F1 passes for that feature but a later feature class (e.g. tool replacement, in-session memory, output-format constraints) fails layer 1, the architecture's "load-bearing" property only held for the easy case. EXPERIMENT-0's verdict must therefore propose at least one harder feature class to re-test before the architecture is considered fully validated.

### Plan changes implied

None yet — plan dir contains only EXPERIMENT-0 and that is the next step. After EXPERIMENT-0 resolves, [`plan/`](plan/) gains at most one of:
- `plan/01-fork-mechanics.md` (if EXPERIMENT-0 PASS): which upstream packages to fork, rebase posture, version pin
- `plan/01-halt-rationale.md` (if EXPERIMENT-0 FAIL): why the architecture is dead and what the operator should consider instead

### Pointer for the next agent

Run [`plan/EXPERIMENT-0.md`](plan/EXPERIMENT-0.md). Do **not** fork opencode, do **not** write `package.json`, do **not** pick a final name until EXPERIMENT-0's kill-criteria resolve.

If the operator asks for design exploration before EXPERIMENT-0 runs, restrict it to **doc edits only**. No source code lands until F1 passes (or partial-passes with a documented layer-2 escalation).
