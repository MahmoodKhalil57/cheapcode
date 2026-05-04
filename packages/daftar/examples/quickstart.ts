import { mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { saveAssumption } from "../src/assumption";
import { logBiasKeep } from "../src/bias";
import { queryEntries, saveEntry } from "../src/entry";
import { saveReceipt } from "../src/receipt";

const root = mkdtempSync(resolve(import.meta.dir, "tmp-quickstart-root-"));
const projectA = mkdtempSync(resolve(tmpdir(), "daftar-quickstart-a-"));
const projectB = mkdtempSync(resolve(tmpdir(), "daftar-quickstart-b-"));
const previous = process.env.DAFTAR_ROOT;
process.env.DAFTAR_ROOT = root;

try {
  for (let index = 0; index < 10; index += 1) {
    seedProject(projectA, index, "router");
    seedProject(projectB, index, "ledger");
  }

  const resultA = queryEntries("router", {
    project: projectA,
    limit: 5,
    budgetTokens: 800,
  });
  const resultB = queryEntries("ledger", {
    project: projectB,
    limit: 5,
    budgetTokens: 800,
  });

  console.log(JSON.stringify({ projectA: resultA, projectB: resultB }, null, 2));

  if (!resultA.entries.length || !resultB.entries.length) {
    throw new Error("expected both projects to return results");
  }

  if (resultA.entries.some((entry) => entry.body.includes("ledger"))) {
    throw new Error("cross-project leak into project A results");
  }
  if (resultB.entries.some((entry) => entry.body.includes("router"))) {
    throw new Error("cross-project leak into project B results");
  }

  console.log("QUICKSTART OK");
} finally {
  if (previous === undefined) delete process.env.DAFTAR_ROOT;
  else process.env.DAFTAR_ROOT = previous;
  rmSync(root, { recursive: true, force: true });
  rmSync(projectA, { recursive: true, force: true });
  rmSync(projectB, { recursive: true, force: true });
}

function seedProject(project: string, index: number, keyword: string): void {
  const mod = index % 4;
  if (mod === 0) {
    saveEntry({
      kind: "note",
      title: `${keyword} note ${index}`,
      body: `${keyword} note body ${index} with local memory and retrieval`,
      project,
    });
    return;
  }

  if (mod === 1) {
    saveReceipt({
      title: `${keyword} receipt ${index}`,
      project,
      metadata: {
        command: "bun test",
        exit_code: 0,
        stdout_tail: `${keyword} stdout ${index}`,
        stderr_tail: "",
        pytest_passed: 4,
        pytest_failed: 0,
      },
    });
    return;
  }

  if (mod === 2) {
    saveAssumption({
      title: `${keyword} assumption ${index}`,
      body: `${keyword} assumption body ${index}`,
      project,
      metadata: { scope: "project", subject: keyword, state: "live" },
    });
    return;
  }

  logBiasKeep({
    title: `${keyword} bias ${index}`,
    body: `${keyword} bias body ${index}`,
    project,
    metadata: {
      model_family: "claude",
      task_shape: "coding",
      bias_name: `${keyword}-bias`,
      why_helped: "kept output aligned to repo substrate",
      stop_condition: "when the substrate changes",
    },
  });
}
