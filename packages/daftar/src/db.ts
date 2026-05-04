import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { projectDbPath, touchProjectRegistry } from "./project";

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  summary TEXT,
  hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata_json TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  title, body, summary, kind UNINDEXED, id UNINDEXED,
  content='entries', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, title, body, summary, kind, id)
  VALUES (new.rowid, new.title, new.body, coalesce(new.summary, ''), new.kind, new.id);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, body, summary, kind, id)
  VALUES ('delete', old.rowid, old.title, old.body, coalesce(old.summary, ''), old.kind, old.id);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, title, body, summary, kind, id)
  VALUES ('delete', old.rowid, old.title, old.body, coalesce(old.summary, ''), old.kind, old.id);
  INSERT INTO entries_fts(rowid, title, body, summary, kind, id)
  VALUES (new.rowid, new.title, new.body, coalesce(new.summary, ''), new.kind, new.id);
END;
`;

export function openProjectDb(projectPath?: string): Database {
  const dbPath = projectDbPath(projectPath);
  mkdirSync(dirname(dbPath), { recursive: true });
  touchProjectRegistry(projectPath);

  const db = new Database(dbPath, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(bootstrapSql);
  return db;
}
