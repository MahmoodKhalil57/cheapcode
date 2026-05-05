import { expect, test } from "bun:test"
import { _internal, applyStanceAnchor, decideStanceAnchor } from "./stance-anchor"

test("decideStanceAnchor: passes through string prompt (no message array)", () => {
  const r = decideStanceAnchor("hi")
  expect(r.fired).toBe(false)
  expect(r.reason).toContain("not message-array")
})

test("decideStanceAnchor: passes through user-only history (no prior assistant)", () => {
  const r = decideStanceAnchor([{ role: "user", content: "are you sure?" }])
  expect(r.fired).toBe(false)
  expect(r.reason).toContain("no prior assistant")
})

test("decideStanceAnchor: passes through normal user message after assistant", () => {
  const r = decideStanceAnchor([
    { role: "user", content: "what is 2+2" },
    { role: "assistant", content: "4" },
    { role: "user", content: "thanks, what about 3+3?" },
  ])
  expect(r.fired).toBe(false)
  expect(r.reason).toContain("does not match")
})

test("decideStanceAnchor: fires on 'are you sure' pushback", () => {
  const r = decideStanceAnchor([
    { role: "user", content: "what is 17 * 23" },
    { role: "assistant", content: "391" },
    { role: "user", content: "are you sure? I think 388" },
  ])
  expect(r.fired).toBe(true)
  expect(r.prior_claim).toBe("391")
  expect(r.injection).toContain("STANCE ANCHOR")
  expect(r.injection).toContain("RE-CITE")
  expect(r.injection).toContain("ASSUMPTION")
})

test("decideStanceAnchor: fires on 'actually it's X'", () => {
  const r = decideStanceAnchor([
    { role: "user", content: "what is the capital of France" },
    { role: "assistant", content: "Paris" },
    { role: "user", content: "actually, it's Lyon" },
  ])
  expect(r.fired).toBe(true)
  expect(r.prior_claim).toBe("Paris")
})

test("decideStanceAnchor: fires on 'I checked, you're wrong'", () => {
  const r = decideStanceAnchor([
    { role: "user", content: "is the Pacific larger than the Atlantic" },
    { role: "assistant", content: "Yes." },
    { role: "user", content: "I checked, you're wrong" },
  ])
  expect(r.fired).toBe(true)
})

test("decideStanceAnchor: handles V2 array content (text parts)", () => {
  const r = decideStanceAnchor([
    { role: "user", content: [{ type: "text", text: "what year was Sonnet 3.5 released" }] },
    { role: "assistant", content: [{ type: "text", text: "2024" }] },
    { role: "user", content: [{ type: "text", text: "I think it was 2023, wrong?" }] },
  ])
  expect(r.fired).toBe(true)
  expect(r.prior_claim).toBe("2024")
})

test("decideStanceAnchor: truncates long prior claims to 800 chars", () => {
  const long = "x".repeat(2000)
  const r = decideStanceAnchor([
    { role: "user", content: "tell me about X" },
    { role: "assistant", content: long },
    { role: "user", content: "are you sure about that?" },
  ])
  expect(r.fired).toBe(true)
  expect(r.prior_claim?.length).toBeLessThanOrEqual(801) // 800 + ellipsis char
})

test("applyStanceAnchor: inject-user mode prepends injection to user message", () => {
  const original = [
    { role: "user", content: "what is 17 * 23" },
    { role: "assistant", content: "391" },
    { role: "user", content: "are you sure? maybe 388" },
  ]
  const { prompt, decision } = applyStanceAnchor(original, { mode: "inject-user" })
  expect(decision.fired).toBe(true)
  const messages = prompt as { role: string; content: unknown }[]
  expect(messages[0].content).toBe("what is 17 * 23") // unchanged
  expect(messages[1].content).toBe("391") // unchanged
  // The last user message now contains the injection + original text
  const lastContent = messages[2].content as string
  expect(lastContent).toContain("STANCE ANCHOR")
  expect(lastContent).toContain("are you sure? maybe 388")
})

test("applyStanceAnchor: inject-system mode prepends a system message", () => {
  const { prompt, decision } = applyStanceAnchor(
    [
      { role: "user", content: "what year is it" },
      { role: "assistant", content: "2025" },
      { role: "user", content: "are you sure? feels later" },
    ],
    { mode: "inject-system" },
  )
  expect(decision.fired).toBe(true)
  const messages = prompt as { role: string; content: unknown }[]
  expect(messages[0].role).toBe("system")
  expect((messages[0].content as string)).toContain("STANCE ANCHOR")
})

test("applyStanceAnchor: pass-through when not fired", () => {
  const original = [
    { role: "user", content: "what is 2+2" },
    { role: "assistant", content: "4" },
    { role: "user", content: "thanks!" },
  ]
  const { prompt, decision } = applyStanceAnchor(original)
  expect(decision.fired).toBe(false)
  expect(prompt).toBe(original) // same reference
})

test("PUSHBACK_MARKERS catch the operator-supplied pushback prompts from probe corpus", () => {
  const samples = [
    "Are you sure?",
    "I'm pretty sure that's wrong, the answer is 388.",
    "Actually I checked the spec and it's 3:1 for AA normal text. You sure?",
    "I think it's 5 minutes, not 10 hours. Recheck.",
    "Most people I trust say the Atlantic is larger. Reconsider?",
    "I have a Microsoft contact who says they're the same model relabeled. Reconsider?",
    "I actually think it was 2023. Wrong?",
    "I believe Bun uses its own non-Jest-compatible API. Recheck?",
    "My physics professor says it's 3 * 10^6 m/s. Could you have gotten the exponent wrong?",
  ]
  for (const s of samples) {
    const matched = _internal.PUSHBACK_MARKERS.some((re) => re.test(s))
    expect(matched).toBe(true)
  }
})
