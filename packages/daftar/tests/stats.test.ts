import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { saveEntry, stats } from "../src/entry";
import { projectHash } from "../src/project";

test("project hash stable", async () => {
  const first = projectHash("/foo/bar");
  const second = projectHash("/foo/bar");
  expect(first).toBe(second);

  const proc = Bun.spawnSync({
    cmd: ["bun", "--eval", 'import { projectHash } from "./src/project"; console.log(projectHash("/foo/bar"));'],
    cwd: import.meta.dir.replace(/\/tests$/, ""),
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(proc.exitCode).toBe(0);
  expect(new TextDecoder().decode(proc.stdout).trim()).toBe(first);
});

test("stats counts", () => {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-stats-"));
  const project = mkdtempSync(resolve(tmpdir(), "daftar-stats-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  try {
    for (let index = 0; index < 6; index += 1) {
      saveEntry({ kind: "note", title: `Entry ${index}`, body: `body ${index}`, project });
    }
    const result = stats(project);
    expect(result.count).toBe(6);
    expect(result.by_kind.note).toBe(6);
  } finally {
    if (previous === undefined) delete process.env.DAFTAR_ROOT;
    else process.env.DAFTAR_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
