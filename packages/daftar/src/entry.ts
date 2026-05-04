import { createHash, randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import { capByBudget } from "./budget";
import { openProjectDb } from "./db";

export const ENTRY_KINDS = [
  "note",
  "receipt.observation",
  "assumption.envelope",
  "bias.keep",
  "burhan.segment",
] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export type Entry = {
  id: string;
  kind: EntryKind;
  title: string;
  body: string;
  summary: string | null;
  hash: string;
  created_at: string;
  updated_at: string;
  metadata_json: Record<string, unknown> | null;
};

export type SaveEntryInput = {
  kind: EntryKind;
  title: string;
  body: string;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  project?: string;
  idPrefix?: string;
};

export type QueryResultEntry = Entry & {
  score: number;
  retrieval_text: string;
};

export type QueryEntriesOptions = {
  project?: string;
  limit?: number;
  budgetTokens?: number;
  kind?: EntryKind;
};

export type QueryEntriesResult = {
  entries: QueryResultEntry[];
  truncated: boolean;
  usedTokens: number;
};

export type ListEntriesOptions = {
  project?: string;
  kind?: EntryKind;
  limit?: number;
};

type EntryRow = {
  id: string;
  kind: EntryKind;
  title: string;
  body: string;
  summary: string | null;
  hash: string;
  created_at: string;
  updated_at: string;
  metadata_json: string | null;
};

type QueryRow = EntryRow & { score: number };

export function saveEntry(input: SaveEntryInput): Entry {
  assertEntryKind(input.kind);
  const db = openProjectDb(input.project);

  try {
    const now = new Date().toISOString();
    const summary = summarize(input.summary, input.body);
    const entry: Entry = {
      id: makeEntryId(input.idPrefix ?? entryPrefix(input.kind)),
      kind: input.kind,
      title: input.title,
      body: input.body,
      summary,
      hash: digestEntry(input.kind, input.title, input.body),
      created_at: now,
      updated_at: now,
      metadata_json: input.metadata ?? null,
    };

    db.prepare(
      `INSERT INTO entries (id, kind, title, body, summary, hash, created_at, updated_at, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      entry.id,
      entry.kind,
      entry.title,
      entry.body,
      entry.summary,
      entry.hash,
      entry.created_at,
      entry.updated_at,
      entry.metadata_json ? JSON.stringify(entry.metadata_json) : null,
    );

    return entry;
  } finally {
    db.close();
  }
}

export function getEntry(id: string, project?: string): Entry | null {
  const db = openProjectDb(project);

  try {
    const row = db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id) as EntryRow | null;
    return row ? hydrateEntry(row) : null;
  } finally {
    db.close();
  }
}

export function listEntries(options: ListEntriesOptions = {}): Entry[] {
  const db = openProjectDb(options.project);

  try {
    const limit = options.limit ?? 20;
    const rows = options.kind
      ? (db
          .prepare(`SELECT * FROM entries WHERE kind = ? ORDER BY created_at DESC LIMIT ?`)
          .all(options.kind, limit) as EntryRow[])
      : (db.prepare(`SELECT * FROM entries ORDER BY created_at DESC LIMIT ?`).all(limit) as EntryRow[]);
    return rows.map(hydrateEntry);
  } finally {
    db.close();
  }
}

export function queryEntries(query: string, options: QueryEntriesOptions = {}): QueryEntriesResult {
  const db = openProjectDb(options.project);

  try {
    const limit = options.limit ?? 5;
    const budgetTokens = options.budgetTokens ?? 800;
    const candidateLimit = Math.max(limit * 5, limit);
    const rows = selectQueryRows(db, query, options.kind, candidateLimit).map((row) => ({
      ...hydrateEntry(row),
      score: row.score,
      retrieval_text: row.summary?.trim() || row.body.slice(0, 1000),
    }));
    const budgeted = capByBudget(rows, (row) => row.retrieval_text, budgetTokens);
    return {
      entries: budgeted.items.slice(0, limit),
      truncated: budgeted.truncated || budgeted.items.length > limit,
      usedTokens: budgeted.items.slice(0, limit).reduce((sum, row) => sum + Math.ceil(row.retrieval_text.length / 4), 0),
    };
  } finally {
    db.close();
  }
}

export function updateEntryMetadata(id: string, metadata: Record<string, unknown> | null, project?: string): Entry {
  const db = openProjectDb(project);

  try {
    const existing = db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id) as EntryRow | null;
    if (!existing) {
      throw new Error(`entry not found: ${id}`);
    }

    const updatedAt = new Date().toISOString();
    db.prepare(`UPDATE entries SET metadata_json = ?, updated_at = ? WHERE id = ?`).run(
      metadata ? JSON.stringify(metadata) : null,
      updatedAt,
      id,
    );

    const next = db.prepare(`SELECT * FROM entries WHERE id = ?`).get(id) as EntryRow;
    return hydrateEntry(next);
  } finally {
    db.close();
  }
}

export function stats(project?: string): { count: number; by_kind: Record<string, number> } {
  const db = openProjectDb(project);

  try {
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM entries`).get() as { count: number };
    const kindRows = db.prepare(`SELECT kind, COUNT(*) as count FROM entries GROUP BY kind`).all() as Array<{
      kind: string;
      count: number;
    }>;

    return {
      count: countRow.count,
      by_kind: Object.fromEntries(kindRows.map((row) => [row.kind, row.count])),
    };
  } finally {
    db.close();
  }
}

/**
 * Sanitize a user-supplied query for SQLite FTS5 MATCH. Bug fix
 * 2026-05-03 (atom 0021 recursive-substrate-use round 2): plain-text
 * queries containing FTS5 special chars (hyphen, period, colon, caret,
 * etc.) raise syntax errors or column-resolution errors. Examples
 * caught via runtime invocation:
 *   "auto-tier"        → "no such column: tier" (hyphen → column-qualifier)
 *   "session-2026-05-03" → "no such column: 2026"
 *   "M3.50"            → "fts5 syntax error near '.'"
 *
 * Fix: tokenize on whitespace, wrap each token in double-quotes (FTS5
 * phrase form), escape any embedded double-quotes by doubling them.
 * Result: "auto-tier" → `"auto-tier"`, "M3.50" → `"M3.50"`, etc. The
 * phrase form treats the entire token as a literal, ignoring special
 * chars.
 */
function sanitizeFtsQuery(query: string): string {
  const tokens = query.trim().split(/\s+/).filter(t => t.length > 0);
  return tokens
    .map(t => `"${t.replace(/"/g, '""')}"`)
    .join(" ");
}

function selectQueryRows(db: Database, query: string, kind: EntryKind | undefined, limit: number): QueryRow[] {
  const sanitized = sanitizeFtsQuery(query);
  if (kind) {
    return db
      .prepare(
        `SELECT e.*, bm25(entries_fts) as score
         FROM entries_fts
         JOIN entries e ON e.rowid = entries_fts.rowid
         WHERE entries_fts MATCH ? AND e.kind = ?
         ORDER BY score ASC, e.created_at DESC
         LIMIT ?`,
      )
      .all(sanitized, kind, limit) as QueryRow[];
  }

  return db
    .prepare(
      `SELECT e.*, bm25(entries_fts) as score
       FROM entries_fts
       JOIN entries e ON e.rowid = entries_fts.rowid
       WHERE entries_fts MATCH ?
       ORDER BY score ASC, e.created_at DESC
       LIMIT ?`,
    )
    .all(sanitized, limit) as QueryRow[];
}

function entryPrefix(kind: EntryKind): string {
  switch (kind) {
    case "note":
      return "note";
    case "receipt.observation":
      return "receipt";
    case "assumption.envelope":
      return "assumption";
    case "bias.keep":
      return "bias";
    case "burhan.segment":
      return "seg";
  }
}

function makeEntryId(prefix: string): string {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function digestEntry(kind: EntryKind, title: string, body: string): string {
  return createHash("sha256").update(`${kind}\n${title}\n${body}`).digest("hex");
}

function summarize(summary: string | null | undefined, body: string): string | null {
  const candidate = summary ?? body;
  if (!candidate) return null;
  return candidate.slice(0, 1000);
}

function hydrateEntry(row: EntryRow): Entry {
  return {
    ...row,
    metadata_json: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : null,
  };
}

export function assertEntryKind(kind: string): asserts kind is EntryKind {
  if (!ENTRY_KINDS.includes(kind as EntryKind)) {
    throw new Error(`unsupported kind: ${kind}`);
  }
}
