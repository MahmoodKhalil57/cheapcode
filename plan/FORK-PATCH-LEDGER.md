# Cheapcode fork patch ledger

**Purpose:** every patch we apply to `cheapcode-opencode` (vs `sst/opencode`
upstream) lives here with a one-line reason + upstream-compat risk + the
test that proves it still works. When we merge upstream, this is the
checklist that re-verifies cheapcode's identity survived the merge.

**Stability inheritance** (set 2026-05-05):
- opencode upstream is the source of truth for: UI shell, auth flows,
  session API, tool harness, streaming, MCP, provider catalog, web app.
  18k forks / 155k stars / 4.6k issues / 1.7k PRs — mature.
- cheapcode owns: auto-router, tier classifier, substrate hooks
  (mizan/burhan/daftar/khazīna/mizaj), multi-account credential pool +
  cooldown + quota, OAuth-failover dispatch (codex / Copilot multi-family),
  agent self-balancing statements (M24).

The fork patches below are **the only places** cheapcode mutates opencode
code itself. Everything else lives in `cheapcode/src/` (the npm package
opencode loads as a provider) or `cheapcode/packages/adam-plugin/` (the
opencode plugin).

---

## Active fork patches (vs `upstream/dev`)

Maintain in chronological order — newest at top, oldest at bottom.

### 1. `packages/core/src/global.ts` — M22 isolation
- **Commit:** `4293cb34a` — `feat(global): nest XDG paths under cheapcode/opencode/ when CHEAPCODE_FORK=1`
- **Lines changed:** ~10
- **Why:** zero shared filesystem state with vanilla opencode. Friend can install both side-by-side.
- **Upstream-compat risk:** **low**. Single conditional in path-derivation logic. Upstream rarely touches this file.
- **Compat test:** `bun test`'s 457-pass suite + sandboxed `cheapcode web` doesn't write to `~/.local/share/opencode/`.
- **If it conflicts on merge:** keep our `isCheapcode` branch on top of upstream's path setup; the env-gated branch is purely additive.

### 2. `packages/app/src/components/settings-general.tsx` — M21 update tile
- **Commit:** `94fc563de` — `feat(settings): cheapcode tile in Settings → General`
- **Lines changed:** ~70 (additive)
- **Why:** non-tech users discover updates without a terminal.
- **Upstream-compat risk:** **medium**. settings-general.tsx is actively iterated upstream (we already accept their `UpdatesSection`). Our `CheapcodeSection` is `Show`-gated so it's invisible without `cheapcode-info.json`.
- **Compat test:** mount the settings page in browser, verify CheapcodeSection renders only when our JSON is served.
- **If it conflicts on merge:** re-place the `<CheapcodeSection />` mount point next to `<UpdatesSection />`. The component logic itself is self-contained.

### 3. `packages/app/src/components/settings-models.tsx` — M16 per-credential model toggles
- **Commit:** `9d38280c1` — `feat(models): per-credential model lists in Settings → Models`
- **Lines changed:** ~30
- **Why:** operators with multiple credentials per provider can toggle model visibility per account.
- **Upstream-compat risk:** **medium**. The `connected` mapping logic could change upstream.
- **Compat test:** sandbox with 2× openai entries, confirm 2 separate Models sections.

### 4. `packages/app/src/components/settings-providers.tsx` — M16 multi-account UI
- **Commits:** `28d410423`, `85cd4d7c1`, `da4816c44`
- **Lines changed:** ~80
- **Why:** "+ Add another" button + per-credential rows + Disconnect-per-account.
- **Upstream-compat risk:** **medium-high**. settings-providers.tsx is a hot iteration zone upstream.
- **Compat test:** Connect → Add another → Connect → confirm 2 rows + auth.json has both keys.

### 5. `packages/app/src/components/dialog-connect-provider.tsx` + `dialog-name-credential.tsx` — M16 alias OAuth
- **Commits:** `c3101c901`, `7dba9e71d`, `da4816c44`
- **Lines changed:** ~50 (mostly new dialog)
- **Why:** aliased OAuth flow saves under user-chosen name without overwriting the canonical entry.
- **Upstream-compat risk:** **medium**. Dialog API depends on `Dialog`/`TextField` props that have changed before.
- **Compat test:** open "+ Add another" dialog, type alias, OAuth callback, verify auth.json key.

### 6. `packages/opencode/src/auth/index.ts` + `provider/auth.ts` + server route handlers — M16 alias passthrough
- **Commits:** `d5171dbe4`, `6791f5206`
- **Lines changed:** ~20
- **Why:** server side honors `alias` in OAuth callback body so the dialog's selection actually saves under the alias.
- **Upstream-compat risk:** **low-medium**. Auth schema is stable; route handler destructure pattern is the conflict zone.
- **Compat test:** complete an OAuth alias flow end-to-end; auth.json shows both `<canonical>` and `<canonical-alias>` keys.

### 7. `packages/sdk/js/src/v2/gen/sdk.gen.ts` + `types.gen.ts` — M16 SDK alias param
- **Commit:** `9b52f7512`
- **Lines changed:** ~14 (in generated code)
- **Why:** the `alias` field in the OAuth callback body must be in the v2 SDK's `buildClientParams` mapping.
- **Upstream-compat risk:** **high**. This is GENERATED code (regenerated from openapi spec); upstream regen will obliterate our edit.
- **Compat test:** v2 SDK's `oauth.callback({ ..., alias })` actually sends alias in the POST body.
- **Long-term fix:** patch the openapi spec / hey-api config so regen produces our shape natively. **This is the highest-priority technical debt to retire.**

### 8. `packages/opencode/src/server/shared/ui.ts` — OPENCODE_UI_DIST + OPENCODE_UI_UPSTREAM
- **Commits:** `0dec8fe2e`, `c323ff3d8`, `224784858`, `c3b3cedcf`, `63287fe34`
- **Lines changed:** ~30
- **Why:** serve our pre-built `packages/app/dist` via env var so cheapcode patches the UI without needing to reinvent the build pipeline. Falls back to upstream proxy when missing.
- **Upstream-compat risk:** **low**. Surgical addition to the route handler.
- **Compat test:** `cheapcode web` serves our dist; vanilla `opencode web` continues to proxy upstream.

---

## Upstream-merge protocol

### Cadence
- **Every 2 weeks**, OR when upstream tags a release: rebase or merge `upstream/dev` into our `dev` branch. Bias toward MERGE not REBASE — preserves the cheapcode commit history per the patch ledger above.

### Pre-merge checklist
1. `git fetch upstream`
2. Read `git log upstream/dev..HEAD` — that should match the patches in this ledger. If commits exist that aren't in the ledger, **add them to the ledger first** before merging.
3. `git diff upstream/dev..HEAD --stat | head` — confirm the surface area is what we expect.
4. Snapshot the cheapcode test pass count (`cd ~/apps/cheapcode && bun test`).

### Merge
1. `git merge upstream/dev` (ours strategy where the conflict is purely cosmetic; otherwise resolve manually patch-by-patch).
2. For each patch in the ledger: re-verify the compat test passes. Note any patch that conflicted into `plan/M22-MERGE-LOG.md` with date + resolution.
3. **Ledger sweep**: any patch that's been upstreamed into vanilla opencode (= the upstream code now does what we patched) gets removed from the ledger AND from our commit history (cherry-pick our commits that revert the obsolete patches).
4. Run cheapcode's full suite in a fresh sandbox: `bun test && cheapcode update --force && cheapcode web` smoke.

### Post-merge
1. Push to `MahmoodKhalil57/opencode` `dev` branch.
2. `cheapcode update` from operator end picks it up.
3. Friend's auto-update banner picks it up within 24h (per M21 cache TTL).

### Hard rules
- **No new fork patches without a ledger entry.** If you change opencode source, write the entry in the same commit.
- **Prefer plugin > fork.** If something can be done via opencode's plugin API, do it there (`packages/adam-plugin/` in cheapcode) instead of patching the fork.
- **The cheapcode npm package (`@cheapcode/ai-sdk-provider`) is the load-bearing surface.** Most cheapcode work happens there, not in the fork. Fork patches are reserved for things you can't do as a provider/plugin (e.g., M22 path isolation, M16 multi-account UI dialog).

---

## Identity contract

Cheapcode is "what opencode would be if it had a substrate-disciplined
auto-router baked in." Specifically:

- **Inheriting** opencode's UX/DX/maturity — we don't reinvent the chat
  surface, the auth flows, the model picker, the session model.
- **Adding** the auto-router (`cheapcode/auto`), credential-pool failover,
  Copilot multi-family + consumer-Plus OAuth dispatch, M19 canon
  injection (opt-in), M24 agent self-balancing statements (subset {2,4}).
- **Validated by** receipts (M17 paired-benchmark, M19 7-axis scorecard,
  M24 4-probe scorecard) — never by vibes.

The maintenance disciplines that keep this true:
1. New cheapcode features land in `cheapcode/src/` first; only patch the
   fork if the feature truly cannot be done as a provider/plugin.
2. Every fork patch has a ledger entry with compat-risk + compat-test.
3. Upstream merges happen on a regular cadence; ledger is the checklist.
4. Receipts trump claims. If a feature regresses a probe, ship it
   opt-in — don't ship it on by default just because it looks operational.
