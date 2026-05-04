import { getEntry, saveEntry, updateEntryMetadata, type Entry } from "./entry";

export type AssumptionState = "live" | "expired" | "falsified" | "superseded";

export type AssumptionMetadata = {
  scope: string;
  subject: string;
  state: AssumptionState;
  expires_at?: string;
  falsified_at?: string;
};

export type SaveAssumptionInput = {
  title: string;
  body: string;
  project?: string;
  summary?: string;
  metadata: AssumptionMetadata;
};

export function saveAssumption(input: SaveAssumptionInput): Entry {
  return saveEntry({
    project: input.project,
    kind: "assumption.envelope",
    title: input.title,
    body: input.body,
    summary: input.summary,
    metadata: input.metadata,
  });
}

export function markAssumptionState(id: string, state: AssumptionState, project?: string): Entry {
  const existing = getEntry(id, project);
  if (!existing) {
    throw new Error(`entry not found: ${id}`);
  }
  if (existing.kind !== "assumption.envelope") {
    throw new Error(`entry is not an assumption: ${id}`);
  }

  const metadata = { ...(existing.metadata_json ?? {}), state } as Record<string, unknown>;
  if (state === "falsified") {
    metadata.falsified_at = new Date().toISOString();
  }

  return updateEntryMetadata(id, metadata, project);
}
