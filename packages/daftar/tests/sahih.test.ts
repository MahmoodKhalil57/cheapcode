import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  exportSegmentsAsBn,
  getSegmentBySlug,
  gradeSegment,
  lexicon,
  naskhSegment,
  querySegments,
  saveSegment,
  verifySegmentChains,
  type BurhanSegmentMetadata,
  type IsnadLink,
} from "../src/sahih";

function withDaftarRoot<T>(run: (project: string) => T): T {
  const root = mkdtempSync(resolve(import.meta.dir, "tmp-sahih-"));
  const project = mkdtempSync(resolve(tmpdir(), "daftar-sahih-project-"));
  const previous = process.env.DAFTAR_ROOT;
  process.env.DAFTAR_ROOT = root;
  mkdirSync(project, { recursive: true });
  try {
    return run(project);
  } finally {
    if (previous === undefined) delete process.env.DAFTAR_ROOT;
    else process.env.DAFTAR_ROOT = previous;
    rmSync(root, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
}

const sampleIsnad: IsnadLink[] = [
  {
    tier: "L1",
    source: "/etc/hostname",
    quote: "exists",
    access_date: "2026-05-02",
    hash: "abc123",
  },
];

test("sahih: save + getSegmentBySlug round-trip", () => {
  withDaftarRoot((project) => {
    const seg = saveSegment({
      slug: "test_segment_one",
      segment_type: "lemma",
      body_bn: "lemma test_segment_one\n  proves True\n  by audit test",
      grade: "sahih",
      kitab: "performance",
      bab: "cost-axis",
      isnad: sampleIsnad,
      project,
    });
    expect(seg.kind).toBe("burhan.segment");
    expect(seg.title).toContain("[sahih]");
    const meta = seg.metadata_json as unknown as BurhanSegmentMetadata;
    expect(meta.slug).toBe("test_segment_one");
    expect(meta.grade).toBe("sahih");

    const fetched = getSegmentBySlug("test_segment_one", project);
    expect(fetched?.id).toBe(seg.id);
  });
});

test("sahih: reject duplicate slug", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "test_dup",
      segment_type: "lemma",
      body_bn: "lemma test_dup\n  proves True\n  by audit a",
      grade: "hasan",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    expect(() =>
      saveSegment({
        slug: "test_dup",
        segment_type: "lemma",
        body_bn: "lemma test_dup\n  proves True\n  by audit b",
        grade: "sahih",
        kitab: "k",
        bab: "b",
        isnad: sampleIsnad,
        project,
      }),
    ).toThrow(/already exists/);
  });
});

test("sahih: sahih grade requires non-empty isnad", () => {
  withDaftarRoot((project) => {
    expect(() =>
      saveSegment({
        slug: "test_empty_isnad",
        segment_type: "lemma",
        body_bn: "lemma test_empty_isnad\n  proves True\n  by audit none",
        grade: "sahih",
        kitab: "k",
        bab: "b",
        isnad: [],
        project,
      }),
    ).toThrow(/isnad/);
  });
});

test("sahih: invalid slug rejected", () => {
  withDaftarRoot((project) => {
    expect(() =>
      saveSegment({
        slug: "BadSlug",
        segment_type: "lemma",
        body_bn: "x",
        grade: "hasan",
        kitab: "k",
        bab: "b",
        isnad: sampleIsnad,
        project,
      }),
    ).toThrow(/slug must match/);
  });
});

test("sahih: gradeSegment appends history and updates grade", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "test_grade",
      segment_type: "lemma",
      body_bn: "lemma test_grade\n  proves True\n  by audit a",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    const updated = gradeSegment("test_grade", "daif", "L1 contradicted", project);
    const meta = updated.metadata_json as unknown as BurhanSegmentMetadata;
    expect(meta.grade).toBe("daif");
    expect(meta.grade_history).toBeDefined();
    expect(meta.grade_history?.length).toBe(1);
    expect(meta.grade_history?.[0]?.from).toBe("sahih");
    expect(meta.grade_history?.[0]?.to).toBe("daif");
    expect(meta.grade_history?.[0]?.reason).toBe("L1 contradicted");
  });
});

test("sahih: gradeSegment requires reason", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "test_no_reason",
      segment_type: "lemma",
      body_bn: "x",
      grade: "hasan",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    expect(() => gradeSegment("test_no_reason", "daif", "", project)).toThrow(/reason/);
  });
});

test("sahih: naskh creates bidirectional links", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "old_fact",
      segment_type: "lemma",
      body_bn: "lemma old_fact\n  proves True\n  by audit old",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    saveSegment({
      slug: "new_fact",
      segment_type: "lemma",
      body_bn: "lemma new_fact\n  proves True\n  by audit new",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    const { old, by } = naskhSegment("old_fact", "new_fact", "newer measurement", project);
    const oldMeta = old.metadata_json as unknown as BurhanSegmentMetadata;
    const byMeta = by.metadata_json as unknown as BurhanSegmentMetadata;
    expect(oldMeta.superseded_by).toBe("new_fact");
    expect(byMeta.supersedes).toContain("old_fact");

    const queried = querySegments({ project, grades: ["sahih"] });
    const slugs = queried.map((e) => (e.metadata_json as unknown as BurhanSegmentMetadata).slug);
    expect(slugs).toContain("new_fact");
    expect(slugs).not.toContain("old_fact");
  });
});

test("sahih: querySegments filters by kitab/bab/grade", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "perf_cost",
      segment_type: "lemma",
      body_bn: "x",
      grade: "sahih",
      kitab: "performance",
      bab: "cost",
      isnad: sampleIsnad,
      project,
    });
    saveSegment({
      slug: "perf_latency",
      segment_type: "lemma",
      body_bn: "x",
      grade: "hasan",
      kitab: "performance",
      bab: "latency",
      isnad: sampleIsnad,
      project,
    });
    saveSegment({
      slug: "comp_codex",
      segment_type: "lemma",
      body_bn: "x",
      grade: "daif",
      kitab: "competitive",
      bab: "codex",
      isnad: sampleIsnad,
      project,
    });
    expect(querySegments({ project, kitab: "performance" }).length).toBe(2);
    expect(querySegments({ project, kitab: "performance", bab: "cost" }).length).toBe(1);
    expect(querySegments({ project, grades: ["sahih"] }).length).toBe(1);
    expect(querySegments({ project, grades: ["sahih", "hasan"] }).length).toBe(2);
    expect(querySegments({ project, grades: ["daif"] }).length).toBe(1);
  });
});

test("sahih: exportSegmentsAsBn emits valid bn-shape", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "lemma_a",
      segment_type: "lemma",
      body_bn: "lemma lemma_a\n  proves True\n  by audit a",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    saveSegment({
      slug: "lemma_b",
      segment_type: "lemma",
      body_bn: "lemma lemma_b\n  proves True\n  by audit b",
      grade: "daif",
      kitab: "k",
      bab: "b",
      isnad: sampleIsnad,
      project,
    });
    const exported = exportSegmentsAsBn({ project, grades: ["sahih", "hasan"] });
    expect(exported).toContain("lemma lemma_a");
    expect(exported).not.toContain("lemma lemma_b"); // daif excluded
    expect(exported).toContain("# grade=sahih");
  });
});

test("sahih: verifySegmentChains resolves L1 paths and flags missing", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "verify_real_path",
      segment_type: "lemma",
      body_bn: "x",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: [
        {
          tier: "L1",
          source: "/etc/hostname",
          quote: "exists",
          access_date: "2026-05-02",
          hash: "abc",
        },
      ],
      project,
    });
    saveSegment({
      slug: "verify_missing_path",
      segment_type: "lemma",
      body_bn: "x",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: [
        {
          tier: "L1",
          source: "/nonexistent/path/to/nowhere",
          quote: "missing",
          access_date: "2026-05-02",
          hash: "def",
        },
      ],
      project,
    });
    const results = verifySegmentChains({ project });
    expect(results.length).toBe(2);
    const real = results.find((r) => r.slug === "verify_real_path")!;
    expect(real.chain_intact).toBe(true);
    expect(real.isnad_resolved).toBe(1);
    const missing = results.find((r) => r.slug === "verify_missing_path")!;
    expect(missing.chain_intact).toBe(false);
    expect(missing.links[0]?.status).toBe("unresolved");
  });
});

test("sahih: lexicon classifies sources by class", () => {
  withDaftarRoot((project) => {
    saveSegment({
      slug: "lex_a",
      segment_type: "lemma",
      body_bn: "x",
      grade: "sahih",
      kitab: "k",
      bab: "b",
      isnad: [
        {
          tier: "L1",
          source: "/home/u/apps/mizaj/rules/01.md",
          quote: "x",
          access_date: "2026-05-02",
          hash: "h1",
        },
      ],
      project,
    });
    saveSegment({
      slug: "lex_b",
      segment_type: "lemma",
      body_bn: "x",
      grade: "hasan",
      kitab: "k",
      bab: "b",
      isnad: [
        {
          tier: "L3",
          source: "https://arxiv.org/abs/2109.07958",
          quote: "x",
          access_date: "2026-05-02",
          hash: "h2",
        },
      ],
      project,
    });
    const lex = lexicon({ project });
    const classes = lex.map((e) => e.source_class);
    expect(classes).toContain("mizaj-rules");
    expect(classes).toContain("arxiv-paper");
  });
});
