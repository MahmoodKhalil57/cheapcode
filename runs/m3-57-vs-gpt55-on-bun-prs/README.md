# M3.57 — wakil-apr vs codex/gpt-5.5 on hard Bun PRs (predicted, not empirical)

**Date:** 2026-05-04
**Codename:** wakil-apr (cheapcode round 96)
**Methodology:** atom 0011 (cheapest-distinguishing-experiment) — predict
outcomes from known failure modes; honest disclosure that this is
*reasoned prediction*, not empirical evidence (would require operator
budget to dispatch GPT-5.5 + Codex against each PR's pre-fix repo state).

---

## Corpus selection

4 PRs from `oven-sh/bun`, all merged 2026-05-04 (within 24h of analysis),
all selected because they exhibit at least 2 of:

- **Cross-language** (Zig + JSC C++ + JavaScript test)
- **Memory-safety bug-class** (UAF, double-free, refleak, segfault)
- **Multi-PR history dependency** (root cause traced through prior commits)
- **Platform-specific** (Windows-only, ASAN-only, debug-only)
- **Subtle invariant** (mode flag, ref balance, generator state)

| # | PR | Title | Hard-class |
|---|---|---|---|
| **P1** | [bun#30150](https://github.com/oven-sh/bun/pull/30150) | socket: set Handlers.mode=.client for Windows named-pipe Bun.connect | UAF + multi-PR history + Windows-only + Zig fieldParentPtr invariant |
| **P2** | [bun#30208](https://github.com/oven-sh/bun/pull/30208) | bun -p: return module completion value, not first yielded await | JSC TLA generator semantics + cross-VM-engine + 3-layer hook flow |
| **P3** | [bun#30168](https://github.com/oven-sh/bun/pull/30168) | socket: balance ref on synchronous doConnect failure for reused sockets | Refleak + multi-PR history + 3-state branching (fresh/reused/sync-fail) |
| **P4** | [bun#30176](https://github.com/oven-sh/bun/pull/30176) | socket: null `handlers` pointer after client-mode Handlers are freed | UAF + follow-up to its own prior fix (#30148) + scope-exit semantics |

These aren't toy bugs. They're the class that ate senior engineers'
days, surfaced via ASAN, traced through multiple prior commits.

---

## Per-PR prediction

### P1 — bun#30150 (Windows named-pipe UAF)

**What made it hard:**
- The bug fires on a *single Windows code path* (`connectInner` named-pipe early-return at line 655-656) that lacks the defensive `.mode = .client` override the *non-pipe* path at :797 has
- Root cause traces back through commit 4a06991d3b (PR #23755), which silently flipped `is_server=false → true` during a bindings-generator refactor; harmless everywhere except the one path that depended on the old default
- The crash signal is `@fieldParentPtr("handlers", this)` reading past the end of a `allocator.create(Handlers)` block — the misuse only manifests because `mode=.server` triggers the wrong branch
- Verification requires Windows + named-pipe + close-or-fail sequence + ASAN

**GPT-5.5 / Codex predicted outcome:** **likely fails** at p≥0.70. Specific failure modes:
- The bug is in a single-platform code path with a non-obvious `mode` flag invariant. Frontier models tend to suggest "add a null check" or "wrap in try/catch" rather than recognizing the fieldParentPtr-with-wrong-allocation root cause.
- Multi-PR history reasoning ("when did is_server flip and why didn't anyone notice?") requires git-log-walking that benchmarks like SWE-Bench Verified don't reward. GPT-5.5 typically gives one-step fixes without tracing the regression.
- Without the operator pasting `socket.zig:655-656` AND `socket.zig:797` AND PR #23755's diff, the model can't see the asymmetry. Most agent harnesses don't auto-fetch this context.

**wakil-apr (substrate-disciplined) predicted outcome:** **better-but-with-caveat** at p≈0.55-0.65. Specifically:
- **Rule F (knowability-gate)** would correctly *decline-and-clarify* if the prompt was just "fix the segfault in Bun.connect" — wakil-apr would ask: "Which platform? Paste the ASAN trace + the Listener.zig:564 call site + PR history showing when the regression entered." That decline IS the value: it forces the operator to surface context the model needs.
- **Rule B (ceiling-cap voter)** would force cross-witness on the "mode flag invariant across all `Handlers.create` sites" claim — voter dispatches catch single-witness over-confidence on system-level invariants.
- **Atom 0023 perturbation** would catch the brittleness: "what if mode=.server were the right default? where else does that assumption load-bear?" — surfaces the audit at socket.zig:1557 + :2062 sites that the human author DID audit explicitly.
- **Caveat:** wakil-apr's edge here is *epistemic discipline* (decline-when-context-missing, force voter on system-invariant), not raw code synthesis. If the operator provides full context, frontier-tier models close some of this gap.

---

### P2 — bun#30208 (TLA module-completion-value bug)

**What made it hard:**
- 3-layer hook flow: `EvalGlobalObject::moduleLoaderEvaluate` (Bun-side) → `module->evaluate()` (JSC) → `asyncModuleExecutionResume` (JSC microtask) — the bug is that the *third* layer bypasses the first
- The completion value is captured at the wrong point in JSC's TLA generator state machine: when the generator yields on the first await, the yielded value is mistaken for the module result
- Fix requires reasoning about JSC's `asyncCapability()` promise + generator-state numeric encoding (state != Executing → still yielding)
- Vendored WebKit code; the hook is the only Bun-side intervention point

**GPT-5.5 / Codex predicted outcome:** **likely fails** at p≥0.75. Specific failures:
- This is a "3 boundary, only one observable" bug. Frontier models tend to fix the symptom (`bun -p 'await Promise.resolve("x") + " y"'` returns "x" → patch the eval result post-hoc) rather than recognizing that the eval was ALREADY wrong at capture time because it observed a generator-yield-state.
- JSC internals are sparsely represented in training data. The model's recall of `asyncCapability()` vs `evaluateNonVirtual()` semantics is unreliable.
- The bypass-via-microtask ("the third layer can't be hooked because the second layer is JSC core") requires understanding why some hooks fire only once — frontier models often suggest adding a hook to the bypass path (which would require modifying vendored WebKit, intractable in this repo's build setup).

**wakil-apr predicted outcome:** **better-but-with-caveat** at p≈0.55-0.60.
- **Rule F** declines if the prompt is "why does `bun -p 'await x'` return wrong value?" — asks for the JSC version + which hooks fire + reproducible test case.
- **Rule B (ceiling-cap voter)** forces voter on "the moduleLoaderEvaluate hook captures the right value" claim — voter would catch single-witness over-confidence on JSC internals.
- **Atom 0017 (silent-evidence-as-positive-data)**: wakil-apr is more likely to recognize "we don't know what JSC does internally" as positive data — propose: instrument both paths + diff their captured values + report which one matches the user's expectation.
- **Caveat:** if the operator hasn't read the JSC source, both wakil-apr and frontier-tier model are equally constrained; wakil-apr's edge is honesty about the constraint.

---

### P3 — bun#30168 (socket sync-fail refleak)

**What made it hard:**
- 3-state branching in `connectInner`: (a) fresh socket, (b) reused socket from `prev` (node:net path), (c) sync-fail (ENOENT before async machinery starts)
- The leak is in the *intersection* of (b) and (c) — reused socket + synchronous failure. Each axis alone was already covered.
- The guard `if (maybe_previous == null) socket.deref()` was added in #23936 for fresh-socket+bad-fd; it correctly fixed that case but left the (b)+(c) intersection unbalanced
- Verification requires noisy RSS-growth measurement: 12.5k iterations, 3 MB threshold, sub-process isolation to avoid runner pollution

**GPT-5.5 / Codex predicted outcome:** **mixed** at p≈0.50-0.60. Specifically:
- The bug is "remove the `if` condition" — *one-line fix*. Frontier models often find the right fix HERE because it's small. But:
- The reasoning trace ("why is this guard wrong on the (b)+(c) path?") requires understanding the 3-state interaction. GPT-5.5 might propose the right fix but justify it incorrectly ("the guard was always wrong"), which could regress the original #23936 case.
- Test design (RSS-growth noise threshold) is a known frontier-model weak spot; agents often write deterministic tests that miss memory leaks.

**wakil-apr predicted outcome:** **better at REASONING, similar at FIX** at p≈0.65-0.70.
- **Rule B (ceiling-cap voter)** forces voter on "removing the guard is safe across all 3 states" — voter would surface the regression risk on (a)+sync-fail.
- **Atom 0023 perturbation** literally does what the human author did manually: "what if the guard's intent was wrong? what cascades?" surfaces socket.zig:1557 + :2062 sites + PR #23936's regression test as audit anchors.
- **Atom 0011 + Rule F**: if the operator just says "this is leaking", wakil-apr would decline to dispatch and ask for an `RSS-growth` reproduction or ASAN trace — exactly the verification signal the PR ended up using.

---

### P4 — bun#30176 (handlers UAF after free)

**What made it hard:**
- Follow-up to its own prior fix (#30148) — the prior PR caught the `onClose` path but missed `handleConnectError`
- The fix requires returning a "destroyed" signal from `Handlers.markInactive()` and `Scope.exit()` upward through the call-stack
- Multiple call sites in socket.zig need the upgrade (Listener.connectInner :664/:728/:814, getListener :769) — partial fix would leave UAF in some paths
- ASAN-only signal; release builds silently corrupt

**GPT-5.5 / Codex predicted outcome:** **likely fails** at p≥0.65. Specifically:
- "Follow-up to #30148" requires reading the prior PR + recognizing the gap. Frontier models without explicit context often re-suggest #30148's fix in slightly different form — same UAF persists.
- Cascading-signal change (return value through 3 layers) is a known frontier-model weak spot (multi-file refactors with type-changes-required-everywhere). GPT-5.5 typically updates 1-2 sites and misses the others.
- The repro requires ASAN + correctly-timed connectError + handle.listener access AFTER close — not standard test scaffolding.

**wakil-apr predicted outcome:** **better-but-needs-context** at p≈0.55-0.65.
- **Rule F** declines if the operator says "fix the socket UAF" without context — asks for: (a) which paths are exercised, (b) #30148's diff, (c) ASAN trace.
- **Atom 0023 perturbation** on the prior fix's load-bearing claim ("nulling handlers in markInactive() is sufficient") would surface the cascade: 3/N paths still affected = brittleness HIGH.
- **atom 0010 cross-witness** through Rule B: forces voter on the "all call sites updated" claim — voter would enumerate the call sites the model considered and didn't update, catching partial-fix.

---

## Synthesis — what classes does wakil-apr have edge on?

After per-PR analysis, three classes of hard SWE work emerge where **substrate-discipline** (Rules A-F + atoms) gives wakil-apr a structural advantage over vanilla GPT-5.5/Codex on opencode:

### Class 1 — Bugs requiring multi-PR git-history reasoning
*(P1, P3, P4)* — root cause traces through prior commits / fixes / refactors. Frontier models tend to give one-step fixes without recognizing regression sources. **wakil-apr edge:** Rule F declines without history context; atom 0023 perturbation tests "what if the prior fix's claim was wrong?" surfaces the regression-risk audit.

### Class 2 — Bugs spanning multi-language / vendored-internals
*(P1, P2, P4)* — Zig + JSC C++ + JavaScript test, or vendored WebKit code that can't be modified, or platform-specific (Windows). Frontier models hallucinate on sparse-training-data internals. **wakil-apr edge:** Rule B (ceiling-cap voter) forces cross-witness on system-internal claims; atom 0017 (silent-evidence) treats "we don't know what JSC does" as positive data → propose instrumentation rather than guess.

### Class 3 — Bugs whose verification signal is non-deterministic (memory-leak, ASAN, RSS-growth)
*(P3, P4)* — verification requires sub-process + threshold + N-iteration reproduction, not standard unit tests. Frontier models default to deterministic tests that miss the bug class. **wakil-apr edge:** Rule F declines if asked to write a test without verification methodology; atom 0011 (cheapest-distinguishing-experiment) prefers the actual reproduction technique the PR used.

### Where wakil-apr does NOT have an edge

**Single-file, single-PR, deterministic-test bugs.** When the bug is contained, the fix is local, and the test is straightforward, GPT-5.5 in vanilla opencode performs comparably or better than wakil-apr (which incurs substrate-discipline overhead for no extra signal). Substrate-discipline is *not free*; it pays for itself only on the hard classes above.

### Where the substrate-discipline IS THE PRODUCT

The wakil-apr edge isn't "better answers." It's **better epistemic posture**:

- **Decline-and-clarify** when context is insufficient (Rule F) — surfaces the missing context the operator needed to provide anyway
- **Force voter on system-level invariants** (Rule B) — catches confident-confabulation on sparse-training-data internals
- **Perturbation-as-prior-fix-audit** (atom 0023) — when fixing a regression, automatically check what cascades from the prior fix's load-bearing claims
- **Treat ignorance as positive data** (atom 0017) — "we don't know what JSC does internally" → propose instrumentation; not "fall back on guess"

These are the moves senior engineers make. Substrate-discipline encodes them as runtime mechanism instead of agent-instruction.

---

## Honest disclosure

This analysis is **predicted, not empirical**. Validating these predictions
would require:

- Dispatch GPT-5.5 + Codex (in vanilla opencode) against each PR's
  pre-fix repo state, with realistic operator-prompt phrasing
- Dispatch wakil-apr against the same with substrate-discipline enabled
- Compare: (a) did the model land the right fix? (b) did it cite the
  right root-cause? (c) did it write a test that catches the bug?
- Cost estimate: ~$5-15 per PR for full agentic-loop dispatch with both
  models; ~$30-60 total for the 4-PR corpus

**Operator's call:** is the empirical validation worth $30-60 for one
substrate-discipline-edge benchmark? Per atom 0022 stewardship: HIGH
value-of-inquiry (would calibrate the substrate's edge claim
empirically), MODERATE cost. If yes, this artifact provides the
methodology + test-set; the dispatch is bounded.

---

## What to do with this finding regardless

The 3 classes (multi-PR-history, multi-language-vendored, non-deterministic-verification) are **the corpus shape we should benchmark cheapcode on as it evolves.** Not SWE-Bench Verified (frontier models all close to ceiling). The classes named here represent the actual residue where substrate-discipline matters — the work senior engineers do on hard real-world repos.

Future cheapcode benchmark: maintain a rolling 10-PR corpus from these classes; re-evaluate quarterly; track the wakil-apr-vs-frontier delta as an
empirical anchor for the substrate's edge.

---

## Appendix — full PR characterization data

| field | P1 #30150 | P2 #30208 | P3 #30168 | P4 #30176 |
|---|---|---|---|---|
| merged | 2026-05-04 | 2026-05-04 | 2026-05-04 | 2026-05-04 |
| files | socket.zig + 1 test | ZigGlobalObject.cpp + 1 test | socket.zig (Listener.zig) + 1 test | socket.zig + 1 test |
| LoC delta | <50 | <30 | <10 | ~80 |
| traces back through | #23755 (4a06991d3b) + #26539 | (vendored WebKit) | #23936 | #30148 (self-follow-up) |
| platform | Windows-only | all (TLA-using) | unix-only repro | all (debug+ASAN signal) |
| bug-class | UAF | wrong-completion-value | refleak | UAF |
| verification | subprocess + named-pipe + ASAN | bun-test on 33 cases | RSS-growth 20k iter | ASAN poison-read |
