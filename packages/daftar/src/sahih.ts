/**
 * Burhan-segment authentication subsystem.
 *
 * Stores curated burhan claims/lemmas/theorems with explicit chain of
 * supporting evidence (isnad), authentication grade (sahih/hasan/daif/mawdu),
 * subject taxonomy (kitab/bab), and abrogation links (naskh).
 *
 * Discipline derived from `Ulum al-hadith`. Confidence-bounding rules live
 * in mizaj rule 14 (authentication-grade-bounds-confidence). Source-tiering
 * rules live in mizaj rule 11 (tier-the-source-before-citing).
 *
 * Storage uses the existing entries table with kind="burhan.segment";
 * structured fields live in metadata_json. No schema migration.
 */

import { existsSync } from "node:fs";
import {
  getEntry,
  listEntries,
  saveEntry,
  updateEntryMetadata,
  type Entry,
} from "./entry";

export const BURHAN_GRADES = ["sahih", "hasan", "daif", "mawdu"] as const;
export type BurhanGrade = (typeof BURHAN_GRADES)[number];

/** Confidence ceilings per mizaj rule 14. */
export const GRADE_CEILINGS: Record<BurhanGrade, number> = {
  sahih: 0.95,
  hasan: 0.85,
  daif: 0.4,
  mawdu: 0.1,
};

export const SEGMENT_TYPES = ["lemma", "claim", "theorem", "citation"] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];

export const SOURCE_TIERS = ["L1", "L2", "L3", "L4", "L5"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

export type IsnadLink = {
  tier: SourceTier;
  source: string;
  quote: string;
  access_date: string;
  hash: string;
};

export type GradeHistoryEntry = {
  from: BurhanGrade;
  to: BurhanGrade;
  reason: string;
  timestamp: string;
};

export type BurhanSegmentMetadata = {
  slug: string;
  segment_type: SegmentType;
  body_bn: string;
  grade: BurhanGrade;
  kitab: string;
  bab: string;
  isnad: IsnadLink[];
  mutawatir_count?: number;
  superseded_by?: string;
  supersedes?: string[];
  grade_history?: GradeHistoryEntry[];
};

export type SaveSegmentInput = {
  slug: string;
  segment_type: SegmentType;
  body_bn: string;
  grade: BurhanGrade;
  kitab: string;
  bab: string;
  isnad: IsnadLink[];
  mutawatir_count?: number;
  supersedes?: string[];
  project?: string;
};

export function saveSegment(input: SaveSegmentInput): Entry {
  validateSlug(input.slug);
  validateGrade(input.grade);
  validateSegmentType(input.segment_type);
  validateIsnad(input.isnad, input.grade);

  const existing = getSegmentBySlug(input.slug, input.project);
  if (existing) {
    throw new Error(
      `segment slug already exists: ${input.slug}. Use 'grade' or 'naskh' to update.`,
    );
  }

  const metadata: BurhanSegmentMetadata = {
    slug: input.slug,
    segment_type: input.segment_type,
    body_bn: input.body_bn,
    grade: input.grade,
    kitab: input.kitab,
    bab: input.bab,
    isnad: input.isnad,
    mutawatir_count: input.mutawatir_count ?? input.isnad.length,
    supersedes: input.supersedes,
    grade_history: [],
  };

  return saveEntry({
    project: input.project,
    kind: "burhan.segment",
    title: `[${input.grade}] ${input.slug}`,
    body: input.body_bn,
    summary: `${input.kitab}/${input.bab} - ${input.segment_type}`,
    metadata: metadata as unknown as Record<string, unknown>,
    idPrefix: "seg",
  });
}

export function getSegmentBySlug(slug: string, project?: string): Entry | null {
  const segs = listEntries({ project, kind: "burhan.segment", limit: 10000 });
  return (
    segs.find((e) => {
      const meta = e.metadata_json as unknown as BurhanSegmentMetadata | null;
      return meta?.slug === slug;
    }) ?? null
  );
}

export function gradeSegment(
  slug: string,
  toGrade: BurhanGrade,
  reason: string,
  project?: string,
): Entry {
  validateGrade(toGrade);
  if (!reason || reason.trim().length === 0) {
    throw new Error("grade requires a reason (mizaj rule 14: re-grading must be reasoned)");
  }
  const seg = getSegmentBySlug(slug, project);
  if (!seg) throw new Error(`segment not found: ${slug}`);

  const meta = seg.metadata_json as unknown as BurhanSegmentMetadata;
  if (meta.grade === toGrade) return seg;

  const history: GradeHistoryEntry[] = [
    ...(meta.grade_history ?? []),
    {
      from: meta.grade,
      to: toGrade,
      reason,
      timestamp: new Date().toISOString(),
    },
  ];

  const next: BurhanSegmentMetadata = { ...meta, grade: toGrade, grade_history: history };
  const updated = updateEntryMetadata(
    seg.id,
    next as unknown as Record<string, unknown>,
    project,
  );
  return updated;
}

export function naskhSegment(
  oldSlug: string,
  bySlug: string,
  reason: string,
  project?: string,
): { old: Entry; by: Entry } {
  if (!reason || reason.trim().length === 0) {
    throw new Error("naskh requires a reason");
  }
  const oldSeg = getSegmentBySlug(oldSlug, project);
  if (!oldSeg) throw new Error(`segment not found: ${oldSlug}`);
  const bySeg = getSegmentBySlug(bySlug, project);
  if (!bySeg) throw new Error(`segment not found: ${bySlug}`);

  const oldMeta = oldSeg.metadata_json as unknown as BurhanSegmentMetadata;
  const byMeta = bySeg.metadata_json as unknown as BurhanSegmentMetadata;

  const newOldMeta: BurhanSegmentMetadata = {
    ...oldMeta,
    superseded_by: bySlug,
    grade_history: [
      ...(oldMeta.grade_history ?? []),
      {
        from: oldMeta.grade,
        to: oldMeta.grade,
        reason: `naskh: superseded by ${bySlug}: ${reason}`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
  const newByMeta: BurhanSegmentMetadata = {
    ...byMeta,
    supersedes: [...(byMeta.supersedes ?? []), oldSlug],
  };

  const newOld = updateEntryMetadata(
    oldSeg.id,
    newOldMeta as unknown as Record<string, unknown>,
    project,
  );
  const newBy = updateEntryMetadata(
    bySeg.id,
    newByMeta as unknown as Record<string, unknown>,
    project,
  );
  return { old: newOld, by: newBy };
}

export type QuerySegmentsOptions = {
  kitab?: string;
  bab?: string;
  grades?: BurhanGrade[];
  project?: string;
  /** When true, exclude segments with superseded_by set. Default true. */
  exclude_superseded?: boolean;
};

export function querySegments(opts: QuerySegmentsOptions = {}): Entry[] {
  const segs = listEntries({
    project: opts.project,
    kind: "burhan.segment",
    limit: 10000,
  });
  const excludeSuperseded = opts.exclude_superseded !== false;
  return segs.filter((e) => {
    const meta = e.metadata_json as unknown as BurhanSegmentMetadata | null;
    if (!meta) return false;
    if (excludeSuperseded && meta.superseded_by) return false;
    if (opts.kitab && meta.kitab !== opts.kitab) return false;
    if (opts.bab && meta.bab !== opts.bab) return false;
    if (opts.grades && opts.grades.length > 0 && !opts.grades.includes(meta.grade)) {
      return false;
    }
    return true;
  });
}

export function exportSegmentsAsBn(opts: QuerySegmentsOptions = {}): string {
  const segs = querySegments(opts);
  const lines: string[] = [
    "# Auto-generated by `daftar sahih export`",
    `# Filters: grade=${opts.grades?.join(",") ?? "all"} kitab=${opts.kitab ?? "all"} bab=${opts.bab ?? "all"}`,
    `# Generated at ${new Date().toISOString()}`,
    `# Per mizaj rule 14, only segments at the requested grade(s) are emitted;`,
    `# superseded segments are excluded by default. Confidence ceiling per grade:`,
    `# sahih @>=0.95+, hasan @>=0.85, daif @>=0.40, mawdu @>=0.10.`,
    "",
  ];
  for (const seg of segs) {
    const meta = seg.metadata_json as unknown as BurhanSegmentMetadata;
    lines.push(
      `# grade=${meta.grade} kitab=${meta.kitab} bab=${meta.bab} mutawatir=${meta.mutawatir_count ?? 0} type=${meta.segment_type}`,
    );
    if (meta.supersedes && meta.supersedes.length > 0) {
      lines.push(`# supersedes: ${meta.supersedes.join(", ")}`);
    }
    lines.push(meta.body_bn);
    lines.push("");
  }
  return lines.join("\n");
}

export type IsnadLinkVerification = {
  index: number;
  tier: SourceTier;
  source: string;
  status: "resolved" | "unresolved" | "unverifiable_offline";
  reason: string;
};

export type SegmentVerification = {
  segment_id: string;
  slug: string;
  grade: BurhanGrade;
  kitab: string;
  bab: string;
  isnad_total: number;
  isnad_resolved: number;
  links: IsnadLinkVerification[];
  /** sahih/hasan segments require all L1 links to resolve; unresolved L1 = chain broken */
  chain_intact: boolean;
};

export function verifySegmentChains(
  opts: { project?: string } = {},
): SegmentVerification[] {
  const segs = listEntries({
    project: opts.project,
    kind: "burhan.segment",
    limit: 10000,
  });
  const results: SegmentVerification[] = [];
  for (const seg of segs) {
    const meta = seg.metadata_json as unknown as BurhanSegmentMetadata | null;
    if (!meta) continue;
    const links: IsnadLinkVerification[] = [];
    let resolved = 0;
    let l1Unresolved = 0;
    for (let i = 0; i < meta.isnad.length; i++) {
      const link = meta.isnad[i]!;
      const v = verifyIsnadLink(link, i);
      links.push(v);
      if (v.status === "resolved") resolved++;
      else if (link.tier === "L1") l1Unresolved++;
    }
    results.push({
      segment_id: seg.id,
      slug: meta.slug,
      grade: meta.grade,
      kitab: meta.kitab,
      bab: meta.bab,
      isnad_total: meta.isnad.length,
      isnad_resolved: resolved,
      links,
      chain_intact: l1Unresolved === 0,
    });
  }
  return results;
}

function verifyIsnadLink(link: IsnadLink, index: number): IsnadLinkVerification {
  const base = { index, tier: link.tier, source: link.source };
  const expanded = link.source.replace(/^~/, process.env.HOME ?? "");
  if (expanded.startsWith("/")) {
    if (existsSync(expanded)) {
      return { ...base, status: "resolved", reason: "" };
    }
    return { ...base, status: "unresolved", reason: `path not found: ${expanded}` };
  }
  if (link.source.startsWith("http://") || link.source.startsWith("https://")) {
    return {
      ...base,
      status: "unverifiable_offline",
      reason: "URL not network-verified at runtime",
    };
  }
  // daftar-internal cross-shard reference. Format: `daftar:<project>:note-XXXX`
  // or `daftar:note-XXXX` (current project). Looks up the entry in the named shard.
  const daftarMatch = link.source.match(/^daftar:(?:([^:]+):)?(note-[a-f0-9]+|seg-[a-f0-9]+)$/i);
  if (daftarMatch) {
    const projectShortName = daftarMatch[1];
    const entryId = daftarMatch[2]!;
    const projectPath = projectShortName ? `${process.env.HOME}/apps/${projectShortName}` : undefined;
    const entry = getEntry(entryId, projectPath);
    if (entry) {
      return { ...base, status: "resolved", reason: `daftar entry exists: ${entryId} in ${projectPath ?? "current shard"}` };
    }
    return { ...base, status: "unresolved", reason: `daftar entry not found: ${entryId} in ${projectPath ?? "current shard"}` };
  }
  // Bare note-XXXX without daftar: prefix (legacy)
  if (/\bnote-[a-f0-9]{10,}\b/i.test(link.source)) {
    return {
      ...base,
      status: "unverifiable_offline",
      reason: "daftar-internal reference (no project prefix; use daftar:<project>:note-XXXX)",
    };
  }
  return { ...base, status: "unresolved", reason: "unknown source schema" };
}

export type LexiconEntry = {
  source_class: string;
  expected_tier: SourceTier;
  count: number;
  examples: string[];
};

/** Rijal lexicon - per-source-class summary across all segments in a shard. */
export function lexicon(opts: { project?: string } = {}): LexiconEntry[] {
  const segs = listEntries({
    project: opts.project,
    kind: "burhan.segment",
    limit: 10000,
  });
  const buckets = new Map<string, { tier: SourceTier; sources: Set<string> }>();
  for (const seg of segs) {
    const meta = seg.metadata_json as unknown as BurhanSegmentMetadata | null;
    if (!meta) continue;
    for (const link of meta.isnad) {
      const cls = classifySource(link.source);
      const key = `${cls}|${link.tier}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tier: link.tier, sources: new Set() };
        buckets.set(key, bucket);
      }
      bucket.sources.add(link.source);
    }
  }
  return Array.from(buckets.entries())
    .map(([key, bucket]) => {
      const [source_class] = key.split("|");
      return {
        source_class: source_class!,
        expected_tier: bucket.tier,
        count: bucket.sources.size,
        examples: Array.from(bucket.sources).slice(0, 3),
      };
    })
    .sort((a, b) => b.count - a.count);
}

function classifySource(source: string): string {
  if (source.includes("/mizaj/rules/")) return "mizaj-rules";
  if (source.includes("/khazina/atoms/")) return "khazina-atoms";
  if (source.includes("/khazina/")) return "khazina-other";
  if (source.includes("/cheapllm/")) return "cheapllm-receipts";
  if (source.includes("/cheapcode/")) return "cheapcode-internal";
  if (/arxiv\.org/i.test(source) || /^arxiv-/i.test(source)) return "arxiv-paper";
  if (source.startsWith("https://") || source.startsWith("http://")) return "web";
  if (/\bnote-[a-f0-9]{10,}\b/i.test(source)) return "daftar-note";
  if (source.startsWith("/") || source.startsWith("~")) return "filesystem-other";
  return "unknown";
}

// ============================================================
// Validators
// ============================================================

function validateSlug(slug: string): void {
  if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
    throw new Error(
      `slug must match /^[a-z][a-z0-9_]*$/, got: ${slug}`,
    );
  }
}

function validateGrade(grade: string): asserts grade is BurhanGrade {
  if (!BURHAN_GRADES.includes(grade as BurhanGrade)) {
    throw new Error(
      `invalid grade: ${grade}. valid: ${BURHAN_GRADES.join(",")}`,
    );
  }
}

function validateSegmentType(t: string): asserts t is SegmentType {
  if (!SEGMENT_TYPES.includes(t as SegmentType)) {
    throw new Error(
      `invalid segment_type: ${t}. valid: ${SEGMENT_TYPES.join(",")}`,
    );
  }
}

function validateIsnad(isnad: IsnadLink[], grade: BurhanGrade): void {
  if (!Array.isArray(isnad)) {
    throw new Error(`isnad must be an array`);
  }
  if (grade === "sahih" && isnad.length === 0) {
    throw new Error(
      `sahih grade requires at least one isnad link (mizaj rule 14)`,
    );
  }
  for (let i = 0; i < isnad.length; i++) {
    const link = isnad[i]!;
    if (!SOURCE_TIERS.includes(link.tier)) {
      throw new Error(`isnad[${i}].tier invalid: ${link.tier}. valid: ${SOURCE_TIERS.join(",")}`);
    }
    if (!link.source) throw new Error(`isnad[${i}].source required`);
    if (!link.quote) throw new Error(`isnad[${i}].quote required`);
    if (!link.access_date) throw new Error(`isnad[${i}].access_date required`);
    if (!link.hash) throw new Error(`isnad[${i}].hash required`);
  }
}

// Re-export getEntry for callers wanting full entry details
export { getEntry };
