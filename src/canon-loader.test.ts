import { expect, test } from "bun:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { filterByGrade, loadCanon } from "./canon-loader"

test("loadCanon returns empty map for missing directory", () => {
  expect(loadCanon(join(tmpdir(), "missing-cheapcode-canon")).size).toBe(0)
})

test("loadCanon reads candidates grouped by dimension", async () => {
  const dir = await mkdtemp(join(tmpdir(), "canon-loader-"))
  try {
    await writeFile(join(dir, "accessibility.candidates.json"), JSON.stringify({ candidates: [{ id: "wcag", dimension: "accessibility", source_name: "WCAG", source_type: "standard", author_or_publisher: "W3C", url: "https://w3.org", accessed_at: "now", primary_principle: "Make content perceivable.", applicability_signal: "a11y", citation_form: "W3C", operator_verified: false, mizan_grade: "daif" }] }))
    expect(loadCanon(dir).get("accessibility")?.[0]?.id).toBe("wcag")
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("filterByGrade drops daif when min grade is hasan", async () => {
  const canon = new Map([["x", [
    { id: "a", dimension: "x", source_name: "A", source_type: "standard", author_or_publisher: "A", url: "u", accessed_at: "t", primary_principle: "p", applicability_signal: "x", citation_form: "c", operator_verified: false, mizan_grade: "daif" as const },
    { id: "b", dimension: "x", source_name: "B", source_type: "standard", author_or_publisher: "B", url: "u", accessed_at: "t", primary_principle: "p", applicability_signal: "x", citation_form: "c", operator_verified: false, mizan_grade: "hasan" as const },
  ]]])
  expect(filterByGrade(canon, "hasan").get("x")?.map((entry) => entry.id)).toEqual(["b"])
})
