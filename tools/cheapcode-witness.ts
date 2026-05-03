#!/usr/bin/env bun
/**
 * tools/cheapcode-witness.ts — knowledge-artifact generator (M3.27 v0,
 * M3.28 v1x).
 *
 * v0 (default): wraps cross-witness voter; emits artifact with
 * sahih/hasan/daif grade. Best for AIME-class tasks with extractable
 * integer/short-string answers.
 *
 * v1x (--v1x flag): "panel of experts" pattern for knowledge-synthesis
 * shape. Dispatches 3 PARALLEL witnesses (cheap-a, cheap-b, frontier-d)
 * across DIFFERENT model families, then runs a synthesizer that composes
 * the outputs into a unified artifact noting agreements + disagreements +
 * unique-witness contributions.
 *
 * v1x is the M3.28 lift driven by M3.27 dogfood findings: extractAnswer
 * regex misclassifies knowledge synthesis as daif, and current pool
 * (deepseek + gpt-5-mini) lacks training-data diversity. Synthesizer
 * sidesteps the regex bug; frontier witness adds family diversity.
 *
 * Substrate: per atom 0007, the artifact carries witness traces +
 * synthesizer reasoning so downstream can audit. Per atom 0010, cross-
 * witness disagreement is the load-bearing signal — the synthesizer
 * surfaces it explicitly.
 *
 * Cost (v1x):
 *   - cheap × 2:           ~$0.0002
 *   - frontier (sonnet):   ~$0.01-0.02
 *   - synthesizer (gpt-5-mini): ~$0.01-0.02
 *   - total:               ~$0.04-0.05 per artifact
 *
 * Usage:
 *   bun tools/cheapcode-witness.ts \
 *     --question "..." \
 *     --slug "q1" \
 *     --output runs/m3-27-witness-dogfood/artifacts \
 *     [--v1x] \
 *     [--frontier anthropic/claude-sonnet-4.6] \
 *     [--synthesizer openai/gpt-5-mini]
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { runCrossWitnessVoter } from "../src/cross-witness-voter"
import { CHEAPCODE_TIERS } from "../src/cheapcode-tiers"
import { generateText } from "ai"
import { writeFileSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, arg, i, all) => {
    if (arg.startsWith("--")) {
      const k = arg.slice(2)
      const v = all[i + 1] && !all[i + 1]!.startsWith("--") ? all[i + 1]! : "true"
      acc.push([k, v])
    }
    return acc
  }, []),
)

const question = args.question
const slug = args.slug ?? "artifact"
const outputDir = resolve(args.output ?? "runs/m3-27-witness-dogfood/artifacts")
const perCallTimeoutMs = Number(args.timeout ?? 180_000)
const useV1x = args.v1x === "true"
const frontierId = args.frontier ?? "anthropic/claude-sonnet-4.6"
const synthesizerId = args.synthesizer ?? "openai/gpt-5-mini"

if (!question) {
  console.error("usage: bun tools/cheapcode-witness.ts --question \"...\" --slug \"...\" [--output dir] [--v1x] [--frontier id] [--synthesizer id] [--timeout ms]")
  process.exit(1)
}

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

mkdirSync(outputDir, { recursive: true })

const openrouter = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": useV1x ? "cheapcode-witness-v1x" : "cheapcode-witness",
  },
})

let totalCost = 0
function instrumentedModel(real: any) {
  return {
    ...real,
    async doGenerate(opts: any) {
      const r = await real.doGenerate(opts)
      const cost = Number((r as any).usage?.raw?.cost ?? 0)
      totalCost += cost
      return r
    },
  }
}

const cheap = instrumentedModel(openrouter(CHEAPCODE_TIERS.cheap.target))
const smart = instrumentedModel(openrouter(CHEAPCODE_TIERS.smart.target))

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms),
    ),
  ])
}

// ----------------------------------------------------------------
// v0 path (existing voter)
// ----------------------------------------------------------------

if (!useV1x) {
  console.log(`[cheapcode-witness v0] dispatching (slug=${slug})`)
  console.log(`  cheap=${CHEAPCODE_TIERS.cheap.target}`)
  console.log(`  smart=${CHEAPCODE_TIERS.smart.target}`)
  console.log(`  question: ${question.slice(0, 120)}${question.length > 120 ? "..." : ""}`)
  console.log()

  const t0 = performance.now()
  const result = await runCrossWitnessVoter(question, { cheap, smart, perCallTimeoutMs })
  const latencyMs = performance.now() - t0

  const artifact = {
    version: "v0",
    slug,
    date: new Date().toISOString(),
    question,
    models: {
      cheap: CHEAPCODE_TIERS.cheap.target,
      smart: CHEAPCODE_TIERS.smart.target,
    },
    cost_usd: totalCost,
    latency_ms: latencyMs,
    grade: result.trace.convergence,
    agreed_answer: result.trace.agreed_answer,
    escalated: result.trace.escalated,
    witnesses: result.trace.witnesses,
    text: result.text,
  }

  writeFileSync(`${outputDir}/${slug}.json`, JSON.stringify(artifact, null, 2))
  writeFileSync(`${outputDir}/${slug}.md`, renderV0Md(artifact))

  console.log(`[cheapcode-witness v0] grade=${artifact.grade} cost=$${totalCost.toFixed(5)} latency=${(latencyMs / 1000).toFixed(1)}s`)
  console.log(`  artifact: ${outputDir}/${slug}.json + .md`)
  process.exit(0)
}

// ----------------------------------------------------------------
// v1x path (panel-of-experts + synthesizer)
// ----------------------------------------------------------------

const frontier = instrumentedModel(openrouter(frontierId))
const synthesizer = instrumentedModel(openrouter(synthesizerId))

const PROMPT_A = `Answer the following question carefully and step-by-step. If uncertain about a fact, say so explicitly.\n\n${question}`
const PROMPT_B = `Answer the following question. Double-check each claim against what you know with high confidence; mark anything uncertain.\n\n${question}`
const PROMPT_D = `Answer the following question with full reasoning. Note any places where you are extrapolating vs citing established knowledge.\n\n${question}`

console.log(`[cheapcode-witness v1x] dispatching panel of experts (slug=${slug})`)
console.log(`  cheap-a, cheap-b: ${CHEAPCODE_TIERS.cheap.target}`)
console.log(`  frontier-d:       ${frontierId}`)
console.log(`  synthesizer:      ${synthesizerId}`)
console.log(`  question: ${question.slice(0, 120)}${question.length > 120 ? "..." : ""}`)
console.log()

const t0 = performance.now()

// maxOutputTokens cap to stay under typical OpenRouter API-key per-request
// budgets (some providers default-request 65k+ which exceeds default keys).
// 4000 is plenty for our knowledge-synthesis prose answers.
const MAX_OUTPUT_TOKENS = 4000

const [resA, resB, resD] = await Promise.allSettled([
  withTimeout(generateText({ model: cheap, prompt: PROMPT_A, maxOutputTokens: MAX_OUTPUT_TOKENS }), perCallTimeoutMs, "cheap-a"),
  withTimeout(generateText({ model: cheap, prompt: PROMPT_B, maxOutputTokens: MAX_OUTPUT_TOKENS }), perCallTimeoutMs, "cheap-b"),
  withTimeout(generateText({ model: frontier, prompt: PROMPT_D, maxOutputTokens: MAX_OUTPUT_TOKENS }), perCallTimeoutMs, "frontier-d"),
])

const textA = resA.status === "fulfilled" ? resA.value.text.trim() : `(cheap-a failed: ${(resA.reason as Error)?.message ?? "unknown"})`
const textB = resB.status === "fulfilled" ? resB.value.text.trim() : `(cheap-b failed: ${(resB.reason as Error)?.message ?? "unknown"})`
const textD = resD.status === "fulfilled" ? resD.value.text.trim() : `(frontier-d failed: ${(resD.reason as Error)?.message ?? "unknown"})`

console.log(`  parallel witnesses returned in ${((performance.now() - t0) / 1000).toFixed(1)}s`)

const SYNTHESIZER_PROMPT = `You are a synthesizer reading three independent expert answers to the same question. Your task: produce a SINGLE unified artifact that:

1. Identifies the CONSENSUS — facts/claims all three witnesses agree on. Mark as [CONSENSUS].
2. Identifies DISAGREEMENTS — facts/claims where witnesses contradict each other. Mark each as [DISAGREEMENT: A says X, B says Y, D says Z]. Do NOT silently pick one; surface the disagreement.
3. Identifies UNIQUE CONTRIBUTIONS — important facts/citations only one witness mentioned. Mark as [UNIQUE-A: ...] or [UNIQUE-B: ...] or [UNIQUE-D: ...]. Include them in the synthesis (they may be the witness's training-data advantage).
4. Notes any obvious errors (failed sanity checks, internal contradictions). Mark as [ERROR: ...].
5. Concludes with a confidence summary: which parts are sahih (consensus across all 3), hasan (2 of 3 agree), or daif (no convergence / contradictions).

Be terse. Don't paraphrase witnesses; integrate their specific facts. Use the witness labels (A, B, D) explicitly when surfacing disagreements or unique contributions.

QUESTION:
${question}

WITNESS A (cheap-a, prompt-A "step-by-step"):
${textA}

WITNESS B (cheap-b, prompt-B "double-check"):
${textB}

WITNESS D (frontier-d, prompt-D "with reasoning"):
${textD}

UNIFIED ARTIFACT:`

const synthT0 = performance.now()
let synthText = ""
try {
  const synthResult = await withTimeout(
    generateText({ model: synthesizer, prompt: SYNTHESIZER_PROMPT, maxOutputTokens: MAX_OUTPUT_TOKENS * 2 }),
    perCallTimeoutMs,
    "synthesizer",
  )
  synthText = synthResult.text.trim()
} catch (e) {
  synthText = `(synthesizer failed: ${(e as Error)?.message ?? "unknown"})`
}
const synthLatencyMs = performance.now() - synthT0

const totalLatencyMs = performance.now() - t0

const artifact = {
  version: "v1x",
  slug,
  date: new Date().toISOString(),
  question,
  models: {
    cheap: CHEAPCODE_TIERS.cheap.target,
    frontier: frontierId,
    synthesizer: synthesizerId,
  },
  cost_usd: totalCost,
  latency_ms: totalLatencyMs,
  synth_latency_ms: synthLatencyMs,
  witnesses: [
    { source: "cheap-a", text: textA },
    { source: "cheap-b", text: textB },
    { source: "frontier-d", text: textD },
  ],
  synthesized_artifact: synthText,
}

writeFileSync(`${outputDir}/${slug}.json`, JSON.stringify(artifact, null, 2))
writeFileSync(`${outputDir}/${slug}.md`, renderV1xMd(artifact))

console.log(`[cheapcode-witness v1x] cost=$${totalCost.toFixed(5)} latency=${(totalLatencyMs / 1000).toFixed(1)}s (synth=${(synthLatencyMs / 1000).toFixed(1)}s)`)
console.log(`  artifact: ${outputDir}/${slug}.json + .md`)

// ----------------------------------------------------------------
// renderers
// ----------------------------------------------------------------

function renderV0Md(a: any): string {
  return `# cheapcode-witness artifact — ${a.slug} (v0)

**Date:** ${a.date}
**Grade:** \`${a.grade}\` (mizaj 14: sahih > hasan > daif)
**Cost:** $${a.cost_usd.toFixed(5)} | **Latency:** ${(a.latency_ms / 1000).toFixed(1)}s | **Escalated:** ${a.escalated}

## Question

${a.question}

## Aggregated answer (${a.grade})

${a.agreed_answer != null ? `**Extracted:** \`${a.agreed_answer}\`\n\n` : ""}**Full text:**

${a.text}

## Witness trace

${a.witnesses.map((w: any, i: number) => `### ${i + 1}. \`${w.source}\`\n\n- **Extracted answer:** \`${w.answer ?? "(null — abstain or extraction-failed)"}\`\n- **Tail (last 100 chars):** \`${w.raw_tail.replace(/\n/g, " ⏎ ")}\``).join("\n\n")}
`
}

function renderV1xMd(a: any): string {
  return `# cheapcode-witness artifact — ${a.slug} (v1x panel-of-experts)

**Date:** ${a.date}
**Cost:** $${a.cost_usd.toFixed(5)} | **Latency:** ${(a.latency_ms / 1000).toFixed(1)}s (synth ${(a.synth_latency_ms / 1000).toFixed(1)}s)

## Question

${a.question}

## Synthesized artifact

${a.synthesized_artifact}

## Witness texts (full)

${a.witnesses.map((w: any) => `### \`${w.source}\` (${w.source === "cheap-a" || w.source === "cheap-b" ? a.models.cheap : a.models.frontier})\n\n${w.text}`).join("\n\n---\n\n")}

## Audit

This v1x artifact was produced by the panel-of-experts pattern (M3.28):
3 parallel witnesses across different model families (cheap × 2 from
deepseek family + frontier from anthropic family), then composed via
synthesizer (${a.models.synthesizer}). Per atom 0010, cross-family
witness disagreement IS the load-bearing signal — the synthesizer's
[CONSENSUS] / [DISAGREEMENT] / [UNIQUE-X] / [ERROR] tags surface it
for downstream audit.

The raw witness texts are preserved above so callers can verify the
synthesizer didn't introduce its own claims beyond what witnesses said.
`
}
