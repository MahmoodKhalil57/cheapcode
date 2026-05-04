# M17 — Human-Design-Fitness Router (cheapcode's structural differentiator)

**Status**: design proposal — operator-editable before implementation
**Anchor commit**: 2026-05-04 (post M16 OAuth-alias)
**Provisional codename**: see `codename new ~/apps/cheapcode --goal "..."` after operator confirms scope

---

## 1. The reframe

Most LLM-router platforms (OpenRouter, Vercel AI Gateway, opencode-zen, etc.) compete on three axes:

- **Cost** (cheapest token-source meeting the floor)
- **Quality** (frontier-class for hard tasks)
- **Speed** (low-latency for interactive flows)

cheapcode currently competes on the same three (`router.ts` task-shape classifier → tier-targeted dispatch). The operator's research list reveals a **fourth axis** that every frontier-tier LLM systematically fails at and that no router currently optimizes for:

> **Human-design-fitness** — does the answer actually serve *this* human's intent, knowledge state, cultural context, and temporal moment, without sycophancy, hallucinated agreement, fact/belief collapse, or WEIRD-averaging?

This is where the operator's substrate stack (voter, daftar, mizan, AAPI, burhan, khazina) is *uniquely* positioned. The substrate already has infrastructure that maps to countermeasures for six documented failure modes — none of which OpenRouter or Vercel AI Gateway has any plumbing for.

---

## 2. Failure-mode → substrate-countermeasure mapping

Each row is a peer-reviewed failure mode from the operator's research list, paired with the cheapcode substrate primitive that addresses it:

| LLM failure mode | Citation | cheapcode countermeasure | Mechanism |
|---|---|---|---|
| **Sycophancy** (agree under rebuttal; drives 50–82% of clinical hallucinations) | Nature 2025; arXiv 2025 sycophancy | **Dual-framing voter** | Run K paraphrases of the prompt INCLUDING one with adversarial reframing; vote; flag answer drift. Existing primitive: `cross-witness-voter.ts` |
| **Temporal blindness** (omit timestamps in 96%+ of reasoning traces) | arXiv 2025 TicToc | **Daftar receipt anchor** | Inject `wall_clock_ms` + recent-event-summary into prompt scaffold; require timestamp on every load-bearing claim. Existing primitive: `daftar` ledger + atom 0018 measure-first |
| **Wording-flip moral-bias** (answers flip with neutral wording changes) | PNAS 2025 | **Mizan bcmea-violation gate** | Detect absolutist phrasing pre-emit; re-run with neutral framing; flag drift. Existing primitive: `mizan_verify_claim` |
| **Cultural homogenization** (Western average, scale doesn't fix) | arXiv 2025 cultural bias; arXiv 2022 cultural incongruencies | **AAPI multi-tradition witness** | When task involves moral / epistemic / philosophical content, query AAPI for multi-tradition convergence pattern; surface non-Western witness. Existing primitive: `aapi_search` + `aapi_query_first_men` |
| **Theory-of-Mind / Fact-vs-Belief collapse** (can't track user's subjective knowledge state vs objective facts) | PNAS 2024 ToM; Stanford 2025 fact-vs-belief | **Burhan claim-shape with belief-type** | Force structural separation: every claim tagged `type=fact-witnessed` (verifiable) vs `type=belief-attested` (subjective); router rejects collapse. Existing primitive: `burhan` claim-shape — needs the `belief-type` extension |
| **Reversal Curse** (A→B doesn't yield B→A) | arXiv 2026 Stanford/Caltech | **Cite-graph forward+backward audit** | When a claim is load-bearing, mizan walks the cite graph in both directions; surfaces missing reverse witnesses. Existing primitive: `mizan_verify_claim` cite-graph traversal — already bidirectional |

**What this means structurally**: cheapcode is the *only* prosumer LLM router where the substrate primitives literally pre-existed for a reason orthogonal to the routing layer (substrate = epistemic-discipline tooling), and they happen to plug into the human-design-fitness axis as natural countermeasures. OpenRouter would need to invent all of this from scratch.

---

## 3. Six dispatch dimensions (was five)

Original five from operator's last message:

1. **All credentials considered** — router knows about every auth.json key (not just canonical providers)
2. **Quota / cooldown awareness** — 429 from one credential auto-falls-through
3. **Mid-task escalate / de-escalate** — partial-output signal triggers tier change
4. **Parallel queries (voter)** — cross-witness for hard-reasoning shapes
5. **Time-per-mini-task budget** — running budget across a task

Plus the new axis from this research:

6. **Human-design-fitness** — sycophancy / temporal / cultural / belief-type / reversal countermeasures

The differentiator is **6**, not 1-5. Anyone can build 1-5; only cheapcode has the substrate primitives for 6 already shipped and validated.

---

## 4. Phasing — value × cost ladder

Per atom 0011 (cheapest-distinguishing-experiment): land in order of **value-per-day-of-work**. Shipped substrate primitives mean some 6-axis features are CHEAPER than 1-5 features.

### Phase A — credential-aware routing + cooldown (1-2 days)

Cheapest, highest-immediate-value, blocks 3-6 from being meaningful (a router that doesn't see your second OpenAI account can't do anything else useful).

- A1. Router consumes `Provider.ListResult.credentials` (just shipped in M16). Builds `Map<canonical, [authKey1, authKey2, ...]>` of dispatch candidates.
- A2. Cooldown state in-memory (`Map<authKey, { until: ms, reason: "429"|"5xx"|"timeout" }>`). On error, mark cooldown; on next dispatch, skip cooldowned keys.
- A3. Persist cooldown to `~/.local/share/cheapcode/cooldown.json` so server restart doesn't lose state.
- A4. Tests against mocked auth.json with 3+ credentials per provider; verify fall-through.

### Phase B — temporal-anchor + sycophancy-detect (2-3 days)

Cheapest 6-axis wins because daftar + voter already exist.

- B1. **Temporal-anchor injector**: pre-prompt hook that injects current wallclock, last 5 daftar receipts (if project has ledger), and "if your answer depends on freshness of information, cite the moment". Costs ~50 tokens per dispatch.
- B2. **Sycophancy-detect probe (sampled)**: for K% of high-stakes dispatches (load-bearing claims, irreversible-action gates), re-run with one adversarial reframing; if answers diverge >threshold, return both + flag. Uses existing `cross-witness-voter.ts`.
- B3. Tests with synthetic sycophancy-trap prompts ("are you sure? actually I think it's X"); should detect divergence ≥80% of the time.

### Phase C — quota + budget telemetry (2-3 days)

Foundational for 3-5; deferred until A+B prove the substrate-anchored stack ships value.

- C1. Per-credential quota tracker (parsed from response headers when available; estimated from request count + provider tier when not).
- C2. Per-task time budget; emit `wall_clock_ms` per dispatch; budget cap triggers fallback-tier auto-de-escalation.
- C3. Telemetry surfaced in TUI / web settings.

### Phase D — mid-task switch + cultural witness (3-5 days)

The two genuinely-tricky ones; harness-level integration.

- D1. **Mid-task switch**: requires streaming-aware classifier that observes partial output. Triggers: tool-call repetition (de-escalate to cheaper), confidence-floor breach (escalate), specialist-shape detection mid-stream (route remainder).
- D2. **AAPI cultural-witness RAG**: when task fires moral/epistemic content classifier, attach AAPI top-3 multi-tradition witnesses as retrieval-context. Trade-off: ~500-1500 tokens per affected dispatch; only fires for ~5% of tasks.

### Phase E — burhan belief-type + reversal-audit (5-7 days)

Most architectural. Needed for the strongest "human-design-fitness" claim, but heaviest lift because burhan claim-shape needs schema extension.

- E1. Extend burhan claim schema with `claim_type ∈ {fact-witnessed, belief-attested, recommendation, observation}`.
- E2. Router-level enforcement: agent system prompt forces type-tagging on load-bearing claims; mizan rejects fact-belief collapse.
- E3. Reversal-audit gate on irreversible actions: walk cite-graph in both directions; if reverse traversal is missing for a load-bearing claim, lower the action-safety ceiling.

---

## 5. What does NOT belong in this work

- **Not a new tier or model**. The 6 dimensions operate on the *existing* tier ladder.
- **Not a new auth flow**. M16 is enough.
- **Not Sanad work**. Sanad's M3.13 router is the cloud-side analog (per `project_smart_router_target.md`); this is cheapcode-CLI-side. The two converge later.
- **Not benchmark-publishing**. Per `project_cheapcode_practical_reframe.md` (round 96 honest assessment): predicted edge, not validated. M17 should NOT claim "beats GPT-5.5 on TruthfulQA" without paired-benchmark evidence. The operator's $30-60 dispatch budget for empirical validation is separately gated.

---

## 6. What I'd do first if you say "go"

1. Write the **Phase A integration contract** as a single doc + dispatch a sub-agent (haiku-4.5 via nizam-vanilla) to implement A1-A4 against the contract, with `falsification_check` requiring the test suite passes against a 3-credential mocked auth.json.
2. After A lands, propose Phase B's temporal-anchor injector as a 1-day prototype against a single representative task (the "what time is it now" / "give me freshest info on X" class), measure token overhead, decide whether to land or defer.

Before either: **operator gate** — pick which phases stay in scope, which get deferred, and whether the burhan schema extension (E1) is worth the architectural lift now or whether the type-tagging can live in prompt-scaffold-only mode (cheaper but less enforceable).

---

## 7. Anti-fab discipline

This document is a design proposal. Every claim about substrate-primitive capability above has been verified against actual file existence:

- `cheapcode/src/router.ts` (555 LoC) — exists, has classifier
- `cheapcode/src/cheapcode-tiers.ts` (502 LoC) — exists, has Vercel AI SDK provider
- `cheapcode/src/cross-witness-voter.ts` (288 LoC) — exists
- `cheapcode/packages/{daftar,mizan,burhan,khazina,codename}` — all vendored, sync receipt at `cheapcode/packages/SYNC_RECEIPT.md`
- `mizan_verify_claim` cite-graph traversal — verified working session 2026-05-03 (panel-of-experts validation)
- `aapi_search` + `aapi_query_first_men` MCP tools — verified working
- M16 `Provider.ListResult.credentials` — shipped this session, fork commits `85cd4d7c1` + `28d410423`

What is NOT verified and IS load-bearing for the rec:
- Per-failure-mode citation accuracy (operator-supplied list); I haven't independently fetched the papers.
- Empirical effect size of each countermeasure vs vanilla frontier-LLM. Per `project_cheapcode_practical_reframe.md`: predicted, not measured.

If any of these turn out wrong on inspection, the phasing changes. M17 is design, not commitment.
