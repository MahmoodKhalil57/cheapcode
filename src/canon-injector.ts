import type { CanonEntry } from "./canon-loader"

export interface InjectionDecision {
  cards: CanonEntry[]
  reasoning: string
  bytes_added: number
}

const DIMENSION_SIGNALS: Array<[string, RegExp]> = [
  ["software-architecture", /\b(refactor|architecture|module|dependency|domain|service|test|migration|maintain|technical debt)\b/i],
  ["api-dx", /\b(api|endpoint|openapi|rest|http|sdk|schema|pagination|idempot|status code)\b/i],
  ["ui-visual", /\b(ui|screen|component|layout|dashboard|visual|design system|theme|responsive)\b/i],
  ["accessibility", /\b(accessibility|a11y|wcag|aria|keyboard|contrast|screen reader|focus|alt text)\b/i],
  ["ux-research", /\b(ux|user research|usability|interview|onboarding|checkout|conversion|flow|heuristic)\b/i],
  ["ai-ml-product", /\b(ai product|model behavior|trust|uncertainty|explain|hallucination|human oversight|alignment)\b/i],
  ["llm-failure-research", /\b(sycophancy|temporal|fresh|reversal|belief|bias|rlhf|cultural|hallucination)\b/i],
  ["policy-governance", /\b(policy|governance|risk|compliance|audit|regulation|oversight|accountability)\b/i],
]

const GRADE_RANK = { daif: 0, hasan: 1, sahih: 2 }

export function classifyTaskDimensions(prompt: string): string[] {
  const matches = DIMENSION_SIGNALS.filter(([, regex]) => regex.test(prompt)).map(([dimension]) => dimension)
  return matches.length > 0 ? matches : ["software-architecture"]
}

function cardLine(card: CanonEntry) {
  return `- [${card.mizan_grade}] ${card.source_name}: ${card.primary_principle}`
}

export function selectCanonCards(canon: Map<string, CanonEntry[]>, dimensions: string[], maxTokens = 200): InjectionDecision {
  const maxBytes = maxTokens * 4
  const candidates = dimensions
    .flatMap((dimension) => canon.get(dimension) ?? [])
    .sort((a, b) => GRADE_RANK[b.mizan_grade] - GRADE_RANK[a.mizan_grade] || a.primary_principle.length - b.primary_principle.length)
  const cards: CanonEntry[] = []
  let bytes = 0
  for (const card of candidates) {
    const next = cardLine(card).length + 1
    if (cards.length >= 3 || bytes + next > maxBytes) continue
    cards.push(card)
    bytes += next
  }
  return {
    cards,
    reasoning: cards.length === 0 ? `no canon cards matched ${dimensions.join(",")}` : `selected ${cards.length} card(s) for ${dimensions.join(",")}`,
    bytes_added: bytes,
  }
}

export function buildCanonScaffold(decision: InjectionDecision): string {
  if (decision.cards.length === 0) return ""
  return ["Honor these fetched design canons when relevant:", ...decision.cards.map(cardLine)].join("\n")
}
