import { saveEntry, type Entry } from "./entry";

export type BiasKeepMetadata = {
  model_family: string;
  task_shape: string;
  bias_name: string;
  why_helped: string;
  stop_condition: string;
};

export type LogBiasKeepInput = {
  title: string;
  body: string;
  project?: string;
  summary?: string;
  metadata: BiasKeepMetadata;
};

export function logBiasKeep(input: LogBiasKeepInput): Entry {
  return saveEntry({
    project: input.project,
    kind: "bias.keep",
    title: input.title,
    body: input.body,
    summary: input.summary,
    metadata: input.metadata,
  });
}
