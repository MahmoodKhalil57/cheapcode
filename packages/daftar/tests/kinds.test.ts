import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { markAssumptionState, saveAssumption } from "../src/assumption";
import { logBiasKeep } from "../src/bias";
import { getEntry, listEntries, saveEntry } from "../src/entry";
import { saveReceipt } from "../src/receipt";

test("four kinds supported", () => {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-kinds-"));
  const project = mkdtempSync(resolve(tmpdir(), "daftar-kinds-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  try {
    const note = saveEntry({ kind: "note", title: "Note", body: "plain note", project, metadata: { color: "blue" } });
    const receipt = saveReceipt({
      title: "Receipt",
      project,
      metadata: { command: "bun test", exit_code: 0, stdout_tail: "ok", stderr_tail: "" },
    });
    const assumption = saveAssumption({
      title: "Assumption",
      body: "Assume local-only scope",
      project,
      metadata: { scope: "project", subject: "scope", state: "live" },
    });
    const bias = logBiasKeep({
      title: "Bias",
      body: "Keep Bun bias",
      project,
      metadata: {
        model_family: "claude",
        task_shape: "coding",
        bias_name: "bun",
        why_helped: "repo mandate",
        stop_condition: "repo changes",
      },
    });

    const updated = markAssumptionState(assumption.id, "falsified", project);
    expect((updated.metadata_json as Record<string, unknown>).state).toBe("falsified");

    expect(listEntries({ project, kind: "note" }).map((entry) => entry.id)).toContain(note.id);
    expect(listEntries({ project, kind: "receipt.observation" }).map((entry) => entry.id)).toContain(receipt.id);
    expect(listEntries({ project, kind: "assumption.envelope" }).map((entry) => entry.id)).toContain(assumption.id);
    expect(listEntries({ project, kind: "bias.keep" }).map((entry) => entry.id)).toContain(bias.id);
    expect((getEntry(note.id, project)?.metadata_json as Record<string, unknown>).color).toBe("blue");
  } finally {
    if (previous === undefined) delete process.env.DAFTAR_ROOT;
    else process.env.DAFTAR_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});
