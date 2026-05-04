# Multi-account labeled-provider architecture (groundwork)

_Status: design proposal, not implemented. M3.53 (quota-aware routing) is the foundation; this doc captures what would need to be added to support multiple labeled providers and multiple accounts per provider._

## What's already in place after M3.52 + M3.53

- `RouterOptions.quotaState` — sliding-window dispatch tracker per `(provider, model)` key
- `RouterOptions.quotaFallbacks` — per-target fallback map ("openai/gpt-5.4-mini" → "openrouter/openai/gpt-5.4-mini")
- Persistent state at `~/.config/cheapcode/quota.json` survives sessions
- Per-dispatch tracking in `auto-wrapper.ts` calls `trackDispatch(state, provider, model)` after each LLM call
- Rule D in `route()` consults `quotaRemaining(state, provider, model)` and switches to fallback when below `quotaFloor`

This handles the **single-account-per-provider** case for unlimited fallback chains.

## What's missing for multiple accounts

Today the quotaState key is `${provider}::${model}`. For multiple accounts per provider, the key becomes `${provider}::${accountLabel}::${model}` and the router picks among accounts based on:

1. Per-account remaining quota (highest first)
2. Per-account capability (some accounts have access to GPT-5.5 Pro, others don't)
3. Per-account cost class (a free-tier account is preferred over paid until quota exhausts)
4. Per-account latency profile (some accounts route through specific datacenters)

## Proposed schema additions

### Account registry: `~/.config/cheapcode/accounts.json`

```json
{
  "accounts": [
    {
      "id": "openai-personal",
      "label": "Personal ChatGPT Plus",
      "provider": "openai",
      "auth_type": "consumer-oauth",
      "auth_ref": "~/.local/share/opencode/auth.json#openai",
      "capabilities": ["gpt-5.4-mini", "gpt-5.4-mini-fast", "gpt-5.4", "gpt-5.5", "gpt-5.5-pro"],
      "tier": "subscription",
      "priority": 100
    },
    {
      "id": "openai-team-1",
      "label": "Team API key (saastemly)",
      "provider": "openai",
      "auth_type": "api-key",
      "auth_ref": "env:OPENAI_API_KEY_TEAM",
      "capabilities": ["gpt-5.4-mini", "gpt-5.5", "gpt-5.5-pro"],
      "tier": "paid-per-token",
      "priority": 50
    },
    {
      "id": "openrouter-default",
      "label": "OpenRouter (universal fallback)",
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

### Router decision flow (extended)

```
1. Classify shape (existing)
2. Apply substrate rules (M3.52 — actionSafety, ceilingCap, daftarDisagreement)
3. Look up TARGET MODEL (existing)
4. NEW: candidate-account-resolution
     a. List accounts with capability for target model
     b. Filter to accounts with quota remaining > floor
     c. Sort by priority desc; if tied, by quota remaining desc
     d. Pick top → dispatch
     e. If none survive: fall back to next-rung-down model + restart at 4a
5. Track dispatch under chosen account
```

### State extensions

```ts
type AccountQuotaWindow = QuotaWindow & {
  accountId: string
}

type QuotaState = {
  windows: Record<string, AccountQuotaWindow>  // key: `${accountId}::${model}`
  // ...
}

type RouterOptions = {
  // ...
  accounts?: Account[]
  preferredAccountId?: string  // for explicit selection / debugging
}
```

### What gets tested

| Test | Expected behavior |
|---|---|
| 2 OpenAI accounts, primary at 95% quota → both available | Picks primary (priority 100 over team's 50) |
| 2 OpenAI accounts, primary at 5% quota | Drops to team account (priority 50, full quota) |
| Both OpenAI accounts exhausted | Falls back to OpenRouter |
| Capability mismatch: target needs gpt-5.5-pro, only personal has it | Picks personal even if quota lower |
| Account with auth-failure response | Marks account temporarily-unavailable for 5min, picks next |

## Auth-resolution layer

The hardest part is bridging cheapcode's account-labels → opencode's auth.json + env vars. Current opencode has a single `auth.json` with one entry per provider. Multi-account per provider would need:

- Either: extend opencode auth.json schema to support multiple entries per provider with labels (fork-patch on opencode auth flow)
- Or: cheapcode-side credential vault at `~/.config/cheapcode/credentials.json` (cheapcode owns the multi-account state, opencode sees only one provider entry per API call via dynamic injection)

Cleaner path: cheapcode-side vault. Opencode stays one-account-per-provider (its model); cheapcode multiplexes underneath by switching credentials at dispatch time. Would require:

- A credential-injection layer in `cheapcode-tiers.ts` that constructs SDK clients with the chosen account's auth on each call
- An auth-test ping at session-start to mark stale accounts unavailable

## Why defer this until later

The single-account quota-aware path (M3.53) ships value today: most operators have ChatGPT Plus + OpenRouter, and the fallback chain works for them. Multi-account is a "v2 ergonomics" feature that mostly serves teams + power users.

Suggested trigger for building it:
- Operator hits the case where they want to run cheapcode against TWO ChatGPT Plus accounts simultaneously (parallel work)
- OR they want to attribute usage per account for billing/audit
- OR they're running in a team setting where account credentials are shared

When that happens, this doc is the spec. Until then, M3.53's single-account-with-fallback covers ~90% of real usage.

## Notes on per-account daftar attribution

For audit-discipline (atom 0013 calibration-as-credential), each daftar receipt should record WHICH account the dispatch went through. This lets the operator query "what was the cost-per-task for my Personal-Plus vs Team-API account in the last week" via daftar. Schema: add `account_id` field to the `metadata_json` of every dispatch receipt.

This IS implementable today with the existing daftar schema (metadata_json is freeform). When multi-account ships, this becomes the audit backbone.
