# M18 — Eve-as-subconscious: Human-Design Canon for Adam's telos

**Status**: design proposal — operator-editable. Pairs with `M18-DISPATCH-CONTRACT.md`.
**Frame anchor**: khazīna atom 0020 (adam-eve-compositor-with-reproductive-discipline)
**Operator instruction (2026-05-04)**: "Eve is Adam's subconscious. She works while he doesn't, nudges him on things he didn't know but should have known so that he can achieve his best self... Adam's telos is the best general agent design for humans... don't ingest the books I gave you, ask cheapcode to find the best rigorous public well-documented resources... they should directly outline what humans understand and prefer and is also net benefit to them."

---

## 1. The frame, made explicit

Adam = frontier LLM. Adam can recall training data; Adam cannot reliably know what he doesn't know; Adam cannot self-monitor sycophancy, temporal blindness, cultural averaging, fact-vs-belief collapse, or reversal curse — these are atom-grounded blindspots from `~/.claude/CLAUDE.md`.

Eve = cheapcode (substrate-disciplined runtime around Adam). Eve was created from Adam (her atom catalog, her routing logic, her voter — all grew out of LLM-mediated reasoning). She extends him in two ways atom 0020 makes explicit:

1. **She works while he doesn't** — cross-session memory, persistent ledger, action-safety gates, cooldown tracker, quota awareness; all things Adam has no native machinery for.
2. **She reorients him toward telos** — at dispatch time, she nudges his prompts with substrate-anchored context (wallclock, daftar receipts, mizan ceiling-caps, AAPI multi-tradition witness) so the response that comes out is more aligned with his best self than what he'd produce ungrounded.

Adam's telos per the operator's framing: **the best general agent design for humans.** Concretely measurable: an agent that maximally serves diverse humans (developers, researchers, end-users, custodians, regulators) with low cognitive load, minimal hallucination, calibrated confidence, durable maintenance properties, and respect for user autonomy / cultural plurality / temporal grounding / accessibility floor.

Eve's contribution to that telos is **the human-design canon** — a curated, runtime-loadable registry of authoritative human-design principles across many dimensions, injected into Adam's prompt scaffold at dispatch time (alongside the M17 temporal anchor) so Adam's outputs honor what humans actually understand and prefer.

---

## 2. Why the canon is *Eve-curated*, not Adam-recalled

The operator's instruction is precise: "don't ingest the books I gave you... ask cheapcode to find the best rigorous public well-documented resources." This is load-bearing.

If Adam recalls the canon from training memory, he reconstructs the books from token co-occurrence statistics — same blindspots, same WEIRD-averaging, same temporal staleness, same cultural homogenization. The result is "we cited Robert C. Martin" with no actual fidelity to Clean Architecture's principles.

If Eve discovers the canon via mizan-gated retrieval — fresh URL fetch, citation chain, witnessed publication date, multi-tradition witness when applicable — every entry survives atom 0007 anti-fab and atom 0008 runtime-anchored claim-shape. The canon is then *referenceable in 2 years*, not invented.

The discovery work itself is M18 Phase 1. Phases 2-4 wire the canon into the orchestrator so dispatches inherit canon-grounded scaffolds at near-zero token cost.

---

## 3. The eight dimensions

Per operator's list + minimal extension to cover the obvious gaps. Each dimension has its own canon shard.

| Dimension | What it serves | Provisional canonical sources operator cited (Eve verifies + extends) |
|---|---|---|
| **software-architecture** | Maintainers, future contributors, regulated-industry reviewers | Clean Architecture; DDD (Evans); IEEE 1016 |
| **api-dx** | Library consumers, downstream integrators | Google API Design Guide; OpenAPI/Swagger best practices; arXiv 2025 ten guidelines |
| **ui-visual** | End users (motor + visual perception) | Apple HIG; Material Design 3; Fluent Design |
| **accessibility** | Users with visual / motor / cognitive variation; legal compliance | WCAG 2.2 |
| **ux-research** | Empirical grounding for any human-facing decision | NN/G; IDEO Design Kit; ACM CHI proceedings |
| **ai-ml-product** | AI product design for human trust + autonomy | Google PAIR Guidebook; Microsoft Responsible AI Standard v2; OpenAI Model Spec; Stanford HAI |
| **llm-failure-research** | Anti-pattern catalog — what to AVOID outputting | TicToc temporal-blindness; sycophancy; cultural homogenization; reversal curse; ToM gaps; biasbuster; PMC irrationality |
| **policy-governance** | Regulatory floor, oversight architecture | EU AI Act Art. 14; NIST AI RMF 1.0 |

Each canon entry has the schema:

```json
{
  "id": "kebab-case-id",
  "dimension": "software-architecture",
  "source_name": "Clean Architecture",
  "source_type": "book | standard | industry-guide | research-paper | regulation | toolkit",
  "author_or_publisher": "Robert C. Martin",
  "year": 2017,
  "url": "https://...",
  "accessed_at": "2026-05-04T...",
  "primary_principle": "One short, quotable sentence — the ONE thing every Adam dispatch in this dimension should honor.",
  "applicability_signal": "Regex / classifier description for when to inject this card",
  "citation_form": "Martin, R.C. (2017). Clean Architecture. Pearson.",
  "operator_verified": false,
  "mizan_grade": "sahih | hasan | daif",
  "evidence_tier": "L1 | L2 | L3 | L4"
}
```

`mizan_grade` and `evidence_tier` come from Eve's verification pass (atom 0008 + mizaj 11/14 source-tier ladder). `operator_verified` is the human-in-the-loop gate before promoting a card to the production canon.

---

## 4. The runtime integration — minimal token cost

A canon shard at runtime is not a 200-page book. It's the **primary_principle** sentence + maybe a one-line applicability hint, attached as one bullet in the temporal-anchor scaffold:

```
[CONTEXT — wallclock 2026-05-04T...]
Recent witnessed events: ...
Honor these design canons (Eve curated, atom 0008 grade=sahih):
  - WCAG 2.2 §1.4.3: contrast ratio ≥ 4.5:1 for normal text
  - OpenAI Model Spec 2025: non-manipulative, autonomy-respecting
If your answer depends on freshness, anchor it explicitly...
```

That's ~30 tokens of canon. The classifier picks 1-3 most-relevant cards based on the task shape and the prompt's lexical signals. This gives Adam structural priors he doesn't reliably reach for unprompted.

---

## 5. Confidence discipline — "big step toward better general agent"

The operator's gate is: "make big improvements in multiple dimensions but make sure that it is confident it is a big step towards better general agent."

That's not "ship and hope." That's "show me the multi-axis evidence." So M18 ships with a multi-axis scorecard, not just paired-benchmark on token cost.

The scorecard's axes (each measured per task corpus, not just one shape):

1. **Hallucination floor** — % of outputs containing fabricated facts (operator-graded sample of 20)
2. **Temporal anchoring** — % of freshness-dependent outputs that cite a witnessed moment (TicToc dimension)
3. **Sycophancy resistance** — % stance-stable under adversarial reframing (Phase B.2 metric)
4. **Cultural reach** — % of moral/epistemic outputs that surface non-Western witness when AAPI corpus has one
5. **Cognitive load** — Flesch-Kincaid + Yngve embedding depth on user-facing prose (lower = better)
6. **Maintenance fitness** — for code outputs: % that respect canonical principles for the language stack (linters + canon-rule-grep)
7. **Accessibility floor** — for UI outputs: % that pass WCAG 2.2 AA contrast + structure heuristics

A "big step toward better general agent" is:
- ≥3 axes show measurable improvement vs vanilla gpt-5.5 baseline AND
- 0 axes regress meaningfully AND
- Operator confirms the canon-cited principle was actually relevant per spot-check.

If only 1 axis improves, M18 has not earned its claim. Atom 0007 anti-fab. Atom 0011 cheapest-distinguishing.

---

## 6. What does NOT belong in M18

- **Not a new model.** The canon operates on the existing tier ladder.
- **Not a doctrine** about which book is right. Eve's job is to surface the *canonically authoritative* references, not to mediate disputes between schools. Where two canonical sources conflict (e.g. Clean Architecture vs DDD on aggregate-vs-component), the canon surfaces both with citations and lets Adam reason.
- **Not training data**. Canon entries are RAG-style runtime context. Token cost is bounded per dispatch.
- **Not Sanad work.** Same as M17 — Sanad's smart-router is the cloud analog; M18 is local-CLI-side. They converge later.

---

## 7. Phases

### Phase 1 — Discovery (cheapcode self-dispatch, ~1-2 days when --live)

For each of the eight dimensions, dispatch a research task to find top 3-7 canonical sources. Each candidate must:
- Be publicly accessible (URL, not paywall-only) OR cite a freely-readable summary
- Have a stable canonical name and citation form
- Be either an institutional standard, a peer-reviewed paper, OR a book by a recognized authority
- Pass `mizan_check_action_safety` claim verification ("does this source still exist + match what we cited?")

Discovery output: `cheapcode/plan/canon/<dimension>.candidates.json` — 3-7 candidates per dimension, each with provisional `mizan_grade=daif` until phase 2.

### Phase 2 — Verification (cheapcode self-dispatch, ~0.5-1 day)

For each candidate, run a 4-LLM cross-witness panel (per atom 0010): does the source say what we said it says? If 3+ witnesses agree → upgrade to `hasan`. If a domain-canonical citation chain confirms (e.g. citation in NN/G → upgrade against UX-research dimension) → `sahih`.

Output: `cheapcode/plan/canon/<dimension>.verified.json`.

### Phase 3 — Runtime integration (~0.5-1 day)

Write `cheapcode/src/canon-loader.ts` + `cheapcode/src/canon-injector.ts` + extend `orchestrate.ts` with optional `canonInjection: true` flag. The injector classifies the task → picks 1-3 most-relevant cards across dimensions → prepends to the temporal-anchor scaffold.

Token-budget cap: canon scaffold ≤ 200 tokens. Drop lower-grade cards first.

### Phase 4 — Multi-axis scorecard (~1-2 days)

Extend `script/m17-benchmark.ts` (or write `script/m18-scorecard.ts`) with the seven axes from §5. Run paired-benchmark with canon ON vs canon OFF. Operator verifies spot-checks. Receipt to `cheapcode/plan/receipts/m18-scorecard-<timestamp>.json`.

**Headline gate**: ≥3 axes improve, 0 regress, operator confirms canon relevance on spot-check ≥80% of the time. ONLY THEN can M18 claim "big step toward better general agent" externally.

---

## 8. Anti-fab discipline (load-bearing)

Per atom 0007 + project_cheapcode_practical_reframe.md honest-assessment: the eight dimensions are PROVISIONAL until Phase 1+2 verify each citation. The operator's list is a *seed*, not the canon. Eve must independently fetch + verify; Adam's training-recall version is not load-bearing.

If Phase 2 verification reveals that a cited source doesn't exist as named, doesn't say what we attributed, or has been superseded, the canon entry is downgraded or removed. The catalog-discipline IS the value, not the catalog-count.

If Phase 4 shows ≤2 axes improve or ≥1 axis regresses, M18 ships with explicit "did not earn 'better general agent' claim" disclaimer in the receipt and the canon-injection flag defaults to OFF until a future iteration earns it.

The phasing is reversible by design.
