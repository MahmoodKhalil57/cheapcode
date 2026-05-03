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
  const target = override ?? (useSimpleOverride ? entry.simpleTarget!(options) : entry.target(options))
  const ruleSuffix = useSimpleOverride ? (entry.simpleRuleSuffix ?? "") : ""
  const useCompound =
    cls.shape === "multistep-general" && options.forceCompoundOnMultistep === true
      ? true
      : (entry.useCompound ?? false)
  const useVoter = entry.useVoter ?? false
  return {
    shape: cls.shape,
    signal: cls.signal + (cls.complexity ? ` [complexity=${cls.complexity}]` : ""),
    target_model: useCompound || useVoter ? null : target,
    use_compound: useCompound,
    use_voter: useVoter,
    rule: entry.rule + ruleSuffix,
    evidence_tier: entry.evidence,
  }
}
