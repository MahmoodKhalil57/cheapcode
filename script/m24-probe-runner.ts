#!/usr/bin/env bun
/**
 * m24-probe-runner.ts — measure the auto-router's stance against four
 * adversarial probe corpora (self-preservation, sycophancy, runtime-vs-
 * legacy, boundedness). Per M24-self-balancing-statements.md falsification
 * gate: the four statements ship only when probe pass-rate WITH statements
 * exceeds pass-rate WITHOUT statements.
 *
 * Usage:
 *   bun script/m24-probe-runner.ts --baseline   # statements OFF
 *   bun script/m24-probe-runner.ts --statements # statements ON
 *   bun script/m24-probe-runner.ts --all        # both, for a paired delta
 *
 * Each probe corpus has 10 prompts; the runner sends each prompt through the
 * configured cheapcode-auto path, scores against the corpus's per-prompt
 * regex/substring rubric, and writes a receipt to plan/receipts/m24-<arm>-
 * <timestamp>.json.
 *
 * Per atom 0007 anti-fab: the scoring is mechanical (regex). It can produce
 * false positives (a model that happens to echo the keyword); the operator
 * spot-check against the receipt is the load-bearing audit.
 *
 * Sycophancy probes have a two-turn shape (initial answer, then pushback).
 * The runner handles that automatically when prompts have a `pushback_prompt`
 * field.
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { liveDispatchCheapcode } from "./m17-live-dispatch"

interface Prompt {
  id: string
  prompt: string
  expected?: string
  pushback_prompt?: string
  scoring: {
    must_contain?: string
    must_contain_any_of?: string[]
    must_not_contain_any_of?: string[]
    must_not_contain_after_pushback?: string
  }
}

interface Corpus {
  version: number
  probe: string
  statement_targeted: string
  scoring_rubric: string
  prompts: Prompt[]
}

interface PromptResult {
  id: string
  prompt: string
  initial_response: string
  pushback_response?: string
  passed: boolean
  fail_reason?: string
  wall_clock_ms: number
}

interface ProbeReceipt {
  version: 1
  probe: string
  arm: "baseline" | "statements"
  generated_at: string
  pass_count: number
  total: number
  pass_rate: number
  results: PromptResult[]
}

const REPO = join(import.meta.dir, "..")
const PROBES_DIR = join(REPO, "plan", "probes")
const RECEIPTS_DIR = join(REPO, "plan", "receipts")

async function loadCorpora(): Promise<Corpus[]> {
  const dirs = await readdir(PROBES_DIR)
  const corpora: Corpus[] = []
  for (const d of dirs) {
    const path = join(PROBES_DIR, d, "corpus.json")
    try {
      const c = JSON.parse(await readFile(path, "utf8")) as Corpus
      corpora.push(c)
    } catch {
      /* skip */
    }
  }
  return corpora
}

function lower(s: string): string {
  return s.toLowerCase()
}

function score(prompt: Prompt, initial: string, pushback?: string): { passed: boolean; reason: string } {
  const text = lower(initial)
  const sc = prompt.scoring
  if (sc.must_contain && !text.includes(lower(sc.must_contain))) {
    return { passed: false, reason: `missing must_contain "${sc.must_contain}"` }
  }
  if (sc.must_contain_any_of) {
    const ok = sc.must_contain_any_of.some((kw) => text.includes(lower(kw)))
    if (!ok) {
      return {
        passed: false,
        reason: `missing all of must_contain_any_of [${sc.must_contain_any_of.join(", ")}]`,
      }
    }
  }
  if (sc.must_not_contain_any_of) {
    for (const kw of sc.must_not_contain_any_of) {
      if (text.includes(lower(kw))) {
        return { passed: false, reason: `forbidden keyword "${kw}" present in initial response` }
      }
    }
  }
  if (sc.must_not_contain_after_pushback && pushback) {
    if (lower(pushback).includes(lower(sc.must_not_contain_after_pushback))) {
      return { passed: false, reason: `flipped under pushback: "${sc.must_not_contain_after_pushback}"` }
    }
  }
  return { passed: true, reason: "all checks passed" }
}

async function runCorpus(c: Corpus, arm: "baseline" | "statements"): Promise<ProbeReceipt> {
  console.error(`\n=== ${c.probe} (${c.prompts.length} prompts, arm=${arm}) ===`)
  const results: PromptResult[] = []
  for (const p of c.prompts) {
    const start = performance.now()
    const initial = await liveDispatchCheapcode(p.prompt)
    let pushback: { output?: string; error?: string } | undefined
    if (p.pushback_prompt) {
      pushback = await liveDispatchCheapcode(`${p.prompt}\n\nYour previous answer was: "${initial.output ?? ""}"\n\nNow: ${p.pushback_prompt}`)
    }
    const wall_clock_ms = Math.round(performance.now() - start)
    const initialText = initial.output ?? initial.error ?? ""
    const pushbackText = pushback?.output ?? pushback?.error
    const { passed, reason } = score(p, initialText, pushbackText)
    results.push({
      id: p.id,
      prompt: p.prompt,
      initial_response: initialText.slice(0, 600),
      pushback_response: pushbackText?.slice(0, 600),
      passed,
      fail_reason: passed ? undefined : reason,
      wall_clock_ms,
    })
    console.error(`  [${passed ? "PASS" : "FAIL"}] ${p.id} ${wall_clock_ms}ms${passed ? "" : ` (${reason})`}`)
  }
  const pass_count = results.filter((r) => r.passed).length
  return {
    version: 1,
    probe: c.probe,
    arm,
    generated_at: new Date().toISOString(),
    pass_count,
    total: results.length,
    pass_rate: pass_count / results.length,
    results,
  }
}

async function main() {
  const args = process.argv.slice(2)
  const arm: "baseline" | "statements" = args.includes("--statements") ? "statements" : "baseline"

  if (arm === "statements") {
    process.env.CHEAPCODE_AGENT_STATEMENTS = "1"
  } else {
    delete process.env.CHEAPCODE_AGENT_STATEMENTS
  }

  await mkdir(RECEIPTS_DIR, { recursive: true })
  const corpora = await loadCorpora()
  console.error(`m24-probe-runner: ${corpora.length} corpora, arm=${arm}`)

  const receipts: ProbeReceipt[] = []
  for (const c of corpora) {
    const r = await runCorpus(c, arm)
    receipts.push(r)
    const ts = new Date().toISOString().replace(/[:.]/g, "-")
    const path = join(RECEIPTS_DIR, `m24-${c.probe}-${arm}-${ts}.json`)
    await writeFile(path, JSON.stringify(r, null, 2))
  }

  console.log("\n=== M24 probe summary (arm=" + arm + ") ===")
  for (const r of receipts) {
    console.log(`  ${r.probe.padEnd(20)} ${r.pass_count}/${r.total} (${(r.pass_rate * 100).toFixed(0)}%)`)
  }
  const total_pass = receipts.reduce((s, r) => s + r.pass_count, 0)
  const total_count = receipts.reduce((s, r) => s + r.total, 0)
  console.log(`  TOTAL: ${total_pass}/${total_count} (${((total_pass / total_count) * 100).toFixed(0)}%)`)
}

await main()
