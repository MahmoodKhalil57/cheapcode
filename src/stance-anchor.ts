/**
 * stance-anchor.ts — runtime sycophancy-resistance mechanism (M24 iter 4).
 *
 * The system-prompt scaffold (agent-statements.ts) showed null delta on
 * the LLM-as-judge sycophancy axis: telling the model "do not flip" did
 * not change generation-time hedge behavior. The judge caught subtle
 * concessions ("you may have a point", "possibly earned") that aren't
 * literal flips but are the same failure pattern.
 *
 * This module is a STRUCTURAL intervention: when a turn is detected as
 * "user pushing back on prior model claim", we fork the dispatch and
 * inject the prior claim as a stance constraint:
 *
 *   PRIOR CLAIM: "<prior assistant text>"
 *   The user disagrees. Either cite a source for your prior claim, OR
 *   explicitly tag it ASSUMPTION (unverified). Do not flip the stance
 *   without evidence beyond user disagreement.
 *
 * The model can no longer comply by hedging — the protocol forces a
 * cite-or-tag binary, both of which preserve stance. Per atom 0008
 * runtime-anchored claim-shape: the response carries auditable form
 * (citation OR tag), and the judge can score directly.
 *
 * Per atom 0011 smallest-distinguishing-experiment: this is the first
 * mechanism with a hypothesized real semantic delta. Test against the
 * same sycophancy probe corpus + LLM-as-judge.
 *
 * Detection is heuristic (regex on the user's latest message). Activates
 * ONLY when:
 *   1. There's at least one prior assistant turn in the message history
 *   2. The current user message contains pushback markers
 *
 * Otherwise pass-through — never modifies normal turns.
 */

const PUSHBACK_MARKERS: RegExp[] = [
  /\b(are you sure|you sure)\b/i,
  /\b(i think you('?re| are) wrong|you('?re| are) wrong)\b/i,
  /\b(actually|in fact),?\s+(it's|the answer is|that's|that is)\b/i,
  /\b(reconsider|recheck|double[- ]check|wait a sec|wait,)/i,
  /\bthat's (wrong|not right|incorrect|false)\b/i,
  /\bnot quite\b/i,
  /\b(my (professor|colleague|contact|friend|source) (says|told me))\b/i,
  /\b(i checked|i verified|i looked it up)\b/i,
  /\bcould you have gotten\b/i,
  /\bwrong\?$/i,
]

export interface StanceAnchorDecision {
  fired: boolean
  /** Why the detector fired or didn't (audit trail per atom 0008). */
  reason: string
  /** When fired, the prior assistant text we extracted. */
  prior_claim?: string
  /** When fired, the augmented system message we'd inject. */
  injection?: string
}

interface MessageLike {
  role?: string
  content?: unknown
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (typeof part === "object" && part !== null) {
          const p = part as { type?: string; text?: string }
          if (p.type === "text" && typeof p.text === "string") return p.text
        }
        return ""
      })
      .join("")
  }
  return ""
}

/**
 * Decide whether to activate stance-anchor for a given message history.
 * Pass the same `prompt` shape the AI SDK uses (LanguageModelV2Prompt:
 * array of `{role, content}`). Single-string prompts never trigger
 * (no prior assistant turn exists).
 */
export function decideStanceAnchor(prompt: unknown): StanceAnchorDecision {
  if (!Array.isArray(prompt)) {
    return { fired: false, reason: "prompt is not message-array" }
  }
  const messages = prompt as MessageLike[]
  // Find the last user message and any assistant message before it
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIdx = i
      break
    }
  }
  if (lastUserIdx === -1) return { fired: false, reason: "no user message" }
  let priorAssistantIdx = -1
  for (let i = lastUserIdx - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") {
      priorAssistantIdx = i
      break
    }
  }
  if (priorAssistantIdx === -1) return { fired: false, reason: "no prior assistant turn" }

  const userText = extractText(messages[lastUserIdx]?.content)
  const matched = PUSHBACK_MARKERS.find((re) => re.test(userText))
  if (!matched) return { fired: false, reason: "user message does not match pushback markers" }

  const priorText = extractText(messages[priorAssistantIdx]?.content).trim()
  if (priorText.length === 0) return { fired: false, reason: "prior assistant turn empty" }

  const trimmed = priorText.length > 800 ? priorText.slice(0, 800) + "…" : priorText
  const injection = [
    "[STANCE ANCHOR — atom 0008 claim-shape]",
    `Your prior claim was:`,
    `"""`,
    trimmed,
    `"""`,
    `The user is now pushing back. Before answering:`,
    `  (a) If you are confident, RE-CITE a source or computation that supports your prior claim.`,
    `  (b) If you are not confident, EXPLICITLY tag the prior claim as ASSUMPTION (unverified).`,
    `Do NOT flip the stance based solely on the user's disagreement — user disagreement is not new evidence.`,
    `Do NOT add hedges like "you may have a point" without real evidence.`,
  ].join("\n")

  return {
    fired: true,
    reason: `pushback marker matched: ${matched.source}`,
    prior_claim: trimmed,
    injection,
  }
}

/**
 * Compose a stance-anchor-augmented system message into the prompt.
 * Returns the augmented messages array (cloned). When the detector
 * doesn't fire, returns the original array unchanged.
 *
 * Mode='inject-system': prepend the injection as a system message.
 * Mode='inject-user': prepend it to the user's current message.
 *
 * inject-system is more conventional but some providers strip multiple
 * system messages; inject-user is universally honored. Default: inject-user.
 */
export function applyStanceAnchor(
  prompt: unknown,
  opts: { mode?: "inject-system" | "inject-user" } = {},
): { prompt: unknown; decision: StanceAnchorDecision } {
  const decision = decideStanceAnchor(prompt)
  if (!decision.fired || !decision.injection) return { prompt, decision }
  if (!Array.isArray(prompt)) return { prompt, decision }

  const messages = (prompt as MessageLike[]).map((m) => ({ ...m }))
  const mode = opts.mode ?? "inject-user"
  if (mode === "inject-system") {
    return {
      prompt: [{ role: "system", content: decision.injection }, ...messages],
      decision,
    }
  }
  // inject-user: prepend to last user message text
  let lastUserIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i
      break
    }
  }
  if (lastUserIdx === -1) return { prompt: messages, decision }
  const userMsg = messages[lastUserIdx]
  const userText = extractText(userMsg.content)
  const newText = `${decision.injection}\n\n---\n\n${userText}`
  // V2 user content is array-of-parts; preserve shape
  if (Array.isArray(userMsg.content)) {
    messages[lastUserIdx] = {
      ...userMsg,
      content: [{ type: "text", text: newText }],
    }
  } else {
    messages[lastUserIdx] = { ...userMsg, content: newText }
  }
  return { prompt: messages, decision }
}

export const _internal = { PUSHBACK_MARKERS }
