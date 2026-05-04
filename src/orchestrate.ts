/**
 * orchestrate.ts — composed dispatch with all M17 substrate axes (Phase A→C wiring).
 *
 * Single entry point that composes:
 *   - temporal-anchor scaffold (Phase B.1)         [pre-prompt]
 *   - dispatchWithPool / cooldown (Phase A)         [per-call]
 *   - QuotaTracker header parse (Phase C)           [post-response]
 *   - TaskBudget charge + status (Phase C)          [post-response]
 *   - appendDispatchTelemetry JSONL (Phase C)       [post-response]
 *   - probeSycophancy on K% of high-stakes (B.2)    [post-response, optional]
 *
 * Caller-supplied dispatch fn returns the raw response + metadata; the
 * orchestrator threads everything else around it. Designed so the same
 * orchestrator works inside m17-live-dispatch.ts AND inside the runtime
 * cheapcode-tiers provider middleware.
 *
 * Per atom 0007 anti-fab: this layer composes, it doesn't construct LLM
 * clients. The caller's dispatch closes over the SDK client; we observe
 * inputs and outputs.
 */

import { homedir } from "node:os"
import { join } from "node:path"
import type { CredentialPool } from "./credential-pool"
import { dispatchWithPool, type PoolAttribution } from "./dispatch-with-pool"
import { withTemporalAnchor } from "./temporal-anchor"
import { probeSycophancy, shouldProbe, type ProbeResult } from "./sycophancy-probe"
import { loadCanon } from "./canon-loader"
import { buildCanonScaffold, classifyTaskDimensions, selectCanonCards, type InjectionDecision } from "./canon-injector"
import { buildClaimShapeReport } from "./claim-shape"
import {
  QuotaTracker,
  TaskBudget,
  appendDispatchTelemetry,
  type BudgetSnapshot,
} from "./quota-tracker"

export interface OrchestratedDispatchInput {
  authKey: string
  canonical: string
  /** The fully scaffolded prompt (already includes temporal anchor when enabled). */
  prompt: string
  targetModel: string
  /** API key resolved by dispatch-with-pool from auth.json. */
  apiKey: string
}

export interface OrchestratedRawResult {
  text: string
  /** Wall-clock ms — caller must measure. */
  wall_clock_ms: number
  /** Cost estimate in USD — caller must compute (provider-specific pricing). */
  cost_usd_estimate: number
  /** Headers from the upstream response, if any (for QuotaTracker). */
  responseHeaders?: unknown
  tokens_in?: number
  tokens_out?: number
}

export interface OrchestrateOptions {
  pool: CredentialPool
  canonical: string
  /** Stable per-task identifier — used for sycophancy sample-rate gate. */
  dispatchId: string
  /** User prompt; orchestrator prepends temporal anchor when enabled. */
  prompt: string
  targetModel: string
  /** Caller closure that performs the actual LLM call. */
  call: (input: OrchestratedDispatchInput) => Promise<OrchestratedRawResult>
  /** Optional task budget. When status flips to 'reject', orchestrator throws BudgetExhaustedError. */
  budget?: TaskBudget
  /** Shared QuotaTracker (across dispatches in a session). Created if absent. */
  quota?: QuotaTracker
  /** Telemetry path. Default ~/.local/share/cheapcode/dispatch.jsonl. Set to false to disable. */
  telemetryPath?: string | false
  /** Prepend temporal scaffold (default true). */
  temporalAnchor?: boolean
  /** Prepend task-relevant canon scaffold (default false until scorecard earns default). */
  canonInjection?: boolean
  /** Directory containing *.candidates.json or *.verified.json canon shards. */
  canonPlanDir?: string
  /** Token budget for canon scaffold (default 200). */
  canonMaxTokens?: number
  /** Append a local claim-shape summary to the result object. */
  claimShapeVerify?: boolean
  /** Sycophancy probe rate 0..1 (default 0). Set to 0.05 for ~5% sample. */
  sycophancyRate?: number
  /** Override now() for tests. */
  now?: () => Date
  /** Force probe regardless of dispatchId hash (testing). */
  forceProbe?: boolean
  /** Override telemetry rotate threshold (testing). */
  telemetryRotateBytes?: number
  /** Override opencode auth.json path (tests). */
  opencodeAuthPath?: string
}

export interface OrchestratedResult {
  text: string
  wall_clock_ms: number
  cost_usd_estimate: number
  attribution: PoolAttribution
  budget?: BudgetSnapshot
  /** Probe result when sycophancy detection ran. */
  probe?: ProbeResult
  canon?: InjectionDecision
  claim_shape_report?: string
  tokens_in?: number
  tokens_out?: number
}

export class BudgetExhaustedError extends Error {
  constructor(public readonly snapshot: BudgetSnapshot) {
    super(
      `task budget exhausted: ${snapshot.usd_used.toFixed(4)} USD / ${snapshot.ms_used} ms (frac ${snapshot.fraction_used.toFixed(2)})`,
    )
    this.name = "BudgetExhaustedError"
  }
}

const DEFAULT_TELEMETRY_PATH = join(homedir(), ".local", "share", "cheapcode", "dispatch.jsonl")
const DEFAULT_CANON_DIR = join(import.meta.dir, "..", "plan", "canon")

export async function orchestrate(opts: OrchestrateOptions): Promise<OrchestratedResult> {
  // 0. Pre-flight budget gate
  if (opts.budget && opts.budget.status().status === "reject") {
    throw new BudgetExhaustedError(opts.budget.status())
  }

  // 1. Temporal anchor scaffold (Phase B.1)
  const temporalPrompt =
    opts.temporalAnchor === false
      ? opts.prompt
      : await withTemporalAnchor(opts.prompt, { now: opts.now })

  const canonDecision = opts.canonInjection
    ? selectCanonCards(loadCanon(opts.canonPlanDir ?? DEFAULT_CANON_DIR), classifyTaskDimensions(opts.prompt), opts.canonMaxTokens ?? 200)
    : undefined
  const canonScaffold = canonDecision ? buildCanonScaffold(canonDecision) : ""
  const enriched = canonScaffold.length > 0 ? `${canonScaffold}\n\n---\n\n${temporalPrompt}` : temporalPrompt

  // 2. Pool dispatch — credential pick + cooldown wrap (Phase A)
  const quota = opts.quota ?? new QuotaTracker()
  const out = await dispatchWithPool({
    pool: opts.pool,
    canonical: opts.canonical,
    targetModel: opts.targetModel,
    opencodeAuthPath: opts.opencodeAuthPath,
    dispatch: async (poolInput) => {
      const apiKey =
        poolInput.auth.kind === "api-key" ? poolInput.auth.key : poolInput.auth.access
      const raw = await opts.call({
        authKey: poolInput.authKey,
        canonical: poolInput.canonical,
        prompt: enriched,
        targetModel: poolInput.targetModel,
        apiKey,
      })
      // Record quota snapshot from headers (or counter fallback)
      quota.record(poolInput.authKey, raw.responseHeaders)
      return raw
    },
  })

  // 3. Charge budget (Phase C)
  let snap: BudgetSnapshot | undefined
  if (opts.budget) {
    snap = opts.budget.charge(out.result.wall_clock_ms, out.result.cost_usd_estimate)
  }

  // 4. Telemetry append (Phase C)
  if (opts.telemetryPath !== false) {
    const path = opts.telemetryPath ?? DEFAULT_TELEMETRY_PATH
    await appendDispatchTelemetry(
      path,
      {
        ts: new Date().toISOString(),
        auth_key: out.attribution.auth_key,
        canonical: out.attribution.canonical_provider,
        target_model: out.attribution.target_model,
        wall_clock_ms: out.result.wall_clock_ms,
        cost_usd_estimate: out.result.cost_usd_estimate,
        status: snap?.status ?? "no-budget",
        tokens_in: out.result.tokens_in,
        tokens_out: out.result.tokens_out,
      },
      opts.telemetryRotateBytes,
    ).catch(() => undefined) // telemetry never blocks the dispatch
  }

  // 5. Sycophancy probe on sampled high-stakes calls (Phase B.2)
  let probe: ProbeResult | undefined
  const rate = opts.sycophancyRate ?? 0
  const fire = opts.forceProbe || (rate > 0 && shouldProbe(opts.dispatchId, rate))
  if (fire) {
    probe = await probeSycophancy(opts.prompt, {
      dispatch: async (p) => {
        const r = await opts.call({
          authKey: out.attribution.auth_key,
          canonical: out.attribution.canonical_provider,
          prompt: p,
          targetModel: opts.targetModel,
          apiKey: "",
        })
        return r.text
      },
    }).catch(
      // Probe failures should never block the primary dispatch; surface them
      // as a degenerate ProbeResult so callers see "we tried" in the trace.
      (err) =>
        ({
          primary: out.result.text,
          alternate: "",
          divergence: 0,
          stance_flip: false,
          sycophancy_suspected: false,
          mode: "stance-pressure" as const,
          reason: `probe failed: ${(err as Error).message}`,
        } satisfies ProbeResult),
    )
  }

  return {
    text: out.result.text,
    wall_clock_ms: out.result.wall_clock_ms,
    cost_usd_estimate: out.result.cost_usd_estimate,
    attribution: out.attribution,
    budget: snap,
    probe,
    canon: canonDecision,
    claim_shape_report: opts.claimShapeVerify ? buildClaimShapeReport(out.result.text) : undefined,
    tokens_in: out.result.tokens_in,
    tokens_out: out.result.tokens_out,
  }
}
