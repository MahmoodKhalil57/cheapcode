/**
 * tools/promote-to-sahih.ts
 *
 * Promotes every lemma in plan/facts/*.bn to a daftar sahih segment in
 * cheapcode's shard. One-pass migration from "burhan lemma with audit tag"
 * to "authenticated daftar segment with isnad chain."
 *
 * Mapping rules (audit-tag pattern -> grade + kitab + bab + tier):
 *
 *   mizaj-rules-*           sahih   substrate   mizaj          L1
 *   khazina-atoms-*         sahih   substrate   khazina        L1
 *   khatim-*                sahih   substrate   khatim-postmortem    L1
 *   sanad-*                 sahih   substrate   sanad-postmortem     L1
 *   cheapllm-readme-*       sahih   performance cheapllm-receipts    L1
 *   cheapllm-spec-*         sahih   performance cheapllm-receipts    L1
 *   cheapllm-results-*      sahih   performance cheapllm-receipts    L1
 *   cheapllm-f-*            sahih   performance cheapllm-receipts    L1
 *   cheapllm-daftar-note-*  sahih   performance cheapllm-receipts    L1
 *   arxiv-2212-08073-*      daif    research    papers         L4 (Anthropic vendor tech report)
 *   arxiv-*                 hasan   research    papers         L3 (peer-reviewed; transfer-bounded)
 *
 * Per mizaj rule 14: grade ceiling bounds the segment's confidence ceiling.
 * Per mizaj rule 11: source tier per the L1-L5 ladder.
 *
 * Idempotent: skips segments whose slug already exists in the shard.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import {
  saveSegment,
  getSegmentBySlug,
  type IsnadLink,
  type BurhanGrade,
  type SegmentType,
  type SourceTier,
} from "../../daftar/src/sahih";

const REPO_ROOT = resolve(import.meta.dir, "..");
const FACTS_DIR = `${REPO_ROOT}/plan/facts`;
const CHEAPCODE_PROJECT = REPO_ROOT;

type AuditTagMapping = {
  grade: BurhanGrade;
  kitab: string;
  bab: string;
  tier: SourceTier;
  source: string;
};

function mapAuditTag(tag: string): AuditTagMapping {
  if (tag.startsWith("mizaj-rules-")) {
    const n = tag.match(/^mizaj-rules-(\d+)/)?.[1];
    const rules = n
      ? readdirSync("/home/mk/apps/mizaj/rules").filter((f) => f.startsWith(`${n}-`))
      : [];
    return {
      grade: "sahih",
      kitab: "substrate",
      bab: "mizaj",
      tier: "L1",
      source: rules[0] ? `/home/mk/apps/mizaj/rules/${rules[0]}` : `/home/mk/apps/mizaj/rules/`,
    };
  }
  if (tag.startsWith("khazina-atoms-")) {
    const n = tag.match(/^khazina-atoms-(\d+)/)?.[1];
    const atoms = n
      ? readdirSync("/home/mk/apps/khazina/atoms").filter((f) => f.startsWith(`${n}-`))
      : [];
    return {
      grade: "sahih",
      kitab: "substrate",
      bab: "khazina",
      tier: "L1",
      source: atoms[0]
        ? `/home/mk/apps/khazina/atoms/${atoms[0]}`
        : `/home/mk/apps/khazina/atoms/`,
    };
  }
  if (tag.startsWith("khatim-"))
    return { grade: "sahih", kitab: "substrate", bab: "khatim-postmortem", tier: "L1", source: "/home/mk/apps/khatim/" };
  if (tag.startsWith("sanad-"))
    return { grade: "sahih", kitab: "substrate", bab: "sanad-postmortem", tier: "L1", source: "/home/mk/apps/sanad/" };
  if (tag.startsWith("cheapllm-readme-"))
    return { grade: "sahih", kitab: "performance", bab: "cheapllm-receipts", tier: "L1", source: "/home/mk/apps/cheapllm/README.md" };
  if (tag.startsWith("cheapllm-spec-"))
    return { grade: "sahih", kitab: "performance", bab: "cheapllm-receipts", tier: "L1", source: "/home/mk/apps/cheapllm/SPEC.md" };
  if (tag.startsWith("cheapllm-results-") || tag.startsWith("cheapllm-f-"))
    return { grade: "sahih", kitab: "performance", bab: "cheapllm-receipts", tier: "L1", source: "/home/mk/apps/cheapllm/results/" };
  if (tag.startsWith("cheapllm-daftar-note-")) {
    const noteId = tag.match(/note-([a-f0-9]+)/i)?.[1];
    return {
      grade: "sahih",
      kitab: "performance",
      bab: "cheapllm-receipts",
      tier: "L1",
      source: `daftar:cheapllm:note-${noteId ?? "unknown"}`,
    };
  }
  // arxiv-2212-08073 = Constitutional AI = vendor tech report = L4 = daif
  if (tag.startsWith("arxiv-2212-08073"))
    return { grade: "daif", kitab: "research", bab: "papers", tier: "L4", source: `https://arxiv.org/abs/2212.08073` };
  if (tag.startsWith("arxiv-")) {
    const arxivId = tag.match(/^arxiv-(\d+)-(\d+)/);
    const id = arxivId ? `${arxivId[1]}.${arxivId[2]}` : "unknown";
    return { grade: "hasan", kitab: "research", bab: "papers", tier: "L3", source: `https://arxiv.org/abs/${id}` };
  }
  return { grade: "hasan", kitab: "uncategorized", bab: "unknown-tag", tier: "L5", source: tag };
}

function hashOfSource(source: string, fallback: string): string {
  // For filesystem paths, hash the file content (or directory listing).
  if (source.startsWith("/")) {
    if (existsSync(source)) {
      try {
        const stat = statSync(source);
        if (stat.isFile()) {
          return createHash("sha256").update(readFileSync(source)).digest("hex").slice(0, 16);
        }
        // Directory: hash of sorted listing
        const listing = readdirSync(source).sort().join("\n");
        return createHash("sha256").update(listing).digest("hex").slice(0, 16);
      } catch {
        return createHash("sha256").update(source).digest("hex").slice(0, 16);
      }
    }
  }
  return createHash("sha256").update(fallback).digest("hex").slice(0, 16);
}

type Lemma = {
  name: string;
  body_bn: string;
  audit_tag: string;
};

function extractLemmas(filepath: string): Lemma[] {
  const content = readFileSync(filepath, "utf-8");
  const lines = content.split("\n");
  const out: Lemma[] = [];
  let i = 0;
  while (i < lines.length) {
    const lemmaMatch = lines[i]!.match(/^lemma\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (!lemmaMatch) {
      i++;
      continue;
    }
    const name = lemmaMatch[1]!;
    const blockLines: string[] = [lines[i]!];
    let auditTag = "";
    i++;
    while (i < lines.length && /^\s+/.test(lines[i]!)) {
      blockLines.push(lines[i]!);
      const auditMatch = lines[i]!.match(/^\s+by audit (\S+)/);
      if (auditMatch) auditTag = auditMatch[1]!;
      i++;
    }
    if (auditTag) {
      out.push({ name, body_bn: blockLines.join("\n"), audit_tag: auditTag });
    }
  }
  return out;
}

const factFiles = readdirSync(FACTS_DIR)
  .filter((f) => f.endsWith(".bn"))
  .sort()
  .map((f) => `${FACTS_DIR}/${f}`);

let promoted = 0;
let skipped = 0;
const today = new Date().toISOString().slice(0, 10);

for (const factFile of factFiles) {
  const lemmas = extractLemmas(factFile);
  for (const lemma of lemmas) {
    if (getSegmentBySlug(lemma.name, CHEAPCODE_PROJECT)) {
      skipped++;
      continue;
    }
    const mapping = mapAuditTag(lemma.audit_tag);
    const isnad: IsnadLink[] = [
      {
        tier: mapping.tier,
        source: mapping.source,
        quote: `audit tag ${lemma.audit_tag}; promoted from ${factFile.replace(REPO_ROOT, "")}`,
        access_date: today,
        hash: hashOfSource(mapping.source, lemma.audit_tag),
      },
    ];
    saveSegment({
      slug: lemma.name,
      segment_type: "lemma" as SegmentType,
      body_bn: lemma.body_bn,
      grade: mapping.grade,
      kitab: mapping.kitab,
      bab: mapping.bab,
      isnad,
      project: CHEAPCODE_PROJECT,
    });
    promoted++;
  }
}

console.log(JSON.stringify({ promoted, skipped, fact_files: factFiles.length, project: CHEAPCODE_PROJECT }, null, 2));
