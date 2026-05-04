# Multi-account wiring recipe — how to integrate M3 into `cheapcode-tiers.ts`

**Status:** ready-to-apply. Three new modules ship behind this recipe; operator decides when to wire in.

**Authored:** 2026-05-04 (round 96-close), companion to [`multi-account-groundwork.md`](multi-account-groundwork.md).

---

## What's new in `src/`

| File | Lines | Purpose |
|---|---|---|
| `src/account-registry.ts` | 270 | Schema + loader + pure resolution function (M2) |
| `src/account-registry.test.ts` | 29 tests | Schema validation, FS loader, resolution rules |
| `src/auth-resolver.ts` | 230 | Resolves `auth_ref` strings → `ResolvedAuth` (oauth or api-key) |
| `src/auth-resolver.test.ts` | 34 tests | Format parsers, FS read, env read, expiry check |
| `src/dispatch-with-account.ts` | 165 | Composes the above into `dispatchWithAccount<T>()` generic wrapper |
| `src/dispatch-with-account.test.ts` | 13 tests | Happy path + 3 error paths + 3-account realistic scenario |

**Total: 76 tests, 100% pass.** Zero patches to opencode. Zero modifications to existing `cheapcode-tiers.ts` / `auto-wrapper.ts` / `router.ts`.

---

## How to enable multi-account at the operator's pace

### Option 1 — keep using single-account today (no change required)

Multi-account is *strictly additive*. Nothing changes for existing users. `OPENROUTER_API_KEY` env var continues to work. The new modules sit unused until wired in.

### Option 2 — opt-in by intercepting at LanguageModelV2 layer

**Important architectural finding (2026-05-04 round 96-close):** the original recipe described a "tiny wrapper" pattern. After reading `cheapcode-tiers.ts` more carefully, the proper integration is deeper than that: `createCheapcodeProvider` constructs SDK clients **once at provider-init time** with a single `apiKey`. Multi-account decisions are per-dispatch (depend on quota state at call time). So the integration must intercept at the `LanguageModelV2.doGenerate()` call boundary, not at provider construction.

Concrete integration shape (adjust to LanguageModelV2 interface from your bundled `ai` package):

```typescript
// New file: src/multi-account-language-model.ts
import type { LanguageModelV2 } from "ai"
import { dispatchWithAccount } from "./dispatch-with-account"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

export function wrapWithMultiAccount(
  baseModel: LanguageModelV2,
  registry: AccountRegistry,
  targetModel: string,
  quotaState?: () => Map<string, number>,
): LanguageModelV2 {
  return {
    ...baseModel,
    async doGenerate(options) {
      const out = await dispatchWithAccount({
        registry,
        targetModel,
        quotaRemaining: (acc) => quotaState?.()?.get(acc.id) ?? 1.0,
        dispatch: async (input) => {
          // Construct fresh SDK client with chosen account's auth
          const apiKey = input.auth.kind === "api-key" ? input.auth.key : input.auth.access
          const client =
            input.account.provider === "openai"
              ? createOpenAI({ apiKey })
              : createOpenRouter({ apiKey })
          // Dispatch through the fresh client
          const modelId = targetModel.replace(/^[^/]+\//, "")
          return client(modelId).doGenerate(options)
        },
      })
      // Attach attribution to result for daftar capture
      return { ...out.result, providerMetadata: { cheapcode: out.attribution } }
    },
    // doStream: similar pattern
  }
}
```

Then in `cheapcode-tiers.ts`, the only edit needed:

```typescript
const baseModel = openrouter(targetModel)
const wrapped = registry.accounts.length > 0
  ? wrapWithMultiAccount(baseModel, registry, targetModel)
  : baseModel
return wrapped
```

**Why I am not applying this myself in this session:** the LanguageModelV2 interface has a non-trivial surface (`doGenerate`, `doStream`, `defaultObjectGenerationMode`, etc.). Getting the wrapper exactly right requires reading `node_modules/ai/dist/index.d.ts` for the current shape AND testing against the existing call sites. That's a focused 1-2 hour task best done as its own scoped session — not bolted onto this multi-account-modules turn.

**Bridge tooling shipped for verification:** `bin/cheapcode-account-status` exercises the M2+M3a+M3b modules against real `~/.local/share/opencode/auth.json` without needing the LanguageModelV2 integration. Validates the auth-resolution and account-selection paths end-to-end TODAY:

```bash
# Drop ~/.config/cheapcode/accounts.json with your account list, then:
bun ~/apps/cheapcode/bin/cheapcode-account-status
bun ~/apps/cheapcode/bin/cheapcode-account-status --target openai/gpt-5.5
bun ~/apps/cheapcode/bin/cheapcode-account-status --target openai/gpt-5.5 --quota openai-personal=0.05
# Output prints account labels, expiry, selected account per priority+quota.
# Credential VALUES never written to stdout (only labels + lengths + expiry).
# Exits non-zero if any account fails to resolve auth (CI-friendly).
```

This is the M4-style verification we have today — proves the *resolution pipeline* works against real credentials. Real *dispatch* through opencode TUI is still BLOCKED on the LanguageModelV2 wrapper above.

```typescript
// At top of file:
import { loadRegistry, type AccountRegistry } from "./account-registry"
import { dispatchWithAccount, type AccountDispatchInput } from "./dispatch-with-account"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

// Loaded once at provider-init time (lazy):
let _registry: AccountRegistry | null = null
function getRegistry(): AccountRegistry {
  if (_registry === null) _registry = loadRegistry() // reads ~/.config/cheapcode/accounts.json
  return _registry
}

// Replace direct OpenRouter/OpenAI client construction with:
async function dispatchTier(targetModel: string, prompt: unknown): Promise<unknown> {
  const registry = getRegistry()
  if (registry.accounts.length === 0) {
    // Backward-compat: no registry → fall through to existing single-account path
    return existingSingleAccountDispatch(targetModel, prompt)
  }
  const out = await dispatchWithAccount({
    registry,
    targetModel,
    quotaRemaining: (acc) => /* lookup from existing quotaState */,
    dispatch: async (input: AccountDispatchInput) => {
      const client =
        input.account.provider === "openai"
          ? createOpenAI({ apiKey: input.auth.kind === "api-key" ? input.auth.key : input.auth.access })
          : createOpenRouter({ apiKey: input.auth.kind === "api-key" ? input.auth.key : input.auth.access })
      return client(targetModel.replace(/^[^/]+\//, "")).doGenerate({ prompt })
    },
  })
  // out.attribution is ready for daftar metadata_json
  return out.result
}
```

**Why this is safe to apply now even without a registry:** the `registry.accounts.length === 0` early-exit means existing behavior is bit-for-bit identical until the operator places an `accounts.json` on disk.

### Option 3 — defer indefinitely

The modules ship behind the wrapper. They're tested. They cost nothing to leave dormant. When multi-account becomes a felt need (per [`multi-account-groundwork.md`](multi-account-groundwork.md) "Why defer this until later" section), the recipe is ready.

---

## What the operator needs to do for M4 (end-to-end verification)

### Step 1 — author `~/.config/cheapcode/accounts.json`

Minimal example (just the operator's existing OpenAI OAuth):

```json
{
  "version": 1,
  "accounts": [
    {
      "id": "openai-personal",
      "label": "Personal ChatGPT Plus",
      "provider": "openai",
      "auth_type": "consumer-oauth",
      "auth_ref": "~/.local/share/opencode/auth.json#openai",
      "capabilities": ["*"],
      "tier": "subscription",
      "priority": 100
    },
    {
      "id": "openrouter-default",
      "label": "OpenRouter universal fallback",
      "provider": "openrouter",
      "auth_type": "api-key",
      "auth_ref": "env:OPENROUTER_API_KEY",
      "capabilities": ["*"],
      "tier": "paid-per-token",
      "priority": 10
    }
  ]
}
```

This already gives multi-account behavior with two providers — cheapcode picks `openai-personal` first, falls to `openrouter-default` when OpenAI unavailable.

### Step 2 — log into a SECOND OpenAI account if you want true multi-account-per-provider

If you want two OpenAI accounts, you need to extend opencode's auth.json schema (which today supports only one `openai` key). Two paths:

- **Simpler:** add an `openai-team` API key as a second account using `env:OPENAI_API_KEY_TEAM`. No opencode auth.json change needed.
- **OAuth-on-OAuth:** opencode upstream would need to support multiple oauth entries per provider. Today it doesn't. cheapcode can't fix this without a fork-patch on opencode itself — exactly the line we said we wouldn't cross.

**Recommended for M4:** stick to the "1 OAuth + 1 API-key" pattern above. Demonstrates multi-account routing without touching opencode auth schema.

### Step 3 — verify the dispatch picks the right account

Once the wrapper is wired (Option 2) and `accounts.json` exists:

```bash
# Run a trivial prompt through cheapcode/cheap-fast (cheapest tier)
opencode run --model=cheapcode/cheap-fast "say hello"

# Check daftar for the receipt; verify metadata_json.account_id was recorded
~/apps/adam/tools/daftar/bin/daftar query "cheap-fast" --project=/home/mk/apps/cheapcode --limit=1
```

### Step 4 — exhaustion test (optional)

Force-exhaust the personal account's quota in the quotaState (e.g., set quotaRemaining → 0.05 for the OpenAI provider) and verify the next dispatch picks the OpenRouter fallback. The unit tests in [`dispatch-with-account.test.ts`](../src/dispatch-with-account.test.ts) "realistic 3-account scenario" already cover this logic offline; M4 just confirms it works against real opencode.

---

## What this recipe does NOT do (deliberately)

- **Does not refresh expired OAuth tokens.** OAuth refresh flow is `M3.x+` scope — `dispatchWithAccount` provides an `onAuthExpired` callback so the caller can refresh + retry, but the actual refresh implementation is not in this batch.
- **Does not fork opencode auth.json schema.** Opencode keeps one provider-keyed entry per provider. Multi-account-per-provider is achieved by ALL accounts pointing at the same `auth.json#openai` entry but with different `id`/`priority` — useful for billing-attribution today, not for true credential-multiplexing within OAuth.
- **Does not add a UI for account-management.** Operator manages `accounts.json` directly. UI surface is deferred until there's a felt-need + opencode-side rendering hooks to use. This is *exactly* the bab/khatim failure mode we're avoiding.
- **Does not implement managed-pool refs** (the `managed-pool:<id>` format is parsed but throws "unsupported" — added now so the wire format is forward-compatible).

---

## Testing in isolation (always available, no opencode dependency)

```bash
cd ~/apps/cheapcode
bun test src/account-registry.test.ts src/auth-resolver.test.ts src/dispatch-with-account.test.ts
# Expected: 76 pass, 0 fail
```

This runs without opencode, without network, without real credentials. Tests are the audit-bearing artifact for the multi-account layer.

---

## Daftar receipt for this recipe

```
bun ~/apps/adam/tools/daftar/bin/daftar add note \
  --project="/home/mk/apps/cheapcode" \
  --title="Multi-account wiring recipe (M3c) shipped — operator-paced integration" \
  --body="docs/multi-account-wiring-recipe.md provides the exact integration recipe for cheapcode-tiers.ts. Three options: (1) keep single-account, no change; (2) opt-in via small wrapper using accountRegistry early-exit pattern; (3) defer indefinitely. Sample accounts.json given. M4 end-to-end test path documented. Three failure modes explicitly NOT addressed (OAuth refresh, opencode auth.json schema fork, account-management UI) per scope discipline."
```
