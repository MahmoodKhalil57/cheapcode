import { saveEntry, type Entry } from "./entry";

export type ReceiptObservationMetadata = {
  command: string;
  exit_code: number;
  stdout_tail: string;
  stderr_tail: string;
  pytest_passed?: number | null;
  pytest_failed?: number | null;
  log_path?: string | null;
  duration_ms?: number;
  receipt_hash?: string;
};

export type SaveReceiptInput = {
  title: string;
  body?: string;
  project?: string;
  summary?: string;
  metadata: ReceiptObservationMetadata;
};

export function saveReceipt(input: SaveReceiptInput): Entry {
  const metadata: ReceiptObservationMetadata = {
    ...input.metadata,
    stdout_tail: input.metadata.stdout_tail.slice(0, 4000),
    stderr_tail: input.metadata.stderr_tail.slice(0, 4000),
  };

  return saveEntry({
    project: input.project,
    kind: "receipt.observation",
    title: input.title,
    body:
      input.body ??
      [`command: ${metadata.command}`, `exit_code: ${metadata.exit_code}`, metadata.stdout_tail, metadata.stderr_tail]
        .filter(Boolean)
        .join("\n"),
    summary: input.summary,
    metadata,
  });
}
