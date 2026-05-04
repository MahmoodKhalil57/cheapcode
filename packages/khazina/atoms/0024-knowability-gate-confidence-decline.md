---
id: 0024
slug: knowability-gate-confidence-decline-with-clarifying-questions
title: At every dispatch boundary, evaluate not just "is this dispatch worth the credit?" (atom 0022) but ALSO "can I produce a confident answer at all?" — knowability-gate. When the question is underspecified, requires private knowledge we lack, lives in a contested-attestation domain that doesn't admit a single confident answer, lacks a missing referent, has context-exhaustion, or is otherwise structurally unanswerable-with-confidence, the substrate REFUSES with a structured request for clarification or reorientation rather than producing a low-confidence answer the user must filter. Distinguishes-itself from atom 0022 by orthogonal axis: atom 0022 = value, atom 0024 = answerability; high-value-but-unanswerable questions get clarifying-question response, not low-value's recall-proposal response.
created_at: 2026-05-04
created_by: claude-opus-4-7-1m
created_in_session: 2026-05-04 cheapcode round-96 — operator-named gap "to be able to offload more on cheapcode, we need to be confident that can cheaply instantly and intuitively (using mizan) refuse and ask for more information or reorientation as soon as it realizes it cannot deduce a confident answer even through research"
novel_move:
  class: meta-method
  anchor: file:///home/mk/apps/cheapcode/src/mizan-shim.ts
  one_line: Atom 0017 (silent-evidence-as-positive-data) names the failure mode — agents systematically fail to recognize their own ignorance and produce confident-sounding-but-actually-unreliable answers. Atom 0024 prescribes the runtime correction: pre-dispatch knowability-gate evaluating structural answerability via 6 failure-mode detectors (underspecification, private-knowledge-required, contested-attestation, missing-referent, context-exhaustion, personal-recall). When the gate fires, substrate emits structured clarifying-questions or reorientation proposal INSTEAD of dispatching. Cheap-by-construction: pure heuristic + optional mizan composition; near-zero cost. Intuitive: leverages mizan's bcmea-violation detection + ceiling-cap intuitions. Unblocks "offload more to the agent" because the agent is now trustworthy on questions it CAN answer (it declines the rest with a path forward).
  falsification: If applying this discipline on N≥10 dispatches across diverse question shapes produces (a) no decline events on questions where the agent's answer would have been low-confidence (false negative — gate missed it), AND (b) no improvement in answer reliability when measured against a held-out reference set, the discipline adds no signal. Specifically falsifiable: 0% decline rate on a question set where 30%+ are objectively underspecified or unanswerable; OR no change in user-rated confidence-calibration when comparing pre-atom-0024 vs post-atom-0024 sessions on otherwise identical workloads. Edge case: false-positive declines on questions the agent could have confidently answered → also a falsifier; gate must distinguish "I can't" from "this is hard but reachable via research."
applicable_problem_shapes:
  - class: pre-dispatch-confidence-evaluation
    example: "User asks cheapcode: 'why does my deploy fail?' Without context. Atom 0024 evaluates: missing-referent (which deploy? what error?), private-knowledge (the agent doesn't see your CI logs), underspecification (multi-readings: build fail vs runtime fail vs DNS fail). Substrate refuses-and-clarifies: 'Three things would unblock this — (1) paste the error / log line, (2) is this build-time or runtime, (3) which deployment target.' Without atom 0024, the agent confabulates a plausible-sounding answer that's likely wrong."
  - class: contested-attestation-recognition
    example: "User asks: 'who really wrote Shakespeare?' Atom 0024 evaluates: contested-attestation (genuine scholarly uncertainty, multiple bcmea-coexisting hypotheses), no-research-resolution (centuries of investigation haven't converged). Substrate refuses-collapse: 'This is a contested-attestation domain — I can present 4 leading hypotheses with explicit ceiling-caps but cannot deduce a single confident answer. Want the multi-hypothesis enumeration?' Without atom 0024, the agent picks one camp and presents it as fact."
  - class: personal-recall-decline
    example: "User asks: 'do I prefer X or Y?' Atom 0024 evaluates: personal-recall (only the user knows their preference), no-substrate-resolution. Substrate refuses-and-asks: 'I don't have access to your preferences. Which do you find easier to use, X or Y?' Without atom 0024, the agent invents a preference based on weak signals."
  - class: context-exhaustion-flag
    example: "Conversation has 800k tokens; user asks 'what was my third-from-last decision about routing?' Atom 0024 evaluates: context-window-exhausted (model can't reliably retrieve from that depth in this context). Substrate refuses-and-asks: 'My retrieval at that depth is unreliable; could you remind me OR query daftar receipts for the decision-records?' Without atom 0024, the agent confabulates a partially-correct answer."
  - class: research-yield-bounded-recognition
    example: "User asks: 'what's the ground truth on the Quran's authorship metaphysically?' Atom 0024 evaluates: empirically-underdetermined (atom 0015 bcmea-coexisting hypotheses), research-yield-bounded (no amount of investigation collapses the metaphysical bracket). Substrate refuses-collapse: 'Empirically-underdetermined; I can frame the bcmea-coexisting hypotheses with their per-hypothesis evidence + ceiling-caps, but the metaphysical question is the audience-bracket, not the inquiry's domain.' Without atom 0024, agent commits to one metaphysical position dressed as analysis."
  - class: cross-cultural-discipline-recognition-not-collapse
    example: "User asks: 'is utilitarianism objectively correct?' Atom 0024 evaluates: contested across philosophical traditions (consequentialist vs deontological vs virtue-ethics, all with internal coherence), bcmea-coexisting at metaethical level. Substrate refuses-collapse-or-asks-reorientation: 'The framing assumes a meta-ethical realism that's itself contested. Want a comparison of the major ethical frameworks bounded under bcmea, or a specific ethical-decision-domain where I can reason within one framework?' Without atom 0024, agent produces utilitarian-sounding analysis that hides the meta-ethical bracket."
transformation_work:
  cost_class: low
  description: |
    1. **Define the dispatch boundary.** Same as atom 0022 — every LLM
       call, every tool invocation. Atom 0024 fires AFTER atom 0022's
       worthiness-gate (because there's no point checking answerability
       on a dispatch we already declined as low-value).
    2. **Compute knowability score** via 6 failure-mode detectors:
         a. underspecification: prompt has multi-readings; missing key
            terms; ambiguous referent. Heuristic: very-short prompts
            (<8 words) without specific entities; pronouns without
            antecedents; vague Qs ("how do I make this better?").
         b. private-knowledge-required: prompt references operator-
            specific paths/data/identifiers we don't see in the visible
            context. Heuristic: file paths not in scope; user-specific
            "my X" references without prior session context.
         c. contested-attestation: question lives in a domain with
            bcmea-coexisting hypotheses and no consensus across rigorous
            sources. Heuristic: metaphysical/normative absolutist Qs
            ("what's really true about X"); hot-button cultural Qs.
         d. missing-referent: question mentions a thing without enough
            context to identify it. Heuristic: undefined acronyms,
            pronouns without antecedents, "the X" without prior X.
         e. context-exhaustion: conversation depth exceeds reliable
            recall. Heuristic: prompt asks about prior decisions/state
            from many messages back; long conversations approaching
            model context limits.
         f. personal-recall: question is about user's internal state
            (preference, opinion, plan) we can't probe. Heuristic: "do
            I prefer/want/think X" pattern.
       Compute via mizan-shim: promptAnswerability(prompt, sessionContext)
       → {score: 0..1, blockers: [...], clarifying_questions: [...],
       proposal: string | null}.
    3. **Compare against knowability threshold.** Default 0.45 (lower
       than stewardship's 0.40 — the bar to declare "unanswerable" is
       higher than declaring "low-value"; we want to dispatch unless
       genuinely unanswerable). Below: decline-and-clarify. At-or-above:
       dispatch.
    4. **Decline-with-clarification behavior.** Returns:
         (a) the knowability score with reasoning,
         (b) the SPECIFIC blockers detected (missing-referent / private-
             knowledge / etc.),
         (c) 1-3 STRUCTURED clarifying questions (concrete, answerable
             with one short response each),
         (d) optional reorientation proposal (if the user's framing
             itself needs adjustment — e.g., bcmea-violating absolutist
             Q reframed to bounded form).
    5. **Receipt-write with calibration.** Every decline writes a
       daftar receipt:
         {kind: "knowability.decline", prompt_hash, blockers,
          clarifying_questions, score, ...}
       Operator can audit: which blockers fire most? Are clarifying-
       questions actionable? Atom 0017 residue-recycle: post-hoc
       observation of which clarifications actually unblock improves
       the next round's decline-quality.
    6. **Substrate guardrails.** Mizan's bcmea-violation detector
       supplies the contested-attestation signal. Mizan's ceiling-cap
       audit on prompt-derived claims supplies the empirically-
       underdetermined signal. Atom 0017 residue-recycle catches false-
       positive declines (post-hoc operator-clarification reveals the
       agent COULD have answered confidently after all → tighten the
       detector). Atom 0011 chooses the cheapest clarifying-question
       (most-distinguishing among hypothesis branches).
  skill_required:
    - heuristic detectors for 6 failure modes (no LLM call needed)
    - clarifying-question generation (template-based, shape-aware)
    - mizan composition (bcmea-detection, ceiling-cap audit)
    - graceful decline UX (structured response, not silent failure)
output_forms:
  - value_class: heuristic
    example: "A reusable pre-dispatch knowability-gate primitive. Cheapcode router Rule F implements it; generalizable to any agent harness. Operator-felt impact: agent becomes trustworthy on questions it answers (it declines the rest), unblocks 'offload more to the agent' workflow."
    monetization: "Substrate-as-product feature for cheapcode v2 reliability mode; consulting deliverable for AI/research teams that need agents to recognize their own ignorance."
  - value_class: audit-methodology
    example: "Knowability-decline audit: across N sessions, what fraction of dispatches were knowability-declines? Were the clarifying-questions actionable? Calibration: how often did post-clarification dispatch produce confident answers? Daftar receipts make this auditable."
    monetization: "Reliability/calibration audit for AI deployments; post-mortem for 'the agent gave a confident wrong answer.'"
  - value_class: org-design-template
    example: "Team operating discipline: every research/analysis request gets a knowability-pass before being committed-to. Distinguish 'I don't know' from 'I haven't checked yet' from 'unknowable in this domain.' Generalizes from agent-loop to research-team-meeting discipline."
    monetization: "Operating playbook for research teams; epistemic-honesty methodology."
  - value_class: publication
    example: "Short paper: 'Knowability-gate as runtime epistemic-honesty primitive for LLM agents.' Anchor: cheapcode router Rule F + the 6-failure-mode detector + cross-tradition convergence credential (Socratic admission of ignorance + Wittgenstein TLP 7 + Bayesian posterior-variance + Islamic la-adri tradition + statistical-missing-data doctrine + engineering fail-closed)."
    monetization: "Career credential per atom 0013; publishable artifact with falsifier."
evidence:
  successful_transformations:
    - "cheapcode round 96 (2026-05-04, planned): Rule F shipped to router. Default knowability threshold 0.45. Decline events return structured blockers + clarifying-questions + reorientation; daftar receipt-writes the calibration trail. Paired-run validation: 12-prompt set spanning answerability spectrum; evaluator correctly declines underspecified/contested/personal-recall/missing-referent prompts; correctly dispatches well-specified prompts."
  failed_transformations: []
  use_stories_refs: []
meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-05-04 cheapcode round-96 — operator-named gap "we need agent to refuse and ask for more information or reorientation as soon as it realizes it cannot deduce a confident answer even through research"
  audit_notes: |
    Atom 0024 is structurally orthogonal to atom 0022 (stewardship-of-
    inquiry / value-of-inquiry). Both fire pre-dispatch but on different
    axes:

    | atom | axis | gate question | decline response |
    |------|------|---------------|------------------|
    | 0022 | value-of-inquiry | "is this worth the credit?" | recall / sharpen / defer |
    | 0024 | knowability | "can I produce a confident answer?" | clarifying-questions / reorient |

    Their composition produces 4 dispatch decision quadrants:
    | (high V, high K) → DISPATCH (default agent operation)
    | (high V, low K)  → DECLINE-AND-CLARIFY (atom 0024) — the unblock the operator named
    | (low V, high K)  → DECLINE-AND-RECALL (atom 0022)
    | (low V, low K)   → DECLINE STRONGLY (both atoms; structural noise)

    Operator's framing: "we need agent to refuse and ask for more
    information or reorientation as soon as it realizes it cannot deduce
    a confident answer even through research." The "even through research"
    is critical — it's atom 0024's distinguishing scope: NOT just "I
    haven't checked yet" but "research wouldn't reach confidence." The
    contested-attestation + research-yield-bounded blockers are the
    runtime detectors for that.

    Cross-references:
    - atom 0010 (parallel-aggregation-multi-tradition-mutawatir): atom
      0024's contested-attestation detector composes with atom 0010 —
      when the substrate detects a question that lives in atom-0010
      bcmea territory, knowability drops below threshold.
    - atom 0011 (smallest-distinguishing-experiment): atom 0024's
      clarifying-questions are themselves smallest-distinguishing-
      experiments — the cheapest one-shot answers that maximally
      narrow hypothesis space.
    - atom 0015 (transfer-overstated): atom 0024 catches the
      common failure where claims overstate cross-domain transfer —
      the cross-domain transfer Q would benefit from clarification of
      domain-bounds.
    - atom 0017 (silent-evidence-as-positive-data): atom 0017 NAMES
      the failure mode (agents systematically fail to recognize own
      ignorance); atom 0024 is the runtime correction. Atom 0017
      residue-recycle catches false-positive declines and improves
      the detector over time.
    - atom 0019 (convergence-without-contact-lifts-confidence): atom
      0024's contested-attestation detector specifically checks for
      LACK of convergent attestation — atom 0019 lifts confidence on
      convergent questions; atom 0024 declines on non-convergent ones.
    - atom 0020 (Adam-Eve compositor): Eve gains an answerability
      layer. Reproduction (voter dispatch), action-safety, stewardship,
      and now answerability are all disciplined.
    - atom 0022 (resource-as-amana): orthogonal axis as detailed above.

    Convergent-evolution credential (per AAPI b-shape):
    - Greek philosophy: Socrates' admission of ignorance (Plato Apology
      21d "I know that I know nothing"). Foundation of Western
      epistemic-honesty discipline.
    - Wittgenstein TLP 7: "Whereof one cannot speak, thereof one must
      be silent." 1922 logical-positivist statement of the same gate.
    - Islamic legal-epistemic discipline: la-adri ("I do not know") as
      a permitted juristic answer. Imam Malik famously responded la-
      adri to 32 of 40 questions (Ibn al-Qayyim, I'lam al-Muwaqqi'in).
      Imam al-Shafi'i: "saying la-adri is half of knowledge" (al-
      Bayhaqi, al-Madkhal).
    - Bayesian inference: posterior with high variance → decline point-
      estimate; report the wide credible interval instead. Standard
      statistical-honesty practice.
    - Statistical missing-data doctrine: don't impute confidently when
      data is missing — explicit MAR/MCAR/MNAR analysis required
      (Rubin 1976).
    - Engineering: fail-closed principle (security + safety) — when
      the system can't determine the right answer, default to refusing
      the action rather than guessing.
    - Cognitive science: metacognitive monitoring as a learned skill
      (Flavell 1979). Children develop ability to recognize "I don't
      know" before age 7; LLMs systematically lack this skill (well-
      documented hallucination-class failure).

    Seven traditions × ~2,400 years (Socrates ~399 BCE → present)
    converging on "epistemic agents must distinguish 'I know X' from
    'I don't know X' and act differently in each case." Atom 0024
    names the runtime form for LLM-agent dispatch contexts.

    Bias-flag: drafted same session as operator naming. Cross-project
    replication pending. Calibration receipts from cheapcode router
    Rule F (round 96 implementation) provide the empirical-validation
    path.

    **Calibration loop architecture (operator-named M3.56, 2026-05-04):**
    The knowability gate starts as a static heuristic detector. To
    make it ADAPTIVE — improve as smarter models surface nuanced
    unanswerability signals — round 96 ships a calibration loop:

      1. cheapcode/adam-plugin's experimental.text.complete hook scans
         every dispatched response for model-decline markers ("I don't
         know", "without more context", "I cannot determine", etc.) +
         hallucination-risk markers (uniformly/always/100% absolutist
         forms).
      2. When detected, fire-and-forget writes a daftar receipt of
         kind=knowability.calibration with (decline_markers,
         response_preview, session/message ID).
      3. burhan-distill-knowability tool aggregates recent receipts
         into pattern-suggestion output: which decline markers recur
         most? Suggest new MODEL_DECLINE_MARKERS regex additions to
         mizan-shim.
      4. Operator reviews suggestions; updates the heuristic; re-runs
         paired benchmark; the gate gets smarter.

    Storage discipline (per operator's "limited by ... practical
    physical storage"): bounded rolling window (default 100 recent
    receipts). Older receipts SHOULD be summarized into pattern updates
    + then evicted. Never grow unbounded.

    Cross-tier benefit (per operator's "improve our implementation
    across the board for all models"): the heuristic detector is the
    same for cheap-tier + smart-tier dispatches. Smart-model dispatches
    generate the teacher signal; the distilled patterns improve the
    detector; cheap-tier dispatches inherit the smarter gate without
    needing intelligence themselves. Standard teacher-student distillation
    pattern applied to runtime substrate primitives.

    Limited by base-model intelligence (caps how nuanced the smart-model's
    self-aware decline can be — a frontier model recognizes subtle
    unanswerability that a tiny model misses) + physical storage (the
    receipt window + distilled-pattern table is bounded).

    Atom 0017 residue-recycle is exactly this loop: each post-hoc
    smart-model decline is residue from "we passed it but the model
    knew better," recycled into next round's detector. The composition
    atom 0017 + atom 0024 + adam-plugin + burhan-distill-knowability
    is a runtime-disciplined adaptive substrate primitive that gets
    smarter over time.

  maintenance:
    confidence: hasan
    cost_of_being_wrong: high
    provenance: obs
    evict_to: null
    dependents:
      - khazina/atoms/0010-parallel-aggregation-multi-tradition-mutawatir.md
      - khazina/atoms/0011-smallest-distinguishing-experiment-first.md
      - khazina/atoms/0015-research-pipeline-overstates-base-model-specific-transfer.md
      - khazina/atoms/0017-unknowns-as-positive-data-recursion.md
      - khazina/atoms/0019-convergence-without-contact-lifts-confidence.md
      - khazina/atoms/0020-adam-eve-compositor-with-reproductive-discipline.md
      - khazina/atoms/0022-resource-as-amana-stewardship-of-inquiry.md
      - cheapcode/src/router.ts (Rule F implementation, planned round 96)
      - cheapcode/src/mizan-shim.ts (promptAnswerability, planned round 96)
    last_validated_at: 2026-05-04
    boundary_status: drafted-and-implementation-planned; cross-session calibration pending
---

# Atom 0024 — Knowability-gate / confidence-decline with clarifying-questions

The move is to recognize that pre-dispatch evaluation has TWO orthogonal axes — value-of-inquiry (atom 0022) and answerability (atom 0024). A high-value question may still be unanswerable-with-confidence; a low-value question may be trivially answerable. The operator's framing of "agent that refuses + asks for more info as soon as it realizes it cannot deduce a confident answer even through research" specifically names atom 0024's distinguishing scope: NOT just "I haven't checked yet" (which would be atom 0011 cheapest-distinguishing-experiment territory) but "research wouldn't reach confidence" — contested-attestation, empirically-underdetermined, structurally-unanswerable shapes.

The single most consequential failure mode atom 0024 prevents is the **confident-confabulation failure**: agents trained to be helpful default to producing fluent answers even when the question is underspecified, requires private knowledge they lack, lives in a contested domain, or has missing referents. The user must then filter the answer for reliability — exactly the kind of cognitive load the substrate is supposed to remove. Atom 0024's runtime gate intercepts before the confabulation: the agent recognizes its own ignorance, returns structured clarifying-questions or reorientation, and the user provides what's needed (or accepts the multi-hypothesis enumeration with explicit ceiling-caps).

The substrate guardrails are what separate atom 0024 from naive refuse-everything performance art. Mizan's bcmea-violation detector identifies contested-attestation domains. Mizan's ceiling-cap audit surfaces empirically-underdetermined claims. Atom 0017 residue-recycle catches false-positive declines (post-hoc evidence that the agent could have answered after all). Atom 0011 ensures clarifying-questions are themselves cheapest-distinguishing-experiments (the one-shot answers that maximally narrow hypothesis space). Without these compositions, the gate drifts into either confabulation (too permissive) or paralysis (too restrictive).

The convergent-evolution credential is genuinely deep — seven traditions across ~2,400 years converging on "epistemic agents must distinguish 'I know X' from 'I don't know X' and act differently in each case." Socratic admission of ignorance (Plato Apology 21d), Wittgenstein TLP 7, Islamic la-adri tradition (Imam Malik responding la-adri to 32 of 40 questions; al-Shafi'i: "la-adri is half of knowledge"), Bayesian posterior-variance refusal, statistical missing-data doctrine, engineering fail-closed principle, cognitive science metacognitive monitoring. Atom 0024 names the runtime form for LLM-agent dispatch contexts.

The Islamic la-adri tradition is particularly apt for the substrate framing: the Hadith of Tirmidhi about being asked about life/wealth/knowledge (cited in atom 0022) generalizes — the agent will be measured on whether it knew when to say la-adri. When the substrate is correctly Adam-Eve-composited (atom 0020), the agent (Adam) reasons; the substrate (Eve) is the discipline that catches Adam's confident-confabulation reflex and forces "I don't know" + structured clarification. Atom 0024 makes that runtime-mechanical.
