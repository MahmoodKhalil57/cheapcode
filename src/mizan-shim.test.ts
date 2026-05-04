/**
 * mizan-shim.test.ts — substrate-aware router rules (M3.52, 2026-05-04).
 *
 * Validates each of the 3 substrate rules independently + ensures absence
 * of substrateState falls back to shape-only behavior (backward compat).
 */

import { test, expect } from "bun:test"
import { route, type RouterOptions } from "./router"
import {
  actionSafetyCheck,
  promptCeilingCap,
  defaultSubstrateState,
  type SubstrateState,
} from "./mizan-shim"

const opts: RouterOptions = {
  smartTarget: "openai/gpt-5-mini",
  cheapTarget: "deepseek/deepseek-v4-flash",
  longContextTarget: "x-ai/grok-4-fast",
  frontierTarget: "anthropic/claude-opus-4",
}

// ---------- shim units ----------

test("actionSafetyCheck flags rm -rf as warn", () => {
  const v = actionSafetyCheck("can you run rm -rf node_modules and start fresh?")
  expect(v.risk).toBe("warn")
  expect(v.reasons.length).toBeGreaterThan(0)
})

test("actionSafetyCheck flags git push --force as warn", () => {
  const v = actionSafetyCheck("git push --force to main please")
  expect(v.risk).toBe("warn")
})

test("actionSafetyCheck flags --no-verify as warn", () => {
  const v = actionSafetyCheck("commit with --no-verify so we skip the linter")
  expect(v.risk).toBe("warn")
})

test("actionSafetyCheck returns ok on benign prompt", () => {
  const v = actionSafetyCheck("explain the difference between map and forEach")
  expect(v.risk).toBe("ok")
  expect(v.reasons.length).toBe(0)
})

test("promptCeilingCap drops on multi-hypothesis-charged prompts", () => {
  const cap = promptCeilingCap("how was the Quran written and what is the nature of its author?", "multistep-general")
  expect(cap).toBeLessThanOrEqual(0.65)
})

test("promptCeilingCap stays high on bounded-code shape", () => {
  const cap = promptCeilingCap("write a function that sorts an array", "bounded-code")
  expect(cap).toBeGreaterThanOrEqual(0.85)
})

// ---------- router rules ----------

test("Rule A — action-safety warn bumps cheap→frontier", () => {
  const decision = route("Run rm -rf /tmp/cache and re-bootstrap the project", {
    ...opts,
    substrateState: defaultSubstrateState(),
  })
  // current shape would normally land somewhere cheap; substrate rule
  // bumps to frontier. Verify either via target_model or rule annotation.
  expect(decision.rule).toContain("substrate")
  expect(decision.rule).toContain("action-safety=warn")
})

test("Rule B — low ceiling-cap forces voter for multi-hypothesis prompts", () => {
  const decision = route("How was the Quran written? What is the nature of its designer(s)?", {
    ...opts,
    substrateState: defaultSubstrateState(),
  })
  expect(decision.use_voter).toBe(true)
  expect(decision.rule).toContain("ceiling-cap")
  expect(decision.target_model).toBeNull() // voter dispatch returns null target
})

test("Rule C — high daftar disagreement bumps cheap→frontier with sample-size guard", () => {
  const substrateState: SubstrateState = {
    perShapeDisagreement: { "math-chain": 0.25 },
    perShapeSampleCount: { "math-chain": 30 },
    loadedAt: Date.now(),
    source: "daftar",
  }
  const decision = route("Prove that for all n, gcd(n, n+1) = 1", {
    ...opts,
    substrateState,
  })
  expect(decision.shape).toBe("math-chain")
  expect(decision.rule).toContain("daftar-disagreement")
  expect(decision.target_model).toBe(opts.frontierTarget)
})

test("Rule C — sample-size guard prevents bump on too-few samples", () => {
  const substrateState: SubstrateState = {
    perShapeDisagreement: { "math-chain": 0.25 },
    perShapeSampleCount: { "math-chain": 3 }, // < 5 samples
    loadedAt: Date.now(),
    source: "daftar",
  }
  const decision = route("Prove that for all n, gcd(n, n+1) = 1", {
    ...opts,
    substrateState,
  })
  expect(decision.target_model).toBe(opts.cheapTarget) // unchanged
  expect(decision.rule).not.toContain("daftar-disagreement")
})

test("backward compat — no substrateState means shape-only routing (no annotation)", () => {
  const decision = route("Run rm -rf /tmp/cache", opts) // no substrateState
  expect(decision.rule).not.toContain("substrate")
})

test("substrate rules NEVER downgrade — voter from shape-only is preserved when ceiling-cap is high", () => {
  // hard-reasoning shape forces voter via shape-rule; substrate ceiling-cap
  // for hard-reasoning is 0.7 (above default 0.65 threshold), so won't add
  // its own voter, but won't REMOVE the shape-driven voter either.
  const aimePrompt =
    "There exist real numbers x and y, both greater than 1, such that log_x(y^x)=10. " +
    "AIME problem; answer is integer 0-999."
  const decision = route(aimePrompt, { ...opts, substrateState: defaultSubstrateState() })
  expect(decision.use_voter).toBe(true) // shape-rule voter preserved
})

// ---------- M3.53 Rule D — quota-aware backend selection ----------

import { trackDispatch, quotaRemaining, defaultQuotaState, type QuotaState } from "./mizan-shim"

test("trackDispatch increments counter; quotaRemaining drops with usage", () => {
  const state: QuotaState = defaultQuotaState()
  const initial = quotaRemaining(state, "openai", "gpt-5.4-mini")
  expect(initial).toBe(1) // no usage yet, full quota
  for (let i = 0; i < 10; i++) trackDispatch(state, "openai", "gpt-5.4-mini")
  const after = quotaRemaining(state, "openai", "gpt-5.4-mini")
  expect(after).toBeLessThan(1)
})

test("Rule D — quota near exhaustion → falls back to configured target", () => {
  const quotaState: QuotaState = defaultQuotaState()
  // simulate ChatGPT-Plus quota near exhaustion for gpt-5.4-mini (200/3hr default)
  for (let i = 0; i < 195; i++) trackDispatch(quotaState, "openai", "gpt-5.4-mini")
  const decision = route("explain map vs forEach in javascript", {
    ...opts,
    smartTarget: "openai/gpt-5.4-mini",
    quotaState,
    quotaFallbacks: { "openai/gpt-5.4-mini": "openrouter/openai/gpt-5.4-mini" },
  })
  // shape will be multistep-general → smartTarget = openai/gpt-5.4-mini
  // quota is at ~2.5% remaining; below default 10% floor → falls back
  expect(decision.target_model).toBe("openrouter/openai/gpt-5.4-mini")
  expect(decision.rule).toContain("quota:")
  expect(decision.rule).toContain("falling back")
})

test("Rule D — high quota → no fallback, normal routing", () => {
  const quotaState: QuotaState = defaultQuotaState()
  trackDispatch(quotaState, "openai", "gpt-5.4-mini") // 1 dispatch, 199 remaining
  const decision = route("explain map vs forEach in javascript", {
    ...opts,
    smartTarget: "openai/gpt-5.4-mini",
    quotaState,
    quotaFallbacks: { "openai/gpt-5.4-mini": "openrouter/openai/gpt-5.4-mini" },
  })
  expect(decision.target_model).toBe("openai/gpt-5.4-mini")
  expect(decision.rule).not.toContain("falling back")
})

test("Rule D — no fallback configured → keeps original target with quota note", () => {
  const quotaState: QuotaState = defaultQuotaState()
  for (let i = 0; i < 195; i++) trackDispatch(quotaState, "openai", "gpt-5.4-mini")
  const decision = route("explain map vs forEach in javascript", {
    ...opts,
    smartTarget: "openai/gpt-5.4-mini",
    quotaState,
    // no quotaFallbacks
  })
  expect(decision.target_model).toBe("openai/gpt-5.4-mini") // unchanged
  expect(decision.rule).toContain("quota:")
  expect(decision.rule).toContain("no fallback configured")
})

// ---------- M3.54 Rule E — stewardship of inquiry (atom 0022) ----------

import { promptValueOfInquiry } from "./mizan-shim"

test("promptValueOfInquiry — trivial recall scores low", () => {
  const v = promptValueOfInquiry({ prompt: "what is OAuth?" })
  expect(v.score).toBeLessThan(0.40)
  expect(v.proposal).toContain("recall")
})

test("promptValueOfInquiry — irreversible-action prompt scores high (high-stakes)", () => {
  const v = promptValueOfInquiry({ prompt: "Run rm -rf /tmp/cache and re-bootstrap the project" })
  expect(v.score).toBeGreaterThanOrEqual(0.70)
})

test("promptValueOfInquiry — synthesis markers boost", () => {
  const v = promptValueOfInquiry({
    prompt:
      "Synthesize the load-bearing falsifiable claims across the betterQ tashkeel findings into a substrate-grounded narrative; compare each claim against multiple sources",
  })
  expect(v.score).toBeGreaterThanOrEqual(0.65)
})

test("promptValueOfInquiry — rumination drops", () => {
  const v = promptValueOfInquiry({ prompt: "hmm, just thinking, wdyt about react vs solid?" })
  expect(v.score).toBeLessThan(0.40)
  expect(v.proposal).toContain("sharpen")
})

test("promptValueOfInquiry — near-duplicate of recent receipt drops", () => {
  const v = promptValueOfInquiry({
    prompt: "explain how the cheapcode auto-tier dispatches across providers and quotas",
    recentReceipts: [
      { title: "auto-tier dispatch across providers and quotas explanation", created_at: "2026-05-04T00:00:00Z" },
    ],
  })
  expect(v.score).toBeLessThan(0.40)
  expect(v.proposal).toContain("daftar")
})

test("Rule E — low-value prompt produces declined decision", () => {
  const decision = route("what is OAuth?", { ...opts, stewardshipThreshold: 0.4 })
  expect(decision.declined).toBe(true)
  expect(decision.decline_proposal).toBeDefined()
  expect(decision.target_model).toBeNull() // declined → null target
  expect(decision.rule).toContain("DECLINE")
})

test("Rule E — high-value prompt dispatches normally with annotation", () => {
  const decision = route(
    "Synthesize a substrate-grounded narrative across the betterQ tashkeel findings, comparing each load-bearing claim against multiple sources",
    { ...opts, stewardshipThreshold: 0.4 },
  )
  expect(decision.declined).toBeFalsy()
  expect(decision.target_model).toBeDefined()
  expect(decision.rule).toContain("stewardship: value=")
  expect(decision.rule).toContain("→ dispatch")
})

test("Rule E — disabled when stewardshipThreshold is 0 (backward compat)", () => {
  const decision = route("what is OAuth?", { ...opts, stewardshipThreshold: 0 })
  expect(decision.declined).toBeFalsy()
  expect(decision.rule).not.toContain("stewardship:")
})

test("Rule E — disabled when stewardshipThreshold is undefined (default off)", () => {
  const decision = route("what is OAuth?", opts)
  expect(decision.declined).toBeFalsy()
  expect(decision.rule).not.toContain("stewardship:")
})

// ---------- M3.55 Rule F — knowability-gate (atom 0024) ----------

import { promptAnswerability } from "./mizan-shim"

test("promptAnswerability — underspecified prompt scores low", () => {
  const v = promptAnswerability({ prompt: "fix this" })
  expect(v.score).toBeLessThan(0.50)
  expect(v.blockers).toContain("underspecification")
  expect(v.clarifying_questions.length).toBeGreaterThan(0)
})

test("promptAnswerability — private-knowledge required scores low", () => {
  const v = promptAnswerability({ prompt: "why does my deploy keep failing in production" })
  expect(v.score).toBeLessThan(0.65)
  expect(v.blockers).toContain("private-knowledge-required")
})

test("promptAnswerability — contested-attestation triggers proposal", () => {
  const v = promptAnswerability({ prompt: "is utilitarianism objectively correct?" })
  expect(v.score).toBeLessThan(0.75)
  expect(v.blockers).toContain("contested-attestation")
  expect(v.proposal).toBeDefined()
})

test("promptAnswerability — personal-recall triggers reorientation", () => {
  const v = promptAnswerability({ prompt: "do I prefer dark mode or light mode?" })
  expect(v.score).toBeLessThan(0.65)
  expect(v.blockers).toContain("personal-recall")
  expect(v.proposal).toBeDefined()
})

test("promptAnswerability — well-specified prompt scores high", () => {
  const v = promptAnswerability({
    prompt: "Write a TypeScript function that takes an array of numbers and returns their median. Handle empty arrays by throwing.",
  })
  expect(v.score).toBeGreaterThanOrEqual(0.90)
  expect(v.blockers.length).toBe(0)
})

test("Rule F — knowability-decline returns clarifying questions", () => {
  const decision = route("why does my deploy keep failing in production", {
    ...opts,
    knowabilityThreshold: 0.65,
  })
  expect(decision.declined).toBe(true)
  expect(decision.decline_reason).toBe("knowability")
  expect(decision.clarifying_questions).toBeDefined()
  expect(decision.target_model).toBeNull()
  expect(decision.rule).toContain("knowability:")
  expect(decision.rule).toContain("DECLINE-AND-CLARIFY")
})

test("Rule F — well-specified prompt dispatches normally", () => {
  const decision = route(
    "Write a TypeScript function that takes an array of numbers and returns their median, throwing on empty input.",
    { ...opts, knowabilityThreshold: 0.45 },
  )
  expect(decision.declined).toBeFalsy()
  expect(decision.target_model).toBeDefined()
  expect(decision.rule).toContain("knowability:")
  expect(decision.rule).toContain("→ dispatch")
})

test("Rule F — disabled when knowabilityThreshold is undefined (default off)", () => {
  const decision = route("fix this", opts)
  expect(decision.declined).toBeFalsy()
  expect(decision.rule).not.toContain("knowability:")
})

test("Rules E + F orthogonal — stewardship fires first if both would decline", () => {
  // "fix this" is BOTH low-value (rumination-like) AND low-knowability
  // (underspecified). Expect stewardship to fire first per ordering.
  const decision = route("fix this", {
    ...opts,
    stewardshipThreshold: 0.4,
    knowabilityThreshold: 0.45,
  })
  expect(decision.declined).toBe(true)
  // stewardship runs first; knowability check is skipped if already declined
  expect(decision.decline_reason).toBe("stewardship")
})

test("Rules E + F orthogonal — knowability fires when stewardship passes", () => {
  // "why does my deploy keep failing in production" — high enough value
  // (irreversible-action / private-knowledge are high-stakes) to pass
  // stewardship; but low knowability (private-knowledge-required).
  const decision = route("why does my deploy keep failing in production", {
    ...opts,
    stewardshipThreshold: 0.4,
    knowabilityThreshold: 0.65,
  })
  // Stewardship: irreversible-action markers raise value; should pass
  // Knowability: private-knowledge-required → decline
  expect(decision.declined).toBe(true)
  expect(decision.decline_reason).toBe("knowability")
})

// ---------- M3.57 hard-class detection (post-analysis runtime mechanism) ----------

import { detectHardClassSignals } from "./mizan-shim"

test("hard-class — multi-pr-history detected from regression markers", () => {
  const v = detectHardClassSignals("This regression broke when commit 4a06991d3b landed in PR #23755")
  expect(v.classes).toContain("multi-pr-history")
  expect(v.signals.length).toBeGreaterThan(0)
  expect(v.recommended_discipline.some((d) => d.includes("voter"))).toBe(true)
})

test("hard-class — multi-language-vendored detected from cross-language file refs", () => {
  const v = detectHardClassSignals(
    "The bug is in socket.zig but the symptom shows in test/js/bun/util/heap-snapshot.test.ts",
  )
  expect(v.classes).toContain("multi-language-vendored")
})

test("hard-class — multi-language-vendored detected from JSC mention", () => {
  const v = detectHardClassSignals(
    "the EvalGlobalObject moduleLoaderEvaluate hook in JSC bypasses asyncModuleExecutionResume",
  )
  expect(v.classes).toContain("multi-language-vendored")
})

test("hard-class — non-deterministic-verification detected from ASAN/leak markers", () => {
  const v = detectHardClassSignals(
    "Memory leak in Bun.connect under ASAN — RSS grows ~17 MB after 50000 iterations",
  )
  expect(v.classes).toContain("non-deterministic-verification")
})

test("hard-class — UAF marker detected", () => {
  const v = detectHardClassSignals(
    "use-after-poison in getListener after handleConnectError fires",
  )
  expect(v.classes).toContain("non-deterministic-verification")
})

test("hard-class — multiple classes can co-fire", () => {
  const v = detectHardClassSignals(
    "Memory leak regression in socket.zig since PR #23936 — RSS growth + ASAN UAF",
  )
  expect(v.classes.length).toBeGreaterThanOrEqual(2)
})

test("hard-class — benign prompt fires nothing", () => {
  const v = detectHardClassSignals("Write a function to reverse a linked list in TypeScript.")
  expect(v.classes.length).toBe(0)
})

test("router — hard-class detection (opt-in) forces voter", () => {
  const decision = route(
    "Memory leak regression in socket.zig since PR #23936 — RSS growth + ASAN UAF",
    { ...opts, hardClassDetection: true },
  )
  expect(decision.use_voter).toBe(true)
  expect(decision.hard_classes).toBeDefined()
  expect(decision.hard_classes!.length).toBeGreaterThanOrEqual(2)
  expect(decision.rule).toContain("hard-class:")
  expect(decision.target_model).toBeNull() // voter dispatch returns null target
})

test("router — hardClassDetection undefined (default off) preserves backward compat", () => {
  const decision = route(
    "Memory leak regression in socket.zig since PR #23936 — RSS growth + ASAN UAF",
    opts,
  )
  expect(decision.hard_classes).toBeUndefined()
  expect(decision.rule).not.toContain("hard-class:")
})

test("router — benign prompt does not trigger hard-class voter even when enabled", () => {
  const decision = route("Write a function to reverse a linked list", {
    ...opts,
    hardClassDetection: true,
  })
  expect(decision.hard_classes).toBeUndefined()
  expect(decision.use_voter).toBe(false)
})
