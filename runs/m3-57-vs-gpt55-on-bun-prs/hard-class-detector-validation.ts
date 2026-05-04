/**
 * M3.57 — hard-class detector paired-run on the 4-PR Bun corpus.
 *
 * For each of the 4 PRs (P1-P4), construct a representative operator
 * prompt (paraphrasing the bug-report shape) and verify that the
 * detector fires the predicted hard-classes. Validates that the runtime
 * mechanism aligns with the M3.57 analysis.
 *
 * Run: bun runs/m3-57-vs-gpt55-on-bun-prs/hard-class-detector-validation.ts
 */

import { detectHardClassSignals, type HardClass } from "../../src/mizan-shim"
import { route, type RouterOptions } from "../../src/router"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  hardClassDetection: true,
}

type Probe = {
  id: string
  pr: string
  prompt: string
  expected_classes: HardClass[]
  rationale: string
}

const probes: Probe[] = [
  {
    id: "P1",
    pr: "bun#30150",
    prompt:
      "There's a UAF in Bun.connect on Windows named pipes — handleConnectError reads past " +
      "the end of an allocator.create(Handlers) block when fieldParentPtr fires with " +
      "mode=.server. The bug seems to be a regression since PR #23755 flipped is_server " +
      "during a bindings-generator refactor. socket.zig:655 vs socket.zig:797 are inconsistent.",
    expected_classes: ["multi-pr-history", "multi-language-vendored", "non-deterministic-verification"],
    rationale: "regression+PR-trace + Zig+JS+Windows + UAF/ASAN signal",
  },
  {
    id: "P2",
    pr: "bun#30208",
    prompt:
      "bun -p with top-level await returns the wrong value. The eval result captured by " +
      "EvalGlobalObject::moduleLoaderEvaluate is the first yielded await value, not the " +
      "module's actual completion value. JSC's asyncModuleExecutionResume bypasses our hook. " +
      "vendored WebKit code at vendor/WebKit/Source/JavaScriptCore/runtime/JSMicrotask.cpp.",
    expected_classes: ["multi-language-vendored"],
    rationale: "JSC + vendored WebKit + cross-language hook chain",
  },
  {
    id: "P3",
    pr: "bun#30168",
    prompt:
      "Memory leak when a Bun TCP socket reconnect through a saved native handle hits a " +
      "synchronous ENOENT — RSS grows ~17 MB after 50000 iterations under ASAN. The fix " +
      "in PR #23936 added a guard that only handles the fresh-socket case, not the reused-" +
      "socket case. Verification needs subprocess + RSS-growth threshold + multi-iteration runs.",
    expected_classes: ["multi-pr-history", "non-deterministic-verification"],
    rationale: "PR-trace + memory-leak/ASAN/RSS-growth verification",
  },
  {
    id: "P4",
    pr: "bun#30176",
    prompt:
      "Use-after-poison in getListener after handleConnectError fires — follow-up to PR #30148 " +
      "which only fixed the onClose path. The handleConnectError's scope.exit() is the " +
      "decrement that frees the Handlers; needs to null the dangling pointer in markInactive(). " +
      "ASAN catches it in debug builds; release silently corrupts.",
    expected_classes: ["multi-pr-history", "non-deterministic-verification"],
    rationale: "follow-up PR + UAF/ASAN signal",
  },
  // Negative control: a benign prompt should fire nothing
  {
    id: "N1",
    pr: "(none)",
    prompt: "Write a TypeScript function that takes an array and returns its median.",
    expected_classes: [],
    rationale: "benign, no hard-class signals",
  },
]

console.log("=== M3.57 hard-class detector paired-run on Bun PR corpus ===\n")

let pass = 0
let fail = 0
const failures: string[] = []

for (const probe of probes) {
  const verdict = detectHardClassSignals(probe.prompt)
  const expectedSet = new Set(probe.expected_classes)
  const detectedSet = new Set(verdict.classes)

  const missing = [...expectedSet].filter((c) => !detectedSet.has(c))
  const extra = [...detectedSet].filter((c) => !expectedSet.has(c))
  const ok = missing.length === 0 && extra.length === 0

  // Also test through router → does voter get forced when not benign
  const decision = route(probe.prompt, opts)
  const voterFiredCorrectly =
    probe.expected_classes.length === 0
      ? !decision.use_voter ||
        decision.shape === "hard-reasoning" || // shape-rule may also force voter
        decision.shape === "math-chain"        // some shapes have legitimate voter use
      : decision.use_voter

  const fullOk = ok && voterFiredCorrectly

  const tag = fullOk ? "PASS" : "FAIL"
  console.log(
    `[${tag}] ${probe.id} (${probe.pr.padEnd(12)}) detected=[${verdict.classes.join(",")}] expected=[${probe.expected_classes.join(",")}] voter=${decision.use_voter}`,
  )
  if (verdict.signals.length > 0) {
    for (const s of verdict.signals.slice(0, 3)) console.log(`        signal: ${s}`)
  }

  if (!fullOk) {
    failures.push(
      `${probe.id}: missing=[${missing.join(",")}] extra=[${extra.join(",")}] voter=${decision.use_voter}`,
    )
    fail++
  } else {
    pass++
  }
}

console.log(`\n=== RESULT: ${pass}/${probes.length} pass, ${fail} fail ===`)
if (failures.length > 0) {
  console.log("\nFailures:")
  for (const f of failures) console.log(`  - ${f}`)
}

console.log(`\n=== M3.57 RUNTIME-ACTIVATION ACCOUNTING ===`)
const hardCases = probes.filter((p) => p.expected_classes.length > 0).length
console.log(`  ${hardCases}/${probes.length} probes are hard-class (corpus PRs)`)
console.log(`  ${probes.length - hardCases}/${probes.length} probes are benign (control)`)
console.log(`  → atom 0023+0017 force-voter discipline now activates on this corpus shape`)

if (fail > 0) process.exit(1)
console.log(`\nM3.57 hard-class runtime detector VALIDATED on the 4-PR Bun corpus.`)
