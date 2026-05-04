import { expect, test } from "bun:test"
import { buildClaimShapeReport, tagClaimShapes } from "./claim-shape"

test("tagClaimShapes separates verified claims, recommendations, and assumptions", () => {
  const tags = tagClaimShapes("Tests passed. You should use semantic HTML. This is likely incomplete.")
  expect(tags.map((tag) => tag.shape)).toEqual(["verified", "recommendation", "assumption"])
})

test("buildClaimShapeReport counts unsupported sentences", () => {
  expect(buildClaimShapeReport("The system is perfect.")).toContain("1 unsupported")
})
