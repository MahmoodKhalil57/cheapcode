/**
 * code-witness.ts — substrate variation for cheapcode-fork code generation
 * (M3.32). Adapts the v1x panel-of-experts pattern (M3.28) for code-shape
 * dispatch, producing M18-shaped artifacts by construction.
 *
 * When opencode-via-cheapcode dispatches a code-generation sub-task within
 * an agent loop, runCodeWitness:
 *   1. Cheap × 2 in parallel, each prompted to produce: (a) code, (b) a
 *      one-line burhan-shape claim of what the code does, (c) a minimal
 *      test for the claim — i.e., M18-shaped output by construction.
 *   2. If the two cheap witnesses converge on identical code-text,
 *      return sahih. (atom 0010 cross-witness honesty pipeline.)
 *   3. Else escalate to smart-tier as synthesizer; if synthesizer
 *      produces a unified artifact, return hasan with synthesized output.
 *   4. Else (synthesizer fails), return daif with raw witness traces
 *      so caller can inspect.
 *
 * The downstream caller (opencode agent loop) gets a structured artifact
 * { code, claim, test, grade, witnesses, escalated } — not just code.
 * This makes the substrate's M18 discipline available at runtime, not only
 * at fork-development time.
 *
 * Per atom 0007 (anti-fab via artifact verification), the test field IS
 * the verifier the caller can run on the code. Per mizaj 14, the grade
 * bounds confidence the caller should place in the artifact.
 *
 * Cell-level placement: subset of cell #14 + new cell #22.
 * Cell #22 (code-witness LoC): MIN ≤200 / EXPECTED ≤300 / IDEAL ≤400.
 */

import { generateText } from "ai"

type LanguageModel = any

export interface CodeWitnessConfig {
  cheap: LanguageModel
  smart: LanguageModel
  perCallTimeoutMs?: number
}

export interface CodeWitnessTrace {
  source: "cheap-a" | "cheap-b" | "synthesizer"
  code: string | null
  claim: string | null
  test: string | null
  raw_text: string
}

export interface CodeWitnessArtifact {
  code: string
  claim: string
  test: string
  grade: "sahih" | "hasan" | "daif"
  escalated: boolean
  witnesses: CodeWitnessTrace[]
  /** Synthesizer's composed text when grade=hasan; otherwise empty. */
  synthesized: string
}

const PROMPT_A = `Implement the following spec. Output strictly in this shape:

\`\`\`<lang>
<code>
\`\`\`
CLAIM: <one-line burhan-shape claim of what the code does>
TEST: <one-line minimal test that would falsify the claim>

Spec:`

const PROMPT_B = `Implement the following spec carefully, double-checking edge cases. Output strictly in this shape:

\`\`\`<lang>
<code>
\`\`\`
CLAIM: <one-line burhan-shape claim of what the code does>
TEST: <one-line minimal test that would falsify the claim>

Spec:`

const SYNTHESIZER_PROMPT_PREFIX = `Two independent witnesses produced different implementations of the same spec. Synthesize a unified version. Output strictly:

\`\`\`<lang>
<code>
\`\`\`
CLAIM: <one-line claim>
TEST: <one-line test>

If the two witnesses substantially agree, pick the cleaner implementation and merge their claim/test if helpful. If they fundamentally disagree, prefer the more conservative (better-tested) implementation. Note any unresolved disagreement on a final \`NOTE:\` line.

Spec:`

const DEFAULT_CODE_WITNESS_TIMEOUT_MS = 60_000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`code-witness-timeout: ${label} exceeded ${ms}ms`)), ms)
  })
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

/**
 * Pull the first fenced code block out of a witness response. Returns the
 * code body without the fence markers or language tag. Returns null when no
 * fence is present.
 */
export function extractCodeBlock(text: string): string | null {
  const fenceMatch = text.match(/```[a-zA-Z0-9_+-]*\n([\s\S]*?)```/m)
  if (!fenceMatch || !fenceMatch[1]) return null
  return fenceMatch[1].trim()
}

function extractTaggedLine(text: string, tag: string): string | null {
  const re = new RegExp(`^\\s*${tag}\\s*:\\s*(.+)$`, "m")
  const m = text.match(re)
  return m ? m[1]!.trim() : null
}

function parseWitnessTrace(
  source: CodeWitnessTrace["source"],
  raw: string,
): CodeWitnessTrace {
  return {
    source,
    code: extractCodeBlock(raw),
    claim: extractTaggedLine(raw, "CLAIM"),
    test: extractTaggedLine(raw, "TEST"),
    raw_text: raw,
  }
}

function normalizeCode(code: string | null): string {
  if (code == null) return ""
  return code.replace(/\s+/g, " ").trim()
}

export async function runCodeWitness(
  spec: string,
  config: CodeWitnessConfig,
): Promise<CodeWitnessArtifact> {
  const timeoutMs = config.perCallTimeoutMs ?? DEFAULT_CODE_WITNESS_TIMEOUT_MS

  // Step 1: parallel cheap × 2 with prompt-induced independence
  const [resA, resB] = await Promise.allSettled([
    withTimeout(generateText({ model: config.cheap, prompt: `${PROMPT_A}\n${spec}` }), timeoutMs, "cheap-a"),
    withTimeout(generateText({ model: config.cheap, prompt: `${PROMPT_B}\n${spec}` }), timeoutMs, "cheap-b"),
  ])

  const textA = resA.status === "fulfilled" ? resA.value.text.trim() : `(cheap-a failed: ${(resA.reason as Error)?.message ?? "unknown"})`
  const textB = resB.status === "fulfilled" ? resB.value.text.trim() : `(cheap-b failed: ${(resB.reason as Error)?.message ?? "unknown"})`

  const traceA = parseWitnessTrace("cheap-a", textA)
  const traceB = parseWitnessTrace("cheap-b", textB)

  const codeA_norm = normalizeCode(traceA.code)
  const codeB_norm = normalizeCode(traceB.code)

  // Step 2: convergence check on cheap pair (atom 0010)
  if (codeA_norm.length > 0 && codeA_norm === codeB_norm) {
    return {
      code: traceA.code!,
      claim: traceA.claim ?? "",
      test: traceA.test ?? "",
      grade: "sahih",
      escalated: false,
      witnesses: [traceA, traceB],
      synthesized: "",
    }
  }

  // Step 3: escalate to smart synthesizer
  let synthText = ""
  let synthFailed = false
  try {
    const synthPrompt = `${SYNTHESIZER_PROMPT_PREFIX}\n${spec}\n\n--- WITNESS A ---\n${textA}\n\n--- WITNESS B ---\n${textB}`
    const synthResult = await withTimeout(
      generateText({ model: config.smart, prompt: synthPrompt }),
      timeoutMs,
      "synthesizer",
    )
    synthText = synthResult.text.trim()
  } catch (e) {
    synthText = `(synthesizer failed: ${(e as Error)?.message ?? "unknown"})`
    synthFailed = true
  }

  const traceS = parseWitnessTrace("synthesizer", synthText)

  if (!synthFailed && traceS.code != null) {
    return {
      code: traceS.code,
      claim: traceS.claim ?? "",
      test: traceS.test ?? "",
      grade: "hasan",
      escalated: true,
      witnesses: [traceA, traceB, traceS],
      synthesized: synthText,
    }
  }

  // Step 4: daif — neither convergence nor synthesis. Return the strongest
  // single witness so caller has SOMETHING to inspect, with grade=daif so
  // they know to discount.
  const fallback = traceA.code != null ? traceA : traceB.code != null ? traceB : null
  return {
    code: fallback?.code ?? "",
    claim: fallback?.claim ?? "",
    test: fallback?.test ?? "",
    grade: "daif",
    escalated: true,
    witnesses: [traceA, traceB, traceS],
    synthesized: synthText,
  }
}
