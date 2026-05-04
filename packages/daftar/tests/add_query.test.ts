import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { queryEntries, saveEntry } from "../src/entry";

function withDaftarRoot<T>(run: (project: string) => T): T {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-add-query-"));
  const project = mkdtempSync(resolve(tmpdir(), "daftar-project-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  mkdirSync(project, { recursive: true });
  try {
    return run(project);
  } finally {
    if (previous === undefined) delete process.env.DAFTAR_ROOT;
    else process.env.DAFTAR_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
}

test("add_query roundtrip", () => {
  withDaftarRoot((project) => {
    saveEntry({ kind: "note", title: "Router idea", body: "Switch routing fix for daftar core", project });
    saveEntry({ kind: "note", title: "Build note", body: "Bun test stays green", project });
    saveEntry({ kind: "bias.keep", title: "Bias", body: "Keep Bun bias for this repo", project, metadata: { model_family: "claude", task_shape: "build", bias_name: "bun", why_helped: "repo mandate", stop_condition: "mandate changes" } });
    saveEntry({ kind: "assumption.envelope", title: "Scope", body: "Assume project isolation is strict", project, metadata: { scope: "project", subject: "isolation", state: "live" } });
    saveEntry({ kind: "receipt.observation", title: "Receipt", body: "bun test passed for router switch", project, metadata: { command: "bun test", exit_code: 0, stdout_tail: "pass", stderr_tail: "" } });

    const result = queryEntries("router switch", { project, limit: 5, budgetTokens: 800 });
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries.some((entry) => entry.title === "Router idea")).toBe(true);
  });
});

test("fts5 ranking sane", () => {
  withDaftarRoot((project) => {
    saveEntry({ kind: "note", title: "Generic note", body: "ordinary text", project });
    saveEntry({ kind: "note", title: "Precise note", body: "router router router exactsignal", project });
    const result = queryEntries("exactsignal", { project, limit: 2, budgetTokens: 800 });
    expect(result.entries[0]?.title).toBe("Precise note");
  });
});
