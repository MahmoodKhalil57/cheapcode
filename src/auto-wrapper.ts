/**
 * auto-wrapper.ts — Phase 2 Arm A implementation (M3.10).
 *
 * Per SPEC Revision 2026-05-02d + 2026-05-03j: cheapcode's `auto` tier
 * is a structured-reasoning wrapper that calls multiple OpenRouter models
 * internally to beat raw single-frontier on the 3-axis dominance test
 * (cheaper, faster, smarter on TB-multistep slice).
 *
 * Pipeline (Arm A — substrate-runtime-verifier deferred to v1.x per Arm B):
 *   1. Plan-decompose      (1× smart-tier call)        gpt-5-mini
 *   2. Parallel leaves     (N× cheap-tier calls)        deepseek-v4-flash
 *   3. Best-of-K=3 synth   (3× smart-tier samples)      gpt-5-mini
 *   4. Cross-model verify  (1× different frontier)      claude-opus or gemini
 *   5. Retry-with-feedback (≤1× synthesis re-attempt)   gpt-5-mini
 *
 * Architecture: per M3.2 source-read of opencode v1.14.33, this ships as
 * a custom LanguageModelV3 inside @cheapcode/ai-sdk-provider — opencode
 * treats the returned model as a black box and calls doGenerate / doStream
 * directly (no upstream patches).
 *
 * Cell #18 budget per SPEC Revision 2026-05-03j: ≤350 LoC MIN.
 *
 * NOT IMPLEMENTED in MIN tier (per cell #18 budget):
 *   - Long-context detection (>128k → grok-4-fast direct, no wrapper)
 *   - Adaptive K based on task difficulty
 *   - Tool-augmented retrieval inside leaves
 *   - Substrate verifier pass between best-of-K and cross-model (Arm B,
 *     deferred per M3.2 retrospective + M3.9)
 */

import { generateText } from "ai"
import { route, type RouterOptions, type RouteDecision } from "./router"

// Use loose typing for LanguageModelV3 — exact interface varies by AI SDK
// version. Runtime behavior is the contract that matters; opencode calls
// doGenerate / doStream and consumes the standard response shape.
type LanguageModel = any
type GenerateOptions = any
type GenerateResult = any
type StreamResult = any

// ============================================================
// Wrapper configuration
// ============================================================

export interface AutoWrapperConfig {
  /** Smart-tier model — used for plan-decompose + best-of-K synthesis. */
  smart: LanguageModel
  /** Cheap-tier model — used for parallel leaf execution. */
  cheap: LanguageModel
  /**
   * Cross-model verifier — must be a DIFFERENT frontier model than `smart`
   * (per atom 0010 cross-witness honesty pipeline). E.g. if smart is
   * gpt-5-mini, verifier should be claude-opus or gemini-pro.
   */
  verifier: LanguageModel
  /** Best-of-K sample count. Default 3 per SPEC Revision 2026-05-02d. */
  k?: number
  /** Max retry-with-feedback rounds. Default 1 per SPEC. */
  maxRetries?: number
  /**
   * Per-call timeout in milliseconds. M3.17 production-reliability fix:
   * any single sub-call (plan, leaf, synthesis, verify, retry) that
   * exceeds this deadline is rejected with a timeout error rather than
   * blocking the entire pipeline. Default 180_000 (3 minutes); operator
   * can tune via cheapcode.toml.
   *
   * Background: M3.13 (AIME experiment-3) hung 50+ min on 2024-I-11 when
   * one sub-call blocked indefinitely. Atom 0015 firing — research-grounded
   * compound architectures don't ship with production reliability without
   * this guard. Per atom 0008 runtime-anchored claim-shape: any sub-call
   * timing out fires a structured error that the wrapper handles cleanly.
   */
  perCallTimeoutMs?: number
}

const DEFAULT_PER_CALL_TIMEOUT_MS = 180_000

/**
 * Wrap any promise with a deadline. Rejects with a labeled error if the
 * deadline expires before the promise resolves. The label identifies
 * which pipeline stage timed out, so wrapper trace can record it.
 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`cheapcode-wrapper-timeout: ${label} exceeded ${ms}ms`))
    }, ms)
  })
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

export interface WrapperTrace {
  plan: string[]
  leafResults: string[]
  syntheses: string[]
  selectedIndex: number
  verifierVerdict: VerifierVerdict
  retried: boolean
  totalCalls: number
}

interface VerifierVerdict {
  passed: boolean
  feedback?: string
}

// ============================================================
// Compound-logic helpers
// ============================================================

const PLAN_PROMPT = `Decompose the following task into 2-5 numbered execution steps.
Each step should be self-contained and executable. Output ONLY the numbered list,
no preamble. Format:
1. <step>
2. <step>
...

Task:`

const LEAF_PROMPT = `Execute the following step concisely. Output only what the step
asks for, no commentary.

Step:`

const SYNTHESIS_PROMPT = `Given the original task, the planned steps, and per-step
results, produce the final answer to the task. Be concise and direct.

Task:
{TASK}

Steps:
{PLAN}

Per-step results:
{LEAVES}

Final answer:`

const VERIFIER_PROMPT = `You are a strict verifier. Given a task and a candidate answer,
decide whether the answer correctly addresses the task. Output exactly one of:
  PASS — if the answer is correct and complete
  FAIL: <one-sentence reason> — if the answer is wrong or missing key information

Task:
{TASK}

Candidate answer:
{ANSWER}

Verdict:`

const RETRY_PROMPT = `Your previous answer was rejected by the verifier with this feedback:
{FEEDBACK}

Original task:
{TASK}

Planned steps:
{PLAN}

Per-step results:
{LEAVES}

Previous (rejected) answer:
{PREVIOUS}

Produce an improved answer that addresses the verifier's feedback:`

async function planDecompose(
  task: string,
  smart: LanguageModel,
  timeoutMs: number,
): Promise<string[]> {
  const result = await withTimeout(
    generateText({ model: smart, prompt: `${PLAN_PROMPT}\n${task}` }),
    timeoutMs,
    "plan-decompose",
  )
  return result.text
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => /^(\d+[.)]|[-*])\s+/.test(l))
    .map((l: string) => l.replace(/^(\d+[.)]|[-*])\s+/, ""))
}

async function executeLeaf(
  step: string,
  cheap: LanguageModel,
  timeoutMs: number,
  index: number,
): Promise<string> {
  const result = await withTimeout(
    generateText({ model: cheap, prompt: `${LEAF_PROMPT}\n${step}` }),
    timeoutMs,
    `leaf-${index}`,
  )
  return result.text.trim()
}

async function synthesize(
  task: string,
  plan: string[],
  leaves: string[],
  smart: LanguageModel,
  timeoutMs: number,
  index: number,
): Promise<string> {
  const planStr = plan.map((s, i) => `${i + 1}. ${s}`).join("\n")
  const leavesStr = leaves
    .map((r, i) => `Step ${i + 1} result:\n${r}`)
    .join("\n\n")
  const prompt = SYNTHESIS_PROMPT
    .replace("{TASK}", task)
    .replace("{PLAN}", planStr)
    .replace("{LEAVES}", leavesStr)
  const result = await withTimeout(
    generateText({ model: smart, prompt }),
    timeoutMs,
    `synthesis-${index}`,
  )
  return result.text.trim()
}

function selectBestSynthesis(syntheses: string[]): number {
  // MIN-tier heuristic: longest non-empty output. EXPECTED tier replaces
  // with verifier-scored selection.
  let bestIdx = 0
  let bestLen = 0
  for (let i = 0; i < syntheses.length; i++) {
    const len = syntheses[i]?.length ?? 0
    if (len > bestLen) {
      bestLen = len
      bestIdx = i
    }
  }
  return bestIdx
}

async function crossModelVerify(
  task: string,
  candidate: string,
  verifier: LanguageModel,
  timeoutMs: number,
): Promise<VerifierVerdict> {
  const prompt = VERIFIER_PROMPT
    .replace("{TASK}", task)
    .replace("{ANSWER}", candidate)
  const result = await withTimeout(
    generateText({ model: verifier, prompt }),
    timeoutMs,
    "cross-model-verify",
  )
  const verdict = result.text.trim()
  if (/^PASS\b/i.test(verdict)) {
    return { passed: true }
  }
  const failMatch = verdict.match(/^FAIL[:\s-]+(.+)$/is)
  return {
    passed: false,
    feedback: failMatch?.[1]?.trim() ?? verdict,
  }
}

async function retryWithFeedback(
  task: string,
  plan: string[],
  leaves: string[],
  previous: string,
  feedback: string,
  smart: LanguageModel,
  timeoutMs: number,
): Promise<string> {
  const planStr = plan.map((s, i) => `${i + 1}. ${s}`).join("\n")
  const leavesStr = leaves
    .map((r, i) => `Step ${i + 1} result:\n${r}`)
    .join("\n\n")
  const prompt = RETRY_PROMPT
    .replace("{FEEDBACK}", feedback)
    .replace("{TASK}", task)
    .replace("{PLAN}", planStr)
    .replace("{LEAVES}", leavesStr)
    .replace("{PREVIOUS}", previous)
  const result = await withTimeout(
    generateText({ model: smart, prompt }),
    timeoutMs,
    "retry-with-feedback",
  )
  return result.text.trim()
}

// ============================================================
// Main pipeline
// ============================================================

export async function runAutoWrapper(
  task: string,
  config: AutoWrapperConfig,
): Promise<{ text: string; trace: WrapperTrace }> {
  let totalCalls = 0
  const k = config.k ?? 3
  const maxRetries = config.maxRetries ?? 1
  const timeoutMs = config.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS

  // Step 1: Plan-decompose
  const plan = await planDecompose(task, config.smart, timeoutMs)
  totalCalls += 1

  // Step 2: Parallel leaves. Use Promise.allSettled so a single hung leaf
  // doesn't block the others — surviving leaves still feed synthesis.
  // M3.13 surfaced this failure mode; M3.17 hardens against it.
  let leafResults: string[] = []
  if (plan.length > 0) {
    const settled = await Promise.allSettled(
      plan.map((step, i) => executeLeaf(step, config.cheap, timeoutMs, i)),
    )
    leafResults = settled.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : `(leaf ${i} failed: ${(r.reason as Error)?.message ?? "unknown"})`,
    )
    totalCalls += plan.length
  }

  // Step 3: Best-of-K=3 synthesis at smart tier (Promise.allSettled too —
  // if one synthesis sample times out, surviving samples still vote).
  const synthSettled = await Promise.allSettled(
    Array.from({ length: k }).map((_, i) =>
      synthesize(task, plan, leafResults, config.smart, timeoutMs, i),
    ),
  )
  const syntheses = synthSettled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value)
  totalCalls += k

  // If ALL syntheses timed out, the wrapper has nothing to return —
  // bubble up the structured error rather than emit empty text.
  if (syntheses.length === 0) {
    throw new Error(
      `cheapcode-wrapper: all ${k} synthesis samples timed out (per-call ${timeoutMs}ms)`,
    )
  }

  const selectedIndex = selectBestSynthesis(syntheses)
  let candidate = syntheses[selectedIndex] ?? ""

  // Step 4: Cross-model verifier (best-effort; if verifier itself times out,
  // we ship the candidate as-is rather than blocking the response).
  let verdict: VerifierVerdict
  try {
    verdict = await crossModelVerify(task, candidate, config.verifier, timeoutMs)
    totalCalls += 1
  } catch (e) {
    verdict = {
      passed: true, // optimistic: skip retry if verifier itself is unreachable
      feedback: `verifier-skipped: ${(e as Error)?.message ?? "unknown"}`,
    }
  }
  let retried = false

  // Step 5: Retry-with-feedback if verifier disagreed (and verifier was reachable)
  if (!verdict.passed && maxRetries > 0 && !verdict.feedback?.startsWith("verifier-skipped")) {
    try {
      candidate = await retryWithFeedback(
        task,
        plan,
        leafResults,
        candidate,
        verdict.feedback ?? "",
        config.smart,
        timeoutMs,
      )
      totalCalls += 1
      verdict = await crossModelVerify(task, candidate, config.verifier, timeoutMs)
      totalCalls += 1
      retried = true
    } catch (e) {
      // retry timed out — keep the original candidate
      retried = true
    }
  }

  return {
    text: candidate,
    trace: {
      plan,
      leafResults,
      syntheses,
      selectedIndex,
      verifierVerdict: verdict,
      retried,
      totalCalls,
    },
  }
}

// ============================================================
// LanguageModelV3 adapter — what opencode actually loads
// ============================================================

/**
 * Adapter: presents the compound wrapper as a LanguageModelV3 so opencode
 * loads it transparently via the @cheapcode/ai-sdk-provider package.
 *
 * Per M3.2 source-read of opencode v1.14.33: opencode calls
 * `model.doGenerate(options)` and `model.doStream(options)` directly.
 * The wrapper extracts the prompt, runs compound logic, returns standard
 * response shape. Streaming is approximated as a single chunk for MIN
 * tier (cell #18 budget); EXPECTED tier could implement progressive
 * streaming by emitting plan + leaf-progress + synthesis stages.
 */
/**
 * RouterAdapter — looks up an OpenRouter LanguageModelV3 by id at runtime.
 * Used by CheapcodeAutoModel to dispatch to the route() target_model
 * when the routing rule says no compound (the M3.12 default).
 */
export type RouterAdapter = (orModelId: string) => LanguageModel

export class CheapcodeAutoModel {
  readonly specificationVersion = "v3"
  readonly provider = "cheapcode"
  readonly modelId = "auto"

  constructor(
    private config: AutoWrapperConfig,
    private routerOptions: RouterOptions,
    private adapter: RouterAdapter,
  ) {}

  async doGenerate(options: GenerateOptions): Promise<GenerateResult> {
    const task = extractPrompt(options.prompt ?? options.messages ?? options)
    const decision = route(task, this.routerOptions)

    // Direct dispatch path (M3.12 default): hand the task to the routed
    // model unchanged. This is what avoids the M3.11/M3.11b cost+latency
    // overhead.
    if (!decision.use_compound && decision.target_model) {
      const directModel = this.adapter(decision.target_model)
      const direct = await generateText({ model: directModel, prompt: task })
      return {
        content: [{ type: "text", text: direct.text }],
        finishReason: (direct as any).finishReason ?? "stop",
        usage: (direct as any).usage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        providerMetadata: {
          cheapcode: {
            route: {
              shape: decision.shape,
              signal: decision.signal,
              target_model: decision.target_model,
              rule: decision.rule,
              evidence_tier: decision.evidence_tier,
              compound: false,
            },
          },
        },
        warnings: [],
      }
    }

    // Compound dispatch path (conditional): only fires when the routing
    // rule says compound helps. As of M3.12 SPEC Rev 2026-05-03k, no
    // routing rule defaults to compound — operator must opt-in via
    // RouterOptions.forceCompoundOnMultistep.
    const { text, trace } = await runAutoWrapper(task, this.config)
    return {
      content: [{ type: "text", text }],
      finishReason: "stop",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      providerMetadata: {
        cheapcode: {
          route: {
            shape: decision.shape,
            signal: decision.signal,
            rule: decision.rule,
            evidence_tier: decision.evidence_tier,
            compound: true,
          },
          trace: {
            planSteps: trace.plan.length,
            leafCount: trace.leafResults.length,
            kSamples: trace.syntheses.length,
            verifierPassed: trace.verifierVerdict.passed,
            retried: trace.retried,
            totalCalls: trace.totalCalls,
          },
        },
      },
      warnings: [],
    }
  }

  async doStream(options: GenerateOptions): Promise<StreamResult> {
    const result = await this.doGenerate(options)
    const textChunk = result.content?.[0]?.text ?? ""
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-delta", id: "0", delta: textChunk })
          controller.enqueue({
            type: "finish",
            finishReason: result.finishReason,
            usage: result.usage,
            providerMetadata: result.providerMetadata,
          })
          controller.close()
        },
      }),
    }
  }
}

function extractPrompt(input: unknown): string {
  if (typeof input === "string") return input
  if (Array.isArray(input)) {
    return input
      .map((m) => {
        const content = (m as { content?: unknown })?.content
        if (typeof content === "string") return content
        if (Array.isArray(content)) {
          return content
            .map((p) => (p as { text?: string })?.text ?? "")
            .filter(Boolean)
            .join("\n")
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  if (input && typeof input === "object" && "prompt" in input) {
    return extractPrompt((input as { prompt: unknown }).prompt)
  }
  return ""
}
