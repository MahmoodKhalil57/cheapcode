/**
 * cross-witness-voter.ts — substrate-runtime dispatch for hard-reasoning
 * tasks (M3.18). Operationalizes Khazīna atom 0016's runtime interpretation
 * on the benchmark that fits substrate's strength: chain-of-reasoning
 * consistency where multiple model outputs can be witnessed in parallel.
 *
 * Pipeline:
 *   1. parallel: cheap_A(task) + cheap_B(task) — two blinded witnesses
 *      (different prompts encourage prompt-induced independence even
 *      with same model id; per atom 0010 cross-witness honesty pipeline)
 *   2. extract structured answer (integer for AIME, regex/parser for others)
 *   3. if answers converge → return with sahih grade
 *   4. else escalate to smart-tier as third witness; majority-vote
 *   5. if 2-of-3 agree → return with hasan grade
 *   6. else 3-way disagreement → return smart-tier output with daif flag
 *
 * Per atom 0008 runtime-anchored claim-shape: every response carries the
 * confidence grade + witness votes in providerMetadata so downstream can
 * audit the routing decision.
 *
 * Per mizaj 11/14: source-tier ladder applied at runtime.
 *   - sahih (cross-witness convergence on cheap × 2)
 *   - hasan (majority of 3 witnesses including escalation)
 *   - daif (3-way disagreement; lowest confidence)
 *
 * Cell-level placement: subset of cell #14 + new cell #21.
 * Cell #21 (cross-witness-voter LoC): MIN ≤120 / EXPECTED ≤200 / IDEAL ≤300.
 */

import { generateText } from "ai"

type LanguageModel = any
type GenerateOptions = any

export interface VoterConfig {
  /** Cheap-tier model — both witnesses use same model with different prompts. */
  cheap: LanguageModel
  /** Smart-tier model — third witness when cheap pair diverges. */
  smart: LanguageModel
  /** Per-call timeout (defaults to 60s — cheaper / faster than compound's 180s). */
  perCallTimeoutMs?: number
}

export interface VoterTrace {
  witnesses: Array<{ source: "cheap-a" | "cheap-b" | "smart-c"; answer: string | null; raw_tail: string }>
  convergence: "sahih" | "hasan" | "daif" | "none"
  agreed_answer: string | null
  escalated: boolean
}

const DEFAULT_VOTER_TIMEOUT_MS = 60_000

const PROMPT_A = `Solve the following task step by step. After your reasoning, on the FINAL line output exactly: "Answer: <value>".

Task:`

const PROMPT_B = `Solve the following task carefully. Double-check each step. After your reasoning, on the FINAL line output exactly: "Answer: <value>".

Task:`

const PROMPT_C = `Two prior solvers disagreed on this task. Solve it independently, showing brief reasoning. On the FINAL line output exactly: "Answer: <value>".

Task:`

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`cross-witness-voter-timeout: ${label} exceeded ${ms}ms`)),
      ms,
    )
  })
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/**
 * Extract the answer from a model output. Tolerant of multiple formats:
 *   "Answer: 42"
 *   "answer = 42"
 *   "\boxed{42}"
 *   trailing integer / number
 */
export function extractAnswer(text: string): string | null {
  const m1 = text.match(/answer\s*[:=]\s*([^\n]+?)\s*$/im)
  if (m1) return normalize(m1[1])
  const m2 = text.match(/\\?boxed\s*\{?\s*([^}\n]+?)\s*\}?\s*$/im)
  if (m2) return normalize(m2[1])
  // Trailing integer (last 200 chars)
  const tail = text.slice(-200)
  const trailing = [...tail.matchAll(/\b(-?\d+(?:\.\d+)?)\b/g)]
  if (trailing.length > 0) return normalize(trailing[trailing.length - 1][1])
  return null
}

function normalize(s: string): string {
  return s.trim().replace(/[.,;:!?]+$/, "").replace(/\s+/g, " ").trim()
}

export async function runCrossWitnessVoter(
  task: string,
  config: VoterConfig,
): Promise<{ text: string; trace: VoterTrace }> {
  const timeoutMs = config.perCallTimeoutMs ?? DEFAULT_VOTER_TIMEOUT_MS

  // Step 1: parallel cheap pair (use Promise.allSettled — single failure
  // can't block the other; M3.17 lesson applied)
  const [resA, resB] = await Promise.allSettled([
    withTimeout(generateText({ model: config.cheap, prompt: `${PROMPT_A}\n${task}` }), timeoutMs, "cheap-a"),
    withTimeout(generateText({ model: config.cheap, prompt: `${PROMPT_B}\n${task}` }), timeoutMs, "cheap-b"),
  ])

  const textA = resA.status === "fulfilled" ? resA.value.text.trim() : `(cheap-a failed: ${(resA.reason as Error)?.message ?? "unknown"})`
  const textB = resB.status === "fulfilled" ? resB.value.text.trim() : `(cheap-b failed: ${(resB.reason as Error)?.message ?? "unknown"})`

  const ansA = resA.status === "fulfilled" ? extractAnswer(textA) : null
  const ansB = resB.status === "fulfilled" ? extractAnswer(textB) : null

  const witnesses: VoterTrace["witnesses"] = [
    { source: "cheap-a", answer: ansA, raw_tail: textA.slice(-100) },
    { source: "cheap-b", answer: ansB, raw_tail: textB.slice(-100) },
  ]

  // Step 2: convergence check on cheap pair
  if (ansA != null && ansB != null && ansA === ansB) {
    return {
      text: textA, // both agreed; return the first witness's full reasoning
      trace: {
        witnesses,
        convergence: "sahih",
        agreed_answer: ansA,
        escalated: false,
      },
    }
  }

  // Step 3: escalate to smart-tier as third witness
  let textC = ""
  let ansC: string | null = null
  try {
    const resC = await withTimeout(
      generateText({ model: config.smart, prompt: `${PROMPT_C}\n${task}` }),
      timeoutMs,
      "smart-c",
    )
    textC = resC.text.trim()
    ansC = extractAnswer(textC)
  } catch (e) {
    textC = `(smart-c failed: ${(e as Error)?.message ?? "unknown"})`
  }
  witnesses.push({ source: "smart-c", answer: ansC, raw_tail: textC.slice(-100) })

  // Step 4: majority vote among 3 (or 2 if smart failed)
  const votes: Record<string, number> = {}
  for (const w of witnesses) {
    if (w.answer != null) votes[w.answer] = (votes[w.answer] ?? 0) + 1
  }
  const sortedVotes = Object.entries(votes).sort((a, b) => b[1] - a[1])
  const top = sortedVotes[0]

  if (top && top[1] >= 2) {
    // Find the witness text that matches the majority answer
    const winner = witnesses.find((w) => w.answer === top[0])
    const winnerText = winner?.source === "smart-c" ? textC : winner?.source === "cheap-b" ? textB : textA
    return {
      text: winnerText,
      trace: {
        witnesses,
        convergence: "hasan",
        agreed_answer: top[0],
        escalated: true,
      },
    }
  }

  // Step 5a (M3.24, mizaj 17 + atom 0017): single-witness rescue.
  // When exactly one witness produced an answer and the others abstained
  // (returned null due to extraction failure or timeout), return that
  // witness's answer with daif grade. Information content is strictly
  // greater than null-with-daif — the caller can use the daif grade to
  // de-prioritize, but at least has a candidate answer to inspect.
  // Discovered via M17 cycle on M3.19 results.jsonl: AIME-I-11 had
  // cheap-b="371" (gold) but pipeline returned null because cheap-a and
  // smart-c both abstained.
  const numWithAnswer = witnesses.filter((w) => w.answer != null).length
  if (numWithAnswer === 1) {
    const witness = witnesses.find((w) => w.answer != null)!
    const witnessText =
      witness.source === "smart-c" ? textC : witness.source === "cheap-b" ? textB : textA
    return {
      text: witnessText,
      trace: {
        witnesses,
        convergence: "daif",
        agreed_answer: witness.answer,
        escalated: true,
      },
    }
  }

  // Step 5b: 3-way disagreement OR all witnesses abstained → daif flag,
  // ship smart-c output as the strongest single witness, agreed_answer null.
  return {
    text: textC || textA || textB,
    trace: {
      witnesses,
      convergence: "daif",
      agreed_answer: null,
      escalated: true,
    },
  }
}

// ============================================================
// LanguageModelV3 adapter — what opencode loads when shape is hard-reasoning
// ============================================================

export class CrossWitnessVoterModel {
  readonly specificationVersion = "v3"
  readonly provider = "cheapcode"
  readonly modelId = "auto-cross-witness"

  constructor(private config: VoterConfig) {}

  async doGenerate(options: GenerateOptions) {
    const task = extractPromptText(options.prompt ?? options.messages ?? options)
    const { text, trace } = await runCrossWitnessVoter(task, this.config)
    return {
      content: [{ type: "text", text }],
      finishReason: "stop",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      providerMetadata: {
        cheapcode: {
          dispatch: "cross-witness-voter",
          convergence: trace.convergence,
          agreed_answer: trace.agreed_answer,
          escalated: trace.escalated,
          witness_count: trace.witnesses.length,
          witnesses: trace.witnesses.map((w) => ({ source: w.source, answer: w.answer })),
        },
      },
      warnings: [],
    }
  }

  async doStream(options: GenerateOptions) {
    const result = await this.doGenerate(options)
    const chunk = result.content?.[0]?.text ?? ""
    return {
      stream: new ReadableStream({
        start(c) {
          c.enqueue({ type: "text-delta", id: "0", delta: chunk })
          c.enqueue({
            type: "finish",
            finishReason: result.finishReason,
            usage: result.usage,
            providerMetadata: result.providerMetadata,
          })
          c.close()
        },
      }),
    }
  }
}

function extractPromptText(input: unknown): string {
  if (typeof input === "string") return input
  if (Array.isArray(input)) {
    return input
      .map((m) => {
        const c = (m as { content?: unknown })?.content
        if (typeof c === "string") return c
        if (Array.isArray(c)) return c.map((p) => (p as { text?: string })?.text ?? "").join("\n")
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  if (input && typeof input === "object" && "prompt" in input) {
    return extractPromptText((input as { prompt: unknown }).prompt)
  }
  return ""
}
