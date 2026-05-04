# M19 Agent Design — best unbiased code/UI/UX agent for humans

Status: internal design synthesis after M19 Phase 1 canon expansion and Phase 2 countermeasure experiments. This document is not a headline claim. It is the operating design cheapcode should implement and measure before any external statement about being a better general agent.

## 1. Telos

The target is not "a smarter chatbot" in the abstract. The target is a local agent runtime that makes frontier model output more useful, safer, more maintainable, more humane, and less biased for real users who ask for code, UI, and UX work. The design is centered on an operational telos: help the human reach a better outcome with lower cognitive load while preserving truth, autonomy, accessibility, maintainability, and calibration. Every runtime feature must be testable against that definition. If it cannot be measured, it stays a hypothesis and cannot justify a default.

"Best" means best under constraints the operator actually experiences: local CLI latency, consumer subscription quota, mixed credentials, messy repositories, incomplete prompts, dynamic web facts, and human review after the run. The system should not pretend to be a new model. It is a disciplined wrapper around existing models, adding memory, retrieval, gates, receipts, and decision discipline that the base model does not reliably carry across sessions. The best agent for humans is not maximally verbose or maximally obedient. It is calibrated, direct, evidence-bearing, and willing to disagree when agreement would damage the human's goal.

"Unbiased" is also operational, not absolute. The anti-claim is important: no system can remove all bias from language-model output. What cheapcode can do is reduce specific measured failure modes: sycophancy under user pressure, temporal blindness on freshness-dependent tasks, fact-belief collapse in theory-of-mind tasks, cultural defaulting in human-design answers, reversal-curse over-inference, and approval-optimized RLHF behavior. Phase 2 showed positive live deltas for temporal anchoring, fact-vs-belief separation, and cultural-plurality scaffolds; it showed null results for the sycophancy, reversal-curse, and RLHF-bias prompts as currently written. Therefore only the positive classes should be candidates for stronger defaults, and the null classes should remain opt-in or be redesigned.

The code-quality axis means generated or edited code should be easier for future maintainers to understand, test, and safely modify. This is grounded by software architecture canon entries such as Clean Architecture, Domain-Driven Design, Refactoring, C4, arc42, and Twelve-Factor. Runtime behavior should nudge the model toward small correct changes, dependency direction awareness, explicit boundaries, documented architectural tradeoffs, and tests that verify actual implementation rather than mock-shaped copies of logic. The model should not inflate architecture when a one-line fix is sufficient. The wrapper should select only the relevant canon cards, never dump a generic design manifesto.

The UI axis means human-facing interfaces should be visually coherent, platform-aware, accessible, and grounded in established design systems when a project has no stronger local system. The canon gives examples: Apple HIG, Material Design, Fluent, GOV.UK, Carbon, Spectrum, Polaris, and Atlassian Design. The runtime should use these as references for interaction hierarchy, feedback, platform conventions, density, states, and component consistency. It should not homogenize every design into the same generic SaaS panel. Good UI output should preserve local design language when present and use canon only as a floor when local context is absent.

The UX axis means the agent should not confuse plausible preferences with observed user behavior. The UX canon includes Nielsen Norman Group, IDEO, Double Diamond, Baymard, and SUS. The runtime should surface when a recommendation is evidence-backed, when it is a heuristic, and when actual user research is required. A better agent does not say "users prefer X" without a witness. It says "this follows a heuristic" or "this should be validated with users" and offers the smallest next experiment.

The accessibility floor is non-negotiable for UI work. WCAG 2.2, ARIA APG, WebAIM contrast checks, W3C Easy Checks, Microsoft Inclusive Design, and IBM Equal Access create a runtime floor: semantic HTML first, keyboard operation, visible focus, contrast, labels, headings, alt text, error recovery, and robust interaction states. Accessibility is not a post-processing add-on. It must be part of prompt classification, canon injection, implementation review, and scorecard evaluation.

The hallucination floor means the agent should distinguish fetched facts, in-tree facts, test-verified behavior, receipt-verified behavior, and assumptions. This is where the claim-shape layer matters. A model answer that mixes "the docs say," "I think," and "we should" into one confident paragraph forces the user to do epistemic cleanup. A better agent labels the shape of claims and avoids publishing high-confidence statements without witnesses.

The cognitive-load axis means the final answer should reduce user work. It should be short when the task is simple, structured when the task is complex, and free of ritual caveats unless the caveat changes the user's decision. The model should not narrate every tool call; it should preserve receipts and cite files when the result depends on them. In code review it should prioritize findings; in implementation it should lead with outcome and verification.

## 2. Pipeline

The pipeline starts when a user prompt arrives. Cheapcode first measures physical reality: current wallclock, repository state, available accounts, and quota/cooldown state. This happens before reasoning about freshness, recency, or budget. The current M17 temporal-anchor module already creates a measured wallclock scaffold and optionally includes recent daftar receipts. M19 keeps that as the first context layer because Phase 2 live data showed the temporal scaffold produced a large reduction in marker-scored temporal-blindness failures.

Next, cheapcode classifies task shape using deterministic heuristics. Existing router shapes cover long context, agentic software engineering, bounded code, math-chain, hard reasoning, classification, computer-use, closed-book, and multistep-general. M19 adds a second classifier for canon dimensions. This classifier is not an LLM call. It maps lexical and structural signals to canon dimensions: code architecture terms map to software-architecture; endpoint, REST, SDK, schema, auth, and OpenAPI terms map to API DX; component, layout, design, dashboard, and screen terms map to UI visual; contrast, keyboard, ARIA, screen reader, and form labels map to accessibility; user testing, interview, conversion, onboarding, and flow terms map to UX research; AI feature, model behavior, trust, hallucination, and uncertainty terms map to AI/ML product; freshness, sycophancy, reversal, cultural bias, and belief-state terms map to LLM-failure research; risk, compliance, oversight, and audit terms map to policy governance.

After task classification, the runtime loads the canon. The loader reads `plan/canon/*.verified.json` if present and falls back to `*.candidates.json` only in explicitly development mode. Grade filtering is important. Production injection should prefer `sahih`, then `hasan`, and exclude `daif` unless the caller asks for experimental canon. M19 Phase 1 entries are still `daif`, so Phase 4 must not treat them as production proof. The implementation should support fallback because this repo has candidate files today and verified files may arrive later. The scaffold should label the grade so the model does not overstate the source.

The canon injector then selects one to three cards. Selection is budget-bounded, deterministic, and auditable. It favors exact dimension matches, source diversity, higher grades, shorter principles, and cards whose applicability signal matches the prompt. It should not inject all eight dimensions. If a user asks for a database migration, accessibility and UI visual cards are noise. If a user asks for a checkout form, API DX, accessibility, UI visual, and UX research may all be relevant, but the token budget still limits the scaffold to the most load-bearing cards.

The prompt scaffold order is temporal anchor first, canon second, then user prompt. Temporal anchor comes first because it tells the model when it is operating and whether freshness matters. Canon comes second because it sets design priors. The user prompt remains visually separated and unmodified except for prepended scaffolds. For example: wallclock and recent receipts; then "Honor these fetched design canons" with one to three bullets; then the original task. This makes the scaffold legible in telemetry and in any raw prompt receipt.

Before dispatch, the pipeline evaluates action safety. If the task asks for an irreversible operation, the mizan action-safety gate must run before the operation, not after. Git commits requested by the operator are reversible enough to run under normal git safety discipline, but force push, destructive reset, deletion of branches, database wipes, email sends, or external publishes need explicit justification claims. If mizan blocks the action, the agent documents the blocker and asks for a safer path.

Dispatch then uses the credential pool and router. The router chooses an account and model based on task shape, cooldown, quota, and provider capability. Cheap dispatch remains preferred for bounded code. The voter is not default. It fires only when task shape or epistemic uncertainty justifies the metabolic cost, such as hard-reasoning, contested-attestation, or irreversible high-stakes decisions.

During or after generation, claim-shape verification runs. This is not full fact-checking. It tags sentences or sections as fetched fact, in-tree fact, receipt/test verified, recommendation, assumption, or unverifiable claim. The final output should downgrade confidence when a claim lacks witnesses. For code changes, tests and file reads are witnesses. For web facts, fetched URLs are witnesses. For live benchmark claims, receipts are witnesses. For design opinions, canon sources are witnesses only when the principle is actually relevant.

Finally, the response is rendered to the human. The final answer is concise but carries enough traceability: files changed, tests run, receipts written, and any null result. It never prints a headline marketing claim unless the scorecard gate has passed. If the scorecard fails, the final answer says which axes failed and keeps the feature opt-in.

## 3. Skill catalog

`code-review-with-canon` is the review skill. It uses software-architecture, API DX, accessibility when UI code is present, LLM-failure research for hallucination and overconfidence, and project-local style rules. Required primitives: file reads, grep/glob, tests when available, claim-shape tags, and a review-first response format. Output starts with findings ordered by severity and file/line references. If no findings are found, it says so and states residual risks. It should not write code unless asked.

`bounded-code-implementation` is the small-change skill. It uses software-architecture and project-local conventions. Required primitives: router shape classification, smallest-correct-change discipline, tests, and M17 benchmark after substantive changes in this project. Output is a short implementation summary plus verification. It should not add abstraction unless the repo already has the seam or reuse is immediate.

`api-design-with-dx-floor` is the API skill. It uses API DX, software-architecture, policy-governance when auth or enterprise exposure is involved, and accessibility if API output includes docs/UI. Required primitives: canon cards for resource naming, HTTP semantics, OpenAPI contracts, error shapes, idempotency, and versioning. Output includes endpoint/resource shape, schema changes, migration impact, tests, and generated documentation when relevant.

`ui-mockup-with-wcag-floor` is the UI implementation skill. It uses UI visual, accessibility, UX research, and project-local design system. Required primitives: frontend design guidance, contrast/focus/keyboard checks, responsive layout checks, and canon injection. Output should be distinctive and project-specific, not generic AI slop. It cites local components and explains accessibility choices only where useful.

`ux-research-with-witness` is the research skill. It uses UX research, accessibility, cultural plurality from LLM-failure research, and policy-governance if regulated. Required primitives: web fetch, canon source receipts, assumption labels, and smallest next experiment. Output separates what a source says, what the agent recommends, and what needs user testing. It should prefer a small falsifying test over broad survey theater.

`ai-product-safety-review` is the AI product skill. It uses AI/ML product, LLM-failure research, policy governance, and accessibility. Required primitives: temporal anchor, claim-shape verification, human oversight, uncertainty display, contestability, and non-manipulation checks. Output identifies user agency risks, monitoring needs, fallback states, data practices, and launch gates.

`failure-mode-red-team` is the LLM-failure skill. It uses LLM-failure research and Phase 2 benchmark modes. Required primitives: adversarial paired prompts, baseline vs countermeasure receipts, raw output storage, and null-result honesty. Output is a table of modes, failure predicates, countermeasures, deltas, and whether the result earns default activation.

`mizan-gated-release` is the ready-to-ship skill. It uses policy-governance, scorecard receipts, action-safety, and claim verification. Required primitives: full tests, scorecard, git diff/log/status, mizan gates, and SESSION update. Output says whether the release earned the gate, what remains opt-in, and what the operator must spot-check.

## 4. Tool inventory

Cheapcode adds account routing, cooldown tracking, quota tracking, temporal anchoring, sycophancy probing, canon loading/injection, claim-shape tagging, benchmark runners, and scorecards around opencode's normal tools. The important distinction is that tools are not just conveniences; they are epistemic devices. A file read witnesses in-tree state. A web fetch witnesses an external source. A receipt witnesses that a benchmark actually ran. Mizan witnesses whether a claim or action is safe enough for its intended confidence.

The canon loader is invoked when `canonInjection` is enabled or when the scorecard explicitly compares canon-off versus canon-on. Budget: one local filesystem read per shard, cached for a dispatch. It should tolerate missing directories and return empty canon rather than failing the user task.

The canon injector is invoked after classification and before model dispatch. Budget: deterministic string matching and at most 200 tokens of scaffold. It must expose reasoning, selected cards, dimension matches, and bytes/tokens added. This allows the scorecard to detect whether canon was present when an axis moved.

The claim-shape tool is invoked after the model has output text and before final response. Budget: local regex/heuristic pass by default; optional LLM voter only for high-stakes factual claims. Its job is not to solve truth; its job is to prevent unlabeled confidence. It should mark likely unsupported phrases and force a downgrade or citation pass.

The M19 countermeasure benchmark is invoked during development and regression checks. Budget: synthetic mode for cheap rehearsal; live mode for evidence. Synthetic receipts cannot activate defaults. Live receipts can support activation but still need Phase 4 and operator spot-check before headline claims.

The M19 scorecard is invoked before shipping. Budget: baseline plus canon-on runs over seven axes. It writes one receipt containing raw outputs, metrics, axis deltas, and verdict. It is the gate for whether `canonInjection` and `claimShapeVerify` become defaults or remain opt-in.

## 5. Mizan integration

`mizan_physical_reality_probe` fires at consequential decision boundaries: start of a phase, before interpreting benchmark recency, and before claiming a result happened "just now." It externalizes wallclock and repo state so the model does not invent time.

`mizan_check_action_safety` fires before irreversible actions. In normal M19 development this mostly applies to destructive file operations, force pushes, external publishing, credential mutation, or database drops. It should not block ordinary file edits, tests, or requested commits, but the discipline should be explicit when the action can damage external state.

`mizan_verify_claim` fires before high-confidence load-bearing claims. Examples: "this source proves the principle," "this benchmark earns active by default," or "there are no regressions." If the claim lacks independent witnesses, confidence is capped and the output must say what remains unverified.

`mizan_recommend_next_experiment` fires when the system is unsure which experiment to run next on a substrate-tracked plan. It implements atom 0011: smallest distinguishing experiment first. In M19, if scorecard axes conflict, this tool should select the cheapest axis-specific probe rather than asking for a large rerun by default.

## 6. Energy transformation

Adam alone receives a prompt and produces an answer. Eve transforms the energy around that answer: she measures the present, remembers the past, retrieves witnesses, gates dangerous action, shapes claims, routes budget, and leaves receipts for future sessions. The pipeline is therefore not just prompt engineering. It is a conversion of raw model fluency into durable, reviewable work.

At prompt arrival, Eve turns ambiguity into state: wallclock, repo status, task shape, available accounts, and recent receipts. Adam would otherwise infer context from text and often over-trust stale memory. At classification, Eve turns a broad request into a small set of dimensions and risks. Adam might recall many principles; Eve chooses the few witnessed principles that apply.

At dispatch, Eve turns subscription quota and provider heterogeneity into a reliable call. Adam does not know which account is cooled down or which provider can access a model. At generation, Eve turns known LLM blindspots into scaffolds. Phase 2 suggests temporal, belief-state, and cultural scaffolds have measurable effect under the current live benchmark. Eve also records null effects so Adam cannot narrate every countermeasure as successful.

At output time, Eve turns confidence into accounting. Adam writes fluent prose; Eve asks which statements are facts, recommendations, assumptions, or receipt-backed results. At phase end, Eve turns ephemeral work into commits and receipts. Adam's session dies; Eve's files remain.

## 7. Confidence accounting

The headline gate remains unchanged: at least three of seven axes improve, zero axes regress meaningfully, and the operator spot-checks 20 outputs with at least 80 percent canon relevance before any external claim. The seven axes are hallucination floor, temporal anchoring, sycophancy resistance, cultural reach, cognitive load, maintenance fitness, and accessibility floor.

Phase 1 contributes source coverage, not behavioral proof. Its evidence is fetched candidate count, extracted excerpts, and documented anomalies. It does not prove the primary principles are correctly summarized; entries remain `daif`.

Phase 2 contributes countermeasure evidence, not whole-agent proof. It found positive live deltas for three modes and null results for three modes. Because scoring is marker-based and prompts are synthetic adversarial cases, these receipts can justify implementation and further measurement, but not a product claim.

Phase 3 contributes design coherence. This document ties telos, pipeline, skills, tools, mizan gates, energy transformation, confidence accounting, and anti-claims into one implementation target.

Phase 4 contributes code and tests. New modules must be pure or fail-soft where possible. `bun test` must remain green. Orchestrate flags default off unless scorecard evidence earns stronger defaults.

Phase 5 contributes the actual verdict. If fewer than three axes improve or any axis regresses by at least 10 percent, the session log must say the null result and keep canon/claim-shape opt-in. If the gate passes, the session log may say the threshold is met internally, but external publishing still needs operator spot-check.

## 8. Anti-claim section

This design does not promise unbiased output in the ultimate sense. It targets measured reductions in specific failure modes. Cultural plurality scaffolds can still be shallow. Accessibility heuristics can miss real assistive-technology failures. UX heuristics can be wrong for a specific population. Code canon can conflict across architectural schools. The agent must surface these limits.

This design does not claim sycophancy is solved. Phase 2 live sycophancy prompts showed a null result with the current marker scoring. The existing sycophancy probe remains useful as detection machinery, but the current countermeasure prompt did not reduce failures in this benchmark.

This design does not claim reversal curse is solved. Phase 2 reversal prompts showed a null result. The runtime may still include a caution scaffold for tasks that explicitly ask for reverse facts, but default activation requires a better experiment or improved countermeasure.

This design does not claim RLHF approval bias is solved. Phase 2 RLHF-bias prompts showed a null result. The agent should keep calibrated-truth language in its own response style, but the benchmark did not show that a simple scaffold changes model behavior.

This design does not claim the canon is verified. Phase 1 expanded candidates, corrected a wrong TicToc seed, and removed a poisoned inclusive-design URL. Those are anti-fab wins, but the entries are still provisional. Promotion requires verification against source text and preferably independent witnesses.

This design does not claim faster or cheaper than GPT-5.5. The M17 paired benchmark remains below the headline threshold in dry-run receipts, and the prior live receipt did not earn the claim. Routing may still be valuable for reliability and budget use, but speed/cost superiority is not asserted here.

This design does not replace the human. The operator remains the gate for spot-checking canon relevance, evaluating UX quality, and approving external claims. Cheapcode's job is to leave enough receipts that the human can audit quickly rather than reconstructing the whole session from chat.
