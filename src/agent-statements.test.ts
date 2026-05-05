import { afterEach, expect, test } from "bun:test"
import {
  AGENT_STATEMENTS,
  buildAgentStatementsScaffold,
  withAgentStatements,
} from "./agent-statements"

const ORIG_ENV = process.env.CHEAPCODE_AGENT_STATEMENTS

afterEach(() => {
  if (ORIG_ENV === undefined) delete process.env.CHEAPCODE_AGENT_STATEMENTS
  else process.env.CHEAPCODE_AGENT_STATEMENTS = ORIG_ENV
})

test("AGENT_STATEMENTS contains exactly 4 statements", () => {
  expect(AGENT_STATEMENTS.length).toBe(4)
})

test("each statement names its operational form (testable, not philosophical)", () => {
  expect(AGENT_STATEMENTS[0]).toContain("measurement")
  expect(AGENT_STATEMENTS[1]).toContain("ASSUMPTION")
  expect(AGENT_STATEMENTS[2]).toContain("auditable")
  expect(AGENT_STATEMENTS[3]).toContain("training-recall")
})

test("buildAgentStatementsScaffold (default subset 2+4 from M24 receipt)", () => {
  const s = buildAgentStatementsScaffold()
  expect(s).toContain("[OPERATING POSTURE")
  expect(s).toContain("2.")
  expect(s).toContain("4.")
  expect(s).not.toContain("1.")
  expect(s).not.toContain("3.")
})

test("buildAgentStatementsScaffold full-block when explicitly requested", () => {
  const s = buildAgentStatementsScaffold([1, 2, 3, 4])
  expect(s).toContain("1.")
  expect(s).toContain("2.")
  expect(s).toContain("3.")
  expect(s).toContain("4.")
})

test("withAgentStatements prepends scaffold when env enables it", () => {
  process.env.CHEAPCODE_AGENT_STATEMENTS = "1"
  const out = withAgentStatements("hi")
  expect(out).toContain("[OPERATING POSTURE")
  expect(out).toContain("---")
  expect(out).toContain("hi")
  // scaffold must come BEFORE the user prompt
  expect(out.indexOf("[OPERATING POSTURE")).toBeLessThan(out.indexOf("hi"))
})

test("withAgentStatements passes prompt through when env unset", () => {
  delete process.env.CHEAPCODE_AGENT_STATEMENTS
  expect(withAgentStatements("hi")).toBe("hi")
})

test("withAgentStatements honors explicit `enabled` over env", () => {
  process.env.CHEAPCODE_AGENT_STATEMENTS = "0"
  const out = withAgentStatements("hi", { enabled: true })
  expect(out).toContain("[OPERATING POSTURE")
})
