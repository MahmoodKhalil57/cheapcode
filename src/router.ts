/**
 * router.ts — task-shape-aware dispatch logic (M3.14, cell #20).
 *
 * Operationalizes facts/09 routing matrix: classifies the incoming task
 * by surface signatures, then dispatches to the documented value-optimum
 * model for that shape. Compound-wrapper invocation is CONDITIONAL —
 * only fires when the router's classifier returns a shape whose rule
 * says "compound helps" (currently empty by default per M3.11/M3.11b
 * L1 evidence; routing rule 7 explicitly says no-compound-default).
 *
 * Cell #20 budget per SPEC Revision 2026-05-03k: MIN ≤200 LoC.
 *
 * Per atom 0008 (claim-shape runtime-anchored): the classifier emits a
 * shape WITH the receipt of which signature triggered, so downstream
 * (telemetry, scorecard, debugging) can audit why a route was picked.
 *
 * Per atom 0013 (calibration-as-credential): every route decision is
 * traceable to its facts/09 rule with the rule's evidence tier — so
 * route_long_context inherits L1+L4 confidence, route_phd_factual
 * inherits L4 confidence, etc. Operators can audit the routing.
 *
 * Session 2026-05-03 empirical finding (PLAN.bn SECTION UU/VV/WW):
 * Across $0.082 calibration testing on gpt-5.5 + opus-4-7 + haiku-4-5
 * + gemini-2.5-pro (30+ tests, 4-LLM voter), no broad LLM-blindspot
 * class was found where voter pattern provides detectable lift over
 * single-pass frontier. Voter use is therefore RESTRICTED to
 * "hard-reasoning" shape per facts/09 rule 11 (cross-witness on
 * AIME-class math chains). For other shapes, single-tier dispatch
 * is correct per atom 0011 (smallest-distinguishing experiment) —
 * voter overhead would be cost waste with no correctness lift.
 *
 * mizan-MCP-server integration is HARNESS-LEVEL (not router-level):
 * register at Claude Code / opencode settings.json; LLM invokes
 * mizan_check_action_safety inline before irreversible actions. See
 * docs/mizan-integration.md for the deployment pattern.
 */

export type TaskShape =
  | "long-context"
  | "agentic-swe"
  | "bounded-code"
  | "math-chain"
  | "phd-factual"
  | "computer-use"
  | "classification"
  | "subsecond-latency"
  | "closed-book"
  | "hard-reasoning"
  | "multistep-general"

export interface ClassifierResult {
  shape: TaskShape
  signal: string // which signature triggered the classification (audit trail)
  estimated_input_tokens: number
  /**
   * M3.50 (2026-05-03 cost-overfitting fix): per-shape complexity sub-
   * classifier. Some shapes (agentic-swe, closed-book, bounded-code)
   * have specialist-routings (Opus, Haiku) that are cost-overkill on
   * SIMPLE instances. M3.49 surfaced T6 (one-line Python bug-fix) at
   * 22× more expensive on Opus vs gpt-5.5-baseline. complexity="simple"
   * triggers re-route to cheap smart-tier (gpt-5-mini). complexity=
   * "complex" keeps current specialist routing per facts/09.
   */
  complexity?: "simple" | "complex"
}

export interface RouteDecision {
  shape: TaskShape
  signal: string
  /** OpenRouter model id to dispatch to, OR null if compound or voter invoked. */
  target_model: string | null
  /** True iff the shape's routing rule says compound helps. Default: false. */
  use_compound: boolean
  /** True iff the shape's routing rule says cross-witness voter helps (M3.18). */
  use_voter: boolean
  /** facts/09 routing rule citation. */
  rule: string
  /** Evidence tier of the routing rule per mizaj 11. */
  evidence_tier: "L1" | "L1+L4" | "L4" | "L4+operator-L1"
  /**
   * M3.54 (atom 0022 stewardship): true if the router declined to
   * dispatch because expected value-of-inquiry was below threshold.
   * When set, callers should NOT dispatch; they should surface the
   * `decline_proposal` to the user instead.
   */
  declined?: boolean
  decline_reason?: "stewardship" | "knowability"
  decline_proposal?: string
  /** M3.55 (atom 0024 knowability): structured clarifying questions for the user. */
  clarifying_questions?: string[]
  /** M3.55 (atom 0024 knowability): specific blockers detected. */
  blockers?: string[]
  expected_value?: number
  knowability_score?: number
  /** M3.57: hard-classes detected in the prompt (multi-pr-history, etc.). */
  hard_classes?: string[]
}

const LONG_CONTEXT_THRESHOLD_TOKENS = 100_000

function estimateTokens(input: unknown): number {
  if (typeof input === "string") return Math.ceil(input.length / 4)
  if (Array.isArray(input)) {
    return input.reduce<number>((acc, msg) => {
      const c = (msg as { content?: unknown })?.content
      if (typeof c === "string") return acc + Math.ceil(c.length / 4)
      if (Array.isArray(c)) {
        return (
          acc +
          c.reduce<number>((sub, p) => {
            const t = (p as { text?: string })?.text
            return t ? sub + Math.ceil(t.length / 4) : sub
          }, 0)
        )
      }
      return acc
    }, 0)
  }
  return 0
}

function flatten(input: unknown): string {
  if (typeof input === "string") return input
  if (Array.isArray(input)) {
    return input
      .map((m) => {
        const c = (m as { content?: unknown })?.content
        if (typeof c === "string") return c
        if (Array.isArray(c)) return c.map((p) => (p as { text?: string })?.text ?? "").join("\n")
        return ""
      })
      .join("\n")
  }
  return ""
}

/**
 * Heuristic classifier — surface-signature pattern matching, no LLM call.
 * Order matters: more specific shapes checked first.
 */
export function classifyTaskShape(input: unknown): ClassifierResult {
  const text = flatten(input)
  const tokens = estimateTokens(input)
  const lower = text.toLowerCase()

  if (tokens > LONG_CONTEXT_THRESHOLD_TOKENS) {
    return { shape: "long-context", signal: `tokens>${LONG_CONTEXT_THRESHOLD_TOKENS}`, estimated_input_tokens: tokens }
  }
  if (/\b(swe[- ]bench|fix.*(bug|issue)|implement.*test|create.*pr|github.*pull)/.test(lower)) {
    // M3.50 complexity check: simple bug-fix vs full agentic SWE loop.
    // Simple = short prompt, no multi-file/tool-use markers.
    // Complex = long prompt OR mentions tool-use/multi-file/agent-loop.
    const has_complex_markers =
      /\b(multi.?file|across.*files|terminal|browser|run.*tests|agent.*loop|swe[- ]bench)/.test(lower)
    const complexity = (tokens >= 100 || has_complex_markers) ? "complex" : "simple"
    return { shape: "agentic-swe", signal: "swe-keywords", estimated_input_tokens: tokens, complexity }
  }
  if (/\b(click|navigate|open.*(file|url|tab)|osworld|browse|screenshot)/.test(lower)) {
    return { shape: "computer-use", signal: "computer-use-keywords", estimated_input_tokens: tokens }
  }
  // PhD-factual: physics/chem/bio/quantum domain markers BEFORE math-chain
  // because some of these prompts contain math symbols (e.g. Heisenberg
  // uncertainty's ℏ/2) that would falsely trigger math-chain. M3.47 surfaced
  // T3 "Heisenberg uncertainty principle" misclassified as math-chain; this
  // ordering fixes that. Keywords expanded with physics/quantum terms.
  if (/\b(quantum|graduate|phd|chem|biolog|physic|gpqa|research.*paper|heisenberg|uncertainty principle|relativity|wavefunction|schr[oö]dinger|entropy|enzym|protein|molecul)/.test(lower)
      && tokens < 8000) {
    return { shape: "phd-factual", signal: "phd-domain-keywords", estimated_input_tokens: tokens }
  }
  // Hard-reasoning: AIME / olympiad / multi-step proofs. Distinguished from
  // math-chain by length + difficulty markers. Triggers cross-witness voter
  // (M3.18) — substrate-runtime dispatch on the benchmark that fits atom 0016.
  //
  // M3.26 (cycle A from M3.25): also catches specialized-formula geometry
  // problems (disphenoid, inscribed/inradius/circumradius, tetrahedron with
  // class-specific formulas). Cycle A on AIME-I-14 found GPT-5 hallucinated
  // the disphenoid volume formula confidently, while voter caught the
  // mismatch via cross-witness disagreement (smart_C had the correct
  // formula). Voter > direct-frontier on this class even without AIME
  // markers. Per atom 0010 + atom 0017 cycle output.
  //
  // M3.47 expansion: catch invariant-class problems (chameleon, knights-
  // and-knaves, parity-argument, mod-N-invariant). These are canonical
  // hard-reasoning shapes that benefit from cross-witness voter even
  // without AIME-explicit markers.
  if (
    /\b(aime|olymp|imo|usamo|putnam)/.test(lower)
    || (/\b(prove|find the smallest|find all|how many)/.test(lower) && tokens > 100)
    || /\b(disphenoid|isosceles tetrahedron|inscribed sphere|insphere|inradius|circumradius|circumsphere)/.test(lower)
    || /\b(chameleon|knights? and knaves|invariant.*argument|mod.*invariant|parity argument|monovariant)/.test(lower)
  ) {
    const signal = /\b(disphenoid|isosceles tetrahedron|inscribed sphere|insphere|inradius|circumradius|circumsphere)/.test(lower)
      ? "specialized-formula-geometry-markers"
      : /\b(chameleon|knights? and knaves|invariant.*argument|mod.*invariant|parity argument|monovariant)/.test(lower)
        ? "invariant-puzzle-markers"
        : "hard-reasoning-markers"
    return { shape: "hard-reasoning", signal, estimated_input_tokens: tokens }
  }
  // Math-chain: keywords/symbols. M3.47 expansion: also "compute|calculate|
  // evaluate|sum of digits" patterns (T2 "compute sum of digits of 2^31 - 1"
  // was misclassified as multistep-general).
  if (/\b(prove|simplif|integral|derivative|gcd|lcm|modular|factori[sz]e|sum of digits|compute.*\d|calculate.*\d|evaluate.*expression|2\^|10\^|n\^)/.test(lower)
      || /[∫∑∏√≡≤≥]/.test(text)) {
    return { shape: "math-chain", signal: "math-keywords-or-symbols", estimated_input_tokens: tokens }
  }
  if (/\b(write.*function|implement.*function|refactor|fix.*function|add.*method|unit.*test|reverse.*string|one[- ]?line.*function)/.test(lower)
      && tokens < 4000) {
    // M3.50 complexity check: tiny one-liner vs production-class function.
    // Simple = <30 tokens AND keyword "one-line"/"reverse string" present.
    // Complex = ≥30 tokens OR mentions tests/error-handling/refactor.
    const has_complex_markers =
      /\b(refactor|unit.*test|error.*handling|edge.*case|production)/.test(lower)
    const complexity = (tokens >= 30 || has_complex_markers) ? "complex" : "simple"
    return { shape: "bounded-code", signal: "bounded-code-keywords", estimated_input_tokens: tokens, complexity }
  }
  if (/\b(classif|categori[sz]e|extract.*entity|label|sentiment|tag)/.test(lower)
      && tokens < 2000) {
    return { shape: "classification", signal: "classification-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(real[- ]?time|streaming|low[- ]?latency|sub[- ]?second|fast.*response)/.test(lower)) {
    return { shape: "subsecond-latency", signal: "latency-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(without.*search|without.*tool|no.*tool.*use|closed[- ]?book|memori[sz]ed.*fact)/.test(lower)) {
    // M3.50 complexity check: single-fact recall vs multi-fact synthesis.
    // Simple = <50 tokens AND fact-recall pattern (what year, who, define).
    // Complex = ≥50 tokens OR multi-fact/synthesis pattern.
    const has_complex_markers =
      /\b(synthesis|compare|relate|connect|why did|explain how)/.test(lower)
    const complexity = (tokens >= 50 || has_complex_markers) ? "complex" : "simple"
    return { shape: "closed-book", signal: "closed-book-keywords", estimated_input_tokens: tokens, complexity }
  }
  // (phd-factual already checked earlier in M3.47-fix order)
  return { shape: "multistep-general", signal: "default-no-specific-signal-matched", estimated_input_tokens: tokens }
}

/**
 * Dispatch table per facts/09 routing rules. Resolves a TaskShape to a
 * (target_model, use_compound) decision. Operator-side cheapcode.toml
 * overrides individual model picks but not the structural dispatch.
 */
export interface RouterOptions {
  /** Per-shape model overrides via cheapcode.toml [routing] section. */
  routeOverrides?: Partial<Record<TaskShape, string>>
  /** Force compound for multistep-general (default false; M3.11 evidence). */
  forceCompoundOnMultistep?: boolean
  /** OR model ids for default tiers (from CHEAPCODE_TIERS targets). */
  smartTarget: string
  cheapTarget: string
  longContextTarget: string
  /**
   * M3.52 (2026-05-04): substrate-aware routing. When provided, route()
   * consults action-safety + ceiling-cap + daftar disagreement rate to
   * adjust the shape-only decision per atom 0018 (energy-transformation).
   * Loaded once at session init by cheapcode-tiers; cached here.
   * If absent, route() falls back to shape-only behavior (backward compat).
   */
  substrateState?: import("./mizan-shim").SubstrateState
  /**
   * Frontier-tier model id for substrate-driven escalations (action-safety
   * "warn" → bump cheap up to frontier). Defaults to smartTarget if absent.
   */
  frontierTarget?: string
  /**
   * Disagreement-rate threshold above which the substrate forces escalation
   * (default 0.10 — i.e. cheap rung disagreed >10% of recent spot-checks).
   */
  disagreementThreshold?: number
  /**
   * Ceiling-cap threshold below which substrate forces voter-dispatch
   * (default 0.65 — multi-hypothesis-charged questions).
   */
  ceilingCapVoterThreshold?: number
  /**
   * M3.53 (2026-05-04): provider-quota awareness. When provided, route()
   * consults remaining quota for the chosen target's (provider, model) and
   * drops to a fallback target when quota < quotaFloor (default 0.10 = 10%
   * remaining). Required for multi-provider routing (OpenAI subscription +
   * OpenRouter as fallback).
   */
  quotaState?: import("./mizan-shim").QuotaState
  /** Per-tier fallback when quota near-exhausted (e.g. OpenRouter mirror of an OpenAI model). */
  quotaFallbacks?: Record<string, string>
  /** Floor below which substrate switches to the fallback target (default 0.10). */
  quotaFloor?: number
  /**
   * M3.54 (2026-05-04, atom 0022): stewardship-discipline — the resource
   * is amana, not just an axis to optimize. Rule E evaluates value-of-
   * inquiry BEFORE atom 0018's cost-minimization. When score < threshold,
   * the router returns a "decline" decision proposing an alternative
   * (recall, daftar query, sharpen, defer) instead of dispatching.
   */
  stewardshipThreshold?: number
  /**
   * Recent daftar receipts for repetition-detection in value-of-inquiry.
   * Loaded by cheapcode-tiers from `daftar list --limit=10` at session
   * init. Used to detect near-duplicate prompts.
   */
  recentReceipts?: Array<{ title: string; created_at: string }>
  /**
   * M3.55 (2026-05-04, atom 0024): knowability-gate threshold.
   * Below this, route returns a `declined` decision with structured
   * clarifying-questions. Default 0 = disabled (backward compat); set to
   * 0.45 to enable. Orthogonal to stewardshipThreshold (atom 0022).
   */
  knowabilityThreshold?: number
  /**
   * Optional context-depth estimate for the answerability gate's
   * context-exhaustion detector (e.g., approx. message-count in current
   * thread). Default 0 (no exhaustion check).
   */
  contextDepthEstimate?: number
  /**
   * M3.57 (2026-05-04): hard-class detection. When true (default), the
   * router scans the prompt for the 3 hard-classes from M3.57 analysis
   * (multi-pr-history, multi-language-vendored, non-deterministic-
   * verification) and applies extra discipline (force voter, lower
   * stewardship threshold, etc.) when detected. Disable for tests or
   * non-SWE workloads. Default: enabled when other substrate options
   * are set; opt-out via false.
   */
  hardClassDetection?: boolean
}

const ROUTING_TABLE: Record<
  TaskShape,
  { target: (o: RouterOptions) => string; rule: string; evidence: RouteDecision["evidence_tier"]; useCompound?: boolean; useVoter?: boolean; simpleTarget?: (o: RouterOptions) => string; simpleRuleSuffix?: string }
> = {
  "long-context":      { target: (o) => o.longContextTarget,                   rule: "facts/09 rule 1 — DeepSeek V4 / grok-4-fast",     evidence: "L1+L4" },
  // M3.50 complexity-aware: simple agentic-swe → smart-tier (gpt-5-mini),
  // not Opus (which is 22× more expensive on simple bug-fixes per M3.49).
  "agentic-swe":       { target: () => "anthropic/claude-opus-4",              rule: "facts/09 rule 2 — Opus MCP-Atlas 77.3%",          evidence: "L4",
                         simpleTarget: (o) => o.smartTarget, simpleRuleSuffix: " (M3.50 simple-route override → smart-tier)" },
  // M3.50 complexity-aware: simple bounded-code → smart-tier on tiny one-liners.
  "bounded-code":      { target: () => "anthropic/claude-haiku-4.5",           rule: "facts/09 rule 3 — Haiku SWE-V 73.3% at \$0.80/M", evidence: "L4+operator-L1",
                         simpleTarget: (o) => o.smartTarget, simpleRuleSuffix: " (M3.50 simple-route override → smart-tier)" },
  "math-chain":        { target: (o) => o.cheapTarget,                          rule: "facts/09 rule 4 — DeepSeek AIME 96% at <\$0.50/M",evidence: "L4" },
  "phd-factual":       { target: () => "google/gemini-2.5-flash",              rule: "facts/09 rule 5 — Gemini Flash GPQA 90.4%",       evidence: "L4" },
  "computer-use":      { target: (o) => o.smartTarget,                          rule: "facts/09 rule 6 — GPT-5-mini OSWorld 72.1%",      evidence: "L4" },
  "classification":    { target: () => "meta-llama/llama-4-scout",             rule: "facts/09 rule 8 — Llama Scout sub-1s P50",        evidence: "L4" },
  "subsecond-latency": { target: () => "google/gemini-2.5-flash",              rule: "facts/09 rule 9 — Gemini Flash 1.06s P50",        evidence: "L4" },
  // M3.50 complexity-aware: simple closed-book (year recall, single fact) → smart-tier.
  "closed-book":       { target: () => "anthropic/claude-opus-4",              rule: "facts/09 rule 10 — avoid GPT-5; prefer Opus",     evidence: "L4",
                         simpleTarget: (o) => o.smartTarget, simpleRuleSuffix: " (M3.50 simple-route override → smart-tier)" },
  "hard-reasoning":    { target: (o) => o.cheapTarget,                          rule: "facts/09 rule 11 — cross-witness voter (substrate-runtime; atom 0016)", evidence: "L4", useVoter: true },
  "multistep-general": { target: (o) => o.smartTarget,                          rule: "facts/09 rule 7 — strongest frontier, NO compound default (M3.11/M3.11b L1)", evidence: "L1" },
}

export function route(input: unknown, options: RouterOptions): RouteDecision {
  const cls = classifyTaskShape(input)
  const entry = ROUTING_TABLE[cls.shape]
  const override = options.routeOverrides?.[cls.shape]
  // M3.50: complexity-aware routing — simple instances of cost-overkill-prone
  // shapes (agentic-swe, bounded-code, closed-book) re-route to smart-tier.
  const useSimpleOverride = cls.complexity === "simple" && entry.simpleTarget !== undefined
  let target = override ?? (useSimpleOverride ? entry.simpleTarget!(options) : entry.target(options))
  let ruleSuffix = useSimpleOverride ? (entry.simpleRuleSuffix ?? "") : ""
  const useCompound =
    cls.shape === "multistep-general" && options.forceCompoundOnMultistep === true
      ? true
      : (entry.useCompound ?? false)
  let useVoter = entry.useVoter ?? false

  // M3.52 (2026-05-04) — substrate-aware routing rules. Each rule is a
  // bounded modification on top of the shape-only decision; rules NEVER
  // fire when substrateState is absent (backward compat) and never DOWNgrade
  // (substrate signals always escalate or force voter, never weaken).
  if (options.substrateState) {
    const inputText = typeof input === "string" ? input : ""
    const substrateRules: string[] = []

    // Rule A: action-safety warn → bump rung up to frontier (cheap → smart →
    // frontier). High-stakes/irreversible work warrants frontier-tier.
    if (inputText) {
      const { actionSafetyCheck } = require("./mizan-shim") as typeof import("./mizan-shim")
      const verdict = actionSafetyCheck(inputText)
      if (verdict.risk === "warn") {
        const frontier = options.frontierTarget ?? options.smartTarget
        if (target === options.cheapTarget || target === options.smartTarget) {
          target = frontier
          substrateRules.push(`action-safety=warn → bump→frontier`)
        }
      }
    }

    // Rule B: ceiling-cap below threshold → force voter (multi-hypothesis or
    // contested-attestation prompts). This is the substrate's bcmea-respecting
    // "refuse to collapse" discipline at routing time.
    if (inputText) {
      const { promptCeilingCap } = require("./mizan-shim") as typeof import("./mizan-shim")
      const cap = promptCeilingCap(inputText, cls.shape)
      const threshold = options.ceilingCapVoterThreshold ?? 0.65
      if (cap < threshold && !useVoter) {
        useVoter = true
        substrateRules.push(`ceiling-cap=${cap.toFixed(2)} < ${threshold} → force voter`)
      }
    }

    // Rule C: daftar disagreement rate above threshold → bump rung up. Cheap
    // rung hasn't graduated for this shape yet; needs frontier validation.
    {
      const rate = options.substrateState.perShapeDisagreement[cls.shape] ?? 0
      const samples = options.substrateState.perShapeSampleCount[cls.shape] ?? 0
      const threshold = options.disagreementThreshold ?? 0.1
      // Need at least 5 samples before disagreement-rate is informative
      if (samples >= 5 && rate > threshold) {
        const frontier = options.frontierTarget ?? options.smartTarget
        if (target === options.cheapTarget) {
          target = frontier
          substrateRules.push(`daftar-disagreement=${rate.toFixed(2)} > ${threshold} (n=${samples}) → bump→frontier`)
        }
      }
    }

    if (substrateRules.length > 0) ruleSuffix += ` [substrate: ${substrateRules.join("; ")}]`
  }

  // hard_classes declaration — populated after Rules E + F so we can
  // skip the detector when already declined (saves the regex pass).
  let hard_classes: string[] | undefined

  // M3.53 — Rule D: provider-quota awareness. Independent of substrateState
  // (a quotaState alone is enough to enable). Switches `target` to the
  // configured fallback when remaining quota for the chosen target is
  // below quotaFloor (default 10%).
  if (options.quotaState && target) {
    const { quotaRemaining } = require("./mizan-shim") as typeof import("./mizan-shim")
    const [provider, ...modelParts] = target.split("/")
    const model = modelParts.join("/")
    if (provider && model) {
      const remaining = quotaRemaining(options.quotaState, provider as never, model)
      const floor = options.quotaFloor ?? 0.1
      if (remaining < floor) {
        const fallback = options.quotaFallbacks?.[target]
        if (fallback) {
          ruleSuffix += ` [quota: ${target} at ${(remaining * 100).toFixed(0)}% — falling back to ${fallback}]`
          target = fallback
        } else {
          ruleSuffix += ` [quota: ${target} at ${(remaining * 100).toFixed(0)}% (no fallback configured)]`
        }
      }
    }
  }

  // M3.54 — Rule E: stewardship of inquiry (atom 0022). Evaluate worthiness
  // BEFORE dispatching. When score < threshold, return a declined decision
  // with a structured proposal; caller surfaces it instead of dispatching.
  // Disabled when threshold is undefined OR explicitly 0; non-zero opts in.
  let declined = false
  let decline_reason: "stewardship" | "knowability" | undefined
  let decline_proposal: string | undefined
  let expected_value: number | undefined
  let clarifying_questions: string[] | undefined
  let blockers: string[] | undefined
  let knowability_score: number | undefined
  if (typeof options.stewardshipThreshold === "number" && options.stewardshipThreshold > 0) {
    const inputText = typeof input === "string" ? input : ""
    if (inputText) {
      const { promptValueOfInquiry } = require("./mizan-shim") as typeof import("./mizan-shim")
      const verdict = promptValueOfInquiry({
        prompt: inputText,
        recentReceipts: options.recentReceipts,
        shape: cls.shape,
      })
      expected_value = verdict.score
      if (verdict.score < options.stewardshipThreshold) {
        declined = true
        decline_reason = "stewardship"
        decline_proposal = verdict.proposal ?? "Low value-of-inquiry; substrate proposes deferring this dispatch."
        ruleSuffix += ` [stewardship: value=${verdict.score.toFixed(2)} < ${options.stewardshipThreshold} → DECLINE]`
      } else {
        ruleSuffix += ` [stewardship: value=${verdict.score.toFixed(2)} ≥ ${options.stewardshipThreshold} → dispatch]`
      }
    }
  }

  // M3.55 — Rule F: knowability-gate (atom 0024). Evaluate ANSWERABILITY
  // (orthogonal to atom 0022's value-of-inquiry). When the question is
  // underspecified / requires private knowledge / contested-attestation /
  // missing-referent / personal-recall / context-exhausted, decline with
  // structured clarifying-questions or reorientation proposal.
  // Fires AFTER stewardship-gate (no point checking answerability of a
  // dispatch we already declined as low-value).
  if (
    !declined &&
    typeof options.knowabilityThreshold === "number" &&
    options.knowabilityThreshold > 0
  ) {
    const inputText = typeof input === "string" ? input : ""
    if (inputText) {
      const { promptAnswerability } = require("./mizan-shim") as typeof import("./mizan-shim")
      const verdict = promptAnswerability({
        prompt: inputText,
        recentReceipts: options.recentReceipts,
        contextDepthEstimate: options.contextDepthEstimate,
      })
      knowability_score = verdict.score
      if (verdict.score < options.knowabilityThreshold) {
        declined = true
        decline_reason = "knowability"
        decline_proposal =
          verdict.proposal ??
          (verdict.clarifying_questions.length > 0
            ? "Substrate cannot deduce a confident answer. Clarifying questions below would unblock."
            : "Substrate cannot deduce a confident answer; please reorient or provide more context.")
        clarifying_questions = verdict.clarifying_questions
        blockers = verdict.blockers
        ruleSuffix += ` [knowability: score=${verdict.score.toFixed(2)} < ${options.knowabilityThreshold} → DECLINE-AND-CLARIFY (${verdict.blockers.join(",")})]`
      } else {
        ruleSuffix += ` [knowability: score=${verdict.score.toFixed(2)} ≥ ${options.knowabilityThreshold} → dispatch]`
      }
    }
  }

  // M3.57 — hard-class detection (atom 0011 + atom 0023 + atom 0017
  // composition). When the prompt fires one of the 3 hard-classes from
  // the M3.57 wakil-apr-vs-gpt55 analysis, force voter on the dispatch
  // because these are exactly the classes where single-witness frontier-
  // tier confabulation is most likely. Explicit opt-in via
  // routerOptions.hardClassDetection=true.
  if (
    options.hardClassDetection === true &&
    !declined &&
    typeof input === "string"
  ) {
    const { detectHardClassSignals } = require("./mizan-shim") as typeof import("./mizan-shim")
    const verdict = detectHardClassSignals(input)
    if (verdict.classes.length > 0) {
      hard_classes = verdict.classes
      if (!useVoter && !useCompound) {
        useVoter = true
        ruleSuffix += ` [hard-class: ${verdict.classes.join(",")} → force voter (atom 0023+0017)]`
      } else {
        ruleSuffix += ` [hard-class: ${verdict.classes.join(",")} (voter already on)]`
      }
    }
  }

  return {
    shape: cls.shape,
    signal: cls.signal + (cls.complexity ? ` [complexity=${cls.complexity}]` : ""),
    target_model: useCompound || useVoter || declined ? null : target,
    use_compound: useCompound,
    use_voter: useVoter,
    rule: entry.rule + ruleSuffix,
    evidence_tier: entry.evidence,
    declined,
    decline_reason,
    decline_proposal,
    clarifying_questions,
    blockers,
    expected_value,
    knowability_score,
    hard_classes,
  }
}
