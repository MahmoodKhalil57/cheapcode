# LATESTMILESTONE — cheapcode

**Read this BEFORE [`plan/`](plan/).** The plan is the working draft; this file is the authoritative record of what's been completed and what should change next.

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
