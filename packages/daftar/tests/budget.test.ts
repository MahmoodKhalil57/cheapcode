import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { queryEntries, saveEntry } from "../src/entry";
import { capByBudget, tokenEstimate } from "../src/budget";

test("tokenEstimate is char based", () => {
  expect(tokenEstimate("abcd")).toBe(1);
  expect(tokenEstimate("abcde")).toBe(2);
});

test("token budget enforced", () => {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-budget-"));
  const project = mkdtempSync(resolve(tmpdir(), "daftar-budget-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  try {
    for (let index = 0; index < 4; index += 1) {
      saveEntry({
        kind: "note",
        title: `Long ${index}`,
        body: `${"x".repeat(1200)} marker-${index}`,
        project,
      });
    }

    const result = queryEntries("marker", { project, budgetTokens: 200, limit: 5 });
    const combined = result.entries.map((entry) => entry.retrieval_text).join("");
    expect(combined.length).toBeLessThanOrEqual(800);
    expect(result.truncated).toBe(true);

    const empty = capByBudget([{ text: "y".repeat(900) }], (item) => item.text, 200);
    expect(empty.items).toHaveLength(0);
    expect(empty.truncated).toBe(true);
  } finally {
    if (previous === undefined) delete process.env.DAFTAR_ROOT;
    else process.env.DAFTAR_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
