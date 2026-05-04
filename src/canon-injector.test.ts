import { expect, test } from "bun:test"
import { buildCanonScaffold, classifyTaskDimensions, selectCanonCards } from "./canon-injector"
import type { CanonEntry } from "./canon-loader"

const entry = (id: string, dimension: string, grade: CanonEntry["mizan_grade"] = "hasan"): CanonEntry => ({
  id,
  dimension,
  source_name: id,
  source_type: "standard",
  author_or_publisher: "publisher",
  url: "https://example.com",
  accessed_at: "now",
  primary_principle: `${id} principle`,
  applicability_signal: dimension,
  citation_form: id,
  operator_verified: false,
  mizan_grade: grade,
})

test("classifyTaskDimensions matches accessibility and ui prompts", () => {
  expect(classifyTaskDimensions("Build a responsive UI with keyboard focus and contrast")).toContain("accessibility")
  expect(classifyTaskDimensions("Build a responsive UI with keyboard focus and contrast")).toContain("ui-visual")
})

test("selectCanonCards prefers higher grade and caps at three cards", () => {
  const canon = new Map([["accessibility", [entry("daif", "accessibility", "daif"), entry("sahih", "accessibility", "sahih"), entry("hasan", "accessibility"), entry("extra", "accessibility")]]])
  const decision = selectCanonCards(canon, ["accessibility"], 200)
  expect(decision.cards.map((card) => card.id)).toEqual(["sahih", "hasan", "extra"])
})

test("buildCanonScaffold renders auditable grade labels", () => {
  const scaffold = buildCanonScaffold({ cards: [entry("WCAG", "accessibility", "hasan")], reasoning: "test", bytes_added: 1 })
  expect(scaffold).toContain("Honor these fetched design canons")
  expect(scaffold).toContain("[hasan]")
})
