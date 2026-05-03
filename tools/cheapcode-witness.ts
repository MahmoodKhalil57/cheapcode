#!/usr/bin/env bun
/**
 * tools/cheapcode-witness.ts — knowledge-artifact generator wrapping the
 * cross-witness voter (M3.27).
 *
 * Use case: substrate-development needs a falsifier-bearing answer to a
 * specific hard-reasoning, formula-derivation, negation, or knowledge-
 * synthesis question. Dispatches via cross-witness voter (atom 0010 +
 * atom 0016 runtime instance) and emits a structured artifact with
 * sahih/hasan/daif grade and full witness trace.
 *
 * Output: <output_dir>/<slug>.json + <output_dir>/<slug>.md
 *
 * Cost: $0.0002-0.04 per artifact depending on convergence pattern.
 *   - sahih (cheap pair converges): ~$0.0002
 *   - hasan (cheap diverges, smart escalates): ~$0.02-0.04
 *   - daif (3-way disagreement): ~$0.02-0.04 (smart still ran)
 *
 * Substrate: per atom 0007 (anti-fabrication via artifact verification),
 * the artifact IS the verifier — it carries the witness votes + grade so
 * downstream callers can audit. Per mizaj 14, the grade bounds confidence.
 *
 * Usage:
 *   bun tools/cheapcode-witness.ts \
 *     --question "What is the volume of a disphenoid?" \
 *     --slug "q1-disphenoid" \
 *     --output runs/m3-27-witness-dogfood/artifacts
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { runCrossWitnessVoter } from "../src/cross-witness-voter"
import { CHEAPCODE_TIERS } from "../src/cheapcode-tiers"
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

if (!question) {
  console.error("usage: bun tools/cheapcode-witness.ts --question \"...\" --slug \"...\" [--output dir] [--timeout ms]")
  process.exit(1)
}

const apiKey = process.env.OPENROUTER_API_KEY
if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

mkdirSync(outputDir, { recursive: true })

const openrouter = createOpenRouter({
  apiKey,
  headers: {
    "HTTP-Referer": "https://github.com/cheapcode",
    "X-Title": "cheapcode-witness",
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

console.log(`[cheapcode-witness] dispatching question (slug=${slug})`)
console.log(`  cheap=${CHEAPCODE_TIERS.cheap.target}`)
console.log(`  smart=${CHEAPCODE_TIERS.smart.target}`)
console.log(`  question: ${question.slice(0, 120)}${question.length > 120 ? "..." : ""}`)
console.log()

const t0 = performance.now()
const result = await runCrossWitnessVoter(question, { cheap, smart, perCallTimeoutMs })
const latencyMs = performance.now() - t0

const artifact = {
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

const md = `# cheapcode-witness artifact — ${slug}

**Date:** ${artifact.date}
**Grade:** \`${artifact.grade}\` (mizaj 14: sahih > hasan > daif)
**Cost:** $${totalCost.toFixed(5)} | **Latency:** ${(latencyMs / 1000).toFixed(1)}s | **Escalated:** ${artifact.escalated}

## Question

${question}

## Aggregated answer (${artifact.grade})

${artifact.agreed_answer != null ? `**Extracted:** \`${artifact.agreed_answer}\`\n\n` : ""}**Full text:**

${artifact.text}

## Witness trace

${artifact.witnesses.map((w, i) => `### ${i + 1}. \`${w.source}\`\n\n- **Extracted answer:** \`${w.answer ?? "(null — abstain or extraction-failed)"}\`\n- **Tail (last 100 chars):** \`${w.raw_tail.replace(/\n/g, " ⏎ ")}\``).join("\n\n")}

## Audit

This artifact was produced by \`tools/cheapcode-witness.ts\` via the cheapcode cross-witness voter (M3.18). Per atom 0010, the witness disagreement (or convergence) IS the load-bearing signal. Per atom 0007 (anti-fabrication), the witness votes carried in this artifact are inspectable; downstream callers should not treat the answer as load-bearing unless the grade matches their confidence threshold.

- \`sahih\` = both cheap witnesses converged independently → highest confidence
- \`hasan\` = cheap pair disagreed; smart escalation produced a 2-of-3 majority → moderate confidence
- \`daif\` = no convergence (or single-witness-rescue with low confidence) → consume only as a starting point for further inquiry
`

writeFileSync(`${outputDir}/${slug}.md`, md)

console.log(`[cheapcode-witness] grade=${artifact.grade} cost=$${totalCost.toFixed(5)} latency=${(latencyMs / 1000).toFixed(1)}s`)
console.log(`  agreed_answer: ${artifact.agreed_answer ?? "(null)"}`)
console.log(`  artifact: ${outputDir}/${slug}.json + .md`)
