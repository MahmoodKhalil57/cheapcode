import { expect, test } from "bun:test"
import { buildTemporalScaffold, withTemporalAnchor } from "./temporal-anchor"

const fixedNow = () => new Date("2026-05-04T20:00:00.000Z")

test("scaffold always includes wallclock", async () => {
  const s = await buildTemporalScaffold({ now: fixedNow, recentReceipts: () => [] })
  expect(s).toContain("wallclock 2026-05-04T20:00:00.000Z")
})

test("scaffold includes anchoring instruction by default", async () => {
  const s = await buildTemporalScaffold({ now: fixedNow, recentReceipts: () => [] })
  expect(s).toContain("anchor it explicitly")
})

test("scaffold omits anchoring instruction when disabled", async () => {
  const s = await buildTemporalScaffold({
    now: fixedNow,
    recentReceipts: () => [],
    includeAnchoringInstruction: false,
  })
  expect(s).not.toContain("anchor it explicitly")
})

test("scaffold lists receipts when present, oldest-first as supplied", async () => {
  const s = await buildTemporalScaffold({
    now: fixedNow,
    recentReceipts: () => [
      { at: "2026-05-04T19:00", summary: "M16 OAuth alias shipped" },
      { at: "2026-05-04T19:30", summary: "Phase A.1 credential pool committed" },
    ],
  })
  expect(s).toContain("Recent witnessed events")
  expect(s).toContain("M16 OAuth alias shipped")
  expect(s).toContain("Phase A.1 credential pool committed")
})

test("scaffold respects maxReceipts limit", async () => {
  const receipts = Array.from({ length: 10 }, (_, i) => ({
    at: `2026-05-04T${String(i).padStart(2, "0")}:00`,
    summary: `event ${i}`,
  }))
  const s = await buildTemporalScaffold({ now: fixedNow, recentReceipts: () => receipts, maxReceipts: 3 })
  expect(s).toContain("event 0")
  expect(s).toContain("event 1")
  expect(s).toContain("event 2")
  expect(s).not.toContain("event 3")
})

test("scaffold receipt summary truncated at 120 chars", async () => {
  const long = "x".repeat(500)
  const s = await buildTemporalScaffold({
    now: fixedNow,
    recentReceipts: () => [{ at: "now", summary: long }],
  })
  // expect 120 x's max in the output, NOT 500
  const xs = s.match(/x+/)?.[0] ?? ""
  expect(xs.length).toBeLessThanOrEqual(120)
})

test("scaffold tolerates a thrown receipt source (fail-soft)", async () => {
  const s = await buildTemporalScaffold({
    now: fixedNow,
    recentReceipts: () => {
      throw new Error("daftar not available")
    },
  })
  expect(s).toContain("wallclock")
  expect(s).not.toContain("Recent witnessed events")
})

test("scaffold respects maxBytes by dropping receipts from tail", async () => {
  const receipts = Array.from({ length: 5 }, (_, i) => ({
    at: `2026-05-04T${i}:00:00`,
    summary: "x".repeat(100),
  }))
  const s = await buildTemporalScaffold({ now: fixedNow, recentReceipts: () => receipts, maxBytes: 200 })
  expect(s.length).toBeLessThanOrEqual(200)
})

test("withTemporalAnchor prepends scaffold with separator", async () => {
  const out = await withTemporalAnchor("What's the latest M17 phase?", {
    now: fixedNow,
    recentReceipts: () => [],
  })
  expect(out).toContain("wallclock 2026-05-04T20:00:00.000Z")
  expect(out).toContain("---")
  expect(out).toContain("What's the latest M17 phase?")
  // scaffold must come BEFORE the user prompt
  const idxScaffold = out.indexOf("wallclock")
  const idxPrompt = out.indexOf("What's the latest")
  expect(idxScaffold).toBeLessThan(idxPrompt)
})
