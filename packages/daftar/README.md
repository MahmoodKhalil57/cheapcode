# Daftar

`daftar` is the third sibling beside `burhan` and `mizaj`.

It is not a proof language and it is not a bias protocol.
It is the durable notebook layer: local-first, typed, project-sharded, and retrieval-capped.

Round 1 ships the bare local core only.
That means SQLite, FTS5, four typed entry kinds, strict project isolation, and hard token budgets.
No embeddings yet.
No Sanad sync yet.
No khazina promotion workflow yet.

## TL;DR

- `burhan` is the proof primitive.
- `mizaj` is the speech and bias discipline.
- `daftar` is the notebook that remembers what happened after the process exits.
- Round 1 is a Bun + TypeScript local notebook over `bun:sqlite` and FTS5.
- Retrieval is honest and small: lexical search plus a hard summary budget.
- Storage is project-local by shard, not one global memory pool.

## How daftar pairs with burhan + mizaj

The pairing is explicit.

`burhan` already gives structure to claims, assumptions, falsifiers, and receipts.
`mizaj` already names model tendencies, assumption envelopes, and bias-keeping discipline.
What neither repo does by itself is keep durable memory across sessions and repos without bloating the active prompt.

That is where `daftar` fits.

- A `burhan` receipt can land here later as a durable `receipt.observation` entry.
- A `mizaj` assumption envelope can land here as a durable `assumption.envelope` entry.
- A kept bias can land here as a searchable `bias.keep` entry.
- Plain notes can live beside those typed rows without pretending to be proofs.

The three siblings stay distinct on purpose.

- `burhan` answers: what is the claim and what supports it?
- `mizaj` answers: which tendency is shaping the answer path?
- `daftar` answers: what should survive this session and be recallable later?

## What is real in Round 1

Round 1 is deliberately small and falsifiable.

- per-project SQLite shard files
- FTS5 lexical retrieval
- four typed entry kinds
- JSON metadata per entry
- registry for known projects
- hard-capped recall by token budget
- local CLI for add, query, list, stats, list-projects, and `sahih` (authenticated burhan-segment subsystem)

This is not “AI memory” hype.
It is a typed notebook with retrieval discipline.
If a query cannot fit under budget, `daftar` truncates or returns nothing rather than lying about its cap.

## Storage Layout

Round 1 writes under `~/.local/share/daftar/` by default.

- `projects/<project_hash>.db` holds one SQLite shard per project
- `registry.json` maps project hash to canonical original path and `last_seen_at`

`project_hash` is the first 16 hex characters of `sha256(canonical_project_path)`.

Project resolution follows the operator rule:

- use the git repo root when the cwd is inside a git repo
- otherwise use the cwd itself
- always canonicalize to an absolute real path when possible

The default root can be overridden with `DAFTAR_ROOT`, which is how the tests and quickstart avoid touching operator state.

## Entry Kinds

1. `note`
2. `receipt.observation`
3. `assumption.envelope`
4. `bias.keep`
5. `burhan.segment` — curated burhan claim/lemma/theorem with explicit isnad chain, authentication grade (sahih/hasan/daif/mawdu), kitab/bab subject taxonomy, and naskh links. Inspired by `Ulum al-hadith`. See `daftar sahih --help` and the canonical mizaj rules 11 (source-tier) + 14 (grade-bounds-confidence).

Each row stores:

- `id`
- `kind`
- `title`
- `body`
- `summary`
- `hash`
- `created_at`
- `updated_at`
- `metadata_json`

Receipts mirror the shape already established in `burhan`:
command, exit code, stdout/stderr tails, optional pytest counts, optional log path, duration, and receipt hash.

## Architecture

Round 1 uses SQLite with an FTS5 virtual table and triggers that keep search rows in sync with the main `entries` table.

The retrieval path is intentionally narrow:

1. query one project shard only
2. rank by FTS5 BM25
3. accumulate summaries in rank order
4. stop when the next entry would exceed the token budget
5. never cross project boundaries by default

The budget estimator is simple and explicit: `Math.ceil(text.length / 4)`.

The summary is capped at 1000 characters.
Receipt metadata tails are capped at 4000 characters each for stdout and stderr.

There is no embedding subsystem in Round 1.
The design intentionally keeps “FTS-only honesty” until Round 3.

## Privacy Stance

Round 1 is local-first and local-only.

- no cloud sync
- no hosted embedding service
- no vector backend
- no background export

That keeps the trust boundary simple for the first cut.
The notebook lives on the local machine and query scope is project-local.

## Quickstart

Install and verify:

```bash
bun install
bun test
bun run examples/quickstart.ts
```

Basic CLI usage:

```bash
daftar add note --title="Router fix" --body="Switch ordering caused the bug"
daftar add assumption.envelope --title="Scope" --body="Assume local-only mode" --metadata='{"scope":"project","subject":"privacy","state":"live"}'
daftar query "router fix" --budget-tokens=800 --limit=5
daftar list --limit=20
daftar stats
daftar list-projects
```

The example script seeds two projects with mixed entries, queries them both, asserts no cross-project leakage, and prints `QUICKSTART OK` on success.

## Storage Tiers Roadmap

The long-term design spans four practical storage scales.

- 1MB: FTS5-first, compact summaries, optional hot-row sketches only
- 100MB: the first tier where vector indexing starts to make sense
- 10GB: durable receipt archive plus compaction and hot/warm/cold policy
- 1TB+: tenant-safe sharding, richer archival, and multi-embedding experiments

Round 1 implements only the honest local 1MB-style core even when the disk is much larger.

## Roadmap

The Round 1 implementation maps directly to the r105 design.

- R1: local core notebook + typed entry schema
- R2: `burhan` + `mizaj` write-through and `cite daftar:<id>` coupling
- R3: `sqlite-vec` hybrid retrieval and compaction
- R4: dispatch hook and Sanad tenant-safe API
- R5: promotion and sync discipline, including khazina staging

This repo only implements R1.
Vectors are deferred to R3.
Sanad tenancy and sync are deferred to R4.
Khazina promotion flow is deferred to R5.

## References

- `burhan`: proof-carrying claim discipline
- `mizaj`: bias and assumption discipline
- `khazina`: curated cross-project atom catalog
- `/tmp/r105-daftar-design-output.md`: the source design for this Round 1 cut

## Why the name fits

`daftar` already fits the ledger/notebook role elsewhere in the ecosystem.
Here it names the durable local notebook surface, not a cloud-global memory pool.

That distinction matters.
The project earns its keep only if it stores much more than it retrieves, and retrieves only what fits inside a hard cap.

R1 keeps that promise with the smallest useful build.
