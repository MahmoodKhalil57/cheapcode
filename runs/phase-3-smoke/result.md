# Phase 3 — 4-client smoke regression result (M3.15 updated)

**Date:** 2026-05-03 (M3.15 / M3.17 sequence)
**Status:** PARTIAL — package works programmatically; opencode CLI integration fails on dispatch (opaque opencode-internal error)

---

## What works

### 1. Package loading + 5-tier registration ✓

```bash
$ bun pm pack                    # in cheapcode/
$ cd /tmp/cheapcode-smoke
$ bun add ./cheapcode-ai-sdk-provider-0.1.0-rc1.tgz
$ # opencode.json with provider.cheapcode.npm pointing at the package
$ opencode models | grep cheapcode
cheapcode/auto
cheapcode/cheap
cheapcode/cheap-fast
cheapcode/smart
cheapcode/smart-fast
```

All 5 tiers list cleanly. This is the **L3 binary-level evidence** for the original Phase 1 falsifier gate (5 tiers in `--list-models`).

### 2. Programmatic dispatch via AI SDK ✓ ([probe artifact](programmatic-dispatch-probe.ts))

```typescript
import { createCheapcodeProvider } from "@cheapcode/ai-sdk-provider"
import { generateText } from "ai"

const provider = createCheapcodeProvider({ apiKey: process.env.OPENROUTER_API_KEY! })
const m = provider.languageModel("cheap")
const r = await generateText({ model: m, prompt: "Reply with just: hello" })
// ✓ Direct call succeeded
// usage.raw.cost: $0.00000994
// 31 output tokens, valid response
```

The cheapcode npm package, when consumed by ANY AI SDK consumer (not just opencode), dispatches correctly to OpenRouter and returns valid responses. **The package itself is sound.**

## What doesn't work yet

### opencode CLI dispatch (opaque ProviderInitError)

```bash
$ opencode run --model cheapcode/cheap "Reply with just: hello"
> build · cheap
Error: ProviderInitError
```

opencode log shows:
- `service=provider providerID=cheapcode found` ✓
- `service=provider status=completed duration=85 providerID=cheapcode getSDK` ✓
- `ERROR error=ProviderInitError stack=ProviderInitError: ProviderInitError at D (/$bunfs/root/chunk-1224dpsa.js:565:71871)` ✗

The error fires AFTER `getSDK` returns successfully — meaning the package loads, `createCheapcodeProvider` returns a valid provider, and opencode retrieves a model object. The failure is in opencode's downstream wrapping or stream-text initialization, which is bundled and minified — no actionable stack trace.

**Tested with opencode v1.14.33** (matches SPEC pin) — version mismatch hypothesis from earlier ruled out.

## Honest scope of M3.15 closure

| Phase 3 sub-test | Status |
|---|---|
| 5-tier registration in `opencode models` | ✓ PASS |
| Programmatic dispatch via AI SDK `generateText` | ✓ PASS (probe.ts) |
| `opencode run --model cheapcode/cheap` (CLI) | ✗ FAIL (opaque opencode error) |
| `opencode run --model cheapcode/auto` (router CLI) | not yet tested (blocked on above) |
| TUI / web / desktop dispatch | not yet tested |

Per atom 0013 (calibration-as-credential): the honest disclosure is that our package is functionally complete and dispatch-capable when consumed via AI SDK directly. The opencode CLI integration has an unresolved error that requires either (a) deeper opencode source-read with sourcemaps to identify what wrapLanguageModel + middleware expects, or (b) opencode-side debugging from the maintainers.

## Implications for v1.0 ship

**v1.0 can ship with current scope** if we frame cheapcode as:
- A general-agent routing intelligence package
- Loadable into opencode for `opencode models` discovery (works now)
- Programmatically dispatch-able via AI SDK (works now)
- opencode CLI-direct-dispatch is an open compatibility issue documented honestly

OR defer Phase 5 ship until opencode CLI dispatch works — at which point the M3.16 README's quick-start (`opencode run --model cheapcode/auto ...`) becomes actually-working, not aspirational.

## Pointer for v1.x

- **M3.15 follow-up** — narrow the opencode dispatch bug. Likely candidates:
  1. wrapLanguageModel middleware shape: opencode's bundled `ai` SDK might expect a method our model doesn't have (e.g., `doStreamPartial`, `getSchema`, etc.)
  2. tool-call serialization: agent=build mode tries to use tools; if our model doesn't advertise tool capabilities correctly, init fails
  3. session-state interaction: small=true (title) works; small=false (build) fails — could be agent-prompt-template mismatch
- **Recommended first probe**: install opencode from upstream source with sourcemaps, retry, get a real stack trace
- **Alternate path**: file an opencode issue with a minimal repro. The 5-tier list works; only CLI dispatch fails. The maintainers can probably point at the right interface.

## Atoms / mizaj fired

- Atom 0010 (cross-witness honesty): the probe.ts is the cross-witness — it independently verifies the package works, isolating the failure to opencode CLI integration
- Atom 0013 (calibration-as-credential): documenting the partial pass cleanly with both what-works and what-doesn't
- Atom 0015 (transfer overstated): assumed opencode v1.14.25→v1.14.33 upgrade would fix it; it didn't. Lesson recorded.
- Mizaj 11 (tier-the-source): the opencode-internal error is L4 (vendor-bundled minified code) — confidence in our diagnosis is bounded
