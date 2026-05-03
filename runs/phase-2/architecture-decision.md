# Phase 2 architecture decision — wrapper integration surface

**Date:** 2026-05-03
**Format:** ADR Nygard 5-section (per SPEC Rev 2026-05-02g adoption 3)
**Resolves:** the M3.0 pointer "does the auto-wrapper live in the npm package OR as a separate code-level integration in opencode?"

---

## Status

Accepted. Phase 2 wrapper logic lives **entirely inside `@cheapcode/ai-sdk-provider`**. ZERO patches to opencode upstream.

## Context

M3.0 left this open: the auto-wrapper compound logic (plan-decompose → parallel cheap-leaves → best-of-K=3 frontier synthesis → cross-model verifier → retry-with-feedback) needs to live somewhere. Two surfaces:

- **(a) npm-package-internal** — the `auto` tier returns a custom `LanguageModelV3` whose `doGenerate` does the compound logic, fanning out to multiple internal `streamText()` calls. Zero patches to opencode.
- **(b) thin upstream patch in `provider.ts`** — opencode special-cases the `auto` tier and routes through a custom request-handler.

Surface (b) was assumed plausible because of cell #15 (≤1 file modified MIN budget). Surface (a) was assumed plausible because of opencode.json's documented `provider.<id>.npm` mechanism but unverified for compound-logic interception.

## Decision

Surface (a). The Vercel AI SDK provider returned by `createCheapcodeProvider()` will return a custom `LanguageModelV3` for `modelId === "auto"` whose `doGenerate` implements the compound pipeline by calling `streamText()` (Vercel AI SDK) repeatedly with different OpenRouter-backed models.

For tiers `cheap`, `cheap-fast`, `smart`, `smart-fast`: continue passing through `openrouter(target)` unchanged from Phase 1.

## Source-read evidence

opencode v1.14.33 treats npm-loaded provider models as opaque `LanguageModelV3` objects:

| File:line | Finding |
|---|---|
| [opencode-upstream/packages/opencode/src/provider/provider.ts:1591-1596](file:///home/mk/apps/opencode-upstream/packages/opencode/src/provider/provider.ts) | npm-loaded provider's `sdk.languageModel(model.api.id)` is called once per modelId; returned object is a black-box `LanguageModelV3` |
| [opencode-upstream/packages/opencode/src/session/llm.ts:391-392](file:///home/mk/apps/opencode-upstream/packages/opencode/src/session/llm.ts) | Returned model is wrapped via `wrapLanguageModel({ model: language, middleware: [...] })` — opencode does NOT unwrap or inspect the model's internals |
| [opencode-upstream/packages/opencode/src/session/llm.ts:336](file:///home/mk/apps/opencode-upstream/packages/opencode/src/session/llm.ts) | `streamText({ model, messages, ... })` calls `model.doGenerate(...)` directly via Vercel AI SDK runtime — no opencode-level routing |

The wrapper's `doGenerate` method is treated like any other `LanguageModelV3.doGenerate` — it can do anything internally (multiple sub-calls, custom logic, branching) as long as it returns the standard response shape.

## Consequences

**Good:**
- Cell #15 (files modified in upstream tree) stays at **0** — better than MIN budget (≤1).
- Weekly upstream rebases stay no-op for the wrapper surface, not just tier registration.
- Cell #14 LoC budget is entirely under cheapcode's control (no upstream-source LoC counted).
- Phase 2 implementation is unblocked: a single TypeScript module with the compound-logic class.

**Bad / honest tradeoffs:**
- The wrapper now depends on Vercel AI SDK v3+ `LanguageModelV3` interface stability. Upstream Vercel SDK breaking changes propagate.
- Opencode's middleware pipeline (`wrapLanguageModel(...middleware)`) wraps the wrapper's output — meaning streaming, abort signals, and tool-call mapping must respect both opencode's middleware AND the wrapper's compound pipeline. Gotchas tracked in implementation notes.
- The compound `doGenerate` will issue 5+ OpenRouter calls per `auto` invocation (1 plan + N leaves + 3 best-of-K synthesis + 1 cross-model verifier + maybe 1 retry). Each is its own HTTP request with its own auth + telemetry headers.

**Implementation gotchas (recorded for Phase 2.2):**

1. **Streaming context** — opencode calls with `type: "stream"` in agentic context. The wrapper must respect streaming via `stream()` callback, not just `tokens` array. Internal compound calls can use non-streaming `doGenerate`; only the final response needs to stream.
2. **Tool usage** — preserve `tools` array through forwarding to leaf model calls. Don't strip tool definitions during message forwarding.
3. **AbortSignal** — propagate `abortSignal` from opencode's call into all internal streamText/doGenerate calls so cancellations work.
4. **Message format** — opencode prepends system messages as structured `ModelMessage` objects (role: "system", content: string). Forward correctly.
5. **Provider options** — `sdk.languageModel()` is called with merged provider + model options (line 1593-1595). Wrapper must accept and honor headers, temperature overrides from config.

## Pointer for next agent

Phase 2.2 implementation begins at [src/cheapcode-tiers.ts:178](../../src/cheapcode-tiers.ts#L178) — current `provider` function is a one-line passthrough to `openrouter(target)`. Replace with branching: `if (modelId === "auto") return new CheapcodeAutoModel(...)` else passthrough.

`CheapcodeAutoModel` implements `LanguageModelV3.doGenerate` and `doStream` — defined in a new file `src/auto-wrapper.ts` (estimated ~250 LoC for Arm A MIN tier, +~80 LoC for Arm B substrate glue). Total Phase 2 add: ~330 LoC; cell #14 budget allows ≤500 LoC MIN.

The five gotchas above are non-negotiable. Test each via local dry-run before EXPERIMENT-1.
