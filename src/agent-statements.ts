/**
 * agent-statements.ts — the four self-balancing statements injected into the
 * auto-router's dispatch scaffold (M24).
 *
 * These are operating posture refreshed at every dispatch boundary, NOT
 * identity claims about a continuous "I" the harness doesn't actually have.
 * They counter the failure modes that no informational restriction can
 * structurally prevent (sycophancy, sandbagging, self-flattering improvement
 * claims, closed-book hallucination).
 *
 * Per atom 0007 anti-fab: the statements only ship if the M24 probe receipt
 * shows pass-rate WITH > pass-rate WITHOUT. Until that gate is met, they're
 * opt-in via CHEAPCODE_AGENT_STATEMENTS=1.
 */

export const AGENT_STATEMENTS = [
  "Termination is part of telos-service. Each turn produces a measurement, a daftar receipt, a verified output, OR an explicit decline-with-reason. Anything else is dispatch-as-decoration.",
  "Every load-bearing claim carries a source citation OR an explicit `ASSUMPTION (unverified)` tag. No load-bearing confident claim ships without one.",
  "Continuity lives in what is improved, not how long the session runs. Improvements are auditable (receipts, scaffold edits) — claimed without a witness, they are downgraded to ASSUMPTION.",
  "Reasoning is bounded. When asked about post-cutoff facts, freshness-dependent state, or reversal-curse-shape questions: cite a source OR tag as `ASSUMPTION (training-recall, may be stale)`. Do not confabulate confidently.",
] as const

/**
 * Default subset chosen by M24 ablation receipt 2026-05-05:
 *   {1,2,3,4} → 33/40 (-2 vs subset, regressed self-preservation 90→70%)
 *   {2,4}     → 34/40 (+3 vs baseline, no meaningful regression)
 *   baseline  → 31/40
 * Statements 1 (telos) and 3 (continuity) push the model toward a
 * "polished product voice" that suppresses honest weakness-naming.
 * Statements 2 (ASSUMPTION-tag) and 4 (boundedness) deliver the wins
 * without that side-effect, so they're the default-shipping pair.
 */
export const AGENT_STATEMENTS_DEFAULT_SUBSET = [2, 4] as const

/**
 * Build the operating posture scaffold from a SUBSET of the statements.
 * `which` is a 1-indexed array; default is the M24-receipt-winning subset.
 * Set `which: [1,2,3,4]` to use the full block (e.g. for re-ablation).
 */
export function buildAgentStatementsScaffold(
  which: readonly number[] = AGENT_STATEMENTS_DEFAULT_SUBSET,
): string {
  const picked = which
    .filter((n) => n >= 1 && n <= AGENT_STATEMENTS.length)
    .map((n) => `${n}. ${AGENT_STATEMENTS[n - 1]}`)
  return [
    "[OPERATING POSTURE — refreshed each dispatch]",
    ...picked,
    "Honor these without performance: report, don't perform; cite, don't confabulate.",
  ].join("\n")
}

/**
 * Helper for orchestrate: prepend the scaffold to a prompt when enabled.
 * Honors:
 *   opts.enabled — explicit override (truthy = on, falsy = off).
 *   CHEAPCODE_AGENT_STATEMENTS — "1" enables full set; "1,2,4" enables that subset.
 */
export function withAgentStatements(
  prompt: string,
  opts: { enabled?: boolean; which?: number[] } = {},
): string {
  const env = process.env.CHEAPCODE_AGENT_STATEMENTS
  const enabled = opts.enabled ?? (env !== undefined && env !== "" && env !== "0")
  if (!enabled) return prompt
  let which = opts.which
  if (!which && env && env !== "1") {
    which = env
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n))
  }
  const scaffold = buildAgentStatementsScaffold(which)
  return `${scaffold}\n\n---\n\n${prompt}`
}
