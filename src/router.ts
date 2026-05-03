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
  | "multistep-general"

export interface ClassifierResult {
  shape: TaskShape
  signal: string // which signature triggered the classification (audit trail)
  estimated_input_tokens: number
}

export interface RouteDecision {
  shape: TaskShape
  signal: string
  /** OpenRouter model id to dispatch to, OR null if compound-wrapper invoked. */
  target_model: string | null
  /** True iff the shape's routing rule says compound helps. Default: false. */
  use_compound: boolean
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
    return { shape: "agentic-swe", signal: "swe-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(click|navigate|open.*(file|url|tab)|osworld|browse|screenshot)/.test(lower)) {
    return { shape: "computer-use", signal: "computer-use-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(prove|simplif|integral|derivative|aime|olymp|gcd|lcm|modular|factori[sz]e)/.test(lower)
      || /[∫∑∏√≡≤≥]/.test(text)) {
    return { shape: "math-chain", signal: "math-keywords-or-symbols", estimated_input_tokens: tokens }
  }
  if (/\b(write.*function|implement.*function|refactor|fix.*function|add.*method|unit.*test)/.test(lower)
      && tokens < 4000) {
    return { shape: "bounded-code", signal: "bounded-code-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(classif|categori[sz]e|extract.*entity|label|sentiment|tag)/.test(lower)
      && tokens < 2000) {
    return { shape: "classification", signal: "classification-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(real[- ]?time|streaming|low[- ]?latency|sub[- ]?second|fast.*response)/.test(lower)) {
    return { shape: "subsecond-latency", signal: "latency-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(without.*search|without.*tool|no.*tool.*use|closed[- ]?book|memori[sz]ed.*fact)/.test(lower)) {
    return { shape: "closed-book", signal: "closed-book-keywords", estimated_input_tokens: tokens }
  }
  if (/\b(quantum|graduate|phd|chem|biolog|physic|gpqa|research.*paper)/.test(lower)
      && tokens < 8000) {
    return { shape: "phd-factual", signal: "phd-domain-keywords", estimated_input_tokens: tokens }
  }
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
  { target: (o: RouterOptions) => string; rule: string; evidence: RouteDecision["evidence_tier"]; useCompound?: boolean }
> = {
  "long-context":      { target: (o) => o.longContextTarget,                   rule: "facts/09 rule 1 — DeepSeek V4 / grok-4-fast",     evidence: "L1+L4" },
  "agentic-swe":       { target: () => "anthropic/claude-opus-4",              rule: "facts/09 rule 2 — Opus MCP-Atlas 77.3%",          evidence: "L4" },
  "bounded-code":      { target: () => "anthropic/claude-haiku-4.5",           rule: "facts/09 rule 3 — Haiku SWE-V 73.3% at \$0.80/M", evidence: "L4+operator-L1" },
  "math-chain":        { target: (o) => o.cheapTarget,                          rule: "facts/09 rule 4 — DeepSeek AIME 96% at <\$0.50/M",evidence: "L4" },
  "phd-factual":       { target: () => "google/gemini-2.5-flash",              rule: "facts/09 rule 5 — Gemini Flash GPQA 90.4%",       evidence: "L4" },
  "computer-use":      { target: (o) => o.smartTarget,                          rule: "facts/09 rule 6 — GPT-5-mini OSWorld 72.1%",      evidence: "L4" },
  "classification":    { target: () => "meta-llama/llama-4-scout",             rule: "facts/09 rule 8 — Llama Scout sub-1s P50",        evidence: "L4" },
  "subsecond-latency": { target: () => "google/gemini-2.5-flash",              rule: "facts/09 rule 9 — Gemini Flash 1.06s P50",        evidence: "L4" },
  "closed-book":       { target: () => "anthropic/claude-opus-4",              rule: "facts/09 rule 10 — avoid GPT-5; prefer Opus",     evidence: "L4" },
  "multistep-general": { target: (o) => o.smartTarget,                          rule: "facts/09 rule 7 — strongest frontier, NO compound default (M3.11/M3.11b L1)", evidence: "L1" },
}

export function route(input: unknown, options: RouterOptions): RouteDecision {
  const cls = classifyTaskShape(input)
  const entry = ROUTING_TABLE[cls.shape]
  const override = options.routeOverrides?.[cls.shape]
  const target = override ?? entry.target(options)
  const useCompound =
    cls.shape === "multistep-general" && options.forceCompoundOnMultistep === true
      ? true
      : (entry.useCompound ?? false)
  return {
    shape: cls.shape,
    signal: cls.signal,
    target_model: useCompound ? null : target,
    use_compound: useCompound,
    rule: entry.rule,
    evidence_tier: entry.evidence,
  }
}
