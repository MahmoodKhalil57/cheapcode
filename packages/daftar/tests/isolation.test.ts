import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { queryEntries, saveEntry } from "../src/entry";

function setup() {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-isolation-"));
  const projectA = mkdtempSync(resolve(tmpdir(), "daftar-proj-a-"));
  const projectB = mkdtempSync(resolve(tmpdir(), "daftar-proj-b-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  return {
    root,
    projectA,
    projectB,
    restore() {
      if (previous === undefined) delete process.env.DAFTAR_ROOT;
      else process.env.DAFTAR_ROOT = previous;
      rmSync(root, { recursive: true, force: true });
      rmSync(projectA, { recursive: true, force: true });
      rmSync(projectB, { recursive: true, force: true });
    },
  };
}

test("project isolation strict", () => {
  const env = setup();
  try {
    const aIds = new Set<string>();
    for (let index = 0; index < 3; index += 1) {
      aIds.add(
        saveEntry({
          kind: "note",
          title: `A ${index}`,
          body: `router shared vocabulary alpha-${index}`,
          project: env.projectA,
        }).id,
      );
      saveEntry({
        kind: "note",
        title: `B ${index}`,
        body: `router shared vocabulary beta-${index}`,
        project: env.projectB,
      });
    }

    const result = queryEntries("router shared vocabulary", {
      project: env.projectA,
      limit: 5,
      budgetTokens: 800,
    });

    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries.every((entry) => aIds.has(entry.id))).toBe(true);
  } finally {
    env.restore();
  }
});
