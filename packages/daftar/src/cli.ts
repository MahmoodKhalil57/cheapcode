import { assertEntryKind, listEntries, queryEntries, saveEntry, stats } from "./entry";
import { listProjects } from "./project";
import {
  BURHAN_GRADES,
  type BurhanGrade,
  exportSegmentsAsBn,
  getSegmentBySlug,
  gradeSegment,
  lexicon,
  naskhSegment,
  querySegments,
  saveSegment,
  verifySegmentChains,
} from "./sahih";

type Format = "json" | "text";

export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  try {
    switch (command) {
      case "add":
        return output(handleAdd(rest));
      case "query":
        return output(handleQuery(rest));
      case "list":
        return output(handleList(rest));
      case "stats":
        return output(handleStats(rest));
      case "list-projects":
        return output({ projects: listProjects() }, parseOptions(rest).format);
      case "sahih":
        return handleSahih(rest);
      default:
        printHelp();
        return command ? 1 : 0;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}

function handleAdd(args: string[]) {
  const [kindArg, ...rest] = args;
  if (!kindArg) throw new Error("usage: daftar add <kind> --title=<t> --body=<b>");
  assertEntryKind(kindArg);
  const options = parseOptions(rest);
  if (!options.title || !options.body) {
    throw new Error("add requires --title and --body");
  }
  const metadata = options.metadata ? (JSON.parse(options.metadata) as Record<string, unknown>) : null;
  const entry = saveEntry({
    kind: kindArg,
    title: options.title,
    body: options.body,
    summary: options.summary,
    metadata,
    project: options.project,
  });
  return { entry };
}

function handleQuery(args: string[]) {
  const [query, ...rest] = args;
  if (!query) throw new Error("usage: daftar query <q>");
  const options = parseOptions(rest);
  const result = queryEntries(query, {
    project: options.project,
    budgetTokens: options.budgetTokens ? Number(options.budgetTokens) : undefined,
    limit: options.limit ? Number(options.limit) : undefined,
    kind: options.kind,
  });
  return result;
}

function handleList(args: string[]) {
  const options = parseOptions(args);
  return {
    entries: listEntries({
      project: options.project,
      kind: options.kind,
      limit: options.limit ? Number(options.limit) : undefined,
    }),
  };
}

function handleStats(args: string[]) {
  const options = parseOptions(args);
  return stats(options.project);
}

function parseOptions(args: string[]): Record<string, string> & { format?: Format; kind?: any } {
  const options: Record<string, string> = {};

  // Bug fix 2026-05-03 (atom 0021 recursive-substrate-use): support both
  // --key=value AND --key value (space-separated) forms. Previous impl
  // only handled --key=value, causing --limit 20 to set limit="true"
  // (string default for valueless flags), then Number("true")=NaN, then
  // SQLite "datatype mismatch" on LIMIT binding. Caught when adam-tick
  // ran daftar list --limit 3 — surfaced via runtime composition, not
  // unit tests.
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const eqIdx = arg.indexOf("=");
    if (eqIdx >= 0) {
      // --key=value form
      const rawKey = arg.slice(2, eqIdx);
      const rawValue = arg.slice(eqIdx + 1);
      options[camelize(rawKey)] = rawValue || "true";
    } else {
      // --key [value] form: peek next arg if it doesn't start with --
      const rawKey = arg.slice(2);
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[camelize(rawKey)] = next;
        i++; // consume the value
      } else {
        options[camelize(rawKey)] = "true";
      }
    }
  }

  if (options.kind) assertEntryKind(options.kind);
  if (options.format && options.format !== "json" && options.format !== "text") {
    throw new Error(`unsupported format: ${options.format}`);
  }

  return options as Record<string, string> & { format?: Format };
}

function output(payload: unknown, format: Format = "json"): number {
  if (format === "text") {
    console.log(renderText(payload));
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }
  return 0;
}

function renderText(payload: unknown): string {
  if (payload && typeof payload === "object") {
    return JSON.stringify(payload, null, 2);
  }
  return String(payload);
}

function camelize(key: string): string {
  return key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function handleSahih(args: string[]): number {
  const [sub, ...rest] = args;
  switch (sub) {
    case "add":
      return output(handleSahihAdd(rest));
    case "query":
      return output(handleSahihQuery(rest));
    case "grade":
      return output(handleSahihGrade(rest));
    case "naskh":
      return output(handleSahihNaskh(rest));
    case "export":
      return outputText(handleSahihExport(rest));
    case "verify":
      return output(handleSahihVerify(rest));
    case "show":
      return output(handleSahihShow(rest));
    case "lexicon":
      return output(handleSahihLexicon(rest));
    default:
      printSahihHelp();
      return sub ? 1 : 0;
  }
}

function handleSahihAdd(args: string[]) {
  const opts = parseOptions(args);
  if (!opts.slug || !opts.type || !opts.grade || !opts.kitab || !opts.bab || !opts.bodyBn) {
    throw new Error(
      "sahih add requires --slug, --type, --grade, --kitab, --bab, --body-bn, [--isnad=<json>]",
    );
  }
  const isnad = opts.isnad ? JSON.parse(opts.isnad) : [];
  const supersedes = opts.supersedes ? opts.supersedes.split(",").map((s) => s.trim()) : undefined;
  // Allow shell users to pass `\n` and `\t` as literal escape sequences.
  const bodyBn = opts.bodyBn.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  return {
    segment: saveSegment({
      slug: opts.slug,
      segment_type: opts.type as never,
      body_bn: bodyBn,
      grade: opts.grade as BurhanGrade,
      kitab: opts.kitab,
      bab: opts.bab,
      isnad,
      mutawatir_count: opts.mutawatirCount ? Number(opts.mutawatirCount) : undefined,
      supersedes,
      project: opts.project,
    }),
  };
}

function handleSahihQuery(args: string[]) {
  const opts = parseOptions(args);
  const grades = opts.grades
    ? (opts.grades.split(",").map((g) => g.trim()) as BurhanGrade[])
    : undefined;
  if (grades) for (const g of grades) if (!BURHAN_GRADES.includes(g)) throw new Error(`invalid grade: ${g}`);
  return {
    segments: querySegments({
      kitab: opts.kitab,
      bab: opts.bab,
      grades,
      project: opts.project,
      exclude_superseded: opts.includeSuperseded === "true" ? false : true,
    }),
  };
}

function handleSahihGrade(args: string[]) {
  const [slug, ...rest] = args;
  if (!slug) throw new Error("usage: daftar sahih grade <slug> --to=<grade> --reason=<r>");
  const opts = parseOptions(rest);
  if (!opts.to || !opts.reason) throw new Error("grade requires --to and --reason");
  return { segment: gradeSegment(slug, opts.to as BurhanGrade, opts.reason, opts.project) };
}

function handleSahihNaskh(args: string[]) {
  const [oldSlug, ...rest] = args;
  if (!oldSlug) throw new Error("usage: daftar sahih naskh <old-slug> --by=<new-slug> --reason=<r>");
  const opts = parseOptions(rest);
  if (!opts.by || !opts.reason) throw new Error("naskh requires --by and --reason");
  return naskhSegment(oldSlug, opts.by, opts.reason, opts.project);
}

function handleSahihExport(args: string[]): string {
  const opts = parseOptions(args);
  const grades = opts.grades
    ? (opts.grades.split(",").map((g) => g.trim()) as BurhanGrade[])
    : (["sahih", "hasan"] as BurhanGrade[]);
  return exportSegmentsAsBn({
    grades,
    kitab: opts.kitab,
    bab: opts.bab,
    project: opts.project,
  });
}

function handleSahihVerify(args: string[]) {
  const opts = parseOptions(args);
  const results = verifySegmentChains({ project: opts.project });
  const summary = {
    segments: results.length,
    chains_intact: results.filter((r) => r.chain_intact).length,
    chains_broken: results.filter((r) => !r.chain_intact).length,
    by_grade: results.reduce<Record<string, number>>((acc, r) => {
      acc[r.grade] = (acc[r.grade] ?? 0) + 1;
      return acc;
    }, {}),
  };
  return { summary, results };
}

function handleSahihShow(args: string[]) {
  const [slug, ...rest] = args;
  if (!slug) throw new Error("usage: daftar sahih show <slug>");
  const opts = parseOptions(rest);
  const seg = getSegmentBySlug(slug, opts.project);
  if (!seg) throw new Error(`segment not found: ${slug}`);
  return { segment: seg };
}

function handleSahihLexicon(args: string[]) {
  const opts = parseOptions(args);
  return { lexicon: lexicon({ project: opts.project }) };
}

function outputText(payload: string): number {
  console.log(payload);
  return 0;
}

function printHelp(): void {
  console.log(`daftar add <kind> --title=<t> --body=<b> [--project=<path>] [--metadata=<json>]
daftar query <q> [--project=<path>] [--budget-tokens=800] [--limit=5] [--kind=<k>]
daftar list [--project=<path>] [--kind=<k>] [--limit=20]
daftar stats [--project=<path>]
daftar list-projects
daftar sahih <add|query|grade|naskh|export|verify|show|lexicon> ...`);
}

function printSahihHelp(): void {
  console.log(`daftar sahih add --slug=<s> --type=<lemma|claim|theorem|citation> --grade=<sahih|hasan|daif|mawdu> --kitab=<k> --bab=<b> --body-bn=<bn> [--isnad=<json-array>] [--mutawatir-count=<n>] [--supersedes=<s1,s2>] [--project=<path>]
daftar sahih query [--kitab=<k>] [--bab=<b>] [--grades=<sahih,hasan>] [--include-superseded=true] [--project=<path>]
daftar sahih grade <slug> --to=<grade> --reason=<r> [--project=<path>]
daftar sahih naskh <old-slug> --by=<new-slug> --reason=<r> [--project=<path>]
daftar sahih export [--grades=<sahih,hasan>] [--kitab=<k>] [--bab=<b>] [--project=<path>]
daftar sahih verify [--project=<path>]
daftar sahih show <slug> [--project=<path>]
daftar sahih lexicon [--project=<path>]`);
}
