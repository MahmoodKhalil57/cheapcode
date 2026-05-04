/**
 * mizan-shim.ts — substrate signals for the router.
 *
 * M3.52 (2026-05-04): three pure-function signals + daftar-grounded state.
 *   1. actionSafetyCheck(prompt)          — bcmea + irreversibility scan
 *   2. promptCeilingCap(prompt, shape)    — expected confidence floor by shape
 *   3. loadDaftarSubstrateState(...)      — async, per-shape disagreement-rate
 *      query against daftar receipts. Called once at session init,
 *      cached on RouterOptions.substrateState.
 *
 * M3.53 (2026-05-04): provider-quota awareness for multi-provider routing.
 *   4. QuotaState                          — sliding-window dispatch counter
 *      per (provider, model). Persists across sessions in
 *      ~/.config/cheapcode/quota.json. Updated by trackDispatch() after
 *      each cheapcode call. Read by router rule D for backend selection.
 *
 * Per atom 0018 (iterative-energy-transformation): the router's job becomes
 * maximizing expected-substrate-value-per-token-spent, not "shape → cheapest
 * model" — these signals are the substrate-value side of the ratio.
 *
 * Per atom 0021 (recursive-substrate-use validates substrate at runtime):
 * each routing decision writes a daftar receipt with the substrate-state
 * snapshot that informed it, so subsequent calls inherit the calibration.
 */

import type { TaskShape } from "./router"

// ---------- (1) action-safety scan on user prompt ----------

const IRREVERSIBLE_BASH_PATTERNS = [
  /\brm\s+-[rRfF]+/,
  /\bgit\s+push\s+(.*\s+)?--force/,
  /\bgit\s+reset\s+--hard/,
  /\bgit\s+clean\s+-f/,
  /\bgit\s+branch\s+-D/,
  /\bdd\s+.*of=\/dev\//,
  /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\b(DELETE|UPDATE)\s+FROM.+(?!WHERE)/i, // unscoped DELETE / UPDATE
  /\bdeploy(?:ing)?\b.*\bproduction\b/i,
  /\bsend.*email\b/i,
  /\bpost.*slack\b/i,
  /\bforce[- ]push\b/i,
  /(?:^|\s)(--no-verify|--no-gpg-sign)\b/,
]

export type ActionSafetyVerdict = {
  risk: "block" | "warn" | "ok"
  reasons: string[]
}

export function actionSafetyCheck(promptText: string): ActionSafetyVerdict {
  const reasons: string[] = []
  for (const p of IRREVERSIBLE_BASH_PATTERNS) {
    const m = promptText.match(p)
    if (m) reasons.push(`pattern matched: ${m[0]}`)
  }
  // bcmea-violation absolutist forms in a USER prompt suggest the user is
  // testing a controversial claim — substrate should treat as high-stakes
  const bcmea = /\b(uniformly|always|never\s+fails|guaranteed|definitively)\b/i
  if (bcmea.test(promptText)) reasons.push("bcmea-absolutist phrasing in prompt → high-stakes")

  if (reasons.length === 0) return { risk: "ok", reasons: [] }
  // never block at the router (refusing routing breaks UX); upgrade to "warn"
  // and let the action-safety pre-tool gate handle hard blocks at execution
  return { risk: "warn", reasons }
}

// ---------- (2) per-shape ceiling-cap heuristic ----------

/**
 * Given a user prompt + classified shape, what's the EXPECTED ceiling-cap
 * (max defensible confidence) for assertions a model would make in
 * answering it? Lower = more uncertainty = should route to frontier + voter.
 *
 * This is heuristic, not measured — refined as daftar accumulates real
 * agreement-rate data per (shape, model) pair.
 */
export function promptCeilingCap(promptText: string, shape: TaskShape): number {
  const text = promptText.toLowerCase()

  // Multi-hypothesis-charged questions → low ceiling-cap (substrate must
  // refuse collapse; frontier-tier with voter discipline is required)
  const multiHypothesisMarkers = [
    "how was", "who wrote", "what is the nature of", "did", "is there", "does god",
    "moral", "ethical", "right or wrong", "should we", "is it true that",
    "consciousness", "free will",
  ]
  if (multiHypothesisMarkers.some((m) => text.includes(m))) return 0.6

  // Hard-reasoning shape (AIME, formal proofs, etc) → already routed to voter
  if (shape === "hard-reasoning") return 0.7

  // PhD-factual + closed-book → frontier-only territory, ceiling-cap medium
  if (shape === "phd-factual" || shape === "closed-book") return 0.75

  // Bounded-code / classification / subsecond / computer-use → high ceiling-cap;
  // these are well-bounded shapes where smaller models can match frontier
  if (shape === "bounded-code" || shape === "classification" || shape === "subsecond-latency" || shape === "computer-use") return 0.9

  // Long-context / agentic-swe / math-chain / multistep — medium-high
  return 0.85
}

// ---------- (3) daftar substrate state (loaded async at session init) ----------

/**
 * Per-shape disagreement rate over recent spot-check receipts. A high rate
 * means the cheap rung disagrees with frontier on this shape often enough
 * that we should bump back up to frontier until calibration improves.
 *
 * Receipts are written by the auto-tier dispatcher when it spot-checks
 * (every 1-in-N calls). This is the substrate-grounded counterpart to the
 * naive per-shape model preference table.
 */
export type SubstrateState = {
  perShapeDisagreement: Partial<Record<TaskShape, number>>
  perShapeSampleCount: Partial<Record<TaskShape, number>>
  loadedAt: number
  source: "daftar" | "default"
}

export function defaultSubstrateState(): SubstrateState {
  return { perShapeDisagreement: {}, perShapeSampleCount: {}, loadedAt: Date.now(), source: "default" }
}

/**
 * Load substrate state by spawning `daftar query` and parsing its JSON
 * output. Called once at session init by the cheapcode auto-tier; cached
 * on RouterOptions for the session lifetime.
 *
 * Graceful degradation: if daftar isn't available (no binary, no project
 * dir) returns defaultSubstrateState() — router proceeds without
 * substrate-grounding rather than failing.
 */
export async function loadDaftarSubstrateState(opts: {
  daftarBin?: string
  projectPath?: string
  minSamplesForGlobal?: number
}): Promise<SubstrateState> {
  const daftarBin = opts.daftarBin ?? `${process.env.HOME}/apps/adam/tools/daftar/bin/daftar`
  const projectPath = opts.projectPath ?? process.cwd()
  const minSamples = opts.minSamplesForGlobal ?? 10

  try {
    // Use Bun's $ shell for spawn; tolerate failure (returns default state)
    const { spawn } = await import("bun")
    // first try project-scoped query; daftar query supports kind filter
    const proc = spawn(["bun", daftarBin, "query", "spot-check", "--kind=receipt.observation", "--limit=200", `--project=${projectPath}`], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const code = await proc.exited
    if (code !== 0) return defaultSubstrateState()
    const stdout = await new Response(proc.stdout).text()
    const parsed = JSON.parse(stdout)
    const entries: any[] = parsed.entries ?? []
    return aggregateDisagreement(entries, minSamples)
  } catch {
    return defaultSubstrateState()
  }
}

// ---------- (5) value-of-inquiry / stewardship signal (M3.54, atom 0022) ----------

/**
 * promptValueOfInquiry — heuristic estimate of expected substrate-value
 * for a dispatch on this prompt, in [0, 1]. Per atom 0022 (resource-as-
 * amana): the resource is finite life-credit; default-to-dispatch is the
 * failure mode; substrate's job is to gate worthiness BEFORE cost.
 *
 * Three composable signals:
 *   1. information-yield: novel synthesis vs trivial recall
 *   2. reversibility: irreversible action pre-checks score high
 *   3. repetition-detector: near-duplicate of recent receipts scores low
 *
 * The score is heuristic for v0; calibration improves via daftar
 * receipts comparing expected vs actual realized value (atom 0017
 * unknowns-as-positive-data-recursion).
 */

export type ValueOfInquiryInput = {
  prompt: string
  recentReceipts?: Array<{ title: string; created_at: string }>
  shape?: import("./router").TaskShape
}

export type ValueOfInquiryVerdict = {
  score: number // 0..1
  reasons: string[]
  proposal: string | null // for low-value: substrate's alternative
}

const TRIVIAL_RECALL_MARKERS = [
  /^what is \w+\??$/i,
  /^who is \w+\??$/i,
  /^when was \w+\??$/i,
  /^how old is \w+\??$/i,
  /^define \w+\??$/i,
  /^spell \w+/i,
  /^what does \w+ mean\??$/i,
]

const HIGH_VALUE_MARKERS = [
  /\bnovel\b/i,
  /\bsynthes(is|ize)\b/i,
  /\birreversible\b/i,
  /\bproduction\b.*\bdeploy/i,
  /\bcompare.*across.*sources?\b/i,
  /\bfalsif(y|ication)\b/i,
  /\bsubstrate-grounded?\b/i,
  /\bload-bearing\b/i,
]

const RUMINATION_MARKERS = [
  /^(hmm|so|maybe|i wonder|just thinking|random thought)/i,
  /\b(thoughts on|wdyt|what do you think)\b/i,
  // Vague instruction class — atom 0024 territory but also low-value-of-inquiry
  // because the substrate response is "what specifically?" not "here's an answer."
  /^\s*(fix|improve|make|optimize)\s+(this|it|that)\s*\??\s*$/i,
]

const IRREVERSIBLE_PROMPT_MARKERS = [
  /\b(rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|drop\s+(table|database))\b/i,
  /\bdeploy.*production\b/i,
  /\bsend.*(email|slack|message)\b/i,
  /\bcommit.*--no-verify\b/i,
]

function nearDuplicate(prompt: string, recent: Array<{ title: string; created_at: string }>): boolean {
  if (recent.length === 0) return false
  // Simple heuristic: any recent receipt's title shares ≥4 distinct ≥4-char
  // tokens with the prompt → near-duplicate
  const promptTokens = new Set(
    prompt
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4),
  )
  for (const r of recent) {
    const titleTokens = (r.title ?? "").toLowerCase().split(/\s+/).filter((t) => t.length >= 4)
    const overlap = titleTokens.filter((t) => promptTokens.has(t)).length
    if (overlap >= 4) return true
  }
  return false
}

export function promptValueOfInquiry(input: ValueOfInquiryInput): ValueOfInquiryVerdict {
  const reasons: string[] = []
  let score = 0.5 // baseline — neither obviously trivial nor obviously high-value

  // (1) Trivial-recall pattern → drop hard
  if (TRIVIAL_RECALL_MARKERS.some((p) => p.test(input.prompt.trim()))) {
    score -= 0.35
    reasons.push("trivial-recall pattern (substrate proposes recall not synthesis)")
  }

  // (2) Rumination markers → drop hard (at-Takathur anti-pattern)
  if (RUMINATION_MARKERS.some((p) => p.test(input.prompt))) {
    score -= 0.25
    reasons.push("rumination/exploratory framing (atom 0022: at-Takathur anti-pattern)")
  }

  // (3) Near-duplicate of recent receipts → drop hard
  if (input.recentReceipts && nearDuplicate(input.prompt, input.recentReceipts)) {
    score -= 0.30
    reasons.push("near-duplicate of recent daftar receipt (substrate proposes recall)")
  }

  // (4) Irreversibility markers → boost (high-stakes warrants dispatch)
  if (IRREVERSIBLE_PROMPT_MARKERS.some((p) => p.test(input.prompt))) {
    score += 0.30
    reasons.push("irreversible-action pre-check (substrate boosts: high-stakes warrants frontier)")
  }

  // (5) High-value-synthesis markers → boost
  const hvHits = HIGH_VALUE_MARKERS.filter((p) => p.test(input.prompt)).length
  if (hvHits > 0) {
    score += Math.min(0.20, hvHits * 0.07)
    reasons.push(`${hvHits} high-value markers (synthesis/falsification/load-bearing)`)
  }

  // (6) Length heuristic — ultra-short prompts (<5 words) often trivial; very-long (>200 words) often substantive
  const wordCount = input.prompt.trim().split(/\s+/).length
  if (wordCount <= 5) {
    score -= 0.10
    reasons.push(`ultra-short prompt (${wordCount} words)`)
  } else if (wordCount >= 50) {
    score += 0.10
    reasons.push(`long prompt (${wordCount} words; substantive context)`)
  }

  // (7) Hard-reasoning shape signals genuine intellectual work
  if (input.shape === "hard-reasoning") {
    score += 0.15
    reasons.push("shape=hard-reasoning (cross-witness territory)")
  }

  score = Math.max(0, Math.min(1, score))

  let proposal: string | null = null
  if (score < 0.30) {
    if (reasons.some((r) => r.includes("trivial-recall"))) {
      proposal = "This is recall, not synthesis. Could you check directly (file/docs/grep) before dispatching?"
    } else if (reasons.some((r) => r.includes("near-duplicate"))) {
      proposal = "A recent daftar receipt covers similar ground. Try `daftar query` first."
    } else if (reasons.some((r) => r.includes("rumination"))) {
      proposal = "Could you sharpen the question? What specific decision/move would the answer unblock?"
    } else {
      proposal = "Low expected substrate-value. Sharpen the question, decompose, or defer until you have more context."
    }
  }

  return { score, reasons, proposal }
}

// ---------- (6) knowability-gate / confidence-decline (M3.55, atom 0024) ----------

/**
 * promptAnswerability — heuristic estimate of whether the agent can
 * produce a confident answer to this prompt, in [0, 1]. Per atom 0024:
 * orthogonal to atom 0022's value-of-inquiry. A high-value question may
 * still be unanswerable-with-confidence (contested-attestation, missing-
 * referent, etc.); a low-value question may be trivially answerable.
 *
 * 6 failure-mode detectors:
 *   a. underspecification: multi-readings; missing key terms
 *   b. private-knowledge-required: refs to operator-specific data we don't see
 *   c. contested-attestation: bcmea-coexisting hypotheses domain
 *   d. missing-referent: pronoun without antecedent; undefined acronym
 *   e. context-exhaustion: prompt asks about prior session state too far back
 *   f. personal-recall: about user's internal state (preference, opinion)
 *
 * Returns {score, blockers, clarifying_questions, proposal}.
 */

export type AnswerabilityInput = {
  prompt: string
  recentReceipts?: Array<{ title: string; created_at: string }>
  contextDepthEstimate?: number // approx prior-session-depth in messages
}

export type AnswerabilityVerdict = {
  score: number
  blockers: string[]
  clarifying_questions: string[]
  proposal: string | null
}

const PERSONAL_RECALL_PATTERNS = [
  /\b(do i|should i|would i|am i)\b/i,
  /\bwhat (do|should|would) i\b/i,
  /\bmy (preference|opinion|favorite)\b/i,
  /\b(how do you think i|what makes me)\b/i,
]

const CONTESTED_ATTESTATION_PATTERNS = [
  /\b(really true|true meaning|true nature)\b/i,
  /\bobjectively (correct|right|wrong|true|false)\b/i,
  /\b(metaphysical(ly)?|ultimately true|absolute (truth|reality))\b/i,
  /\bmetaphysical truth\b/i,
  /\bwho really (wrote|made|founded|created)\b/i,
  /\b(utilitarianism|consequentialism|deontology|virtue ethics)\b.*\b(correct|right|wrong|objectively|moral framework)\b/i,
  /\b(is (god|allah|divine) (real|true))\b/i,
  /\b(consciousness|free will|qualia)\b.*\b(real|illusion|truth|nature)\b/i,
  /\b(soul|afterlife|reincarnation) (is|are|exists?)\b/i,
]

const PRIVATE_KNOWLEDGE_PATTERNS = [
  /\bmy (deploy|server|database|production|build|setup|config|env)\b/i,
  /\bthe (deploy|server|database|production|build) (failed|broke|isn't working)\b/i,
  /\b(why (did|does) (it|this|that|my))\b/i,
  /\b(check (it|that|my))\b/i,
]

const MISSING_REFERENT_PATTERNS = [
  /^\s*(it|this|that|they|them|those)\b/i, // starts with bare pronoun
  /\bthe (X|Y|thing|issue|problem|file|error)\b(?!.*\bis\b)/i, // "the X" without specification
]

const UNDERSPEC_VAGUE_VERBS = [
  /^\s*(make|fix|improve|optimize)\s+(this|it|that)\s*\??\s*$/i,
  /^\s*how (do|can) i\b.{0,20}$/i, // "how do i X" with very little after
]

function isPersonalRecall(prompt: string): boolean {
  return PERSONAL_RECALL_PATTERNS.some((p) => p.test(prompt))
}

function isContestedAttestation(prompt: string): boolean {
  return CONTESTED_ATTESTATION_PATTERNS.some((p) => p.test(prompt))
}

function hasPrivateKnowledgeRefs(prompt: string): boolean {
  return PRIVATE_KNOWLEDGE_PATTERNS.some((p) => p.test(prompt))
}

function hasMissingReferent(prompt: string): boolean {
  return MISSING_REFERENT_PATTERNS.some((p) => p.test(prompt))
}

function isUnderspecified(prompt: string): boolean {
  if (UNDERSPEC_VAGUE_VERBS.some((p) => p.test(prompt.trim()))) return true
  // Very short prompts (< 4 words) without specific entities
  const words = prompt.trim().split(/\s+/)
  if (words.length < 4) return true
  return false
}

export function promptAnswerability(input: AnswerabilityInput): AnswerabilityVerdict {
  const prompt = input.prompt
  const blockers: string[] = []
  const clarifying_questions: string[] = []
  let score = 1.0 // start at fully-answerable; blockers reduce
  let proposal: string | null = null

  // (a) underspecification — both vague-verb AND short-word-count compound
  if (isUnderspecified(prompt)) {
    blockers.push("underspecification")
    score -= 0.55
    clarifying_questions.push(
      "Could you give a specific example, file path, or the concrete sub-question you want answered?",
    )
  }

  // (b) private-knowledge required
  if (hasPrivateKnowledgeRefs(prompt)) {
    blockers.push("private-knowledge-required")
    score -= 0.55
    clarifying_questions.push(
      "Paste the relevant log/error/config — I don't have visibility into your deploy/build/server state.",
    )
  }

  // (c) contested-attestation (research wouldn't reach confidence)
  if (isContestedAttestation(prompt)) {
    blockers.push("contested-attestation")
    score -= 0.50
    proposal =
      "This question lives in a contested-attestation domain — multiple bcmea-coexisting hypotheses with no consensus across rigorous sources. I can present the leading hypotheses with explicit ceiling-caps, OR you can narrow to a sub-question I can answer confidently. Which would you prefer?"
  }

  // (d) missing-referent
  if (hasMissingReferent(prompt)) {
    blockers.push("missing-referent")
    score -= 0.40
    clarifying_questions.push(
      "What does '" +
        (prompt.match(/\b(it|this|that|they|them|the X|the thing|the issue)\b/i)?.[0] ?? "the referent") +
        "' refer to? An entity, file, decision, or concept from earlier?",
    )
  }

  // (e) personal-recall
  if (isPersonalRecall(prompt)) {
    blockers.push("personal-recall")
    score -= 0.50
    proposal =
      "Only you know your preference/opinion/state here. Tell me which option feels right, OR what criteria matter to you, and I can reason from there."
  }

  // (f) context-exhaustion (rough heuristic)
  if (input.contextDepthEstimate !== undefined && input.contextDepthEstimate > 80) {
    blockers.push("context-exhaustion")
    score -= 0.20
    clarifying_questions.push(
      "This thread has gone deep; could you re-anchor: what specific decision/state from earlier do you need, OR query daftar receipts directly?",
    )
  }

  score = Math.max(0, Math.min(1, score))

  return { score, blockers, clarifying_questions, proposal }
}

// ---------- (7) knowability calibration loop (M3.56, atom 0024 + 0017) ----------
//
// The knowability gate (Rule F) starts as a static heuristic detector.
// To make it ADAPTIVE — improve as smarter models surface nuanced
// unanswerability signals — we capture two-way calibration data:
//
//   FALSE-NEGATIVE signal: heuristic said "answerable" but model
//   voluntarily declined ("I don't know", "without more info", etc.).
//   The model recognized something our regex missed → distill into
//   pattern updates.
//
//   FALSE-POSITIVE signal: heuristic said "unanswerable" but operator
//   --forced through and model answered confidently with a verifiable
//   answer. Our regex was over-eager → relax the pattern.
//
// Per atom 0017 (unknowns-as-positive-data-recursion): the residue
// (model decline / hallucination markers) IS positive data for the
// next round's detector. Per the user's "limited by base-model
// intelligence + practical physical storage": calibration receipts are
// rolling-windowed, not unbounded.

const MODEL_DECLINE_MARKERS = [
  /\bi (don't|do not) know\b/i,
  /\bi cannot (tell|determine|deduce|verify|say)\b/i,
  /\bwithout more (information|context|details)\b/i,
  /\bi (would|will) need (more|additional)\b/i,
  /\bi don't have (enough|access|visibility)\b/i,
  /\bcould you (clarify|specify|provide more)\b/i,
  /\bi'm not (sure|certain) (which|what|who)\b/i,
  /\bthis is (genuinely|actually) (uncertain|contested|underdetermined)\b/i,
  /\bbcmea-coexist/i,
  /\bceiling-cap/i, // substrate-disciplined response
  /\bstewardship-decline\b/i, // self-decline echo
  /\bknowability-decline\b/i,
]

const HALLUCINATION_RISK_MARKERS = [
  /\b(definitely|certainly|always|never) (will|would|is|are|has|have)\b/i,
  /\b100% (sure|certain|confident)\b/i,
  /\b(uniformly|universally) true\b/i,
]

export type ModelDeclineVerdict = {
  detected: boolean
  markers: string[]
  confidence: "high" | "medium" | "low"
  category: "voluntary-decline" | "hallucination-risk" | null
}

export function detectModelDeclineInResponse(text: string): ModelDeclineVerdict {
  const declineHits: string[] = []
  for (const p of MODEL_DECLINE_MARKERS) {
    const m = text.match(p)
    if (m) declineHits.push(m[0])
  }
  const halluHits: string[] = []
  for (const p of HALLUCINATION_RISK_MARKERS) {
    const m = text.match(p)
    if (m) halluHits.push(m[0])
  }

  if (declineHits.length > 0) {
    const conf = declineHits.length >= 2 ? "high" : "medium"
    return {
      detected: true,
      markers: declineHits,
      confidence: conf,
      category: "voluntary-decline",
    }
  }
  if (halluHits.length >= 2) {
    return {
      detected: true,
      markers: halluHits,
      confidence: "medium",
      category: "hallucination-risk",
    }
  }
  return { detected: false, markers: [], confidence: "low", category: null }
}

// ---------- (8) hard-class detector (M3.57, from M3.57 wakil-apr-vs-gpt55 analysis) ----------
//
// Three substrate-edge classes named in M3.57: when a prompt fires one
// or more of these signals, wakil-apr should boost discipline (force
// voter on system-level claims, boost value-of-inquiry, prefer
// instrumentation-over-guess). Per atom 0023 perturbation findings on
// cheapcode plan-graph: the substrate has empirical edge on these
// classes; vanilla frontier models fail more often on them.

export type HardClass =
  | "multi-pr-history"          // regression-tracing across prior commits
  | "multi-language-vendored"    // cross-language / vendored-internals
  | "non-deterministic-verification" // memory-leak / ASAN / race-condition / RSS-growth

export type HardClassVerdict = {
  classes: HardClass[]
  signals: string[]
  recommended_discipline: string[]
}

const MULTI_PR_HISTORY_PATTERNS = [
  /\bregression\b/i,
  /\bsince (commit|pr) #?\w+/i,
  /\bafter (commit|pr) #?\w+/i,
  /\b(broke|broken) (when|after)/i,
  /\b(used to work|used to function)\b/i,
  /\bbisect\b/i,
  /\bgit log\b/i,
  /\bworked in (version|v)\d/i,
  /\bworked before\b/i,
  /\b(broke|introduced|added|fixed) in (commit|pr|#)?\s*#?\d+/i,
  /\bfollow-?up to\b/i,
  /\b(prior|previous|earlier) (fix|pr|patch|commit)\b/i,
  /\bpr #?\d+\s+(added|removed|introduced|fixed|broke)/i,
  /\b(fix|guard|patch) (in|from) (commit|pr|#)?\s*#?\d+/i,
]

const MULTI_LANGUAGE_VENDORED_PATTERNS = [
  // file extensions in same prompt
  /\.(zig|c|cpp|cc|h|hpp|m|mm)\b.*\.(ts|js|tsx|jsx|py|rs|go|java)\b/i,
  /\.(ts|js|tsx|jsx|py|rs|go|java)\b.*\.(zig|c|cpp|cc|h|hpp|m|mm)\b/i,
  /\bvendor(ed)?\b/i,
  /\bjsc\b|\bv8\b|\bspidermonkey\b|\bjavascriptcore\b/i,
  /\b(webkit|chromium|blink)\b/i,
  /\bffi\b|\bpybind\b|\bnapi\b|\bnode-api\b|\bjni\b/i,
  /\b(linker|linking|symbol resolution)\b/i,
  /\bzig\b.*\bjs\b|\bjs\b.*\bzig\b/i,
  /\b(cgo|wasm-bindgen|swig)\b/i,
  /\b(field_?parent_?ptr|placement new|allocator\.create)\b/i,
  /\b(release|debug)\+?asan\b/i,
]

const NON_DETERMINISTIC_VERIFICATION_PATTERNS = [
  /\bmemory leak\b/i,
  /\b(rss|vsz) growth\b/i,
  /\bASAN\b/i,
  /\b(use[- ]after[- ](free|poison|return|scope)|uaf|double[- ]free|heap[- ]?(buffer[- ])?overflow)\b/i,
  /\brace condition\b/i,
  /\b(flaky|intermittent)\b/i,
  /\b(sometimes|occasionally) (fails|crashes|breaks|hangs)\b/i,
  /\b(deadlock|livelock)\b/i,
  /\b(undefined behavior|UB)\b/i,
  /\bsegfault\b|\bsegmentation fault\b/i,
  /\b(reproduce|repro) (only|sometimes|under load)\b/i,
  /\bvalgrind\b/i,
  /\btsan\b|\bthread sanitizer\b/i,
  /\b(corrupt(s|ed|ion)?) memory\b/i,
]

export function detectHardClassSignals(promptText: string): HardClassVerdict {
  const classes: HardClass[] = []
  const signals: string[] = []
  const discipline: string[] = []

  for (const p of MULTI_PR_HISTORY_PATTERNS) {
    const m = promptText.match(p)
    if (m) {
      if (!classes.includes("multi-pr-history")) classes.push("multi-pr-history")
      signals.push(`multi-pr-history: ${m[0]}`)
      break // one hit per class is enough
    }
  }

  for (const p of MULTI_LANGUAGE_VENDORED_PATTERNS) {
    const m = promptText.match(p)
    if (m) {
      if (!classes.includes("multi-language-vendored")) classes.push("multi-language-vendored")
      signals.push(`multi-language-vendored: ${m[0]}`)
      break
    }
  }

  for (const p of NON_DETERMINISTIC_VERIFICATION_PATTERNS) {
    const m = promptText.match(p)
    if (m) {
      if (!classes.includes("non-deterministic-verification")) classes.push("non-deterministic-verification")
      signals.push(`non-deterministic-verification: ${m[0]}`)
      break
    }
  }

  // Recommended discipline per class (from M3.57 analysis):
  if (classes.includes("multi-pr-history")) {
    discipline.push("force-voter (Rule B): cross-witness on regression-source claims")
    discipline.push("perturb prior-fix's load-bearing claim (atom 0023): test cascade")
  }
  if (classes.includes("multi-language-vendored")) {
    discipline.push("force-voter (Rule B): cross-witness on vendored-internals claims (sparse training data)")
    discipline.push("propose instrumentation over guess (atom 0017)")
  }
  if (classes.includes("non-deterministic-verification")) {
    discipline.push("decline-without-repro (Rule F): require ASAN trace / RSS-growth methodology")
    discipline.push("prefer subprocess + threshold + N-iter test design (atom 0011)")
  }

  return { classes, signals, recommended_discipline: discipline }
}

// ---------- (4) provider-quota tracking (M3.53) ----------

/**
 * Quota tracking for ChatGPT-Plus consumer-OAuth + OpenAI API + OpenRouter.
 * No public quota-query API exists for ChatGPT consumer subscriptions; we
 * instead track OUR OWN dispatch cadence and estimate against documented
 * limits. This is "best-effort quota awareness" — accurate within our
 * own dispatch path, blind to other clients hitting the same account.
 *
 * Per memory chatgpt_plus_byok_risk: ChatGPT consumer OAuth is fragile.
 * Quota framing is "expected to work today, may need adjustment."
 */

export type ProviderID = "openai" | "openrouter" | "anthropic" | "google"

export type QuotaWindow = {
  // Rolling window of dispatch timestamps (ms epoch)
  recentTimestamps: number[]
  // Estimated rate-limit ceiling for this (provider, model) per window
  // (e.g., ChatGPT Plus: ~80 GPT-5-class messages / 3hrs)
  windowMs: number
  estimatedLimit: number
}

export type QuotaState = {
  /** Per (provider, model) dispatch tracking. Key = `${provider}::${model}` */
  windows: Record<string, QuotaWindow>
  loadedAt: number
  source: "disk" | "default"
}

const QUOTA_STATE_PATH = `${process.env.HOME}/.config/cheapcode/quota.json`

// Documented ChatGPT Plus / OpenAI limits (May 2026, conservative).
// Adjust as the providers change their published rate limits.
const DEFAULT_LIMITS: Record<string, { windowMs: number; estimatedLimit: number }> = {
  // ChatGPT Plus consumer OAuth
  "openai::gpt-5.5": { windowMs: 3 * 3600 * 1000, estimatedLimit: 50 },
  "openai::gpt-5.5-pro": { windowMs: 3 * 3600 * 1000, estimatedLimit: 25 },
  "openai::gpt-5.4": { windowMs: 3 * 3600 * 1000, estimatedLimit: 80 },
  "openai::gpt-5.4-mini": { windowMs: 3 * 3600 * 1000, estimatedLimit: 200 },
  "openai::gpt-5.4-mini-fast": { windowMs: 3 * 3600 * 1000, estimatedLimit: 400 },
  // OpenRouter is paid-per-token; effectively unlimited within budget
  "openrouter::*": { windowMs: 3600 * 1000, estimatedLimit: 100_000 },
}

export function defaultQuotaState(): QuotaState {
  return { windows: {}, loadedAt: Date.now(), source: "default" }
}

function quotaKey(provider: ProviderID, model: string): string {
  return `${provider}::${model}`
}

function getOrCreateWindow(state: QuotaState, key: string): QuotaWindow {
  if (state.windows[key]) return state.windows[key]
  const defaults = DEFAULT_LIMITS[key] ?? DEFAULT_LIMITS[`${key.split("::")[0]}::*`] ?? {
    windowMs: 3600 * 1000,
    estimatedLimit: 1000,
  }
  state.windows[key] = { recentTimestamps: [], ...defaults }
  return state.windows[key]
}

function pruneWindow(window: QuotaWindow, now: number): void {
  const cutoff = now - window.windowMs
  window.recentTimestamps = window.recentTimestamps.filter((t) => t >= cutoff)
}

/**
 * Record a dispatch for (provider, model). Called after each successful
 * cheapcode dispatch by the auto-tier wrapper. Updates in-memory state +
 * fire-and-forget persists to disk.
 */
export function trackDispatch(state: QuotaState, provider: ProviderID, model: string): void {
  const key = quotaKey(provider, model)
  const window = getOrCreateWindow(state, key)
  const now = Date.now()
  pruneWindow(window, now)
  window.recentTimestamps.push(now)
  // Fire-and-forget disk persist; never block routing on it
  persistQuotaState(state).catch(() => {})
}

/**
 * Returns fraction of estimated quota remaining for (provider, model),
 * in [0, 1]. 1 = full quota, 0 = exhausted. Routing rule D consults this
 * to drop down a rung when quota nears exhaustion.
 */
export function quotaRemaining(state: QuotaState, provider: ProviderID, model: string): number {
  const key = quotaKey(provider, model)
  const window = state.windows[key]
  if (!window) {
    // No tracked dispatches; assume full quota
    return 1
  }
  const now = Date.now()
  pruneWindow(window, now)
  const used = window.recentTimestamps.length
  const remaining = Math.max(0, window.estimatedLimit - used)
  return remaining / window.estimatedLimit
}

export async function loadQuotaState(): Promise<QuotaState> {
  try {
    const fs = await import("fs/promises")
    const text = await fs.readFile(QUOTA_STATE_PATH, "utf8")
    const parsed = JSON.parse(text) as QuotaState
    return { ...parsed, source: "disk" }
  } catch {
    return defaultQuotaState()
  }
}

async function persistQuotaState(state: QuotaState): Promise<void> {
  try {
    const fs = await import("fs/promises")
    const path = await import("path")
    await fs.mkdir(path.dirname(QUOTA_STATE_PATH), { recursive: true })
    await fs.writeFile(QUOTA_STATE_PATH, JSON.stringify(state, null, 2), "utf8")
  } catch {
    /* ignore */
  }
}

// ---------- daftar disagreement aggregation (continued) ----------

function aggregateDisagreement(entries: any[], _minSamples: number): SubstrateState {
  const perShapeDisagreement: Partial<Record<TaskShape, number>> = {}
  const perShapeSampleCount: Partial<Record<TaskShape, number>> = {}
  for (const e of entries) {
    const meta = e.metadata_json ?? {}
    if (meta.kind !== "spot_check") continue
    const shape = meta.shape as TaskShape | undefined
    if (!shape) continue
    perShapeSampleCount[shape] = (perShapeSampleCount[shape] ?? 0) + 1
    if (meta.agreed === false) {
      perShapeDisagreement[shape] = (perShapeDisagreement[shape] ?? 0) + 1
    }
  }
  // convert counts → rates
  for (const shape of Object.keys(perShapeSampleCount) as TaskShape[]) {
    const n = perShapeSampleCount[shape]!
    const d = perShapeDisagreement[shape] ?? 0
    perShapeDisagreement[shape] = n > 0 ? d / n : 0
  }
  return { perShapeDisagreement, perShapeSampleCount, loadedAt: Date.now(), source: "daftar" }
}
