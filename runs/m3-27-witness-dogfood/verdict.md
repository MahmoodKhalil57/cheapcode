# M3.27 Witness Dogfood — Verdict

**Date:** 2026-05-03
**Setup:** 3 questions; my baseline answer written FIRST per atom 0007 (anti-fabrication via artifact verification), THEN cheapcode-witness dispatched, THEN paired comparison.
**Spend:** $0.0280 across 3 artifacts. Total cumulative cheapcode spend now ~$0.48 / $5 budget.

---

## Headline

**Cheapcode-witness currently MATCHES me on simple knowledge questions but does NOT BEAT me.** On the third question (apophatic traditions), it surfaced one citation I missed (Śaṅkara's *Vivekacūḍāmaṇi* for Advaita Vedanta), but lost on coverage breadth (omitted Christian-Latin and Islamic traditions I included).

The operator's question — "is cheapcode confidently better than Claude Opus 4.7 such that we can self-host?" — answers honestly as: **not yet, but the gap is closing and the v1.x path is concrete.**

---

## Per-question verdict

### Q1 — Disphenoid volume formula

| Axis | Me (baseline) | Cheapcode-witness |
|---|---|---|
| Formula | V = (1/(6√2))·√((p²+q²−r²)(p²−q²+r²)(−p²+q²+r²)) | V = (1/(6√2))·√((p²+q²−r²)(p²+r²−q²)(q²+r²−p²)) ✓ same, factor order rearranged |
| Sanity check (p=q=r=a) | Yes — confirms a³/(6√2) | No — formula given without verification |
| Counter-example to GPT-5's wrong formula | Yes | No |
| Cost | $0 (in my training) | $0.012 |
| Latency | ~30s of my output | 145s |
| Grade | sahih (verified by sanity check) | daif (string-match artifact, see below) |

**Verdict:** Tie on formula correctness. I win on rigor (sanity check + counter-example). Cheapcode loses on latency and adds cost.

### Q2 — Primes of the form n² + 1

| Axis | Me (baseline) | Cheapcode-witness |
|---|---|---|
| Status | Open (Landau's four problems, 1912) | Open (Landau's four problems, 1912) ✓ |
| Strongest partial result | Iwaniec 1978 (≤2 prime factors) + Friedlander–Iwaniec 1998 + Hardy–Littlewood density | Iwaniec 1978 (≤2 prime factors) — concise |
| Cost | $0 | $0.006 |
| Latency | ~30s | 62s |
| Hallucination risk | None | None — voter handled "I don't know" cleanly |

**Verdict:** Tie on correctness. I cover slightly more (Friedlander–Iwaniec 1998, asymptotic density). Cheapcode handles the negation/uncertainty correctly without overclaiming — that's the win.

### Q3 — Apophatic traditions

This is the most interesting question because it's load-bearing for atom 0017's convergent-evolution credential.

| Axis | Me (baseline) | Cheapcode-witness (cheap-b) | Cheapcode-witness (smart-c) |
|---|---|---|---|
| Greek/Neoplatonist | Plotinus *Enneads* + Pseudo-Dionysius | Plotinus *Enneads* | Plotinus *Enneads* |
| Sanskrit/Indic | Upanishads + Nāgārjuna | Madhyamaka (Nāgārjuna) + **Advaita Vedanta (Śaṅkara, *Vivekacūḍāmaṇi*)** | Brihadaranyaka Upanishad + Nāgārjuna |
| Chinese Daoist | *Dàodéjīng* | Laozi *Dao De Jing* | *Tao Te Ching* |
| Christian Latin | Eckhart + Cusanus *De Docta Ignorantia* | (omitted) | (omitted) |
| Islamic | Ibn ʿArabi *Fuṣūṣ al-Ḥikam* | (omitted) | (omitted) |
| Total traditions | 5 | 4 (with Vivekacūḍāmaṇi citation I missed) | 4 (canonical 4) |

**Verdict:** I win on coverage (5 traditions vs 4). Cheapcode-witness (cheap-b specifically) **caught a citation I missed**: Śaṅkara's *Vivekacūḍāmaṇi* (~8th c.) is a strong Advaita Vedanta source with explicit apophatic moves about Brahman beyond predication. This is genuinely useful for atom 0017's credential — I should incorporate it.

**Direction-of-improvement:** the cross-witness mechanism added a citation; it didn't replace mine. This is the *cross-witness-as-augment* pattern, not cross-witness-as-replacement.

---

## Structural finding (M17-cycle byproduct)

All 3 artifacts came back graded `daif` even though witnesses substantially **agreed** in content. This is because `extractAnswer` is a regex designed for `"Answer: <integer>"` style outputs (M3.18 design intent: AIME problems). For knowledge-synthesis prompts that produce structured-prose outputs, the regex either matches a long LaTeX fragment, the first prose paragraph, or fails entirely — and string-equality across two such matches is essentially guaranteed to fail even when the underlying answers are equivalent.

**This is a real bug for the artifact-generator use case** that wasn't visible in M3.18-M3.20 because those targeted single-integer answers. Lifting to falsifier-bearing claim:

> **Claim:** `voter_extractAnswer_regex_misclassifies_knowledge_synthesis_as_daif`
> **Falsifier:** N≥3 knowledge-synthesis prompts produce sahih or hasan grade despite witnesses agreeing on substance.
> **Status:** observed in 3 of 3 dogfood artifacts (Q1, Q2, Q3). Structural finding.

---

## What this implies for "cheapcode self-host"

**Current state:** cheapcode-witness is useful as a **cross-witness AUGMENT** to my work, not as a replacement.

- Where it adds value: catching specific citations I miss (Q3 *Vivekacūḍāmaṇi*); flagging where my answer might have unstated alternatives.
- Where it doesn't beat me: coverage breadth, sanity-checking discipline, multi-step rigor (Q1 sanity check + counter-example).
- Where the daif-grade-bug currently masks: most knowledge-synthesis tasks come back daif even when good — so the grade is uninformative for this use case.

**Concrete v1.x path to actually beat single-pass Claude Opus 4.7:**

1. **Add a frontier witness to the voter pool** — currently cheap=deepseek-v4-flash, smart=gpt-5-mini. Neither is Claude Opus 4.7. Adding a `frontier=anthropic/claude-opus-4.7` witness would let the voter draw on training data I have but cheap doesn't (and vice versa).

2. **Replace `extractAnswer` regex with semantic-convergence detection for knowledge-synthesis shape.** When the output is structured prose, use embedding similarity or a third-party "are these answers equivalent?" check, not string equality.

3. **Add a synthesizer step** that takes 3 witnesses' outputs and produces a UNIFIED artifact merging the best of each. Q3 demonstrates the value: cheap-b's Vivekacūḍāmaṇi + my Cusanus + smart-c's Brihadaranyaka Upanishad would compose to a stronger artifact than any single witness.

With those three changes, cheapcode-witness would likely produce knowledge artifacts that beat single-pass Claude — because cross-witness composition catches per-witness gaps and the synthesizer enforces coverage discipline.

**Estimated v1.x effort:** ~2 hours work, ~$1-2 in probe spend. Atom 0011 budget honored.

---

## Lifted claims (M3.27 → PLAN.bn SECTION CC)

1. `cheapcode_witness_matches_but_does_not_beat_single_pass_claude_on_knowledge_synthesis @ 0.65`
   - Falsifier: paired N≥5 dogfood shows cheapcode-witness strictly better than baseline on ≥3 of 5 axes (correctness, coverage, rigor, cost, latency). Baseline-better-or-tied on ≥3 falsifies the "matches" claim and we'd need to revise downward.

2. `voter_extractAnswer_regex_misclassifies_knowledge_synthesis_as_daif @ 0.85`
   - Falsifier: N≥3 knowledge-synthesis prompts produce sahih/hasan despite witnesses substantially agreeing. (Easy to falsify — would just need to find one such case. Currently 0/3 in M3.27.)

3. `cheapcode_witness_surfaces_citations_single_pass_misses_at_low_rate @ 0.45`
   - Single firing case (Q3 Vivekacūḍāmaṇi). Modest confidence per atom 0015 (transfer-overstated). Falsifier: paired N≥10 dogfood shows zero new citations surfaced beyond baseline.

4. `cheapcode_witness_v1x_path_to_beat_single_pass_requires_three_changes @ 0.55`
   - The three changes: frontier witness, semantic-convergence detection, synthesizer step. Falsifier: implementing all three on a paired N≥5 dogfood does NOT produce strictly better artifacts than single-pass Claude.

---

## Atom 0011 budget

Total M3.27 spend: $0.0280 (under $0.20 cap). Total wall: ~5 min from launch to all 3 artifacts back. Smallest-distinguishing-experiment discipline preserved.

## Atom 0017 cycle iteration

This dogfood IS another instance of the M17 cycle on residue: the residue here was the *gap between voter design intent (integer-answer extraction) and use case (knowledge synthesis)*. Inventorying produced the daif-grade-bug structural finding. Lifted to falsifier-bearing claim. Recursion continues.
